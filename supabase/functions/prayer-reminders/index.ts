import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Prayer names in Arabic
const PRAYER_NAMES: Record<string, string> = {
  fajr: 'الفجر',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
}

const PRAYER_EMOJIS: Record<string, string> = {
  fajr: '🌅',
  dhuhr: '☀️',
  asr: '🌤️',
  maghrib: '🌇',
  isha: '🌙',
}

async function getPrayerTimes(countryCode: string, date: Date): Promise<Record<string, string> | null> {
  try {
    // Use Aladhan API for prayer times
    const day = date.getDate()
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    
    // Map country codes to major cities for more accurate times
    const cityMap: Record<string, { city: string; country: string }> = {
      'EG': { city: 'Cairo', country: 'Egypt' },
      'SA': { city: 'Riyadh', country: 'Saudi Arabia' },
      'AE': { city: 'Dubai', country: 'UAE' },
      'KW': { city: 'Kuwait City', country: 'Kuwait' },
      'QA': { city: 'Doha', country: 'Qatar' },
      'BH': { city: 'Manama', country: 'Bahrain' },
      'OM': { city: 'Muscat', country: 'Oman' },
      'JO': { city: 'Amman', country: 'Jordan' },
      'LB': { city: 'Beirut', country: 'Lebanon' },
      'IQ': { city: 'Baghdad', country: 'Iraq' },
      'SY': { city: 'Damascus', country: 'Syria' },
      'PS': { city: 'Jerusalem', country: 'Palestine' },
      'YE': { city: 'Sanaa', country: 'Yemen' },
      'LY': { city: 'Tripoli', country: 'Libya' },
      'TN': { city: 'Tunis', country: 'Tunisia' },
      'DZ': { city: 'Algiers', country: 'Algeria' },
      'MA': { city: 'Rabat', country: 'Morocco' },
      'SD': { city: 'Khartoum', country: 'Sudan' },
      'MR': { city: 'Nouakchott', country: 'Mauritania' },
      'SO': { city: 'Mogadishu', country: 'Somalia' },
      'DJ': { city: 'Djibouti', country: 'Djibouti' },
      'KM': { city: 'Moroni', country: 'Comoros' },
      'TR': { city: 'Istanbul', country: 'Turkey' },
      'PK': { city: 'Islamabad', country: 'Pakistan' },
      'MY': { city: 'Kuala Lumpur', country: 'Malaysia' },
      'ID': { city: 'Jakarta', country: 'Indonesia' },
    }
    
    const location = cityMap[countryCode] || { city: 'Mecca', country: 'Saudi Arabia' }
    
    const resp = await fetch(
      `https://api.aladhan.com/v1/timingsByCity/${day}-${month}-${year}?city=${encodeURIComponent(location.city)}&country=${encodeURIComponent(location.country)}&method=5`
    )
    
    if (!resp.ok) return null
    
    const data = await resp.json()
    const timings = data?.data?.timings
    
    if (!timings) return null
    
    return {
      fajr: timings.Fajr,
      dhuhr: timings.Dhuhr,
      asr: timings.Asr,
      maghrib: timings.Maghrib,
      isha: timings.Isha,
    }
  } catch (err) {
    console.error('Error fetching prayer times:', err)
    return null
  }
}

async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    })
  } catch (err) {
    console.error('Failed to send telegram message:', err)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // Get all companies with prayer reminders enabled
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name, country_code, prayer_reminders_enabled, prayer_reminders_prayers, prayer_reminder_minutes_before, timezone')
      .eq('prayer_reminders_enabled', true)
      .eq('is_deleted', false)

    if (error || !companies?.length) {
      return new Response(JSON.stringify({ ok: true, message: 'No companies with prayer reminders' }), { headers: corsHeaders })
    }

    let totalSent = 0

    for (const company of companies) {
      const countryCode = company.country_code || 'EG'
      const timezone = company.timezone || 'Africa/Cairo'
      const minutesBefore = company.prayer_reminder_minutes_before || 10
      const enabledPrayers = company.prayer_reminders_prayers || ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']

      // Get current time in company timezone
      const now = new Date()
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      })
      const parts = formatter.formatToParts(now)
      const getValue = (type: string) => parts.find(p => p.type === type)?.value || ''
      const currentHour = parseInt(getValue('hour'))
      const currentMinute = parseInt(getValue('minute'))
      const currentTotalMinutes = currentHour * 60 + currentMinute

      // Get prayer times for today
      const prayerTimes = await getPrayerTimes(countryCode, now)
      if (!prayerTimes) continue

      // Check which prayer is coming up
      for (const prayer of enabledPrayers) {
        const prayerTime = prayerTimes[prayer]
        if (!prayerTime) continue

        const [pH, pM] = prayerTime.split(':').map(Number)
        const prayerTotalMinutes = pH * 60 + pM
        const diffMinutes = prayerTotalMinutes - currentTotalMinutes

        // Send reminder if within the window (e.g., 10 minutes before)
        if (diffMinutes >= 0 && diffMinutes <= minutesBefore) {
          // Get bot for this company
          const { data: bot } = await supabase
            .from('telegram_bots')
            .select('bot_token')
            .eq('assigned_company_id', company.id)
            .single()

          if (!bot?.bot_token) continue

          // Get all active employees with telegram
          const { data: employees } = await supabase
            .from('employees')
            .select('telegram_chat_id')
            .eq('company_id', company.id)
            .eq('is_active', true)
            .not('telegram_chat_id', 'is', null)

          if (!employees?.length) continue

          const emoji = PRAYER_EMOJIS[prayer] || '🕌'
          const prayerName = PRAYER_NAMES[prayer] || prayer
          const message = `${emoji} <b>تذكير بصلاة ${prayerName}</b>\n\n` +
            `🕐 موعد الأذان: ${prayerTime}\n` +
            `🤲 حان وقت صلاة ${prayerName}\n\n` +
            `"إن الصلاة كانت على المؤمنين كتاباً موقوتاً"`

          for (const emp of employees) {
            if (emp.telegram_chat_id) {
              await sendTelegramMessage(bot.bot_token, emp.telegram_chat_id, message)
              totalSent++
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: totalSent }), { headers: corsHeaders })
  } catch (err) {
    console.error('Prayer reminders error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
