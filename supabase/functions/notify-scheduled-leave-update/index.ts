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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { scheduled_leave_id, action, old_data } = await req.json();

    if (!scheduled_leave_id || !action) {
      return new Response(
        JSON.stringify({ error: 'scheduled_leave_id and action are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the scheduled leave details (for update action, or use old_data for delete)
    let leaveData = old_data;
    
    if (action === 'update') {
      const { data: leave, error: leaveError } = await supabase
        .from('scheduled_leaves')
        .select('*')
        .eq('id', scheduled_leave_id)
        .single();

      if (leaveError || !leave) {
        console.error('Error fetching scheduled leave:', leaveError);
        return new Response(
          JSON.stringify({ error: 'Scheduled leave not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      leaveData = leave;
    }

    if (!leaveData) {
      return new Response(
        JSON.stringify({ error: 'Leave data not provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the company's bot token
    const { data: bot, error: botError } = await supabase
      .from('telegram_bots')
      .select('bot_token')
      .eq('assigned_company_id', leaveData.company_id)
      .single();

    if (botError || !bot) {
      console.log('No Telegram bot found for company');
      return new Response(
        JSON.stringify({ success: true, message: 'No bot configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get employees to notify based on target type
    let employeesToNotify: { telegram_chat_id: string; full_name: string }[] = [];

    if (leaveData.target_type === 'company') {
      // Notify all employees with telegram
      const { data: employees } = await supabase
        .from('employees')
        .select('telegram_chat_id, full_name')
        .eq('company_id', leaveData.company_id)
        .eq('is_active', true)
        .not('telegram_chat_id', 'is', null);

      employeesToNotify = employees || [];
    } else if (leaveData.target_type === 'position') {
      // Notify employees in that position
      const { data: employees } = await supabase
        .from('employees')
        .select('telegram_chat_id, full_name')
        .eq('company_id', leaveData.company_id)
        .eq('position_id', leaveData.target_id)
        .eq('is_active', true)
        .not('telegram_chat_id', 'is', null);

      employeesToNotify = employees || [];
    } else if (leaveData.target_type === 'employee') {
      // Notify specific employee
      const { data: employee } = await supabase
        .from('employees')
        .select('telegram_chat_id, full_name')
        .eq('id', leaveData.target_id)
        .single();

      if (employee?.telegram_chat_id) {
        employeesToNotify = [employee];
      }
    }

    console.log(`Notifying ${employeesToNotify.length} employees about leave ${action}`);

    // Format dates
    const startDate = new Date(leaveData.leave_date).toLocaleDateString('ar-EG');
    const endDate = leaveData.end_date ? new Date(leaveData.end_date).toLocaleDateString('ar-EG') : startDate;

    // Build message based on action
    let emoji = action === 'update' ? '✏️' : '❌';
    let actionText = action === 'update' ? 'تم تحديث الإجازة' : 'تم إلغاء الإجازة';

    for (const employee of employeesToNotify) {
      const message = `${emoji} *${actionText}*

📋 *${leaveData.leave_name}*

📅 التاريخ: ${startDate}${endDate !== startDate ? ` - ${endDate}` : ''}

${leaveData.reason ? `📝 السبب: ${leaveData.reason}` : ''}`;

      try {
        const response = await fetch(`https://api.telegram.org/bot${bot.bot_token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: employee.telegram_chat_id,
            text: message,
            parse_mode: 'Markdown',
          }),
        });

        if (!response.ok) {
          console.error(`Failed to send to ${employee.full_name}:`, await response.text());
        }
      } catch (error) {
        console.error(`Error sending to ${employee.full_name}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified_count: employeesToNotify.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
