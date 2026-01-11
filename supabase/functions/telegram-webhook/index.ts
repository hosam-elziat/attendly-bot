import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    from: { id: number; username?: string; first_name?: string; last_name?: string };
    text?: string;
    contact?: { phone_number: string };
  };
  callback_query?: {
    id: string;
    from: { id: number; username?: string };
    message: { chat: { id: number }; message_id: number };
    data: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const update: TelegramUpdate = await req.json()
    const chatId = update.message?.chat.id || update.callback_query?.message.chat.id
    const userId = update.message?.from.id || update.callback_query?.from.id

    if (!chatId || !userId) {
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }

    // Resolve bot username:
    // - Prefer explicit ?bot= query param (used by setWebhook in our app)
    // - Fallback to last path segment if it isn't the function name itself
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const lastSegment = pathParts[pathParts.length - 1]

    const botUsername =
      url.searchParams.get('bot') ||
      (lastSegment && lastSegment !== 'telegram-webhook' ? lastSegment : null)

    console.log('telegram-webhook: incoming', {
      path: url.pathname,
      botQuery: url.searchParams.get('bot'),
      resolvedBotUsername: botUsername,
      chatId,
      userId,
    })

    if (!botUsername) {
      return new Response(JSON.stringify({ ok: true, error: 'No bot specified' }), { headers: corsHeaders })
    }

    // Get bot info
    const { data: bot } = await supabase
      .from('telegram_bots')
      .select('bot_token, assigned_company_id')
      .eq('bot_username', botUsername)
      .single()

    if (!bot?.bot_token || !bot?.assigned_company_id) {
      return new Response(JSON.stringify({ ok: true, error: 'Bot not found' }), { headers: corsHeaders })
    }

    const botToken = bot.bot_token
    const companyId = bot.assigned_company_id
    const telegramChatId = String(chatId)

    // Check if employee exists
    const { data: employee } = await supabase
      .from('employees')
      .select('id, full_name, leave_balance, work_start_time, work_end_time')
      .eq('telegram_chat_id', telegramChatId)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single()

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      const callbackData = update.callback_query.data
      await answerCallbackQuery(botToken, update.callback_query.id)

      if (!employee) {
        // Handle join request actions for non-employees
        if (callbackData === 'join_request') {
          await sendMessage(botToken, chatId, 
            '📝 للانضمام، أرسل بياناتك بالصيغة التالية:\n\n' +
            '/join الاسم الكامل | البريد الإلكتروني | رقم الهاتف\n\n' +
            'مثال:\n/join أحمد محمد | ahmed@email.com | 0501234567'
          )
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
        }
        
        if (callbackData === 'check_status') {
          const { data: request } = await supabase
            .from('join_requests')
            .select('status, rejection_reason, created_at')
            .eq('telegram_chat_id', telegramChatId)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (request) {
            const statusText = request.status === 'pending' 
              ? '⏳ قيد المراجعة'
              : request.status === 'approved'
              ? '✅ تم القبول'
              : '❌ مرفوض' + (request.rejection_reason ? `\nالسبب: ${request.rejection_reason}` : '')
            
            await sendMessage(botToken, chatId, `📋 حالة طلبك: ${statusText}`)
          } else {
            await sendMessage(botToken, chatId, '❌ لم يتم العثور على طلب سابق')
          }
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
        }

        await sendWelcomeMessage(botToken, chatId, false)
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
      }

      // Employee actions
      const today = new Date().toISOString().split('T')[0]
      
      // Get today's attendance
      const { data: attendance } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('company_id', companyId)
        .eq('date', today)
        .single()

      switch (callbackData) {
        case 'check_in':
          if (attendance) {
            await sendMessage(botToken, chatId, '⚠️ لقد سجلت حضورك اليوم بالفعل!')
          } else {
            const now = new Date().toISOString()
            const checkInTime = now.split('T')[1].substring(0, 8)
            
            // Check if late
            let status: 'checked_in' | 'on_break' | 'checked_out' | 'absent' = 'checked_in'
            let notes = ''
            
            if (employee.work_start_time) {
              const workStart = employee.work_start_time
              if (checkInTime > workStart) {
                notes = `تأخر - موعد العمل: ${workStart}`
              }
            }

            await supabase.from('attendance_logs').insert({
              employee_id: employee.id,
              company_id: companyId,
              date: today,
              check_in_time: now,
              status,
              notes: notes || null
            })

            await sendMessage(botToken, chatId, 
              `✅ تم تسجيل حضورك بنجاح!\n\n` +
              `📅 التاريخ: ${today}\n` +
              `⏰ الوقت: ${checkInTime}\n` +
              (notes ? `📝 ${notes}` : ''),
              getEmployeeKeyboard()
            )
          }
          break

        case 'check_out':
          if (!attendance) {
            await sendMessage(botToken, chatId, '⚠️ لم تسجل حضورك اليوم بعد!')
          } else if (attendance.check_out_time) {
            await sendMessage(botToken, chatId, '⚠️ لقد سجلت انصرافك اليوم بالفعل!')
          } else {
            const now = new Date().toISOString()
            await supabase
              .from('attendance_logs')
              .update({ 
                check_out_time: now, 
                status: 'checked_out' 
              })
              .eq('id', attendance.id)

            await sendMessage(botToken, chatId, 
              `✅ تم تسجيل انصرافك بنجاح!\n\n` +
              `📅 التاريخ: ${today}\n` +
              `⏰ وقت الانصراف: ${now.split('T')[1].substring(0, 8)}`,
              getEmployeeKeyboard()
            )
          }
          break

        case 'start_break':
          if (!attendance) {
            await sendMessage(botToken, chatId, '⚠️ لم تسجل حضورك اليوم بعد!')
          } else if (attendance.status === 'on_break') {
            await sendMessage(botToken, chatId, '⚠️ أنت في استراحة بالفعل!')
          } else if (attendance.check_out_time) {
            await sendMessage(botToken, chatId, '⚠️ لقد سجلت انصرافك اليوم!')
          } else {
            const now = new Date().toISOString()
            
            // Create break log
            await supabase.from('break_logs').insert({
              attendance_id: attendance.id,
              start_time: now
            })

            // Update attendance status
            await supabase
              .from('attendance_logs')
              .update({ status: 'on_break' })
              .eq('id', attendance.id)

            await sendMessage(botToken, chatId, 
              `☕ بدأت الاستراحة\n\n⏰ الوقت: ${now.split('T')[1].substring(0, 8)}`,
              getEmployeeKeyboard()
            )
          }
          break

        case 'end_break':
          if (!attendance) {
            await sendMessage(botToken, chatId, '⚠️ لم تسجل حضورك اليوم بعد!')
          } else if (attendance.status !== 'on_break') {
            await sendMessage(botToken, chatId, '⚠️ أنت لست في استراحة!')
          } else {
            const now = new Date().toISOString()
            
            // Find active break and update it
            const { data: activeBreak } = await supabase
              .from('break_logs')
              .select('*')
              .eq('attendance_id', attendance.id)
              .is('end_time', null)
              .single()

            if (activeBreak) {
              const startTime = new Date(activeBreak.start_time)
              const endTime = new Date(now)
              const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000)

              await supabase
                .from('break_logs')
                .update({ 
                  end_time: now, 
                  duration_minutes: durationMinutes 
                })
                .eq('id', activeBreak.id)
            }

            // Update attendance status
            await supabase
              .from('attendance_logs')
              .update({ status: 'checked_in' })
              .eq('id', attendance.id)

            await sendMessage(botToken, chatId, 
              `✅ انتهت الاستراحة\n\n⏰ الوقت: ${now.split('T')[1].substring(0, 8)}`,
              getEmployeeKeyboard()
            )
          }
          break

        case 'request_leave':
          await sendMessage(botToken, chatId, 
            `📝 لطلب إجازة، أرسل بالصيغة التالية:\n\n` +
            `/leave نوع_الإجازة | تاريخ_البداية | تاريخ_النهاية | السبب\n\n` +
            `أنواع الإجازات: vacation (سنوية) | sick (مرضية) | personal (شخصية)\n\n` +
            `مثال:\n/leave vacation | 2025-01-15 | 2025-01-17 | إجازة عائلية\n\n` +
            `📊 رصيد إجازاتك الحالي: ${employee.leave_balance || 0} يوم`
          )
          break

        case 'my_status':
          let statusMsg = `👤 ${employee.full_name}\n\n`
          statusMsg += `📊 رصيد الإجازات: ${employee.leave_balance || 0} يوم\n\n`
          
          if (attendance) {
            const statusEmoji = attendance.status === 'checked_in' ? '🟢' 
              : attendance.status === 'on_break' ? '☕' 
              : attendance.status === 'checked_out' ? '🔴' : '❓'
            statusMsg += `حالتك اليوم: ${statusEmoji} ${getStatusText(attendance.status)}\n`
            statusMsg += `⏰ وقت الحضور: ${attendance.check_in_time?.split('T')[1]?.substring(0, 8) || '-'}\n`
            if (attendance.check_out_time) {
              statusMsg += `⏰ وقت الانصراف: ${attendance.check_out_time.split('T')[1].substring(0, 8)}\n`
            }
          } else {
            statusMsg += `📅 لم تسجل حضورك اليوم بعد`
          }

          await sendMessage(botToken, chatId, statusMsg, getEmployeeKeyboard())
          break
      }

      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }

    // Handle text messages
    const text = update.message?.text?.trim()
    
    if (!text) {
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }

    // Handle /start command
    if (text === '/start') {
      if (employee) {
        await sendMessage(botToken, chatId, 
          `مرحباً ${employee.full_name}! 👋\n\nاختر من الأزرار أدناه:`,
          getEmployeeKeyboard()
        )
      } else {
        await sendWelcomeMessage(botToken, chatId, false)
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }

    // Handle /join command for non-employees
    if (text.startsWith('/join') && !employee) {
      const parts = text.replace('/join', '').trim().split('|').map(p => p.trim())
      
      if (parts.length < 3) {
        await sendMessage(botToken, chatId, 
          '❌ صيغة غير صحيحة!\n\n' +
          'الصيغة الصحيحة:\n' +
          '/join الاسم الكامل | البريد الإلكتروني | رقم الهاتف\n\n' +
          'مثال:\n/join أحمد محمد | ahmed@email.com | 0501234567'
        )
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
      }

      const [fullName, email, phone, nationalId] = parts
      const username = update.message?.from.username

      // Check if request already exists
      const { data: existingRequest } = await supabase
        .from('join_requests')
        .select('id, status')
        .eq('telegram_chat_id', telegramChatId)
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .single()

      if (existingRequest) {
        await sendMessage(botToken, chatId, 
          '⚠️ لديك طلب قيد المراجعة بالفعل!\n\n' +
          'يمكنك التحقق من حالة طلبك بالضغط على "حالة طلبي"'
        )
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
      }

      // Create join request
      await supabase.from('join_requests').insert({
        company_id: companyId,
        telegram_chat_id: telegramChatId,
        telegram_username: username,
        full_name: fullName,
        email: email || null,
        phone: phone || null,
        national_id: nationalId || null
      })

      await sendMessage(botToken, chatId, 
        '✅ تم إرسال طلب الانضمام بنجاح!\n\n' +
        '⏳ سيتم مراجعة طلبك من قبل الإدارة.\n' +
        'يمكنك التحقق من حالة طلبك في أي وقت.'
      )
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }

    // Handle /leave command for employees
    if (text.startsWith('/leave') && employee) {
      const parts = text.replace('/leave', '').trim().split('|').map(p => p.trim())
      
      if (parts.length < 3) {
        await sendMessage(botToken, chatId, 
          '❌ صيغة غير صحيحة!\n\n' +
          'الصيغة الصحيحة:\n' +
          '/leave نوع_الإجازة | تاريخ_البداية | تاريخ_النهاية | السبب\n\n' +
          'أنواع الإجازات: vacation | sick | personal\n\n' +
          'مثال:\n/leave vacation | 2025-01-15 | 2025-01-17 | إجازة عائلية'
        )
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
      }

      const [leaveType, startDate, endDate, reason] = parts
      
      // Validate leave type
      const validTypes = ['vacation', 'sick', 'personal']
      if (!validTypes.includes(leaveType.toLowerCase())) {
        await sendMessage(botToken, chatId, 
          '❌ نوع إجازة غير صحيح!\n\n' +
          'الأنواع المتاحة: vacation | sick | personal'
        )
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
      }

      // Calculate days
      const start = new Date(startDate)
      const end = new Date(endDate)
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

      if (days <= 0) {
        await sendMessage(botToken, chatId, '❌ تاريخ النهاية يجب أن يكون بعد تاريخ البداية!')
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
      }

      // Create leave request
      await supabase.from('leave_requests').insert({
        employee_id: employee.id,
        company_id: companyId,
        leave_type: leaveType.toLowerCase() as 'vacation' | 'sick' | 'personal',
        start_date: startDate,
        end_date: endDate,
        days,
        reason: reason || null
      })

      await sendMessage(botToken, chatId, 
        `✅ تم إرسال طلب الإجازة بنجاح!\n\n` +
        `📋 النوع: ${getLeaveTypeText(leaveType)}\n` +
        `📅 من: ${startDate}\n` +
        `📅 إلى: ${endDate}\n` +
        `📊 عدد الأيام: ${days}\n` +
        (reason ? `📝 السبب: ${reason}\n` : '') +
        `\n⏳ سيتم مراجعة طلبك من قبل الإدارة.`,
        getEmployeeKeyboard()
      )
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }

    // Default response
    if (employee) {
      await sendMessage(botToken, chatId, 
        'اختر من الأزرار أدناه:',
        getEmployeeKeyboard()
      )
    } else {
      await sendWelcomeMessage(botToken, chatId, false)
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  }
})

// Helper functions
async function sendMessage(botToken: string, chatId: number, text: string, keyboard?: any) {
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  }

  if (keyboard) {
    body.reply_markup = keyboard
  }

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    console.error('telegram-webhook: sendMessage failed', { status: res.status, body: txt })
  }
}

async function answerCallbackQuery(botToken: string, callbackQueryId: string) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId })
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    console.error('telegram-webhook: answerCallbackQuery failed', { status: res.status, body: txt })
  }
}

async function sendWelcomeMessage(botToken: string, chatId: number, isEmployee: boolean) {
  if (isEmployee) {
    await sendMessage(botToken, chatId, 'مرحباً! 👋\n\nاختر من الأزرار أدناه:', getEmployeeKeyboard())
  } else {
    const keyboard = {
      inline_keyboard: [
        [{ text: '📝 طلب انضمام', callback_data: 'join_request' }],
        [{ text: '📋 حالة طلبي', callback_data: 'check_status' }]
      ]
    }
    await sendMessage(botToken, chatId, 
      'مرحباً! 👋\n\n' +
      'يبدو أنك لست مسجلاً بعد.\n' +
      'للانضمام، اضغط على "طلب انضمام" أدناه.',
      keyboard
    )
  }
}

function getEmployeeKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '✅ تسجيل حضور', callback_data: 'check_in' },
        { text: '🔴 تسجيل انصراف', callback_data: 'check_out' }
      ],
      [
        { text: '☕ بدء استراحة', callback_data: 'start_break' },
        { text: '↩️ إنهاء استراحة', callback_data: 'end_break' }
      ],
      [
        { text: '📝 طلب إجازة', callback_data: 'request_leave' }
      ],
      [
        { text: '📊 حالتي', callback_data: 'my_status' }
      ]
    ]
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'checked_in': return 'حاضر'
    case 'on_break': return 'في استراحة'
    case 'checked_out': return 'منصرف'
    case 'absent': return 'غائب'
    default: return status
  }
}

function getLeaveTypeText(type: string): string {
  switch (type.toLowerCase()) {
    case 'vacation': return 'إجازة سنوية'
    case 'sick': return 'إجازة مرضية'
    case 'personal': return 'إجازة شخصية'
    default: return type
  }
}
