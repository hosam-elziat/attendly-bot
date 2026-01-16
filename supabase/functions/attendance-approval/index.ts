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
      pending_id, 
      action, // 'approve' | 'reject' | 'modify'
      new_time, // For modify action
      rejection_reason,
      manager_chat_id,
      manager_name
    } = await req.json()

    if (!pending_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the pending attendance request
    const { data: pendingRequest, error: pendingError } = await supabase
      .from('pending_attendance')
      .select(`
        *,
        employees (
          id,
          full_name,
          telegram_chat_id,
          company_id,
          work_start_time,
          work_end_time,
          base_salary,
          currency
        )
      `)
      .eq('id', pending_id)
      .single()

    if (pendingError || !pendingRequest) {
      console.error('Pending request not found:', pendingError)
      return new Response(
        JSON.stringify({ error: 'Request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (pendingRequest.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Request already processed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const employee = pendingRequest.employees
    const companyId = employee.company_id

    // Get bot token
    const { data: bot } = await supabase
      .from('telegram_bots')
      .select('bot_token')
      .eq('assigned_company_id', companyId)
      .single()

    if (!bot?.bot_token) {
      return new Response(
        JSON.stringify({ error: 'Bot not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const botToken = bot.bot_token
    let attendanceTime = pendingRequest.requested_time
    let message = ''
    let notifyEmployee = true

    if (action === 'approve' || action === 'modify') {
      // Use new time if provided (modify action)
      if (action === 'modify' && new_time) {
        attendanceTime = new_time
      }

      // Get company policies for late deduction
      const { data: company } = await supabase
        .from('companies')
        .select('late_under_15_deduction, late_15_to_30_deduction, late_over_30_deduction, timezone')
        .eq('id', companyId)
        .single()

      const today = new Date().toISOString().split('T')[0]

      if (pendingRequest.request_type === 'check_in') {
        // Create attendance log
        const { data: newAttendance, error: attendanceError } = await supabase
          .from('attendance_logs')
          .insert({
            employee_id: employee.id,
            company_id: companyId,
            date: today,
            check_in_time: attendanceTime,
            status: 'checked_in',
            notes: action === 'modify' 
              ? `تم تعديل الوقت بواسطة ${manager_name || 'المدير'}`
              : null
          })
          .select('id')
          .single()

        if (attendanceError) {
          console.error('Failed to create attendance:', attendanceError)
          throw attendanceError
        }

        // Check for lateness and apply deductions
        const checkInTime = new Date(attendanceTime)
        const workStartTime = employee.work_start_time || '09:00:00'
        const [startH, startM] = workStartTime.split(':').map(Number)
        
        const expectedStart = new Date(checkInTime)
        expectedStart.setHours(startH, startM, 0, 0)

        if (checkInTime > expectedStart) {
          const lateMinutes = Math.floor((checkInTime.getTime() - expectedStart.getTime()) / 60000)
          
          let deductionDays = 0
          let deductionText = ''
          
          if (lateMinutes > 30 && company?.late_over_30_deduction) {
            deductionDays = company.late_over_30_deduction
            deductionText = `تأخر أكثر من 30 دقيقة`
          } else if (lateMinutes > 15 && company?.late_15_to_30_deduction) {
            deductionDays = company.late_15_to_30_deduction
            deductionText = `تأخر من 15 إلى 30 دقيقة`
          } else if (lateMinutes > 0 && company?.late_under_15_deduction) {
            deductionDays = company.late_under_15_deduction
            deductionText = `تأخر أقل من 15 دقيقة`
          }

          if (deductionDays > 0) {
            const baseSalary = employee.base_salary || 0
            const dailyRate = baseSalary / 30
            const deductionAmount = dailyRate * deductionDays
            const monthKey = today.substring(0, 7) + '-01'

            await supabase.from('salary_adjustments').insert({
              employee_id: employee.id,
              company_id: companyId,
              month: monthKey,
              deduction: deductionAmount,
              bonus: 0,
              adjustment_days: deductionDays,
              description: `خصم تأخير - ${deductionText} (${lateMinutes} دقيقة) - تمت الموافقة بواسطة ${manager_name || 'المدير'}`,
              added_by_name: 'النظام التلقائي',
              attendance_log_id: newAttendance.id,
              is_auto_generated: true
            })
          }
        }

        message = action === 'modify'
          ? `✅ تم قبول حضورك بوقت معدّل: ${new Date(attendanceTime).toLocaleTimeString('ar-EG')}\n👤 المعتمد: ${manager_name || 'المدير'}`
          : `✅ تم اعتماد حضورك!\n📅 التاريخ: ${today}\n⏰ الوقت: ${new Date(attendanceTime).toLocaleTimeString('ar-EG')}\n👤 المعتمد: ${manager_name || 'المدير'}`

      } else if (pendingRequest.request_type === 'check_out') {
        // Update attendance log with checkout time
        const { error: updateError } = await supabase
          .from('attendance_logs')
          .update({
            check_out_time: attendanceTime,
            status: 'checked_out'
          })
          .eq('employee_id', employee.id)
          .eq('company_id', companyId)
          .eq('date', today)
          .is('check_out_time', null)

        if (updateError) {
          console.error('Failed to update attendance:', updateError)
          throw updateError
        }

        message = `✅ تم اعتماد انصرافك!\n📅 التاريخ: ${today}\n⏰ الوقت: ${new Date(attendanceTime).toLocaleTimeString('ar-EG')}\n👤 المعتمد: ${manager_name || 'المدير'}`
      }

      // Update pending request status
      await supabase
        .from('pending_attendance')
        .update({
          status: 'approved',
          approved_time: attendanceTime,
          reviewed_at: new Date().toISOString(),
          notes: action === 'modify' ? `تم تعديل الوقت من ${pendingRequest.requested_time} إلى ${attendanceTime}` : null
        })
        .eq('id', pending_id)

    } else if (action === 'reject') {
      // Update pending request as rejected
      await supabase
        .from('pending_attendance')
        .update({
          status: 'rejected',
          rejection_reason: rejection_reason || 'تم الرفض من قبل المدير',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', pending_id)

      message = `❌ تم رفض طلب ${pendingRequest.request_type === 'check_in' ? 'الحضور' : 'الانصراف'}\n📝 السبب: ${rejection_reason || 'غير محدد'}\n👤 بواسطة: ${manager_name || 'المدير'}`
    }

    // Notify employee
    if (notifyEmployee && employee.telegram_chat_id) {
      await sendMessage(botToken, parseInt(employee.telegram_chat_id), message)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        action,
        employee_name: employee.full_name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error processing attendance approval:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
    )
  }
})

async function sendMessage(botToken: string, chatId: number, text: string, keyboard?: any) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: keyboard
    })
  })

  if (!response.ok) {
    console.error('Failed to send message:', await response.text())
  }
}
