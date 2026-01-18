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
    const { scheduled_leave_id } = await req.json()
    
    if (!scheduled_leave_id) {
      return new Response(
        JSON.stringify({ error: 'Missing scheduled_leave_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Notifying about scheduled leave:', scheduled_leave_id)

    // Get scheduled leave details
    const { data: scheduledLeave, error: leaveError } = await supabase
      .from('scheduled_leaves')
      .select('*')
      .eq('id', scheduled_leave_id)
      .single()

    if (leaveError || !scheduledLeave) {
      console.error('Scheduled leave not found:', leaveError)
      return new Response(
        JSON.stringify({ error: 'Scheduled leave not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get bot token for this company
    const { data: bot } = await supabase
      .from('telegram_bots')
      .select('bot_token')
      .eq('assigned_company_id', scheduledLeave.company_id)
      .single()

    if (!bot?.bot_token) {
      console.log('No bot assigned to company, skipping notification')
      return new Response(
        JSON.stringify({ success: true, message: 'No bot assigned, notification skipped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get company name
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', scheduledLeave.company_id)
      .single()

    const companyName = company?.name || 'الشركة'

    // Determine who to notify based on target_type
    let employeesToNotify: any[] = []

    if (scheduledLeave.target_type === 'company') {
      // Notify all active employees in company
      const { data: employees } = await supabase
        .from('employees')
        .select('id, full_name, telegram_chat_id, company_id')
        .eq('company_id', scheduledLeave.company_id)
        .eq('is_active', true)
        .not('telegram_chat_id', 'is', null)

      employeesToNotify = employees || []
    } else if (scheduledLeave.target_type === 'position' && scheduledLeave.target_id) {
      // Notify all employees in specific position
      const { data: employees } = await supabase
        .from('employees')
        .select('id, full_name, telegram_chat_id, company_id')
        .eq('company_id', scheduledLeave.company_id)
        .eq('position_id', scheduledLeave.target_id)
        .eq('is_active', true)
        .not('telegram_chat_id', 'is', null)

      employeesToNotify = employees || []
    } else if (scheduledLeave.target_type === 'employee' && scheduledLeave.target_id) {
      // Notify specific employee
      const { data: employee } = await supabase
        .from('employees')
        .select('id, full_name, telegram_chat_id, company_id')
        .eq('id', scheduledLeave.target_id)
        .single()

      if (employee?.telegram_chat_id) {
        employeesToNotify = [employee]
      }
    }

    if (employeesToNotify.length === 0) {
      console.log('No employees to notify')
      return new Response(
        JSON.stringify({ success: true, message: 'No employees to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get position name if applicable
    let targetName = ''
    if (scheduledLeave.target_type === 'position' && scheduledLeave.target_id) {
      const { data: position } = await supabase
        .from('positions')
        .select('title, title_ar')
        .eq('id', scheduledLeave.target_id)
        .single()
      targetName = position?.title_ar || position?.title || ''
    } else if (scheduledLeave.target_type === 'employee' && scheduledLeave.target_id) {
      const { data: emp } = await supabase
        .from('employees')
        .select('full_name')
        .eq('id', scheduledLeave.target_id)
        .single()
      targetName = emp?.full_name || ''
    }

    // Calculate days
    const startDate = new Date(scheduledLeave.leave_date)
    const endDate = scheduledLeave.end_date ? new Date(scheduledLeave.end_date) : startDate
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // Prepare notification message
    const targetLabel = scheduledLeave.target_type === 'company' 
      ? '🏢 إجازة عامة للشركة'
      : scheduledLeave.target_type === 'position'
        ? `💼 إجازة لمنصب: ${targetName}`
        : `👤 إجازة خاصة`

    const message = `📅 <b>تم تحديد إجازة جديدة</b>\n\n` +
      `🏢 الشركة: ${companyName}\n` +
      `${targetLabel}\n` +
      `📋 السبب: ${scheduledLeave.leave_name}\n` +
      `📅 التاريخ: ${scheduledLeave.leave_date}` +
      (scheduledLeave.end_date && scheduledLeave.end_date !== scheduledLeave.leave_date 
        ? ` إلى ${scheduledLeave.end_date}` : '') + `\n` +
      `📊 عدد الأيام: ${days} يوم\n` +
      (scheduledLeave.reason ? `📝 ملاحظات: ${scheduledLeave.reason}\n` : '') +
      (scheduledLeave.created_by_name ? `\n👤 بواسطة: ${scheduledLeave.created_by_name}` : '') +
      `\n\n🏠 إجازة سعيدة!`

    let notifiedCount = 0

    // Notify each employee
    for (const emp of employeesToNotify) {
      if (emp.telegram_chat_id) {
        try {
          await sendAndLogMessage(supabase, bot.bot_token, emp, message)
          notifiedCount++
          console.log(`Notified ${emp.full_name} about scheduled leave`)
        } catch (notifyErr) {
          console.error('Failed to notify employee:', notifyErr)
        }
      }
    }

    // Update scheduled leave as notified
    await supabase
      .from('scheduled_leaves')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', scheduled_leave_id)

    return new Response(
      JSON.stringify({ success: true, message: `Notified ${notifiedCount} employee(s)` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function sendAndLogMessage(
  supabase: any,
  botToken: string,
  employee: any,
  text: string
) {
  const chatId = employee.telegram_chat_id

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML'
    })
  })

  let telegramMessageId = null
  if (response.ok) {
    const result = await response.json()
    telegramMessageId = result.result?.message_id
  } else {
    throw new Error(`Telegram API error: ${await response.text()}`)
  }

  // Log the message
  try {
    await supabase.from('telegram_messages').insert({
      company_id: employee.company_id,
      employee_id: employee.id,
      telegram_chat_id: chatId,
      message_text: text.replace(/<[^>]*>/g, ''),
      direction: 'outgoing',
      message_type: 'notification',
      telegram_message_id: telegramMessageId,
      metadata: { source: 'notify-scheduled-leave' }
    })
  } catch (logError) {
    console.error('Failed to log message:', logError)
  }
}
