import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLE_ORDER = ['positions', 'position_permissions', 'position_reports_to', 'employees', 'attendance_policies', 'attendance_logs', 'break_logs', 'salary_records', 'salary_adjustments', 'leave_requests', 'join_requests', 'join_request_reviewers', 'pending_attendance', 'deleted_records', 'employee_location_history', 'audit_logs'];

interface RestoreRequest { backup_id?: string; backup_data?: unknown; company_id: string; tables_to_restore?: string[]; restored_by?: string; }

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { backup_id, backup_data, company_id, tables_to_restore, restored_by }: RestoreRequest = await req.json();

    let backupDataToRestore: { data?: Record<string, unknown[]>; backup_info?: unknown };

    if (backup_id) {
      const { data: backup, error } = await supabase.from('backups').select('backup_data, company_id').eq('id', backup_id).single();
      if (error) throw error;
      backupDataToRestore = backup.backup_data as typeof backupDataToRestore;
      await supabase.from('backups').update({ status: 'restoring' }).eq('id', backup_id);
    } else if (backup_data) {
      backupDataToRestore = backup_data as typeof backupDataToRestore;
    } else throw new Error('Either backup_id or backup_data required');

    if (!backupDataToRestore?.data) throw new Error('Invalid backup data');

    const { data: company, error: companyError } = await supabase.from('companies').select('id, name').eq('id', company_id).single();
    if (companyError || !company) throw new Error('Company not found');

    const results: Record<string, { deleted: number; inserted: number; error?: string }> = {};
    const tablesToProcess = tables_to_restore || TABLE_ORDER;

    for (const tableName of [...tablesToProcess].reverse()) {
      if (!backupDataToRestore.data[tableName]) continue;
      try {
        await supabase.from(tableName).delete().eq('company_id', company_id);
        results[tableName] = { deleted: 1, inserted: 0 };
      } catch (err: unknown) {
        results[tableName] = { deleted: 0, inserted: 0, error: err instanceof Error ? err.message : 'Delete failed' };
      }
    }

    for (const tableName of tablesToProcess) {
      const tableData = backupDataToRestore.data[tableName] as Record<string, unknown>[];
      if (!tableData || tableData.length === 0) continue;
      try {
        const preparedData = tableData.map((record) => ({ ...record, company_id }));
        const { error } = await supabase.from(tableName).upsert(preparedData, { onConflict: 'id' });
        if (error) throw error;
        results[tableName] = { ...results[tableName], inserted: preparedData.length };
      } catch (err: unknown) {
        results[tableName] = { ...results[tableName], inserted: 0, error: err instanceof Error ? err.message : 'Insert failed' };
      }
    }

    if (backup_id) await supabase.from('backups').update({ status: 'completed' }).eq('id', backup_id);

    return new Response(JSON.stringify({ success: true, company_id, company_name: company.name, results }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: unknown) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
