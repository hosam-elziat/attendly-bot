import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { 
      attendance_log_id,
      old_check_in_time,
      new_check_in_time,
      editor_name
    } = await req.json()

    console.log('Processing attendance edit:', { attendance_log_id, old_check_in_time, new_check_in_time })

    if (!attendance_log_id) {
      return new Response(
        JSON.stringify({ error: 'Missing attendance_log_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the attendance log with employee info
    const { data: attendanceLog, error: logError } = await supabase
      .from('attendance_logs')
      .select(`
        *,
        employees (
          id,
          full_name,
          telegram_chat_id,
          company_id,
          work_start_time,
          base_salary,
          currency,
          monthly_late_balance_minutes
        )
      `)
      .eq('id', attendance_log_id)
      .single()

    if (logError || !attendanceLog) {
      console.error('Attendance log not found:', logError)
      return new Response(
        JSON.stringify({ error: 'Attendance log not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const employee = attendanceLog.employees
    const companyId = employee.company_id

    // Get company policies
    const { data: company } = await supabase
      .from('companies')
      .select('late_under_15_deduction, late_15_to_30_deduction, late_over_30_deduction, monthly_late_allowance_minutes, timezone')
      .eq('id', companyId)
      .single()

    // Get bot token for notifications
    const { data: bot } = await supabase
      .from('telegram_bots')
      .select('bot_token')
      .eq('assigned_company_id', companyId)
      .single()

    const botToken = bot?.bot_token

    // Find existing auto-generated deduction for this attendance log
    const { data: existingDeduction } = await supabase
      .from('salary_adjustments')
      .select('*')
      .eq('attendance_log_id', attendance_log_id)
      .eq('is_auto_generated', true)
      .single()

    const monthKey = attendanceLog.date.substring(0, 7) + '-01'
    const workStartTime = employee.work_start_time || '09:00:00'
    const [startH, startM] = workStartTime.split(':').map(Number)

    // Calculate late minutes for new time
    const newCheckInTime = new Date(new_check_in_time)
    const expectedStart = new Date(newCheckInTime)
    expectedStart.setHours(startH, startM, 0, 0)

    const newLateMinutes = newCheckInTime > expectedStart 
      ? Math.floor((newCheckInTime.getTime() - expectedStart.getTime()) / 60000)
      : 0

    // Calculate late minutes for old time (if provided)
    let oldLateMinutes = 0
    if (old_check_in_time) {
      const oldCheckInTime = new Date(old_check_in_time)
      const oldExpectedStart = new Date(oldCheckInTime)
      oldExpectedStart.setHours(startH, startM, 0, 0)
      oldLateMinutes = oldCheckInTime > oldExpectedStart
        ? Math.floor((oldCheckInTime.getTime() - oldExpectedStart.getTime()) / 60000)
        : 0
    }

    console.log('Late minutes calculation:', { oldLateMinutes, newLateMinutes })

    // Get current monthly late balance
    let currentLateBalance = employee.monthly_late_balance_minutes ?? company?.monthly_late_allowance_minutes ?? 60
    
    // Track changes for notification
    let notificationMessage = ''
    let balanceChange = 0

    // If there was an existing deduction, we need to handle the reversal
    if (existingDeduction) {
      console.log('Found existing deduction:', existingDeduction)
      
      // Check if old late was <= 15 minutes (used balance)
      if (oldLateMinutes > 0 && oldLateMinutes <= 15) {
        // Restore the balance that was used
        const balanceUsedBefore = Math.min(oldLateMinutes, company?.monthly_late_allowance_minutes || 60)
        // Only restore if there was no monetary deduction for this
        if (!existingDeduction.deduction || existingDeduction.deduction === 0) {
          // Balance was used, restore it
          currentLateBalance = Math.min(
            currentLateBalance + oldLateMinutes,
            company?.monthly_late_allowance_minutes || 60
          )
          balanceChange = oldLateMinutes
        }
      }
      
      // Delete the existing deduction
      await supabase
        .from('salary_adjustments')
        .delete()
        .eq('id', existingDeduction.id)
      
      notificationMessage = `✏️ تم تعديل موعد حضورك\n📅 التاريخ: ${attendanceLog.date}\n⏰ الوقت القديم: ${new Date(old_check_in_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}\n⏰ الوقت الجديد: ${new Date(new_check_in_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}\n`
      
      if (existingDeduction.deduction && existingDeduction.deduction > 0) {
        notificationMessage += `\n✅ تم إلغاء خصم ${existingDeduction.adjustment_days} يوم`
      }
    } else {
      notificationMessage = `✏️ تم تعديل موعد حضورك\n📅 التاريخ: ${attendanceLog.date}\n⏰ الوقت الجديد: ${new Date(new_check_in_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}\n`
    }

    // Calculate new deduction if still late
    let newDeductionDays = 0
    let deductionText = ''
    
    if (newLateMinutes > 30 && company?.late_over_30_deduction) {
      // More than 30 minutes - direct deduction
      newDeductionDays = company.late_over_30_deduction
      deductionText = `تأخر أكثر من 30 دقيقة`
    } else if (newLateMinutes > 15 && company?.late_15_to_30_deduction) {
      // 15-30 minutes - direct deduction
      newDeductionDays = company.late_15_to_30_deduction
      deductionText = `تأخر من 15 إلى 30 دقيقة`
    } else if (newLateMinutes > 0 && newLateMinutes <= 15) {
      // Less than 15 minutes - use monthly balance
      if (currentLateBalance >= newLateMinutes) {
        // Enough balance - deduct from balance
        currentLateBalance -= newLateMinutes
        balanceChange -= newLateMinutes
        notificationMessage += `\n⏱️ التأخير الجديد: ${newLateMinutes} دقيقة\n✅ تم خصم من رصيد السماحية\n📊 رصيدك المتبقي: ${currentLateBalance} دقيقة`
      } else if (currentLateBalance > 0) {
        // Partial balance - use what's left
        const balanceUsed = currentLateBalance
        currentLateBalance = 0
        balanceChange -= balanceUsed
        
        // Apply deduction for remaining
        if (company?.late_under_15_deduction) {
          newDeductionDays = company.late_under_15_deduction
          deductionText = `تأخر أقل من 15 دقيقة (رصيد السماحية منتهي)`
        }
        notificationMessage += `\n⏱️ التأخير: ${newLateMinutes} دقيقة\n⚠️ تم استخدام آخر ${balanceUsed} دقيقة من الرصيد`
      } else {
        // No balance - apply deduction
        if (company?.late_under_15_deduction) {
          newDeductionDays = company.late_under_15_deduction
          deductionText = `تأخر أقل من 15 دقيقة`
        }
      }
    }

    // Update employee's late balance if changed
    if (balanceChange !== 0) {
      const newBalance = Math.max(0, Math.min(
        (employee.monthly_late_balance_minutes ?? company?.monthly_late_allowance_minutes ?? 60) + balanceChange,
        company?.monthly_late_allowance_minutes || 60
      ))
      
      await supabase
        .from('employees')
        .update({ monthly_late_balance_minutes: newBalance })
        .eq('id', employee.id)
    }

    // Create new deduction if applicable
    if (newDeductionDays > 0) {
      const baseSalary = employee.base_salary || 0
      const dailyRate = baseSalary / 30
      const deductionAmount = dailyRate * newDeductionDays

      await supabase.from('salary_adjustments').insert({
        employee_id: employee.id,
        company_id: companyId,
        month: monthKey,
        deduction: deductionAmount,
        bonus: 0,
        adjustment_days: newDeductionDays,
        description: `خصم تأخير - ${deductionText} (${newLateMinutes} دقيقة) - تعديل يدوي بواسطة ${editor_name || 'المدير'}`,
        added_by_name: 'النظام التلقائي',
        attendance_log_id: attendance_log_id,
        is_auto_generated: true
      })

      notificationMessage += `\n📛 تم تطبيق خصم ${newDeductionDays} يوم\n📝 السبب: ${deductionText}`
    } else if (newLateMinutes === 0) {
      notificationMessage += `\n✅ لا يوجد تأخير - في الوقت المحدد`
    }

    notificationMessage += `\n\n👤 المعدّل: ${editor_name || 'المدير'}`

    // Update attendance log notes
    const notes = newLateMinutes > 0 
      ? `تعديل يدوي - تأخر ${newLateMinutes} دقيقة - موعد العمل: ${workStartTime}`
      : `تعديل يدوي - في الوقت - موعد العمل: ${workStartTime}`
    
    await supabase
      .from('attendance_logs')
      .update({ notes })
      .eq('id', attendance_log_id)

    // Send notification to employee
    if (botToken && employee.telegram_chat_id) {
      await sendMessage(botToken, parseInt(employee.telegram_chat_id), notificationMessage)
      console.log('Notification sent to employee:', employee.full_name)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        old_late_minutes: oldLateMinutes,
        new_late_minutes: newLateMinutes,
        deduction_days: newDeductionDays,
        balance_change: balanceChange,
        notification_sent: !!botToken && !!employee.telegram_chat_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error processing attendance edit:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function sendMessage(botToken: string, chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML'
    })
  })

  if (!response.ok) {
    console.error('Failed to send message:', await response.text())
  }
}
