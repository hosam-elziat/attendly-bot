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

interface FullBackup {
  backup_info: {
    version: string;
    backup_type: string;
    total_companies: number;
  };
  companies: Record<string, unknown>[];
  data: Record<string, Record<string, unknown[]>>;
  global_data?: Record<string, unknown[]>;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    // ========== AUTHORIZATION - SaaS Admin Only ==========
    const { data: saasTeam } = await supabase
      .from('saas_team')
      .select('is_active, role')
      .eq('user_id', userId)
      .single();

    if (!saasTeam?.is_active || saasTeam.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden - SaaS admin access required for full system restore' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { backup_data, restored_by }: { backup_data: FullBackup; restored_by?: string } = await req.json();

    if (!backup_data || backup_data.backup_info?.backup_type !== 'full_system') {
      throw new Error('Invalid full system backup file');
    }

    console.log(`Starting full system restore: ${backup_data.backup_info.total_companies} companies`);

    // ========== RESTORE LOGIC ==========
    const results: {
      companies_created: number;
      companies_updated: number;
      total_records_restored: number;
      errors: string[];
    } = {
      companies_created: 0,
      companies_updated: 0,
      total_records_restored: 0,
      errors: []
    };

    for (const company of backup_data.companies || []) {
      try {
        const companyId = company.id as string;
        
        const { data: existing } = await supabase
          .from('companies')
          .select('id')
          .eq('id', companyId)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('companies')
            .update(company)
            .eq('id', companyId);
          
          if (error) throw error;
          results.companies_updated++;
          console.log(`Updated company: ${company.name}`);
        } else {
          const { error } = await supabase
            .from('companies')
            .insert(company);
          
          if (error) throw error;
          results.companies_created++;
          console.log(`Created company: ${company.name}`);
        }

        const companyData = backup_data.data[companyId];
        if (!companyData) continue;

        for (const tableName of [...TABLE_ORDER].reverse()) {
          if (!companyData[tableName]) continue;
          try {
            await supabase.from(tableName).delete().eq('company_id', companyId);
          } catch (err) {
            console.error(`Error deleting ${tableName} for company ${companyId}:`, err);
          }
        }

        for (const tableName of TABLE_ORDER) {
          const tableData = companyData[tableName] as Record<string, unknown>[];
          if (!tableData || tableData.length === 0) continue;
          
          try {
            const { error } = await supabase.from(tableName).upsert(tableData, { onConflict: 'id' });
            if (error) throw error;
            results.total_records_restored += tableData.length;
          } catch (err) {
            const errorMsg = `Error inserting ${tableName} for ${company.name}: ${err instanceof Error ? err.message : 'Unknown'}`;
            console.error(errorMsg);
            results.errors.push(errorMsg);
          }
        }

        const subscription = companyData['subscription']?.[0] as Record<string, unknown> | undefined;
        if (subscription) {
          await supabase.from('subscriptions').upsert(subscription, { onConflict: 'company_id' });
        }

      } catch (err) {
        const errorMsg = `Error restoring company ${company.name}: ${err instanceof Error ? err.message : 'Unknown'}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    if (backup_data.global_data) {
      for (const [tableName, data] of Object.entries(backup_data.global_data)) {
        if (!data || data.length === 0) continue;
        try {
          const { error } = await supabase.from(tableName).upsert(data as Record<string, unknown>[], { onConflict: 'id' });
          if (error) {
            console.error(`Error restoring global table ${tableName}:`, error);
          } else {
            results.total_records_restored += data.length;
            console.log(`Restored ${data.length} records to ${tableName}`);
          }
        } catch (err) {
          console.error(`Error with global table ${tableName}:`, err);
        }
      }
    }

    console.log(`Full restore completed. Created: ${results.companies_created}, Updated: ${results.companies_updated}, Records: ${results.total_records_restored}`);

    return new Response(JSON.stringify({ 
      success: true, 
      ...results
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  } catch (error: unknown) {
    console.error('Full restore error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown' }), { 
      status: 500, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  }
});
