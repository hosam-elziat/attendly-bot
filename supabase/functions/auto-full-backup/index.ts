import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BACKUP_TABLES = [
  'employees',
  'attendance_logs',
  'break_logs',
  'leave_requests',
  'salary_records',
  'salary_adjustments',
  'positions',
  'position_permissions',
  'position_reports_to',
  'join_requests',
  'pending_attendance',
  'approved_holidays',
  'company_locations',
  'employee_locations',
  'attendance_policies',
  'backup_settings',
  'audit_logs',
  'telegram_messages',
  'deleted_records',
  'profiles',
  'user_roles',
  'join_request_reviewers'
];

const COMPANY_FIELDS = [
  'id', 'name', 'owner_id', 'work_start_time', 'work_end_time',
  'company_latitude', 'company_longitude', 'location_radius_meters',
  'default_weekend_days', 'telegram_bot_username', 'telegram_bot_connected',
  'annual_leave_days', 'emergency_leave_days', 'break_duration_minutes',
  'overtime_multiplier', 'late_under_15_deduction', 'late_15_to_30_deduction',
  'late_over_30_deduction', 'absence_without_permission_deduction',
  'country_code', 'default_currency', 'timezone', 'max_excused_absence_days',
  'daily_late_allowance_minutes', 'monthly_late_allowance_minutes',
  'auto_absent_after_hours', 'attendance_verification_level', 'level3_verification_mode',
  'attendance_approver_type', 'attendance_approver_id',
  'join_request_reviewer_type', 'join_request_reviewer_id',
  'checkin_reminder_count', 'checkin_reminder_interval_minutes',
  'checkout_reminder_count', 'checkout_reminder_interval_minutes',
  'created_at', 'updated_at'
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("Starting automatic full system backup...");

    // Check if auto backup is enabled
    const { data: settings } = await supabase
      .from('global_backup_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!settings?.auto_backup_enabled) {
      console.log("Auto backup is disabled, skipping...");
      return new Response(
        JSON.stringify({ success: true, message: 'Auto backup is disabled' }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get all companies
    const { data: companiesData, error: companiesError } = await supabase
      .from('companies')
      .select(COMPANY_FIELDS.join(','));

    if (companiesError) throw companiesError;

    interface CompanyRecord {
      id: string;
      name: string;
      [key: string]: unknown;
    }

    const companies = companiesData as unknown as CompanyRecord[] | null;

    console.log(`Found ${companies?.length || 0} companies to backup`);

    const companiesBackup: Record<string, Record<string, unknown>> = {};
    let totalRecords = 0;

    // Backup each company's data
    for (const company of companies || []) {
      const companyData: Record<string, unknown> = { company_info: company };

      for (const table of BACKUP_TABLES) {
        const { data: tableData, error: tableError } = await supabase
          .from(table)
          .select('*')
          .eq('company_id', company.id);

        if (!tableError && tableData) {
          companyData[table] = tableData;
          totalRecords += tableData.length;
        }
      }

      // Also backup subscriptions
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('company_id', company.id);

      if (subs) {
        companyData.subscriptions = subs;
        totalRecords += subs.length;
      }

      companiesBackup[company.id] = companyData;
    }

    // Backup global data
    const globalData: Record<string, any> = {};
    const globalTables = ['subscription_plans', 'telegram_bots', 'saas_team', 'discount_codes'];

    for (const table of globalTables) {
      const { data } = await supabase.from(table).select('*');
      if (data) {
        globalData[table] = data;
        totalRecords += data.length;
      }
    }

    const fullBackup = {
      backup_info: {
        backup_type: 'full_system',
        created_at: new Date().toISOString(),
        total_companies: companies?.length || 0,
        total_records: totalRecords,
        is_automatic: true
      },
      companies: companiesBackup,
      global_data: globalData
    };

    const backupJson = JSON.stringify(fullBackup);
    const sizeBytes = new TextEncoder().encode(backupJson).length;

    // Save the backup
    const { data: backupRecord, error: insertError } = await supabase
      .from('backups')
      .insert({
        backup_type: 'full_system',
        backup_data: fullBackup,
        tables_included: [...BACKUP_TABLES, 'subscriptions', ...globalTables],
        size_bytes: sizeBytes,
        status: 'completed',
        notes: 'نسخة احتياطية تلقائية للنظام بالكامل'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(`Backup created with ID: ${backupRecord.id}`);

    // Update settings
    await supabase
      .from('global_backup_settings')
      .update({
        last_auto_backup_at: new Date().toISOString(),
        next_auto_backup_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', settings.id);

    // Send email if enabled
    if (settings.auto_email_enabled) {
      console.log("Auto email is enabled, sending backup email...");

      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);

        // Get email recipients
        const { data: recipients } = await supabase
          .from('backup_email_recipients')
          .select('email, name')
          .eq('is_active', true);

        const recipientEmails = recipients?.map(r => r.email) || [];
        const superAdminEmail = Deno.env.get("SUPER_ADMIN_EMAIL");

        if (recipientEmails.length === 0 && superAdminEmail) {
          recipientEmails.push(superAdminEmail);
        }

        if (recipientEmails.length > 0) {
          const backupBase64 = btoa(unescape(encodeURIComponent(backupJson)));
          const fileName = `auto_full_backup_${new Date().toISOString().split('T')[0]}.json`;

          await resend.emails.send({
            from: "Attendly <onboarding@resend.dev>",
            to: recipientEmails,
            subject: `نسخة احتياطية تلقائية للنظام - ${companies?.length || 0} شركة`,
            html: `
              <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background: #f8fafc;">
                <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  <h1 style="color: #8b5cf6; margin-bottom: 20px;">🗄️ نسخة احتياطية تلقائية</h1>
                  
                  <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #334155;">ملخص النسخة الاحتياطية</h3>
                    <p style="margin: 5px 0;"><strong>التاريخ:</strong> ${new Date().toLocaleString('ar-EG')}</p>
                    <p style="margin: 5px 0;"><strong>عدد الشركات:</strong> ${companies?.length || 0}</p>
                    <p style="margin: 5px 0;"><strong>إجمالي السجلات:</strong> ${totalRecords}</p>
                    <p style="margin: 5px 0;"><strong>حجم الملف:</strong> ${(sizeBytes / 1024).toFixed(2)} KB</p>
                    <p style="margin: 5px 0;"><strong>النوع:</strong> تلقائي ⏰</p>
                  </div>

                  <div style="background: #dcfce7; border-radius: 8px; padding: 15px; margin-bottom: 20px; border-right: 4px solid #22c55e;">
                    <p style="margin: 0; color: #166534;">
                      ✅ تم إنشاء النسخة الاحتياطية بنجاح وإرسالها لجميع المستلمين المفعّلين.
                    </p>
                  </div>

                  <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
                    تم إرسال هذا الإيميل تلقائياً من نظام Attendly للنسخ الاحتياطي.
                  </p>
                </div>
              </div>
            `,
            attachments: [{ filename: fileName, content: backupBase64 }]
          });

          console.log(`Email sent to ${recipientEmails.length} recipients`);

          // Mark backup as email sent
          await supabase
            .from('backups')
            .update({ email_sent: true, email_sent_at: new Date().toISOString() })
            .eq('id', backupRecord.id);
        }
      } else {
        console.log("RESEND_API_KEY not configured, skipping email");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        backup_id: backupRecord.id,
        companies_count: companies?.length || 0,
        total_records: totalRecords,
        size_bytes: sizeBytes
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Auto backup error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
