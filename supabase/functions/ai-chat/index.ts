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

// Input validation helpers
function sanitizeString(input: string | undefined, maxLength = 200): string {
  if (!input) return '';
  // Remove excessive wildcards and limit length
  return input.replace(/%{3,}/g, '%%').slice(0, maxLength);
}

function validateDate(dateStr: string | undefined): boolean {
  if (!dateStr || dateStr === 'current_date' || dateStr === 'today') return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

function validateUUID(uuid: string | undefined): boolean {
  if (!uuid) return true;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

function validateStatus(status: string | undefined, allowedValues: string[]): boolean {
  if (!status) return true;
  return allowedValues.includes(status);
}

// Role-based access control context
interface RBACContext {
  userId: string;
  companyId: string;
  isAdmin: boolean;
  hasLeaveApprovalPermission: boolean;
}

// Execute database functions with role-based access control
async function executeFunction(
  supabase: any,
  companyId: string,
  currentDate: string,
  functionName: string,
  args: Record<string, any>,
  rbacContext?: RBACContext
): Promise<string> {
  // Replace current_date placeholder with actual date
  const resolveDate = (dateStr: string | undefined) => {
    if (!dateStr || dateStr === 'current_date' || dateStr === 'today') return currentDate;
    return dateStr;
  };
  
  // SECURITY: Check role-based access for sensitive operations
  if (rbacContext) {
    const ADMIN_ONLY_FUNCTIONS = [
      "bulk_attendance",
      "add_salary_adjustment", 
      "bulk_salary_adjustment",
      "update_employee",
      "add_attendance"
    ];
    
    const MANAGER_FUNCTIONS = ["update_leave_request"];
    
    if (ADMIN_ONLY_FUNCTIONS.includes(functionName) && !rbacContext.isAdmin) {
      console.log(`SECURITY: User ${rbacContext.userId} denied access to ${functionName} - admin role required`);
      return JSON.stringify({ 
        error: "Permission denied. Only administrators and company owners can perform this action.",
        error_ar: "تم رفض الإذن. فقط المسؤولون وأصحاب الشركات يمكنهم تنفيذ هذا الإجراء."
      });
    }
    
    if (MANAGER_FUNCTIONS.includes(functionName) && !rbacContext.isAdmin && !rbacContext.hasLeaveApprovalPermission) {
      console.log(`SECURITY: User ${rbacContext.userId} denied access to ${functionName} - manager permission required`);
      return JSON.stringify({ 
        error: "Permission denied. You don't have permission to approve or reject leave requests.",
        error_ar: "تم رفض الإذن. ليس لديك صلاحية للموافقة على أو رفض طلبات الإجازة."
      });
    }
  }
  
  try {
    switch (functionName) {
      case "get_employees": {
        // Validate inputs
        const search = sanitizeString(args.search, 100);
        const department = sanitizeString(args.department, 100);
        
        let query = supabase
          .from("employees")
          .select("id, full_name, email, department, phone, is_active, hire_date, base_salary, salary_type, currency")
          .eq("company_id", companyId);
        
        if (search) {
          query = query.ilike("full_name", `%${search}%`);
        }
        if (department) {
          query = query.ilike("department", `%${department}%`);
        }
        if (typeof args.is_active === "boolean") {
          query = query.eq("is_active", args.is_active);
        }
        
        const limit = Math.min(Number(args.limit) || 100, 500);
        const { data, error } = await query.limit(limit);
        if (error) throw error;
        return JSON.stringify({ employees: data, count: data?.length || 0 });
      }
      
      case "get_attendance": {
        // Validate dates
        if (!validateDate(args.date) || !validateDate(args.from_date) || !validateDate(args.to_date)) {
          return JSON.stringify({ error: "Invalid date format. Use YYYY-MM-DD." });
        }
        if (!validateUUID(args.employee_id)) {
          return JSON.stringify({ error: "Invalid employee ID format." });
        }
        if (!validateStatus(args.status, ['checked_in', 'checked_out', 'on_break', 'absent'])) {
          return JSON.stringify({ error: "Invalid status value." });
        }
        
        const targetDate = resolveDate(args.date);
        const employeeName = sanitizeString(args.employee_name, 100);
        
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
        } else if (!args.employee_id && !employeeName) {
          query = query.eq("date", currentDate);
        }
        
        if (args.employee_id) {
          query = query.eq("employee_id", args.employee_id);
        }
        if (employeeName) {
          query = query.ilike("employees.full_name", `%${employeeName}%`);
        }
        if (args.status) {
          query = query.eq("status", args.status);
        }
        
        const limit = Math.min(Number(args.limit) || 100, 500);
        const { data, error } = await query.order("date", { ascending: false }).limit(limit);
        if (error) throw error;
        return JSON.stringify({ attendance: data, count: data?.length || 0, date: targetDate });
      }
      
      case "get_leave_requests": {
        // Validate inputs
        if (!validateStatus(args.status, ['pending', 'approved', 'rejected'])) {
          return JSON.stringify({ error: "Invalid status. Use: pending, approved, rejected." });
        }
        if (!validateUUID(args.employee_id)) {
          return JSON.stringify({ error: "Invalid employee ID format." });
        }
        
        const employeeName = sanitizeString(args.employee_name, 100);
        
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
        if (employeeName) {
          query = query.ilike("employees.full_name", `%${employeeName}%`);
        }
        if (args.from_date && args.to_date) {
          query = query.gte("start_date", resolveDate(args.from_date)).lte("end_date", resolveDate(args.to_date));
        }
        
        const limit = Math.min(Number(args.limit) || 50, 200);
        const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
        if (error) throw error;
        return JSON.stringify({ leave_requests: data, count: data?.length || 0 });
      }
      
      case "get_daily_summary": {
        if (!validateDate(args.date)) {
          return JSON.stringify({ error: "Invalid date format. Use YYYY-MM-DD." });
        }
        
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
        if (!validateUUID(args.employee_id)) {
          return JSON.stringify({ error: "Invalid employee ID format." });
        }
        
        const employeeName = sanitizeString(args.employee_name, 100);
        
        let employeeQuery = supabase
          .from("employees")
          .select("*")
          .eq("company_id", companyId);
        
        if (args.employee_id) {
          employeeQuery = employeeQuery.eq("id", args.employee_id);
        } else if (employeeName) {
          employeeQuery = employeeQuery.ilike("full_name", `%${employeeName}%`);
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
        const period = args.period || "today";
        
        // Get total employees
        const { count: totalEmployees } = await supabase
          .from("employees")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("is_active", true);
        
        // Get today's attendance
        const { data: todayAttendance } = await supabase
          .from("attendance_logs")
          .select("status")
          .eq("company_id", companyId)
          .eq("date", currentDate);
        
        // Get pending leave requests
        const { count: pendingLeaves } = await supabase
          .from("leave_requests")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "pending");
        
        const present = todayAttendance?.length || 0;
        const checkedIn = todayAttendance?.filter((a: any) => a.status === "checked_in").length || 0;
        
        return JSON.stringify({
          period,
          total_employees: totalEmployees || 0,
          today: {
            present,
            absent: (totalEmployees || 0) - present,
            checked_in: checkedIn,
            attendance_rate: totalEmployees ? Math.round((present / totalEmployees) * 100) : 0
          },
          pending_leave_requests: pendingLeaves || 0
        });
      }
      
      case "update_leave_request": {
        if (!validateStatus(args.action, ['approve', 'reject'])) {
          return JSON.stringify({ error: "Invalid action. Use: approve, reject." });
        }
        if (!validateUUID(args.leave_request_id)) {
          return JSON.stringify({ error: "Invalid leave request ID format." });
        }
        
        const employeeName = sanitizeString(args.employee_name, 100);
        let leaveId = args.leave_request_id;
        
        // If employee name provided, find their pending request
        if (!leaveId && employeeName) {
          const { data: employees } = await supabase
            .from("employees")
            .select("id")
            .eq("company_id", companyId)
            .ilike("full_name", `%${employeeName}%`)
            .limit(1);
          
          if (employees?.length) {
            const { data: pendingReq } = await supabase
              .from("leave_requests")
              .select("id")
              .eq("employee_id", employees[0].id)
              .eq("status", "pending")
              .order("created_at", { ascending: false })
              .limit(1);
            
            if (pendingReq?.length) {
              leaveId = pendingReq[0].id;
            }
          }
        }
        
        if (!leaveId) {
          return JSON.stringify({ error: "Leave request not found" });
        }
        
        const status = args.action === "approve" ? "approved" : "rejected";
        const { data, error } = await supabase
          .from("leave_requests")
          .update({ 
            status,
            reviewed_at: new Date().toISOString()
          })
          .eq("id", leaveId)
          .eq("company_id", companyId)
          .select(`*, employees(full_name)`)
          .single();
        
        if (error) throw error;
        return JSON.stringify({ 
          success: true, 
          message: `Leave request ${status}`,
          leave_request: data 
        });
      }
      
      case "add_attendance": {
        if (!validateDate(args.date)) {
          return JSON.stringify({ error: "Invalid date format. Use YYYY-MM-DD." });
        }
        if (!validateUUID(args.employee_id)) {
          return JSON.stringify({ error: "Invalid employee ID format." });
        }
        if (!validateStatus(args.status, ['checked_in', 'checked_out', 'on_break'])) {
          return JSON.stringify({ error: "Invalid status. Use: checked_in, checked_out, on_break." });
        }
        
        const employeeName = sanitizeString(args.employee_name, 100);
        const targetDate = resolveDate(args.date) || currentDate;
        let employeeId = args.employee_id;
        
        // Find employee by name if ID not provided
        if (!employeeId && employeeName) {
          const { data: employees } = await supabase
            .from("employees")
            .select("id, full_name")
            .eq("company_id", companyId)
            .ilike("full_name", `%${employeeName}%`)
            .limit(1);
          
          if (!employees?.length) {
            return JSON.stringify({ error: `Employee "${employeeName}" not found` });
          }
          employeeId = employees[0].id;
        }
        
        if (!employeeId) {
          return JSON.stringify({ error: "Employee ID or name required" });
        }
        
        // Build time strings
        const now = new Date();
        const defaultTime = now.toISOString();
        
        const attendanceData: any = {
          employee_id: employeeId,
          company_id: companyId,
          date: targetDate,
          status: args.status,
          updated_at: new Date().toISOString()
        };
        
        if (args.check_in_time || args.status === "checked_in") {
          attendanceData.check_in_time = args.check_in_time 
            ? `${targetDate}T${args.check_in_time}:00` 
            : defaultTime;
        }
        if (args.check_out_time || args.status === "checked_out") {
          attendanceData.check_out_time = args.check_out_time 
            ? `${targetDate}T${args.check_out_time}:00` 
            : defaultTime;
        }
        if (args.notes) {
          attendanceData.notes = sanitizeString(args.notes, 500);
        }
        
        // Upsert attendance
        const { data, error } = await supabase
          .from("attendance_logs")
          .upsert(attendanceData, { 
            onConflict: "employee_id,date",
            ignoreDuplicates: false 
          })
          .select(`*, employees(full_name)`)
          .single();
        
        if (error) {
          // Try insert if upsert fails
          const { data: insertData, error: insertError } = await supabase
            .from("attendance_logs")
            .insert(attendanceData)
            .select(`*, employees(full_name)`)
            .single();
          
          if (insertError) throw insertError;
          return JSON.stringify({ success: true, attendance: insertData });
        }
        
        return JSON.stringify({ success: true, attendance: data });
      }
      
      case "bulk_attendance": {
        if (!validateDate(args.date)) {
          return JSON.stringify({ error: "Invalid date format. Use YYYY-MM-DD." });
        }
        if (!validateStatus(args.status, ['checked_in', 'checked_out', 'on_break'])) {
          return JSON.stringify({ error: "Invalid status. Use: checked_in, checked_out, on_break." });
        }
        
        const targetDate = resolveDate(args.date) || currentDate;
        const department = sanitizeString(args.department, 100);
        
        // Get employees to update
        let employeeQuery = supabase
          .from("employees")
          .select("id, full_name")
          .eq("company_id", companyId)
          .eq("is_active", true);
        
        if (args.employee_ids?.length) {
          // Validate all IDs
          for (const id of args.employee_ids) {
            if (!validateUUID(id)) {
              return JSON.stringify({ error: "Invalid employee ID in list." });
            }
          }
          employeeQuery = employeeQuery.in("id", args.employee_ids);
        }
        if (department) {
          employeeQuery = employeeQuery.ilike("department", `%${department}%`);
        }
        
        const { data: employees, error: empError } = await employeeQuery;
        if (empError) throw empError;
        if (!employees?.length) {
          return JSON.stringify({ error: "No employees found" });
        }
        
        const now = new Date();
        const defaultTime = now.toISOString();
        const notes = sanitizeString(args.notes, 500);
        
        // Prepare attendance records
        const attendanceRecords = employees.map((emp: any) => {
          const record: any = {
            employee_id: emp.id,
            company_id: companyId,
            date: targetDate,
            status: args.status,
            updated_at: new Date().toISOString()
          };
          
          if (args.check_in_time || args.status === "checked_in") {
            record.check_in_time = args.check_in_time 
              ? `${targetDate}T${args.check_in_time}:00` 
              : defaultTime;
          }
          if (args.check_out_time || args.status === "checked_out") {
            record.check_out_time = args.check_out_time 
              ? `${targetDate}T${args.check_out_time}:00` 
              : defaultTime;
          }
          if (notes) {
            record.notes = notes;
          }
          
          return record;
        });
        
        // Delete existing records for today first
        await supabase
          .from("attendance_logs")
          .delete()
          .eq("company_id", companyId)
          .eq("date", targetDate)
          .in("employee_id", employees.map((e: any) => e.id));
        
        // Insert new records
        const { data, error } = await supabase
          .from("attendance_logs")
          .insert(attendanceRecords)
          .select();
        
        if (error) throw error;
        
        return JSON.stringify({ 
          success: true, 
          message: `Marked ${employees.length} employees as ${args.status}`,
          count: employees.length,
          date: targetDate,
          employees: employees.map((e: any) => e.full_name)
        });
      }
      
      case "add_salary_adjustment": {
        if (!validateUUID(args.employee_id)) {
          return JSON.stringify({ error: "Invalid employee ID format." });
        }
        
        const employeeName = sanitizeString(args.employee_name, 100);
        const month = resolveDate(args.month) || currentDate.slice(0, 7) + "-01";
        let employeeId = args.employee_id;
        
        // Find employee by name if needed
        if (!employeeId && employeeName) {
          const { data: employees } = await supabase
            .from("employees")
            .select("id, full_name")
            .eq("company_id", companyId)
            .ilike("full_name", `%${employeeName}%`)
            .limit(1);
          
          if (!employees?.length) {
            return JSON.stringify({ error: `Employee "${employeeName}" not found` });
          }
          employeeId = employees[0].id;
        }
        
        if (!employeeId) {
          return JSON.stringify({ error: "Employee ID or name required" });
        }
        
        const bonus = Math.max(0, Number(args.bonus) || 0);
        const deduction = Math.max(0, Number(args.deduction) || 0);
        const description = sanitizeString(args.description, 500);
        
        const { data, error } = await supabase
          .from("salary_adjustments")
          .insert({
            employee_id: employeeId,
            company_id: companyId,
            month,
            bonus,
            deduction,
            description: description || (bonus > 0 ? "Bonus" : "Deduction")
          })
          .select(`*, employees(full_name)`)
          .single();
        
        if (error) throw error;
        
        return JSON.stringify({ 
          success: true, 
          message: bonus > 0 ? `Added ${bonus} bonus` : `Added ${deduction} deduction`,
          adjustment: data 
        });
      }
      
      case "bulk_salary_adjustment": {
        const department = sanitizeString(args.department, 100);
        const month = resolveDate(args.month) || currentDate.slice(0, 7) + "-01";
        
        // Get employees
        let employeeQuery = supabase
          .from("employees")
          .select("id, full_name")
          .eq("company_id", companyId)
          .eq("is_active", true);
        
        if (args.employee_ids?.length) {
          for (const id of args.employee_ids) {
            if (!validateUUID(id)) {
              return JSON.stringify({ error: "Invalid employee ID in list." });
            }
          }
          employeeQuery = employeeQuery.in("id", args.employee_ids);
        }
        if (department) {
          employeeQuery = employeeQuery.ilike("department", `%${department}%`);
        }
        
        const { data: employees, error: empError } = await employeeQuery;
        if (empError) throw empError;
        if (!employees?.length) {
          return JSON.stringify({ error: "No employees found" });
        }
        
        const bonus = Math.max(0, Number(args.bonus) || 0);
        const deduction = Math.max(0, Number(args.deduction) || 0);
        const description = sanitizeString(args.description, 500);
        
        const adjustments = employees.map((emp: any) => ({
          employee_id: emp.id,
          company_id: companyId,
          month,
          bonus,
          deduction,
          description: description || (bonus > 0 ? "Bulk Bonus" : "Bulk Deduction")
        }));
        
        const { data, error } = await supabase
          .from("salary_adjustments")
          .insert(adjustments)
          .select();
        
        if (error) throw error;
        
        return JSON.stringify({ 
          success: true, 
          message: `Added adjustment to ${employees.length} employees`,
          count: employees.length,
          bonus,
          deduction
        });
      }
      
      case "get_salary_info": {
        if (!validateUUID(args.employee_id)) {
          return JSON.stringify({ error: "Invalid employee ID format." });
        }
        
        const employeeName = sanitizeString(args.employee_name, 100);
        let employeeFilter: any = {};
        
        if (args.employee_id) {
          employeeFilter = { employee_id: args.employee_id };
        } else if (employeeName) {
          const { data: employees } = await supabase
            .from("employees")
            .select("id")
            .eq("company_id", companyId)
            .ilike("full_name", `%${employeeName}%`)
            .limit(1);
          
          if (employees?.length) {
            employeeFilter = { employee_id: employees[0].id };
          }
        }
        
        let query = supabase
          .from("salary_adjustments")
          .select(`
            *,
            employees(full_name, base_salary, currency)
          `)
          .eq("company_id", companyId);
        
        if (employeeFilter.employee_id) {
          query = query.eq("employee_id", employeeFilter.employee_id);
        }
        if (args.month) {
          query = query.eq("month", resolveDate(args.month));
        }
        
        const { data, error } = await query.order("month", { ascending: false }).limit(50);
        if (error) throw error;
        
        return JSON.stringify({ salary_adjustments: data, count: data?.length || 0 });
      }
      
      case "add_leave_request": {
        if (!validateDate(args.start_date) || !validateDate(args.end_date)) {
          return JSON.stringify({ error: "Invalid date format. Use YYYY-MM-DD." });
        }
        if (!validateUUID(args.employee_id)) {
          return JSON.stringify({ error: "Invalid employee ID format." });
        }
        if (!validateStatus(args.leave_type, ['vacation', 'sick', 'personal', 'emergency', 'regular'])) {
          return JSON.stringify({ error: "Invalid leave type. Use: vacation, sick, personal, emergency." });
        }
        
        const employeeName = sanitizeString(args.employee_name, 100);
        let employeeId = args.employee_id;
        
        // Find employee by name if needed
        if (!employeeId && employeeName) {
          const { data: employees } = await supabase
            .from("employees")
            .select("id")
            .eq("company_id", companyId)
            .ilike("full_name", `%${employeeName}%`)
            .limit(1);
          
          if (!employees?.length) {
            return JSON.stringify({ error: `Employee "${employeeName}" not found` });
          }
          employeeId = employees[0].id;
        }
        
        if (!employeeId) {
          return JSON.stringify({ error: "Employee ID or name required" });
        }
        
        // Calculate days
        const start = new Date(args.start_date);
        const end = new Date(args.end_date);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        if (days <= 0 || days > 365) {
          return JSON.stringify({ error: "Invalid date range. Check start and end dates." });
        }
        
        const reason = sanitizeString(args.reason, 500);
        
        const { data, error } = await supabase
          .from("leave_requests")
          .insert({
            employee_id: employeeId,
            company_id: companyId,
            leave_type: args.leave_type,
            start_date: args.start_date,
            end_date: args.end_date,
            days,
            reason: reason || null,
            status: "pending"
          })
          .select(`*, employees(full_name)`)
          .single();
        
        if (error) throw error;
        
        return JSON.stringify({ 
          success: true, 
          message: `Leave request created for ${days} days`,
          leave_request: data 
        });
      }
      
      case "update_employee": {
        if (!validateUUID(args.employee_id)) {
          return JSON.stringify({ error: "Invalid employee ID format." });
        }
        
        const employeeName = sanitizeString(args.employee_name, 100);
        let employeeId = args.employee_id;
        
        // Find employee by name if needed
        if (!employeeId && employeeName) {
          const { data: employees } = await supabase
            .from("employees")
            .select("id")
            .eq("company_id", companyId)
            .ilike("full_name", `%${employeeName}%`)
            .limit(1);
          
          if (!employees?.length) {
            return JSON.stringify({ error: `Employee "${employeeName}" not found` });
          }
          employeeId = employees[0].id;
        }
        
        if (!employeeId) {
          return JSON.stringify({ error: "Employee ID or name required" });
        }
        
        // Sanitize updates
        const updates: any = {};
        if (args.updates.full_name) updates.full_name = sanitizeString(args.updates.full_name, 100);
        if (args.updates.email) updates.email = sanitizeString(args.updates.email, 254);
        if (args.updates.department) updates.department = sanitizeString(args.updates.department, 100);
        if (args.updates.phone) updates.phone = sanitizeString(args.updates.phone, 20);
        if (typeof args.updates.base_salary === "number") updates.base_salary = Math.max(0, args.updates.base_salary);
        if (typeof args.updates.is_active === "boolean") updates.is_active = args.updates.is_active;
        
        if (Object.keys(updates).length === 0) {
          return JSON.stringify({ error: "No valid updates provided" });
        }
        
        updates.updated_at = new Date().toISOString();
        
        const { data, error } = await supabase
          .from("employees")
          .update(updates)
          .eq("id", employeeId)
          .eq("company_id", companyId)
          .select()
          .single();
        
        if (error) throw error;
        
        return JSON.stringify({ 
          success: true, 
          message: "Employee updated",
          employee: data 
        });
      }
      
      default:
        return JSON.stringify({ error: `Unknown function: ${functionName}` });
    }
  } catch (error) {
    console.error(`Error executing ${functionName}:`, error);
    return JSON.stringify({ error: error instanceof Error ? error.message : "Database error" });
  }
}

// Verify user has access to company
async function verifyCompanyAccess(supabase: any, userId: string, companyId: string): Promise<boolean> {
  // Check if user belongs to the company via profiles
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("user_id", userId)
    .single();
  
  if (profileError || !profile) {
    console.error("Profile lookup failed:", profileError);
    return false;
  }
  
  return profile.company_id === companyId;
}

// Check if user has admin or owner role
async function isAdminOrOwner(supabase: any, userId: string, companyId: string): Promise<boolean> {
  const { data: userRole, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .in("role", ["admin", "owner"])
    .limit(1);
  
  if (error) {
    console.error("Role lookup failed:", error);
    return false;
  }
  
  return userRole && userRole.length > 0;
}

// List of sensitive functions that require admin/owner role
const ADMIN_ONLY_FUNCTIONS = [
  "bulk_attendance",
  "add_salary_adjustment",
  "bulk_salary_adjustment",
  "update_employee",
  "add_attendance"
];

// List of functions that require manager permissions (can_approve_leaves)
const MANAGER_FUNCTIONS = [
  "update_leave_request"
];

// Check if user can perform manager actions (has position with can_approve_leaves)
async function hasManagerPermission(supabase: any, userId: string, companyId: string, permissionType: string): Promise<boolean> {
  // First, try to find the user as an employee
  const { data: employee, error: empError } = await supabase
    .from("employees")
    .select("position_id")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .single();
  
  if (empError || !employee?.position_id) {
    // Check if user is admin/owner (they can do everything)
    return await isAdminOrOwner(supabase, userId, companyId);
  }
  
  // Check position permissions
  const { data: perms, error: permsError } = await supabase
    .from("position_permissions")
    .select(permissionType)
    .eq("position_id", employee.position_id)
    .single();
  
  if (permsError || !perms) {
    // Fall back to admin/owner check
    return await isAdminOrOwner(supabase, userId, companyId);
  }
  
  return perms[permissionType] === true;
}

// Rate limiting check
async function checkRateLimit(
  supabase: any, 
  userId: string, 
  endpoint: string,
  maxRequests: number = 30,
  windowMinutes: number = 60
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
  
  // Get current request count in window
  const { data: rateLimits, error } = await supabase
    .from("rate_limits")
    .select("request_count")
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .gte("window_start", windowStart.toISOString());
  
  if (error) {
    console.error("Rate limit check error:", error);
    // Allow request on error but log it
    return { allowed: true, remaining: maxRequests, resetAt: new Date(Date.now() + windowMinutes * 60 * 1000) };
  }
  
  const currentCount = rateLimits?.reduce((sum: number, r: any) => sum + r.request_count, 0) || 0;
  const remaining = Math.max(0, maxRequests - currentCount - 1);
  const resetAt = new Date(Date.now() + windowMinutes * 60 * 1000);
  
  if (currentCount >= maxRequests) {
    console.log(`Rate limit exceeded for user ${userId} on ${endpoint}: ${currentCount}/${maxRequests}`);
    return { allowed: false, remaining: 0, resetAt };
  }
  
  // Insert new request record
  await supabase
    .from("rate_limits")
    .insert({
      user_id: userId,
      endpoint: endpoint,
      request_count: 1,
      window_start: new Date().toISOString()
    });
  
  return { allowed: true, remaining, resetAt };
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
      return new Response(
        JSON.stringify({ error: "Company ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== SECURITY: Verify JWT and user access =====
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Missing authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Create authenticated client to verify user
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has access to the requested company
    const hasAccess = await verifyCompanyAccess(supabaseAuth, user.id, companyId);
    if (!hasAccess) {
      console.error(`User ${user.id} attempted to access company ${companyId} without permission`);
      return new Response(
        JSON.stringify({ error: "Forbidden - You don't have access to this company" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== RATE LIMITING =====
    const rateLimit = await checkRateLimit(supabaseAuth, user.id, "ai-chat", 30, 60);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded. Please wait before sending more messages.",
          retryAfter: Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000)
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.resetAt.toISOString()
          } 
        }
      );
    }
    // ===== END RATE LIMITING =====

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // ===== ROLE-BASED ACCESS CONTROL =====
    // Pre-compute user permissions for sensitive operations
    const isAdmin = await isAdminOrOwner(supabase, user.id, companyId);
    const hasLeaveApprovalPermission = await hasManagerPermission(supabase, user.id, companyId, "can_approve_leaves");
    
    const rbacContext: RBACContext = {
      userId: user.id,
      companyId: companyId,
      isAdmin: isAdmin,
      hasLeaveApprovalPermission: hasLeaveApprovalPermission
    };
    
    console.log(`RBAC context for user ${user.id}: isAdmin=${isAdmin}, hasLeaveApproval=${hasLeaveApprovalPermission}`);
    // ===== END RBAC =====
    
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
        // Pass RBAC context to check permissions before executing sensitive operations
        const result = await executeFunction(supabase, companyId, currentDate, functionName, args, rbacContext);
        
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
