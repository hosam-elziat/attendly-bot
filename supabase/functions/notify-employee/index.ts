import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotifyRequest {
  employee_id: string
  type: 'bonus' | 'deduction'
  amount: number
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
    const { employee_id, type, amount, days, description, added_by_name, total_deductions, total_bonuses } = body

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

    // Build notification message
    let message = ''
    const typeText = type === 'bonus' ? 'مكافأة' : 'خصم'
    const emoji = type === 'bonus' ? '🎉' : '⚠️'

    if (days && days > 0) {
      const daysText = days === 0.25 ? 'ربع يوم' 
        : days === 0.5 ? 'نصف يوم'
        : days === 1 ? 'يوم واحد'
        : `${days} أيام`
      
      message = `${emoji} <b>إشعار ${typeText}</b>\n\n` +
        `📋 ${added_by_name} سجّل لك ${typeText} ${daysText}\n` +
        (description ? `📝 السبب: ${description}\n` : '') +
        `💰 القيمة: ${amount.toFixed(2)} ج.م`
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

    await sendMessage(bot.bot_token, parseInt(employee.telegram_chat_id), message)

    console.log(`Notification sent to ${employee.full_name}`)

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })

  } catch (error) {
    console.error('Error in notify-employee:', error)
    return new Response(JSON.stringify({ error: String(error) }), { 
      headers: corsHeaders,
      status: 500 
    })
  }
})

async function sendMessage(botToken: string, chatId: number, text: string) {
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

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    console.error('sendMessage failed', { status: res.status, body: txt })
  }
}
