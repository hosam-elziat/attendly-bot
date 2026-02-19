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

    const { goal_id, company_id } = await req.json();

    if (!goal_id || !company_id) {
      throw new Error('goal_id and company_id are required');
    }

    console.log(`Announcing goal ${goal_id} for company ${company_id}`);

    // Get the goal details
    const { data: goal, error: goalError } = await supabase
      .from('reward_goals')
      .select('*')
      .eq('id', goal_id)
      .single();

    if (goalError || !goal) {
      throw new Error('Goal not found');
    }

    // Get bot token
    const { data: botData } = await supabase
      .from('telegram_bots')
      .select('bot_token')
      .eq('assigned_company_id', company_id)
      .single();

    if (!botData?.bot_token) {
      throw new Error('No bot token found');
    }

    // Get all active employees with Telegram
    const { data: employees } = await supabase
      .from('employees')
      .select('id, telegram_chat_id')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .not('telegram_chat_id', 'is', null);

    if (!employees || employees.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No employees to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build announcement message
    const getDurationLabel = (duration: string) => {
      const labels: Record<string, string> = {
        daily: 'يومي',
        weekly: 'أسبوعي',
        monthly: 'شهري',
        custom: 'مخصص',
      };
      return labels[duration] || duration;
    };

    const getGoalTypeEmoji = (type: string) => {
      return type === 'first_to_reach' ? '👑' : '🎯';
    };

    const getRewardText = () => {
      if (goal.reward_type === 'points') {
        return `🎁 المكافأة: ${goal.reward_points?.toLocaleString() || 0} نقطة`;
      }
      if (goal.reward_type === 'item') {
        return `🎁 المكافأة: منتج من السوق`;
      }
      return `🎁 المكافأة: ${goal.reward_description_ar || goal.reward_description || 'مفاجأة'}`;
    };

    let messageText = `\n🚀 *تحدي جديد!* 🚀\n\n`;
    messageText += `${getGoalTypeEmoji(goal.goal_type)} *${goal.name_ar || goal.name}*\n\n`;
    
    if (goal.description_ar || goal.description) {
      messageText += `📝 ${goal.description_ar || goal.description}\n\n`;
    }

    messageText += `🎯 الهدف: تحقيق *${goal.points_threshold.toLocaleString()}* نقطة\n`;
    messageText += `⏱ المدة: ${getDurationLabel(goal.duration_type)}\n`;
    messageText += `${getRewardText()}\n\n`;

    if (goal.goal_type === 'first_to_reach') {
      messageText += `⚡ *أول من يحقق الهدف يفوز!*\n`;
    } else {
      messageText += `✨ *كل من يحقق الهدف يحصل على المكافأة!*\n`;
    }

    messageText += `\n💪 *ابدأ الآن وكن من الفائزين!*`;

    // Send to all employees
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

          // Log to telegram_messages for chat history
          try {
            await supabase.from('telegram_messages').insert({
              company_id: company_id,
              employee_id: emp.id,
              telegram_chat_id: emp.telegram_chat_id,
              message_text: messageText.replace(/\*/g, ''),
              direction: 'outgoing',
              message_type: 'goal_announcement',
              telegram_message_id: result.result?.message_id || null,
              metadata: { source: 'announce-goal', goal_id }
            });
          } catch (logError) {
            console.error('Failed to log goal message:', logError);
          }
        }
      } catch (e) {
        console.error(`Error sending to ${emp.telegram_chat_id}:`, e);
      }
    }

    console.log(`Announced goal to ${sentCount} employees`);

    return new Response(
      JSON.stringify({ success: true, employees_notified: sentCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error announcing goal:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
