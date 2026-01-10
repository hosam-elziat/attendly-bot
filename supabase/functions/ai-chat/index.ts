import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Database tools that AI can use - FULL CONTROL
const databaseTools = [
  {
    type: "function",
    function: {
      name: "get_employees",
      description: "Get list of all employees. Can filter by name, department, or status.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Search by name" },
          department: { type: "string", description: "Filter by department" },
          is_active: { type: "boolean", description: "Filter by active status" },
          limit: { type: "number", description: "Limit results (default 100)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_attendance",
      description: "Get attendance records for employees on a specific date or date range.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date in YYYY-MM-DD format. Use current_date for today." },
          employee_id: { type: "string", description: "Employee UUID" },
          employee_name: { type: "string", description: "Employee name to search" },
          status: { type: "string", description: "Filter by status: checked_in, checked_out, on_break" },
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
      description: "Get a comprehensive summary of attendance and leave for a specific date",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date in YYYY-MM-DD format. Use current_date for today." }
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
          employee_name: { type: "string", description: "Employee name to find their pending request" },
          action: { type: "string", enum: ["approve", "reject"], description: "Action to take" },
          notes: { type: "string", description: "Optional notes" }
        },
        required: ["action"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_attendance",
      description: "Add or update attendance record for a single employee",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string", description: "Employee name" },
          employee_id: { type: "string", description: "Employee UUID" },
          date: { type: "string", description: "Date in YYYY-MM-DD format. Use current_date for today." },
          status: { type: "string", enum: ["checked_in", "checked_out", "on_break"], description: "Attendance status" },
          check_in_time: { type: "string", description: "Check in time in HH:MM format" },
          check_out_time: { type: "string", description: "Check out time in HH:MM format" },
          notes: { type: "string", description: "Optional notes" }
        },
        required: ["status"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "bulk_attendance",
      description: "Add attendance records for multiple employees at once. Use this when asked to mark all or multiple employees as present/checked_in.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date in YYYY-MM-DD format. Use current_date for today." },
          status: { type: "string", enum: ["checked_in", "checked_out", "on_break"], description: "Attendance status for all" },
          check_in_time: { type: "string", description: "Check in time in HH:MM format for all" },
          check_out_time: { type: "string", description: "Check out time in HH:MM format for all" },
          employee_ids: { type: "array", items: { type: "string" }, description: "Specific employee IDs to update. If empty, updates all active employees." },
          department: { type: "string", description: "Only update employees in this department" },
          notes: { type: "string", description: "Optional notes" }
        },
        required: ["status"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_salary_adjustment",
      description: "Add bonus or deduction to an employee's salary for a specific month",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string", description: "Employee name" },
          employee_id: { type: "string", description: "Employee UUID" },
          bonus: { type: "number", description: "Bonus amount to add" },
          deduction: { type: "number", description: "Deduction amount" },
          description: { type: "string", description: "Reason for the adjustment" },
          month: { type: "string", description: "Month in YYYY-MM-DD format (first day of month)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "bulk_salary_adjustment",
      description: "Add bonus or deduction to multiple employees at once",
      parameters: {
        type: "object",
        properties: {
          employee_ids: { type: "array", items: { type: "string" }, description: "Employee IDs to adjust. If empty, applies to all active employees." },
          department: { type: "string", description: "Only adjust employees in this department" },
          bonus: { type: "number", description: "Bonus amount to add" },
          deduction: { type: "number", description: "Deduction amount" },
          description: { type: "string", description: "Reason for the adjustment" },
          month: { type: "string", description: "Month in YYYY-MM-DD format (first day of month)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_salary_info",
      description: "Get salary information and adjustments for employees",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string", description: "Employee name" },
          employee_id: { type: "string", description: "Employee UUID" },
          month: { type: "string", description: "Month in YYYY-MM-DD format" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_leave_request",
      description: "Create a new leave request for an employee",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string", description: "Employee name" },
          employee_id: { type: "string", description: "Employee UUID" },
          leave_type: { type: "string", enum: ["vacation", "sick", "personal"], description: "Type of leave" },
          start_date: { type: "string", description: "Start date YYYY-MM-DD" },
          end_date: { type: "string", description: "End date YYYY-MM-DD" },
          reason: { type: "string", description: "Reason for leave" }
        },
        required: ["leave_type", "start_date", "end_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_employee",
      description: "Update employee information",
      parameters: {
        type: "object",
        properties: {
          employee_name: { type: "string", description: "Employee name to find" },
          employee_id: { type: "string", description: "Employee UUID" },
          updates: { 
            type: "object", 
            description: "Fields to update",
            properties: {
              full_name: { type: "string" },
              email: { type: "string" },
              department: { type: "string" },
              phone: { type: "string" },
              base_salary: { type: "number" },
              is_active: { type: "boolean" }
            }
          }
        },
        required: ["updates"]
      }
    }
  }
];

// Execute database functions
async function executeFunction(
  supabase: any,
  companyId: string,
  currentDate: string,
  functionName: string,
  args: Record<string, any>
): Promise<string> {
  // Replace current_date placeholder with actual date
  const resolveDate = (dateStr: string | undefined) => {
    if (!dateStr || dateStr === 'current_date' || dateStr === 'today') return currentDate;
    return dateStr;
  };
  
  try {
    switch (functionName) {
      case "get_employees": {
        let query = supabase
          .from("employees")
          .select("id, full_name, email, department, phone, is_active, hire_date, base_salary, salary_type, currency")
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
        
        const { data, error } = await query.limit(Number(args.limit) || 100);
        if (error) throw error;
        return JSON.stringify({ employees: data, count: data?.length || 0 });
      }
      
      case "get_attendance": {
        const targetDate = resolveDate(args.date);
        
        let query = supabase
          .from("attendance_logs")
          .select(`
            id, date, check_in_time, check_out_time, status, notes,
            employees!inner(id, full_name, department)
          `)
          .eq("company_id", companyId);
        
        if (args.date) {
          query = query.eq("date", targetDate);
        } else if (args.from_date && args.to_date) {
          query = query.gte("date", resolveDate(args.from_date)).lte("date", resolveDate(args.to_date));
        } else if (!args.employee_id && !args.employee_name) {
          query = query.eq("date", currentDate);
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
        return JSON.stringify({ attendance: data, count: data?.length || 0, date: targetDate });
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
          query = query.gte("start_date", resolveDate(args.from_date)).lte("end_date", resolveDate(args.to_date));
        }
        
        const { data, error } = await query.order("created_at", { ascending: false }).limit(Number(args.limit) || 50);
        if (error) throw error;
        return JSON.stringify({ leave_requests: data, count: data?.length || 0 });
      }
      
      case "get_daily_summary": {
        const targetDate = resolveDate(args.date) || currentDate;
        
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
            id, status, check_in_time, check_out_time, notes,
            employees(id, full_name, department)
          `)
          .eq("company_id", companyId)
          .eq("date", targetDate);
        
        // Get pending leaves
        const { data: pendingLeaves } = await supabase
          .from("leave_requests")
          .select(`
            id, leave_type, status, days,
            employees(full_name, department)
          `)
          .eq("company_id", companyId)
          .eq("status", "pending");
        
        // Get leaves on this date
        const { data: leavesToday } = await supabase
          .from("leave_requests")
          .select(`
            id, leave_type, status,
            employees(full_name)
          `)
          .eq("company_id", companyId)
          .eq("status", "approved")
          .lte("start_date", targetDate)
          .gte("end_date", targetDate);
        
        const checkedIn = attendance?.filter((a: any) => a.status === "checked_in").length || 0;
        const checkedOut = attendance?.filter((a: any) => a.status === "checked_out").length || 0;
        const onBreak = attendance?.filter((a: any) => a.status === "on_break").length || 0;
        const recorded = attendance?.length || 0;
        const notRecorded = (totalEmployees || 0) - recorded;
        const onLeave = leavesToday?.length || 0;
        
        return JSON.stringify({
          date: targetDate,
          current_date: currentDate,
          total_employees: totalEmployees || 0,
          summary: {
            recorded,
            checked_in: checkedIn,
            checked_out: checkedOut,
            on_break: onBreak,
            not_recorded: notRecorded,
            on_approved_leave: onLeave
          },
          pending_leave_requests: pendingLeaves?.length || 0,
          pending_leaves_details: pendingLeaves || [],
          employees_on_leave_today: leavesToday || [],
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
        
        // Get salary adjustments
        const { data: adjustments } = await supabase
          .from("salary_adjustments")
          .select("*")
          .eq("employee_id", employee.id)
          .order("month", { ascending: false })
          .limit(10);
        
        return JSON.stringify({
          employee,
          recent_attendance: attendance || [],
          leave_requests: leaves || [],
          salary_adjustments: adjustments || []
        });
      }
      
      case "get_statistics": {
        const period = args.period as string || "month";
        let fromDate: string;
        const toDate = currentDate;
        
        const now = new Date(currentDate);
        switch (period) {
          case "today":
            fromDate = currentDate;
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
          current_date: currentDate,
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
        let leaveRequestId = args.leave_request_id;
        
        // Find by employee name if no ID provided
        if (!leaveRequestId && args.employee_name) {
          const { data: leaves } = await supabase
            .from("leave_requests")
            .select(`id, employees!inner(full_name)`)
            .eq("company_id", companyId)
            .eq("status", "pending")
            .ilike("employees.full_name", `%${args.employee_name}%`)
            .limit(1);
          
          if (leaves?.length) {
            leaveRequestId = leaves[0].id;
          } else {
            return JSON.stringify({ error: "No pending leave request found for this employee" });
          }
        }
        
        if (!leaveRequestId) {
          return JSON.stringify({ error: "Please specify leave request ID or employee name" });
        }
        
        const newStatus = args.action === "approve" ? "approved" : "rejected";
        
        const { data, error } = await supabase
          .from("leave_requests")
          .update({
            status: newStatus,
            reviewed_at: new Date().toISOString(),
            ...(args.notes && { reason: args.notes })
          })
          .eq("id", leaveRequestId)
          .eq("company_id", companyId)
          .select(`*, employees(full_name)`)
          .single();
        
        if (error) throw error;
        return JSON.stringify({ 
          success: true, 
          message: `Leave request ${newStatus} for ${data.employees?.full_name}`, 
          data 
        });
      }
      
      case "add_attendance": {
        let employeeId = args.employee_id as string;
        
        if (!employeeId && args.employee_name) {
          const { data: employees } = await supabase
            .from("employees")
            .select("id, full_name")
            .eq("company_id", companyId)
            .ilike("full_name", `%${args.employee_name}%`)
            .limit(1);
          
          if (employees?.length) {
            employeeId = employees[0].id;
          } else {
            return JSON.stringify({ error: `Employee "${args.employee_name}" not found` });
          }
        }
        
        if (!employeeId) {
          return JSON.stringify({ error: "Please specify employee name or ID" });
        }
        
        const targetDate = resolveDate(args.date) || currentDate;
        
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
      
      case "bulk_attendance": {
        const targetDate = resolveDate(args.date) || currentDate;
        
        // Get employees to update
        let employeeQuery = supabase
          .from("employees")
          .select("id, full_name")
          .eq("company_id", companyId)
          .eq("is_active", true);
        
        if (args.department) {
          employeeQuery = employeeQuery.ilike("department", `%${args.department}%`);
        }
        
        if (args.employee_ids?.length) {
          employeeQuery = employeeQuery.in("id", args.employee_ids);
        }
        
        const { data: employees, error: empError } = await employeeQuery;
        if (empError) throw empError;
        if (!employees?.length) {
          return JSON.stringify({ error: "No employees found" });
        }
        
        const results = { success: 0, failed: 0, employees: [] as string[] };
        
        for (const emp of employees) {
          // Check if record exists
          const { data: existing } = await supabase
            .from("attendance_logs")
            .select("id")
            .eq("employee_id", emp.id)
            .eq("date", targetDate)
            .single();
          
          const attendanceData: Record<string, unknown> = {
            employee_id: emp.id,
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
              .eq("id", existing.id);
          } else {
            result = await supabase
              .from("attendance_logs")
              .insert(attendanceData);
          }
          
          if (result.error) {
            results.failed++;
          } else {
            results.success++;
            results.employees.push(emp.full_name);
          }
        }
        
        return JSON.stringify({ 
          message: `Marked ${results.success} employees as ${args.status} on ${targetDate}`,
          date: targetDate,
          successCount: results.success,
          failedCount: results.failed,
          employees: results.employees
        });
      }
      
      case "add_salary_adjustment": {
        let employeeId = args.employee_id as string;
        
        if (!employeeId && args.employee_name) {
          const { data: employees } = await supabase
            .from("employees")
            .select("id, full_name")
            .eq("company_id", companyId)
            .ilike("full_name", `%${args.employee_name}%`)
            .limit(1);
          
          if (employees?.length) {
            employeeId = employees[0].id;
          } else {
            return JSON.stringify({ error: `Employee "${args.employee_name}" not found` });
          }
        }
        
        if (!employeeId) {
          return JSON.stringify({ error: "Please specify employee name or ID" });
        }
        
        // Default to first day of current month
        const month = args.month || `${currentDate.substring(0, 7)}-01`;
        
        const { data, error } = await supabase
          .from("salary_adjustments")
          .insert({
            employee_id: employeeId,
            company_id: companyId,
            month,
            bonus: args.bonus || 0,
            deduction: args.deduction || 0,
            description: args.description || null
          })
          .select()
          .single();
        
        if (error) throw error;
        
        const type = args.bonus ? "bonus" : "deduction";
        const amount = args.bonus || args.deduction;
        return JSON.stringify({ 
          success: true, 
          message: `Added ${type} of ${amount} to employee`, 
          data 
        });
      }
      
      case "bulk_salary_adjustment": {
        // Get employees to update
        let employeeQuery = supabase
          .from("employees")
          .select("id, full_name")
          .eq("company_id", companyId)
          .eq("is_active", true);
        
        if (args.department) {
          employeeQuery = employeeQuery.ilike("department", `%${args.department}%`);
        }
        
        if (args.employee_ids?.length) {
          employeeQuery = employeeQuery.in("id", args.employee_ids);
        }
        
        const { data: employees, error: empError } = await employeeQuery;
        if (empError) throw empError;
        if (!employees?.length) {
          return JSON.stringify({ error: "No employees found" });
        }
        
        const month = args.month || `${currentDate.substring(0, 7)}-01`;
        const results = { success: 0, failed: 0, employees: [] as string[] };
        
        for (const emp of employees) {
          const { error } = await supabase
            .from("salary_adjustments")
            .insert({
              employee_id: emp.id,
              company_id: companyId,
              month,
              bonus: args.bonus || 0,
              deduction: args.deduction || 0,
              description: args.description || null
            });
          
          if (error) {
            results.failed++;
          } else {
            results.success++;
            results.employees.push(emp.full_name);
          }
        }
        
        const type = args.bonus ? "bonus" : "deduction";
        const amount = args.bonus || args.deduction;
        return JSON.stringify({ 
          message: `Added ${type} of ${amount} to ${results.success} employees`,
          successCount: results.success,
          failedCount: results.failed,
          employees: results.employees
        });
      }
      
      case "get_salary_info": {
        let query = supabase
          .from("employees")
          .select(`
            id, full_name, base_salary, salary_type, currency,
            salary_adjustments(id, month, bonus, deduction, description)
          `)
          .eq("company_id", companyId);
        
        if (args.employee_id) {
          query = query.eq("id", args.employee_id);
        } else if (args.employee_name) {
          query = query.ilike("full_name", `%${args.employee_name}%`);
        }
        
        const { data, error } = await query.limit(args.employee_name || args.employee_id ? 1 : 50);
        if (error) throw error;
        
        return JSON.stringify({ salary_info: data });
      }
      
      case "add_leave_request": {
        let employeeId = args.employee_id as string;
        
        if (!employeeId && args.employee_name) {
          const { data: employees } = await supabase
            .from("employees")
            .select("id, full_name")
            .eq("company_id", companyId)
            .ilike("full_name", `%${args.employee_name}%`)
            .limit(1);
          
          if (employees?.length) {
            employeeId = employees[0].id;
          } else {
            return JSON.stringify({ error: `Employee "${args.employee_name}" not found` });
          }
        }
        
        if (!employeeId) {
          return JSON.stringify({ error: "Please specify employee name or ID" });
        }
        
        // Calculate days
        const start = new Date(args.start_date);
        const end = new Date(args.end_date);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        const { data, error } = await supabase
          .from("leave_requests")
          .insert({
            employee_id: employeeId,
            company_id: companyId,
            leave_type: args.leave_type,
            start_date: args.start_date,
            end_date: args.end_date,
            days,
            reason: args.reason || null,
            status: "pending"
          })
          .select(`*, employees(full_name)`)
          .single();
        
        if (error) throw error;
        return JSON.stringify({ 
          success: true, 
          message: `Created leave request for ${data.employees?.full_name}`, 
          data 
        });
      }
      
      case "update_employee": {
        let employeeId = args.employee_id as string;
        
        if (!employeeId && args.employee_name) {
          const { data: employees } = await supabase
            .from("employees")
            .select("id, full_name")
            .eq("company_id", companyId)
            .ilike("full_name", `%${args.employee_name}%`)
            .limit(1);
          
          if (employees?.length) {
            employeeId = employees[0].id;
          } else {
            return JSON.stringify({ error: `Employee "${args.employee_name}" not found` });
          }
        }
        
        if (!employeeId) {
          return JSON.stringify({ error: "Please specify employee name or ID" });
        }
        
        const { data, error } = await supabase
          .from("employees")
          .update(args.updates)
          .eq("id", employeeId)
          .eq("company_id", companyId)
          .select()
          .single();
        
        if (error) throw error;
        return JSON.stringify({ success: true, message: "Employee updated", data });
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
    const { messages, language = "ar", companyId, currentDate: clientDate } = await req.json();
    
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
    
    // Use client date or server date
    const currentDate = clientDate || new Date().toISOString().split('T')[0];

    const systemPrompt = language === "ar"
      ? `أنت مساعد HR ذكي ولديك تحكم كامل في قاعدة بيانات الشركة.

**التاريخ الحالي:** ${currentDate}

**صلاحياتك الكاملة:**
- ✅ عرض وتعديل بيانات الموظفين
- ✅ تسجيل حضور فردي أو جماعي (حضّر كل الموظفين)
- ✅ إضافة مكافآت وخصومات للرواتب
- ✅ إنشاء والموافقة/رفض طلبات الإجازات
- ✅ عرض الإحصائيات والتقارير

**تعليمات صارمة:**
1. لا تختلق أي بيانات - استخدم الأدوات دائماً
2. عند طلب "حضّر كل الموظفين" استخدم bulk_attendance مع status: "checked_in"
3. عند إضافة مكافأة استخدم add_salary_adjustment أو bulk_salary_adjustment
4. رد بشكل مباشر ومختصر جداً - لا مقدمات

**تنسيق الردود (مهم جداً):**
| البيان | القيمة |
|--------|--------|
| الحاضرين | 15 ✅ |
| الغياب | 2 ❌ |

استخدم: ✅ ❌ ⚠️ 📊 👤 📅 ⏰ 💰`
      : `You are an intelligent HR assistant with FULL CONTROL over the company database.

**Current Date:** ${currentDate}

**Your Full Permissions:**
- ✅ View and update employee information
- ✅ Record individual or bulk attendance (mark all present)
- ✅ Add salary bonuses and deductions
- ✅ Create, approve, and reject leave requests
- ✅ View statistics and reports

**Strict Instructions:**
1. NEVER make up data - always use tools
2. When asked to "mark all employees present", use bulk_attendance with status: "checked_in"
3. For bonuses, use add_salary_adjustment or bulk_salary_adjustment
4. Be extremely direct and concise - no introductions

**Response Format (important):**
| Item | Value |
|------|-------|
| Present | 15 ✅ |
| Absent | 2 ❌ |

Use: ✅ ❌ ⚠️ 📊 👤 📅 ⏰ 💰`;

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
        const result = await executeFunction(supabase, companyId, currentDate, functionName, args);
        
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
