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

    // Prepare notification message
    const leaveTypeMap: Record<string, string> = {
      'emergency': 'طارئة',
      'regular': 'اعتيادية',
      'vacation': 'سنوية',
      'sick': 'مرضية',
      'personal': 'شخصية'
    }
    const leaveTypeText = leaveTypeMap[leaveRequest.leave_type] || leaveRequest.leave_type
    
    // Get leave balance info
    const leaveBalance = employee.leave_balance ?? 0
    const emergencyBalance = employee.emergency_leave_balance ?? 0

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

    // Send Telegram message
    const telegramResponse = await fetch(`https://api.telegram.org/bot${bot.bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: employee.telegram_chat_id,
        text: message,
        parse_mode: 'HTML'
      })
    })

    const telegramResult = await telegramResponse.json()
    
    if (!telegramResponse.ok) {
      console.error('Telegram API error:', telegramResult)
      return new Response(
        JSON.stringify({ error: 'Failed to send Telegram notification', details: telegramResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Notification sent successfully')
    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
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
