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
    const { action, token, otp, verificationType, employeeId, companyId, requestType, telegramChatId, locationLat, locationLng, credentialId, nextVerificationLevel } = await req.json()

    switch (action) {
      case 'initiate': {
        // Create a new pending verification session for authentication
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
            expires_at: expiresAt.toISOString(),
            verification_purpose: 'authentication',
            next_verification_level: nextVerificationLevel || 1
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

      case 'initiate-registration': {
        // Create a new pending session for biometric registration
        const verificationToken = crypto.randomUUID()
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes for registration

        const { error } = await supabase
          .from('biometric_pending_verifications')
          .insert({
            employee_id: employeeId,
            company_id: companyId,
            verification_token: verificationToken,
            request_type: requestType || 'registration',
            telegram_chat_id: telegramChatId,
            expires_at: expiresAt.toISOString(),
            verification_purpose: 'registration',
            next_verification_level: nextVerificationLevel || 1
          })

        if (error) {
          console.error('Failed to create registration session:', error)
          return new Response(
            JSON.stringify({ success: false, message: 'فشل إنشاء جلسة التسجيل' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, token: verificationToken, expiresAt: expiresAt.toISOString() }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'validate': {
        // Validate an existing authentication token
        const { data: pending, error } = await supabase
          .from('biometric_pending_verifications')
          .select(`
            *,
            employees!inner(id, full_name, biometric_verification_enabled, biometric_credential_id),
            companies!inner(id, biometric_verification_enabled, biometric_otp_fallback)
          `)
          .eq('verification_token', token)
          .eq('verification_purpose', 'authentication')
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
            otpFallbackEnabled: (pending as any).companies?.biometric_otp_fallback ?? true,
            credentialId: (pending as any).employees?.biometric_credential_id || null,
            nextVerificationLevel: pending.next_verification_level
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'validate-registration': {
        // Validate a registration token
        const { data: pending, error } = await supabase
          .from('biometric_pending_verifications')
          .select(`
            *,
            employees!inner(id, full_name, biometric_credential_id),
            companies!inner(id)
          `)
          .eq('verification_token', token)
          .eq('verification_purpose', 'registration')
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
            expiresAt: pending.expires_at
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'complete-registration': {
        // Complete biometric registration - save credential ID
        const { data: pending, error: pendingError } = await supabase
          .from('biometric_pending_verifications')
          .select('*')
          .eq('verification_token', token)
          .eq('verification_purpose', 'registration')
          .is('completed_at', null)
          .single()

        if (pendingError || !pending) {
          return new Response(
            JSON.stringify({ success: false, message: 'جلسة غير صالحة أو مكتملة' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Save credential ID to employee record
        const { error: updateError } = await supabase
          .from('employees')
          .update({
            biometric_credential_id: credentialId,
            biometric_registered_at: new Date().toISOString()
          })
          .eq('id', pending.employee_id)

        if (updateError) {
          console.error('Failed to save credential:', updateError)
          return new Response(
            JSON.stringify({ success: false, message: 'فشل حفظ البصمة' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Mark session as completed
        await supabase
          .from('biometric_pending_verifications')
          .update({ completed_at: new Date().toISOString() })
          .eq('id', pending.id)

        // Log the registration
        await supabase
          .from('biometric_verification_logs')
          .insert({
            employee_id: pending.employee_id,
            company_id: pending.company_id,
            verification_type: 'registration',
            success: true
          })

        // Notify employee via Telegram
        const { data: bot } = await supabase
          .from('telegram_bots')
          .select('bot_token')
          .eq('assigned_company_id', pending.company_id)
          .single()

        if (bot?.bot_token) {
          await sendTelegramMessage(
            bot.bot_token,
            pending.telegram_chat_id,
            `✅ <b>تم تسجيل بصمتك بنجاح!</b>\n\n` +
            `يمكنك الآن استخدام البصمة للتحقق من هويتك عند تسجيل الحضور والانصراف.\n\n` +
            `🔐 هويتك محمية بتقنية WebAuthn الآمنة.`
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
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
      employees!inner(id, full_name, telegram_chat_id, work_start_time, company_id, is_freelancer, hourly_rate, currency),
      companies!inner(id, work_start_time, timezone)
    `)
    .eq('verification_token', token)
    .is('completed_at', null)
    .single()

  if (pendingError || !pending) {
    return { success: false, message: 'جلسة غير صالحة أو مكتملة' }
  }

  const nextLevel = pending.next_verification_level || 1

  // Mark biometric as verified (but session not complete if level > 1)
  await supabase
    .from('biometric_pending_verifications')
    .update({ 
      biometric_verified_at: new Date().toISOString(),
      // Only mark as complete if level 1 (direct check-in/out)
      ...(nextLevel === 1 ? { completed_at: new Date().toISOString() } : {})
    })
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

  // Get bot token for messaging
  const { data: bot } = await supabase
    .from('telegram_bots')
    .select('bot_token')
    .eq('assigned_company_id', pending.company_id)
    .single()

  // If next level is > 1, just confirm biometric and tell user to continue in bot
  if (nextLevel > 1) {
    if (bot?.bot_token) {
      const requestTypeText = pending.request_type === 'check_in' ? 'الحضور' : 'الانصراف'
      const levelText = nextLevel === 2 ? 'موافقة المدير' : 'التحقق من الموقع'
      
      await sendTelegramMessage(
        bot.bot_token,
        pending.telegram_chat_id,
        `✅ <b>تم التحقق من هويتك بنجاح</b>\n\n` +
        `🔐 طريقة التحقق: ${verificationType === 'biometric' ? 'البصمة' : 'رمز OTP'}\n\n` +
        `📋 الخطوة التالية: ${levelText}\n` +
        `👆 اضغط على زر "${pending.request_type === 'check_in' ? '✅ تسجيل الحضور' : '🚪 تسجيل الانصراف'}" في البوت لإكمال ${requestTypeText}.`
      )
    }
    
    // Mark session as complete since we've notified the user
    await supabase
      .from('biometric_pending_verifications')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', pending.id)
    
    return { success: true, message: 'تم التحقق من هويتك. يرجى متابعة التسجيل من البوت.' }
  }

  // Level 1: Direct check-in/out
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
        check_in_latitude: pending.location_lat,
        check_in_longitude: pending.location_lng,
        notes: `تم التحقق بالبصمة (${verificationType})`
      })

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
      // Calculate work hours for freelancer earnings
      const employee = (pending as any).employees
      const isFreelancer = employee?.is_freelancer === true
      let freelancerNote = ''
      
      if (isFreelancer && employee?.hourly_rate && attendance.check_in_time) {
        const checkInDate = new Date(attendance.check_in_time)
        const checkOutDate = new Date(nowUtc)
        const totalMinutesWorked = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 60000)
        const hoursWorked = totalMinutesWorked / 60
        const earnings = hoursWorked * employee.hourly_rate
        const roundedEarnings = Math.round(earnings * 100) / 100
        const hours = Math.floor(totalMinutesWorked / 60)
        const mins = totalMinutesWorked % 60
        const monthKey = attendance.date.substring(0, 7) + '-01'
        
        // Insert salary adjustment for freelancer
        await supabase.from('salary_adjustments').insert({
          employee_id: pending.employee_id,
          company_id: pending.company_id,
          month: monthKey,
          bonus: roundedEarnings,
          deduction: 0,
          adjustment_days: null,
          description: `أجر عمل يوم ${attendance.date} - ${hours} ساعة و ${mins} دقيقة × ${employee.hourly_rate} ${employee.currency || 'EGP'}/ساعة`,
          added_by_name: 'النظام التلقائي',
          attendance_log_id: attendance.id,
          is_auto_generated: true
        })
        
        // Don't show hourly rate in message
        freelancerNote = `\n\n💰 <b>تم حساب مستحقاتك</b>\n` +
          `🕐 ساعات العمل: ${hours} ساعة و ${mins} دقيقة\n` +
          `✅ تم إضافة المبلغ لحسابك تلقائياً`
      }
      
      await supabase
        .from('attendance_logs')
        .update({
          check_out_time: nowUtc,
          status: 'checked_out'
        })
        .eq('id', attendance.id)

      if (bot?.bot_token) {
        await sendTelegramMessage(
          bot.bot_token,
          pending.telegram_chat_id,
          `✅ <b>تم تسجيل انصرافك بنجاح</b>\n\n` +
          `📅 التاريخ: ${today}\n` +
          `⏰ الوقت: ${checkTime}\n` +
          `🔐 طريقة التحقق: ${verificationType === 'biometric' ? 'البصمة' : 'رمز OTP'}` +
          freelancerNote
        )
      }
    }
  }

  return { success: true }
}
