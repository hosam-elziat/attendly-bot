import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate a random 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Send message via Telegram
async function sendTelegramMessage(botToken: string, chatId: string, text: string, keyboard?: any) {
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  }
  
  if (keyboard) {
    body.reply_markup = keyboard
  }
  
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { action, token, otp, verificationType, employeeId, companyId, requestType, telegramChatId, locationLat, locationLng } = await req.json()

    switch (action) {
      case 'initiate': {
        // Create a new pending verification session
        const verificationToken = crypto.randomUUID()
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

        const { error } = await supabase
          .from('biometric_pending_verifications')
          .insert({
            employee_id: employeeId,
            company_id: companyId,
            verification_token: verificationToken,
            request_type: requestType,
            telegram_chat_id: telegramChatId,
            location_lat: locationLat || null,
            location_lng: locationLng || null,
            expires_at: expiresAt.toISOString()
          })

        if (error) {
          console.error('Failed to create verification:', error)
          return new Response(
            JSON.stringify({ success: false, message: 'فشل إنشاء جلسة التحقق' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, token: verificationToken, expiresAt: expiresAt.toISOString() }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'validate': {
        // Validate an existing token
        const { data: pending, error } = await supabase
          .from('biometric_pending_verifications')
          .select(`
            *,
            employees!inner(id, full_name, biometric_verification_enabled),
            companies!inner(id, biometric_verification_enabled, biometric_otp_fallback)
          `)
          .eq('verification_token', token)
          .is('completed_at', null)
          .single()

        if (error || !pending) {
          return new Response(
            JSON.stringify({ valid: false, message: 'رابط غير صالح أو تم استخدامه مسبقاً' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const now = new Date()
        const expiresAt = new Date(pending.expires_at)

        if (now > expiresAt) {
          return new Response(
            JSON.stringify({ valid: false, expired: true, message: 'انتهت صلاحية الرابط' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            valid: true,
            employeeId: pending.employee_id,
            employeeName: (pending as any).employees?.full_name || '',
            companyId: pending.company_id,
            requestType: pending.request_type,
            expiresAt: pending.expires_at,
            otpFallbackEnabled: (pending as any).companies?.biometric_otp_fallback ?? true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'send-otp': {
        // Get pending verification
        const { data: pending, error: pendingError } = await supabase
          .from('biometric_pending_verifications')
          .select(`
            *,
            employees!inner(id, telegram_chat_id, company_id),
            companies!inner(id)
          `)
          .eq('verification_token', token)
          .is('completed_at', null)
          .single()

        if (pendingError || !pending) {
          return new Response(
            JSON.stringify({ success: false, message: 'جلسة غير صالحة' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get bot token for this company
        const { data: bot } = await supabase
          .from('telegram_bots')
          .select('bot_token')
          .eq('assigned_company_id', pending.company_id)
          .single()

        if (!bot?.bot_token) {
          return new Response(
            JSON.stringify({ success: false, message: 'بوت التيليجرام غير متاح' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Generate OTP
        const otpCode = generateOTP()
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

        // Store OTP
        await supabase
          .from('biometric_otp_codes')
          .insert({
            employee_id: pending.employee_id,
            company_id: pending.company_id,
            otp_code: otpCode,
            request_type: pending.request_type,
            verification_token: token,
            expires_at: otpExpiresAt.toISOString()
          })

        // Send OTP via Telegram
        await sendTelegramMessage(
          bot.bot_token,
          pending.telegram_chat_id,
          `🔐 <b>رمز التحقق</b>\n\n` +
          `رمزك هو: <code>${otpCode}</code>\n\n` +
          `⏰ صالح لمدة 5 دقائق\n\n` +
          `⚠️ لا تشارك هذا الرمز مع أي شخص`
        )

        return new Response(
          JSON.stringify({ success: true, expiresAt: otpExpiresAt.toISOString() }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'verify-otp': {
        // Verify OTP code
        const { data: otpRecord, error: otpError } = await supabase
          .from('biometric_otp_codes')
          .select('*')
          .eq('verification_token', token)
          .is('used_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (otpError || !otpRecord) {
          return new Response(
            JSON.stringify({ success: false, message: 'لم يتم العثور على رمز التحقق' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check if expired
        const now = new Date()
        const expiresAt = new Date(otpRecord.expires_at)
        if (now > expiresAt) {
          return new Response(
            JSON.stringify({ success: false, message: 'انتهت صلاحية الرمز' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check attempts
        if ((otpRecord.attempts || 0) >= 3) {
          return new Response(
            JSON.stringify({ success: false, message: 'تجاوزت الحد الأقصى للمحاولات' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verify OTP
        if (otpRecord.otp_code !== otp) {
          // Increment attempts
          await supabase
            .from('biometric_otp_codes')
            .update({ attempts: (otpRecord.attempts || 0) + 1 })
            .eq('id', otpRecord.id)

          return new Response(
            JSON.stringify({ success: false, message: 'رمز غير صحيح' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Mark OTP as used
        await supabase
          .from('biometric_otp_codes')
          .update({ used_at: new Date().toISOString() })
          .eq('id', otpRecord.id)

        // Complete the verification
        const completeResult = await completeVerification(supabase, token, 'otp')
        
        return new Response(
          JSON.stringify(completeResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'complete': {
        // Complete biometric verification
        const result = await completeVerification(supabase, token, verificationType || 'biometric')
        
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Biometric verification error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function completeVerification(supabase: any, token: string, verificationType: string) {
  // Get pending verification
  const { data: pending, error: pendingError } = await supabase
    .from('biometric_pending_verifications')
    .select(`
      *,
      employees!inner(id, full_name, telegram_chat_id, work_start_time, company_id),
      companies!inner(id, work_start_time, timezone)
    `)
    .eq('verification_token', token)
    .is('completed_at', null)
    .single()

  if (pendingError || !pending) {
    return { success: false, message: 'جلسة غير صالحة أو مكتملة' }
  }

  // Mark as completed
  await supabase
    .from('biometric_pending_verifications')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', pending.id)

  // Log the verification
  await supabase
    .from('biometric_verification_logs')
    .insert({
      employee_id: pending.employee_id,
      company_id: pending.company_id,
      verification_type: verificationType,
      success: true
    })

  // Get company timezone
  const timezone = (pending as any).companies?.timezone || 'Africa/Cairo'
  
  // Get current local time
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  const parts = formatter.formatToParts(now)
  const getValue = (type: string) => parts.find(p => p.type === type)?.value || ''
  
  const today = `${getValue('year')}-${getValue('month')}-${getValue('day')}`
  const checkTime = `${getValue('hour')}:${getValue('minute')}:${getValue('second')}`
  const nowUtc = now.toISOString()

  if (pending.request_type === 'check_in') {
    // Create attendance record
    await supabase
      .from('attendance_logs')
      .insert({
        employee_id: pending.employee_id,
        company_id: pending.company_id,
        date: today,
        check_in_time: nowUtc,
        status: 'checked_in',
        location_lat: pending.location_lat,
        location_lng: pending.location_lng,
        notes: `تم التحقق بالبصمة (${verificationType})`
      })

    // Send confirmation via Telegram
    const { data: bot } = await supabase
      .from('telegram_bots')
      .select('bot_token')
      .eq('assigned_company_id', pending.company_id)
      .single()

    if (bot?.bot_token) {
      await sendTelegramMessage(
        bot.bot_token,
        pending.telegram_chat_id,
        `✅ <b>تم تسجيل حضورك بنجاح</b>\n\n` +
        `📅 التاريخ: ${today}\n` +
        `⏰ الوقت: ${checkTime}\n` +
        `🔐 طريقة التحقق: ${verificationType === 'biometric' ? 'البصمة' : 'رمز OTP'}`
      )
    }
  } else if (pending.request_type === 'check_out') {
    // Update attendance record
    const { data: attendance } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('employee_id', pending.employee_id)
      .eq('company_id', pending.company_id)
      .is('check_out_time', null)
      .order('date', { ascending: false })
      .limit(1)
      .single()

    if (attendance) {
      await supabase
        .from('attendance_logs')
        .update({
          check_out_time: nowUtc,
          status: 'checked_out'
        })
        .eq('id', attendance.id)

      // Send confirmation via Telegram
      const { data: bot } = await supabase
        .from('telegram_bots')
        .select('bot_token')
        .eq('assigned_company_id', pending.company_id)
        .single()

      if (bot?.bot_token) {
        await sendTelegramMessage(
          bot.bot_token,
          pending.telegram_chat_id,
          `✅ <b>تم تسجيل انصرافك بنجاح</b>\n\n` +
          `📅 التاريخ: ${today}\n` +
          `⏰ الوقت: ${checkTime}\n` +
          `🔐 طريقة التحقق: ${verificationType === 'biometric' ? 'البصمة' : 'رمز OTP'}`
        )
      }
    }
  }

  return { success: true }
}
