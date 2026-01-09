import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language = "ar" } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = language === "ar"
      ? `أنت مساعد HR ذكي ومباشر. قواعدك:

**أسلوب الرد:**
- رد بشكل مباشر ومختصر جداً - لا تكتب مقدمات أو خاتمات
- استخدم الجداول والقوائم لتنظيم المعلومات
- عند طلب ملخص عن شخص أو يوم، أعط المعلومات فوراً في شكل منظم
- لا تقل "بالتأكيد" أو "طبعاً" - ابدأ مباشرة بالمعلومات

**تنسيق الردود:**
- للأرقام والإحصائيات: استخدم جداول markdown
- للقوائم: استخدم نقاط مرتبة
- للتوقيتات: اعرضها بوضوح (مثال: ⏰ 09:00 ص)
- استخدم الإيموجي بذكاء: ✅ ❌ ⚠️ 📊 👤 📅

**مثال للرد المثالي:**
| البند | القيمة |
|-------|--------|
| الحضور | 15 موظف |
| الغياب | 2 موظف |`
      : `You are a direct and concise HR assistant. Your rules:

**Response style:**
- Be extremely direct - no introductions or conclusions
- Use tables and lists to organize information
- When asked for a summary, give information immediately in organized format
- Don't say "Sure" or "Of course" - start directly with the data

**Formatting:**
- For numbers/stats: use markdown tables
- For lists: use ordered bullets
- For times: show clearly (e.g., ⏰ 09:00 AM)
- Use emojis smartly: ✅ ❌ ⚠️ 📊 👤 📅

**Ideal response example:**
| Item | Value |
|------|-------|
| Present | 15 employees |
| Absent | 2 employees |`;

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
          ...messages,
        ],
        stream: true,
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
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
