import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractRetryAfterSeconds(result: any): number | null {
  const seconds = result?.parameters?.retry_after;
  if (typeof seconds === 'number' && Number.isFinite(seconds)) return seconds;

  const desc = typeof result?.description === 'string' ? result.description : '';
  const m = desc.match(/retry after (\d+)/i);
  return m ? Number(m[1]) : null;
}

function formatRetryAfterHint(seconds: number | null): string {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return ` (جرّب بعد حوالي ${hours} س ${minutes} د)`;
  if (minutes > 0) return ` (جرّب بعد حوالي ${minutes} دقيقة)`;
  return ` (جرّب بعد ${seconds} ثانية)`;
}

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

    // Check if user is a Super Admin (SaaS team member)
    const { data: saasTeamMember } = await supabaseAdmin
      .from('saas_team')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    const isSuperAdmin = !!saasTeamMember;

    // Get company_id from request body for Super Admin, otherwise use profile
    let companyId: string | null = null;

    // First, peek at the request to get company_id if Super Admin
    const clonedReq = req.clone();
    const reqContentType = req.headers.get('content-type') || '';
    
    if (isSuperAdmin) {
      try {
        if (reqContentType.includes('multipart/form-data')) {
          const formData = await clonedReq.formData();
          companyId = (formData.get('company_id') as string) || null;
        } else {
          const bodyText = await clonedReq.text();
          if (bodyText) {
            const body = JSON.parse(bodyText);
            companyId = body?.company_id || null;
          }
        }
      } catch (e) {
        console.log('Could not parse company_id from request');
      }
    }

    // If not Super Admin or no company_id provided, use user's profile
    if (!companyId) {
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
      companyId = profile.company_id;
    }

    console.log('Processing request for company:', companyId, 'isSuperAdmin:', isSuperAdmin);

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

    // Get bot token and webhook secret
    const { data: bot } = await supabaseAdmin
      .from('telegram_bots')
      .select('bot_token, webhook_secret')
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
    console.log('Request content-type:', contentType);

    // Check if it's multipart/form-data (for photo upload)
    if (contentType.includes('multipart/form-data')) {
      try {
        const formData = await req.formData();
        action = (formData.get('action') as string) || null;
        photoFile = (formData.get('photo') as File) || null;
        console.log('Parsed FormData - action:', action);
      } catch (error) {
        console.error('Failed to parse FormData:', error);
        return new Response(
          JSON.stringify({ error: 'تعذر قراءة بيانات الطلب. حاول مرة أخرى.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Try JSON parsing
      try {
        const bodyText = await req.text();
        console.log('Request body text:', bodyText);
        
        if (bodyText) {
          const body = JSON.parse(bodyText);
          action = typeof body?.action === 'string' ? body.action : null;
          console.log('Parsed JSON - action:', action);
        }
      } catch (error) {
        console.error('Failed to parse JSON:', error);
        return new Response(
          JSON.stringify({ error: 'تعذر قراءة بيانات الطلب. حاول مرة أخرى.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
        const retryAfterSeconds = extractRetryAfterSeconds(setNameResult);
        const hint = formatRetryAfterHint(retryAfterSeconds);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'فشل في تحديث اسم البوت: ' + (setNameResult?.description || 'خطأ غير معروف') + hint,
            retry_after_seconds: retryAfterSeconds,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        const retryAfterSeconds = extractRetryAfterSeconds(setDescResult);
        const hint = formatRetryAfterHint(retryAfterSeconds);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'فشل في تحديث وصف البوت: ' + (setDescResult?.description || 'خطأ غير معروف') + hint,
            retry_after_seconds: retryAfterSeconds,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

      // Generate new webhook secret if not exists
      let webhookSecret = bot.webhook_secret;
      if (!webhookSecret) {
        webhookSecret = crypto.randomUUID();
        // Save the new secret to database
        await supabaseAdmin
          .from('telegram_bots')
          .update({ webhook_secret: webhookSecret })
          .eq('assigned_company_id', companyId);
        console.log('Generated new webhook secret for bot');
      }

      const webhookUrl = `${supabaseUrl}/functions/v1/telegram-webhook?bot=${company.telegram_bot_username}`;

      // SECURITY: Include secret_token so Telegram sends it in X-Telegram-Bot-Api-Secret-Token header
      const setWebhookResponse = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query'],
          secret_token: webhookSecret  // CRITICAL: This ensures Telegram sends the secret with each request
        })
      });

      const setWebhookResult = await setWebhookResponse.json();
      console.log('Set webhook result:', setWebhookResult);

      if (!setWebhookResult?.ok) {
        const retryAfterSeconds = extractRetryAfterSeconds(setWebhookResult);
        const hint = formatRetryAfterHint(retryAfterSeconds);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'فشل في إعداد الـ Webhook: ' + (setWebhookResult?.description || 'خطأ غير معروف') + hint,
            retry_after_seconds: retryAfterSeconds,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        const retryAfterSeconds = extractRetryAfterSeconds(setPhotoResult);
        const hint = formatRetryAfterHint(retryAfterSeconds);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'فشل في تحديث صورة البوت: ' + (setPhotoResult.description || 'خطأ غير معروف') + hint,
            retry_after_seconds: retryAfterSeconds,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
