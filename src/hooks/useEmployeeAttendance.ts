import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdminCompanyAccess } from '@/hooks/useSuperAdminCompanyAccess';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, eachDayOfInterval, differenceInMinutes, parseISO } from 'date-fns';

export type EmployeeFilterPeriod = 'week' | 'month' | 'year';

export interface EmployeeAttendanceLog {
  id: string;
  employee_id: string;
  company_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  late_permission_minutes: number | null;
  early_leave_permission_minutes: number | null;
}

export interface EmployeeAttendanceStats {
  presentDays: number;
  expectedDays: number;
  absentDays: number;
  totalHours: number;
  commitmentRate: number;
  lateArrivals: number;
  logs: EmployeeAttendanceLog[];
}

function getDateRange(period: EmployeeFilterPeriod) {
  const now = new Date();
  switch (period) {
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) };
  }
}

function getExpectedWorkDays(start: Date, end: Date, weekendDays: string[]): number {
  const today = new Date();
  const effectiveEnd = end > today ? today : end;
  if (effectiveEnd < start) return 0;
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const days = eachDayOfInterval({ start, end: effectiveEnd });
  
  return days.filter(day => {
    const dayName = dayNames[day.getDay()];
    return !weekendDays.includes(dayName);
  }).length;
}

export const useEmployeeAttendance = (
  employeeId: string | undefined,
  period: EmployeeFilterPeriod,
  employeeData?: {
    work_start_time?: string;
    work_end_time?: string;
    weekend_days?: string[];
  }
) => {
  const { effectiveCompanyId } = useSuperAdminCompanyAccess();
  const dateRange = getDateRange(period);

  return useQuery({
    queryKey: ['employee-attendance', employeeId, effectiveCompanyId, period, format(dateRange.start, 'yyyy-MM-dd')],
    queryFn: async (): Promise<EmployeeAttendanceStats> => {
      if (!employeeId || !effectiveCompanyId) {
        return { presentDays: 0, expectedDays: 0, absentDays: 0, totalHours: 0, commitmentRate: 0, lateArrivals: 0, logs: [] };
      }

      const startDate = format(dateRange.start, 'yyyy-MM-dd');
      const endDate = format(dateRange.end, 'yyyy-MM-dd');

      // Fetch all attendance logs for this employee in the date range
      const { data: logs, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('company_id', effectiveCompanyId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;

      const attendanceLogs = (logs || []) as EmployeeAttendanceLog[];
      const weekendDays = employeeData?.weekend_days || ['friday', 'saturday'];
      const workStartTime = employeeData?.work_start_time || '09:00:00';

      // Fetch approved holidays for this company in the date range
      const { data: holidays } = await supabase
        .from('approved_holidays')
        .select('holiday_date, days_count')
        .eq('company_id', effectiveCompanyId)
        .eq('is_approved', true)
        .gte('holiday_date', startDate)
        .lte('holiday_date', endDate);

      // Get set of holiday dates
      const holidayDates = new Set<string>();
      (holidays || []).forEach(h => {
        const startD = new Date(h.holiday_date);
        for (let i = 0; i < (h.days_count || 1); i++) {
          const d = new Date(startD);
          d.setDate(d.getDate() + i);
          holidayDates.add(format(d, 'yyyy-MM-dd'));
        }
      });

      // Fetch approved leave requests for this employee
      const { data: leaveRequests } = await supabase
        .from('leave_requests')
        .select('start_date, days')
        .eq('employee_id', employeeId)
        .eq('status', 'approved')
        .gte('start_date', startDate)
        .lte('start_date', endDate);

      const leaveDates = new Set<string>();
      (leaveRequests || []).forEach(lr => {
        const startD = new Date(lr.start_date);
        for (let i = 0; i < (lr.days || 1); i++) {
          const d = new Date(startD);
          d.setDate(d.getDate() + i);
          leaveDates.add(format(d, 'yyyy-MM-dd'));
        }
      });

      // Calculate expected work days (excluding weekends, holidays, and approved leaves)
      const today = new Date();
      const effectiveEnd = dateRange.end > today ? today : dateRange.end;
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      
      let expectedDays = 0;
      if (effectiveEnd >= dateRange.start) {
        const allDays = eachDayOfInterval({ start: dateRange.start, end: effectiveEnd });
        expectedDays = allDays.filter(day => {
          const dayName = dayNames[day.getDay()];
          const dateStr = format(day, 'yyyy-MM-dd');
          return !weekendDays.includes(dayName) && !holidayDates.has(dateStr) && !leaveDates.has(dateStr);
        }).length;
      }

      // Present days: days with check-in (excluding absent status)
      const presentDays = attendanceLogs.filter(log => 
        log.status !== 'absent' && log.check_in_time
      ).length;

      // Absent days: expected days - present days (only days without permission)
      const absentWithoutPermission = attendanceLogs.filter(log => log.status === 'absent').length;
      const absentDays = Math.max(0, expectedDays - presentDays);

      // Total hours worked
      let totalMinutes = 0;
      attendanceLogs.forEach(log => {
        if (log.check_in_time && log.check_out_time) {
          const checkIn = parseISO(log.check_in_time);
          const checkOut = parseISO(log.check_out_time);
          totalMinutes += differenceInMinutes(checkOut, checkIn);
        }
      });
      const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

      // Late arrivals
      const lateArrivals = attendanceLogs.filter(log => {
        if (!log.check_in_time || log.status === 'absent') return false;
        const checkInTime = log.check_in_time.split('T')[1]?.slice(0, 5) || '00:00';
        const expectedTime = workStartTime.slice(0, 5);
        return checkInTime > expectedTime;
      }).length;

      // Commitment rate
      const commitmentRate = expectedDays > 0 ? Math.round((presentDays / expectedDays) * 100) : 100;

      return {
        presentDays,
        expectedDays,
        absentDays,
        totalHours,
        commitmentRate,
        lateArrivals,
        logs: attendanceLogs,
      };
    },
    enabled: !!employeeId && !!effectiveCompanyId,
  });
};
