import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { holidayId, isCancellation = false } = await req.json();

    if (!holidayId) {
      return new Response(
        JSON.stringify({ error: 'Holiday ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the approved holiday details
    const { data: holiday, error: holidayError } = await supabase
      .from('approved_holidays')
      .select('*')
      .eq('id', holidayId)
      .single();

    if (holidayError || !holiday) {
      console.error('Error fetching holiday:', holidayError);
      return new Response(
        JSON.stringify({ error: 'Holiday not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the company's telegram bot
    const { data: bot, error: botError } = await supabase
      .from('telegram_bots')
      .select('bot_token')
      .eq('assigned_company_id', holiday.company_id)
      .single();

    if (botError || !bot?.bot_token) {
      console.error('No telegram bot found for company');
      return new Response(
        JSON.stringify({ error: 'No telegram bot configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all active employees with telegram chat IDs
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, full_name, telegram_chat_id, company_id')
      .eq('company_id', holiday.company_id)
      .eq('is_active', true)
      .not('telegram_chat_id', 'is', null);

    if (empError) {
      console.error('Error fetching employees:', empError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch employees' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const botToken = bot.bot_token;
    const holidayDate = new Date(holiday.holiday_date);
    const formattedDate = holidayDate.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const daysText = holiday.days_count === 1 ? 'يوم واحد' : `${holiday.days_count} أيام`;

    // Send notification to each employee
    let successCount = 0;
    let failCount = 0;

    for (const employee of employees || []) {
      if (!employee.telegram_chat_id) continue;

      const message = isCancellation
        ? `⚠️ <b>إلغاء إجازة رسمية</b>\n\n` +
          `مرحباً ${employee.full_name}،\n\n` +
          `نود إبلاغكم بأنه تم إلغاء الإجازة الرسمية:\n` +
          `🏷️ <b>${holiday.holiday_name_local || holiday.holiday_name}</b>\n\n` +
          `📅 التاريخ: ${formattedDate}\n\n` +
          `يرجى العلم بأن هذا اليوم سيكون يوم عمل عادي.`
        : `🎉 <b>تهنئة بمناسبة إجازة رسمية!</b>\n\n` +
          `مرحباً ${employee.full_name}،\n\n` +
          `نتقدم إليكم بأطيب التهاني بمناسبة:\n` +
          `🏷️ <b>${holiday.holiday_name_local || holiday.holiday_name}</b>\n\n` +
          `📅 التاريخ: ${formattedDate}\n` +
          `⏰ المدة: ${daysText}\n\n` +
          `كل عام وأنتم بخير! 🌟`;

      try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: employee.telegram_chat_id,
            text: message,
            parse_mode: 'HTML',
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const telegramMessageId = result.result?.message_id;
          
          // Log the message
          try {
            await supabase.from('telegram_messages').insert({
              company_id: employee.company_id,
              employee_id: employee.id,
              telegram_chat_id: employee.telegram_chat_id,
              message_text: message.replace(/<[^>]*>/g, ''), // Strip HTML
              direction: 'outgoing',
              message_type: 'notification',
              telegram_message_id: telegramMessageId,
              metadata: { source: 'notify-holiday-approval', holiday_id: holidayId }
            });
          } catch (logError) {
            console.error('Failed to log message:', logError);
          }
          
          successCount++;
        } else {
          failCount++;
          console.error(`Failed to send to ${employee.full_name}`);
        }
      } catch (error) {
        failCount++;
        console.error(`Error sending to ${employee.full_name}:`, error);
      }
    }

    // Update holiday as notified
    await supabase
      .from('approved_holidays')
      .update({
        notified_employees: true,
        notified_at: new Date().toISOString(),
      })
      .eq('id', holidayId);

    console.log(`Holiday notification sent: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified: successCount,
        failed: failCount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in notify-holiday-approval:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
