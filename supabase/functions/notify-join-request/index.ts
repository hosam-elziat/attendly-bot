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

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create client with user's JWT to verify they're authenticated
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey.replace('service_role', 'anon'), {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user's company
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not associated with a company' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Verify user has admin/owner role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'owner'])
      .maybeSingle()

    if (!roleData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const { action, telegram_chat_id, employee_name, rejection_reason } = await req.json()

    if (!action || !telegram_chat_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: action, telegram_chat_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get company's bot info
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('telegram_bot_username')
      .eq('id', profile.company_id)
      .single()

    if (companyError || !company?.telegram_bot_username) {
      return new Response(
        JSON.stringify({ success: false, error: 'Company has no Telegram bot configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Get bot token (using service role - never exposed to client)
    const { data: bot, error: botError } = await supabase
      .from('telegram_bots')
      .select('bot_token')
      .eq('bot_username', company.telegram_bot_username)
      .single()

    if (botError || !bot?.bot_token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Bot token not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    let message: string
    let reply_markup: object | undefined

    switch (action) {
      case 'approved':
        message = `🎉 مرحباً ${employee_name || ''}!\n\nتم قبول طلب انضمامك بنجاح!\nيمكنك الآن استخدام البوت لتسجيل الحضور والانصراف.\n\nأرسل /start للبدء.`
        reply_markup = {
          inline_keyboard: [
            [
              { text: '✅ تسجيل حضور', callback_data: 'check_in' },
              { text: '🔴 تسجيل انصراف', callback_data: 'check_out' }
            ]
          ]
        }
        break

      case 'rejected':
        message = rejection_reason 
          ? `❌ عذراً، تم رفض طلب انضمامك.\n\nالسبب: ${rejection_reason}`
          : '❌ عذراً، تم رفض طلب انضمامك.'
        break

      case 'reactivated':
        message = `🎉 مرحباً بعودتك ${employee_name || ''}!\n\nتم إعادة تفعيل حسابك بنجاح!\nيمكنك الآن استخدام البوت لتسجيل الحضور والانصراف.\n\nأرسل /start للبدء.`
        reply_markup = {
          inline_keyboard: [
            [
              { text: '✅ تسجيل حضور', callback_data: 'check_in' },
              { text: '🔴 تسجيل انصراف', callback_data: 'check_out' }
            ]
          ]
        }
        break

      case 'restored':
        message = `🎉 مرحباً بعودتك ${employee_name || ''}!\n\nتم استعادة حسابك بنجاح!\nجميع بياناتك السابقة متاحة الآن.\n\nأرسل /start للبدء.`
        reply_markup = {
          inline_keyboard: [
            [
              { text: '✅ تسجيل حضور', callback_data: 'check_in' },
              { text: '🔴 تسجيل انصراف', callback_data: 'check_out' }
            ]
          ]
        }
        break

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }

    // Send Telegram message
    const telegramResponse = await fetch(`https://api.telegram.org/bot${bot.bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegram_chat_id,
        text: message,
        ...(reply_markup && { reply_markup })
      })
    })

    if (!telegramResponse.ok) {
      const errorText = await telegramResponse.text()
      console.error('Telegram API error:', errorText)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send Telegram message' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
