import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Company {
  id: string;
  name: string;
  rewards_enabled: boolean;
  telegram_bot_username: string | null;
}

interface LeaderboardEntry {
  employee_id: string;
  total_points: number;
  employee: {
    full_name: string;
    telegram_chat_id: string | null;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting daily leaderboard message job...');

    // Get all companies with rewards enabled and Telegram bot connected
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, rewards_enabled, telegram_bot_username')
      .eq('rewards_enabled', true)
      .eq('telegram_bot_connected', true)
      .eq('is_deleted', false)
      .eq('is_suspended', false);

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

        // Get current month for leaderboard period
        const now = new Date();
        const monthPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        // Also check previous month in case no data yet for current month
        const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
        const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const prevMonthPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

        // First try current month
        let { data: leaderboard, error: leaderboardError } = await supabase
          .from('rewards_leaderboard')
          .select(`
            employee_id,
            total_points,
            rank,
            employee:employees!inner(full_name, telegram_chat_id)
          `)
          .eq('company_id', company.id)
          .eq('period_type', 'monthly')
          .eq('period_value', monthPeriod)
          .order('rank', { ascending: true })
          .limit(3);

        // If no data for current month, try previous month
        if ((!leaderboard || leaderboard.length === 0) && !leaderboardError) {
          const prevResult = await supabase
            .from('rewards_leaderboard')
            .select(`
              employee_id,
              total_points,
              rank,
              employee:employees!inner(full_name, telegram_chat_id)
            `)
            .eq('company_id', company.id)
            .eq('period_type', 'monthly')
            .eq('period_value', prevMonthPeriod)
            .order('rank', { ascending: true })
            .limit(3);
          
          leaderboard = prevResult.data;
          leaderboardError = prevResult.error;
        }

        if (leaderboardError) {
          console.error(`Error fetching leaderboard for company ${company.id}:`, leaderboardError);
          continue;
        }

        if (!leaderboard || leaderboard.length === 0) {
          console.log(`No leaderboard data for company ${company.id}`);
          continue;
        }

        // Get random motivational message
        const { data: messages } = await supabase
          .from('motivational_messages')
          .select('message_ar')
          .eq('message_type', 'leaderboard')
          .eq('is_active', true)
          .or(`company_id.is.null,company_id.eq.${company.id}`);

        const randomMessage = messages && messages.length > 0
          ? messages[Math.floor(Math.random() * messages.length)].message_ar
          : '🔥 المنافسة مستمرة!';

        // Build the leaderboard message
        const medals = ['🥇', '🥈', '🥉'];
        let messageText = `🌅 *صباح الخير!*\n\n${randomMessage}\n\n`;
        messageText += `📊 *ترتيب المتصدرين هذا الشهر:*\n\n`;

        leaderboard.forEach((entry: any, index: number) => {
          const medal = medals[index] || `${index + 1}.`;
          const name = entry.employee?.full_name || 'موظف';
          const points = entry.total_points || 0;
          messageText += `${medal} *${name}*\n`;
          messageText += `   └ ${points.toLocaleString()} نقطة\n\n`;
        });

        messageText += `\n💪 *استمر في التميز وكن من المتصدرين!*`;

        // Get all employees with telegram to send the message
        const { data: employees } = await supabase
          .from('employees')
          .select('telegram_chat_id')
          .eq('company_id', company.id)
          .eq('is_active', true)
          .not('telegram_chat_id', 'is', null);

        if (!employees || employees.length === 0) {
          console.log(`No employees with Telegram for company ${company.id}`);
          continue;
        }

        // Send message to all employees
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
              sentCount++;
            }
          } catch (e) {
            console.error(`Error sending to ${emp.telegram_chat_id}:`, e);
          }
        }

        results.push({
          company_id: company.id,
          company_name: company.name,
          employees_notified: sentCount,
          leaderboard_size: leaderboard.length
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
