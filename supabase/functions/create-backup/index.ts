import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLES_TO_BACKUP = [
  'employees', 'attendance_logs', 'break_logs', 'salary_records', 'salary_adjustments',
  'leave_requests', 'positions', 'position_permissions', 'position_reports_to',
  'attendance_policies', 'join_requests', 'join_request_reviewers', 'pending_attendance',
  'deleted_records', 'employee_location_history', 'audit_logs'
];

interface BackupRequest {
  company_id?: string;
  backup_all?: boolean;
  backup_type?: 'automatic' | 'manual';
  created_by?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ========== AUTHENTICATION ==========
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing authorization header' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the JWT token
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = claimsData.claims.sub as string;
    
    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { company_id, backup_all = false, backup_type = 'automatic', created_by }: BackupRequest = await req.json();

    // ========== AUTHORIZATION ==========
    if (backup_all) {
      // System-wide backup requires SaaS admin access
      const { data: saasTeam } = await supabase
        .from('saas_team')
        .select('is_active, role')
        .eq('user_id', userId)
        .single();

      if (!saasTeam?.is_active || saasTeam.role !== 'super_admin') {
        return new Response(
          JSON.stringify({ error: 'Forbidden - SaaS admin access required for system-wide backups' }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } else if (company_id) {
      // Company-specific backup requires admin/owner access
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', userId)
        .single();

      if (!profile || profile.company_id !== company_id) {
        return new Response(
          JSON.stringify({ error: 'Forbidden - You do not have access to this company' }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check if user is admin or owner
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (!userRole || !['owner', 'admin'].includes(userRole.role)) {
        return new Response(
          JSON.stringify({ error: 'Forbidden - Admin or owner access required for backups' }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Either company_id or backup_all must be provided' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ========== BACKUP LOGIC ==========
    let companiesToBackup: { id: string; name: string }[] = [];
    
    if (backup_all) {
      const { data: companies, error } = await supabase.from('companies').select('id, name');
      if (error) throw error;
      companiesToBackup = companies || [];
    } else if (company_id) {
      const { data: company, error } = await supabase.from('companies').select('id, name').eq('id', company_id).single();
      if (error) throw error;
      companiesToBackup = [company];
    }

    const results = [];

    for (const company of companiesToBackup) {
      try {
        const backupData: Record<string, unknown[]> = {};
        const tableCounts: Record<string, number> = {};
        let totalRecords = 0;

        for (const tableName of TABLES_TO_BACKUP) {
          const { data, error } = await supabase.from(tableName).select('*').eq('company_id', company.id);
          if (error) { backupData[tableName] = []; tableCounts[tableName] = 0; }
          else { backupData[tableName] = data || []; tableCounts[tableName] = data?.length || 0; totalRecords += tableCounts[tableName]; }
        }

        const { data: companyData } = await supabase.from('companies').select('*').eq('id', company.id).single();
        if (companyData) { backupData['company_settings'] = [companyData]; tableCounts['company_settings'] = 1; }

        const backupObject = {
          backup_info: { version: '1.0', company_id: company.id, company_name: company.name, backup_date: new Date().toISOString(), tables_count: TABLES_TO_BACKUP.length + 1, total_records: totalRecords, table_counts: tableCounts },
          data: backupData
        };

        const sizeBytes = new TextEncoder().encode(JSON.stringify(backupObject)).length;

        const { data: backup, error: insertError } = await supabase.from('backups').insert({
          company_id: company.id, backup_type, backup_data: backupObject, tables_included: [...TABLES_TO_BACKUP, 'company_settings'],
          size_bytes: sizeBytes, status: 'completed', created_by: created_by || userId, notes: `Backup: ${totalRecords} records`
        }).select().single();

        if (insertError) throw insertError;

        await supabase.from('backup_settings').upsert({ company_id: company.id, last_backup_at: new Date().toISOString(), next_backup_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }, { onConflict: 'company_id' });

        results.push({ company_id: company.id, company_name: company.name, backup_id: backup.id, total_records: totalRecords, size_bytes: sizeBytes, status: 'success' });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        results.push({ company_id: company.id, company_name: company.name, status: 'failed', error: message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
