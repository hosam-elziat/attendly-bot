import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { countryCode, year } = await req.json();
    
    if (!countryCode) {
      return new Response(
        JSON.stringify({ error: 'Country code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentYear = year || new Date().getFullYear();
    
    // Using Nager.Date API (free, no API key required)
    const response = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${currentYear}/${countryCode}`
    );

    if (!response.ok) {
      // If the country is not supported, return empty array
      if (response.status === 404) {
        return new Response(
          JSON.stringify([]),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`API error: ${response.status}`);
    }

    // Get response text first to handle empty/truncated responses
    const responseText = await response.text();
    
    if (!responseText || responseText.trim() === '') {
      console.log('Empty response from holidays API');
      return new Response(
        JSON.stringify([]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let holidays: any[];
    try {
      holidays = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse holidays response:', parseError);
      // Try to repair truncated JSON array
      const lastBrace = responseText.lastIndexOf('}');
      if (lastBrace > 0) {
        try {
          const repaired = responseText.substring(0, lastBrace + 1) + ']';
          holidays = JSON.parse(repaired);
          console.log(`Recovered ${holidays.length} items from truncated response`);
        } catch {
          return new Response(
            JSON.stringify([]),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        return new Response(
          JSON.stringify([]),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Filter holidays for current month
    const currentMonth = new Date().getMonth();
    const monthlyHolidays = holidays.filter((h: any) => {
      const holidayDate = new Date(h.date);
      return holidayDate.getMonth() === currentMonth;
    });

    return new Response(
      JSON.stringify(monthlyHolidays),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error fetching holidays:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
