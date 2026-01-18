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
    const { leave_request_id } = await req.json()
    
    if (!leave_request_id) {
      return new Response(
        JSON.stringify({ error: 'Missing leave_request_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Notifying managers about emergency leave request:', leave_request_id)

    // Get leave request details with employee info
    const { data: leaveRequest, error: leaveError } = await supabase
      .from('leave_requests')
      .select(`
        *,
        employees (
          id,
          full_name,
          telegram_chat_id,
          company_id,
          position_id
        )
      `)
      .eq('id', leave_request_id)
      .single()

    if (leaveError || !leaveRequest) {
      console.error('Leave request not found:', leaveError)
      return new Response(
        JSON.stringify({ error: 'Leave request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Only process emergency leaves
    if (leaveRequest.leave_type !== 'emergency') {
      console.log('Not an emergency leave, skipping manager notification')
      return new Response(
        JSON.stringify({ success: true, message: 'Not emergency leave, skipped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const employee = leaveRequest.employees as any

    // Get bot token for this company
    const { data: bot } = await supabase
      .from('telegram_bots')
      .select('bot_token')
      .eq('assigned_company_id', employee.company_id)
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
      .eq('id', employee.company_id)
      .single()

    const companyName = company?.name || 'الشركة'

    // Get employee's position name if exists
    let positionName = ''
    if (employee.position_id) {
      const { data: position } = await supabase
        .from('positions')
        .select('title, title_ar')
        .eq('id', employee.position_id)
        .single()
      positionName = position?.title_ar || position?.title || ''
    }

    // Get direct managers using RPC
    const { data: managers, error: managersError } = await supabase
      .rpc('get_employee_managers', { emp_id: employee.id })

    if (managersError) {
      console.error('Error getting managers:', managersError)
      return new Response(
        JSON.stringify({ error: 'Failed to get managers' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!managers || managers.length === 0) {
      console.log('No managers found for employee:', employee.id)
      return new Response(
        JSON.stringify({ success: true, message: 'No managers to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare manager notification message
    const message = `🚨 <b>طلب إجازة طارئة جديد!</b>\n\n` +
      `🏢 الشركة: ${companyName}\n` +
      `👤 الموظف: ${employee.full_name}\n` +
      (positionName ? `💼 المنصب: ${positionName}\n` : '') +
      `📅 التاريخ: ${leaveRequest.start_date}` +
      (leaveRequest.start_date !== leaveRequest.end_date ? ` إلى ${leaveRequest.end_date}` : '') + `\n` +
      `📊 عدد الأيام: ${leaveRequest.days} يوم\n` +
      (leaveRequest.reason ? `📝 السبب: ${leaveRequest.reason}\n` : '') +
      `\n⏳ الحالة: في انتظار الموافقة\n` +
      `\n⚠️ يرجى مراجعة الطلب في لوحة التحكم.`

    let notifiedCount = 0

    // Notify each manager
    for (const manager of managers) {
      if (manager.manager_telegram_chat_id) {
        try {
          // Get manager employee info for logging
          const { data: managerEmployee } = await supabase
            .from('employees')
            .select('id, company_id, telegram_chat_id')
            .eq('id', manager.manager_employee_id)
            .single()

          if (managerEmployee) {
            await sendAndLogMessage(supabase, bot.bot_token, managerEmployee, message)
            notifiedCount++
            console.log(`Notified manager ${manager.manager_name} about emergency leave from ${employee.full_name}`)
          }
        } catch (notifyErr) {
          console.error('Failed to notify manager:', notifyErr)
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: `Notified ${notifiedCount} manager(s)` }),
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
      metadata: { source: 'notify-emergency-leave' }
    })
  } catch (logError) {
    console.error('Failed to log message:', logError)
  }
}
