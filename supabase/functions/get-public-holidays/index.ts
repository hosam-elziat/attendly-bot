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

    const holidays = await response.json();
    
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
