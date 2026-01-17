import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLE_ORDER = [
  'positions', 'position_permissions', 'position_reports_to', 'employees', 
  'attendance_policies', 'attendance_logs', 'break_logs', 'salary_records', 
  'salary_adjustments', 'leave_requests', 'join_requests', 'join_request_reviewers', 
  'pending_attendance', 'deleted_records', 'employee_location_history', 'audit_logs'
];

interface RestoreRequest { 
  backup_id?: string; 
  backup_data?: { 
    data?: Record<string, unknown[]>; 
    backup_info?: { 
      company_id?: string; 
      company_name?: string;
      company_settings?: Record<string, unknown>;
    }; 
  }; 
  company_id?: string; 
  tables_to_restore?: string[]; 
  restored_by?: string;
  create_company_if_missing?: boolean;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { 
      backup_id, 
      backup_data, 
      company_id: requestCompanyId, 
      tables_to_restore, 
      restored_by,
      create_company_if_missing = true 
    }: RestoreRequest = await req.json();

    let backupDataToRestore: RestoreRequest['backup_data'];
    let targetCompanyId = requestCompanyId;

    // Get backup data from database or use provided data
    if (backup_id) {
      const { data: backup, error } = await supabase.from('backups').select('backup_data, company_id').eq('id', backup_id).single();
      if (error) throw error;
      backupDataToRestore = backup.backup_data as typeof backupDataToRestore;
      targetCompanyId = targetCompanyId || backup.company_id;
      await supabase.from('backups').update({ status: 'restoring' }).eq('id', backup_id);
    } else if (backup_data) {
      backupDataToRestore = backup_data;
      // Use company_id from backup_info if not provided in request
      targetCompanyId = targetCompanyId || backupDataToRestore?.backup_info?.company_id;
    } else {
      throw new Error('Either backup_id or backup_data required');
    }

    if (!backupDataToRestore?.data) throw new Error('Invalid backup data');
    if (!targetCompanyId) throw new Error('Company ID is required');

    console.log(`Starting restore for company: ${targetCompanyId}`);

    // Check if company exists
    const { data: existingCompany, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', targetCompanyId)
      .maybeSingle();

    let company = existingCompany;

    // If company doesn't exist and we have backup info, create it
    if (!company && create_company_if_missing) {
      const backupInfo = backupDataToRestore.backup_info;
      const companySettings = backupInfo?.company_settings || {};
      
      console.log(`Company ${targetCompanyId} not found, creating from backup...`);
      
      // Create the company with settings from backup
      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          id: targetCompanyId,
          name: backupInfo?.company_name || 'Restored Company',
          owner_id: restored_by || '00000000-0000-0000-0000-000000000000',
          // Restore company settings if available
          work_start_time: companySettings.work_start_time || '09:00',
          work_end_time: companySettings.work_end_time || '17:00',
          break_duration_minutes: companySettings.break_duration_minutes || 60,
          timezone: companySettings.timezone || 'Asia/Riyadh',
          country_code: companySettings.country_code || 'SA',
          default_currency: companySettings.default_currency || 'SAR',
          default_weekend_days: companySettings.default_weekend_days || ['friday', 'saturday'],
          annual_leave_days: companySettings.annual_leave_days || 21,
          emergency_leave_days: companySettings.emergency_leave_days || 5,
          attendance_verification_level: companySettings.attendance_verification_level || 1,
          late_under_15_deduction: companySettings.late_under_15_deduction || 0,
          late_15_to_30_deduction: companySettings.late_15_to_30_deduction || 0,
          late_over_30_deduction: companySettings.late_over_30_deduction || 0,
          absence_without_permission_deduction: companySettings.absence_without_permission_deduction || 0,
          overtime_multiplier: companySettings.overtime_multiplier || 1.5,
          daily_late_allowance_minutes: companySettings.daily_late_allowance_minutes || 15,
          monthly_late_allowance_minutes: companySettings.monthly_late_allowance_minutes || 60,
          max_excused_absence_days: companySettings.max_excused_absence_days || 3,
          telegram_bot_connected: companySettings.telegram_bot_connected || false,
          telegram_bot_username: companySettings.telegram_bot_username || null,
          company_latitude: companySettings.company_latitude || null,
          company_longitude: companySettings.company_longitude || null,
          location_radius_meters: companySettings.location_radius_meters || 100,
        })
        .select()
        .single();

      if (createError || !newCompany) {
        console.error('Failed to create company:', createError);
        throw new Error(`Failed to create company: ${createError?.message || 'Unknown error'}`);
      }
      
      company = newCompany;
      console.log(`Company created successfully: ${newCompany.name}`);

      // Also create a subscription for the company
      await supabase.from('subscriptions').insert({
        company_id: targetCompanyId,
        status: 'trial',
        plan_name: 'Trial',
        max_employees: 10
      });

      // Create backup settings
      await supabase.from('backup_settings').insert({
        company_id: targetCompanyId,
        is_active: true,
        frequency: 'daily',
        retention_days: 30,
        email_enabled: true
      });
    } else if (!company) {
      throw new Error('Company not found and create_company_if_missing is false');
    }

    const results: Record<string, { deleted: number; inserted: number; error?: string }> = {};
    const tablesToProcess = tables_to_restore || TABLE_ORDER;

    // Delete existing data in reverse order (to handle foreign keys)
    console.log('Deleting existing data...');
    for (const tableName of [...tablesToProcess].reverse()) {
      if (!backupDataToRestore.data![tableName]) continue;
      try {
        await supabase.from(tableName).delete().eq('company_id', targetCompanyId);
        results[tableName] = { deleted: 1, inserted: 0 };
        console.log(`Deleted records from ${tableName}`);
      } catch (err: unknown) {
        console.error(`Error deleting from ${tableName}:`, err);
        results[tableName] = { deleted: 0, inserted: 0, error: err instanceof Error ? err.message : 'Delete failed' };
      }
    }

    // Insert new data in correct order
    console.log('Inserting backup data...');
    for (const tableName of tablesToProcess) {
      const tableData = backupDataToRestore.data![tableName] as Record<string, unknown>[];
      if (!tableData || tableData.length === 0) continue;
      try {
        const preparedData = tableData.map((record) => ({ ...record, company_id: targetCompanyId }));
        const { error } = await supabase.from(tableName).upsert(preparedData, { onConflict: 'id' });
        if (error) throw error;
        results[tableName] = { ...results[tableName], inserted: preparedData.length };
        console.log(`Inserted ${preparedData.length} records into ${tableName}`);
      } catch (err: unknown) {
        console.error(`Error inserting into ${tableName}:`, err);
        results[tableName] = { ...results[tableName], inserted: 0, error: err instanceof Error ? err.message : 'Insert failed' };
      }
    }

    if (backup_id) {
      await supabase.from('backups').update({ status: 'completed' }).eq('id', backup_id);
    }

    console.log('Restore completed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      company_id: targetCompanyId, 
      company_name: company?.name || 'Unknown', 
      company_created: !existingCompany,
      results 
    }), {
      status: 200, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  } catch (error: unknown) {
    console.error('Restore error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), { 
      status: 500, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  }
});
