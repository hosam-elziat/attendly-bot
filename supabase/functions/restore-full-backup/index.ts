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
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { backup_data, restored_by }: { backup_data: FullBackup; restored_by?: string } = await req.json();

    if (!backup_data || backup_data.backup_info?.backup_type !== 'full_system') {
      throw new Error('Invalid full system backup file');
    }

    console.log(`Starting full system restore: ${backup_data.backup_info.total_companies} companies`);

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

    // First, restore all companies
    for (const company of backup_data.companies || []) {
      try {
        const companyId = company.id as string;
        
        // Check if company exists
        const { data: existing } = await supabase
          .from('companies')
          .select('id')
          .eq('id', companyId)
          .maybeSingle();

        if (existing) {
          // Update existing company
          const { error } = await supabase
            .from('companies')
            .update(company)
            .eq('id', companyId);
          
          if (error) throw error;
          results.companies_updated++;
          console.log(`Updated company: ${company.name}`);
        } else {
          // Create new company
          const { error } = await supabase
            .from('companies')
            .insert(company);
          
          if (error) throw error;
          results.companies_created++;
          console.log(`Created company: ${company.name}`);
        }

        // Now restore company data
        const companyData = backup_data.data[companyId];
        if (!companyData) continue;

        // Delete existing data in reverse order
        for (const tableName of [...TABLE_ORDER].reverse()) {
          if (!companyData[tableName]) continue;
          try {
            await supabase.from(tableName).delete().eq('company_id', companyId);
          } catch (err) {
            console.error(`Error deleting ${tableName} for company ${companyId}:`, err);
          }
        }

        // Insert new data in correct order
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

        // Restore subscription if exists
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

    // Restore global data (optional - subscription_plans, telegram_bots, etc.)
    if (backup_data.global_data) {
      for (const [tableName, data] of Object.entries(backup_data.global_data)) {
        if (!data || data.length === 0) continue;
        try {
          // For global tables, we upsert
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
