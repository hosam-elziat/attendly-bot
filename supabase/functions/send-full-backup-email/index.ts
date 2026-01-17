import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = { 
  "Access-Control-Allow-Origin": "*", 
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" 
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    const resend = new Resend(resendApiKey);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    
    const { backup_id }: { backup_id?: string } = await req.json();

    // Get active email recipients
    const { data: recipients } = await supabase
      .from('backup_email_recipients')
      .select('email, name')
      .eq('is_active', true);
    
    const recipientEmails = recipients?.map(r => r.email) || [];
    const superAdminEmail = Deno.env.get("SUPER_ADMIN_EMAIL");
    
    if (recipientEmails.length === 0 && superAdminEmail) {
      recipientEmails.push(superAdminEmail);
    }

    if (recipientEmails.length === 0) {
      throw new Error("No email recipients configured");
    }

    // Get the backup - either specific or latest full system backup
    let backup;
    if (backup_id) {
      const { data } = await supabase
        .from('backups')
        .select('*')
        .eq('id', backup_id)
        .single();
      backup = data;
    } else {
      // Get latest full system backup (regardless of email_sent status)
      const { data } = await supabase
        .from('backups')
        .select('*')
        .eq('backup_type', 'full_system')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      backup = data;
    }

    if (!backup) {
      return new Response(JSON.stringify({ success: false, error: 'لا توجد نسخ احتياطية للنظام. قم بإنشاء نسخة أولاً.' }), { 
        status: 404, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    console.log(`Sending full backup email to ${recipientEmails.length} recipients`);

    const backupInfo = (backup.backup_data as Record<string, unknown>).backup_info as Record<string, unknown>;
    const backupJson = JSON.stringify(backup.backup_data, null, 2);
    const backupBase64 = btoa(unescape(encodeURIComponent(backupJson)));
    const fileName = `full_system_backup_${new Date(backup.created_at).toISOString().split('T')[0]}.json`;

    await resend.emails.send({
      from: "Attendly <onboarding@resend.dev>",
      to: recipientEmails,
      subject: `نسخة احتياطية كاملة للنظام - ${backupInfo.total_companies} شركة`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h1 style="color: #2563eb; margin-bottom: 20px;">🗄️ نسخة احتياطية كاملة للنظام</h1>
            
            <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 15px 0; color: #334155;">ملخص النسخة الاحتياطية</h3>
              <p style="margin: 5px 0;"><strong>التاريخ:</strong> ${new Date(backup.created_at).toLocaleString('ar-EG')}</p>
              <p style="margin: 5px 0;"><strong>عدد الشركات:</strong> ${backupInfo.total_companies}</p>
              <p style="margin: 5px 0;"><strong>إجمالي السجلات:</strong> ${backupInfo.total_records}</p>
              <p style="margin: 5px 0;"><strong>حجم الملف:</strong> ${((backup.size_bytes || 0) / 1024).toFixed(2)} KB</p>
            </div>

            <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin-bottom: 20px; border-right: 4px solid #f59e0b;">
              <p style="margin: 0; color: #92400e;">
                ⚠️ <strong>تنبيه:</strong> هذا الملف يحتوي على جميع بيانات النظام. يرجى الاحتفاظ به في مكان آمن.
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

    // Mark as sent
    await supabase.from('backups').update({ 
      email_sent: true, 
      email_sent_at: new Date().toISOString() 
    }).eq('id', backup.id);

    console.log('Full backup email sent successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      backup_id: backup.id,
      recipients_count: recipientEmails.length
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  } catch (error: unknown) {
    console.error('Send full backup email error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown' }), { 
      status: 500, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  }
});
