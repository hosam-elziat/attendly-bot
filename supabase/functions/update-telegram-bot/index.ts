import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabaseAnon
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyId = profile.company_id;

    // Get company and check if bot is connected
    const { data: company } = await supabaseAnon
      .from('companies')
      .select('name, telegram_bot_connected, telegram_bot_username')
      .eq('id', companyId)
      .single();

    if (!company?.telegram_bot_connected) {
      return new Response(
        JSON.stringify({ error: 'البوت غير مربوط' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get bot token
    const { data: bot } = await supabaseAdmin
      .from('telegram_bots')
      .select('bot_token')
      .eq('assigned_company_id', companyId)
      .single();

    if (!bot?.bot_token) {
      return new Response(
        JSON.stringify({ error: 'Bot not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const botToken = bot.bot_token;

    let action: string | null = null;
    let photoFile: File | null = null;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      action = typeof (body as any)?.action === 'string' ? (body as any).action : null;
    } else {
      const formData = await req.formData();
      action = (formData.get('action') as string) || null;
      photoFile = (formData.get('photo') as File) || null;
    }

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update_name') {
      const newBotName = `${company.name} - حضور وانصراف`;

      // Update bot name
      const setNameResponse = await fetch(`https://api.telegram.org/bot${botToken}/setMyName`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBotName.substring(0, 64) })
      });

      const setNameResult = await setNameResponse.json();
      console.log('Set bot name result:', setNameResult);

      if (!setNameResult?.ok) {
        return new Response(
          JSON.stringify({ error: 'فشل في تحديث اسم البوت: ' + (setNameResult?.description || 'خطأ غير معروف') }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update description
      const description = `بوت ${company.name} لإدارة الحضور والانصراف`;
      const setDescResponse = await fetch(`https://api.telegram.org/bot${botToken}/setMyDescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.substring(0, 512) })
      });

      const setDescResult = await setDescResponse.json();
      console.log('Set bot description result:', setDescResult);

      if (!setDescResult?.ok) {
        return new Response(
          JSON.stringify({ error: 'فشل في تحديث وصف البوت: ' + (setDescResult?.description || 'خطأ غير معروف') }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update bot name in database
      await supabaseAdmin
        .from('telegram_bots')
        .update({ bot_name: newBotName })
        .eq('assigned_company_id', companyId);

      return new Response(
        JSON.stringify({ success: true, message: 'تم تحديث اسم البوت بنجاح', bot_name: newBotName }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'set_webhook') {
      if (!company.telegram_bot_username) {
        return new Response(
          JSON.stringify({ error: 'Bot username not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const webhookUrl = `${supabaseUrl}/functions/v1/telegram-webhook?bot=${company.telegram_bot_username}`;

      const setWebhookResponse = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query']
        })
      });

      const setWebhookResult = await setWebhookResponse.json();
      console.log('Set webhook result:', setWebhookResult);

      if (!setWebhookResult?.ok) {
        return new Response(
          JSON.stringify({ error: 'فشل في إعداد الـ Webhook: ' + (setWebhookResult?.description || 'خطأ غير معروف') }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'تم إعداد الـ Webhook بنجاح' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'update_photo') {
      if (!photoFile) {
        return new Response(
          JSON.stringify({ error: 'لم يتم إرسال صورة' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create FormData for Telegram API
      const telegramFormData = new FormData();
      telegramFormData.append('photo', photoFile);

      const setPhotoResponse = await fetch(`https://api.telegram.org/bot${botToken}/setMyProfilePhoto`, {
        method: 'POST',
        body: telegramFormData
      });

      const setPhotoResult = await setPhotoResponse.json();
      console.log('Set bot photo result:', setPhotoResult);

      if (!setPhotoResult.ok) {
        return new Response(
          JSON.stringify({ error: 'فشل في تحديث صورة البوت: ' + (setPhotoResult.description || 'خطأ غير معروف') }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'تم تحديث صورة البوت بنجاح' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in update-telegram-bot:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
