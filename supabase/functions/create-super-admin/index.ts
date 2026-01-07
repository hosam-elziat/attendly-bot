import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, full_name, secret_key } = await req.json();

    // Simple secret key protection
    if (secret_key !== "CREATE_SUPER_ADMIN_2024") {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if super admin already exists
    const { data: existingTeam } = await supabaseAdmin
      .from("saas_team")
      .select("id")
      .eq("role", "super_admin")
      .limit(1);

    if (existingTeam && existingTeam.length > 0) {
      return new Response(
        JSON.stringify({ error: "Super admin already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      throw authError;
    }

    if (!authData.user) {
      throw new Error("Failed to create user");
    }

    // Add to saas_team
    const { error: teamError } = await supabaseAdmin
      .from("saas_team")
      .insert({
        user_id: authData.user.id,
        email,
        full_name,
        role: "super_admin",
        permissions: {
          view_companies: true,
          manage_companies: true,
          view_employees: true,
          manage_subscriptions: true,
        },
        is_active: true,
      });

    if (teamError) {
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw teamError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Super admin created successfully",
        user_id: authData.user.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
