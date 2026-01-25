import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotifyRequest {
  employee_id: string
  type: 'bonus' | 'deduction'
  action: 'add' | 'update' | 'delete'
  amount: number
  old_amount?: number
  days?: number
  description?: string
  added_by_name: string
  total_deductions?: number
  total_bonuses?: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const body: NotifyRequest = await req.json()
    const { 
      employee_id, 
      type, 
      action = 'add', 
      amount, 
      old_amount,
      days, 
      description, 
      added_by_name, 
      total_deductions, 
      total_bonuses 
    } = body

    console.log('notify-employee: received request', body)

    // Get employee info
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select(`
        id,
        full_name,
        telegram_chat_id,
        company_id,
        base_salary,
        companies!inner (
          telegram_bot_username
        )
      `)
      .eq('id', employee_id)
      .single()

    if (empError || !employee) {
      console.error('Employee not found:', empError)
      return new Response(JSON.stringify({ error: 'Employee not found' }), { 
        headers: corsHeaders,
        status: 404 
      })
    }

    if (!employee.telegram_chat_id) {
      console.log('Employee has no telegram_chat_id')
      return new Response(JSON.stringify({ success: false, reason: 'No telegram' }), { 
        headers: corsHeaders 
      })
    }

    const company = employee.companies as any

    // Get bot token
    const { data: bot } = await supabase
      .from('telegram_bots')
      .select('bot_token')
      .eq('bot_username', company?.telegram_bot_username)
      .single()

    if (!bot?.bot_token) {
      console.log('Bot not found')
      return new Response(JSON.stringify({ success: false, reason: 'No bot' }), { 
        headers: corsHeaders 
      })
    }

    // Build notification message based on action
    let message = ''
    const typeText = type === 'bonus' ? 'مكافأة' : 'خصم'
    
    if (action === 'delete') {
      // Deletion notification
      const emoji = '🗑️'
      message = `${emoji} <b>إلغاء ${typeText}</b>\n\n` +
        `📋 تم إلغاء ${typeText} بقيمة ${amount.toFixed(2)} ج.م\n` +
        (description ? `📝 السبب الأصلي: ${description}\n` : '') +
        `👤 بواسطة: ${added_by_name}`
    } else if (action === 'update') {
      // Update notification
      const emoji = '✏️'
      message = `${emoji} <b>تعديل ${typeText}</b>\n\n`
      
      if (old_amount !== undefined && old_amount !== amount) {
        message += `📋 تم تعديل قيمة ${typeText}\n` +
          `💰 القيمة القديمة: ${old_amount.toFixed(2)} ج.م\n` +
          `💰 القيمة الجديدة: ${amount.toFixed(2)} ج.م\n`
      } else {
        message += `📋 تم تعديل بيانات ${typeText}\n` +
          `💰 القيمة: ${amount.toFixed(2)} ج.م\n`
      }
      
      if (description) {
        message += `📝 السبب: ${description}\n`
      }
      message += `👤 بواسطة: ${added_by_name}`
    } else {
      // Add notification (original behavior)
      const emoji = type === 'bonus' ? '🎉' : '⚠️'
      
      if (days && days > 0) {
        const daysText = days === 0.25 ? 'ربع يوم' 
          : days === 0.5 ? 'نصف يوم'
          : days === 1 ? 'يوم واحد'
          : `${days} أيام`
        
        // For deductions with days, show only the duration, not the amount
        if (type === 'deduction') {
          message = `${emoji} <b>إشعار ${typeText}</b>\n\n` +
            `📋 ${added_by_name} سجّل لك ${typeText} ${daysText}\n` +
            (description ? `📝 السبب: ${description}` : '')
        } else {
          // For bonuses, still show the amount
          message = `${emoji} <b>إشعار ${typeText}</b>\n\n` +
            `📋 ${added_by_name} سجّل لك ${typeText} ${daysText}\n` +
            (description ? `📝 السبب: ${description}\n` : '') +
            `💰 القيمة: ${amount.toFixed(2)} ج.م`
        }
      } else {
        message = `${emoji} <b>إشعار ${typeText}</b>\n\n` +
          `📋 ${added_by_name} سجّل لك ${typeText}\n` +
          (description ? `📝 السبب: ${description}\n` : '') +
          `💰 القيمة: ${amount.toFixed(2)} ج.م`
      }

      // Add totals if available
      if (type === 'deduction' && total_deductions !== undefined) {
        message += `\n\n📊 إجمالي الخصومات هذا الشهر: ${total_deductions.toFixed(2)} ج.م`
      } else if (type === 'bonus' && total_bonuses !== undefined) {
        message += `\n\n📊 إجمالي المكافآت هذا الشهر: ${total_bonuses.toFixed(2)} ج.م`
      }
    }

    await sendAndLogMessage(supabase, bot.bot_token, employee, message)

    console.log(`Notification sent to ${employee.full_name} for action: ${action}`)

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })

  } catch (error) {
    console.error('Error in notify-employee:', error)
    return new Response(JSON.stringify({ error: String(error) }), { 
      headers: corsHeaders,
      status: 500 
    })
  }
})

async function sendAndLogMessage(
  supabase: any,
  botToken: string, 
  employee: any,
  text: string
) {
  const chatId = parseInt(employee.telegram_chat_id)
  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  }

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  let telegramMessageId = null
  if (res.ok) {
    const result = await res.json()
    telegramMessageId = result.result?.message_id
  } else {
    const txt = await res.text().catch(() => '')
    console.error('sendMessage failed', { status: res.status, body: txt })
  }

  // Log the message
  try {
    await supabase.from('telegram_messages').insert({
      company_id: employee.company_id,
      employee_id: employee.id,
      telegram_chat_id: employee.telegram_chat_id,
      message_text: text.replace(/<[^>]*>/g, ''), // Strip HTML
      direction: 'outgoing',
      message_type: 'notification',
      telegram_message_id: telegramMessageId,
      metadata: { source: 'notify-employee' }
    })
  } catch (logError) {
    console.error('Failed to log message:', logError)
  }
}
