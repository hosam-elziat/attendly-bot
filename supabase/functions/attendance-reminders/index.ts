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

// Helper to check if current time is within a window of target time
function isWithinWindow(currentMinutes: number, targetMinutes: number, windowMinutes: number = 2): boolean {
  return currentMinutes >= targetMinutes && currentMinutes < targetMinutes + windowMinutes
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
    const currentTime = now.toTimeString().substring(0, 5) // HH:MM format
    const currentMinutes = timeToMinutes(currentTime)
    const today = now.toISOString().split('T')[0]
    const currentDayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()]

    console.log('attendance-reminders: running at', currentTime, `(${currentMinutes} minutes)`, 'on', currentDayName, today)

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

    // Get approved leave requests for today
    const { data: approvedLeaves } = await supabase
      .from('leave_requests')
      .select('employee_id')
      .eq('status', 'approved')
      .lte('start_date', today)
      .gte('end_date', today)

    const employeesOnLeave = new Set((approvedLeaves || []).map(l => l.employee_id))
    console.log(`Employees on leave today: ${employeesOnLeave.size}`)

    // Get approved public holidays for today
    const { data: approvedHolidays } = await supabase
      .from('approved_holidays')
      .select('company_id')
      .eq('holiday_date', today)
      .eq('is_approved', true)

    const companiesWithHoliday = new Set((approvedHolidays || []).map(h => h.company_id))
    console.log(`Companies with approved holiday today: ${companiesWithHoliday.size}`)

    let checkInReminders = 0
    let checkOutReminders = 0
    let breakEndReminders = 0
    let absenceDeductions = 0

    for (const emp of employees || []) {
      // Skip if no telegram chat id
      if (!emp.telegram_chat_id) {
        continue
      }

      const company = emp.companies as any

      // Skip if today is an approved holiday for this company
      if (companiesWithHoliday.has(emp.company_id)) {
        console.log(`Skipping ${emp.full_name} - approved holiday today`)
        continue
      }

      // Skip if today is a weekend day for this employee
      const weekendDays = emp.weekend_days || ['friday', 'saturday']
      if (weekendDays.includes(currentDayName)) {
        console.log(`Skipping ${emp.full_name} - today is weekend (${currentDayName})`)
        continue
      }

      // Skip if employee is on approved leave
      if (employeesOnLeave.has(emp.id)) {
        console.log(`Skipping ${emp.full_name} - on approved leave`)
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
      
      // Absence check time based on auto_absent_after_hours
      const absenceCheckMinutes = startMinutes + (autoAbsentAfterHours * 60)

      console.log(`Processing ${emp.full_name}: start=${workStartTime.substring(0,5)} (${startMinutes}), current=${currentMinutes}, checkin reminders at: ${checkinReminderTimes.join(', ')}`)

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
      for (let i = 0; i < checkinReminderTimes.length; i++) {
        const reminderTime = checkinReminderTimes[i]
        if (isWithinWindow(currentMinutes, reminderTime, 3) && !attendance) {
          const reminderNumber = i + 1
          const minutesLate = reminderTime - startMinutes
          
          let messageText = ''
          if (reminderNumber === 1) {
            // First reminder - at work start time
            messageText = `🌅 <b>صباح الخير - موعد العمل</b>\n\n` +
              `مرحباً ${emp.full_name}!\n` +
              `حان موعد بدء العمل (${workStartTime.substring(0, 5)}).\n\n` +
              `📝 يرجى تسجيل الحضور الآن.`
          } else {
            // Subsequent reminders
            messageText = `⏰ <b>تذكير ${reminderNumber} بتسجيل الحضور</b>\n\n` +
              `مرحباً ${emp.full_name}!\n` +
              `لم تقم بتسجيل حضورك اليوم بعد.\n` +
              `موعد العمل: ${workStartTime.substring(0, 5)}\n` +
              `الوقت الحالي: ${currentTime}\n\n` +
              `⚠️ <b>مضى ${minutesLate} دقيقة على موعد الحضور!</b>\n` +
              `يرجى تسجيل الحضور فوراً.\n\n` +
              `⏳ <i>سيتم تسجيل غياب تلقائي بعد ${autoAbsentAfterHours} ساعة من موعد العمل.</i>`
          }
          
          console.log(`Sending check-in reminder ${reminderNumber} to ${emp.full_name}`)
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

      // === AUTO ABSENCE DEDUCTION (based on auto_absent_after_hours) ===
      if (isWithinWindow(currentMinutes, absenceCheckMinutes, 3) && !attendance) {
        console.log(`Checking absence for ${emp.full_name} at ${currentTime} (work starts at ${workStartTime.substring(0, 5)}, absent after ${autoAbsentAfterHours}h)`)
        
        // Double-check employee is not on leave (re-fetch to be sure)
        const { data: leaveCheck } = await supabase
          .from('leave_requests')
          .select('id')
          .eq('employee_id', emp.id)
          .eq('status', 'approved')
          .lte('start_date', today)
          .gte('end_date', today)
          .single()
        
        if (leaveCheck) {
          console.log(`${emp.full_name} is on approved leave, skipping absence deduction`)
          continue
        }
        
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
      if (attendance && attendance.status !== 'checked_out' && !attendance.check_out_time) {
        for (let i = 0; i < checkoutReminderTimes.length; i++) {
          const reminderTime = checkoutReminderTimes[i]
          if (isWithinWindow(currentMinutes, reminderTime, 3)) {
            const reminderNumber = i + 1
            const minutesAfterEnd = reminderTime - endMinutes
            
            console.log(`Sending check-out reminder ${reminderNumber} to ${emp.full_name}`)
            await sendAndLogMessage(
              supabase,
              bot.bot_token,
              emp,
              `⏰ <b>تذكير ${reminderNumber} بتسجيل الانصراف</b>\n\n` +
              `مرحباً ${emp.full_name}!\n` +
              `انتهى وقت العمل (${workEndTime.substring(0, 5)})` + 
              (minutesAfterEnd > 0 ? ` منذ ${minutesAfterEnd} دقيقة` : '') + `.\n` +
              `لم تقم بتسجيل انصرافك بعد.\n\n` +
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
      time: currentTime,
      date: today,
      day: currentDayName
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
