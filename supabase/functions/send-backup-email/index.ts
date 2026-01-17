import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const superAdminEmail = Deno.env.get("SUPER_ADMIN_EMAIL");
    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    const resend = new Resend(resendApiKey);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { backup_id, send_all_pending = false } = await req.json();

    let backupsToSend: unknown[] = [];
    if (send_all_pending) {
      const { data } = await supabase.from('backups').select('*, companies (name)').eq('email_sent', false).eq('status', 'completed');
      backupsToSend = data || [];
    } else if (backup_id) {
      const { data } = await supabase.from('backups').select('*, companies (name)').eq('id', backup_id).single();
      backupsToSend = data ? [data] : [];
    }

    const results = [];
    for (const backup of backupsToSend as Record<string, unknown>[]) {
      try {
        const companyName = (backup.companies as Record<string, unknown>)?.name || 'Unknown';
        const backupJson = JSON.stringify(backup.backup_data, null, 2);
        const backupBase64 = btoa(unescape(encodeURIComponent(backupJson)));
        const fileName = `backup_${String(companyName).replace(/\s+/g, '_')}_${new Date(backup.created_at as string).toISOString().split('T')[0]}.json`;

        if (superAdminEmail) {
          await resend.emails.send({
            from: "Attendly <onboarding@resend.dev>",
            to: [superAdminEmail],
            subject: `نسخة احتياطية - ${companyName}`,
            html: `<h1>نسخة احتياطية</h1><p>الشركة: ${companyName}</p>`,
            attachments: [{ filename: fileName, content: backupBase64 }]
          });
        }

        await supabase.from('backups').update({ email_sent: true, email_sent_at: new Date().toISOString() }).eq('id', backup.id);
        results.push({ backup_id: backup.id, status: 'sent' });
      } catch (err: unknown) {
        results.push({ backup_id: (backup as Record<string, unknown>).id, status: 'failed', error: err instanceof Error ? err.message : 'Unknown' });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: unknown) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown' }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
