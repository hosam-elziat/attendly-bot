import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const today = now.toISOString().split('T')[0]
    const currentDayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()]

    console.log('attendance-reminders: running at', currentTime, 'on', currentDayName)

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
          default_currency
        )
      `)
      .eq('is_active', true)

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

    let checkInReminders = 0
    let checkOutReminders = 0
    let breakEndReminders = 0
    let absenceDeductions = 0

    for (const emp of employees || []) {
      // Skip if today is a weekend day for this employee
      const weekendDays = emp.weekend_days || ['friday', 'saturday']
      if (weekendDays.includes(currentDayName)) {
        continue
      }

      // Skip if employee is on approved leave
      if (employeesOnLeave.has(emp.id)) {
        continue
      }

      const company = emp.companies as any
      const workStartTime = emp.work_start_time || company?.work_start_time || '09:00:00'
      const workEndTime = emp.work_end_time || company?.work_end_time || '17:00:00'
      const breakDuration = emp.break_duration_minutes || company?.break_duration_minutes || 60
      const absenceDeduction = company?.absence_without_permission_deduction || 1 // default 1 day deduction
      
      // Parse work start time
      const startParts = workStartTime.substring(0, 5).split(':')
      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1])
      
      // Calculate 5 minutes after start time for reminder
      const reminderStartMinutes = startMinutes + 5
      const reminderStartTime = `${Math.floor(reminderStartMinutes / 60).toString().padStart(2, '0')}:${(reminderStartMinutes % 60).toString().padStart(2, '0')}`

      // Calculate 2 hours after start time for absence check (changed from 1 hour to 2 hours)
      const absenceCheckMinutes = startMinutes + 120
      const absenceCheckTime = `${Math.floor(absenceCheckMinutes / 60).toString().padStart(2, '0')}:${(absenceCheckMinutes % 60).toString().padStart(2, '0')}`

      // Calculate 5 minutes after end time
      const endParts = workEndTime.substring(0, 5).split(':')
      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]) + 5
      const reminderEndTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`

      // Check if current time matches reminder times (within 1 minute window)
      const shouldCheckIn = currentTime === reminderStartTime
      const shouldCheckOut = currentTime === reminderEndTime
      const shouldCheckAbsence = currentTime === absenceCheckTime

      // Get bot token (if employee has telegram)
      let bot: any = null
      if (emp.telegram_chat_id && company?.telegram_bot_username) {
        const { data: botData } = await supabase
          .from('telegram_bots')
          .select('bot_token')
          .eq('bot_username', company?.telegram_bot_username)
          .single()
        bot = botData
      }

      // Check today's attendance
      const { data: attendance } = await supabase
        .from('attendance_logs')
        .select('id, check_in_time, check_out_time, status')
        .eq('employee_id', emp.id)
        .eq('date', today)
        .single()

      // === AUTO ABSENCE DEDUCTION (1 hour after work start) ===
      if (shouldCheckAbsence && !attendance) {
        console.log(`Checking absence for ${emp.full_name} at ${currentTime} (work starts at ${workStartTime.substring(0, 5)})`)
        
        // Check if we already recorded absence today (look for auto-generated absence deduction)
        const { data: existingAbsence } = await supabase
          .from('salary_adjustments')
          .select('id')
          .eq('employee_id', emp.id)
          .eq('month', `${today.substring(0, 7)}-01`) // month is stored as date YYYY-MM-01
          .eq('is_auto_generated', true)
          .ilike('description', '%غياب بدون إذن%')
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
              notes: 'غياب تلقائي - لم يسجل حضور بعد ساعة من موعد العمل'
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
              month: `${today.substring(0, 7)}-01`, // Store as first day of month
              deduction: deductionAmount,
              adjustment_days: absenceDeduction,
              description: `غياب بدون إذن - ${today} - لم يسجل حضور حتى ${absenceCheckTime}`,
              is_auto_generated: true,
              attendance_log_id: newAttendance?.id
            })

          if (adjError) {
            console.error(`Failed to create deduction for ${emp.full_name}:`, adjError)
          }

          console.log(`Recorded absence for ${emp.full_name}: deduction ${deductionAmount}`)
          absenceDeductions++

          // Notify employee via Telegram if available
          if (bot?.bot_token && emp.telegram_chat_id) {
            await sendMessage(
              bot.bot_token,
              parseInt(emp.telegram_chat_id),
              `⚠️ <b>تم تسجيل غياب</b>\n\n` +
              `مرحباً ${emp.full_name}!\n` +
              `لم يتم تسجيل حضورك اليوم حتى الساعة ${absenceCheckTime}.\n` +
              `تم تسجيل غياب بدون إذن وخصم ${absenceDeduction} يوم من راتبك (${deductionAmount.toLocaleString()} ${currency}).\n\n` +
              `💡 <i>إذا كان هناك خطأ، يرجى التواصل مع الإدارة.</i>`,
              getEmployeeKeyboard()
            )
          }
        }
      }

      // Skip telegram-related operations if no bot token
      if (!bot?.bot_token || !emp.telegram_chat_id) {
        continue
      }

      // Send check-in reminder (5 min after work start if not checked in)
      if (shouldCheckIn && !attendance) {
        await sendMessage(
          bot.bot_token,
          parseInt(emp.telegram_chat_id),
          `⏰ <b>تذكير بتسجيل الحضور</b>\n\n` +
          `مرحباً ${emp.full_name}!\n` +
          `لم تقم بتسجيل حضورك اليوم بعد.\n` +
          `موعد العمل: ${workStartTime.substring(0, 5)}\n\n` +
          `⚠️ يرجى تسجيل الحضور الآن.\n` +
          `⏳ <i>سيتم تسجيل غياب تلقائي بعد ساعة من موعد العمل.</i>`,
          getCheckInKeyboard()
        )
        checkInReminders++
        console.log(`Sent check-in reminder to ${emp.full_name}`)
      }

      // Send check-out reminder (5 min after work end if not checked out)
      if (shouldCheckOut && attendance && !attendance.check_out_time) {
        await sendMessage(
          bot.bot_token,
          parseInt(emp.telegram_chat_id),
          `⏰ <b>تذكير بتسجيل الانصراف</b>\n\n` +
          `مرحباً ${emp.full_name}!\n` +
          `لم تقم بتسجيل انصرافك بعد.\n` +
          `موعد الانصراف: ${workEndTime.substring(0, 5)}\n\n` +
          `⚠️ يرجى تسجيل الانصراف الآن.\n\n` +
          `💡 <i>تجاهل هذه الرسالة إذا كنت تعمل وقت إضافي.</i>`,
          getCheckOutKeyboard()
        )
        checkOutReminders++
        console.log(`Sent check-out reminder to ${emp.full_name}`)
      }

      // Check for employees on break - auto-end break after break_duration_minutes
      if (attendance && attendance.status === 'on_break') {
        // Get the break log to check duration
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

          // If break exceeded the allowed duration, auto-end it
          if (breakMinutesElapsed >= breakDuration) {
            const nowUtc = now.toISOString()
            
            // Update break log
            await supabase
              .from('break_logs')
              .update({ 
                end_time: nowUtc,
                duration_minutes: breakMinutesElapsed
              })
              .eq('id', breakLog.id)

            // Update attendance status
            await supabase
              .from('attendance_logs')
              .update({ status: 'checked_in' })
              .eq('id', attendance.id)

            // Notify employee
            await sendMessage(
              bot.bot_token,
              parseInt(emp.telegram_chat_id),
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        checkInReminders,
        checkOutReminders,
        breakEndReminders,
        absenceDeductions,
        time: currentTime 
      }), 
      { headers: corsHeaders }
    )

  } catch (error) {
    console.error('Error in attendance-reminders:', error)
    return new Response(JSON.stringify({ error: String(error) }), { 
      headers: corsHeaders,
      status: 500 
    })
  }
})

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
    console.error('sendMessage failed', { status: res.status, body: txt })
  }
}

function getCheckInKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '✅ تسجيل حضور الآن', callback_data: 'check_in' }]
    ]
  }
}

function getCheckOutKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🔴 تسجيل انصراف الآن', callback_data: 'check_out' }],
      [{ text: '⏰ مكمل وقت إضافي', callback_data: 'dismiss_checkout_reminder' }]
    ]
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
        { text: '🔙 إنهاء استراحة', callback_data: 'end_break' }
      ],
      [
        { text: '📋 حالتي', callback_data: 'my_status' }
      ]
    ]
  }
}
