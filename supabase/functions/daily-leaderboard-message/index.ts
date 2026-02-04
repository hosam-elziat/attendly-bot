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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if specific company_id is provided for testing
    let targetCompanyId: string | null = null;
    try {
      const body = await req.json();
      targetCompanyId = body.company_id || null;
    } catch {
      // No body or invalid JSON
    }

    console.log('Starting daily leaderboard message job...', targetCompanyId ? `for company ${targetCompanyId}` : 'for all companies');

    // Build query for companies
    let companiesQuery = supabase
      .from('companies')
      .select('id, name, rewards_enabled, telegram_bot_username')
      .eq('rewards_enabled', true)
      .eq('telegram_bot_connected', true)
      .eq('is_deleted', false)
      .eq('is_suspended', false);

    if (targetCompanyId) {
      companiesQuery = companiesQuery.eq('id', targetCompanyId);
    }

    const { data: companies, error: companiesError } = await companiesQuery;

    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
      throw companiesError;
    }

    console.log(`Found ${companies?.length || 0} companies with rewards enabled`);

    const results = [];

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
          continue;
        }

        // Get top 3 employees by total points from wallets directly
        const { data: topEmployees, error: walletsError } = await supabase
          .from('employee_wallets')
          .select(`
            employee_id,
            total_points,
            earned_points,
            employee:employees!inner(id, full_name, telegram_chat_id, is_active)
          `)
          .eq('company_id', company.id)
          .eq('employees.is_active', true)
          .gt('total_points', 0)
          .order('total_points', { ascending: false })
          .limit(3);

        if (walletsError) {
          console.error(`Error fetching wallets for company ${company.id}:`, walletsError);
          continue;
        }

        if (!topEmployees || topEmployees.length === 0) {
          console.log(`No employees with points for company ${company.id}`);
          continue;
        }

        // Get random motivational message in Egyptian Arabic
        const { data: messages } = await supabase
          .from('motivational_messages')
          .select('message_ar')
          .eq('message_type', 'leaderboard')
          .eq('is_active', true)
          .or(`company_id.is.null,company_id.eq.${company.id}`);

        const egyptianMotivations = [
          '🔥 المنافسة ولعت يا جماعة!',
          '💪 شد حيلك وخش المنافسة!',
          '🚀 مين هيبقى رقم واحد النهارده؟',
          '⭐ الشطار بيجمعوا نقط!',
          '🏆 المركز الأول مستنيك!',
        ];

        const randomMessage = messages && messages.length > 0
          ? messages[Math.floor(Math.random() * messages.length)].message_ar
          : egyptianMotivations[Math.floor(Math.random() * egyptianMotivations.length)];

        // Build the leaderboard message in Egyptian Arabic
        const medals = ['🥇', '🥈', '🥉'];
        let messageText = `🌅 *صباح الفل يا أبطال!*\n\n${randomMessage}\n\n`;
        messageText += `📊 *أعلى ٣ في النقط:*\n\n`;

        topEmployees.forEach((entry: any, index: number) => {
          const medal = medals[index] || `${index + 1}.`;
          const name = entry.employee?.full_name || 'موظف';
          const points = entry.total_points || 0;
          messageText += `${medal} *${name}*\n`;
          messageText += `   └ عنده ${points.toLocaleString()} نقطة\n\n`;
        });

        messageText += `\n💪 *كمّل شغل وخد نقط أكتر!*`;

        // Get all employees with telegram to send the message
        const { data: employees } = await supabase
          .from('employees')
          .select('id, telegram_chat_id')
          .eq('company_id', company.id)
          .eq('is_active', true)
          .not('telegram_chat_id', 'is', null);

        if (!employees || employees.length === 0) {
          console.log(`No employees with Telegram for company ${company.id}`);
          continue;
        }

        // Send message to all employees and log to telegram_messages
        let sentCount = 0;
        for (const emp of employees) {
          try {
            const response = await fetch(`https://api.telegram.org/bot${botData.bot_token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: emp.telegram_chat_id,
                text: messageText,
                parse_mode: 'Markdown'
              })
            });

            if (response.ok) {
              const result = await response.json();
              sentCount++;

              // Log the outgoing message to telegram_messages table
              await supabase
                .from('telegram_messages')
                .insert({
                  company_id: company.id,
                  employee_id: emp.id,
                  telegram_chat_id: emp.telegram_chat_id,
                  message_text: messageText.replace(/\*/g, ''), // Remove markdown for storage
                  direction: 'outgoing',
                  message_type: 'leaderboard',
                  telegram_message_id: result.result?.message_id || null,
                  metadata: {
                    source: 'daily-leaderboard-message',
                    top_employees: topEmployees.map((e: any) => ({
                      name: e.employee?.full_name,
                      points: e.total_points
                    }))
                  }
                });
            }
          } catch (e) {
            console.error(`Error sending to ${emp.telegram_chat_id}:`, e);
          }
        }

        results.push({
          company_id: company.id,
          company_name: company.name,
          employees_notified: sentCount,
          top_employees_count: topEmployees.length
        });

        console.log(`Sent leaderboard to ${sentCount} employees in company ${company.name}`);

      } catch (companyError) {
        console.error(`Error processing company ${company.id}:`, companyError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in daily leaderboard message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
