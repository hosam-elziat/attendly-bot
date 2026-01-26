import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to check monthly leave limit
async function checkMonthlyLeaveLimit(
  supabase: any,
  employeeId: string,
  companyId: string,
  maxExcusedAbsenceDays: number = 2
): Promise<{ allowed: boolean; usedDays: number; message: string }> {
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`
  
  // Count approved regular and emergency leaves this month
  const { data: leaves, error } = await supabase
    .from('leave_requests')
    .select('days, leave_type')
    .eq('employee_id', employeeId)
    .eq('status', 'approved')
    .in('leave_type', ['regular', 'emergency'])
    .gte('start_date', monthStart)
    .lt('start_date', monthEnd)
  
  if (error) {
    console.error('Error checking leave limit:', error)
    return { allowed: true, usedDays: 0, message: '' }
  }
  
  const usedDays = (leaves || []).reduce((sum: number, l: any) => sum + (l.days || 0), 0)
  
  if (usedDays >= maxExcusedAbsenceDays) {
    return {
      allowed: false,
      usedDays,
      message: `❌ لقد استنفدت الحد الأقصى للإجازات هذا الشهر (${maxExcusedAbsenceDays} يوم)\n\n` +
        `📊 الأيام المستخدمة: ${usedDays} يوم\n\n` +
        `⚠️ يجب التواصل مع مديرك المباشر للحصول على إجازة إضافية.`
    }
  }
  
  return { allowed: true, usedDays, message: '' }
}

// Helper function to get current time in a specific timezone
function getLocalTime(timezone: string = 'Africa/Cairo'): { date: string; time: string; isoString: string } {
  const now = new Date()
  
  // Format date and time in the specified timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  const parts = formatter.formatToParts(now)
  const getValue = (type: string) => parts.find(p => p.type === type)?.value || ''
  
  const date = `${getValue('year')}-${getValue('month')}-${getValue('day')}`
  const time = `${getValue('hour')}:${getValue('minute')}:${getValue('second')}`
  const isoString = `${date}T${time}`
  
  return { date, time, isoString }
}

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    from: { id: number; username?: string; first_name?: string; last_name?: string };
    text?: string;
    contact?: { phone_number: string };
    location?: { latitude: number; longitude: number };
  };
  callback_query?: {
    id: string;
    from: { id: number; username?: string };
    message: { chat: { id: number }; message_id: number };
    data: string;
  };
}

interface SessionData {
  full_name?: string;
  email?: string;
  phone?: string;
  work_start_time?: string;
  work_end_time?: string;
  weekend_days?: string[];
  use_company_defaults?: boolean;
  // Leave request session data
  leave_type?: 'emergency' | 'regular';
  leave_date?: string;
  leave_reason?: string;
  // Manager action session data
  target_employee_id?: string;
  target_employee_name?: string;
  adjustment_amount?: number;
  adjustment_days?: number;
  // Join request review session data
  join_request_id?: string;
  join_request_applicant_name?: string;
  join_request_position_id?: string;
  join_request_salary?: number;
  // Attendance approval session data
  pending_id?: string;
  // Early departure checkout session data
  attendance_id?: string;
  early_minutes?: number;
  deduction_days?: number;
  deduction_amount?: number;
  attendance_date?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const update: TelegramUpdate = await req.json()
    const chatId = update.message?.chat.id || update.callback_query?.message.chat.id
    const userId = update.message?.from.id || update.callback_query?.from.id

    if (!chatId || !userId) {
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }

    // Resolve bot username
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const lastSegment = pathParts[pathParts.length - 1]

    const botUsername =
      url.searchParams.get('bot') ||
      (lastSegment && lastSegment !== 'telegram-webhook' ? lastSegment : null)

    console.log('telegram-webhook: incoming', {
      path: url.pathname,
      botQuery: url.searchParams.get('bot'),
      resolvedBotUsername: botUsername,
      chatId,
      userId,
    })

    if (!botUsername) {
      return new Response(JSON.stringify({ ok: true, error: 'No bot specified' }), { headers: corsHeaders })
    }

    // Get bot info INCLUDING webhook_secret for security verification
    const { data: bot } = await supabase
      .from('telegram_bots')
      .select('bot_token, assigned_company_id, webhook_secret')
      .eq('bot_username', botUsername)
      .single()

    if (!bot?.bot_token || !bot?.assigned_company_id) {
      return new Response(JSON.stringify({ ok: true, error: 'Bot not found' }), { headers: corsHeaders })
    }

    // ===== SECURITY: Verify Telegram Webhook Secret =====
    // Telegram sends the secret_token in X-Telegram-Bot-Api-Secret-Token header
    const telegramSecret = req.headers.get('X-Telegram-Bot-Api-Secret-Token')
    
    // SECURITY: Always require webhook_secret for ALL bots (including legacy)
    if (!bot.webhook_secret) {
      console.error(`SECURITY: Bot ${botUsername} has no webhook_secret. Rejecting request. Please re-assign the bot to generate a secret.`)
      // Return 200 OK to prevent Telegram from retrying
      return new Response(JSON.stringify({ ok: true, error: 'Bot requires reconfiguration' }), { headers: corsHeaders })
    }
    
    if (telegramSecret !== bot.webhook_secret) {
      console.error(`SECURITY: Invalid webhook secret for bot ${botUsername}. Request rejected.`)
      // Return 200 OK to prevent Telegram from retrying (could be an attack)
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }
    
    console.log(`SECURITY: Webhook secret verified for bot ${botUsername}`)
    // ===== END SECURITY CHECK =====

    const botToken = bot.bot_token
    const companyId = bot.assigned_company_id
    const telegramChatId = String(chatId)

    // Get company info for defaults
    const { data: company } = await supabase
      .from('companies')
      .select('work_start_time, work_end_time, name, annual_leave_days, emergency_leave_days, timezone, default_currency, absence_without_permission_deduction, join_request_reviewer_type, join_request_reviewer_id, attendance_verification_level, attendance_approver_type, attendance_approver_id, company_latitude, company_longitude, location_radius_meters, level3_verification_mode, max_excused_absence_days, late_under_15_deduction, late_15_to_30_deduction, late_over_30_deduction, monthly_late_allowance_minutes, biometric_verification_enabled, biometric_otp_fallback')
      .eq('id', companyId)
      .single()

    const companyTimezone = company?.timezone || 'Africa/Cairo'
    
    const companyDefaults = {
      work_start_time: company?.work_start_time || '09:00:00',
      work_end_time: company?.work_end_time || '17:00:00',
      weekend_days: ['friday', 'saturday'],
      company_name: company?.name || 'الشركة',
      annual_leave_days: company?.annual_leave_days || 21,
      emergency_leave_days: company?.emergency_leave_days || 7,
      currency: company?.default_currency || 'EGP',
      absence_deduction_days: company?.absence_without_permission_deduction || 1,
      max_excused_absence_days: (company as any)?.max_excused_absence_days || 2,
      late_under_15_deduction: (company as any)?.late_under_15_deduction || 0.25,
      late_15_to_30_deduction: (company as any)?.late_15_to_30_deduction || 0.5,
      late_over_30_deduction: (company as any)?.late_over_30_deduction || 1,
      monthly_late_allowance_minutes: (company as any)?.monthly_late_allowance_minutes || 60
    }

    // Check if employee exists
    const { data: employee } = await supabase
      .from('employees')
      .select('id, full_name, leave_balance, emergency_leave_balance, work_start_time, work_end_time, position_id, user_id, attendance_verification_level, attendance_approver_type, attendance_approver_id, allowed_wifi_ips, biometric_verification_enabled, biometric_credential_id')
      .eq('telegram_chat_id', telegramChatId)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single()
    
    // Determine effective verification level (employee override or company default)
    const effectiveVerificationLevel = (employee as any)?.attendance_verification_level ?? (company as any)?.attendance_verification_level ?? 1
    const effectiveApproverType = (employee as any)?.attendance_approver_type ?? (company as any)?.attendance_approver_type ?? 'direct_manager'
    const effectiveApproverId = (employee as any)?.attendance_approver_id ?? (company as any)?.attendance_approver_id
    
    // Get employee's position permissions if they have a position
    let managerPermissions: {
      can_add_bonuses?: boolean;
      can_make_deductions?: boolean;
      can_approve_leaves?: boolean;
      can_manage_attendance?: boolean;
      can_manage_subordinates?: boolean;
    } | null = null
    
    if (employee?.position_id) {
      const { data: posPerms } = await supabase
        .from('position_permissions')
        .select('can_add_bonuses, can_make_deductions, can_approve_leaves, can_manage_attendance, can_manage_subordinates')
        .eq('position_id', employee.position_id)
        .single()
      
      managerPermissions = posPerms
    }

    // Map callback data to readable button text
    const callbackToText: Record<string, string> = {
      'check_in': '✅ تسجيل حضور',
      'check_out': '🔴 تسجيل انصراف',
      'start_break': '☕ بدء استراحة',
      'end_break': '↩️ إنهاء استراحة',
      'request_leave': '📝 طلب إجازة',
      'my_salary': '💰 راتبي',
      'my_status': '📊 حالتي',
      'manage_team': '👥 إدارة الفريق',
      'cancel_action': '❌ إلغاء',
      'cancel_leave': '❌ إلغاء',
      'leave_emergency': '🚨 إجازة طارئة',
      'leave_regular': '📅 إجازة اعتيادية',
      'start_registration': '📝 تسجيل موظف جديد',
      'check_status': '🔍 حالة طلبي',
      'use_default_time': '✅ استخدام وقت الشركة',
      'custom_time': '⏰ تحديد وقت مخصص',
      'use_default_weekend': '✅ استخدام إجازة الشركة',
      'confirm_weekend': '✅ تأكيد',
      'leave_today': '📅 اليوم',
      'leave_tomorrow': '📅 غداً',
      'leave_day_after': '📅 بعد غد',
      'leave_other_day': '📆 يوم آخر',
      'cancel_registration': '❌ إلغاء التسجيل',
      'team_add_bonus': '🎁 إضافة مكافأة',
      'team_add_deduction': '📉 إضافة خصم',
      'team_view_requests': '📋 طلبات الإجازات',
      'back_to_main': '🔙 القائمة الرئيسية',
      'confirm_early_checkout': '✅ تأكيد الانصراف',
      'cancel_early_checkout': '❌ إلغاء',
    }

    // Log incoming message if employee exists
    const rawIncoming = update.message?.text || update.callback_query?.data || ''
    const incomingText = callbackToText[rawIncoming] || rawIncoming
    if (employee && incomingText) {
      await logTelegramMessage(
        supabase,
        companyId,
        employee.id,
        telegramChatId,
        incomingText,
        'incoming',
        update.callback_query ? 'callback' : 'text'
      )
    }

    // Set context for automatic message logging in sendMessage
    setMessageLogContext({
      supabase,
      companyId,
      employeeId: employee?.id || null,
      telegramChatId
    });

    // Helper function to send message and log it (kept for backward compatibility)
    async function sendAndLogMessage(text: string, keyboard?: any) {
      if (!chatId) return
      await sendMessage(botToken, chatId, text, keyboard)
      // Note: logging is now handled automatically by sendMessage
    }

    // Helper functions for session management
    async function getSession(): Promise<{ step: string; data: SessionData } | null> {
      const { data } = await supabase
        .from('registration_sessions')
        .select('step, data')
        .eq('telegram_chat_id', telegramChatId)
        .eq('company_id', companyId)
        .single()
      
      if (data) {
        return { step: data.step, data: data.data as SessionData }
      }
      return null
    }

    async function setSession(step: string, sessionData: SessionData) {
      await supabase
        .from('registration_sessions')
        .upsert({
          telegram_chat_id: telegramChatId,
          company_id: companyId,
          step,
          data: sessionData,
          updated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour
        }, {
          onConflict: 'telegram_chat_id,company_id'
        })
    }

    async function deleteSession() {
      await supabase
        .from('registration_sessions')
        .delete()
        .eq('telegram_chat_id', telegramChatId)
        .eq('company_id', companyId)
    }

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      const callbackData = update.callback_query.data
      await answerCallbackQuery(botToken, update.callback_query.id)

      if (!employee) {
        // Handle registration flow for non-employees
        const session = await getSession()

        if (callbackData === 'start_registration') {
          // Start registration process
          await setSession('full_name', {})
          await sendMessage(botToken, chatId,
            '📝 <b>تسجيل موظف جديد</b>\n\n' +
            'الخطوة 1 من 5:\n' +
            '👤 أرسل <b>اسمك الثلاثي</b> كاملاً\n\n' +
            'مثال: أحمد محمد علي'
          )
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
        }

        if (callbackData === 'check_status') {
          const { data: request } = await supabase
            .from('join_requests')
            .select('status, rejection_reason, created_at')
            .eq('telegram_chat_id', telegramChatId)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (request) {
            const statusText = request.status === 'pending' 
              ? '⏳ قيد المراجعة'
              : request.status === 'approved'
              ? '✅ تم القبول - أرسل /start لبدء استخدام البوت'
              : '❌ مرفوض' + (request.rejection_reason ? `\nالسبب: ${request.rejection_reason}` : '')
            
            await sendMessage(botToken, chatId, `📋 حالة طلبك: ${statusText}`)
          } else {
            await sendMessage(botToken, chatId, '❌ لم يتم العثور على طلب سابق')
          }
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
        }

        // Handle work time selection
        if (callbackData === 'use_default_time' && session) {
          const newData = {
            ...session.data,
            use_company_defaults: true,
            work_start_time: companyDefaults.work_start_time,
            work_end_time: companyDefaults.work_end_time
          }
          await setSession('weekend_days', newData)

          await sendMessage(botToken, chatId,
            '✅ تم اختيار الوقت الافتراضي للشركة\n\n' +
            '📅 الخطوة 5 من 5:\n' +
            'اختر أيام الإجازة الأسبوعية:',
            getWeekendKeyboard()
          )
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
        }

        if (callbackData === 'custom_time' && session) {
          await setSession('work_start_time', session.data)

          await sendMessage(botToken, chatId,
            '⏰ أرسل <b>وقت بدء العمل</b>\n\n' +
            'الصيغة: HH:MM (مثال: 09:00)'
          )
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
        }

        // Handle weekend selection
        if (callbackData === 'use_default_weekend' && session) {
          const newData = { ...session.data, weekend_days: companyDefaults.weekend_days }
          await submitRegistration(supabase, botToken, chatId, newData, companyId, telegramChatId, update.callback_query?.from.username)
          await deleteSession()
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
        }

        if (callbackData.startsWith('weekend_') && session) {
          const day = callbackData.replace('weekend_', '')
          const currentDays = session.data.weekend_days || []
          
          const dayIndex = currentDays.indexOf(day)
          if (dayIndex > -1) {
            currentDays.splice(dayIndex, 1)
          } else {
            currentDays.push(day)
          }
          
          const newData = { ...session.data, weekend_days: currentDays }
          await setSession('weekend_days', newData)

          await sendMessage(botToken, chatId,
            `📅 أيام الإجازة المختارة: ${currentDays.length > 0 ? currentDays.map(d => getDayName(d)).join('، ') : 'لم يتم اختيار أي يوم'}\n\n` +
            'اختر المزيد أو اضغط "تأكيد":',
            getWeekendKeyboard(currentDays)
          )
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
        }

        if (callbackData === 'confirm_weekend' && session) {
          const weekendDays = session.data.weekend_days?.length ? session.data.weekend_days : companyDefaults.weekend_days
          const newData = { ...session.data, weekend_days: weekendDays }
          await submitRegistration(supabase, botToken, chatId, newData, companyId, telegramChatId, update.callback_query?.from.username)
          await deleteSession()
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
        }

        if (callbackData === 'cancel_registration') {
          await deleteSession()
          await sendWelcomeMessage(botToken, chatId, false)
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
        }

        // Handle restore deleted employee
        if (callbackData.startsWith('restore_employee_')) {
          const deletedRecordId = callbackData.replace('restore_employee_', '')
          
          // Get the deleted record
          const { data: deletedRecord, error: fetchError } = await supabase
            .from('deleted_records')
            .select('*')
            .eq('id', deletedRecordId)
            .eq('is_restored', false)
            .single()

          if (fetchError || !deletedRecord) {
            await sendMessage(botToken, chatId, '❌ لم يتم العثور على السجل أو تم استعادته بالفعل')
            return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
          }

          const employeeData = deletedRecord.record_data as Record<string, unknown>

          // Re-insert the employee
          const { error: insertError } = await supabase
            .from('employees')
            .insert({
              ...employeeData,
              id: deletedRecord.record_id,
              is_active: true,
              updated_at: new Date().toISOString()
            })

          if (insertError) {
            console.error('Failed to restore employee:', insertError)
            await sendMessage(botToken, chatId, '❌ فشل في استعادة الحساب: ' + insertError.message)
            return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
          }

          // Mark as restored
          await supabase
            .from('deleted_records')
            .update({ is_restored: true, restored_at: new Date().toISOString() })
            .eq('id', deletedRecordId)

          await deleteSession()
          
          const restoredName = (employeeData as any)?.full_name || 'الموظف'
          await sendMessage(botToken, chatId,
            `🎉 <b>تم استعادة حسابك بنجاح!</b>\n\n` +
            `👤 مرحباً بعودتك ${restoredName}!\n` +
            `تم استعادة جميع بياناتك السابقة.\n\n` +
            `يمكنك الآن استخدام البوت لتسجيل الحضور والانصراف.`,
            {
              inline_keyboard: [
                [
                  { text: '✅ تسجيل حضور', callback_data: 'check_in' },
                  { text: '🔴 تسجيل انصراف', callback_data: 'check_out' }
                ]
              ]
            }
          )
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
        }

        // Handle force new registration (ignore deleted record)
        if (callbackData === 'force_new_registration') {
          const session = await getSession()
          if (session) {
            // Continue with normal registration
            await submitRegistrationForce(supabase, botToken, chatId, session.data, companyId, telegramChatId, update.callback_query?.from.username)
            await deleteSession()
          }
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
        }

        await sendWelcomeMessage(botToken, chatId, false)
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
      }

      // Employee actions
      const localTime = getLocalTime(companyTimezone)
      const today = localTime.date
      
      // Calculate yesterday's date for night shifts
      const todayDate = new Date(today)
      const yesterdayDate = new Date(todayDate)
      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
      const yesterday = yesterdayDate.toISOString().split('T')[0]
      
      // Check if employee is a freelancer first (needed for query logic)
      const { data: empFreelancerCheck } = await supabase
        .from('employees')
        .select('is_freelancer')
        .eq('id', employee.id)
        .single()
      const isFreelancer = empFreelancerCheck?.is_freelancer === true
      
      // Get today's attendance - for freelancers get ALL records, for regular employees get first one
      let todayAttendance: any = null
      let allTodayAttendance: any[] = []
      
      if (isFreelancer) {
        // Freelancer: get all records for today (can have multiple check-ins)
        const { data: freelancerAttendance } = await supabase
          .from('attendance_logs')
          .select('*')
          .eq('employee_id', employee.id)
          .eq('company_id', companyId)
          .eq('date', today)
          .order('check_in_time', { ascending: false })
        
        allTodayAttendance = freelancerAttendance || []
        // Get the latest record (most recent check-in)
        todayAttendance = allTodayAttendance.length > 0 ? allTodayAttendance[0] : null
      } else {
        // Regular employee: get single record
        const { data: regularAttendance } = await supabase
          .from('attendance_logs')
          .select('*')
          .eq('employee_id', employee.id)
          .eq('company_id', companyId)
          .eq('date', today)
          .single()
        
        todayAttendance = regularAttendance
      }
      
      // Check if employee is marked as absent today (cannot check in)
      const isMarkedAbsentToday = todayAttendance?.status === 'absent'
      
      // Determine current open attendance for check-out operations
      // For check-out: find the most recent OPEN session (checked_in or on_break)
      let attendance: any = null
      let attendanceDate = today
      
      if (isFreelancer) {
        // Freelancer: find latest open session from today first
        const openTodaySession = allTodayAttendance.find((a: any) => a.status === 'checked_in' || a.status === 'on_break')
        if (openTodaySession) {
          attendance = openTodaySession
          attendanceDate = today
        }
      } else {
        // Regular employee: use today's attendance if open
        if (todayAttendance && (todayAttendance.status === 'checked_in' || todayAttendance.status === 'on_break')) {
          attendance = todayAttendance
          attendanceDate = today
        }
      }
      
      // If no open session found today, check for night shift from yesterday
      if (!attendance) {
        const { data: yesterdayAttendance } = await supabase
          .from('attendance_logs')
          .select('*')
          .eq('employee_id', employee.id)
          .eq('company_id', companyId)
          .eq('date', yesterday)
          .in('status', ['checked_in', 'on_break'])
          .order('check_in_time', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (yesterdayAttendance) {
          attendance = yesterdayAttendance
          attendanceDate = yesterday
        }
      }

      // Get company late policies
      const { data: companyPolicies } = await supabase
        .from('companies')
        .select('late_under_15_deduction, late_15_to_30_deduction, late_over_30_deduction, daily_late_allowance_minutes, monthly_late_allowance_minutes, overtime_multiplier, early_departure_threshold_minutes, early_departure_deduction, early_departure_grace_minutes')
        .eq('id', companyId)
        .single()

      // Get employee details with late balance, freelancer status and hourly rate
      const { data: empDetails } = await supabase
        .from('employees')
        .select('monthly_late_balance_minutes, base_salary, currency, is_freelancer, hourly_rate')
        .eq('id', employee.id)
        .single()

      // Handle attendance approval/rejection callbacks first
      if (callbackData.startsWith('approve_attendance_')) {
        const pendingId = callbackData.replace('approve_attendance_', '')
        // Call the attendance-approval edge function
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        await fetch(`${supabaseUrl}/functions/v1/attendance-approval`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
          body: JSON.stringify({ pending_id: pendingId, action: 'approve', manager_name: employee.full_name, manager_chat_id: chatId })
        })
        await sendMessage(botToken, chatId, '✅ تمت معالجة الطلب')
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
      }

      if (callbackData.startsWith('reject_attendance_') || callbackData.startsWith('modify_attendance_')) {
        await sendMessage(botToken, chatId, '⚠️ يرجى استخدام لوحة التحكم للرفض أو تعديل الوقت')
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
      }

      if (callbackData === 'cancel_action') {
        await deleteSession()
        await sendMessage(botToken, chatId, '✅ تم الإلغاء', getEmployeeKeyboard(managerPermissions))
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
      }

      switch (callbackData) {
        case 'check_in':
          // FIRST: Check if employee is marked as absent today - CANNOT check in
          if (isMarkedAbsentToday) {
            await sendAndLogMessage(
              '⚠️ تم تسجيلك غائباً اليوم!\n\n' +
              'لا يمكنك تسجيل الحضور بعد تسجيل الغياب.\n' +
              'يرجى التواصل مع الإدارة إذا كان هناك خطأ.',
              getEmployeeKeyboard(managerPermissions)
            )
            break
          }
          
          // Check for open attendance from yesterday (night shift still active)
          const hasOpenYesterdayAttendance = attendanceDate === yesterday && attendance && 
            (attendance.status === 'checked_in' || attendance.status === 'on_break')
          
          // For freelancers: only block if they have an open (non-checked_out) session today
          // For regular employees: block any attendance today (except absent)
          let shouldBlockCheckIn = false
          
          if (isFreelancer) {
            // Freelancer: check if there's any open (not checked_out) session today
            const hasOpenSession = allTodayAttendance.some((a: any) => 
              a.status === 'checked_in' || a.status === 'on_break'
            )
            shouldBlockCheckIn = hasOpenSession
          } else {
            // Regular employee: block if any non-absent attendance exists today
            shouldBlockCheckIn = todayAttendance && todayAttendance.status !== 'absent'
          }
          
          if (hasOpenYesterdayAttendance) {
            // Night shift still active - must check out first
            await sendAndLogMessage(
              '⚠️ لديك وردية ليلية مفتوحة من الأمس!\n\n' +
              `📅 تاريخ الحضور: ${attendanceDate}\n` +
              `⏰ وقت الحضور: ${attendance?.check_in_time ? new Date(attendance.check_in_time).toLocaleTimeString('ar-EG', { timeZone: companyTimezone, hour: '2-digit', minute: '2-digit' }) : '-'}\n\n` +
              '🔴 يجب تسجيل الانصراف أولاً قبل تسجيل حضور جديد.',
              getEmployeeKeyboard(managerPermissions)
            )
          } else if (shouldBlockCheckIn) {
            // Today's attendance exists and still open (or regular employee with any attendance)
            // For freelancer: show the open session, for regular: show today's record
            const displayAttendance = isFreelancer 
              ? allTodayAttendance.find((a: any) => a.status === 'checked_in' || a.status === 'on_break') || todayAttendance
              : todayAttendance
            
            const checkInTimeDisplay = displayAttendance?.check_in_time 
              ? new Date(displayAttendance.check_in_time).toLocaleTimeString('ar-EG', { timeZone: companyTimezone, hour: '2-digit', minute: '2-digit' })
              : '-'
            const checkOutTimeDisplay = displayAttendance?.check_out_time 
              ? new Date(displayAttendance.check_out_time).toLocaleTimeString('ar-EG', { timeZone: companyTimezone, hour: '2-digit', minute: '2-digit' })
              : null
            const statusText = displayAttendance?.status === 'checked_in' ? 'حاضر' 
              : displayAttendance?.status === 'on_break' ? 'في استراحة' 
              : displayAttendance?.status === 'checked_out' ? 'انصرف' 
              : displayAttendance?.status
            
            let message = isFreelancer 
              ? `⚠️ لديك جلسة عمل مفتوحة!\n\n` +
                `📅 التاريخ: ${today}\n` +
                `⏰ وقت الحضور: ${checkInTimeDisplay}\n` +
                `📊 الحالة: ${statusText}\n\n` +
                `🔴 يجب تسجيل الانصراف أولاً قبل بدء جلسة جديدة.`
              : `⚠️ لقد سجلت حضورك اليوم بالفعل!\n\n` +
                `📅 التاريخ: ${today}\n` +
                `⏰ وقت الحضور: ${checkInTimeDisplay}\n`
            
            if (!isFreelancer && checkOutTimeDisplay) {
              message += `⏰ وقت الانصراف: ${checkOutTimeDisplay}\n`
            }
            if (!isFreelancer) {
              message += `📊 الحالة: ${statusText}`
            }
            
            await sendAndLogMessage(message, getEmployeeKeyboard(managerPermissions))
          } else {
            const localTime = getLocalTime(companyTimezone)
            const nowUtc = new Date().toISOString()
            const checkInTime = localTime.time
            
            // Check if biometric verification is required for this employee
            const employeeBiometricEnabled = (employee as any)?.biometric_verification_enabled
            const companyBiometricEnabled = (company as any)?.biometric_verification_enabled
            const biometricRequired = employeeBiometricEnabled === true || (employeeBiometricEnabled === null && companyBiometricEnabled === true)
            
            // Check if biometric was recently verified (within last 10 minutes)
            let biometricAlreadyVerified = false
            if (biometricRequired) {
              const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
              const { data: recentBiometric } = await supabase
                .from('biometric_pending_verifications')
                .select('id')
                .eq('employee_id', employee.id)
                .eq('request_type', 'check_in')
                .not('biometric_verified_at', 'is', null)
                .gte('biometric_verified_at', tenMinutesAgo)
                .limit(1)
                .maybeSingle()
              
              biometricAlreadyVerified = !!recentBiometric
            }
            
            if (biometricRequired && !biometricAlreadyVerified) {
              // Biometric verification required - initiate verification flow
              // Pass the actual verification level so biometric is done FIRST, then continue with level 1/2/3
              await initiateBiometricVerification(supabase, botToken, chatId, employee, companyId, 'check_in', telegramChatId, effectiveVerificationLevel)
            } else if (effectiveVerificationLevel === 1) {
              // Level 1: Direct check-in without verification
              await processDirectCheckIn(supabase, botToken, chatId, employee, companyId, today, nowUtc, checkInTime, companyDefaults, companyPolicies, empDetails, managerPermissions)
            } else if (effectiveVerificationLevel === 2) {
              // Level 2: Requires manager approval - use UTC for storage, local time for display
              await createPendingAttendance(supabase, botToken, chatId, employee, companyId, 'check_in', nowUtc, effectiveApproverType, effectiveApproverId, companyTimezone)
            } else if (effectiveVerificationLevel === 3) {
              // Level 3: Requires location verification - request location from user
              // Use Reply Keyboard with request_location to get user's GPS
              await sendMessageWithReplyKeyboard(botToken, chatId, 
                '📍 <b>التحقق من الموقع مطلوب</b>\n\n' +
                'لتسجيل حضورك، يجب إرسال موقعك الحالي.\n' +
                'اضغط على زر "📍 إرسال الموقع" أدناه:',
                {
                  keyboard: [[
                    { text: '📍 إرسال الموقع', request_location: true }
                  ], [
                    { text: '❌ إلغاء' }
                  ]],
                  resize_keyboard: true,
                  one_time_keyboard: true
                }
              )
              // Store pending check-in session
              await setSession('pending_location_checkin', {})
            }
          }
          break

        case 'check_out':
          if (!attendance) {
            await sendMessage(botToken, chatId, '⚠️ لم تسجل حضورك بعد! لا يوجد سجل حضور مفتوح.')
          } else if (attendance.check_out_time) {
            await sendMessage(botToken, chatId, '⚠️ لقد سجلت انصرافك بالفعل!')
          } else {
            // Check if biometric verification is required for this employee
            const employeeBiometricEnabled = (employee as any)?.biometric_verification_enabled
            const companyBiometricEnabled = (company as any)?.biometric_verification_enabled
            const biometricRequiredForCheckout = employeeBiometricEnabled === true || (employeeBiometricEnabled === null && companyBiometricEnabled === true)
            
            // Check if biometric was recently verified (within last 10 minutes)
            let biometricAlreadyVerifiedCheckout = false
            if (biometricRequiredForCheckout) {
              const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
              const { data: recentBiometric } = await supabase
                .from('biometric_pending_verifications')
                .select('id')
                .eq('employee_id', employee.id)
                .eq('request_type', 'check_out')
                .not('biometric_verified_at', 'is', null)
                .gte('biometric_verified_at', tenMinutesAgo)
                .limit(1)
                .maybeSingle()
              
              biometricAlreadyVerifiedCheckout = !!recentBiometric
            }
            
            if (biometricRequiredForCheckout && !biometricAlreadyVerifiedCheckout) {
              // Biometric verification required - initiate verification flow
              // Pass the actual verification level so biometric is done FIRST, then continue with level 1/2/3
              await initiateBiometricVerification(supabase, botToken, chatId, employee, companyId, 'check_out', telegramChatId, effectiveVerificationLevel)
            } else {
              const localTime = getLocalTime(companyTimezone)
              const checkOutTime = localTime.time
              
              // Check if this is a night shift (attendance from yesterday)
              const isNightShift = attendanceDate !== today
              
              // Calculate time difference from work end
              const workEndTime = employee.work_end_time || companyDefaults.work_end_time
              let earlyMinutes = 0
              
              // Freelancers are exempt from all time-based policies
              const isFreelancer = empDetails?.is_freelancer === true
              
              if (workEndTime && !isNightShift && !isFreelancer) {
                const [endH, endM] = workEndTime.split(':').map(Number)
                const [checkH, checkM] = checkOutTime.split(':').map(Number)
                const timeDiff = (checkH * 60 + checkM) - (endH * 60 + endM)
                
                if (timeDiff < 0) {
                  earlyMinutes = Math.abs(timeDiff)
                }
              }
              
              // Get early departure settings from company policies
              const earlyDepartureGrace = companyPolicies?.early_departure_grace_minutes ?? 5
              const earlyDepartureThreshold = companyPolicies?.early_departure_threshold_minutes ?? 30
              const earlyDepartureDeduction = companyPolicies?.early_departure_deduction ?? 0.5
              
              // Check if early departure requires confirmation (skip for freelancers)
              if (earlyMinutes > earlyDepartureGrace && !isNightShift && !isFreelancer) {
                // Need to ask for confirmation
                const deductionDays = earlyDepartureDeduction
                const baseSalary = empDetails?.base_salary ?? 0
                const dailyRate = baseSalary / 30
                const deductionAmount = dailyRate * deductionDays
                const deductionText = deductionDays === 0.25 ? 'ربع يوم' : deductionDays === 0.5 ? 'نصف يوم' : `${deductionDays} يوم`
                
                // Store pending checkout info in session
                await setSession('pending_early_checkout', {
                  attendance_id: attendance.id,
                  early_minutes: earlyMinutes,
                  deduction_days: deductionDays,
                  deduction_amount: deductionAmount,
                  attendance_date: attendanceDate,
                  work_end_time: workEndTime,
                })
                
                await sendMessage(botToken, chatId,
                  `⚠️ <b>تنبيه انصراف مبكر</b>\n\n` +
                  `📅 التاريخ: ${attendanceDate}\n` +
                  `⏰ موعد الانصراف الرسمي: ${workEndTime}\n` +
                  `⏰ الوقت الحالي: ${checkOutTime}\n\n` +
                  `🔴 ستنصرف مبكراً بـ <b>${earlyMinutes}</b> دقيقة\n\n` +
                  `💸 سيتم خصم <b>${deductionText}</b>` + (deductionAmount > 0 ? ` (${deductionAmount.toFixed(2)} ${empDetails?.currency || 'SAR'})` : '') + `\n\n` +
                  `هل تريد تأكيد الانصراف؟`,
                  {
                    inline_keyboard: [
                      [
                        { text: '✅ تأكيد الانصراف', callback_data: 'confirm_early_checkout' },
                        { text: '❌ إلغاء', callback_data: 'cancel_early_checkout' }
                      ]
                    ]
                  }
                )
              } else {
                // Normal checkout (on time, overtime, or within grace period, or freelancer)
                await processCheckout(supabase, botToken, chatId, employee, attendance, attendanceDate, companyId, companyTimezone, companyDefaults, companyPolicies, empDetails, managerPermissions, isNightShift)
              }
            }
          }
          break
        
        case 'confirm_early_checkout': {
          const session = await getSession()
          if (!session || session.step !== 'pending_early_checkout') {
            await sendMessage(botToken, chatId, '⚠️ انتهت صلاحية الجلسة. حاول مرة أخرى.', getEmployeeKeyboard(managerPermissions))
            break
          }
          
          const sessionData = session.data
          await deleteSession()
          
          // Fetch the attendance record again to ensure it's still valid
          const { data: currentAttendance } = await supabase
            .from('attendance_logs')
            .select('*')
            .eq('id', sessionData.attendance_id)
            .single()
          
          if (!currentAttendance || currentAttendance.check_out_time) {
            await sendMessage(botToken, chatId, '⚠️ تم تسجيل الانصراف مسبقاً أو السجل غير موجود.', getEmployeeKeyboard(managerPermissions))
            break
          }
          
          // Check if attendance is from yesterday (night shift)
          const isNightShift = (sessionData.attendance_date || today) !== today
          
          // Process checkout with early departure deduction
          await processCheckout(supabase, botToken, chatId, employee, currentAttendance, sessionData.attendance_date || today, companyId, companyTimezone, companyDefaults, companyPolicies, empDetails, managerPermissions, isNightShift, {
            earlyMinutes: sessionData.early_minutes || 0,
            deductionDays: sessionData.deduction_days || 0,
            deductionAmount: sessionData.deduction_amount || 0,
            workEndTime: sessionData.work_end_time || '',
          })
          break
        }
        
        case 'cancel_early_checkout': {
          await deleteSession()
          await sendMessage(botToken, chatId, '✅ تم إلغاء طلب الانصراف', getEmployeeKeyboard(managerPermissions))
          break
        }


        case 'start_break':
          if (!attendance) {
            await sendMessage(botToken, chatId, '⚠️ لم تسجل حضورك بعد! لا يوجد سجل حضور مفتوح.', getEmployeeKeyboard(managerPermissions))
          } else if (attendance.status === 'on_break') {
            await sendMessage(botToken, chatId, '⚠️ أنت في استراحة بالفعل!', getEmployeeKeyboard(managerPermissions))
          } else if (attendance.check_out_time) {
            await sendMessage(botToken, chatId, '⚠️ لقد سجلت انصرافك بالفعل!', getEmployeeKeyboard(managerPermissions))
          } else {
            const localTime = getLocalTime(companyTimezone)
            const nowUtc = new Date().toISOString()
            
            // Check if this is a night shift
            const isNightShift = attendanceDate !== today
            const nightShiftNote = isNightShift ? `\n🌙 <i>وردية ليلية - حضور من ${attendanceDate}</i>` : ''
            
            await supabase.from('break_logs').insert({
              attendance_id: attendance.id,
              start_time: nowUtc
            })

            await supabase
              .from('attendance_logs')
              .update({ status: 'on_break' })
              .eq('id', attendance.id)

            await sendAndLogMessage(
              `☕ بدأت الاستراحة\n\n⏰ الوقت: ${localTime.time}${nightShiftNote}`,
              getEmployeeKeyboard(managerPermissions)
            )
          }
          break

        case 'end_break':
          if (!attendance) {
            await sendAndLogMessage('⚠️ لم تسجل حضورك بعد! لا يوجد سجل حضور مفتوح.', getEmployeeKeyboard(managerPermissions))
          } else if (attendance.status !== 'on_break') {
            await sendAndLogMessage('⚠️ أنت لست في استراحة!', getEmployeeKeyboard(managerPermissions))
          } else {
            const localTime = getLocalTime(companyTimezone)
            const nowUtc = new Date().toISOString()
            
            // Check if this is a night shift
            const isNightShift = attendanceDate !== today
            const nightShiftNote = isNightShift ? `\n🌙 <i>وردية ليلية - حضور من ${attendanceDate}</i>` : ''
            
            const { data: activeBreak } = await supabase
              .from('break_logs')
              .select('*')
              .eq('attendance_id', attendance.id)
              .is('end_time', null)
              .single()

            if (activeBreak) {
              const startTime = new Date(activeBreak.start_time)
              const endTime = new Date(nowUtc)
              const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000)

              await supabase
                .from('break_logs')
                .update({ 
                  end_time: nowUtc, 
                  duration_minutes: durationMinutes 
                })
                .eq('id', activeBreak.id)
            }

            await supabase
              .from('attendance_logs')
              .update({ status: 'checked_in' })
              .eq('id', attendance.id)

            await sendAndLogMessage(
              `✅ انتهت الاستراحة\n\n⏰ الوقت: ${localTime.time}${nightShiftNote}`,
              getEmployeeKeyboard(managerPermissions)
            )
          }
          break

        case 'request_leave':
          // Start leave request flow - ask for leave type
          await setSession('leave_type_choice', {})
          await sendAndLogMessage(
            `📝 <b>طلب إجازة</b>\n\n` +
            `📊 رصيدك الحالي:\n` +
            `• إجازات طارئة: ${employee.emergency_leave_balance ?? companyDefaults.emergency_leave_days} يوم\n` +
            `• إجازات اعتيادية: ${employee.leave_balance ?? companyDefaults.annual_leave_days} يوم\n\n` +
            `اختر نوع الإجازة:`,
            {
              inline_keyboard: [
                [{ text: '🚨 إجازة طارئة', callback_data: 'leave_emergency' }],
                [{ text: '📅 إجازة اعتيادية', callback_data: 'leave_regular' }],
                [{ text: '❌ إلغاء', callback_data: 'cancel_leave' }]
              ]
            }
          )
          break

        case 'leave_emergency': {
          // Ask for the day - today or another day using date picker buttons
          await setSession('leave_date_choice', { leave_type: 'emergency' })
          await sendAndLogMessage(
            `🚨 <b>إجازة طارئة</b>\n\n` +
            `📊 رصيدك المتاح: ${employee.emergency_leave_balance ?? companyDefaults.emergency_leave_days} يوم\n\n` +
            `اختر يوم الإجازة:`,
            getDatePickerKeyboard('emergency')
          )
          break
        }

        case 'leave_regular': {
          // Regular leave needs 48 hours notice - show date picker
          await setSession('leave_date_choice', { leave_type: 'regular' })
          await sendAndLogMessage(
            `📅 <b>إجازة اعتيادية</b>\n\n` +
            `📊 رصيدك المتاح: ${employee.leave_balance ?? companyDefaults.annual_leave_days} يوم\n\n` +
            `⚠️ الإجازة الاعتيادية تحتاج إبلاغ مسبق قبل 48 ساعة على الأقل.\n\n` +
            `اختر يوم الإجازة:`,
            getDatePickerKeyboard('regular')
          )
          break
        }

        case 'leave_today':
        case 'leave_tomorrow':
        case 'leave_day_after': {
          const session = await getSession()
          if (!session) break
          
          const now = new Date()
          let targetDate: Date
          let dayLabel: string
          
          if (callbackData === 'leave_today') {
            targetDate = now
            dayLabel = 'اليوم'
          } else if (callbackData === 'leave_tomorrow') {
            targetDate = new Date(now)
            targetDate.setDate(targetDate.getDate() + 1)
            dayLabel = 'غداً'
          } else {
            targetDate = new Date(now)
            targetDate.setDate(targetDate.getDate() + 2)
            dayLabel = 'بعد غد'
          }
          
          const dateStr = targetDate.toISOString().split('T')[0]
          
          // Check 48 hours rule for regular leave
          if (session.data.leave_type === 'regular') {
            const minDate = new Date()
            minDate.setDate(minDate.getDate() + 2)
            minDate.setHours(0, 0, 0, 0)
            targetDate.setHours(0, 0, 0, 0)
            
            if (targetDate < minDate) {
              await sendAndLogMessage(
                `❌ الإجازة الاعتيادية تحتاج إبلاغ مسبق قبل 48 ساعة على الأقل.\n\n` +
                `📅 أقرب تاريخ متاح: بعد غد`,
                {
                  inline_keyboard: [
                    [{ text: '🔙 رجوع', callback_data: 'leave_regular' }],
                    [{ text: '❌ إلغاء', callback_data: 'cancel_leave' }]
                  ]
                }
              )
              break
            }
          }
          
          // Always ask for reason now (both emergency and regular)
          await setSession('leave_reason', { ...session.data, leave_date: dateStr })
          await sendAndLogMessage(
            `📅 تاريخ الإجازة: ${dayLabel} (${dateStr})\n\n` +
            `📝 أرسل سبب الإجازة:`
          )
          break
        }

        case 'leave_other_day': {
          const session = await getSession()
          if (!session) break
          
          // Show next 7 days as buttons
          await setSession('leave_date_picker', session.data)
          await sendAndLogMessage(
            `📆 اختر تاريخ الإجازة:`,
            getExtendedDatePickerKeyboard(session.data.leave_type || 'emergency')
          )
          break
        }

        case 'cancel_leave':
          await deleteSession()
          await sendAndLogMessage(
            `❌ تم إلغاء طلب الإجازة`,
            getEmployeeKeyboard(managerPermissions)
          )
          break

        // Removed old default case - consolidated below

        case 'my_salary':
          // Check if it's the last day of the month
          const currentDate = new Date()
          const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
          const isLastDay = currentDate.getDate() === lastDayOfMonth
          
          if (!isLastDay) {
            await sendAndLogMessage(
              `⏳ <b>المرتب غير متاح حالياً</b>\n\n` +
              `يمكنك الاطلاع على تقرير مرتبك في آخر يوم من الشهر فقط.\n\n` +
              `📅 اليوم الحالي: ${currentDate.getDate()}\n` +
              `📅 آخر يوم في الشهر: ${lastDayOfMonth}`,
              getEmployeeKeyboard()
            )
          } else {
            // Get salary info
            const { data: empDetails } = await supabase
              .from('employees')
              .select('base_salary, currency, work_start_time, work_end_time, weekend_days')
              .eq('id', employee.id)
              .single()
            
            const baseSalary = empDetails?.base_salary || 0
            // Use employee currency, fallback to company default currency
            const currency = empDetails?.currency || companyDefaults.currency
            
            // Get this month's data
            const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
            const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
            
            // Get attendance for overtime calculation
            const { data: monthAttendance } = await supabase
              .from('attendance_logs')
              .select('*')
              .eq('employee_id', employee.id)
              .gte('date', monthStart.toISOString().split('T')[0])
              .lte('date', monthEnd.toISOString().split('T')[0])
            
            // Get adjustments
            const { data: adjustments } = await supabase
              .from('salary_adjustments')
              .select('*')
              .eq('employee_id', employee.id)
              .gte('month', monthStart.toISOString().split('T')[0])
              .lte('month', monthEnd.toISOString().split('T')[0])
            
            const totalBonus = adjustments?.reduce((sum, a) => sum + (a.bonus || 0), 0) || 0
            const totalDeduction = adjustments?.reduce((sum, a) => sum + (a.deduction || 0), 0) || 0
            
            // Calculate overtime (simplified - hours beyond 8 per day)
            let overtimeHours = 0
            const workStartTime = empDetails?.work_start_time || '09:00:00'
            const workEndTime = empDetails?.work_end_time || '17:00:00'
            
            for (const log of monthAttendance || []) {
              if (log.check_in_time && log.check_out_time) {
                const checkIn = new Date(log.check_in_time)
                const checkOut = new Date(log.check_out_time)
                const hoursWorked = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
                if (hoursWorked > 8) {
                  overtimeHours += hoursWorked - 8
                }
              }
            }
            
            // Calculate overtime amount (hourly rate * 2 for overtime)
            const hourlyRate = baseSalary / 30 / 8
            const overtimeAmount = Math.round(overtimeHours * hourlyRate * 2)
            
            const workDays = monthAttendance?.length || 0
            const netSalary = baseSalary + totalBonus + overtimeAmount - totalDeduction
            
            let salaryMsg = `💰 <b>تقرير راتبك - ${currentDate.toLocaleString('ar-EG', { month: 'long', year: 'numeric' })}</b>\n\n`
            salaryMsg += `📊 الراتب الأساسي: ${baseSalary.toLocaleString()} ${currency}\n`
            if (overtimeAmount > 0) {
              salaryMsg += `⏰ الوقت الإضافي (${overtimeHours.toFixed(1)} ساعة): +${overtimeAmount.toLocaleString()} ${currency}\n`
            }
            if (totalBonus > 0) {
              salaryMsg += `🎉 المكافآت: +${totalBonus.toLocaleString()} ${currency}\n`
            }
            if (totalDeduction > 0) {
              salaryMsg += `📉 الخصومات: -${totalDeduction.toLocaleString()} ${currency}\n`
            }
            salaryMsg += `\n💵 <b>الإجمالي: ${netSalary.toLocaleString()} ${currency}</b>\n`
            salaryMsg += `\n📅 أيام العمل: ${workDays} يوم`
            
            await sendAndLogMessage(salaryMsg, getEmployeeKeyboard(managerPermissions))
          }
          break

        case 'my_status':
          let statusMsg = `👤 ${employee.full_name}\n\n`
          statusMsg += `📊 رصيد الإجازات: ${employee.leave_balance || 0} يوم\n\n`
          
          if (attendance) {
            const statusEmoji = attendance.status === 'checked_in' ? '🟢'
              : attendance.status === 'on_break' ? '☕' 
              : attendance.status === 'checked_out' ? '🔴' : '❓'
            statusMsg += `حالتك اليوم: ${statusEmoji} ${getStatusText(attendance.status)}\n`
            statusMsg += `⏰ وقت الحضور: ${attendance.check_in_time?.split('T')[1]?.substring(0, 8) || '-'}\n`
            if (attendance.check_out_time) {
              statusMsg += `⏰ وقت الانصراف: ${attendance.check_out_time.split('T')[1].substring(0, 8)}\n`
            }
          } else {
            statusMsg += `📅 لم تسجل حضورك اليوم بعد`
          }

          await sendAndLogMessage(statusMsg, getEmployeeKeyboard(managerPermissions))
          break
          
        case 'manage_team':
          // Check if employee has manager permissions
          if (!managerPermissions?.can_add_bonuses && !managerPermissions?.can_make_deductions && !managerPermissions?.can_approve_leaves) {
            await sendAndLogMessage('❌ ليس لديك صلاحيات إدارية', getEmployeeKeyboard(managerPermissions))
            break
          }
          
          await sendAndLogMessage(
            '👥 <b>صلاحيات المدير</b>\n\nاختر الإجراء المطلوب:',
            getManagerTeamKeyboard(managerPermissions)
          )
          break
          
        case 'mgr_add_bonus':
        case 'mgr_add_deduction': {
          const isBonus = callbackData === 'mgr_add_bonus'
          
          // Check permission
          if (isBonus && !managerPermissions?.can_add_bonuses) {
            await sendAndLogMessage('❌ ليس لديك صلاحية إضافة مكافآت', getEmployeeKeyboard(managerPermissions))
            break
          }
          if (!isBonus && !managerPermissions?.can_make_deductions) {
            await sendAndLogMessage('❌ ليس لديك صلاحية إضافة خصومات', getEmployeeKeyboard(managerPermissions))
            break
          }
          
          // Get subordinates using position hierarchy
          const { data: subordinates, error: subError } = await supabase
            .rpc('get_subordinate_employees', { manager_employee_id: employee.id })
          
          console.log('Subordinates for manager:', employee.id, subordinates, subError)
          
          if (!subordinates || subordinates.length === 0) {
            await sendAndLogMessage('❌ لا يوجد موظفين تحت إدارتك في الهيكل التنظيمي', getEmployeeKeyboard(managerPermissions))
            break
          }
          
          // Get employee details
          const { data: subEmployees } = await supabase
            .from('employees')
            .select('id, full_name, base_salary')
            .in('id', subordinates.map((s: any) => s.employee_id))
            .eq('is_active', true)
          
          if (!subEmployees || subEmployees.length === 0) {
            await sendAndLogMessage('❌ لا يوجد موظفين نشطين تحت إدارتك', getEmployeeKeyboard(managerPermissions))
            break
          }
          
          // Store action type in session
          await setSession(isBonus ? 'mgr_bonus_select' : 'mgr_deduction_select', {})
          
          // Show subordinates list
          const actionText = isBonus ? 'إضافة مكافأة لـ' : 'إضافة خصم لـ'
          const subButtons = subEmployees.map(emp => ([{
            text: emp.full_name,
            callback_data: `mgr_select_emp_${emp.id}`
          }]))
          
          subButtons.push([{ text: '🔙 رجوع', callback_data: 'manage_team' }])
          subButtons.push([{ text: '❌ إلغاء', callback_data: 'cancel_mgr_action' }])
          
          await sendAndLogMessage(
            `📋 <b>${actionText}</b>\n\n👥 الموظفين تحت إدارتك:\n` +
            `(يتم عرض الموظفين المرتبطين بمنصبك في الهيكل التنظيمي)\n\nاختر الموظف:`,
            { inline_keyboard: subButtons }
          )
          break
        }
          
        case 'cancel_mgr_action':
          await deleteSession()
          await sendAndLogMessage(
            'تم الإلغاء',
            getEmployeeKeyboard(managerPermissions)
          )
          break
          
        case 'back_to_main':
          await sendAndLogMessage(
            'اختر من الأزرار أدناه:',
            getEmployeeKeyboard(managerPermissions)
          )
          break
          
        default:
          // Handle dynamic callbacks
          
          // Handle dynamic date selection (leave_date_YYYY-MM-DD)
          if (callbackData.startsWith('leave_date_')) {
            const session = await getSession()
            if (!session) break
            
            const dateStr = callbackData.replace('leave_date_', '')
            
            // Always ask for reason
            await setSession('leave_reason', { ...session.data, leave_date: dateStr })
            await sendMessage(botToken, chatId, 
              `📅 تاريخ الإجازة: ${dateStr}\n\n` +
              `📝 أرسل سبب الإجازة:`
            )
          }
          // Handle manager employee selection
          else if (callbackData.startsWith('mgr_select_emp_')) {
            const targetEmpId = callbackData.replace('mgr_select_emp_', '')
            const session = await getSession()
            
            if (!session) break
            
            const isBonus = session.step === 'mgr_bonus_select'
            
            // Get target employee info with salary
            const { data: targetEmp } = await supabase
              .from('employees')
              .select('id, full_name, base_salary')
              .eq('id', targetEmpId)
              .single()
            
            if (!targetEmp) {
              await sendAndLogMessage('❌ الموظف غير موجود', getEmployeeKeyboard(managerPermissions))
              break
            }
            
            const baseSalary = targetEmp.base_salary || 0
            const dailyRate = baseSalary / 30
            
            // Store selected employee
            await setSession(isBonus ? 'mgr_bonus_amount_choice' : 'mgr_deduction_amount_choice', {
              target_employee_id: targetEmpId,
              target_employee_name: targetEmp.full_name
            })
            
            // Create preset buttons based on daily rate
            const quarterDay = Math.round(dailyRate * 0.25)
            const halfDay = Math.round(dailyRate * 0.5)
            const oneDay = Math.round(dailyRate)
            const twoDays = Math.round(dailyRate * 2)
            
            const actionText = isBonus ? 'مكافأة' : 'خصم'
            const presetPrefix = isBonus ? 'mgr_bonus_preset_' : 'mgr_deduction_preset_'
            
            const amountButtons: { text: string; callback_data: string }[][] = []
            
            if (baseSalary > 0) {
              amountButtons.push([
                { text: `ربع يوم (${quarterDay})`, callback_data: `${presetPrefix}${quarterDay}_0.25` },
                { text: `نصف يوم (${halfDay})`, callback_data: `${presetPrefix}${halfDay}_0.5` }
              ])
              amountButtons.push([
                { text: `يوم كامل (${oneDay})`, callback_data: `${presetPrefix}${oneDay}_1` },
                { text: `يومين (${twoDays})`, callback_data: `${presetPrefix}${twoDays}_2` }
              ])
            }
            
            amountButtons.push([{ text: '✏️ إدخال مبلغ مخصص', callback_data: isBonus ? 'mgr_bonus_custom' : 'mgr_deduction_custom' }])
            amountButtons.push([{ text: '🔙 رجوع', callback_data: isBonus ? 'mgr_add_bonus' : 'mgr_add_deduction' }])
            amountButtons.push([{ text: '❌ إلغاء', callback_data: 'cancel_mgr_action' }])
            
            await sendAndLogMessage(
              `👤 الموظف: ${targetEmp.full_name}\n` +
              (baseSalary > 0 ? `💵 الراتب: ${baseSalary}\n📊 اليومي: ${Math.round(dailyRate)}\n\n` : '\n') +
              `اختر قيمة ال${actionText}:`,
              { inline_keyboard: amountButtons }
            )
          }
          // Handle preset amount selection
          else if (callbackData.startsWith('mgr_bonus_preset_') || callbackData.startsWith('mgr_deduction_preset_')) {
            const session = await getSession()
            if (!session) break
            
            const isBonus = callbackData.startsWith('mgr_bonus_preset_')
            const parts = callbackData.replace(isBonus ? 'mgr_bonus_preset_' : 'mgr_deduction_preset_', '').split('_')
            const amount = parseFloat(parts[0])
            const days = parseFloat(parts[1])
            
            // Ask for reason
            await setSession(isBonus ? 'mgr_bonus_desc' : 'mgr_deduction_desc', {
              ...session.data,
              adjustment_amount: amount,
              adjustment_days: days
            } as any)
            
            const actionText = isBonus ? 'المكافأة' : 'الخصم'
            await sendMessage(botToken, chatId, 
              `💰 القيمة: ${amount} (${days} يوم)\n\n📝 أرسل سبب ${actionText}:`
            )
          }
          // Handle custom amount selection
          else if (callbackData === 'mgr_bonus_custom' || callbackData === 'mgr_deduction_custom') {
            const session = await getSession()
            if (!session) break
            
            const isBonus = callbackData === 'mgr_bonus_custom'
            await setSession(isBonus ? 'mgr_bonus_amount' : 'mgr_deduction_amount', session.data)
            
            const actionText = isBonus ? 'المكافأة' : 'الخصم'
            await sendMessage(botToken, chatId, 
              `👤 الموظف: ${session.data.target_employee_name}\n\n` +
              `💰 أرسل قيمة ${actionText} (بالأرقام فقط):`
            )
          }
          // Handle leave approval/rejection from manager
          else if (callbackData.startsWith('approve_leave_') || callbackData.startsWith('reject_leave_')) {
            const isApproval = callbackData.startsWith('approve_leave_')
            const leaveRequestId = callbackData.replace(isApproval ? 'approve_leave_' : 'reject_leave_', '')
            
            // Check permission
            if (!managerPermissions?.can_approve_leaves) {
              await sendAndLogMessage('❌ ليس لديك صلاحية الموافقة على الإجازات', getEmployeeKeyboard(managerPermissions))
              break
            }
            
            // Fetch leave request details
            const { data: leaveRequest, error: leaveError } = await supabase
              .from('leave_requests')
              .select('*, employees(id, full_name, telegram_chat_id, leave_balance, emergency_leave_balance)')
              .eq('id', leaveRequestId)
              .eq('status', 'pending')
              .single()
            
            if (leaveError || !leaveRequest) {
              await sendAndLogMessage('❌ هذا الطلب غير موجود أو تم اتخاذ قرار بشأنه بالفعل', getEmployeeKeyboard(managerPermissions))
              break
            }
            
            // Update leave request status
            const { error: updateError } = await supabase
              .from('leave_requests')
              .update({
                status: isApproval ? 'approved' : 'rejected',
                reviewed_by: employee?.user_id || null,
                reviewed_at: new Date().toISOString()
              })
              .eq('id', leaveRequestId)
            
            if (updateError) {
              console.error('Error updating leave request:', updateError)
              await sendAndLogMessage('❌ حدث خطأ أثناء تحديث الطلب', getEmployeeKeyboard(managerPermissions))
              break
            }
            
            // If approved, deduct from leave balance
            if (isApproval) {
              const empData = leaveRequest.employees
              if (leaveRequest.leave_type === 'emergency') {
                const currentBalance = empData.emergency_leave_balance || companyDefaults.emergency_leave_days
                await supabase
                  .from('employees')
                  .update({ emergency_leave_balance: Math.max(0, currentBalance - leaveRequest.days) })
                  .eq('id', leaveRequest.employee_id)
              } else {
                const currentBalance = empData.leave_balance || companyDefaults.annual_leave_days
                await supabase
                  .from('employees')
                  .update({ leave_balance: Math.max(0, currentBalance - leaveRequest.days) })
                  .eq('id', leaveRequest.employee_id)
              }
            }
            
            // Notify employee about the decision
            try {
              await supabase.functions.invoke('notify-leave-status', {
                body: { leave_request_id: leaveRequestId, status: isApproval ? 'approved' : 'rejected' }
              })
            } catch (notifyError) {
              console.error('Error notifying employee about leave status:', notifyError)
            }
            
            // Confirmation message to manager
            const statusText = isApproval ? '✅ تمت الموافقة' : '❌ تم الرفض'
            const leaveTypeText = leaveRequest.leave_type === 'emergency' ? 'طارئة' : 'اعتيادية'
            await sendAndLogMessage(
              `${statusText} على طلب الإجازة\n\n` +
              `👤 الموظف: ${leaveRequest.employees.full_name}\n` +
              `📋 نوع الإجازة: ${leaveTypeText}\n` +
              `📅 التاريخ: ${leaveRequest.start_date}` +
              (leaveRequest.start_date !== leaveRequest.end_date ? ` - ${leaveRequest.end_date}` : '') +
              `\n📊 عدد الأيام: ${leaveRequest.days}`,
              getEmployeeKeyboard(managerPermissions)
            )
            
            console.log(`Manager ${employee?.full_name} ${isApproval ? 'approved' : 'rejected'} leave request ${leaveRequestId}`)
          }
          // Handle join request restoration of deleted employee (short format: jrr_{shortId})
          else if (callbackData.startsWith('jrr_')) {
            // Format: jrr_{first 8 chars of joinRequestId}
            const shortId = callbackData.replace('jrr_', '')
            
            // Fetch join request by partial ID match
            const { data: joinRequests, error: jrError } = await supabase
              .from('join_requests')
              .select('*')
              .eq('status', 'pending')
              .eq('company_id', companyId)
            
            const joinRequest = joinRequests?.find((jr: any) => jr.id.startsWith(shortId))
            
            if (jrError || !joinRequest) {
              await sendMessage(botToken, chatId, '❌ هذا الطلب غير موجود أو تم اتخاذ قرار بشأنه بالفعل', getEmployeeKeyboard(managerPermissions))
              break
            }
            
            // Find deleted record by telegram_chat_id
            const { data: deletedRecords } = await supabase
              .from('deleted_records')
              .select('*')
              .eq('table_name', 'employees')
              .eq('company_id', companyId)
              .eq('is_restored', false)
              .order('deleted_at', { ascending: false })
            
            // Filter for matching telegram_chat_id
            const deletedRecord = deletedRecords?.find((record: any) => {
              const recordData = record.record_data as Record<string, unknown>
              return recordData?.telegram_chat_id === joinRequest.telegram_chat_id
            })
            
            if (!deletedRecord) {
              await sendMessage(botToken, chatId, '❌ لم يتم العثور على سجل الموظف المحذوف', getEmployeeKeyboard(managerPermissions))
              break
            }
            
            const employeeData = deletedRecord.record_data as Record<string, any>
            
            // Prepare restored employee data (exclude id field)
            const { id: _id, created_at, updated_at, ...restoreData } = employeeData
            
            // Insert restored employee
            const { data: restoredEmployee, error: restoreError } = await supabase
              .from('employees')
              .insert({
                ...restoreData,
                telegram_chat_id: joinRequest.telegram_chat_id, // Use current telegram chat id
                is_active: true
              })
              .select('id, full_name')
              .single()
            
            if (restoreError) {
              console.error('Failed to restore employee:', restoreError)
              await sendMessage(botToken, chatId, '❌ حدث خطأ أثناء استعادة الموظف', getEmployeeKeyboard(managerPermissions))
              break
            }
            
            // Mark deleted record as restored
            await supabase
              .from('deleted_records')
              .update({ 
                is_restored: true, 
                restored_at: new Date().toISOString() 
              })
              .eq('id', deletedRecord.id)
            
            // Update join request status
            await supabase
              .from('join_requests')
              .update({
                status: 'approved',
                reviewed_by: employee?.user_id || null,
                reviewed_at: new Date().toISOString()
              })
              .eq('id', joinRequest.id)
            
            // Notify applicant
            try {
              await sendMessage(botToken, parseInt(joinRequest.telegram_chat_id), 
                `🎉 مرحباً ${restoredEmployee?.full_name || employeeData.full_name}!\n\n` +
                `تمت استعادة حسابك السابق بنجاح!\n` +
                `جميع بياناتك السابقة متاحة الآن.\n\n` +
                `يمكنك استخدام البوت لتسجيل الحضور والانصراف.\n` +
                `أرسل /start للبدء.`,
                {
                  inline_keyboard: [
                    [
                      { text: '✅ تسجيل حضور', callback_data: 'check_in' },
                      { text: '🔴 تسجيل انصراف', callback_data: 'check_out' }
                    ]
                  ]
                }
              )
            } catch (e) {
              console.error('Failed to notify restored employee:', e)
            }
            
            await sendMessage(botToken, chatId, 
              `✅ تمت استعادة الموظف ${restoredEmployee?.full_name || employeeData.full_name} بنجاح\n\n` +
              `📂 تم استرجاع جميع بياناته السابقة`,
              getEmployeeKeyboard(managerPermissions)
            )
          }
          // Handle join request approval/rejection from reviewer
          else if (callbackData.startsWith('jr_approve_') || callbackData.startsWith('jr_reject_') || callbackData.startsWith('jr_details_')) {
            const isApprove = callbackData.startsWith('jr_approve_')
            const isReject = callbackData.startsWith('jr_reject_')
            const isDetails = callbackData.startsWith('jr_details_')
            
            let joinRequestId = ''
            if (isApprove) joinRequestId = callbackData.replace('jr_approve_', '')
            else if (isReject) joinRequestId = callbackData.replace('jr_reject_', '')
            else if (isDetails) joinRequestId = callbackData.replace('jr_details_', '')
            
            // Fetch join request
            const { data: joinRequest, error: jrError } = await supabase
              .from('join_requests')
              .select('*')
              .eq('id', joinRequestId)
              .eq('status', 'pending')
              .single()
            
            if (jrError || !joinRequest) {
              await sendMessage(botToken, chatId, '❌ هذا الطلب غير موجود أو تم اتخاذ قرار بشأنه بالفعل', getEmployeeKeyboard(managerPermissions))
              break
            }
            
            if (isReject) {
              // Direct rejection
              await supabase
                .from('join_requests')
                .update({
                  status: 'rejected',
                  reviewed_by: employee?.user_id || null,
                  reviewed_at: new Date().toISOString()
                })
                .eq('id', joinRequestId)
              
              // Notify applicant
              try {
                await sendMessage(botToken, parseInt(joinRequest.telegram_chat_id), 
                  '❌ عذراً، تم رفض طلب انضمامك.\n\nيمكنك المحاولة مرة أخرى لاحقاً.'
                )
              } catch (e) {
                console.error('Failed to notify rejected applicant:', e)
              }
              
              await sendMessage(botToken, chatId, 
                `✅ تم رفض طلب انضمام ${joinRequest.full_name}`,
                getEmployeeKeyboard(managerPermissions)
              )
            } else if (isApprove) {
              // Quick approval with defaults
              const { data: compData } = await supabase
                .from('companies')
                .select('default_currency, default_weekend_days, work_start_time, work_end_time')
                .eq('id', companyId)
                .single()
              
              const { error: empError } = await supabase
                .from('employees')
                .insert({
                  company_id: companyId,
                  full_name: joinRequest.full_name,
                  email: joinRequest.email || `${joinRequest.telegram_chat_id}@telegram.user`,
                  phone: joinRequest.phone || null,
                  telegram_chat_id: joinRequest.telegram_chat_id,
                  national_id: joinRequest.national_id || null,
                  work_start_time: joinRequest.work_start_time || compData?.work_start_time || '09:00:00',
                  work_end_time: joinRequest.work_end_time || compData?.work_end_time || '17:00:00',
                  weekend_days: joinRequest.weekend_days || compData?.default_weekend_days || ['friday'],
                  currency: compData?.default_currency || 'SAR',
                  base_salary: 0
                })
              
              if (empError) {
                console.error('Failed to create employee:', empError)
                await sendMessage(botToken, chatId, '❌ حدث خطأ أثناء إضافة الموظف', getEmployeeKeyboard(managerPermissions))
                break
              }
              
              await supabase
                .from('join_requests')
                .update({
                  status: 'approved',
                  reviewed_by: employee?.user_id || null,
                  reviewed_at: new Date().toISOString()
                })
                .eq('id', joinRequestId)
              
              // Notify applicant
              try {
                await sendMessage(botToken, parseInt(joinRequest.telegram_chat_id), 
                  `🎉 مرحباً ${joinRequest.full_name}!\n\n` +
                  `تم قبول طلب انضمامك بنجاح!\n` +
                  `يمكنك الآن استخدام البوت لتسجيل الحضور والانصراف.\n\n` +
                  `أرسل /start للبدء.`,
                  {
                    inline_keyboard: [
                      [
                        { text: '✅ تسجيل حضور', callback_data: 'check_in' },
                        { text: '🔴 تسجيل انصراف', callback_data: 'check_out' }
                      ]
                    ]
                  }
                )
              } catch (e) {
                console.error('Failed to notify approved applicant:', e)
              }
              
              await sendMessage(botToken, chatId, 
                `✅ تم قبول ${joinRequest.full_name} كموظف جديد\n\n` +
                `📝 ملاحظة: تم إضافة الموظف بدون راتب أو منصب محدد.`,
                getEmployeeKeyboard(managerPermissions)
              )
            } else if (isDetails) {
              // Start detailed approval flow - ask for salary
              await setSession('jr_salary', { 
                join_request_id: joinRequestId,
                join_request_applicant_name: joinRequest.full_name
              })
              
              await sendMessage(botToken, chatId, 
                `📋 <b>تحديد بيانات الموظف الجديد</b>\n\n` +
                `👤 الاسم: ${joinRequest.full_name}\n\n` +
                `💰 أرسل الراتب الأساسي (بالأرقام فقط):`,
                {
                  inline_keyboard: [
                    [{ text: '⏭️ تخطي (بدون راتب)', callback_data: 'jr_skip_salary' }],
                    [{ text: '❌ إلغاء', callback_data: 'jr_cancel' }]
                  ]
                }
              )
            }
          }
          // Handle skip salary in join request
          else if (callbackData === 'jr_skip_salary') {
            const session = await getSession()
            if (!session?.data.join_request_id) break
            
            await setSession('jr_position', { 
              ...session.data,
              join_request_salary: 0
            })
            
            // Get positions for selection
            const { data: positions } = await supabase
              .from('positions')
              .select('id, title, title_ar')
              .eq('company_id', companyId)
              .eq('is_active', true)
            
            const positionButtons = positions?.map(p => ([{
              text: p.title_ar || p.title,
              callback_data: `jr_pos_${p.id}`
            }])) || []
            
            positionButtons.push([{ text: '⏭️ تخطي (بدون منصب)', callback_data: 'jr_skip_position' }])
            positionButtons.push([{ text: '❌ إلغاء', callback_data: 'jr_cancel' }])
            
            await sendMessage(botToken, chatId, 
              `👤 ${session.data.join_request_applicant_name}\n` +
              `💰 الراتب: 0\n\n` +
              `📋 اختر المنصب:`,
              { inline_keyboard: positionButtons }
            )
          }
          // Handle position selection in join request
          else if (callbackData.startsWith('jr_pos_')) {
            const session = await getSession()
            if (!session?.data.join_request_id) break
            
            const positionId = callbackData.replace('jr_pos_', '')
            await finalizeJoinRequestApproval(supabase, botToken, chatId, companyId, session.data.join_request_id, session.data.join_request_salary || 0, positionId, employee?.user_id, managerPermissions)
            await deleteSession()
          }
          // Handle skip position in join request
          else if (callbackData === 'jr_skip_position') {
            const session = await getSession()
            if (!session?.data.join_request_id) break
            
            await finalizeJoinRequestApproval(supabase, botToken, chatId, companyId, session.data.join_request_id, session.data.join_request_salary || 0, null, employee?.user_id, managerPermissions)
            await deleteSession()
          }
          // Handle cancel join request review
          else if (callbackData === 'jr_cancel') {
            await deleteSession()
            await sendMessage(botToken, chatId, '❌ تم إلغاء مراجعة الطلب', getEmployeeKeyboard(managerPermissions))
          }
          break
      }

      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }

    // Handle location messages for Level 3 verification
    if (update.message?.location && employee) {
      const session = await getSession()
      
      if (session?.step === 'pending_location_checkin') {
        const userLat = update.message.location.latitude
        const userLng = update.message.location.longitude
        
        // Get employee's allowed locations (if assigned) or all company locations
        const { data: employeeLocations } = await supabase
          .from('employee_locations')
          .select('location_id')
          .eq('employee_id', employee.id)
        
        const employeeLocationIds = employeeLocations?.map(el => el.location_id) || []
        
        // Get company locations
        let locationsQuery = supabase
          .from('company_locations')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true)
        
        // If employee has specific locations assigned, filter to those
        if (employeeLocationIds.length > 0) {
          locationsQuery = locationsQuery.in('id', employeeLocationIds)
        }
        
        const { data: companyLocations } = await locationsQuery
        
        // Fallback to legacy company location if no locations defined
        const companyLat = company?.company_latitude
        const companyLng = company?.company_longitude
        const defaultRadius = company?.location_radius_meters || 100
        
        // Check if we have any locations to verify against
        const hasLocations = companyLocations && companyLocations.length > 0
        const hasLegacyLocation = companyLat && companyLng
        
        if (!hasLocations && !hasLegacyLocation) {
          await sendMessage(botToken, chatId, 
            '⚠️ <b>خطأ في الإعدادات</b>\n\n' +
            'لم يتم تحديد مواقع للشركة بعد.\n' +
            'يرجى التواصل مع الإدارة.',
            getEmployeeKeyboard(managerPermissions)
          )
          await deleteSession()
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
        }
        
        // Check against all allowed locations
        let matchedLocation: { id: string; name: string; distance: number } | null = null
        let closestDistance = Infinity
        let closestLocationName = ''
        
        if (hasLocations) {
          for (const loc of companyLocations!) {
            const distance = calculateDistance(userLat, userLng, Number(loc.latitude), Number(loc.longitude))
            
            console.log('Location check:', {
              locationName: loc.name,
              userLat, userLng,
              locLat: loc.latitude, locLng: loc.longitude,
              distance, radius: loc.radius_meters
            })
            
            if (distance < closestDistance) {
              closestDistance = distance
              closestLocationName = loc.name
            }
            
            if (distance <= loc.radius_meters) {
              matchedLocation = { id: loc.id, name: loc.name, distance }
              break // Found a valid location
            }
          }
        } else if (hasLegacyLocation) {
          // Fallback to legacy single location
          const distance = calculateDistance(userLat, userLng, companyLat, companyLng)
          closestDistance = distance
          closestLocationName = 'المقر الرئيسي'
          
          if (distance <= defaultRadius) {
            matchedLocation = { id: '', name: 'المقر الرئيسي', distance }
          }
        }
        
        if (matchedLocation) {
          // Location verified - process check-in
          const localTime = getLocalTime(companyTimezone)
          const nowUtc = new Date().toISOString()
          const checkInTime = localTime.time
          const today = localTime.date
          
          // Record location for audit
          await supabase.from('employee_location_history').insert({
            employee_id: employee.id,
            company_id: companyId,
            latitude: userLat,
            longitude: userLng,
            is_suspicious: false
          })
          
          // Get company policies and employee details for check-in
          const { data: locCompanyPolicies } = await supabase
            .from('companies')
            .select('late_under_15_deduction, late_15_to_30_deduction, late_over_30_deduction, daily_late_allowance_minutes, monthly_late_allowance_minutes, overtime_multiplier')
            .eq('id', companyId)
            .single()
          
          const { data: locEmpDetails } = await supabase
            .from('employees')
            .select('monthly_late_balance_minutes, base_salary, currency')
            .eq('id', employee.id)
            .single()
          
          // Process check-in directly with location info
          await processDirectCheckIn(
            supabase, botToken, chatId, employee, companyId, today, nowUtc, checkInTime, 
            companyDefaults, locCompanyPolicies, locEmpDetails, managerPermissions,
            { locationId: matchedLocation.id || null, locationName: matchedLocation.name, latitude: userLat, longitude: userLng }
          )
          
          // Remove keyboard and clear session
          await removeReplyKeyboard(botToken, chatId, 
            `✅ تم التحقق من موقعك بنجاح!\n` +
            `📍 الموقع: <b>${matchedLocation.name}</b>\n` +
            `📏 المسافة: ${Math.round(matchedLocation.distance)} متر`
          )
          await deleteSession()
        } else {
          // Location outside allowed radius
          await supabase.from('employee_location_history').insert({
            employee_id: employee.id,
            company_id: companyId,
            latitude: userLat,
            longitude: userLng,
            is_suspicious: true,
            suspicion_reason: `خارج نطاق المواقع المسموحة - أقرب موقع: ${closestLocationName} (${Math.round(closestDistance)} متر)`
          })
          
          const locationsList = hasLocations 
            ? companyLocations!.map(l => `• ${l.name} (نطاق ${l.radius_meters}م)`).join('\n')
            : `• المقر الرئيسي (نطاق ${defaultRadius}م)`
          
          await removeReplyKeyboard(botToken, chatId, 
            `❌ <b>فشل التحقق من الموقع</b>\n\n` +
            `📍 أقرب موقع: <b>${closestLocationName}</b>\n` +
            `📏 المسافة: <b>${Math.round(closestDistance)} متر</b>\n\n` +
            `🏢 <b>المواقع المسموحة لك:</b>\n${locationsList}\n\n` +
            `يرجى التأكد من تواجدك داخل نطاق أحد المواقع المسموحة.`
          )
          await deleteSession()
        }
        
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
      }
    }
    
    // Handle text messages
    const text = update.message?.text?.trim()
    
    // Handle cancel button from reply keyboard
    if (text === '❌ إلغاء' && employee) {
      await deleteSession()
      await removeReplyKeyboard(botToken, chatId, '✅ تم الإلغاء')
      await sendMessage(botToken, chatId, 'اختر ما تريد فعله:', getEmployeeKeyboard(managerPermissions))
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }
    
    if (!text) {
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }

    // Handle /start command
    if (text === '/start') {
      await deleteSession() // Clear any pending session
      
      if (employee) {
        await sendAndLogMessage(
          `مرحباً ${employee.full_name}! 👋\n\nاختر من الأزرار أدناه:`,
          getEmployeeKeyboard(managerPermissions)
        )
      } else {
        await sendWelcomeMessage(botToken, chatId, false)
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }

    // Handle registration flow text inputs
    const session = await getSession()
    if (session && !employee) {
      console.log('Processing registration step:', session.step, 'with text:', text)
      
      switch (session.step) {
        case 'full_name':
          // Validate full name (at least 2 words)
          const nameParts = text.split(' ').filter(p => p.length > 0)
          if (nameParts.length < 2) {
            await sendMessage(botToken, chatId,
              '❌ يرجى إدخال الاسم الثنائي على الأقل\n\n' +
              'مثال: أحمد محمد'
            )
            return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
          }
          
          const newNameData = { ...session.data, full_name: text }
          await setSession('email', newNameData)

          await sendMessage(botToken, chatId,
            '✅ تم حفظ الاسم\n\n' +
            '📧 الخطوة 2 من 5:\n' +
            'أرسل <b>بريدك الإلكتروني</b>\n\n' +
            'مثال: ahmed@email.com'
          )
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })

        case 'email':
          // Validate email
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(text)) {
            await sendMessage(botToken, chatId,
              '❌ بريد إلكتروني غير صحيح\n\n' +
              'مثال: ahmed@email.com'
            )
            return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
          }
          
          const newEmailData = { ...session.data, email: text }
          await setSession('phone', newEmailData)

          await sendMessage(botToken, chatId,
            '✅ تم حفظ البريد الإلكتروني\n\n' +
            '📱 الخطوة 3 من 5:\n' +
            'أرسل <b>رقم هاتفك</b>\n\n' +
            'مثال: 0501234567'
          )
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })

        case 'phone':
          // Basic phone validation
          const phoneClean = text.replace(/[\s\-\+]/g, '')
          if (phoneClean.length < 9 || !/^\d+$/.test(phoneClean)) {
            await sendMessage(botToken, chatId,
              '❌ رقم هاتف غير صحيح\n\n' +
              'مثال: 0501234567'
            )
            return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
          }
          
          const newPhoneData = { ...session.data, phone: text }
          await setSession('work_time_choice', newPhoneData)

          await sendMessage(botToken, chatId,
            '✅ تم حفظ رقم الهاتف\n\n' +
            '⏰ الخطوة 4 من 5:\n' +
            'اختر مواعيد العمل:\n\n' +
            `الوقت الافتراضي للشركة:\n` +
            `🕐 من ${companyDefaults.work_start_time.substring(0, 5)} إلى ${companyDefaults.work_end_time.substring(0, 5)}`,
            {
              inline_keyboard: [
                [{ text: '✅ استخدام الوقت الافتراضي', callback_data: 'use_default_time' }],
                [{ text: '⏰ تحديد وقت مختلف', callback_data: 'custom_time' }],
                [{ text: '❌ إلغاء', callback_data: 'cancel_registration' }]
              ]
            }
          )
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })

        case 'work_start_time':
          // Validate time format
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/
          if (!timeRegex.test(text)) {
            await sendMessage(botToken, chatId,
              '❌ صيغة الوقت غير صحيحة\n\n' +
              'الصيغة الصحيحة: HH:MM\n' +
              'مثال: 09:00'
            )
            return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
          }
          
          const newStartTimeData = { ...session.data, work_start_time: text + ':00' }
          await setSession('work_end_time', newStartTimeData)

          await sendMessage(botToken, chatId,
            `✅ وقت البدء: ${text}\n\n` +
            'أرسل <b>وقت انتهاء العمل</b>\n\n' +
            'الصيغة: HH:MM (مثال: 17:00)'
          )
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })

        case 'work_end_time':
          const endTimeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/
          if (!endTimeRegex.test(text)) {
            await sendMessage(botToken, chatId,
              '❌ صيغة الوقت غير صحيحة\n\n' +
              'الصيغة الصحيحة: HH:MM\n' +
              'مثال: 17:00'
            )
            return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
          }
          
          const newEndTimeData = { ...session.data, work_end_time: text + ':00' }
          await setSession('weekend_days', newEndTimeData)

          await sendMessage(botToken, chatId,
            `✅ وقت العمل: من ${session.data.work_start_time?.substring(0, 5)} إلى ${text}\n\n` +
            '📅 الخطوة 5 من 5:\n' +
            'اختر أيام الإجازة الأسبوعية:',
            getWeekendKeyboard()
          )
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
      }
    }

    // Handle employee leave request flow
    if (session && employee) {
      console.log('Processing employee session step:', session.step, 'with text:', text)
      
      switch (session.step) {
        case 'leave_date_input':
        case 'leave_date_choice': {
          // Handle date input for leave requests
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/
          if (!dateRegex.test(text)) {
            await sendMessage(botToken, chatId,
              '❌ صيغة التاريخ غير صحيحة\n\n' +
              'الصيغة الصحيحة: YYYY-MM-DD\n' +
              'مثال: 2025-01-15'
            )
            return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
          }
          
          const leaveDate = new Date(text)
          const todayDate = new Date()
          todayDate.setHours(0, 0, 0, 0)
          
          if (leaveDate < todayDate) {
            await sendMessage(botToken, chatId,
              '❌ لا يمكن طلب إجازة في تاريخ سابق'
            )
            return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
          }
          
          // Check 48 hours rule for regular leave
          if (session.data.leave_type === 'regular') {
            const minDate = new Date()
            minDate.setDate(minDate.getDate() + 2)
            minDate.setHours(0, 0, 0, 0)
            
            if (leaveDate < minDate) {
              await sendMessage(botToken, chatId,
                `❌ الإجازة الاعتيادية تحتاج إبلاغ مسبق قبل 48 ساعة على الأقل.\n\n` +
                `📅 أقرب تاريخ متاح: ${minDate.toISOString().split('T')[0]}`
              )
              return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
            }
          }
          
          // Check monthly leave limit first
          const maxExcusedAbsenceDays = companyDefaults.max_excused_absence_days
          const leaveLimitCheck = await checkMonthlyLeaveLimit(supabase, employee.id, companyId, maxExcusedAbsenceDays)
          
          if (!leaveLimitCheck.allowed) {
            await deleteSession()
            await sendMessage(botToken, chatId, leaveLimitCheck.message, getEmployeeKeyboard(managerPermissions))
            return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
          }
          
          // For emergency leave with balance
          if (session.data.leave_type === 'emergency') {
            const { data: empData } = await supabase
              .from('employees')
              .select('emergency_leave_balance')
              .eq('id', employee.id)
              .single()
            
            const emergencyBalance = empData?.emergency_leave_balance ?? 7
            
            if (emergencyBalance > 0) {
              // Auto-approve
              await supabase.from('leave_requests').insert({
                employee_id: employee.id,
                company_id: companyId,
                leave_type: 'emergency',
                start_date: text,
                end_date: text,
                days: 1,
                reason: 'إجازة طارئة',
                status: 'approved',
                reviewed_at: new Date().toISOString()
              })
              
              await supabase
                .from('employees')
                .update({ emergency_leave_balance: emergencyBalance - 1 })
                .eq('id', employee.id)
              
              await deleteSession()
              await sendMessage(botToken, chatId, 
                `✅ <b>تمت الموافقة على إجازتك الطارئة!</b>\n\n` +
                `📅 التاريخ: ${text}\n` +
                `📊 الرصيد المتبقي: ${emergencyBalance - 1} يوم طارئ\n` +
                `📊 إجازات الشهر: ${leaveLimitCheck.usedDays + 1}/${maxExcusedAbsenceDays} يوم`,
                getEmployeeKeyboard(managerPermissions)
              )
              return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
            }
          }
          
          // Need reason - submit to manager
          await setSession('leave_reason', { ...session.data, leave_date: text })
          await sendMessage(botToken, chatId, 
            `📝 أرسل سبب الإجازة:`
          )
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
        }

        case 'leave_reason': {
          // Get employee emergency balance
          const { data: empData } = await supabase
            .from('employees')
            .select('emergency_leave_balance, leave_balance')
            .eq('id', employee.id)
            .single()
          
          const leaveType = session.data.leave_type === 'emergency' ? 'emergency' : 'regular'
          const leaveDate = session.data.leave_date || getLocalTime(companyTimezone).date
          const typeText = leaveType === 'emergency' ? 'طارئة' : 'اعتيادية'
          
          // For emergency leave with balance - auto-approve
          if (leaveType === 'emergency') {
            const emergencyBalance = empData?.emergency_leave_balance ?? 7
            
            if (emergencyBalance > 0) {
              // Auto-approve emergency leave
              await supabase.from('leave_requests').insert({
                employee_id: employee.id,
                company_id: companyId,
                leave_type: 'emergency',
                start_date: leaveDate,
                end_date: leaveDate,
                days: 1,
                reason: text,
                status: 'approved',
                reviewed_at: new Date().toISOString()
              })
              
              // Deduct from emergency balance
              await supabase
                .from('employees')
                .update({ emergency_leave_balance: emergencyBalance - 1 })
                .eq('id', employee.id)
              
              await deleteSession()
              await sendMessage(botToken, chatId, 
                `✅ <b>تمت الموافقة على إجازتك الطارئة!</b>\n\n` +
                `📅 التاريخ: ${leaveDate}\n` +
                `📝 السبب: ${text}\n` +
                `📊 الرصيد المتبقي: ${emergencyBalance - 1} يوم طارئ\n\n` +
                `🏠 يوم إجازة سعيد!`,
                getEmployeeKeyboard(managerPermissions)
              )
              return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
            }
          }
          
          // Submit leave request to manager (no balance or regular leave)
          const { data: leaveRequestData, error: leaveError } = await supabase.from('leave_requests').insert({
            employee_id: employee.id,
            company_id: companyId,
            leave_type: leaveType as any,
            start_date: leaveDate,
            end_date: leaveDate,
            days: 1,
            reason: text,
            status: 'pending'
          }).select('id').single()
          
          if (leaveError) {
            console.error('Error creating leave request:', leaveError)
            await sendMessage(botToken, chatId, '❌ حدث خطأ أثناء إرسال طلب الإجازة', getEmployeeKeyboard(managerPermissions))
            await deleteSession()
            return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
          }
          
          // Notify managers about the leave request with approval buttons
          await notifyManagersLeaveRequest(
            supabase, 
            botToken, 
            employee.id, 
            employee.full_name, 
            companyId, 
            leaveType, 
            leaveDate, 
            text,
            leaveRequestData.id
          )
          
          await deleteSession()
          await sendMessage(botToken, chatId, 
            `✅ <b>تم إرسال طلب الإجازة للمدير</b>\n\n` +
            `📋 النوع: إجازة ${typeText}\n` +
            `📅 التاريخ: ${leaveDate}\n` +
            `📝 السبب: ${text}\n\n` +
            `⏳ سيتم إبلاغك على التيلجرام عند الموافقة أو الرفض.`,
            getEmployeeKeyboard(managerPermissions)
          )
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
        }
        
        case 'mgr_bonus_amount':
        case 'mgr_deduction_amount': {
          const amount = parseFloat(text)
          if (isNaN(amount) || amount <= 0) {
            await sendMessage(botToken, chatId, '❌ يرجى إدخال قيمة صحيحة (رقم موجب)')
            return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
          }
          
          const isBonus = session.step === 'mgr_bonus_amount'
          await setSession(isBonus ? 'mgr_bonus_desc' : 'mgr_deduction_desc', {
            ...session.data,
            adjustment_amount: amount
          } as any)
          
          await sendMessage(botToken, chatId, 
            `💰 القيمة: ${amount}\n\n📝 أرسل سبب ${isBonus ? 'المكافأة' : 'الخصم'}:`
          )
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
        }
        
        case 'mgr_bonus_desc':
        case 'mgr_deduction_desc': {
          const isBonus = session.step === 'mgr_bonus_desc'
          const targetEmpId = session.data.target_employee_id
          const targetEmpName = session.data.target_employee_name
          const amount = session.data.adjustment_amount || 0
          const adjustmentDays = session.data.adjustment_days || null
          
          const today = new Date()
          const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
          
          // Insert salary adjustment
          // Note: added_by is a foreign key to auth.users, so we use the employee's user_id if available
          // Otherwise we leave it null and use added_by_name for tracking
          const { data: managerUser } = await supabase
            .from('employees')
            .select('user_id')
            .eq('id', employee.id)
            .single()
          
          console.log('Inserting salary adjustment:', {
            employee_id: targetEmpId,
            company_id: companyId,
            month: monthKey,
            bonus: isBonus ? amount : 0,
            deduction: isBonus ? 0 : amount,
            adjustment_days: adjustmentDays,
            description: text,
            added_by: managerUser?.user_id || null,
            added_by_name: employee.full_name
          })
          
          const { data: insertedAdjustment, error: insertError } = await supabase.from('salary_adjustments').insert({
            employee_id: targetEmpId,
            company_id: companyId,
            month: monthKey,
            bonus: isBonus ? amount : 0,
            deduction: isBonus ? 0 : amount,
            adjustment_days: adjustmentDays,
            description: text,
            added_by: managerUser?.user_id || null, // Use user_id if available, null otherwise
            added_by_name: employee.full_name,
            is_auto_generated: false
          }).select()
          
          if (insertError) {
            console.error('Error inserting salary adjustment:', insertError)
            await sendMessage(botToken, chatId, 
              `❌ حدث خطأ أثناء تسجيل ${isBonus ? 'المكافأة' : 'الخصم'}:\n${insertError.message}`,
              getEmployeeKeyboard(managerPermissions)
            )
            await deleteSession()
            return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
          }
          
          console.log('Successfully inserted salary adjustment:', insertedAdjustment)
          
          // Notify the target employee
          const { data: targetEmp } = await supabase
            .from('employees')
            .select('telegram_chat_id')
            .eq('id', targetEmpId)
            .single()
          
          if (targetEmp?.telegram_chat_id) {
            // Get target employee's currency or use company default
            const { data: targetEmpDetails } = await supabase
              .from('employees')
              .select('currency')
              .eq('id', targetEmpId)
              .single()
            
            const empCurrency = targetEmpDetails?.currency || companyDefaults.currency
            
            const emoji = isBonus ? '🎉' : '⚠️'
            const typeText = isBonus ? 'مكافأة' : 'خصم'
            await sendMessage(botToken, parseInt(targetEmp.telegram_chat_id),
              `${emoji} <b>إشعار ${typeText}</b>\n\n` +
              `📋 ${employee.full_name} سجّل لك ${typeText}\n` +
              `📝 السبب: ${text}\n` +
              `💰 القيمة: ${amount} ${empCurrency}`
            )
          }
          
          await deleteSession()
          await sendMessage(botToken, chatId, 
            `✅ تم تسجيل ${isBonus ? 'المكافأة' : 'الخصم'} بنجاح!\n\n` +
            `👤 الموظف: ${targetEmpName}\n` +
            `💰 القيمة: ${amount}\n` +
            `📝 السبب: ${text}`,
            getEmployeeKeyboard(managerPermissions)
          )
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
        }
        
        // Handle join request salary input
        case 'jr_salary': {
          const salary = parseFloat(text)
          if (isNaN(salary) || salary < 0) {
            await sendMessage(botToken, chatId, '❌ يرجى إدخال رقم صحيح للراتب')
            return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
          }
          
          await setSession('jr_position', { 
            ...session.data,
            join_request_salary: salary
          })
          
          // Get positions for selection
          const { data: positions } = await supabase
            .from('positions')
            .select('id, title, title_ar')
            .eq('company_id', companyId)
            .eq('is_active', true)
          
          const positionButtons = positions?.map((p: any) => ([{
            text: p.title_ar || p.title,
            callback_data: `jr_pos_${p.id}`
          }])) || []
          
          positionButtons.push([{ text: '⏭️ تخطي (بدون منصب)', callback_data: 'jr_skip_position' }])
          positionButtons.push([{ text: '❌ إلغاء', callback_data: 'jr_cancel' }])
          
          await sendMessage(botToken, chatId, 
            `👤 ${session.data.join_request_applicant_name}\n` +
            `💰 الراتب: ${salary}\n\n` +
            `📋 اختر المنصب:`,
            { inline_keyboard: positionButtons }
          )
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
        }
      }
    }

    // Handle /leave command for employees
    if (text.startsWith('/leave') && employee) {
      const parts = text.replace('/leave', '').trim().split('|').map(p => p.trim())
      
      if (parts.length < 3) {
        await sendMessage(botToken, chatId, 
          '❌ صيغة غير صحيحة!\n\n' +
          'الصيغة الصحيحة:\n' +
          '/leave نوع_الإجازة | تاريخ_البداية | تاريخ_النهاية | السبب\n\n' +
          'أنواع الإجازات: vacation | sick | personal\n\n' +
          'مثال:\n/leave vacation | 2025-01-15 | 2025-01-17 | إجازة عائلية'
        )
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
      }

      const [leaveType, startDate, endDate, reason] = parts
      
      const validTypes = ['vacation', 'sick', 'personal']
      if (!validTypes.includes(leaveType.toLowerCase())) {
        await sendMessage(botToken, chatId, 
          '❌ نوع إجازة غير صحيح!\n\n' +
          'الأنواع المتاحة: vacation | sick | personal'
        )
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
      }

      const start = new Date(startDate)
      const end = new Date(endDate)
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

      if (days <= 0) {
        await sendMessage(botToken, chatId, '❌ تاريخ النهاية يجب أن يكون بعد تاريخ البداية!')
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
      }

      await supabase.from('leave_requests').insert({
        employee_id: employee.id,
        company_id: companyId,
        leave_type: leaveType.toLowerCase() as 'vacation' | 'sick' | 'personal',
        start_date: startDate,
        end_date: endDate,
        days,
        reason: reason || null
      })

      await sendMessage(botToken, chatId, 
        `✅ تم إرسال طلب الإجازة بنجاح!\n\n` +
        `📋 النوع: ${getLeaveTypeText(leaveType)}\n` +
        `📅 من: ${startDate}\n` +
        `📅 إلى: ${endDate}\n` +
        `📊 عدد الأيام: ${days}\n` +
        (reason ? `📝 السبب: ${reason}\n` : '') +
        `\n⏳ سيتم مراجعة طلبك من قبل الإدارة.`,
        getEmployeeKeyboard(managerPermissions)
      )
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }

    // Default response
    if (employee) {
      await sendMessage(botToken, chatId, 
        'اختر من الأزرار أدناه:',
        getEmployeeKeyboard(managerPermissions)
      )
    } else {
      // If there's a session but we're here, user might have sent unexpected input
      if (session) {
        await sendMessage(botToken, chatId,
          '⚠️ يرجى اتباع التعليمات أو إرسال /start للبدء من جديد'
        )
      } else {
        await sendWelcomeMessage(botToken, chatId, false)
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  }
})

// Helper functions

// Notify managers about employee attendance
async function notifyManagers(
  supabase: any,
  botToken: string,
  employeeId: string,
  employeeName: string,
  companyId: string,
  action: 'check_in' | 'check_out',
  time: string,
  date: string,
  locationName?: string,
  overtimeInfo?: { minutes: number; amount?: number; currency?: string },
  earlyDepartureInfo?: { minutes: number; deductionDays: number; amount?: number; currency?: string }
) {
  try {
    // Get managers using the database function
    const { data: managers, error } = await supabase
      .rpc('get_employee_managers', { emp_id: employeeId })
    
    if (error) {
      console.error('Error getting managers:', error)
      return
    }
    
    if (!managers || managers.length === 0) {
      console.log('No managers found for employee:', employeeId)
      return
    }
    
    const actionText = action === 'check_in' ? 'سجّل حضوره' : 'سجّل انصرافه'
    const emoji = action === 'check_in' ? '✅' : '🔴'
    const headerText = action === 'check_in' ? 'إشعار حضور' : 'إشعار انصراف'
    
    let message = `${emoji} <b>${headerText}</b>\n\n` +
      `👤 الموظف: ${employeeName}\n` +
      `📋 ${actionText}\n` +
      `📅 التاريخ: ${date}\n` +
      `⏰ الوقت: ${time}`
    
    // Add location info if available (Level 3 verification)
    if (locationName) {
      message += `\n📍 الموقع: ${locationName}`
    }
    
    // Add overtime info for checkout
    if (overtimeInfo && overtimeInfo.minutes > 0) {
      const hours = Math.floor(overtimeInfo.minutes / 60)
      const mins = overtimeInfo.minutes % 60
      message += `\n\n⏰ <b>وقت إضافي:</b> ${hours > 0 ? `${hours} ساعة و ` : ''}${mins} دقيقة`
      if (overtimeInfo.amount && overtimeInfo.amount > 0) {
        message += `\n💰 قيمته: ${overtimeInfo.amount.toFixed(2)} ${overtimeInfo.currency || 'SAR'}`
      }
    }
    
    // Add early departure info for checkout
    if (earlyDepartureInfo && earlyDepartureInfo.minutes > 0) {
      const deductionText = earlyDepartureInfo.deductionDays === 0.25 ? 'ربع يوم' : 
                            earlyDepartureInfo.deductionDays === 0.5 ? 'نصف يوم' : 
                            `${earlyDepartureInfo.deductionDays} يوم`
      message += `\n\n⚠️ <b>انصراف مبكر:</b> ${earlyDepartureInfo.minutes} دقيقة`
      message += `\n📛 خصم: ${deductionText}`
      if (earlyDepartureInfo.amount && earlyDepartureInfo.amount > 0) {
        message += ` (${earlyDepartureInfo.amount.toFixed(2)} ${earlyDepartureInfo.currency || 'SAR'})`
      }
    }
    
    // Send notification to each manager
    for (const manager of managers) {
      if (manager.manager_telegram_chat_id) {
        await sendMessage(botToken, parseInt(manager.manager_telegram_chat_id), message)
        console.log(`Notified manager ${manager.manager_name} about ${employeeName}'s ${action}`)
      }
    }
  } catch (error) {
    console.error('Error notifying managers:', error)
  }
}

// Notify managers about leave request with approval/rejection buttons
async function notifyManagersLeaveRequest(
  supabase: any,
  botToken: string,
  employeeId: string,
  employeeName: string,
  companyId: string,
  leaveType: string,
  leaveDate: string,
  reason: string,
  leaveRequestId: string
) {
  try {
    const { data: managers, error } = await supabase
      .rpc('get_employee_managers', { emp_id: employeeId })
    
    if (error) {
      console.error('Error getting managers for leave request:', error)
      return
    }
    
    if (!managers || managers.length === 0) {
      console.log('No managers found for employee:', employeeId)
      return
    }
    
    const leaveTypeText = leaveType === 'emergency' ? 'طارئة' : 'اعتيادية'
    
    const message = `📝 <b>طلب إجازة جديد</b>\n\n` +
      `👤 الموظف: ${employeeName}\n` +
      `📋 نوع الإجازة: ${leaveTypeText}\n` +
      `📅 التاريخ: ${leaveDate}\n` +
      `📝 السبب: ${reason || 'لم يحدد'}\n\n` +
      `⚡ اختر قرارك:`
    
    // Approval/rejection buttons
    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ موافقة', callback_data: `approve_leave_${leaveRequestId}` },
          { text: '❌ رفض', callback_data: `reject_leave_${leaveRequestId}` }
        ]
      ]
    }
    
    for (const manager of managers) {
      if (manager.manager_telegram_chat_id) {
        await sendMessage(botToken, parseInt(manager.manager_telegram_chat_id), message, keyboard)
        console.log(`Notified manager ${manager.manager_name} about ${employeeName}'s leave request with action buttons`)
      }
    }
  } catch (error) {
    console.error('Error notifying managers about leave request:', error)
  }
}

async function submitRegistration(
  supabase: any,
  botToken: string,
  chatId: number,
  sessionData: SessionData,
  companyId: string,
  telegramChatId: string,
  username?: string
) {
  // Check if request already exists
  const { data: existingRequest } = await supabase
    .from('join_requests')
    .select('id, status')
    .eq('telegram_chat_id', telegramChatId)
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .single()

  if (existingRequest) {
    await sendMessage(botToken, chatId, 
      '⚠️ لديك طلب قيد المراجعة بالفعل!\n\n' +
      'يمكنك التحقق من حالة طلبك بالضغط على "حالة طلبي"'
    )
    return
  }

  // Create join request with all collected data including work schedule
  const { data: newRequest, error: insertError } = await supabase.from('join_requests').insert({
    company_id: companyId,
    telegram_chat_id: telegramChatId,
    telegram_username: username,
    full_name: sessionData.full_name,
    email: sessionData.email,
    phone: sessionData.phone,
    work_start_time: sessionData.work_start_time || null,
    work_end_time: sessionData.work_end_time || null,
    weekend_days: sessionData.weekend_days || ['friday', 'saturday'],
  }).select('id').single()

  if (insertError) {
    console.error('Failed to create join request:', insertError)
    await sendMessage(botToken, chatId, '❌ حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.')
    return
  }

  // Get company name for notification
  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', companyId)
    .single()

  // Get all configured reviewers from the new table
  const { data: reviewers } = await supabase
    .from('join_request_reviewers')
    .select('reviewer_type, reviewer_id')
    .eq('company_id', companyId)

  // Notify all reviewers if configured
  if (reviewers && reviewers.length > 0 && newRequest?.id) {
    await notifyAllJoinRequestReviewers(
      supabase,
      botToken,
      companyId,
      newRequest.id,
      sessionData,
      telegramChatId,
      username,
      reviewers,
      company?.name || ''
    )
  }

  await sendMessage(botToken, chatId, 
    '✅ <b>تم إرسال طلب الانضمام بنجاح!</b>\n\n' +
    '📋 ملخص بياناتك:\n' +
    `👤 الاسم: ${sessionData.full_name}\n` +
    `📧 البريد: ${sessionData.email}\n` +
    `📱 الهاتف: ${sessionData.phone}\n` +
    `⏰ وقت العمل: ${sessionData.work_start_time?.substring(0, 5)} - ${sessionData.work_end_time?.substring(0, 5)}\n` +
    `📅 أيام الإجازة: ${sessionData.weekend_days?.map((d: string) => getDayName(d)).join('، ')}\n\n` +
    '⏳ سيتم مراجعة طلبك من قبل الإدارة.\n' +
    'سنرسل لك إشعاراً فور الموافقة على طلبك.',
    {
      inline_keyboard: [
        [{ text: '📋 حالة طلبي', callback_data: 'check_status' }]
      ]
    }
  )
}

// Submit registration bypassing deleted employee check (for force new registration)
async function submitRegistrationForce(
  supabase: any,
  botToken: string,
  chatId: number,
  sessionData: SessionData,
  companyId: string,
  telegramChatId: string,
  username?: string
) {
  // Check if request already exists
  const { data: existingRequest } = await supabase
    .from('join_requests')
    .select('id, status')
    .eq('telegram_chat_id', telegramChatId)
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .single()

  if (existingRequest) {
    await sendMessage(botToken, chatId, 
      '⚠️ لديك طلب قيد المراجعة بالفعل!\n\n' +
      'يمكنك التحقق من حالة طلبك بالضغط على "حالة طلبي"'
    )
    return
  }

  // Create join request with all collected data including work schedule
  const { data: newRequest, error: insertError } = await supabase.from('join_requests').insert({
    company_id: companyId,
    telegram_chat_id: telegramChatId,
    telegram_username: username,
    full_name: sessionData.full_name,
    email: sessionData.email,
    phone: sessionData.phone,
    work_start_time: sessionData.work_start_time || null,
    work_end_time: sessionData.work_end_time || null,
    weekend_days: sessionData.weekend_days || ['friday', 'saturday'],
  }).select('id').single()

  if (insertError) {
    console.error('Failed to create join request:', insertError)
    await sendMessage(botToken, chatId, '❌ حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.')
    return
  }

  // Get company name for notification
  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', companyId)
    .single()

  // Get all configured reviewers from the new table
  const { data: reviewers } = await supabase
    .from('join_request_reviewers')
    .select('reviewer_type, reviewer_id')
    .eq('company_id', companyId)

  // Notify all reviewers if configured
  if (reviewers && reviewers.length > 0 && newRequest?.id) {
    await notifyAllJoinRequestReviewers(
      supabase,
      botToken,
      companyId,
      newRequest.id,
      sessionData,
      telegramChatId,
      username,
      reviewers,
      company?.name || ''
    )
  }

  await sendMessage(botToken, chatId, 
    '✅ <b>تم إرسال طلب الانضمام بنجاح!</b>\n\n' +
    '📋 ملخص بياناتك:\n' +
    `👤 الاسم: ${sessionData.full_name}\n` +
    `📧 البريد: ${sessionData.email}\n` +
    `📱 الهاتف: ${sessionData.phone}\n` +
    `⏰ وقت العمل: ${sessionData.work_start_time?.substring(0, 5)} - ${sessionData.work_end_time?.substring(0, 5)}\n` +
    `📅 أيام الإجازة: ${sessionData.weekend_days?.map((d: string) => getDayName(d)).join('، ')}\n\n` +
    '⏳ سيتم مراجعة طلبك من قبل الإدارة.\n' +
    'سنرسل لك إشعاراً فور الموافقة على طلبك.',
    {
      inline_keyboard: [
        [{ text: '📋 حالة طلبي', callback_data: 'check_status' }]
      ]
    }
  )
}

// Notify all designated reviewers about a new join request
async function notifyAllJoinRequestReviewers(
  supabase: any,
  botToken: string,
  companyId: string,
  joinRequestId: string,
  sessionData: SessionData,
  applicantChatId: string,
  applicantUsername: string | undefined,
  reviewers: Array<{ reviewer_type: string; reviewer_id: string }>,
  companyName: string
) {
  try {
    // Check if applicant is a previously deleted employee
    const { data: deletedEmployees } = await supabase
      .from('deleted_records')
      .select('id, record_id, record_data, deleted_at')
      .eq('table_name', 'employees')
      .eq('company_id', companyId)
      .eq('is_restored', false)
      .order('deleted_at', { ascending: false })
    
    // Filter for matching telegram_chat_id in record_data
    const deletedEmployee = deletedEmployees?.find((record: any) => {
      const recordData = record.record_data as Record<string, unknown>
      return recordData?.telegram_chat_id === applicantChatId
    })

    // Collect all unique reviewer chat IDs
    const reviewerChatIds = new Set<string>()

    for (const reviewer of reviewers) {
      if (reviewer.reviewer_type === 'employee') {
        // Get the specific employee
        const { data: emp } = await supabase
          .from('employees')
          .select('telegram_chat_id')
          .eq('id', reviewer.reviewer_id)
          .eq('is_active', true)
          .not('telegram_chat_id', 'is', null)
          .single()
        
        if (emp?.telegram_chat_id) {
          reviewerChatIds.add(emp.telegram_chat_id)
        }
      } else if (reviewer.reviewer_type === 'position') {
        // Get all employees with this position who have telegram connected
        const { data: positionEmployees } = await supabase
          .from('employees')
          .select('telegram_chat_id')
          .eq('position_id', reviewer.reviewer_id)
          .eq('company_id', companyId)
          .eq('is_active', true)
          .not('telegram_chat_id', 'is', null)
        
        if (positionEmployees) {
          for (const emp of positionEmployees) {
            if (emp.telegram_chat_id) {
              reviewerChatIds.add(emp.telegram_chat_id)
            }
          }
        }
      }
    }

    if (reviewerChatIds.size === 0) {
      console.log('No reviewers found with telegram connected for join request:', joinRequestId)
      return
    }

    // Build message based on whether employee was previously deleted
    let message = ''
    let keyboard: any
    
    if (deletedEmployee) {
      const deletedData = deletedEmployee.record_data as { 
        full_name?: string; 
        department?: string; 
        base_salary?: number;
        position_id?: string;
      }
      const deletedDate = new Date(deletedEmployee.deleted_at).toLocaleDateString('ar-EG')
      
      message = 
        `🔄 <b>طلب انضمام من موظف سابق!</b>\n\n` +
        `⚠️ <b>تنبيه: هذا الموظف كان مسجلاً سابقاً وتم حذفه</b>\n\n` +
        `📋 <b>البيانات الجديدة:</b>\n` +
        `👤 الاسم: ${sessionData.full_name}\n` +
        `📧 البريد: ${sessionData.email || 'غير محدد'}\n` +
        `📱 الهاتف: ${sessionData.phone || 'غير محدد'}\n` +
        `📲 تليجرام: ${applicantUsername ? `@${applicantUsername}` : applicantChatId}\n\n` +
        `📂 <b>البيانات السابقة:</b>\n` +
        `👤 الاسم: ${deletedData?.full_name || 'غير محدد'}\n` +
        `${deletedData?.department ? `🏢 القسم: ${deletedData.department}\n` : ''}` +
        `${deletedData?.base_salary ? `💰 الراتب: ${deletedData.base_salary}\n` : ''}` +
        `📅 تاريخ الحذف: ${deletedDate}\n\n` +
        `🏢 الشركة: ${companyName}\n\n` +
        `⚡ <b>اختر إجراء:</b>`
      
      keyboard = {
        inline_keyboard: [
          [{ text: '🔄 استعادة البيانات السابقة', callback_data: `jrr_${joinRequestId.substring(0, 8)}` }],
          [
            { text: '✅ قبول كموظف جديد', callback_data: `jr_approve_${joinRequestId}` },
            { text: '❌ رفض الطلب', callback_data: `jr_reject_${joinRequestId}` }
          ],
          [{ text: '📋 تحديد المنصب والراتب ثم القبول', callback_data: `jr_details_${joinRequestId}` }]
        ]
      }
    } else {
      message = 
        `🆕 <b>طلب انضمام جديد</b>\n\n` +
        `📋 <b>بيانات المتقدم:</b>\n` +
        `👤 الاسم: ${sessionData.full_name}\n` +
        `📧 البريد: ${sessionData.email || 'غير محدد'}\n` +
        `📱 الهاتف: ${sessionData.phone || 'غير محدد'}\n` +
        `📲 تليجرام: ${applicantUsername ? `@${applicantUsername}` : applicantChatId}\n` +
        `⏰ وقت العمل: ${sessionData.work_start_time?.substring(0, 5) || '09:00'} - ${sessionData.work_end_time?.substring(0, 5) || '17:00'}\n` +
        `📅 أيام الإجازة: ${sessionData.weekend_days?.map((d: string) => getDayName(d)).join('، ') || 'الجمعة، السبت'}\n\n` +
        `🏢 الشركة: ${companyName}\n\n` +
        `⚡ <b>اختر إجراء:</b>`

      keyboard = {
        inline_keyboard: [
          [
            { text: '✅ قبول الطلب', callback_data: `jr_approve_${joinRequestId}` },
            { text: '❌ رفض الطلب', callback_data: `jr_reject_${joinRequestId}` }
          ],
          [{ text: '📋 تحديد المنصب والراتب ثم القبول', callback_data: `jr_details_${joinRequestId}` }]
        ]
      }
    }

    // Send notification to all reviewers
    for (const chatId of reviewerChatIds) {
      await sendMessage(botToken, parseInt(chatId), message, keyboard)
    }
    
    console.log(`Join request notification sent to ${reviewerChatIds.size} reviewers${deletedEmployee ? ' (with deleted employee warning)' : ''}`)
  } catch (error) {
    console.error('Failed to notify join request reviewers:', error)
  }
}

// Finalize join request approval with salary and position
async function finalizeJoinRequestApproval(
  supabase: any,
  botToken: string,
  chatId: number,
  companyId: string,
  joinRequestId: string,
  salary: number,
  positionId: string | null,
  reviewerId: string | null,
  managerPermissions: any
) {
  const { data: joinRequest, error: jrError } = await supabase
    .from('join_requests')
    .select('*')
    .eq('id', joinRequestId)
    .eq('status', 'pending')
    .single()
  
  if (jrError || !joinRequest) {
    await sendMessage(botToken, chatId, '❌ هذا الطلب غير موجود أو تم اتخاذ قرار بشأنه بالفعل', getEmployeeKeyboard(managerPermissions))
    return
  }
  
  const { data: compData } = await supabase
    .from('companies')
    .select('default_currency, default_weekend_days, work_start_time, work_end_time')
    .eq('id', companyId)
    .single()
  
  const { error: empError } = await supabase
    .from('employees')
    .insert({
      company_id: companyId,
      full_name: joinRequest.full_name,
      email: joinRequest.email || `${joinRequest.telegram_chat_id}@telegram.user`,
      phone: joinRequest.phone || null,
      telegram_chat_id: joinRequest.telegram_chat_id,
      national_id: joinRequest.national_id || null,
      work_start_time: joinRequest.work_start_time || compData?.work_start_time || '09:00:00',
      work_end_time: joinRequest.work_end_time || compData?.work_end_time || '17:00:00',
      weekend_days: joinRequest.weekend_days || compData?.default_weekend_days || ['friday'],
      currency: compData?.default_currency || 'SAR',
      base_salary: salary,
      position_id: positionId
    })
  
  if (empError) {
    console.error('Failed to create employee:', empError)
    await sendMessage(botToken, chatId, '❌ حدث خطأ أثناء إضافة الموظف', getEmployeeKeyboard(managerPermissions))
    return
  }
  
  await supabase
    .from('join_requests')
    .update({
      status: 'approved',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', joinRequestId)
  
  // Notify applicant
  try {
    await sendMessage(botToken, parseInt(joinRequest.telegram_chat_id), 
      `🎉 مرحباً ${joinRequest.full_name}!\n\n` +
      `تم قبول طلب انضمامك بنجاح!\n` +
      `يمكنك الآن استخدام البوت لتسجيل الحضور والانصراف.\n\n` +
      `أرسل /start للبدء.`,
      {
        inline_keyboard: [
          [
            { text: '✅ تسجيل حضور', callback_data: 'check_in' },
            { text: '🔴 تسجيل انصراف', callback_data: 'check_out' }
          ]
        ]
      }
    )
  } catch (e) {
    console.error('Failed to notify approved applicant:', e)
  }
  
  await sendMessage(botToken, chatId, 
    `✅ تم قبول ${joinRequest.full_name} كموظف جديد\n\n` +
    `💰 الراتب: ${salary}\n` +
    (positionId ? `📋 تم تحديد المنصب` : `📋 بدون منصب محدد`),
    getEmployeeKeyboard(managerPermissions)
  )
}

// Log message to telegram_messages table
async function logTelegramMessage(
  supabase: any,
  companyId: string,
  employeeId: string | null,
  telegramChatId: string,
  messageText: string,
  direction: 'incoming' | 'outgoing',
  messageType: string = 'text',
  metadata: Record<string, unknown> = {},
  telegramMessageId?: number
) {
  if (!employeeId) return // Only log messages for registered employees
  
  try {
    await supabase.from('telegram_messages').insert({
      company_id: companyId,
      employee_id: employeeId,
      telegram_chat_id: telegramChatId,
      message_text: messageText.substring(0, 5000), // Limit message length
      direction,
      message_type: messageType,
      metadata,
      telegram_message_id: telegramMessageId
    })
  } catch (error) {
    console.error('Failed to log telegram message:', error)
  }
}

// Context for message logging - set by the main handler
let messageLogContext: {
  supabase: any;
  companyId: string;
  employeeId: string | null;
  telegramChatId: string;
} | null = null;

function setMessageLogContext(ctx: typeof messageLogContext) {
  messageLogContext = ctx;
}

async function sendMessage(botToken: string, chatId: number, text: string, keyboard?: any) {
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  }

  if (keyboard) {
    body.reply_markup = keyboard
  }

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  let telegramMessageId: number | undefined;
  if (res.ok) {
    try {
      const result = await res.clone().json();
      telegramMessageId = result.result?.message_id;
    } catch (e) {
      // Ignore JSON parse errors
    }
  } else {
    const txt = await res.text().catch(() => '')
    console.error('telegram-webhook: sendMessage failed', { status: res.status, body: txt })
  }
  
  // Auto-log outgoing messages if context is set and chatId matches
  if (messageLogContext && String(chatId) === messageLogContext.telegramChatId && messageLogContext.employeeId) {
    await logTelegramMessage(
      messageLogContext.supabase,
      messageLogContext.companyId,
      messageLogContext.employeeId,
      messageLogContext.telegramChatId,
      text.replace(/<[^>]*>/g, ''), // Remove HTML tags
      'outgoing',
      'text',
      keyboard ? { keyboard } : {},
      telegramMessageId
    );
  }
  
  return res
}

// Send message with reply keyboard (for location requests)
async function sendMessageWithReplyKeyboard(botToken: string, chatId: number, text: string, keyboard: any) {
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: keyboard
  }

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  let telegramMessageId: number | undefined;
  if (res.ok) {
    try {
      const result = await res.clone().json();
      telegramMessageId = result.result?.message_id;
    } catch (e) {}
  } else {
    const txt = await res.text().catch(() => '')
    console.error('telegram-webhook: sendMessageWithReplyKeyboard failed', { status: res.status, body: txt })
  }
  
  // Auto-log if context is set
  if (messageLogContext && String(chatId) === messageLogContext.telegramChatId && messageLogContext.employeeId) {
    await logTelegramMessage(
      messageLogContext.supabase,
      messageLogContext.companyId,
      messageLogContext.employeeId,
      messageLogContext.telegramChatId,
      text.replace(/<[^>]*>/g, ''),
      'outgoing',
      'text',
      { reply_keyboard: keyboard },
      telegramMessageId
    );
  }
}

// Remove reply keyboard and send message
async function removeReplyKeyboard(botToken: string, chatId: number, text: string) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: { remove_keyboard: true }
  }

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  let telegramMessageId: number | undefined;
  if (res.ok) {
    try {
      const result = await res.clone().json();
      telegramMessageId = result.result?.message_id;
    } catch (e) {}
  } else {
    const txt = await res.text().catch(() => '')
    console.error('telegram-webhook: removeReplyKeyboard failed', { status: res.status, body: txt })
  }
  
  // Auto-log if context is set
  if (messageLogContext && String(chatId) === messageLogContext.telegramChatId && messageLogContext.employeeId) {
    await logTelegramMessage(
      messageLogContext.supabase,
      messageLogContext.companyId,
      messageLogContext.employeeId,
      messageLogContext.telegramChatId,
      text.replace(/<[^>]*>/g, ''),
      'outgoing',
      'text',
      {},
      telegramMessageId
    );
  }
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Distance in meters
}

async function answerCallbackQuery(botToken: string, callbackQueryId: string) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId })
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    console.error('telegram-webhook: answerCallbackQuery failed', { status: res.status, body: txt })
  }
}

async function sendWelcomeMessage(botToken: string, chatId: number, isEmployee: boolean, managerPerms?: { can_add_bonuses?: boolean; can_make_deductions?: boolean; can_approve_leaves?: boolean } | null) {
  if (isEmployee) {
    await sendMessage(botToken, chatId, 'مرحباً! 👋\n\nاختر من الأزرار أدناه:', getEmployeeKeyboard(managerPerms))
  } else {
    const keyboard = {
      inline_keyboard: [
        [{ text: '📝 تسجيل موظف جديد', callback_data: 'start_registration' }],
        [{ text: '📋 حالة طلبي', callback_data: 'check_status' }]
      ]
    }
    await sendMessage(botToken, chatId, 
      '👋 مرحباً!\n\n' +
      '❌ أنت غير مسجل كموظف.\n\n' +
      'للتسجيل، اضغط على الزر أدناه وأكمل بياناتك.',
      keyboard
    )
  }
}

function getEmployeeKeyboard(managerPerms?: { can_add_bonuses?: boolean; can_make_deductions?: boolean; can_approve_leaves?: boolean } | null) {
  const keyboard: { text: string; callback_data: string }[][] = [
    [
      { text: '✅ تسجيل حضور', callback_data: 'check_in' },
      { text: '🔴 تسجيل انصراف', callback_data: 'check_out' }
    ],
    [
      { text: '☕ بدء استراحة', callback_data: 'start_break' },
      { text: '↩️ إنهاء استراحة', callback_data: 'end_break' }
    ],
    [
      { text: '📝 طلب إجازة', callback_data: 'request_leave' },
      { text: '💰 راتبي', callback_data: 'my_salary' }
    ],
    [
      { text: '📊 حالتي', callback_data: 'my_status' }
    ]
  ]
  
  // Add manager options if they have permissions
  if (managerPerms?.can_add_bonuses || managerPerms?.can_make_deductions) {
    keyboard.push([
      { text: '👥 إدارة الفريق', callback_data: 'manage_team' }
    ])
  }
  
  return { inline_keyboard: keyboard }
}

function getManagerTeamKeyboard(managerPerms?: { can_add_bonuses?: boolean; can_make_deductions?: boolean; can_approve_leaves?: boolean } | null) {
  const keyboard: { text: string; callback_data: string }[][] = []
  
  if (managerPerms?.can_add_bonuses) {
    keyboard.push([{ text: '🎁 إضافة مكافأة', callback_data: 'mgr_add_bonus' }])
  }
  if (managerPerms?.can_make_deductions) {
    keyboard.push([{ text: '💸 إضافة خصم', callback_data: 'mgr_add_deduction' }])
  }
  if (managerPerms?.can_approve_leaves) {
    keyboard.push([{ text: '📋 طلبات الإجازة', callback_data: 'mgr_leave_requests' }])
  }
  
  keyboard.push([{ text: '🔙 رجوع للقائمة الرئيسية', callback_data: 'back_to_main' }])
  
  return { inline_keyboard: keyboard }
}

function getWeekendKeyboard(selectedDays: string[] = []) {
  const days = [
    { name: 'الجمعة', value: 'friday' },
    { name: 'السبت', value: 'saturday' },
    { name: 'الأحد', value: 'sunday' },
    { name: 'الإثنين', value: 'monday' },
    { name: 'الثلاثاء', value: 'tuesday' },
    { name: 'الأربعاء', value: 'wednesday' },
    { name: 'الخميس', value: 'thursday' },
  ]

  const dayButtons = days.map(day => ({
    text: `${selectedDays.includes(day.value) ? '✅' : '⬜'} ${day.name}`,
    callback_data: `weekend_${day.value}`
  }))

  return {
    inline_keyboard: [
      dayButtons.slice(0, 2),
      dayButtons.slice(2, 4),
      dayButtons.slice(4, 6),
      [dayButtons[6]],
      [{ text: '✅ استخدام الافتراضي (جمعة + سبت)', callback_data: 'use_default_weekend' }],
      [{ text: '✅ تأكيد الاختيار', callback_data: 'confirm_weekend' }],
      [{ text: '❌ إلغاء', callback_data: 'cancel_registration' }]
    ]
  }
}

function getDayName(day: string): string {
  const days: Record<string, string> = {
    'friday': 'الجمعة',
    'saturday': 'السبت',
    'sunday': 'الأحد',
    'monday': 'الإثنين',
    'tuesday': 'الثلاثاء',
    'wednesday': 'الأربعاء',
    'thursday': 'الخميس'
  }
  return days[day] || day
}

function getStatusText(status: string): string {
  switch (status) {
    case 'checked_in': return 'حاضر'
    case 'on_break': return 'في استراحة'
    case 'checked_out': return 'منصرف'
    case 'absent': return 'غائب'
    default: return status
  }
}

function getLeaveTypeText(type: string): string {
  switch (type.toLowerCase()) {
    case 'vacation': return 'إجازة سنوية'
    case 'sick': return 'إجازة مرضية'
    case 'personal': return 'إجازة شخصية'
    case 'emergency': return 'إجازة طارئة'
    case 'regular': return 'إجازة اعتيادية'
    default: return type
  }
}

function getDatePickerKeyboard(leaveType: 'emergency' | 'regular') {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  
  const dayAfter = new Date(now)
  dayAfter.setDate(dayAfter.getDate() + 2)
  const dayAfterStr = dayAfter.toISOString().split('T')[0]

  const buttons = []
  
  if (leaveType === 'emergency') {
    // Emergency: can be today, tomorrow, or day after
    buttons.push([{ text: `📅 اليوم (${today})`, callback_data: 'leave_today' }])
    buttons.push([{ text: `📅 غداً (${tomorrowStr})`, callback_data: 'leave_tomorrow' }])
    buttons.push([{ text: `📅 بعد غد (${dayAfterStr})`, callback_data: 'leave_day_after' }])
  } else {
    // Regular: only day after tomorrow or later (48 hours notice)
    buttons.push([{ text: `📅 بعد غد (${dayAfterStr})`, callback_data: 'leave_day_after' }])
  }
  
  buttons.push([{ text: '📆 يوم آخر', callback_data: 'leave_other_day' }])
  buttons.push([{ text: '❌ إلغاء', callback_data: 'cancel_leave' }])
  
  return { inline_keyboard: buttons }
}

function getExtendedDatePickerKeyboard(leaveType: 'emergency' | 'regular') {
  const now = new Date()
  const startOffset = leaveType === 'regular' ? 2 : 0 // Start from day after tomorrow for regular
  
  const buttons = []
  const daysPerRow = 2
  let row: { text: string; callback_data: string }[] = []
  
  for (let i = startOffset; i < startOffset + 7; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    const dayName = getArabicDayName(date.getDay())
    
    row.push({
      text: `${dayName} ${dateStr.substring(5)}`,
      callback_data: `leave_date_${dateStr}`
    })
    
    if (row.length === daysPerRow) {
      buttons.push(row)
      row = []
    }
  }
  
  if (row.length > 0) {
    buttons.push(row)
  }
  
  buttons.push([{ text: '🔙 رجوع', callback_data: leaveType === 'emergency' ? 'leave_emergency' : 'leave_regular' }])
  buttons.push([{ text: '❌ إلغاء', callback_data: 'cancel_leave' }])
  
  return { inline_keyboard: buttons }
}

function getArabicDayName(dayIndex: number): string {
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  return days[dayIndex]
}

// Helper function to initiate biometric registration (first-time setup)
async function initiateBiometricRegistration(
  supabase: any,
  botToken: string,
  chatId: number,
  employee: any,
  companyId: string,
  telegramChatId: string,
  nextVerificationLevel: number = 1
) {
  // Create a registration token
  const verificationToken = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes for registration
  
  // Store pending registration in database
  const { error } = await supabase
    .from('biometric_pending_verifications')
    .insert({
      employee_id: employee.id,
      company_id: companyId,
      verification_token: verificationToken,
      request_type: 'registration',
      telegram_chat_id: telegramChatId,
      expires_at: expiresAt.toISOString(),
      verification_purpose: 'registration',
      next_verification_level: nextVerificationLevel
    })
  
  if (error) {
    console.error('Failed to create biometric registration:', error)
    await sendMessage(botToken, chatId, '❌ حدث خطأ في إنشاء جلسة التسجيل. حاول مرة أخرى.')
    return
  }
  
  // Get the site URL from environment
  const siteUrl = Deno.env.get('SITE_URL') || 'https://attendly-bot.lovable.app'
  const registerUrl = `${siteUrl}/register-biometric?token=${verificationToken}`
  
  await sendMessage(botToken, chatId,
    `🔐 <b>تسجيل البصمة مطلوب</b>\n\n` +
    `يجب تسجيل بصمتك أولاً للتحقق من هويتك.\n\n` +
    `👆 اضغط على الزر أدناه لتسجيل البصمة:\n\n` +
    `⏰ صالح لمدة 30 دقيقة`,
    {
      inline_keyboard: [[
        { text: '✋ تسجيل البصمة الآن', url: registerUrl }
      ]]
    }
  )
  
  console.log(`Biometric registration initiated for employee ${employee.id}, token: ${verificationToken}`)
}

// Helper function to initiate biometric verification (authentication)
async function initiateBiometricVerification(
  supabase: any,
  botToken: string,
  chatId: number,
  employee: any,
  companyId: string,
  requestType: 'check_in' | 'check_out',
  telegramChatId: string,
  nextVerificationLevel: number = 1
) {
  // Check if employee has registered biometric
  const hasCredential = employee.biometric_credential_id != null
  
  if (!hasCredential) {
    // First time - need to register biometric
    await initiateBiometricRegistration(supabase, botToken, chatId, employee, companyId, telegramChatId, nextVerificationLevel)
    return
  }
  
  // Employee has registered biometric - proceed with verification
  const verificationToken = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  
  // Store pending verification in database
  const { error } = await supabase
    .from('biometric_pending_verifications')
    .insert({
      employee_id: employee.id,
      company_id: companyId,
      verification_token: verificationToken,
      request_type: requestType,
      telegram_chat_id: telegramChatId,
      expires_at: expiresAt.toISOString(),
      verification_purpose: 'authentication',
      next_verification_level: nextVerificationLevel
    })
  
  if (error) {
    console.error('Failed to create biometric verification:', error)
    await sendMessage(botToken, chatId, '❌ حدث خطأ في إنشاء جلسة التحقق. حاول مرة أخرى.')
    return
  }
  
  // Get the site URL from environment
  const siteUrl = Deno.env.get('SITE_URL') || 'https://attendly-bot.lovable.app'
  const verifyUrl = `${siteUrl}/verify-attendance?token=${verificationToken}`
  
  const requestTypeText = requestType === 'check_in' ? 'حضورك' : 'انصرافك'
  
  await sendMessage(botToken, chatId,
    `🔐 <b>التحقق من الهوية مطلوب</b>\n\n` +
    `لتسجيل ${requestTypeText}، يجب التحقق من هويتك أولاً.\n\n` +
    `👆 اضغط على الزر أدناه للتحقق بالبصمة أو الوجه:\n\n` +
    `⏰ صالح لمدة 10 دقائق`,
    {
      inline_keyboard: [[
        { text: '🔐 التحقق الآن', url: verifyUrl }
      ]]
    }
  )
  
  console.log(`Biometric verification initiated for employee ${employee.id}, type: ${requestType}, token: ${verificationToken}`)
}

// Helper function for direct check-in (Level 1)
interface LocationInfo {
  locationId: string | null;
  locationName: string;
  latitude: number;
  longitude: number;
}

async function processDirectCheckIn(
  supabase: any,
  botToken: string,
  chatId: number,
  employee: any,
  companyId: string,
  today: string,
  nowUtc: string,
  checkInTime: string,
  companyDefaults: any,
  companyPolicies: any,
  empDetails: any,
  managerPermissions: any,
  locationInfo?: LocationInfo
) {
  let notes = ''
  let lateMessage = ''
  
  const workStartTime = employee.work_start_time || companyDefaults.work_start_time
  
  // Create attendance log with location info if provided
  const insertData: any = {
    employee_id: employee.id,
    company_id: companyId,
    date: today,
    check_in_time: nowUtc,
    status: 'checked_in',
    notes: null
  }
  
  // Add location tracking if available
  if (locationInfo) {
    if (locationInfo.locationId) {
      insertData.check_in_location_id = locationInfo.locationId
    }
    insertData.check_in_latitude = locationInfo.latitude
    insertData.check_in_longitude = locationInfo.longitude
    
    // Add location name to notes for reference
    insertData.notes = `تم التسجيل من موقع: ${locationInfo.locationName}`
  }
  
  const { data: newAttendance, error: insertError } = await supabase
    .from('attendance_logs')
    .insert(insertData)
    .select('id')
    .single()

  if (insertError) {
    console.error('Failed to create attendance:', insertError)
    await sendMessage(botToken, chatId, '❌ حدث خطأ أثناء تسجيل الحضور')
    return
  }

  const attendanceLogId = newAttendance.id
  
  // Freelancers are exempt from all time-based policies (late deductions)
  const isFreelancer = empDetails?.is_freelancer === true
  
  if (workStartTime && checkInTime > workStartTime && !isFreelancer) {
    const [startH, startM] = workStartTime.split(':').map(Number)
    const [checkH, checkM] = checkInTime.split(':').map(Number)
    const lateMinutes = (checkH * 60 + checkM) - (startH * 60 + startM)
    
    if (lateMinutes > 0) {
      notes = `تأخر ${lateMinutes} دقيقة - موعد العمل: ${workStartTime}`
      
      await supabase.from('attendance_logs')
        .update({ notes })
        .eq('id', attendanceLogId)
      
      let currentLateBalance = empDetails?.monthly_late_balance_minutes ?? companyPolicies?.monthly_late_allowance_minutes ?? 15
      const balanceApplicableMinutes = Math.min(lateMinutes, 15)
      
      if (currentLateBalance > 0 && balanceApplicableMinutes <= currentLateBalance && lateMinutes <= 15) {
        const newBalance = currentLateBalance - lateMinutes
        await supabase
          .from('employees')
          .update({ monthly_late_balance_minutes: newBalance })
          .eq('id', employee.id)
        
        lateMessage = `\n\n⏱️ <b>التأخير:</b> ${lateMinutes} دقيقة\n` +
          `✅ تم خصم ${lateMinutes} دقيقة من رصيد التأخيرات\n` +
          `📊 رصيدك المتبقي: ${newBalance} دقيقة`
      } else {
        let balanceUsed = 0
        // Only deduct from monthly balance if late <= 15 minutes
        if (currentLateBalance > 0 && lateMinutes <= 15) {
          balanceUsed = Math.min(currentLateBalance, balanceApplicableMinutes)
          await supabase
            .from('employees')
            .update({ monthly_late_balance_minutes: currentLateBalance - balanceUsed })
            .eq('id', employee.id)
        }
        // NOTE: When late > 15 minutes, do NOT deduct from monthly balance
        
        const effectiveLateMinutes = lateMinutes <= 15 ? (lateMinutes - balanceUsed) : 0
        
        let deductionDays = 0
        let deductionText = ''
        
        if (lateMinutes > 30 && companyPolicies?.late_over_30_deduction) {
          deductionDays = companyPolicies.late_over_30_deduction
          deductionText = `تأخر أكثر من 30 دقيقة`
        } else if (lateMinutes > 15 && companyPolicies?.late_15_to_30_deduction) {
          deductionDays = companyPolicies.late_15_to_30_deduction
          deductionText = `تأخر من 15 إلى 30 دقيقة`
        } else if (effectiveLateMinutes > 0 && companyPolicies?.late_under_15_deduction) {
          deductionDays = companyPolicies.late_under_15_deduction
          deductionText = `تأخر أقل من 15 دقيقة`
        }
        
        if (deductionDays > 0) {
          const baseSalary = empDetails?.base_salary ?? 0
          const dailyRate = baseSalary / 30
          const deductionAmount = dailyRate * deductionDays
          const monthKey = today.substring(0, 7) + '-01'
          
          await supabase.from('salary_adjustments').insert({
            employee_id: employee.id,
            company_id: companyId,
            month: monthKey,
            deduction: deductionAmount,
            bonus: 0,
            adjustment_days: deductionDays,
            description: `خصم تأخير يوم ${today} - ${deductionText} (${lateMinutes} دقيقة)`,
            added_by_name: 'النظام التلقائي',
            attendance_log_id: attendanceLogId,
            is_auto_generated: true
          })
          
          lateMessage = `\n\n⏱️ <b>التأخير:</b> ${lateMinutes} دقيقة\n` +
            (balanceUsed > 0 ? `✅ تم خصم ${balanceUsed} دقيقة من رصيد التأخيرات\n` : '') +
            `📛 تم تطبيق خصم ${deductionDays} يوم\n` +
            `📝 السبب: ${deductionText}`
        } else if (balanceUsed > 0) {
          lateMessage = `\n\n⏱️ <b>التأخير:</b> ${lateMinutes} دقيقة\n` +
            `✅ تم خصم ${balanceUsed} دقيقة من رصيد التأخيرات`
        }
      }
    }
  }

  await sendMessage(botToken, chatId, 
    `✅ تم تسجيل حضورك بنجاح!\n\n` +
    `📅 التاريخ: ${today}\n` +
    `⏰ الوقت: ${checkInTime}` +
    lateMessage,
    getEmployeeKeyboard(managerPermissions)
  )
  
  await notifyManagers(supabase, botToken, employee.id, employee.full_name, companyId, 'check_in', checkInTime, today, locationInfo?.locationName)
}

// Helper function to create pending attendance for Level 2 (manager approval)
async function createPendingAttendance(
  supabase: any,
  botToken: string,
  chatId: number,
  employee: any,
  companyId: string,
  requestType: 'check_in' | 'check_out',
  requestedTime: string,
  approverType: string,
  approverId: string | null,
  timezone: string = 'Africa/Cairo'
) {
  // Get today's date in company timezone
  const localTime = getLocalTime(timezone)
  const todayDate = localTime.date
  
  // Check for existing pending request for today
  const { data: existingPending } = await supabase
    .from('pending_attendance')
    .select('id, requested_time, created_at')
    .eq('employee_id', employee.id)
    .eq('request_type', requestType)
    .eq('status', 'pending')
    .gte('created_at', `${todayDate}T00:00:00`)
    .lte('created_at', `${todayDate}T23:59:59`)
    .maybeSingle()
  
  if (existingPending) {
    const pendingTime = existingPending.requested_time 
      ? new Date(existingPending.requested_time).toLocaleTimeString('ar-EG', { timeZone: timezone, hour: '2-digit', minute: '2-digit' })
      : '-'
    const requestTypeName = requestType === 'check_in' ? 'حضور' : 'انصراف'
    await sendMessage(botToken, chatId, 
      `⚠️ لديك طلب ${requestTypeName} معلق بالفعل!\n\n` +
      `📅 التاريخ: ${todayDate}\n` +
      `⏰ وقت الطلب: ${pendingTime}\n\n` +
      `🔄 بانتظار موافقة المدير...\n` +
      `يرجى الانتظار حتى تتم معالجة طلبك السابق.`
    )
    return
  }
  
  // Also check if already checked in today in attendance_logs
  if (requestType === 'check_in') {
    // Get employee details to check if freelancer
    const { data: empDetails } = await supabase
      .from('employees')
      .select('is_freelancer')
      .eq('id', employee.id)
      .single()
    
    const isFreelancer = empDetails?.is_freelancer === true
    
    // First check if marked as absent
    const { data: absentRecord } = await supabase
      .from('attendance_logs')
      .select('id')
      .eq('employee_id', employee.id)
      .eq('date', todayDate)
      .eq('status', 'absent')
      .maybeSingle()
    
    if (absentRecord) {
      await sendMessage(botToken, chatId, 
        `⚠️ تم تسجيلك غائباً اليوم!\n\n` +
        `لا يمكنك تسجيل الحضور بعد تسجيل الغياب.\n` +
        `يرجى التواصل مع الإدارة إذا كان هناك خطأ.`
      )
      return
    }
    
    // Get all attendance records for today (for freelancers who can have multiple)
    const { data: existingAttendanceList } = await supabase
      .from('attendance_logs')
      .select('id, check_in_time, status')
      .eq('employee_id', employee.id)
      .eq('date', todayDate)
      .neq('status', 'absent')
      .order('check_in_time', { ascending: false })
    
    const existingAttendance = existingAttendanceList && existingAttendanceList.length > 0 
      ? existingAttendanceList[0] 
      : null
    
    // For freelancers: only block if they have an OPEN session (checked_in or on_break)
    // For regular employees: block if any attendance exists (except absent)
    let shouldBlock = false
    
    if (isFreelancer) {
      // Freelancer: check for any open session
      const hasOpenSession = existingAttendanceList?.some((a: any) => 
        a.status === 'checked_in' || a.status === 'on_break'
      )
      shouldBlock = hasOpenSession || false
    } else {
      // Regular employee: any attendance today (except absent) means already worked
      shouldBlock = existingAttendance !== null
    }
    
    if (shouldBlock) {
      const displayRecord = isFreelancer 
        ? existingAttendanceList?.find((a: any) => a.status === 'checked_in' || a.status === 'on_break')
        : existingAttendance
      
      const checkInTimeDisplay = displayRecord?.check_in_time 
        ? new Date(displayRecord.check_in_time).toLocaleTimeString('ar-EG', { timeZone: timezone, hour: '2-digit', minute: '2-digit' })
        : '-'
      
      const message = isFreelancer 
        ? `⚠️ لديك جلسة عمل مفتوحة!\n\n` +
          `📅 التاريخ: ${todayDate}\n` +
          `⏰ وقت الحضور: ${checkInTimeDisplay}\n` +
          `📊 الحالة: ${displayRecord?.status === 'checked_in' ? 'حاضر' : displayRecord?.status === 'on_break' ? 'في استراحة' : displayRecord?.status}\n\n` +
          `🔴 يجب تسجيل الانصراف أولاً قبل بدء جلسة جديدة.`
        : `⚠️ لقد سجلت حضورك اليوم بالفعل!\n\n` +
          `📅 التاريخ: ${todayDate}\n` +
          `⏰ وقت الحضور: ${checkInTimeDisplay}\n` +
          `📊 الحالة: ${displayRecord?.status === 'checked_in' ? 'حاضر' : displayRecord?.status === 'on_break' ? 'في استراحة' : displayRecord?.status === 'checked_out' ? 'انصرف' : displayRecord?.status}`
      
      await sendMessage(botToken, chatId, message)
      return
    }
  }
  
  // Create pending attendance record
  const { data: pendingRecord, error: pendingError } = await supabase
    .from('pending_attendance')
    .insert({
      company_id: companyId,
      employee_id: employee.id,
      request_type: requestType,
      requested_time: requestedTime,
      approver_type: approverType,
      approver_id: approverId,
      status: 'pending'
    })
    .select('id')
    .single()

  if (pendingError) {
    console.error('Failed to create pending attendance:', pendingError)
    await sendMessage(botToken, chatId, '❌ حدث خطأ أثناء إرسال طلب الحضور')
    return
  }

  // Get local time for display - this is the actual current time in the company's timezone
  const displayLocalTime = getLocalTime(timezone)
  const displayTime = displayLocalTime.time.substring(0, 5) // HH:MM format

  // Notify employee
  const requestTypeName = requestType === 'check_in' ? 'الحضور' : 'الانصراف'
  await sendMessage(botToken, chatId, 
    `⏳ <b>تم إرسال طلب ${requestTypeName}</b>\n\n` +
    `📅 التاريخ: ${displayLocalTime.date}\n` +
    `⏰ الوقت: ${displayTime}\n\n` +
    `🔄 بانتظار موافقة المدير...\n` +
    `سيتم إخطارك عند الموافقة أو الرفض.`
  )

  // Get approver(s) to notify
  let approvers: any[] = []
  
  if (approverType === 'specific_person' && approverId) {
    // Specific person
    const { data: approver } = await supabase
      .from('employees')
      .select('id, full_name, telegram_chat_id')
      .eq('id', approverId)
      .single()
    
    if (approver?.telegram_chat_id) {
      approvers.push(approver)
    }
  } else {
    // Direct manager - get from position hierarchy
    const { data: managers } = await supabase.rpc('get_employee_managers', { emp_id: employee.id })
    approvers = managers || []
  }

  // Notify all approvers using local time for display
  const displayTimeApprover = localTime.time.substring(0, 5) // HH:MM format
  
  for (const approver of approvers) {
    if (approver.manager_telegram_chat_id || approver.telegram_chat_id) {
      const approverChatId = approver.manager_telegram_chat_id || approver.telegram_chat_id
      await sendMessage(botToken, parseInt(approverChatId),
        `📋 <b>طلب ${requestTypeName} جديد</b>\n\n` +
        `👤 الموظف: ${employee.full_name}\n` +
        `📅 التاريخ: ${localTime.date}\n` +
        `⏰ الوقت المطلوب: ${displayTimeApprover}\n\n` +
        `اختر الإجراء:`,
        {
          inline_keyboard: [
            [
              { text: '✅ موافقة', callback_data: `approve_attendance_${pendingRecord.id}` },
              { text: '❌ رفض', callback_data: `reject_attendance_${pendingRecord.id}` }
            ],
            [
              { text: '⏰ تعديل الوقت', callback_data: `modify_attendance_${pendingRecord.id}` }
            ]
          ]
        }
      )
    }
  }
}

// Helper function to handle attendance approval/rejection via Telegram
async function handleAttendanceApproval(
  supabase: any,
  botToken: string,
  chatId: number,
  pendingId: string,
  action: 'approve' | 'reject' | 'modify',
  managerName: string,
  newTime?: string,
  rejectionReason?: string
) {
  // Get the pending attendance request
  const { data: pendingRequest, error: pendingError } = await supabase
    .from('pending_attendance')
    .select(`
      *,
      employees (
        id,
        full_name,
        telegram_chat_id,
        company_id,
        work_start_time,
        work_end_time,
        base_salary,
        currency
      )
    `)
    .eq('id', pendingId)
    .single()

  if (pendingError || !pendingRequest) {
    await sendMessage(botToken, chatId, '❌ لم يتم العثور على الطلب')
    return
  }

  if (pendingRequest.status !== 'pending') {
    await sendMessage(botToken, chatId, '⚠️ تم معالجة هذا الطلب بالفعل')
    return
  }

  const employee = pendingRequest.employees
  const companyId = employee.company_id
  
  // Get company settings including timezone
  const { data: companySettings } = await supabase
    .from('companies')
    .select('timezone, late_under_15_deduction, late_15_to_30_deduction, late_over_30_deduction')
    .eq('id', companyId)
    .single()
  
  const companyTimezone = companySettings?.timezone || 'Africa/Cairo'
  const localTime = getLocalTime(companyTimezone)
  const today = localTime.date
  
  // If newTime is provided (modify action), create proper ISO string with timezone
  // Otherwise use the original requested_time
  let attendanceTime: string
  if (newTime) {
    // newTime is in HH:MM format, combine with today's date in local timezone
    attendanceTime = `${today}T${newTime}:00`
  } else {
    attendanceTime = pendingRequest.requested_time
  }

  if (action === 'approve' || action === 'modify') {
    const companyPolicies = companySettings

    if (pendingRequest.request_type === 'check_in') {
      // Build insert data with location info from pending request
      const insertData: Record<string, unknown> = {
        employee_id: employee.id,
        company_id: companyId,
        date: today,
        check_in_time: attendanceTime,
        status: 'checked_in',
        notes: action === 'modify' 
          ? `تم تعديل الوقت بواسطة ${managerName}` 
          : pendingRequest.verified_location_name 
            ? `تم التسجيل من موقع: ${pendingRequest.verified_location_name}`
            : null
      }

      // Copy location data from pending request if available
      if (pendingRequest.verified_location_id) {
        insertData.check_in_location_id = pendingRequest.verified_location_id
      }
      if (pendingRequest.latitude !== null && pendingRequest.latitude !== undefined) {
        insertData.check_in_latitude = pendingRequest.latitude
      }
      if (pendingRequest.longitude !== null && pendingRequest.longitude !== undefined) {
        insertData.check_in_longitude = pendingRequest.longitude
      }

      // Create attendance log
      const { data: newAttendance, error: attendanceError } = await supabase
        .from('attendance_logs')
        .insert(insertData)
        .select('id')
        .single()

      if (attendanceError) {
        console.error('Failed to create attendance:', attendanceError)
        await sendMessage(botToken, chatId, '❌ فشل في إنشاء سجل الحضور')
        return
      }

      // Check for lateness and apply deductions - ONLY for regular employees, NOT freelancers
      const isFreelancerEmployee = employee.is_freelancer === true
      
      if (!isFreelancerEmployee) {
        const checkInDate = new Date(attendanceTime)
        const workStartTime = employee.work_start_time || '09:00:00'
        const [startH, startM] = workStartTime.split(':').map(Number)
        
        const expectedStart = new Date(checkInDate)
        expectedStart.setHours(startH, startM, 0, 0)

        if (checkInDate > expectedStart) {
          const lateMinutes = Math.floor((checkInDate.getTime() - expectedStart.getTime()) / 60000)
          
          let deductionDays = 0
          let deductionText = ''
          
          if (lateMinutes > 30 && companyPolicies?.late_over_30_deduction) {
            deductionDays = companyPolicies.late_over_30_deduction
            deductionText = `تأخر أكثر من 30 دقيقة`
          } else if (lateMinutes > 15 && companyPolicies?.late_15_to_30_deduction) {
            deductionDays = companyPolicies.late_15_to_30_deduction
            deductionText = `تأخر من 15 إلى 30 دقيقة`
          } else if (lateMinutes > 0 && companyPolicies?.late_under_15_deduction) {
            deductionDays = companyPolicies.late_under_15_deduction
            deductionText = `تأخر أقل من 15 دقيقة`
          }

          if (deductionDays > 0) {
            const baseSalary = employee.base_salary || 0
            const dailyRate = baseSalary / 30
            const deductionAmount = dailyRate * deductionDays
            const monthKey = today.substring(0, 7) + '-01'

            await supabase.from('salary_adjustments').insert({
              employee_id: employee.id,
              company_id: companyId,
              month: monthKey,
              deduction: deductionAmount,
              bonus: 0,
              adjustment_days: deductionDays,
              description: `خصم تأخير - ${deductionText} (${lateMinutes} دقيقة) - اعتماد: ${managerName}`,
              added_by_name: 'النظام التلقائي',
              attendance_log_id: newAttendance.id,
              is_auto_generated: true
            })
          }
        }
      }
    } else if (pendingRequest.request_type === 'check_out') {
      // Update attendance log with checkout time
      await supabase
        .from('attendance_logs')
        .update({
          check_out_time: attendanceTime,
          status: 'checked_out'
        })
        .eq('employee_id', employee.id)
        .eq('company_id', companyId)
        .eq('date', today)
        .is('check_out_time', null)
    }

    // Update pending request status
    await supabase
      .from('pending_attendance')
      .update({
        status: 'approved',
        approved_time: attendanceTime,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', pendingId)

    // Notify manager
    const timeStr = new Date(attendanceTime).toLocaleTimeString('ar-EG')
    await sendMessage(botToken, chatId, 
      `✅ تم قبول طلب ${pendingRequest.request_type === 'check_in' ? 'الحضور' : 'الانصراف'}\n\n` +
      `👤 الموظف: ${employee.full_name}\n` +
      `⏰ الوقت: ${timeStr}`
    )

    // Notify employee and log the message
    if (employee.telegram_chat_id) {
      const msg = action === 'modify'
        ? `✅ تم قبول ${pendingRequest.request_type === 'check_in' ? 'حضورك' : 'انصرافك'} بوقت معدّل: ${timeStr}\n👤 بواسطة: ${managerName}`
        : `✅ تم اعتماد ${pendingRequest.request_type === 'check_in' ? 'حضورك' : 'انصرافك'}!\n📅 التاريخ: ${today}\n⏰ الوقت: ${timeStr}\n👤 المعتمد: ${managerName}`
      
      await sendMessageAndLogToEmployee(supabase, botToken, employee.telegram_chat_id, msg, companyId, employee.id)
    }

  } else if (action === 'reject') {
    // Update pending request as rejected
    await supabase
      .from('pending_attendance')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason || 'تم الرفض من قبل المدير',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', pendingId)

    // Notify manager
    await sendMessage(botToken, chatId, 
      `❌ تم رفض طلب ${pendingRequest.request_type === 'check_in' ? 'الحضور' : 'الانصراف'}\n` +
      `👤 الموظف: ${employee.full_name}`
    )

    // Notify employee and log the message
    if (employee.telegram_chat_id) {
      const msg = `❌ تم رفض طلب ${pendingRequest.request_type === 'check_in' ? 'الحضور' : 'الانصراف'}\n` +
        `📝 السبب: ${rejectionReason || 'غير محدد'}\n` +
        `👤 بواسطة: ${managerName}`
      
      await sendMessageAndLogToEmployee(supabase, botToken, employee.telegram_chat_id, msg, companyId, employee.id)
    }
  }
}

// Helper to send message to employee and log it when sending outside of current context
async function sendMessageAndLogToEmployee(
  supabase: any,
  botToken: string,
  telegramChatId: string,
  text: string,
  companyId: string,
  employeeId: string,
  keyboard?: any
) {
  const chatIdNum = parseInt(telegramChatId)
  
  const body: any = {
    chat_id: chatIdNum,
    text,
    parse_mode: 'HTML'
  }
  
  if (keyboard) {
    body.reply_markup = keyboard
  }
  
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  
  let telegramMessageId: number | undefined
  if (res.ok) {
    try {
      const result = await res.json()
      telegramMessageId = result.result?.message_id
    } catch (e) {}
  } else {
    console.error('sendMessageAndLogToEmployee failed:', await res.text().catch(() => ''))
  }
  
  // Log the message
  await logTelegramMessage(
    supabase,
    companyId,
    employeeId,
    telegramChatId,
    text.replace(/<[^>]*>/g, ''),
    'outgoing',
    'text',
    keyboard ? { keyboard } : {},
    telegramMessageId
  )
}

// Process checkout with optional early departure deduction
async function processCheckout(
  supabase: any,
  botToken: string,
  chatId: number,
  employee: any,
  attendance: any,
  attendanceDate: string,
  companyId: string,
  companyTimezone: string,
  companyDefaults: any,
  companyPolicies: any,
  empDetails: any,
  managerPermissions: any,
  isNightShift: boolean,
  earlyDepartureData?: {
    earlyMinutes: number;
    deductionDays: number;
    deductionAmount: number;
    workEndTime: string;
  }
) {
  const localTime = getLocalTime(companyTimezone)
  const nowUtc = new Date().toISOString()
  const checkOutTime = localTime.time
  const nightShiftNote = isNightShift ? `\n🌙 <i>وردية ليلية - حضور من ${attendanceDate}</i>` : ''
  
  let overtimeMessage = ''
  let earlyDepartureMessage = ''
  let overtimeInfo: { minutes: number; amount?: number; currency?: string } | undefined
  let earlyDepartureInfo: { minutes: number; deductionDays: number; amount?: number; currency?: string } | undefined
  
  const workEndTime = employee.work_end_time || companyDefaults.work_end_time
  
  // Freelancers are exempt from all time-based policies (overtime, late, early departure)
  const isFreelancer = empDetails?.is_freelancer === true
  
  // Calculate time difference (skip all policy calculations for freelancers)
  if (workEndTime && !isNightShift && !isFreelancer) {
    const [endH, endM] = workEndTime.split(':').map(Number)
    const [checkH, checkM] = checkOutTime.split(':').map(Number)
    const timeDiff = (checkH * 60 + checkM) - (endH * 60 + endM)
    
    if (timeDiff > 0 && attendance.check_in_time) {
      // Overtime
      const overtimeMinutes = timeDiff
      const overtimeHours = Math.floor(overtimeMinutes / 60)
      const overtimeMins = overtimeMinutes % 60
      
      // Calculate overtime pay if multiplier exists
      if (companyPolicies?.overtime_multiplier && empDetails?.base_salary) {
        const hourlyRate = empDetails.base_salary / 30 / 8
        const overtimePay = (overtimeMinutes / 60) * hourlyRate * companyPolicies.overtime_multiplier
        const monthKey = attendanceDate.substring(0, 7) + '-01'
        
        if (overtimePay > 0) {
          const { error: bonusError } = await supabase.from('salary_adjustments').insert({
            employee_id: employee.id,
            company_id: companyId,
            month: monthKey,
            bonus: Math.round(overtimePay * 100) / 100,
            deduction: 0,
            adjustment_days: null,
            description: `مكافأة وقت إضافي يوم ${attendanceDate} - ${overtimeMinutes} دقيقة (${(overtimeMinutes / 60).toFixed(2)} ساعة) × ${companyPolicies.overtime_multiplier}`,
            added_by_name: 'النظام التلقائي',
            attendance_log_id: attendance.id,
            is_auto_generated: true
          })
          
          if (bonusError) {
            console.error('Failed to create overtime bonus adjustment:', bonusError)
          }
        }
        
        overtimeMessage = `\n\n⏰ <b>وقت إضافي:</b> ${overtimeHours > 0 ? `${overtimeHours} ساعة و ` : ''}${overtimeMins} دقيقة\n` +
          `💰 قيمة الوقت الإضافي: ${overtimePay.toFixed(2)} ${empDetails.currency || 'SAR'}\n` +
          `🎁 تم إضافة المكافأة لحسابك\n` +
          `📊 معامل الوقت الإضافي: ${companyPolicies.overtime_multiplier}x`
        
        overtimeInfo = { minutes: overtimeMinutes, amount: overtimePay, currency: empDetails.currency || 'SAR' }
      } else {
        overtimeMessage = `\n\n⏰ <b>وقت إضافي:</b> ${overtimeHours > 0 ? `${overtimeHours} ساعة و ` : ''}${overtimeMins} دقيقة`
        overtimeInfo = { minutes: overtimeMinutes }
      }
    } else if (timeDiff < 0) {
      // Early departure
      const earlyMinutes = Math.abs(timeDiff)
      const earlyDepartureGrace = companyPolicies?.early_departure_grace_minutes ?? 5
      
      if (earlyMinutes <= earlyDepartureGrace) {
        // Within grace period - deduct from late balance
        let currentLateBalance = empDetails?.monthly_late_balance_minutes ?? companyPolicies?.monthly_late_allowance_minutes ?? 15
        
        if (currentLateBalance >= earlyMinutes) {
          const newBalance = currentLateBalance - earlyMinutes
          await supabase
            .from('employees')
            .update({ monthly_late_balance_minutes: newBalance })
            .eq('id', employee.id)
          
          earlyDepartureMessage = `\n\n⏰ <b>انصراف مبكر:</b> ${earlyMinutes} دقيقة\n` +
            `✅ تم خصم ${earlyMinutes} دقيقة من رصيد التأخيرات\n` +
            `📊 رصيدك المتبقي: ${newBalance} دقيقة`
        } else {
          // Not enough balance - this case is handled by earlyDepartureData
          earlyDepartureMessage = `\n\n⏰ <b>انصراف مبكر:</b> ${earlyMinutes} دقيقة\n` +
            `⚠️ رصيد التأخيرات غير كافٍ`
        }
      }
      // Note: Early departure beyond grace is handled by earlyDepartureData if confirmed
    }
  }
  
  // Apply early departure deduction if confirmed
  if (earlyDepartureData) {
    const monthKey = attendanceDate.substring(0, 7) + '-01'
    
    const { error: adjustmentError } = await supabase.from('salary_adjustments').insert({
      employee_id: employee.id,
      company_id: companyId,
      month: monthKey,
      deduction: earlyDepartureData.deductionAmount,
      bonus: 0,
      adjustment_days: earlyDepartureData.deductionDays,
      description: `خصم انصراف مبكر يوم ${attendanceDate}: ${earlyDepartureData.earlyMinutes} دقيقة قبل موعد الانصراف (${earlyDepartureData.workEndTime})`,
      added_by_name: 'النظام التلقائي',
      attendance_log_id: attendance.id,
      is_auto_generated: true
    })
    
    if (adjustmentError) {
      console.error('Failed to create early departure adjustment:', adjustmentError)
    }
    
    const deductionText = earlyDepartureData.deductionDays === 0.25 ? 'ربع يوم' : 
                          earlyDepartureData.deductionDays === 0.5 ? 'نصف يوم' : 
                          `${earlyDepartureData.deductionDays} يوم`
    
    earlyDepartureMessage = `\n\n⏰ <b>انصراف مبكر:</b> ${earlyDepartureData.earlyMinutes} دقيقة\n` +
      `📛 تم تطبيق خصم ${deductionText}` + 
      (earlyDepartureData.deductionAmount > 0 ? ` (${earlyDepartureData.deductionAmount.toFixed(2)} ${empDetails?.currency || 'SAR'})` : '') +
      `\n📝 موعد الانصراف: ${earlyDepartureData.workEndTime}`
    
    earlyDepartureInfo = {
      minutes: earlyDepartureData.earlyMinutes,
      deductionDays: earlyDepartureData.deductionDays,
      amount: earlyDepartureData.deductionAmount,
      currency: empDetails?.currency || 'SAR'
    }
  }
  
  // Calculate total work hours
  let workHoursMessage = ''
  let freelancerEarningsMessage = ''
  let totalMinutesWorked = 0
  
  if (attendance.check_in_time) {
    const checkInDate = new Date(attendance.check_in_time)
    const checkOutDate = new Date(nowUtc)
    totalMinutesWorked = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 60000)
    const hours = Math.floor(totalMinutesWorked / 60)
    const mins = totalMinutesWorked % 60
    workHoursMessage = `\n🕐 إجمالي ساعات العمل: ${hours} ساعة و ${mins} دقيقة`
    
    // For freelancers: calculate earnings based on hourly rate and add as salary adjustment
    if (isFreelancer && empDetails?.hourly_rate && totalMinutesWorked > 0) {
      const hoursWorked = totalMinutesWorked / 60
      const earnings = hoursWorked * empDetails.hourly_rate
      const roundedEarnings = Math.round(earnings * 100) / 100
      const monthKey = attendanceDate.substring(0, 7) + '-01'
      
      // Insert salary adjustment as bonus for freelancer work
      const { error: freelancerBonusError } = await supabase.from('salary_adjustments').insert({
        employee_id: employee.id,
        company_id: companyId,
        month: monthKey,
        bonus: roundedEarnings,
        deduction: 0,
        adjustment_days: null,
        description: `أجر عمل يوم ${attendanceDate} - ${hours} ساعة و ${mins} دقيقة × ${empDetails.hourly_rate} ${empDetails.currency || 'EGP'}/ساعة`,
        added_by_name: 'النظام التلقائي',
        attendance_log_id: attendance.id,
        is_auto_generated: true
      })
      
      if (freelancerBonusError) {
        console.error('Failed to create freelancer earnings adjustment:', freelancerBonusError)
      } else {
        // Don't show hourly rate in the message - just confirm earnings added
        freelancerEarningsMessage = `\n\n💰 <b>تم حساب مستحقاتك</b>\n` +
          `🕐 ساعات العمل: ${hours} ساعة و ${mins} دقيقة\n` +
          `✅ تم إضافة المبلغ لحسابك تلقائياً`
      }
    }
  }
  
  // Update attendance record
  await supabase
    .from('attendance_logs')
    .update({ 
      check_out_time: nowUtc, 
      status: 'checked_out' 
    })
    .eq('id', attendance.id)

  await sendMessage(botToken, chatId, 
    `✅ تم تسجيل انصرافك بنجاح!\n\n` +
    `📅 التاريخ: ${attendanceDate}\n` +
    `⏰ وقت الانصراف: ${checkOutTime}` +
    nightShiftNote +
    workHoursMessage +
    freelancerEarningsMessage +
    overtimeMessage +
    earlyDepartureMessage,
    getEmployeeKeyboard(managerPermissions)
  )
  
  // Notify managers about check-out with overtime/early departure info
  await notifyManagers(supabase, botToken, employee.id, employee.full_name, companyId, 'check_out', checkOutTime, attendanceDate, undefined, overtimeInfo, earlyDepartureInfo)
}
