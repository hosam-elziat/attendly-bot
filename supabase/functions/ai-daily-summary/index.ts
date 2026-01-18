import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify user has access to company
async function verifyCompanyAccess(supabase: any, userId: string, companyId: string): Promise<boolean> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("user_id", userId)
    .single();
  
  if (profileError || !profile) {
    console.error("Profile lookup failed:", profileError);
    return false;
  }
  
  return profile.company_id === companyId;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyId, language = "ar" } = await req.json();
    
    if (!companyId) {
      return new Response(
        JSON.stringify({ error: "Company ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ===== SECURITY: Verify JWT and user access =====
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Missing authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has access to the requested company
    const hasAccess = await verifyCompanyAccess(supabase, user.id, companyId);
    if (!hasAccess) {
      console.error(`User ${user.id} attempted to access company ${companyId} without permission`);
      return new Response(
        JSON.stringify({ error: "Forbidden - You don't have access to this company" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // ===== END SECURITY =====

    const today = new Date().toISOString().split("T")[0];

    // Fetch today's attendance
    const { data: attendance } = await supabase
      .from("attendance_logs")
      .select(`
        *,
        employees!inner(full_name, department)
      `)
      .eq("company_id", companyId)
      .eq("date", today);

    // Fetch all employees count
    const { count: totalEmployees } = await supabase
      .from("employees")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("is_active", true);

    // Fetch pending leave requests
    const { data: pendingLeaves } = await supabase
      .from("leave_requests")
      .select(`
        *,
        employees!inner(full_name)
      `)
      .eq("company_id", companyId)
      .eq("status", "pending");

    // Calculate stats
    const checkedIn = attendance?.filter(a => a.status === "checked_in").length || 0;
    const checkedOut = attendance?.filter(a => a.status === "checked_out").length || 0;
    const onBreak = attendance?.filter(a => a.status === "on_break").length || 0;
    const totalPresent = (attendance?.length || 0);
    const absent = (totalEmployees || 0) - totalPresent;

    const systemPrompt = language === "ar" 
      ? `أنت مساعد ذكي لإدارة الموارد البشرية. قم بتقديم ملخص يومي موجز وواضح بالعربية. استخدم الإيموجي لجعل التقرير أكثر جاذبية. كن مختصراً ومباشراً.`
      : `You are an HR management assistant. Provide a brief, clear daily summary in English. Use emojis to make the report engaging. Be concise and direct.`;

    const dataPrompt = `
Today's Date: ${today}

Attendance Summary:
- Total Employees: ${totalEmployees || 0}
- Present Today: ${totalPresent}
- Currently Checked In: ${checkedIn}
- On Break: ${onBreak}
- Checked Out: ${checkedOut}
- Absent: ${absent}

Pending Leave Requests: ${pendingLeaves?.length || 0}
${pendingLeaves?.map(l => `- ${l.employees?.full_name}: ${l.leave_type} (${l.days} days)`).join("\n") || "None"}

Recent Check-ins:
${attendance?.slice(0, 5).map(a => `- ${a.employees?.full_name} (${a.employees?.department || "No dept"}): ${a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString() : "N/A"}`).join("\n") || "No check-ins yet"}

Please provide a brief daily summary report based on this data.
`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: dataPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const summary = aiResponse.choices?.[0]?.message?.content || "Unable to generate summary";

    return new Response(
      JSON.stringify({ 
        summary,
        stats: {
          totalEmployees: totalEmployees || 0,
          present: totalPresent,
          absent,
          checkedIn,
          onBreak,
          checkedOut,
          pendingLeaves: pendingLeaves?.length || 0
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
