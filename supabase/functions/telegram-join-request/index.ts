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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { action, telegram_chat_id, telegram_username, full_name, email, phone, national_id, bot_username } = await req.json()

    if (action === 'join_request') {
      // Find the company that owns this bot
      const { data: bot, error: botError } = await supabase
        .from('telegram_bots')
        .select('assigned_company_id')
        .eq('bot_username', bot_username)
        .single()

      if (botError || !bot?.assigned_company_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Bot not found or not assigned to a company' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      // Check if request already exists
      const { data: existingRequest } = await supabase
        .from('join_requests')
        .select('id, status')
        .eq('telegram_chat_id', telegram_chat_id)
        .eq('company_id', bot.assigned_company_id)
        .eq('status', 'pending')
        .single()

      if (existingRequest) {
        return new Response(
          JSON.stringify({ success: false, error: 'Request already pending', request_id: existingRequest.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Check if employee already exists with this telegram_chat_id (active)
      const { data: existingEmployee } = await supabase
        .from('employees')
        .select('id, is_active, full_name')
        .eq('telegram_chat_id', telegram_chat_id)
        .eq('company_id', bot.assigned_company_id)
        .maybeSingle()

      if (existingEmployee) {
        // Check if employee is inactive
        if (existingEmployee.is_active === false) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'employee_inactive',
              employee_id: existingEmployee.id,
              employee_name: existingEmployee.full_name || 'Unknown',
              message: 'This employee is currently inactive. Would you like to reactivate them?'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
          )
        }
        return new Response(
          JSON.stringify({ success: false, error: 'Employee already registered' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Check if employee with same phone already exists
      if (phone) {
        const { data: existingPhone } = await supabase
          .from('employees')
          .select('id')
          .eq('company_id', bot.assigned_company_id)
          .eq('phone', phone)
          .maybeSingle()

        if (existingPhone) {
          return new Response(
            JSON.stringify({ success: false, error: 'موظف بنفس رقم الهاتف موجود بالفعل' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }
      }

      // Check if employee with same email already exists
      if (email) {
        const { data: existingEmail } = await supabase
          .from('employees')
          .select('id')
          .eq('company_id', bot.assigned_company_id)
          .eq('email', email)
          .maybeSingle()

        if (existingEmail) {
          return new Response(
            JSON.stringify({ success: false, error: 'موظف بنفس البريد الإلكتروني موجود بالفعل' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }
      }

      // Check if employee with same national_id already exists
      if (national_id) {
        const { data: existingNationalId } = await supabase
          .from('employees')
          .select('id')
          .eq('company_id', bot.assigned_company_id)
          .eq('national_id', national_id)
          .maybeSingle()

        if (existingNationalId) {
          return new Response(
            JSON.stringify({ success: false, error: 'موظف بنفس الرقم القومي موجود بالفعل' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }
      }

      // Check if employee was previously deleted (exists in deleted_records)
      const { data: deletedEmployee } = await supabase
        .from('deleted_records')
        .select('id, record_id, record_data, deleted_at')
        .eq('table_name', 'employees')
        .eq('company_id', bot.assigned_company_id)
        .eq('is_restored', false)
        .filter('record_data->>telegram_chat_id', 'eq', telegram_chat_id)
        .single()

      if (deletedEmployee) {
        const deletedData = deletedEmployee.record_data as { full_name?: string }
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'employee_previously_deleted',
            deleted_record_id: deletedEmployee.id,
            deleted_employee_name: deletedData?.full_name || 'Unknown',
            deleted_at: deletedEmployee.deleted_at,
            message: 'This employee was previously deleted. Would you like to restore them?'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
        )
      }

      // Create join request
      const { data: request, error: insertError } = await supabase
        .from('join_requests')
        .insert({
          company_id: bot.assigned_company_id,
          telegram_chat_id,
          telegram_username,
          full_name,
          email,
          phone,
          national_id
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Join request submitted', request_id: request.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'check_status') {
      const { data: request, error } = await supabase
        .from('join_requests')
        .select('status, rejection_reason')
        .eq('telegram_chat_id', telegram_chat_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'No request found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      return new Response(
        JSON.stringify({ success: true, status: request.status, rejection_reason: request.rejection_reason }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'restore_deleted_employee') {
      const { deleted_record_id } = await req.json()

      // Get the deleted record
      const { data: deletedRecord, error: fetchError } = await supabase
        .from('deleted_records')
        .select('*')
        .eq('id', deleted_record_id)
        .eq('is_restored', false)
        .single()

      if (fetchError || !deletedRecord) {
        return new Response(
          JSON.stringify({ success: false, error: 'Deleted record not found or already restored' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      const employeeData = deletedRecord.record_data as Record<string, unknown>

      // Re-insert the employee
      const { data: restoredEmployee, error: insertError } = await supabase
        .from('employees')
        .insert({
          ...employeeData,
          id: deletedRecord.record_id,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to restore employee: ' + insertError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      // Mark as restored
      await supabase
        .from('deleted_records')
        .update({ is_restored: true, restored_at: new Date().toISOString() })
        .eq('id', deleted_record_id)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Employee restored successfully',
          employee_id: restoredEmployee.id,
          employee_name: restoredEmployee.full_name
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})