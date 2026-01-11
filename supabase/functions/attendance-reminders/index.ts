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
        company_id,
        companies!inner (
          telegram_bot_username,
          work_start_time,
          work_end_time
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

    for (const emp of employees || []) {
      // Skip if today is a weekend day for this employee
      const weekendDays = emp.weekend_days || ['friday', 'saturday']
      if (weekendDays.includes(currentDayName)) {
        continue
      }

      const company = emp.companies as any
      const workStartTime = emp.work_start_time || company?.work_start_time || '09:00:00'
      const workEndTime = emp.work_end_time || company?.work_end_time || '17:00:00'
      
      // Calculate 5 minutes after start time
      const startParts = workStartTime.substring(0, 5).split(':')
      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]) + 5
      const reminderStartTime = `${Math.floor(startMinutes / 60).toString().padStart(2, '0')}:${(startMinutes % 60).toString().padStart(2, '0')}`

      // Calculate 5 minutes after end time
      const endParts = workEndTime.substring(0, 5).split(':')
      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]) + 5
      const reminderEndTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`

      // Check if current time matches reminder times (within 1 minute window)
      const shouldCheckIn = currentTime === reminderStartTime
      const shouldCheckOut = currentTime === reminderEndTime

      if (!shouldCheckIn && !shouldCheckOut) {
        continue
      }

      // Get bot token
      const { data: bot } = await supabase
        .from('telegram_bots')
        .select('bot_token')
        .eq('bot_username', company?.telegram_bot_username)
        .single()

      if (!bot?.bot_token) {
        continue
      }

      // Check today's attendance
      const { data: attendance } = await supabase
        .from('attendance_logs')
        .select('id, check_in_time, check_out_time')
        .eq('employee_id', emp.id)
        .eq('date', today)
        .single()

      // Send check-in reminder
      if (shouldCheckIn && !attendance) {
        await sendMessage(
          bot.bot_token,
          parseInt(emp.telegram_chat_id),
          `⏰ <b>تذكير بتسجيل الحضور</b>\n\n` +
          `مرحباً ${emp.full_name}!\n` +
          `لم تقم بتسجيل حضورك اليوم بعد.\n\n` +
          `⚠️ يرجى تسجيل الحضور الآن.`,
          getCheckInKeyboard()
        )
        checkInReminders++
        console.log(`Sent check-in reminder to ${emp.full_name}`)
      }

      // Send check-out reminder
      if (shouldCheckOut && attendance && !attendance.check_out_time) {
        await sendMessage(
          bot.bot_token,
          parseInt(emp.telegram_chat_id),
          `⏰ <b>تذكير بتسجيل الانصراف</b>\n\n` +
          `مرحباً ${emp.full_name}!\n` +
          `لم تقم بتسجيل انصرافك بعد.\n\n` +
          `⚠️ يرجى تسجيل الانصراف الآن.`,
          getCheckOutKeyboard()
        )
        checkOutReminders++
        console.log(`Sent check-out reminder to ${emp.full_name}`)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        checkInReminders,
        checkOutReminders,
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
      [{ text: '🔴 تسجيل انصراف الآن', callback_data: 'check_out' }]
    ]
  }
}
