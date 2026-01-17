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
    const { leave_request_id, status } = await req.json()
    
    if (!leave_request_id || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing leave_request_id or status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Notifying employee about leave status:', { leave_request_id, status })

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
          leave_balance,
          emergency_leave_balance
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

    const employee = leaveRequest.employees as any
    if (!employee?.telegram_chat_id) {
      console.log('Employee has no telegram_chat_id, skipping notification')
      return new Response(
        JSON.stringify({ success: true, message: 'No Telegram chat ID, notification skipped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    // Get company settings (so balances always match current settings)
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name, annual_leave_days, emergency_leave_days')
      .eq('id', employee.company_id)
      .single()

    if (companyError) {
      console.error('Failed to load company settings:', companyError)
    }

    const companyName = company?.name || 'الشركة'

    // Prepare notification message
    const leaveTypeMap: Record<string, string> = {
      'emergency': 'طارئة',
      'regular': 'اعتيادية',
      'vacation': 'سنوية',
      'sick': 'مرضية',
      'personal': 'شخصية'
    }
    const leaveTypeText = leaveTypeMap[leaveRequest.leave_type] || leaveRequest.leave_type

    // Get leave balance info (fallback to company settings if employee balances are null)
    const leaveBalance = employee.leave_balance ?? company?.annual_leave_days ?? 0
    const emergencyBalance = employee.emergency_leave_balance ?? company?.emergency_leave_days ?? 0

    let message = ''
    if (status === 'approved') {
      message = `✅ <b>تمت الموافقة على طلب إجازتك!</b>\n\n` +
        `📋 النوع: إجازة ${leaveTypeText}\n` +
        `📅 التاريخ: ${leaveRequest.start_date}` +
        (leaveRequest.start_date !== leaveRequest.end_date ? ` إلى ${leaveRequest.end_date}` : '') + `\n` +
        `📊 عدد الأيام: ${leaveRequest.days} يوم\n` +
        (leaveRequest.reason ? `📝 السبب: ${leaveRequest.reason}\n` : '') +
        `\n📊 <b>رصيدك المتبقي:</b>\n` +
        `• إجازات اعتيادية: ${leaveBalance} يوم\n` +
        `• إجازات طارئة: ${emergencyBalance} يوم\n` +
        `\n🏠 إجازة سعيدة!`
    } else if (status === 'rejected') {
      message = `❌ <b>تم رفض طلب إجازتك</b>\n\n` +
        `📋 النوع: إجازة ${leaveTypeText}\n` +
        `📅 التاريخ: ${leaveRequest.start_date}` +
        (leaveRequest.start_date !== leaveRequest.end_date ? ` إلى ${leaveRequest.end_date}` : '') + `\n` +
        (leaveRequest.reason ? `📝 السبب: ${leaveRequest.reason}\n` : '') +
        `\n📊 <b>رصيدك الحالي:</b>\n` +
        `• إجازات اعتيادية: ${leaveBalance} يوم\n` +
        `• إجازات طارئة: ${emergencyBalance} يوم\n` +
        `\n⚠️ يرجى التواصل مع الإدارة للمزيد من التفاصيل.`
    }

    // 1) Notify employee
    try {
      await sendAndLogMessage(supabase, bot.bot_token, employee, message)
      console.log('Employee leave-status notification sent successfully')
    } catch (err) {
      console.error('Failed to notify employee via Telegram:', err)
      return new Response(
        JSON.stringify({ error: 'Failed to send Telegram notification to employee' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2) Notify direct manager(s)
    try {
      const { data: managers, error: managersError } = await supabase
        .rpc('get_employee_managers', { emp_id: employee.id })

      if (managersError) {
        console.error('Error getting managers for leave decision:', managersError)
      } else if (managers && managers.length > 0) {
        let reviewerName = 'الإدارة'
        if (leaveRequest.reviewed_by) {
          const { data: reviewerProfile, error: reviewerError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', leaveRequest.reviewed_by)
            .single()

          if (!reviewerError && reviewerProfile?.full_name) {
            reviewerName = reviewerProfile.full_name
          }
        }

        const decisionText = status === 'approved' ? '✅ تمت الموافقة' : '❌ تم الرفض'
        const managerMsg = `🔔 <b>قرار طلب إجازة</b>\n\n` +
          `🏢 الشركة: ${companyName}\n` +
          `👤 الموظف: ${employee.full_name}\n` +
          `📋 النوع: إجازة ${leaveTypeText}\n` +
          `📅 التاريخ: ${leaveRequest.start_date}` +
          (leaveRequest.start_date !== leaveRequest.end_date ? ` إلى ${leaveRequest.end_date}` : '') + `\n` +
          `📊 عدد الأيام: ${leaveRequest.days} يوم\n` +
          (leaveRequest.reason ? `📝 السبب: ${leaveRequest.reason}\n` : '') +
          `\n${decisionText}\n` +
          `👤 بواسطة: ${reviewerName}`

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
                await sendAndLogMessage(supabase, bot.bot_token, managerEmployee, managerMsg)
              }
              console.log(`Notified manager ${manager.manager_name} about ${employee.full_name}'s leave decision`)
            } catch (managerNotifyErr) {
              console.error('Failed to notify manager via Telegram:', managerNotifyErr)
            }
          }
        }
      } else {
        console.log('No managers found for employee:', employee.id)
      }
    } catch (error) {
      console.error('Error notifying managers about leave decision:', error)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notification(s) sent' }),
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
      message_text: text.replace(/<[^>]*>/g, ''), // Strip HTML
      direction: 'outgoing',
      message_type: 'notification',
      telegram_message_id: telegramMessageId,
      metadata: { source: 'notify-leave-status' }
    })
  } catch (logError) {
    console.error('Failed to log message:', logError)
  }
}
