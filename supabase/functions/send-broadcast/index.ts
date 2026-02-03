import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BroadcastRequest {
  broadcast_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { broadcast_id }: BroadcastRequest = await req.json();

    if (!broadcast_id) {
      throw new Error('broadcast_id is required');
    }

    console.log(`Starting broadcast: ${broadcast_id}`);

    // Get broadcast details
    const { data: broadcast, error: broadcastError } = await supabase
      .from('admin_broadcasts')
      .select('*')
      .eq('id', broadcast_id)
      .single();

    if (broadcastError || !broadcast) {
      throw new Error(`Broadcast not found: ${broadcastError?.message}`);
    }

    // Update status to sending
    await supabase
      .from('admin_broadcasts')
      .update({ status: 'sending' })
      .eq('id', broadcast_id);

    // Get target companies based on filter
    let companiesQuery = supabase
      .from('companies')
      .select(`
        id,
        name,
        business_owner_id,
        telegram_bot_username,
        subscriptions!inner(plan_name, status)
      `)
      .eq('is_deleted', false)
      .eq('is_suspended', false)
      .eq('telegram_bot_connected', true);

    // Apply filter based on target_type
    if (broadcast.target_type === 'subscription' && broadcast.target_filter?.plans) {
      companiesQuery = companiesQuery.in('subscriptions.plan_name', broadcast.target_filter.plans);
    } else if (broadcast.target_type === 'custom' && broadcast.target_filter?.company_ids) {
      companiesQuery = companiesQuery.in('id', broadcast.target_filter.company_ids);
    }

    const { data: companies, error: companiesError } = await companiesQuery;

    if (companiesError) {
      throw new Error(`Error fetching companies: ${companiesError.message}`);
    }

    console.log(`Found ${companies?.length || 0} target companies`);

    let successCount = 0;
    let failCount = 0;

    for (const company of companies || []) {
      try {
        // Get bot token
        const { data: botData } = await supabase
          .from('telegram_bots')
          .select('bot_token')
          .eq('assigned_company_id', company.id)
          .single();

        if (!botData?.bot_token) {
          console.log(`No bot token for company ${company.id}`);
          
          await supabase.from('broadcast_deliveries').insert({
            broadcast_id,
            company_id: company.id,
            status: 'failed',
            error_message: 'No Telegram bot configured',
          });
          
          failCount++;
          continue;
        }

        // Find the business owner's telegram chat id
        // First try by business_owner_id, then fall back to finding an owner in employees
        let telegramChatId: string | null = null;
        let employeeId: string | null = null;

        if (company.business_owner_id) {
          const { data: ownerEmployee } = await supabase
            .from('employees')
            .select('id, telegram_chat_id')
            .eq('company_id', company.id)
            .eq('user_id', company.business_owner_id)
            .eq('is_active', true)
            .not('telegram_chat_id', 'is', null)
            .maybeSingle();

          if (ownerEmployee?.telegram_chat_id) {
            telegramChatId = ownerEmployee.telegram_chat_id;
            employeeId = ownerEmployee.id;
          }
        }

        // Fallback: find any employee with owner role
        if (!telegramChatId) {
          const { data: anyOwner } = await supabase
            .from('employees')
            .select('id, telegram_chat_id')
            .eq('company_id', company.id)
            .eq('is_active', true)
            .not('telegram_chat_id', 'is', null)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (anyOwner?.telegram_chat_id) {
            telegramChatId = anyOwner.telegram_chat_id;
            employeeId = anyOwner.id;
          }
        }

        if (!telegramChatId) {
          console.log(`No business owner with Telegram for company ${company.id}`);
          
          await supabase.from('broadcast_deliveries').insert({
            broadcast_id,
            company_id: company.id,
            status: 'failed',
            error_message: 'Business owner has no Telegram connected',
          });
          
          failCount++;
          continue;
        }

        // Send the message
        let messageSent = false;

        // Send image if present
        if (broadcast.image_url) {
          const imgResponse = await fetch(`https://api.telegram.org/bot${botData.bot_token}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              photo: broadcast.image_url,
              caption: broadcast.message_text,
              parse_mode: 'Markdown'
            })
          });
          messageSent = imgResponse.ok;
        }
        // Send audio if present (without image)
        else if (broadcast.audio_url) {
          const audioResponse = await fetch(`https://api.telegram.org/bot${botData.bot_token}/sendAudio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              audio: broadcast.audio_url,
              caption: broadcast.message_text,
              parse_mode: 'Markdown'
            })
          });
          messageSent = audioResponse.ok;
        }
        // Send text only
        else {
          const textResponse = await fetch(`https://api.telegram.org/bot${botData.bot_token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: broadcast.message_text,
              parse_mode: 'Markdown'
            })
          });
          messageSent = textResponse.ok;
        }

        if (messageSent) {
          await supabase.from('broadcast_deliveries').insert({
            broadcast_id,
            company_id: company.id,
            employee_id: employeeId,
            telegram_chat_id: telegramChatId,
            status: 'sent',
            sent_at: new Date().toISOString(),
          });
          successCount++;
          console.log(`Sent broadcast to company ${company.name}`);
        } else {
          await supabase.from('broadcast_deliveries').insert({
            broadcast_id,
            company_id: company.id,
            employee_id: employeeId,
            telegram_chat_id: telegramChatId,
            status: 'failed',
            error_message: 'Telegram API error',
          });
          failCount++;
        }

      } catch (companyError) {
        console.error(`Error processing company ${company.id}:`, companyError);
        
        await supabase.from('broadcast_deliveries').insert({
          broadcast_id,
          company_id: company.id,
          status: 'failed',
          error_message: String(companyError),
        });
        
        failCount++;
      }
    }

    // Update broadcast with final stats
    await supabase
      .from('admin_broadcasts')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        total_recipients: (companies?.length || 0),
        successful_sends: successCount,
        failed_sends: failCount,
      })
      .eq('id', broadcast_id);

    return new Response(
      JSON.stringify({
        success: true,
        total: companies?.length || 0,
        sent: successCount,
        failed: failCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-broadcast:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
