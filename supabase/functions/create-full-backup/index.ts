import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BACKUP_TABLES = [
  'employees', 'attendance_logs', 'break_logs', 'salary_records', 'salary_adjustments',
  'leave_requests', 'positions', 'position_permissions', 'position_reports_to',
  'attendance_policies', 'join_requests', 'join_request_reviewers', 'pending_attendance',
  'deleted_records', 'employee_location_history', 'audit_logs'
];

const COMPANY_FIELDS = [
  'id', 'name', 'owner_id', 'work_start_time', 'work_end_time', 'break_duration_minutes',
  'timezone', 'country_code', 'default_currency', 'default_weekend_days', 'annual_leave_days',
  'emergency_leave_days', 'attendance_verification_level', 'late_under_15_deduction',
  'late_15_to_30_deduction', 'late_over_30_deduction', 'absence_without_permission_deduction',
  'overtime_multiplier', 'daily_late_allowance_minutes', 'monthly_late_allowance_minutes',
  'max_excused_absence_days', 'telegram_bot_connected', 'telegram_bot_username',
  'company_latitude', 'company_longitude', 'location_radius_meters',
  'attendance_approver_id', 'attendance_approver_type', 'join_request_reviewer_id',
  'join_request_reviewer_type', 'level3_verification_mode'
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { created_by }: { created_by?: string } = await req.json();

    console.log('Starting full system backup...');

    // Get all companies with their settings
    const { data: companiesData, error: companiesError } = await supabase
      .from('companies')
      .select(COMPANY_FIELDS.join(', '));
    
    if (companiesError) throw companiesError;
    
    const companies = (companiesData || []) as unknown as Record<string, unknown>[];

    const fullBackup: Record<string, unknown> = {
      backup_info: {
        version: '2.0',
        backup_type: 'full_system',
        backup_date: new Date().toISOString(),
        total_companies: companies.length,
        total_records: 0,
        companies_summary: [] as { id: string; name: string; records: number }[]
      },
      companies: companies,
      data: {} as Record<string, Record<string, unknown[]>>
    };

    let totalRecords = 0;
    const backupData = fullBackup.data as Record<string, Record<string, unknown[]>>;
    const backupInfo = fullBackup.backup_info as { total_records: number; companies_summary: { id: string; name: string; records: number }[] };

    // For each company, backup all their data
    for (const company of companies) {
      const companyId = company.id as string;
      const companyName = company.name as string;
      const companyData: Record<string, unknown[]> = {};
      let companyRecords = 0;

      for (const tableName of BACKUP_TABLES) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('company_id', companyId);
        
        if (!error && data) {
          companyData[tableName] = data;
          companyRecords += data.length;
        } else {
          companyData[tableName] = [];
        }
      }

      // Also get subscriptions for this company
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();
      
      if (subscription) {
        companyData['subscription'] = [subscription];
      }

      backupData[companyId] = companyData;
      totalRecords += companyRecords;
      
      backupInfo.companies_summary.push({
        id: companyId,
        name: companyName,
        records: companyRecords
      });

      console.log(`Backed up company ${companyName}: ${companyRecords} records`);
    }

    backupInfo.total_records = totalRecords;

    // Also backup global tables (subscription_plans, telegram_bots, saas_team, discount_codes)
    const globalTables = ['subscription_plans', 'telegram_bots', 'saas_team', 'discount_codes', 'backup_email_recipients'];
    const globalData: Record<string, unknown[]> = {};
    
    for (const tableName of globalTables) {
      const { data } = await supabase.from(tableName).select('*');
      globalData[tableName] = data || [];
    }
    
    (fullBackup as Record<string, unknown>).global_data = globalData;

    const backupSize = new Blob([JSON.stringify(fullBackup)]).size;

    // Save backup record
    const { data: backupRecord, error: insertError } = await supabase.from('backups').insert({
      company_id: null, // null means full system backup
      backup_type: 'full_system',
      backup_data: fullBackup,
      tables_included: [...BACKUP_TABLES, 'companies', 'subscriptions', ...globalTables],
      size_bytes: backupSize,
      status: 'completed',
      created_by,
      notes: `Full system backup: ${companies?.length || 0} companies, ${totalRecords} records`
    }).select().single();

    if (insertError) throw insertError;

    console.log(`Full system backup completed: ${backupSize} bytes`);

    return new Response(JSON.stringify({ 
      success: true, 
      backup_id: backupRecord.id,
      total_companies: companies?.length || 0,
      total_records: totalRecords,
      size_bytes: backupSize
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  } catch (error: unknown) {
    console.error('Full backup error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown' }), { 
      status: 500, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  }
});
