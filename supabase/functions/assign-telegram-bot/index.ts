import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user token to get user info
    const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's company
    const { data: profile, error: profileError } = await supabaseAnon
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyId = profile.company_id;

    // Get company details
    const { data: company, error: companyError } = await supabaseAnon
      .from('companies')
      .select('name, telegram_bot_connected, telegram_bot_username')
      .eq('id', companyId)
      .single();

    if (companyError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch company' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already connected
    if (company.telegram_bot_connected && company.telegram_bot_username) {
      return new Response(
        JSON.stringify({ 
          success: true,
          already_connected: true,
          bot_username: company.telegram_bot_username,
          bot_link: `https://t.me/${company.telegram_bot_username}`,
          message: 'البوت مربوط بالفعل'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find an available bot using service role
    const { data: availableBot, error: botError } = await supabaseAdmin
      .from('telegram_bots')
      .select('*')
      .eq('is_available', true)
      .is('assigned_company_id', null)
      .limit(1)
      .single();

    if (botError || !availableBot) {
      console.error('No available bots:', botError);
      return new Response(
        JSON.stringify({ 
          error: 'لا توجد بوتات متاحة حالياً. يرجى التواصل مع الدعم.',
          no_bots_available: true
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update bot name via Telegram API
    const botToken = availableBot.bot_token;
    const newBotName = `${company.name} - حضور وانصراف`;

    try {
      // Set bot name
      const setNameResponse = await fetch(`https://api.telegram.org/bot${botToken}/setMyName`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBotName.substring(0, 64) }) // Telegram limit is 64 chars
      });
      
      const setNameResult = await setNameResponse.json();
      console.log('Set bot name result:', setNameResult);

      // Set bot description
      const description = `بوت ${company.name} لإدارة الحضور والانصراف`;
      await fetch(`https://api.telegram.org/bot${botToken}/setMyDescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.substring(0, 512) })
      });

      // Set webhook for the bot
      const webhookUrl = `${supabaseUrl}/functions/v1/telegram-webhook?bot=${availableBot.bot_username}`;
      const setWebhookResponse = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query']
        })
      });
      
      const webhookResult = await setWebhookResponse.json();
      console.log('Set webhook result:', webhookResult);

    } catch (telegramError) {
      console.error('Telegram API error:', telegramError);
      // Continue even if Telegram API fails - we can update the name later
    }

    // Assign bot to company using service role
    const { error: updateBotError } = await supabaseAdmin
      .from('telegram_bots')
      .update({
        is_available: false,
        assigned_company_id: companyId,
        assigned_at: new Date().toISOString(),
        bot_name: newBotName
      })
      .eq('id', availableBot.id);

    if (updateBotError) {
      console.error('Failed to update bot:', updateBotError);
      return new Response(
        JSON.stringify({ error: 'فشل في تخصيص البوت' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update company with bot info using service role
    const { error: updateCompanyError } = await supabaseAdmin
      .from('companies')
      .update({
        telegram_bot_connected: true,
        telegram_bot_username: availableBot.bot_username
      })
      .eq('id', companyId);

    if (updateCompanyError) {
      console.error('Failed to update company:', updateCompanyError);
      // Rollback bot assignment
      await supabaseAdmin
        .from('telegram_bots')
        .update({
          is_available: true,
          assigned_company_id: null,
          assigned_at: null,
          bot_name: null
        })
        .eq('id', availableBot.id);

      return new Response(
        JSON.stringify({ error: 'فشل في تحديث بيانات الشركة' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Bot ${availableBot.bot_username} assigned to company ${companyId}`);

    return new Response(
      JSON.stringify({
        success: true,
        bot_username: availableBot.bot_username,
        bot_link: `https://t.me/${availableBot.bot_username}`,
        bot_name: newBotName,
        message: 'تم ربط البوت بنجاح! شارك الرابط مع موظفيك للتسجيل.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in assign-telegram-bot:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
