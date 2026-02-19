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
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Get all companies with telegram bots
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, owner_id, country_code, join_request_reviewer_type, join_request_reviewer_id')
      .eq('telegram_bot_connected', true);

    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
      throw companiesError;
    }

    let processedCount = 0;

    for (const company of companies || []) {
      if (!company.country_code) continue;

      // Fetch public holidays for this company's country
      const holidaysResponse = await fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${currentYear}/${company.country_code}`
      );

      if (!holidaysResponse.ok) {
        console.log(`No holidays for country: ${company.country_code}`);
        continue;
      }

      const allHolidays = await holidaysResponse.json();

      // Filter for current month holidays
      const monthHolidays = allHolidays.filter((h: any) => {
        const holidayDate = new Date(h.date);
        return holidayDate.getMonth() === currentMonth;
      });

      if (monthHolidays.length === 0) {
        console.log(`No holidays this month for company: ${company.name}`);
        continue;
      }

      // Insert holidays into approved_holidays table (if not exists)
      for (const holiday of monthHolidays) {
        await supabase
          .from('approved_holidays')
          .upsert({
            company_id: company.id,
            holiday_date: holiday.date,
            holiday_name: holiday.name,
            holiday_name_local: holiday.localName,
            year: currentYear,
            month: currentMonth,
            is_approved: false,
            days_count: 1,
          }, {
            onConflict: 'company_id,holiday_date,year',
            ignoreDuplicates: true,
          });
      }

      // Get company's telegram bot
      const { data: bot } = await supabase
        .from('telegram_bots')
        .select('bot_token')
        .eq('assigned_company_id', company.id)
        .single();

      if (!bot?.bot_token) continue;

      // Determine who should receive the approval request
      let reviewerChatId: string | null = null;
      let reviewerData: any = null;

      if (company.join_request_reviewer_type === 'specific_employee' && company.join_request_reviewer_id) {
        // Get specific reviewer's telegram chat ID and id
        const { data: reviewer } = await supabase
          .from('employees')
          .select('id, telegram_chat_id, company_id')
          .eq('id', company.join_request_reviewer_id)
          .single();
        
        reviewerChatId = reviewer?.telegram_chat_id;
        reviewerData = reviewer;
      } else {
        // Send to owner (get from profiles)
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', company.owner_id)
          .single();

        if (ownerProfile) {
          // Try to find owner's employee record
          const { data: ownerEmployee } = await supabase
            .from('employees')
            .select('id, telegram_chat_id, company_id')
            .eq('user_id', company.owner_id)
            .eq('company_id', company.id)
            .single();

          reviewerChatId = ownerEmployee?.telegram_chat_id;
          reviewerData = ownerEmployee;
        }
      }

      if (!reviewerChatId) {
        console.log(`No reviewer found for company: ${company.name}`);
        continue;
      }

      // Build holiday list message
      const holidaysList = monthHolidays.map((h: any, index: number) => {
        const date = new Date(h.date).toLocaleDateString('ar-EG', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        });
        return `${index + 1}. 📅 <b>${h.localName || h.name}</b>\n   ${date}`;
      }).join('\n\n');

      const message = 
        `🗓️ <b>الإجازات الرسمية للشهر الجديد</b>\n\n` +
        `مرحباً،\n` +
        `هذه قائمة الإجازات الرسمية لهذا الشهر:\n\n` +
        `${holidaysList}\n\n` +
        `⚠️ يرجى الدخول إلى لوحة التحكم لاعتماد الإجازات التي تريد تطبيقها على الموظفين.\n\n` +
        `عند الاعتماد، سيتم:\n` +
        `✅ إشعار جميع الموظفين بالتهنئة\n` +
        `✅ تطبيق الإجازة على نظام الحضور`;

      // Send message to reviewer
      try {
        const res = await fetch(`https://api.telegram.org/bot${bot.bot_token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: reviewerChatId,
            text: message,
            parse_mode: 'HTML',
          }),
        });

        if (res.ok && reviewerData) {
          const result = await res.json();
          // Log to telegram_messages for chat history
          try {
            await supabase.from('telegram_messages').insert({
              company_id: reviewerData.company_id || company.id,
              employee_id: reviewerData.id,
              telegram_chat_id: reviewerChatId,
              message_text: message.replace(/<[^>]*>/g, ''),
              direction: 'outgoing',
              message_type: 'notification',
              telegram_message_id: result.result?.message_id || null,
              metadata: { source: 'send-monthly-holidays' }
            });
          } catch (logError) {
            console.error('Failed to log monthly holidays message:', logError);
          }
        }

        processedCount++;
      } catch (error) {
        console.error(`Failed to send to company ${company.name}:`, error);
      }
    }

    console.log(`Monthly holidays notification sent to ${processedCount} companies`);

    return new Response(
      JSON.stringify({ success: true, processed: processedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-monthly-holidays:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
