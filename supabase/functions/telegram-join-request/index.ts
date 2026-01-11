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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { action, telegram_chat_id, telegram_username, full_name, email, phone, national_id, bot_username } = await req.json()

    if (action === 'join_request') {
      // Find the company that owns this bot
      const { data: bot, error: botError } = await supabase
        .from('telegram_bots')
        .select('assigned_company_id')
        .eq('bot_username', bot_username)
        .single()

      if (botError || !bot?.assigned_company_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Bot not found or not assigned to a company' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      // Check if request already exists
      const { data: existingRequest } = await supabase
        .from('join_requests')
        .select('id, status')
        .eq('telegram_chat_id', telegram_chat_id)
        .eq('company_id', bot.assigned_company_id)
        .eq('status', 'pending')
        .single()

      if (existingRequest) {
        return new Response(
          JSON.stringify({ success: false, error: 'Request already pending', request_id: existingRequest.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Check if employee already exists with this telegram_chat_id
      const { data: existingEmployee } = await supabase
        .from('employees')
        .select('id')
        .eq('telegram_chat_id', telegram_chat_id)
        .eq('company_id', bot.assigned_company_id)
        .single()

      if (existingEmployee) {
        return new Response(
          JSON.stringify({ success: false, error: 'Employee already registered' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Create join request
      const { data: request, error: insertError } = await supabase
        .from('join_requests')
        .insert({
          company_id: bot.assigned_company_id,
          telegram_chat_id,
          telegram_username,
          full_name,
          email,
          phone,
          national_id
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Join request submitted', request_id: request.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'check_status') {
      const { data: request, error } = await supabase
        .from('join_requests')
        .select('status, rejection_reason')
        .eq('telegram_chat_id', telegram_chat_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'No request found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      return new Response(
        JSON.stringify({ success: true, status: request.status, rejection_reason: request.rejection_reason }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
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