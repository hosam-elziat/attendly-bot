import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    from: { id: number; username?: string; first_name?: string; last_name?: string };
    text?: string;
    contact?: { phone_number: string };
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

    // Get bot info
    const { data: bot } = await supabase
      .from('telegram_bots')
      .select('bot_token, assigned_company_id')
      .eq('bot_username', botUsername)
      .single()

    if (!bot?.bot_token || !bot?.assigned_company_id) {
      return new Response(JSON.stringify({ ok: true, error: 'Bot not found' }), { headers: corsHeaders })
    }

    const botToken = bot.bot_token
    const companyId = bot.assigned_company_id
    const telegramChatId = String(chatId)

    // Get company info for defaults
    const { data: company } = await supabase
      .from('companies')
      .select('work_start_time, work_end_time, name, annual_leave_days, emergency_leave_days')
      .eq('id', companyId)
      .single()

    const companyDefaults = {
      work_start_time: company?.work_start_time || '09:00:00',
      work_end_time: company?.work_end_time || '17:00:00',
      weekend_days: ['friday', 'saturday'],
      company_name: company?.name || 'الشركة',
      annual_leave_days: company?.annual_leave_days || 21,
      emergency_leave_days: company?.emergency_leave_days || 7
    }

    // Check if employee exists
    const { data: employee } = await supabase
      .from('employees')
      .select('id, full_name, leave_balance, emergency_leave_balance, work_start_time, work_end_time')
      .eq('telegram_chat_id', telegramChatId)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single()

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

        await sendWelcomeMessage(botToken, chatId, false)
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
      }

      // Employee actions
      const today = new Date().toISOString().split('T')[0]
      
      // Get today's attendance
      const { data: attendance } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('company_id', companyId)
        .eq('date', today)
        .single()

      // Get company late policies
      const { data: companyPolicies } = await supabase
        .from('companies')
        .select('late_under_15_deduction, late_15_to_30_deduction, late_over_30_deduction, daily_late_allowance_minutes, monthly_late_allowance_minutes, overtime_multiplier')
        .eq('id', companyId)
        .single()

      // Get employee details with late balance
      const { data: empDetails } = await supabase
        .from('employees')
        .select('monthly_late_balance_minutes, base_salary, currency')
        .eq('id', employee.id)
        .single()

      switch (callbackData) {
        case 'check_in':
          if (attendance) {
            await sendMessage(botToken, chatId, '⚠️ لقد سجلت حضورك اليوم بالفعل!')
          } else {
            const now = new Date().toISOString()
            const checkInTime = now.split('T')[1].substring(0, 8)
            
            let status: 'checked_in' | 'on_break' | 'checked_out' | 'absent' = 'checked_in'
            let notes = ''
            let lateMessage = ''
            
            const workStartTime = employee.work_start_time || companyDefaults.work_start_time
            
            if (workStartTime && checkInTime > workStartTime) {
              // Calculate late minutes
              const [startH, startM] = workStartTime.split(':').map(Number)
              const [checkH, checkM] = checkInTime.split(':').map(Number)
              const lateMinutes = (checkH * 60 + checkM) - (startH * 60 + startM)
              
              if (lateMinutes > 0) {
                notes = `تأخر ${lateMinutes} دقيقة - موعد العمل: ${workStartTime}`
                
                // Get current late balance
                let currentLateBalance = empDetails?.monthly_late_balance_minutes || companyPolicies?.monthly_late_allowance_minutes || 15
                
                // Check if we need to deduct from late balance first
                if (currentLateBalance > 0 && lateMinutes <= currentLateBalance) {
                  // Deduct from late balance - no salary deduction
                  const newBalance = currentLateBalance - lateMinutes
                  await supabase
                    .from('employees')
                    .update({ monthly_late_balance_minutes: newBalance })
                    .eq('id', employee.id)
                  
                  lateMessage = `\n\n⏱️ <b>التأخير:</b> ${lateMinutes} دقيقة\n` +
                    `✅ تم خصم ${lateMinutes} دقيقة من رصيد التأخيرات\n` +
                    `📊 رصيدك المتبقي: ${newBalance} دقيقة`
                } else if (currentLateBalance > 0) {
                  // Partial balance - deduct what we can, then apply policy
                  const remainingLate = lateMinutes - currentLateBalance
                  await supabase
                    .from('employees')
                    .update({ monthly_late_balance_minutes: 0 })
                    .eq('id', employee.id)
                  
                  // Apply late policy for remaining minutes
                  let deductionDays = 0
                  let deductionText = ''
                  
                  if (remainingLate > 30 && companyPolicies?.late_over_30_deduction) {
                    deductionDays = companyPolicies.late_over_30_deduction
                    deductionText = `تأخر أكثر من 30 دقيقة`
                  } else if (remainingLate > 15 && companyPolicies?.late_15_to_30_deduction) {
                    deductionDays = companyPolicies.late_15_to_30_deduction
                    deductionText = `تأخر من 15 إلى 30 دقيقة`
                  } else if (remainingLate > 0 && companyPolicies?.late_under_15_deduction) {
                    deductionDays = companyPolicies.late_under_15_deduction
                    deductionText = `تأخر أقل من 15 دقيقة`
                  }
                  
                  if (deductionDays > 0 && empDetails?.base_salary) {
                    const dailyRate = empDetails.base_salary / 30
                    const deductionAmount = dailyRate * deductionDays
                    const monthKey = today.substring(0, 7)
                    
                    await supabase.from('salary_adjustments').insert({
                      employee_id: employee.id,
                      company_id: companyId,
                      month: monthKey,
                      deduction: deductionAmount,
                      adjustment_days: deductionDays,
                      description: `خصم تأخير: ${deductionText} (${lateMinutes} دقيقة)`,
                      added_by_name: 'النظام التلقائي'
                    })
                    
                    lateMessage = `\n\n⏱️ <b>التأخير:</b> ${lateMinutes} دقيقة\n` +
                      `⚠️ تم استنفاد رصيد التأخيرات (${currentLateBalance} دقيقة)\n` +
                      `📛 تم تطبيق خصم ${deductionDays} يوم (${deductionAmount.toFixed(2)} ${empDetails.currency || 'SAR'})\n` +
                      `📝 السبب: ${deductionText}`
                  } else {
                    lateMessage = `\n\n⏱️ <b>التأخير:</b> ${lateMinutes} دقيقة\n` +
                      `⚠️ تم استنفاد رصيد التأخيرات`
                  }
                } else {
                  // No late balance - apply policy directly
                  let deductionDays = 0
                  let deductionText = ''
                  
                  if (lateMinutes > 30 && companyPolicies?.late_over_30_deduction) {
                    deductionDays = companyPolicies.late_over_30_deduction
                    deductionText = `تأخر أكثر من 30 دقيقة`
                  } else if (lateMinutes > 15 && companyPolicies?.late_15_to_30_deduction) {
                    deductionDays = companyPolicies.late_15_to_30_deduction
                    deductionText = `تأخر من 15 إلى 30 دقيقة`
                  } else if (companyPolicies?.late_under_15_deduction) {
                    deductionDays = companyPolicies.late_under_15_deduction
                    deductionText = `تأخر أقل من 15 دقيقة`
                  }
                  
                  if (deductionDays > 0 && empDetails?.base_salary) {
                    const dailyRate = empDetails.base_salary / 30
                    const deductionAmount = dailyRate * deductionDays
                    const monthKey = today.substring(0, 7)
                    
                    await supabase.from('salary_adjustments').insert({
                      employee_id: employee.id,
                      company_id: companyId,
                      month: monthKey,
                      deduction: deductionAmount,
                      adjustment_days: deductionDays,
                      description: `خصم تأخير: ${deductionText} (${lateMinutes} دقيقة)`,
                      added_by_name: 'النظام التلقائي'
                    })
                    
                    lateMessage = `\n\n⏱️ <b>التأخير:</b> ${lateMinutes} دقيقة\n` +
                      `📛 تم تطبيق خصم ${deductionDays} يوم (${deductionAmount.toFixed(2)} ${empDetails.currency || 'SAR'})\n` +
                      `📝 السبب: ${deductionText}\n` +
                      `⚠️ رصيد التأخيرات: 0 دقيقة`
                  }
                }
              }
            }

            await supabase.from('attendance_logs').insert({
              employee_id: employee.id,
              company_id: companyId,
              date: today,
              check_in_time: now,
              status,
              notes: notes || null
            })

            await sendMessage(botToken, chatId, 
              `✅ تم تسجيل حضورك بنجاح!\n\n` +
              `📅 التاريخ: ${today}\n` +
              `⏰ الوقت: ${checkInTime}` +
              lateMessage,
              getEmployeeKeyboard()
            )
          }
          break

        case 'check_out':
          if (!attendance) {
            await sendMessage(botToken, chatId, '⚠️ لم تسجل حضورك اليوم بعد!')
          } else if (attendance.check_out_time) {
            await sendMessage(botToken, chatId, '⚠️ لقد سجلت انصرافك اليوم بالفعل!')
          } else {
            const now = new Date().toISOString()
            const checkOutTime = now.split('T')[1].substring(0, 8)
            
            // Calculate overtime
            let overtimeMessage = ''
            const workEndTime = employee.work_end_time || companyDefaults.work_end_time
            
            if (workEndTime && checkOutTime > workEndTime && attendance.check_in_time) {
              const [endH, endM] = workEndTime.split(':').map(Number)
              const [checkH, checkM] = checkOutTime.split(':').map(Number)
              const overtimeMinutes = (checkH * 60 + checkM) - (endH * 60 + endM)
              
              if (overtimeMinutes > 0) {
                const overtimeHours = Math.floor(overtimeMinutes / 60)
                const overtimeMins = overtimeMinutes % 60
                
                // Calculate overtime pay if multiplier exists
                if (companyPolicies?.overtime_multiplier && empDetails?.base_salary) {
                  const hourlyRate = empDetails.base_salary / 30 / 8 // Assuming 8 hours work day
                  const overtimePay = (overtimeMinutes / 60) * hourlyRate * companyPolicies.overtime_multiplier
                  
                  overtimeMessage = `\n\n⏰ <b>وقت إضافي:</b> ${overtimeHours > 0 ? `${overtimeHours} ساعة و ` : ''}${overtimeMins} دقيقة\n` +
                    `💰 قيمة الوقت الإضافي: ${overtimePay.toFixed(2)} ${empDetails.currency || 'SAR'}\n` +
                    `📊 معامل الوقت الإضافي: ${companyPolicies.overtime_multiplier}x`
                } else {
                  overtimeMessage = `\n\n⏰ <b>وقت إضافي:</b> ${overtimeHours > 0 ? `${overtimeHours} ساعة و ` : ''}${overtimeMins} دقيقة`
                }
              }
            }
            
            // Calculate total work hours
            let workHoursMessage = ''
            if (attendance.check_in_time) {
              const checkInDate = new Date(attendance.check_in_time)
              const checkOutDate = new Date(now)
              const totalMinutes = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 60000)
              const hours = Math.floor(totalMinutes / 60)
              const mins = totalMinutes % 60
              workHoursMessage = `\n🕐 إجمالي ساعات العمل: ${hours} ساعة و ${mins} دقيقة`
            }
            
            await supabase
              .from('attendance_logs')
              .update({ 
                check_out_time: now, 
                status: 'checked_out' 
              })
              .eq('id', attendance.id)

            await sendMessage(botToken, chatId, 
              `✅ تم تسجيل انصرافك بنجاح!\n\n` +
              `📅 التاريخ: ${today}\n` +
              `⏰ وقت الانصراف: ${checkOutTime}` +
              workHoursMessage +
              overtimeMessage,
              getEmployeeKeyboard()
            )
          }
          break

        case 'start_break':
          if (!attendance) {
            await sendMessage(botToken, chatId, '⚠️ لم تسجل حضورك اليوم بعد!')
          } else if (attendance.status === 'on_break') {
            await sendMessage(botToken, chatId, '⚠️ أنت في استراحة بالفعل!')
          } else if (attendance.check_out_time) {
            await sendMessage(botToken, chatId, '⚠️ لقد سجلت انصرافك اليوم!')
          } else {
            const now = new Date().toISOString()
            
            await supabase.from('break_logs').insert({
              attendance_id: attendance.id,
              start_time: now
            })

            await supabase
              .from('attendance_logs')
              .update({ status: 'on_break' })
              .eq('id', attendance.id)

            await sendMessage(botToken, chatId, 
              `☕ بدأت الاستراحة\n\n⏰ الوقت: ${now.split('T')[1].substring(0, 8)}`,
              getEmployeeKeyboard()
            )
          }
          break

        case 'end_break':
          if (!attendance) {
            await sendMessage(botToken, chatId, '⚠️ لم تسجل حضورك اليوم بعد!')
          } else if (attendance.status !== 'on_break') {
            await sendMessage(botToken, chatId, '⚠️ أنت لست في استراحة!')
          } else {
            const now = new Date().toISOString()
            
            const { data: activeBreak } = await supabase
              .from('break_logs')
              .select('*')
              .eq('attendance_id', attendance.id)
              .is('end_time', null)
              .single()

            if (activeBreak) {
              const startTime = new Date(activeBreak.start_time)
              const endTime = new Date(now)
              const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000)

              await supabase
                .from('break_logs')
                .update({ 
                  end_time: now, 
                  duration_minutes: durationMinutes 
                })
                .eq('id', activeBreak.id)
            }

            await supabase
              .from('attendance_logs')
              .update({ status: 'checked_in' })
              .eq('id', attendance.id)

            await sendMessage(botToken, chatId, 
              `✅ انتهت الاستراحة\n\n⏰ الوقت: ${now.split('T')[1].substring(0, 8)}`,
              getEmployeeKeyboard()
            )
          }
          break

        case 'request_leave':
          // Start leave request flow - ask for leave type
          await setSession('leave_type_choice', {})
          await sendMessage(botToken, chatId, 
            `📝 <b>طلب إجازة</b>\n\n` +
            `📊 رصيدك الحالي:\n` +
            `• إجازات طارئة: ${employee.emergency_leave_balance || companyDefaults.emergency_leave_days} يوم\n` +
            `• إجازات اعتيادية: ${employee.leave_balance || (companyDefaults.annual_leave_days - companyDefaults.emergency_leave_days)} يوم\n\n` +
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
          await sendMessage(botToken, chatId, 
            `🚨 <b>إجازة طارئة</b>\n\n` +
            `📊 رصيدك المتاح: ${employee.emergency_leave_balance || companyDefaults.emergency_leave_days} يوم\n\n` +
            `اختر يوم الإجازة:`,
            getDatePickerKeyboard('emergency')
          )
          break
        }

        case 'leave_regular': {
          // Regular leave needs 48 hours notice - show date picker
          await setSession('leave_date_choice', { leave_type: 'regular' })
          await sendMessage(botToken, chatId, 
            `📅 <b>إجازة اعتيادية</b>\n\n` +
            `📊 رصيدك المتاح: ${employee.leave_balance || (companyDefaults.annual_leave_days - companyDefaults.emergency_leave_days)} يوم\n\n` +
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
              await sendMessage(botToken, chatId,
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
          await sendMessage(botToken, chatId, 
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
          await sendMessage(botToken, chatId, 
            `📆 اختر تاريخ الإجازة:`,
            getExtendedDatePickerKeyboard(session.data.leave_type || 'emergency')
          )
          break
        }

        case 'cancel_leave':
          await deleteSession()
          await sendMessage(botToken, chatId, 
            `❌ تم إلغاء طلب الإجازة`,
            getEmployeeKeyboard()
          )
          break

        default:
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
          break

        case 'my_salary':
          // Check if it's the last day of the month
          const currentDate = new Date()
          const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
          const isLastDay = currentDate.getDate() === lastDayOfMonth
          
          if (!isLastDay) {
            await sendMessage(botToken, chatId, 
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
            const currency = empDetails?.currency || 'SAR'
            
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
            
            await sendMessage(botToken, chatId, salaryMsg, getEmployeeKeyboard())
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

          await sendMessage(botToken, chatId, statusMsg, getEmployeeKeyboard())
          break
      }

      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }

    // Handle text messages
    const text = update.message?.text?.trim()
    
    if (!text) {
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }

    // Handle /start command
    if (text === '/start') {
      await deleteSession() // Clear any pending session
      
      if (employee) {
        await sendMessage(botToken, chatId, 
          `مرحباً ${employee.full_name}! 👋\n\nاختر من الأزرار أدناه:`,
          getEmployeeKeyboard()
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
                `📊 الرصيد المتبقي: ${emergencyBalance - 1} يوم طارئ`,
                getEmployeeKeyboard()
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
          const leaveDate = session.data.leave_date || new Date().toISOString().split('T')[0]
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
                getEmployeeKeyboard()
              )
              return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
            }
          }
          
          // Submit leave request to manager (no balance or regular leave)
          await supabase.from('leave_requests').insert({
            employee_id: employee.id,
            company_id: companyId,
            leave_type: leaveType as any,
            start_date: leaveDate,
            end_date: leaveDate,
            days: 1,
            reason: text,
            status: 'pending'
          })
          
          await deleteSession()
          await sendMessage(botToken, chatId, 
            `✅ <b>تم إرسال طلب الإجازة للمدير</b>\n\n` +
            `📋 النوع: إجازة ${typeText}\n` +
            `📅 التاريخ: ${leaveDate}\n` +
            `📝 السبب: ${text}\n\n` +
            `⏳ سيتم إبلاغك على التيلجرام عند الموافقة أو الرفض.`,
            getEmployeeKeyboard()
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
        getEmployeeKeyboard()
      )
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }

    // Default response
    if (employee) {
      await sendMessage(botToken, chatId, 
        'اختر من الأزرار أدناه:',
        getEmployeeKeyboard()
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

  // Create join request with all collected data
  await supabase.from('join_requests').insert({
    company_id: companyId,
    telegram_chat_id: telegramChatId,
    telegram_username: username,
    full_name: sessionData.full_name,
    email: sessionData.email,
    phone: sessionData.phone,
  })

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

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    console.error('telegram-webhook: sendMessage failed', { status: res.status, body: txt })
  }
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

async function sendWelcomeMessage(botToken: string, chatId: number, isEmployee: boolean) {
  if (isEmployee) {
    await sendMessage(botToken, chatId, 'مرحباً! 👋\n\nاختر من الأزرار أدناه:', getEmployeeKeyboard())
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

function getEmployeeKeyboard() {
  return {
    inline_keyboard: [
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
  }
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
