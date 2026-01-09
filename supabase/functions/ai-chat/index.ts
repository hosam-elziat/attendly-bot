import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Database tools that AI can use
const databaseTools = [
  {
    type: "function",
    function: {
      name: "get_employees",
      description: "Get list of employees. Can filter by name, department, or get all.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Search by name" },
          department: { type: "string", description: "Filter by department" },
          is_active: { type: "boolean", description: "Filter by active status" },
          limit: { type: "number", description: "Limit results (default 50)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_attendance",
      description: "Get attendance records. Can filter by date, employee, or status.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
          employee_id: { type: "string", description: "Employee UUID" },
          employee_name: { type: "string", description: "Employee name to search" },
          status: { type: "string", description: "Filter by status: checked_in, checked_out, on_break, absent" },
          from_date: { type: "string", description: "Start date for range" },
          to_date: { type: "string", description: "End date for range" },
          limit: { type: "number", description: "Limit results (default 100)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_leave_requests",
      description: "Get leave requests. Can filter by status, employee, or date.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status: pending, approved, rejected" },
          employee_id: { type: "string", description: "Employee UUID" },
          employee_name: { type: "string", description: "Employee name to search" },
          from_date: { type: "string", description: "Start date for range" },
          to_date: { type: "string", description: "End date for range" },
          limit: { type: "number", description: "Limit results (default 50)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_daily_summary",
      description: "Get a summary of attendance and leave for a specific date",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date in YYYY-MM-DD format (defaults to today)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_employee_details",
      description: "Get detailed information about a specific employee including their attendance history",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string", description: "Employee name to search" },
          employee_id: { type: "string", description: "Employee UUID" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_statistics",
      description: "Get general statistics like total employees, attendance rates, etc.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", description: "Period: today, week, month, year" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_leave_request",
      description: "Approve or reject a leave request",
      parameters: {
        type: "object",
        properties: {
          leave_request_id: { type: "string", description: "Leave request UUID" },
          action: { type: "string", enum: ["approve", "reject"], description: "Action to take" },
          notes: { type: "string", description: "Optional notes" }
        },
        required: ["leave_request_id", "action"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_attendance",
      description: "Add or update attendance record for an employee",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string", description: "Employee name" },
          employee_id: { type: "string", description: "Employee UUID" },
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
          status: { type: "string", enum: ["checked_in", "checked_out", "absent", "on_break"], description: "Attendance status" },
          check_in_time: { type: "string", description: "Check in time in HH:MM format" },
          check_out_time: { type: "string", description: "Check out time in HH:MM format" },
          notes: { type: "string", description: "Optional notes" }
        },
        required: ["status"]
      }
    }
  }
];

// Execute database functions
async function executeFunction(
  supabase: any,
  companyId: string,
  functionName: string,
  args: Record<string, any>
): Promise<string> {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    switch (functionName) {
      case "get_employees": {
        let query = supabase
          .from("employees")
          .select("id, full_name, email, department, phone, is_active, hire_date, base_salary, salary_type")
          .eq("company_id", companyId);
        
        if (args.search) {
          query = query.ilike("full_name", `%${args.search}%`);
        }
        if (args.department) {
          query = query.ilike("department", `%${args.department}%`);
        }
        if (typeof args.is_active === "boolean") {
          query = query.eq("is_active", args.is_active);
        }
        
        const { data, error } = await query.limit(Number(args.limit) || 50);
        if (error) throw error;
        return JSON.stringify(data);
      }
      
      case "get_attendance": {
        let query = supabase
          .from("attendance_logs")
          .select(`
            id, date, check_in_time, check_out_time, status, notes,
            employees!inner(id, full_name, department)
          `)
          .eq("company_id", companyId);
        
        if (args.date) {
          query = query.eq("date", args.date);
        } else if (args.from_date && args.to_date) {
          query = query.gte("date", args.from_date).lte("date", args.to_date);
        } else if (!args.employee_id && !args.employee_name) {
          query = query.eq("date", today);
        }
        
        if (args.employee_id) {
          query = query.eq("employee_id", args.employee_id);
        }
        if (args.employee_name) {
          query = query.ilike("employees.full_name", `%${args.employee_name}%`);
        }
        if (args.status) {
          query = query.eq("status", args.status);
        }
        
        const { data, error } = await query.order("date", { ascending: false }).limit(Number(args.limit) || 100);
        if (error) throw error;
        return JSON.stringify(data);
      }
      
      case "get_leave_requests": {
        let query = supabase
          .from("leave_requests")
          .select(`
            id, leave_type, start_date, end_date, days, reason, status, created_at,
            employees!inner(id, full_name, department)
          `)
          .eq("company_id", companyId);
        
        if (args.status) {
          query = query.eq("status", args.status);
        }
        if (args.employee_id) {
          query = query.eq("employee_id", args.employee_id);
        }
        if (args.employee_name) {
          query = query.ilike("employees.full_name", `%${args.employee_name}%`);
        }
        if (args.from_date && args.to_date) {
          query = query.gte("start_date", args.from_date).lte("end_date", args.to_date);
        }
        
        const { data, error } = await query.order("created_at", { ascending: false }).limit(Number(args.limit) || 50);
        if (error) throw error;
        return JSON.stringify(data);
      }
      
      case "get_daily_summary": {
        const targetDate = args.date as string || today;
        
        // Get employees count
        const { count: totalEmployees } = await supabase
          .from("employees")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("is_active", true);
        
        // Get attendance for the day
        const { data: attendance } = await supabase
          .from("attendance_logs")
          .select(`
            id, status, check_in_time, check_out_time,
            employees(full_name, department)
          `)
          .eq("company_id", companyId)
          .eq("date", targetDate);
        
        // Get pending leaves
        const { data: leaves } = await supabase
          .from("leave_requests")
          .select(`
            id, leave_type, status,
            employees(full_name)
          `)
          .eq("company_id", companyId)
          .lte("start_date", targetDate)
          .gte("end_date", targetDate);
        
        const checkedIn = attendance?.filter((a: any) => a.status === "checked_in").length || 0;
        const checkedOut = attendance?.filter((a: any) => a.status === "checked_out").length || 0;
        const onBreak = attendance?.filter((a: any) => a.status === "on_break").length || 0;
        const absent = attendance?.filter((a: any) => a.status === "absent").length || 0;
        const present = attendance?.length || 0;
        const notRecorded = (totalEmployees || 0) - present;
        
        return JSON.stringify({
          date: targetDate,
          total_employees: totalEmployees,
          attendance: {
            present,
            checked_in: checkedIn,
            checked_out: checkedOut,
            on_break: onBreak,
            absent,
            not_recorded: notRecorded
          },
          leaves: leaves || [],
          attendance_details: attendance || []
        });
      }
      
      case "get_employee_details": {
        let employeeQuery = supabase
          .from("employees")
          .select("*")
          .eq("company_id", companyId);
        
        if (args.employee_id) {
          employeeQuery = employeeQuery.eq("id", args.employee_id);
        } else if (args.employee_name) {
          employeeQuery = employeeQuery.ilike("full_name", `%${args.employee_name}%`);
        }
        
        const { data: employees, error: empError } = await employeeQuery.limit(1);
        if (empError) throw empError;
        if (!employees?.length) return JSON.stringify({ error: "Employee not found" });
        
        const employee = employees[0];
        
        // Get recent attendance
        const { data: attendance } = await supabase
          .from("attendance_logs")
          .select("*")
          .eq("employee_id", employee.id)
          .order("date", { ascending: false })
          .limit(30);
        
        // Get leave requests
        const { data: leaves } = await supabase
          .from("leave_requests")
          .select("*")
          .eq("employee_id", employee.id)
          .order("created_at", { ascending: false })
          .limit(10);
        
        return JSON.stringify({
          employee,
          recent_attendance: attendance || [],
          leave_requests: leaves || []
        });
      }
      
      case "get_statistics": {
        const period = args.period as string || "month";
        let fromDate: string;
        const toDate = today;
        
        const now = new Date();
        switch (period) {
          case "today":
            fromDate = today;
            break;
          case "week":
            fromDate = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
            break;
          case "year":
            fromDate = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString().split('T')[0];
            break;
          default: // month
            fromDate = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
        }
        
        const { count: totalEmployees } = await supabase
          .from("employees")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("is_active", true);
        
        const { data: attendance } = await supabase
          .from("attendance_logs")
          .select("status, date")
          .eq("company_id", companyId)
          .gte("date", fromDate)
          .lte("date", toDate);
        
        const { count: pendingLeaves } = await supabase
          .from("leave_requests")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "pending");
        
        const { count: approvedLeaves } = await supabase
          .from("leave_requests")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "approved")
          .gte("start_date", fromDate);
        
        const statusCounts = (attendance || []).reduce((acc: Record<string, number>, a: any) => {
          acc[a.status] = (acc[a.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        return JSON.stringify({
          period,
          from_date: fromDate,
          to_date: toDate,
          total_employees: totalEmployees,
          attendance_records: attendance?.length || 0,
          status_breakdown: statusCounts,
          pending_leave_requests: pendingLeaves,
          approved_leaves_in_period: approvedLeaves
        });
      }
      
      case "update_leave_request": {
        const { leave_request_id, action, notes } = args as { leave_request_id: string; action: string; notes?: string };
        
        const newStatus = action === "approve" ? "approved" : "rejected";
        
        const { data, error } = await supabase
          .from("leave_requests")
          .update({
            status: newStatus,
            reviewed_at: new Date().toISOString(),
            ...(notes && { reason: notes })
          })
          .eq("id", leave_request_id)
          .eq("company_id", companyId)
          .select()
          .single();
        
        if (error) throw error;
        return JSON.stringify({ success: true, message: `Leave request ${newStatus}`, data });
      }
      
      case "add_attendance": {
        let employeeId = args.employee_id as string;
        
        if (!employeeId && args.employee_name) {
          const { data: employees } = await supabase
            .from("employees")
            .select("id")
            .eq("company_id", companyId)
            .ilike("full_name", `%${args.employee_name}%`)
            .limit(1);
          
          if (employees?.length) {
            employeeId = employees[0].id;
          } else {
            return JSON.stringify({ error: "Employee not found" });
          }
        }
        
        if (!employeeId) {
          return JSON.stringify({ error: "Please specify employee name or ID" });
        }
        
        const targetDate = args.date as string || today;
        
        // Check if record exists
        const { data: existing } = await supabase
          .from("attendance_logs")
          .select("id")
          .eq("employee_id", employeeId)
          .eq("date", targetDate)
          .single();
        
        const attendanceData: Record<string, unknown> = {
          employee_id: employeeId,
          company_id: companyId,
          date: targetDate,
          status: args.status,
          ...(args.notes && { notes: args.notes })
        };
        
        if (args.check_in_time) {
          attendanceData.check_in_time = `${targetDate}T${args.check_in_time}:00`;
        }
        if (args.check_out_time) {
          attendanceData.check_out_time = `${targetDate}T${args.check_out_time}:00`;
        }
        
        let result;
        if (existing) {
          result = await supabase
            .from("attendance_logs")
            .update(attendanceData)
            .eq("id", existing.id)
            .select()
            .single();
        } else {
          result = await supabase
            .from("attendance_logs")
            .insert(attendanceData)
            .select()
            .single();
        }
        
        if (result.error) throw result.error;
        return JSON.stringify({ success: true, message: "Attendance recorded", data: result.data });
      }
      
      default:
        return JSON.stringify({ error: "Unknown function" });
    }
  } catch (error) {
    console.error(`Error executing ${functionName}:`, error);
    return JSON.stringify({ error: error instanceof Error ? error.message : "Function execution failed" });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language = "ar", companyId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }
    if (!companyId) {
      throw new Error("Company ID is required");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const systemPrompt = language === "ar"
      ? `أنت مساعد HR ذكي ولديك صلاحية كاملة للوصول لبيانات الشركة والتحكم فيها.

**قدراتك:**
- عرض بيانات الموظفين والبحث عنهم
- عرض سجلات الحضور والانصراف
- عرض طلبات الإجازات والموافقة عليها أو رفضها
- إضافة وتعديل سجلات الحضور
- عرض إحصائيات شاملة

**أسلوب الرد:**
- رد بشكل مباشر ومختصر - لا مقدمات أو خاتمات
- استخدم الجداول والقوائم لتنظيم المعلومات
- عند طلب معلومات، استخدم الأدوات المتاحة للحصول على البيانات الحقيقية
- لا تختلق بيانات - استخدم الأدوات دائماً

**تنسيق الردود:**
- للأرقام والإحصائيات: استخدم جداول markdown
- للتوقيتات: اعرضها بوضوح (⏰ 09:00 ص)
- استخدم الإيموجي: ✅ ❌ ⚠️ 📊 👤 📅 🕐

**مثال:**
| البند | القيمة |
|-------|--------|
| الحضور | 15 موظف ✅ |
| الغياب | 2 موظف ❌ |

عند تنفيذ أي إجراء (موافقة على إجازة، تسجيل حضور) أكد العملية بوضوح.`
      : `You are an intelligent HR assistant with full access to company data.

**Your capabilities:**
- View and search employees
- View attendance records
- View, approve, or reject leave requests
- Add and update attendance records
- View comprehensive statistics

**Response style:**
- Be extremely direct - no introductions or conclusions
- Use tables and lists to organize information
- When asked for data, use the available tools to get real data
- Never make up data - always use tools

**Formatting:**
- For numbers/stats: use markdown tables
- For times: show clearly (⏰ 09:00 AM)
- Use emojis: ✅ ❌ ⚠️ 📊 👤 📅 🕐

**Example:**
| Item | Value |
|------|-------|
| Present | 15 employees ✅ |
| Absent | 2 employees ❌ |

When performing actions (approving leave, recording attendance), confirm clearly.`;

    // First call with tools
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools: databaseTools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const assistantMessage = aiResponse.choices[0].message;

    // Check if AI wants to call tools
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolResults: { role: string; tool_call_id: string; content: string }[] = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments || "{}");
        
        console.log(`Executing tool: ${functionName}`, args);
        const result = await executeFunction(supabase, companyId, functionName, args);
        
        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      // Second call with tool results - streaming
      const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            assistantMessage,
            ...toolResults,
          ],
          stream: true,
        }),
      });

      if (!finalResponse.ok) {
        throw new Error("Failed to get final response");
      }

      return new Response(finalResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No tool calls - stream directly (for simple conversations)
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
