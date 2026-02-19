import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPTION_LABELS: Record<string, string> = {
  a: 'أ',
  b: 'ب',
  c: 'ج',
  d: 'د',
}

async function sendTelegramMessage(botToken: string, chatId: string, text: string, keyboard?: any) {
  try {
    const body: any = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }
    if (keyboard) {
      body.reply_markup = JSON.stringify(keyboard)
    }
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
    const today = new Date().toISOString().split('T')[0]

    // Get all companies with quiz enabled
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name, country_code, ramadan_quiz_enabled, timezone')
      .eq('ramadan_quiz_enabled', true)
      .eq('is_deleted', false)

    if (error || !companies?.length) {
      return new Response(JSON.stringify({ ok: true, message: 'No companies with quiz enabled' }), { headers: corsHeaders })
    }

    let totalSent = 0

    for (const company of companies) {
      // Check if quiz already sent today
      const { data: existingQuiz } = await supabase
        .from('ramadan_daily_quiz')
        .select('id')
        .eq('company_id', company.id)
        .eq('quiz_date', today)
        .maybeSingle()

      if (existingQuiz) continue

      // Get a random question not used by this company recently
      const { data: usedQuestionIds } = await supabase
        .from('ramadan_daily_quiz')
        .select('question_id')
        .eq('company_id', company.id)
        .order('quiz_date', { ascending: false })
        .limit(50)

      const usedIds = (usedQuestionIds || []).map((q: any) => q.question_id)

      let query = supabase
        .from('ramadan_quiz_questions')
        .select('*')

      if (usedIds.length > 0) {
        query = query.not('id', 'in', `(${usedIds.join(',')})`)
      }

      const { data: questions } = await query.limit(10)

      if (!questions?.length) {
        // If all questions used, reset and pick any
        const { data: allQuestions } = await supabase
          .from('ramadan_quiz_questions')
          .select('*')
          .limit(10)
        
        if (!allQuestions?.length) continue
        
        const question = allQuestions[Math.floor(Math.random() * allQuestions.length)]
        await sendQuizToCompany(supabase, company, question, today)
        totalSent++
        continue
      }

      const question = questions[Math.floor(Math.random() * questions.length)]
      await sendQuizToCompany(supabase, company, question, today)
      totalSent++
    }

    return new Response(JSON.stringify({ ok: true, quizzesSent: totalSent }), { headers: corsHeaders })
  } catch (err) {
    console.error('Ramadan quiz error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

async function sendQuizToCompany(supabase: any, company: any, question: any, today: string) {
  // Create daily quiz record
  const { data: dailyQuiz, error: insertError } = await supabase
    .from('ramadan_daily_quiz')
    .insert({
      company_id: company.id,
      question_id: question.id,
      quiz_date: today,
      sent_at: new Date().toISOString(),
      is_active: true,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('Failed to create daily quiz:', insertError)
    return
  }

  // Get bot for this company
  const { data: bot } = await supabase
    .from('telegram_bots')
    .select('bot_token')
    .eq('assigned_company_id', company.id)
    .single()

  if (!bot?.bot_token) return

  // Get all active employees with telegram
  const { data: employees } = await supabase
    .from('employees')
    .select('telegram_chat_id')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .not('telegram_chat_id', 'is', null)

  if (!employees?.length) return

  const quizMessage = `🌙 <b>مسابقة رمضان اليومية</b> 🕌\n\n` +
    `❓ <b>${question.question_text}</b>\n\n` +
    `أ) ${question.option_a}\n` +
    `ب) ${question.option_b}\n` +
    `ج) ${question.option_c}\n` +
    `د) ${question.option_d}\n\n` +
    `⚡ أول إجابة صحيحة = <b>100 نقطة</b>\n` +
    `⭐ ثاني إجابة صحيحة = <b>50 نقطة</b>\n` +
    `✨ باقي الإجابات الصحيحة = <b>50 نقطة</b>`

  const keyboard = {
    inline_keyboard: [
      [
        { text: 'أ', callback_data: `quiz_answer_${dailyQuiz.id}_a` },
        { text: 'ب', callback_data: `quiz_answer_${dailyQuiz.id}_b` },
      ],
      [
        { text: 'ج', callback_data: `quiz_answer_${dailyQuiz.id}_c` },
        { text: 'د', callback_data: `quiz_answer_${dailyQuiz.id}_d` },
      ],
    ],
  }

  for (const emp of employees) {
    if (emp.telegram_chat_id) {
      await sendTelegramMessage(bot.bot_token, emp.telegram_chat_id, quizMessage, keyboard)
    }
  }
}
