import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

// Motivational hadiths/phrases per prayer
const PRAYER_MOTIVATIONS: Record<string, string[]> = {
  fajr: [
    '🤲 "من صلى البردين دخل الجنة" - متفق عليه',
    '🌟 "ركعتا الفجر خير من الدنيا وما فيها" - رواه مسلم',
    '💎 صلاة الفجر نور يوم كامل، لا تفوّتها!',
    '🕊️ "من صلى الصبح فهو في ذمة الله" - رواه مسلم',
    '⭐ استقبل يومك بصلاة الفجر وابدأ بالبركة',
  ],
  dhuhr: [
    '🤲 "أقرب ما يكون العبد من ربه وهو ساجد" - رواه مسلم',
    '🌟 صلاة الظهر راحة في منتصف اليوم، جدد نشاطك مع الله',
    '💎 "من حافظ على أربع ركعات قبل الظهر حرمه الله على النار" - رواه أبو داود',
    '🕊️ استراحة الروح في منتصف اليوم، لا تنسَ صلاة الظهر',
    '⭐ "الصلاة عماد الدين" - أقم صلاتك يقم يومك',
  ],
  asr: [
    '🤲 "من صلى البردين دخل الجنة" - متفق عليه',
    '🌟 "من ترك صلاة العصر فقد حبط عمله" - رواه البخاري',
    '💎 لا تدع أعمالك تلهيك عن صلاة العصر',
    '🕊️ صلاة العصر هي الصلاة الوسطى، حافظ عليها',
    '⭐ "حافظوا على الصلوات والصلاة الوسطى" - البقرة 238',
  ],
  maghrib: [
    '🤲 أفطر إن كنت صائماً وصلِّ المغرب، بارك الله في وقتك',
    '🌟 "ذهب الظمأ وابتلّت العروق وثبت الأجر إن شاء الله"',
    '💎 صلاة المغرب بداية المساء، اجعلها بداية طاعة',
    '🕊️ مع غروب الشمس تُفتح أبواب الرحمة، بادر بالصلاة',
    '⭐ لا تؤخر صلاة المغرب، فهي أقصر الصلوات وقتاً',
  ],
  isha: [
    '🤲 "من صلى العشاء في جماعة فكأنما قام نصف الليل" - رواه مسلم',
    '🌟 اختم يومك بصلاة العشاء ونم على طهارة',
    '💎 صلاة العشاء أمانك من النفاق، حافظ عليها',
    '🕊️ "استعينوا بالصلاة والصبر" - اختم يومك بالصلاة',
    '⭐ آخر صلوات اليوم، لا تنم قبل أدائها',
  ],
}

function getRandomMotivation(prayer: string): string {
  const motivations = PRAYER_MOTIVATIONS[prayer] || PRAYER_MOTIVATIONS.dhuhr
  return motivations[Math.floor(Math.random() * motivations.length)]
}

function isRamadan(): boolean {
  // Approximate Ramadan 2025: Feb 28 - Mar 30, 2026: Feb 18 - Mar 19
  // For accuracy, we check a broad window. Admins control via enabled flag anyway.
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const year = now.getFullYear()
  
  if (year === 2025) return (month === 2 && day >= 28) || month === 3
  if (year === 2026) return (month === 2 && day >= 17) || (month === 3 && day <= 20)
  if (year === 2027) return (month === 2 && day >= 7) || (month === 3 && day <= 9)
  return month === 3 // fallback
}

function buildPrayerMessage(prayer: string, prayerTime: string): string {
  const emoji = PRAYER_EMOJIS[prayer] || '🕌'
  const prayerName = PRAYER_NAMES[prayer] || prayer
  const motivation = getRandomMotivation(prayer)
  
  let message = `${emoji} <b>تذكير بصلاة ${prayerName}</b>\n\n` +
    `🕐 موعد الأذان: ${prayerTime}\n\n` +
    `${motivation}\n\n` +
    `🤲 حان وقت صلاة ${prayerName}، لا تنسَ ذكر الله`

  // Special Ramadan Maghrib message
  if (prayer === 'maghrib' && isRamadan()) {
    const iftarMessages = [
      '\n\n🌙✨ <b>نتمنى لك صياماً مقبولاً وإفطاراً هنيئاً!</b>\n🍽️ اللهم لك صمت وعلى رزقك أفطرت',
      '\n\n🌙✨ <b>مبارك عليك الإفطار!</b>\n🤲 اللهم إنك عفو تحب العفو فاعف عنا',
      '\n\n🌙✨ <b>هنيئاً لك الإفطار، تقبّل الله صيامك!</b>\n🍽️ ذهب الظمأ وابتلّت العروق وثبت الأجر إن شاء الله',
      '\n\n🌙✨ <b>أسأل الله أن يتقبل صيامك وقيامك!</b>\n🕊️ اللهم اجعلنا من عتقائك من النار في هذا الشهر',
    ]
    message += iftarMessages[Math.floor(Math.random() * iftarMessages.length)]
  }

  return message
}

const CITY_MAP: Record<string, { city: string; country: string }> = {
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
  'TR': { city: 'Istanbul', country: 'Turkey' },
  'PK': { city: 'Islamabad', country: 'Pakistan' },
  'MY': { city: 'Kuala Lumpur', country: 'Malaysia' },
  'ID': { city: 'Jakarta', country: 'Indonesia' },
}

async function getPrayerTimes(countryCode: string, date: Date): Promise<Record<string, string> | null> {
  try {
    const day = date.getDate()
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    const location = CITY_MAP[countryCode] || { city: 'Mecca', country: 'Saudi Arabia' }
    
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
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
    if (res.ok) {
      return await res.json()
    }
    return null
  } catch (err) {
    console.error('Failed to send telegram message:', err)
    return null
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
    let body: any = {}
    try { body = await req.json() } catch {}

    const testMode = body.test_mode === true
    const testEmployeeId = body.employee_id
    const testCountryCode = body.country_code
    const testPrayer = body.prayer // specific prayer to test

    // TEST MODE
    if (testMode) {
      const countryCode = testCountryCode || 'EG'
      const now = new Date()
      const prayerTimes = await getPrayerTimes(countryCode, now)
      
      if (!prayerTimes) {
        return new Response(JSON.stringify({ ok: false, error: 'Failed to fetch prayer times', country: countryCode }), { headers: corsHeaders })
      }

      let sentResult = null
      if (testEmployeeId && testPrayer) {
        const { data: emp } = await supabase
          .from('employees')
          .select('telegram_chat_id, company_id, full_name')
          .eq('id', testEmployeeId)
          .single()

        if (emp?.telegram_chat_id) {
          const { data: bot } = await supabase
            .from('telegram_bots')
            .select('bot_token')
            .eq('assigned_company_id', emp.company_id)
            .single()

          if (bot?.bot_token) {
            const prayerTime = prayerTimes[testPrayer] || '00:00'
            const message = buildPrayerMessage(testPrayer, prayerTime)
            sentResult = await sendTelegramMessage(bot.bot_token, emp.telegram_chat_id, message)
          } else {
            sentResult = { error: 'No bot token found for company' }
          }
        } else {
          sentResult = { error: 'Employee has no telegram_chat_id' }
        }
      }

      return new Response(JSON.stringify({
        ok: true,
        test_mode: true,
        country: countryCode,
        prayer_times: prayerTimes,
        tested_prayer: testPrayer,
        sent: sentResult,
      }), { headers: corsHeaders })
    }

    // NORMAL MODE: check each prayer individually
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name, country_code, prayer_reminders_enabled, prayer_reminders_prayers, prayer_reminder_minutes_before, timezone')
      .eq('prayer_reminders_enabled', true)
      .eq('is_deleted', false)

    if (error || !companies?.length) {
      return new Response(JSON.stringify({ ok: true, message: 'No companies with prayer reminders' }), { headers: corsHeaders })
    }

    console.log(`Found ${companies.length} companies with prayer reminders enabled`)
    let totalSent = 0

    for (const company of companies) {
      const countryCode = company.country_code || 'EG'
      const timezone = company.timezone || 'Africa/Cairo'
      const enabledPrayers = company.prayer_reminders_prayers || ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']

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

      const prayerTimes = await getPrayerTimes(countryCode, now)
      if (!prayerTimes) continue

      for (const prayer of enabledPrayers) {
        const prayerTime = prayerTimes[prayer]
        if (!prayerTime) continue

        const [pH, pM] = prayerTime.split(':').map(Number)
        const prayerTotalMinutes = pH * 60 + pM

        // Send reminder within a 5-minute window (cron runs every 5 min)
        const diff = currentTotalMinutes - prayerTotalMinutes
        if (diff >= 0 && diff < 5) {
          // Deduplicate: check if we already sent this prayer reminder today
          const today = new Date().toISOString().split('T')[0]
          const { data: alreadySent } = await supabase
            .from('telegram_messages')
            .select('id')
            .eq('company_id', company.id)
            .eq('message_type', 'prayer_reminder')
            .gte('created_at', `${today}T00:00:00`)
            .eq('metadata->>prayer', prayer)
            .limit(1)

          if (alreadySent && alreadySent.length > 0) {
            console.log(`Prayer ${prayer} already sent today for company ${company.name}, skipping`)
            continue
          }

          const { data: bot } = await supabase
            .from('telegram_bots')
            .select('bot_token')
            .eq('assigned_company_id', company.id)
            .single()

          if (!bot?.bot_token) continue

          const { data: employees } = await supabase
            .from('employees')
            .select('id, telegram_chat_id')
            .eq('company_id', company.id)
            .eq('is_active', true)
            .not('telegram_chat_id', 'is', null)

          if (!employees?.length) continue

          // Build message for THIS specific prayer only
          const message = buildPrayerMessage(prayer, prayerTime)

          for (const emp of employees) {
            if (emp.telegram_chat_id) {
              const result = await sendTelegramMessage(bot.bot_token, emp.telegram_chat_id, message)
              
              // Log to telegram_messages for chat history
              try {
                await supabase.from('telegram_messages').insert({
                  company_id: company.id,
                  employee_id: emp.id,
                  telegram_chat_id: emp.telegram_chat_id,
                  message_text: message.replace(/<[^>]*>/g, ''),
                  direction: 'outgoing',
                  message_type: 'prayer_reminder',
                  telegram_message_id: result?.result?.message_id || null,
                  metadata: { source: 'prayer-reminders', prayer }
                })
              } catch (logError) {
                console.error('Failed to log prayer message:', logError)
              }
              
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
