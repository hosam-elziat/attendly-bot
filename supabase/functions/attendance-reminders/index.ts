import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to convert time string to minutes since midnight
function timeToMinutes(timeStr: string): number {
  const parts = timeStr.substring(0, 5).split(':')
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

// Helper to check if current time EXACTLY matches target time (within 1 minute window)
// This prevents sending multiple reminders when cron runs every minute
function isExactMinute(currentMinutes: number, targetMinutes: number): boolean {
  return currentMinutes === targetMinutes
}

// Helper to convert UTC date to timezone-adjusted date
function getLocalTime(date: Date, timezone: string): { time: string; minutes: number; dayName: string; dateStr: string } {
  try {
    const options: Intl.DateTimeFormatOptions = { 
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }
    const timeStr = date.toLocaleTimeString('en-GB', options).substring(0, 5)
    const minutes = timeToMinutes(timeStr)
    
    const dayOptions: Intl.DateTimeFormatOptions = { 
      timeZone: timezone,
      weekday: 'long'
    }
    const dayName = date.toLocaleDateString('en-US', dayOptions).toLowerCase()
    
    const dateOptions: Intl.DateTimeFormatOptions = { 
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }
    const localDate = date.toLocaleDateString('en-CA', dateOptions) // YYYY-MM-DD format
    
    return { time: timeStr, minutes, dayName, dateStr: localDate }
  } catch (e) {
    // Fallback to UTC if timezone is invalid
    const timeStr = date.toTimeString().substring(0, 5)
    const minutes = timeToMinutes(timeStr)
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()]
    const dateStr = date.toISOString().split('T')[0]
    return { time: timeStr, minutes, dayName, dateStr }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const now = new Date()
    
    console.log('attendance-reminders: running at UTC', now.toISOString())

    // Get all active employees with their telegram_chat_id and work times
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select(`
        id,
        full_name,
        telegram_chat_id,
        work_start_time,
        work_end_time,
        weekend_days,
        break_duration_minutes,
        company_id,
        base_salary,
        currency,
        position_id,
        is_freelancer,
        companies!inner (
          id,
          telegram_bot_username,
          work_start_time,
          work_end_time,
          break_duration_minutes,
          absence_without_permission_deduction,
          default_currency,
          timezone,
          auto_absent_after_hours,
          checkin_reminder_count,
          checkin_reminder_interval_minutes,
          checkout_reminder_count,
          checkout_reminder_interval_minutes
        )
      `)
      .eq('is_active', true)
      .not('telegram_chat_id', 'is', null)

    if (empError) {
      console.error('Error fetching employees:', empError)
      return new Response(JSON.stringify({ error: empError.message }), { 
        headers: corsHeaders,
        status: 500 
      })
    }

    console.log(`Found ${employees?.length || 0} employees with telegram`)

    let checkInReminders = 0
    let checkOutReminders = 0
    let breakEndReminders = 0
    let absenceDeductions = 0

    for (const emp of employees || []) {
      // Skip if no telegram chat id
      if (!emp.telegram_chat_id) {
        continue
      }

      // Skip freelancers - they are exempt from all attendance policies
      if ((emp as any).is_freelancer) {
        console.log(`Skipping ${emp.full_name} - freelancer (exempt from policies)`)
        continue
      }

      const company = emp.companies as any
      
      // Get local time for this company's timezone
      const companyTimezone = company?.timezone || 'Africa/Cairo'
      const { time: currentTime, minutes: currentMinutes, dayName: currentDayName, dateStr: today } = getLocalTime(now, companyTimezone)

      console.log(`Employee ${emp.full_name}: timezone=${companyTimezone}, localTime=${currentTime}, localDate=${today}, day=${currentDayName}`)

      // Get approved leave requests for today for this employee
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_requests')
        .select('id')
        .eq('employee_id', emp.id)
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today)
        .limit(1)

      if (leaveError) {
        console.log(`Error checking leave for ${emp.full_name}:`, leaveError.message)
      }

      if (leaveData && leaveData.length > 0) {
        console.log(`Skipping ${emp.full_name} - on approved leave`)
        continue
      }

      // Check if today is an approved holiday for this company
      const { data: holidayData, error: holidayError } = await supabase
        .from('approved_holidays')
        .select('id')
        .eq('company_id', emp.company_id)
        .eq('holiday_date', today)
        .eq('is_approved', true)
        .limit(1)

      if (holidayError) {
        console.log(`Error checking holiday for ${emp.full_name}:`, holidayError.message)
      }

      if (holidayData && holidayData.length > 0) {
        console.log(`Skipping ${emp.full_name} - approved holiday today`)
        continue
      }

      // Check for scheduled leaves (company-wide, position-based, or individual)
      const { data: scheduledLeaveData } = await supabase
        .from('scheduled_leaves')
        .select('id, target_type, target_id')
        .eq('company_id', emp.company_id)
        .lte('leave_date', today)
        .or(`end_date.gte.${today},end_date.is.null`)

      const hasScheduledLeave = scheduledLeaveData?.some(leave => {
        if (leave.target_type === 'company') return true
        if (leave.target_type === 'position' && leave.target_id === emp.position_id) return true
        if (leave.target_type === 'employee' && leave.target_id === emp.id) return true
        return false
      })

      if (hasScheduledLeave) {
        console.log(`Skipping ${emp.full_name} - scheduled leave today`)
        continue
      }

      // Skip if today is a weekend day for this employee
      const weekendDays = emp.weekend_days || ['friday', 'saturday']
      if (weekendDays.includes(currentDayName)) {
        console.log(`Skipping ${emp.full_name} - today is weekend (${currentDayName})`)
        continue
      }

      const workStartTime = emp.work_start_time || company?.work_start_time || '09:00:00'
      const workEndTime = emp.work_end_time || company?.work_end_time || '17:00:00'
      const breakDuration = emp.break_duration_minutes || company?.break_duration_minutes || 60
      const absenceDeduction = company?.absence_without_permission_deduction || 1 // default 1 day deduction
      
      // Get reminder settings from company
      const autoAbsentAfterHours = company?.auto_absent_after_hours || 2 // default 2 hours
      const checkinReminderCount = company?.checkin_reminder_count || 2
      const checkinReminderInterval = company?.checkin_reminder_interval_minutes || 10
      const checkoutReminderCount = company?.checkout_reminder_count || 2
      const checkoutReminderInterval = company?.checkout_reminder_interval_minutes || 10
      
      // Parse work times to minutes
      const startMinutes = timeToMinutes(workStartTime)
      const endMinutes = timeToMinutes(workEndTime)
      
      // Calculate reminder times dynamically based on settings
      // First reminder is at work start time, subsequent reminders are at intervals
      const checkinReminderTimes: number[] = []
      for (let i = 0; i < checkinReminderCount; i++) {
        checkinReminderTimes.push(startMinutes + (i * checkinReminderInterval))
      }
      
      // Checkout reminders start after work end time
      const checkoutReminderTimes: number[] = []
      for (let i = 0; i < checkoutReminderCount; i++) {
        checkoutReminderTimes.push(endMinutes + (i * checkoutReminderInterval))
      }
      
      // ========== CHECK FOR LATE PERMISSION - ADJUST ABSENCE TIME ==========
      let latePermissionMinutes = 0
      
      // Get approved late arrival permission for today
      const { data: approvedPermRequests } = await supabase
        .from('permission_requests')
        .select('minutes')
        .eq('employee_id', emp.id)
        .eq('request_date', today)
        .eq('permission_type', 'late_arrival')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (approvedPermRequests && approvedPermRequests.length > 0) {
        latePermissionMinutes = approvedPermRequests[0].minutes || 0
        console.log(`Employee ${emp.full_name} has approved late permission: ${latePermissionMinutes} mins`)
      }
      
      // Also check flex-time from inventory/rewards
      const { data: latePermissionUsage } = await supabase
        .from('inventory_usage_logs')
        .select('effect_applied')
        .eq('employee_id', emp.id)
        .eq('used_for_date', today)
        .filter('effect_applied->>type', 'eq', 'late_permission')
      
      if (latePermissionUsage && latePermissionUsage.length > 0) {
        const flexMinutes = latePermissionUsage.reduce((sum: number, log: any) => {
          const minutes = log.effect_applied?.minutes || 60
          return sum + minutes
        }, 0)
        latePermissionMinutes += flexMinutes
        console.log(`Employee ${emp.full_name} has flex-time late permission: ${flexMinutes} mins (total: ${latePermissionMinutes})`)
      }
      
      // Cap late permission at 120 minutes (2 hours)
      const effectiveLatePermission = Math.min(latePermissionMinutes, 120)
      
      // Absence check time based on auto_absent_after_hours + late permission
      // If employee has late permission, add that to the absence check time
      const absenceCheckMinutes = startMinutes + (autoAbsentAfterHours * 60) + effectiveLatePermission

      console.log(`Processing ${emp.full_name}: start=${workStartTime.substring(0,5)} (${startMinutes}), current=${currentMinutes}, checkin reminders at: ${checkinReminderTimes.join(', ')}, checkout at: ${checkoutReminderTimes.join(', ')}`)

      // Get bot token
      let bot: any = null
      if (company?.telegram_bot_username) {
        const { data: botData } = await supabase
          .from('telegram_bots')
          .select('bot_token')
          .eq('bot_username', company?.telegram_bot_username)
          .single()
        bot = botData
      }

      if (!bot?.bot_token) {
        console.log(`No bot token for ${emp.full_name}`)
        continue
      }

      // Check today's attendance
      const { data: attendance } = await supabase
        .from('attendance_logs')
        .select('id, check_in_time, check_out_time, status')
        .eq('employee_id', emp.id)
        .eq('date', today)
        .single()

      // === CHECK-IN REMINDERS (based on company settings) ===
      // Only send if no attendance record exists
      if (!attendance) {
        for (let i = 0; i < checkinReminderTimes.length; i++) {
          const reminderTime = checkinReminderTimes[i]
          // Use exact minute matching to prevent duplicate reminders
          if (isExactMinute(currentMinutes, reminderTime)) {
            const reminderNumber = i + 1
            const minutesLate = reminderTime - startMinutes
            
            let messageText = ''
            if (reminderNumber === 1) {
              // First reminder - at work start time
              messageText = `🌅 <b>صباح الخير - موعد العمل</b>\n\n` +
                `مرحباً ${emp.full_name}!\n` +
                `حان موعد بدء العمل (${workStartTime.substring(0, 5)}).\n` +
                `🕐 الوقت الحالي: ${currentTime}\n\n` +
                `📝 يرجى تسجيل الحضور الآن.`
            } else {
              // Subsequent reminders
              messageText = `⏰ <b>تذكير ${reminderNumber} بتسجيل الحضور</b>\n\n` +
                `مرحباً ${emp.full_name}!\n` +
                `لم تقم بتسجيل حضورك اليوم بعد.\n` +
                `موعد العمل: ${workStartTime.substring(0, 5)}\n` +
                `🕐 الوقت الحالي: ${currentTime}\n\n` +
                `⚠️ <b>مضى ${minutesLate} دقيقة على موعد الحضور!</b>\n` +
                `يرجى تسجيل الحضور فوراً.\n\n` +
                `⏳ <i>سيتم تسجيل غياب تلقائي بعد ${autoAbsentAfterHours} ساعة من موعد العمل.</i>`
            }
            
            console.log(`Sending check-in reminder ${reminderNumber} to ${emp.full_name} at local time ${currentTime}`)
            await sendAndLogMessage(
              supabase,
              bot.bot_token,
              emp,
              messageText,
              getCheckInKeyboard()
            )
            checkInReminders++
            break // Only send one reminder per run
          }
        }
      }

      // === AUTO ABSENCE DEDUCTION (based on auto_absent_after_hours) ===
      if (isExactMinute(currentMinutes, absenceCheckMinutes) && !attendance) {
        console.log(`Checking absence for ${emp.full_name} at ${currentTime} (work starts at ${workStartTime.substring(0, 5)}, absent after ${autoAbsentAfterHours}h)`)
        
        // Check if we already recorded absence today (look for auto-generated absence deduction for this specific date)
        const { data: existingAbsence } = await supabase
          .from('salary_adjustments')
          .select('id')
          .eq('employee_id', emp.id)
          .eq('month', `${today.substring(0, 7)}-01`)
          .eq('is_auto_generated', true)
          .ilike('description', `%غياب بدون إذن - ${today}%`)
          .single()

        if (!existingAbsence) {
          // Calculate deduction amount based on daily salary
          const monthlySalary = emp.base_salary || 0
          const dailySalary = monthlySalary / 30
          const deductionAmount = dailySalary * absenceDeduction
          const currency = emp.currency || company?.default_currency || 'EGP'

          // Create an absent attendance record
          const { data: newAttendance, error: attError } = await supabase
            .from('attendance_logs')
            .insert({
              employee_id: emp.id,
              company_id: emp.company_id,
              date: today,
              status: 'absent',
              notes: `غياب تلقائي - لم يسجل حضور بعد ${autoAbsentAfterHours} ساعة من موعد العمل (${workStartTime.substring(0, 5)})`
            })
            .select('id')
            .single()

          if (attError) {
            console.error(`Failed to create absence record for ${emp.full_name}:`, attError)
            continue
          }

          // Record salary deduction
          const { error: adjError } = await supabase
            .from('salary_adjustments')
            .insert({
              employee_id: emp.id,
              company_id: emp.company_id,
              month: `${today.substring(0, 7)}-01`,
              deduction: deductionAmount,
              adjustment_days: absenceDeduction,
              description: `غياب بدون إذن - ${today} - لم يسجل حضور حتى الساعة ${currentTime}`,
              is_auto_generated: true,
              attendance_log_id: newAttendance?.id
            })

          if (adjError) {
            console.error(`Failed to create deduction for ${emp.full_name}:`, adjError)
          } else {
            console.log(`Recorded absence for ${emp.full_name}: deduction ${deductionAmount} ${currency}`)
            absenceDeductions++

            // Notify employee via Telegram
            await sendAndLogMessage(
              supabase,
              bot.bot_token,
              emp,
              `⚠️ <b>تم تسجيل غياب</b>\n\n` +
              `مرحباً ${emp.full_name}!\n` +
              `لم يتم تسجيل حضورك اليوم حتى الساعة ${currentTime}.\n` +
              `موعد العمل كان: ${workStartTime.substring(0, 5)}\n\n` +
              `📉 تم تسجيل غياب بدون إذن وخصم ${absenceDeduction} يوم من راتبك.\n` +
              `💰 قيمة الخصم: ${deductionAmount.toLocaleString()} ${currency}\n\n` +
              `💡 <i>إذا كان هناك خطأ، يرجى التواصل مع الإدارة.</i>`,
              getEmployeeKeyboard()
            )
          }
        }
      }

      // === CHECK-OUT REMINDERS (based on company settings) ===
      // Skip checkout reminders for employees marked as absent
      if (attendance && attendance.status !== 'checked_out' && attendance.status !== 'absent' && !attendance.check_out_time) {
        for (let i = 0; i < checkoutReminderTimes.length; i++) {
          const reminderTime = checkoutReminderTimes[i]
          // Use exact minute matching to prevent duplicate reminders
          if (isExactMinute(currentMinutes, reminderTime)) {
            const reminderNumber = i + 1
            const minutesAfterEnd = reminderTime - endMinutes
            
            console.log(`Sending check-out reminder ${reminderNumber} to ${emp.full_name} at local time ${currentTime}`)
            await sendAndLogMessage(
              supabase,
              bot.bot_token,
              emp,
              `⏰ <b>تذكير ${reminderNumber} بتسجيل الانصراف</b>\n\n` +
              `مرحباً ${emp.full_name}!\n` +
              `انتهى وقت العمل (${workEndTime.substring(0, 5)})` + 
              (minutesAfterEnd > 0 ? ` منذ ${minutesAfterEnd} دقيقة` : '') + `.\n` +
              `لم تقم بتسجيل انصرافك بعد.\n` +
              `🕐 الوقت الحالي: ${currentTime}\n\n` +
              `⚠️ يرجى تسجيل الانصراف الآن.\n\n` +
              `💡 <i>تجاهل هذه الرسالة إذا كنت تعمل وقت إضافي.</i>`,
              getCheckOutKeyboard()
            )
            checkOutReminders++
            break // Only send one reminder per run
          }
        }
      }

      // Check for employees on break - auto-end break after break_duration_minutes
      if (attendance && attendance.status === 'on_break') {
        const { data: breakLog } = await supabase
          .from('break_logs')
          .select('id, start_time')
          .eq('attendance_id', attendance.id)
          .is('end_time', null)
          .order('start_time', { ascending: false })
          .limit(1)
          .single()

        if (breakLog) {
          const breakStart = new Date(breakLog.start_time)
          const breakDurationMs = (now.getTime() - breakStart.getTime())
          const breakMinutesElapsed = Math.floor(breakDurationMs / 60000)

          if (breakMinutesElapsed >= breakDuration) {
            const nowUtc = now.toISOString()
            
            await supabase
              .from('break_logs')
              .update({ 
                end_time: nowUtc,
                duration_minutes: breakMinutesElapsed
              })
              .eq('id', breakLog.id)

            await supabase
              .from('attendance_logs')
              .update({ status: 'checked_in' })
              .eq('id', attendance.id)

            await sendAndLogMessage(
              supabase,
              bot.bot_token,
              emp,
              `☕ <b>انتهت الاستراحة تلقائياً</b>\n\n` +
              `مرحباً ${emp.full_name}!\n` +
              `انتهت فترة الاستراحة المسموحة (${breakDuration} دقيقة).\n` +
              `تم تحويل حالتك تلقائياً إلى "حاضر".\n\n` +
              `🟢 أنت الآن في وضع العمل.`,
              getEmployeeKeyboard()
            )
            breakEndReminders++
            console.log(`Auto-ended break for ${emp.full_name} after ${breakMinutesElapsed} minutes`)
          }
        }
      }
    }

    const result = { 
      success: true, 
      checkInReminders,
      checkOutReminders,
      breakEndReminders,
      absenceDeductions,
      utcTime: now.toISOString()
    }
    
    console.log('attendance-reminders: completed', result)

    return new Response(JSON.stringify(result), { headers: corsHeaders })

  } catch (error) {
    console.error('Error in attendance-reminders:', error)
    return new Response(JSON.stringify({ error: String(error) }), { 
      headers: corsHeaders,
      status: 500 
    })
  }
})

async function sendAndLogMessage(
  supabase: any,
  botToken: string, 
  employee: any,
  text: string,
  keyboard?: any
) {
  const chatId = parseInt(employee.telegram_chat_id)
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  }

  if (keyboard) {
    body.reply_markup = keyboard
  }

  let telegramMessageId = null

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (res.ok) {
      const result = await res.json()
      telegramMessageId = result.result?.message_id
      console.log('sendMessage success', { chatId })
    } else {
      const txt = await res.text().catch(() => '')
      console.error('sendMessage failed', { chatId, status: res.status, body: txt })
    }
  } catch (error) {
    console.error('sendMessage error', { chatId, error: String(error) })
  }

  // Log the message
  try {
    await supabase.from('telegram_messages').insert({
      company_id: employee.company_id,
      employee_id: employee.id,
      telegram_chat_id: employee.telegram_chat_id,
      message_text: text.replace(/<[^>]*>/g, ''), // Strip HTML
      direction: 'outgoing',
      message_type: 'reminder',
      telegram_message_id: telegramMessageId,
      metadata: { 
        source: 'attendance-reminders',
        keyboard: keyboard 
      }
    })
  } catch (logError) {
    console.error('Failed to log message:', logError)
  }
}

function getCheckInKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '✅ تسجيل حضور', callback_data: 'check_in' }]
    ]
  }
}

function getCheckOutKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🚪 تسجيل انصراف', callback_data: 'check_out' }]
    ]
  }
}

function getEmployeeKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '✅ تسجيل حضور', callback_data: 'check_in' },
        { text: '🚪 تسجيل انصراف', callback_data: 'check_out' }
      ],
      [{ text: '📊 حالتي', callback_data: 'my_status' }]
    ]
  }
}
