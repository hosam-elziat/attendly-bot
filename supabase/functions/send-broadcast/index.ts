import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BroadcastRequest {
  broadcast_id: string;
}

interface TargetFilter {
  plans?: string[];
  company_ids?: string[];
  employee_ids?: string[];
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

    const targetFilter = broadcast.target_filter as TargetFilter | null;
    let successCount = 0;
    let failCount = 0;
    let totalRecipients = 0;

    // Check if this is an employee-targeted broadcast
    if (broadcast.target_type === 'all_employees' || 
        broadcast.target_type === 'company_employees' || 
        broadcast.target_type === 'specific_employees') {
      
      // Send to employees
      const result = await sendToEmployees(supabase, broadcast, targetFilter, broadcast_id);
      successCount = result.successCount;
      failCount = result.failCount;
      totalRecipients = result.total;
      
    } else {
      // Send to business owners (original behavior)
      const result = await sendToBusinessOwners(supabase, broadcast, targetFilter, broadcast_id);
      successCount = result.successCount;
      failCount = result.failCount;
      totalRecipients = result.total;
    }

    // Update broadcast with final stats
    await supabase
      .from('admin_broadcasts')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        total_recipients: totalRecipients,
        successful_sends: successCount,
        failed_sends: failCount,
      })
      .eq('id', broadcast_id);

    return new Response(
      JSON.stringify({
        success: true,
        total: totalRecipients,
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

async function sendToBusinessOwners(
  supabase: any, 
  broadcast: any, 
  targetFilter: TargetFilter | null,
  broadcastId: string
) {
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
  if (broadcast.target_type === 'subscription' && targetFilter?.plans) {
    companiesQuery = companiesQuery.in('subscriptions.plan_name', targetFilter.plans);
  } else if (broadcast.target_type === 'custom' && targetFilter?.company_ids) {
    companiesQuery = companiesQuery.in('id', targetFilter.company_ids);
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
          broadcast_id: broadcastId,
          company_id: company.id,
          status: 'failed',
          error_message: 'No Telegram bot configured',
        });
        
        failCount++;
        continue;
      }

      // Get business owners from new table
      const { data: businessOwners } = await supabase
        .from('business_owners')
        .select('employee_id')
        .eq('company_id', company.id);

      // Fallback to legacy business_owner_id
      let ownerEmployeeIds: string[] = [];
      
      if (businessOwners && businessOwners.length > 0) {
        ownerEmployeeIds = businessOwners.map((bo: any) => bo.employee_id);
      } else if (company.business_owner_id) {
        const { data: legacyOwner } = await supabase
          .from('employees')
          .select('id')
          .eq('company_id', company.id)
          .eq('user_id', company.business_owner_id)
          .eq('is_active', true)
          .maybeSingle();
        
        if (legacyOwner) {
          ownerEmployeeIds = [legacyOwner.id];
        }
      }

      // Fallback: get first employee with telegram
      if (ownerEmployeeIds.length === 0) {
        const { data: anyEmployee } = await supabase
          .from('employees')
          .select('id')
          .eq('company_id', company.id)
          .eq('is_active', true)
          .not('telegram_chat_id', 'is', null)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (anyEmployee) {
          ownerEmployeeIds = [anyEmployee.id];
        }
      }

      if (ownerEmployeeIds.length === 0) {
        console.log(`No business owner with Telegram for company ${company.id}`);
        
        await supabase.from('broadcast_deliveries').insert({
          broadcast_id: broadcastId,
          company_id: company.id,
          status: 'failed',
          error_message: 'Business owner has no Telegram connected',
        });
        
        failCount++;
        continue;
      }

      // Send to all business owners
      for (const employeeId of ownerEmployeeIds) {
        const { data: employee } = await supabase
          .from('employees')
          .select('telegram_chat_id')
          .eq('id', employeeId)
          .single();

        if (!employee?.telegram_chat_id) continue;

        const messageSent = await sendTelegramMessage(
          botData.bot_token,
          employee.telegram_chat_id,
          broadcast
        );

        if (messageSent) {
          await supabase.from('broadcast_deliveries').insert({
            broadcast_id: broadcastId,
            company_id: company.id,
            employee_id: employeeId,
            telegram_chat_id: employee.telegram_chat_id,
            status: 'sent',
            sent_at: new Date().toISOString(),
          });

          // Log to telegram_messages for chat history
          try {
            await supabase.from('telegram_messages').insert({
              company_id: company.id,
              employee_id: employeeId,
              telegram_chat_id: employee.telegram_chat_id,
              message_text: broadcast.message_text?.replace(/\*/g, '') || '',
              direction: 'outgoing',
              message_type: 'broadcast',
              metadata: { source: 'send-broadcast', broadcast_id: broadcastId }
            });
          } catch (logError) {
            console.error('Failed to log broadcast message:', logError);
          }

          successCount++;
          console.log(`Sent broadcast to business owner in company ${company.name}`);
        } else {
          await supabase.from('broadcast_deliveries').insert({
            broadcast_id: broadcastId,
            company_id: company.id,
            employee_id: employeeId,
            telegram_chat_id: employee.telegram_chat_id,
            status: 'failed',
            error_message: 'Telegram API error',
          });
          failCount++;
        }
      }

    } catch (companyError) {
      console.error(`Error processing company ${company.id}:`, companyError);
      
      await supabase.from('broadcast_deliveries').insert({
        broadcast_id: broadcastId,
        company_id: company.id,
        status: 'failed',
        error_message: String(companyError),
      });
      
      failCount++;
    }
  }

  return { successCount, failCount, total: companies?.length || 0 };
}

async function sendToEmployees(
  supabase: any, 
  broadcast: any, 
  targetFilter: TargetFilter | null,
  broadcastId: string
) {
  let employeesQuery = supabase
    .from('employees')
    .select(`
      id,
      full_name,
      telegram_chat_id,
      company_id,
      company:companies!inner(id, name, is_deleted, is_suspended, telegram_bot_connected)
    `)
    .eq('is_active', true)
    .not('telegram_chat_id', 'is', null)
    .eq('company.is_deleted', false)
    .eq('company.is_suspended', false)
    .eq('company.telegram_bot_connected', true);

  // Apply filters
  if (broadcast.target_type === 'company_employees' && targetFilter?.company_ids?.length) {
    employeesQuery = employeesQuery.in('company_id', targetFilter.company_ids);
  } else if (broadcast.target_type === 'specific_employees' && targetFilter?.employee_ids?.length) {
    employeesQuery = employeesQuery.in('id', targetFilter.employee_ids);
  }

  const { data: employees, error: employeesError } = await employeesQuery;

  if (employeesError) {
    throw new Error(`Error fetching employees: ${employeesError.message}`);
  }

  console.log(`Found ${employees?.length || 0} target employees`);

  let successCount = 0;
  let failCount = 0;

  // Group employees by company to get bot tokens efficiently
  const employeesByCompany = new Map<string, any[]>();
  for (const emp of employees || []) {
    const companyId = emp.company_id;
    if (!employeesByCompany.has(companyId)) {
      employeesByCompany.set(companyId, []);
    }
    employeesByCompany.get(companyId)!.push(emp);
  }

  for (const [companyId, companyEmployees] of employeesByCompany) {
    try {
      // Get bot token for this company
      const { data: botData } = await supabase
        .from('telegram_bots')
        .select('bot_token')
        .eq('assigned_company_id', companyId)
        .single();

      if (!botData?.bot_token) {
        console.log(`No bot token for company ${companyId}`);
        
        for (const emp of companyEmployees) {
          await supabase.from('broadcast_deliveries').insert({
            broadcast_id: broadcastId,
            company_id: companyId,
            employee_id: emp.id,
            status: 'failed',
            error_message: 'No Telegram bot configured',
          });
          failCount++;
        }
        continue;
      }

      // Send to each employee
      for (const emp of companyEmployees) {
        const messageSent = await sendTelegramMessage(
          botData.bot_token,
          emp.telegram_chat_id,
          broadcast
        );

        if (messageSent) {
          await supabase.from('broadcast_deliveries').insert({
            broadcast_id: broadcastId,
            company_id: companyId,
            employee_id: emp.id,
            telegram_chat_id: emp.telegram_chat_id,
            status: 'sent',
            sent_at: new Date().toISOString(),
          });

          // Log to telegram_messages for chat history
          try {
            await supabase.from('telegram_messages').insert({
              company_id: companyId,
              employee_id: emp.id,
              telegram_chat_id: emp.telegram_chat_id,
              message_text: broadcast.message_text?.replace(/\*/g, '') || '',
              direction: 'outgoing',
              message_type: 'broadcast',
              metadata: { source: 'send-broadcast', broadcast_id: broadcastId }
            });
          } catch (logError) {
            console.error('Failed to log broadcast message:', logError);
          }

          successCount++;
          console.log(`Sent broadcast to employee ${emp.full_name}`);
        } else {
          await supabase.from('broadcast_deliveries').insert({
            broadcast_id: broadcastId,
            company_id: companyId,
            employee_id: emp.id,
            telegram_chat_id: emp.telegram_chat_id,
            status: 'failed',
            error_message: 'Telegram API error',
          });
          failCount++;
        }
      }

    } catch (error) {
      console.error(`Error processing company ${companyId}:`, error);
      
      for (const emp of companyEmployees) {
        await supabase.from('broadcast_deliveries').insert({
          broadcast_id: broadcastId,
          company_id: companyId,
          employee_id: emp.id,
          status: 'failed',
          error_message: String(error),
        });
        failCount++;
      }
    }
  }

  return { successCount, failCount, total: employees?.length || 0 };
}

async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  broadcast: any
): Promise<boolean> {
  try {
    let response: Response;

    // Send image if present
    if (broadcast.image_url) {
      response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: broadcast.image_url,
          caption: broadcast.message_text,
          parse_mode: 'Markdown'
        })
      });
    }
    // Send audio if present (without image)
    else if (broadcast.audio_url) {
      response = await fetch(`https://api.telegram.org/bot${botToken}/sendAudio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          audio: broadcast.audio_url,
          caption: broadcast.message_text,
          parse_mode: 'Markdown'
        })
      });
    }
    // Send text only
    else {
      response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: broadcast.message_text,
          parse_mode: 'Markdown'
        })
      });
    }

    return response.ok;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}
