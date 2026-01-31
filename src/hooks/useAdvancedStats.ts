import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdminCompanyAccess } from '@/hooks/useSuperAdminCompanyAccess';
import { startOfMonth, endOfMonth, format, eachDayOfInterval, isWeekend, differenceInMinutes, parseISO } from 'date-fns';

export interface AdvancedStats {
  teamCommitmentRate: number;
  absenceRate: number;
  mostAbsentEmployee: { name: string; count: number } | null;
  mostCommittedEmployee: { name: string; rate: number } | null;
  monthlyLateCount: number;
  totalBreakMinutes: number;
  totalOvertimeMinutes: number;
  avgOvertimePerEmployee: number;
  overtimeMultiplier: number;
}

export const useAdvancedStats = () => {
  const { effectiveCompanyId } = useSuperAdminCompanyAccess();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  return useQuery({
    queryKey: ['advanced-stats', effectiveCompanyId, format(monthStart, 'yyyy-MM')],
    queryFn: async (): Promise<AdvancedStats | null> => {
      if (!effectiveCompanyId) return null;

      // Get company settings
      const { data: company } = await supabase
        .from('companies')
        .select('work_start_time, work_end_time, overtime_multiplier')
        .eq('id', effectiveCompanyId)
        .single();

      const overtimeMultiplier = (company as any)?.overtime_multiplier || 2;
      const workStartTime = company?.work_start_time || '09:00:00';
      const workEndTime = company?.work_end_time || '17:00:00';

      // Get all active employees
      const { data: employees } = await supabase
        .from('employees')
        .select('id, full_name, weekend_days')
        .eq('company_id', effectiveCompanyId)
        .eq('is_active', true);

      if (!employees || employees.length === 0) {
        return {
          teamCommitmentRate: 0,
          absenceRate: 0,
          mostAbsentEmployee: null,
          mostCommittedEmployee: null,
          monthlyLateCount: 0,
          totalBreakMinutes: 0,
          totalOvertimeMinutes: 0,
          avgOvertimePerEmployee: 0,
          overtimeMultiplier,
        };
      }

      // Get attendance logs for this month
      const { data: attendanceLogs } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'));

      // Get break logs for this month
      const attendanceIds = attendanceLogs?.map(a => a.id) || [];
      let breakLogs: any[] = [];
      if (attendanceIds.length > 0) {
        const { data } = await supabase
          .from('break_logs')
          .select('*')
          .in('attendance_id', attendanceIds);
        breakLogs = data || [];
      }

      // Calculate work days in month (excluding weekends)
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: now > monthEnd ? monthEnd : now });
      
      // Calculate stats per employee
      const employeeStats: Map<string, { name: string; presentDays: number; totalDays: number; lateCount: number; overtimeMinutes: number }> = new Map();

      employees.forEach(emp => {
        const weekendDays = emp.weekend_days || ['friday', 'saturday'];
        const workDays = daysInMonth.filter(day => {
          const dayName = format(day, 'EEEE').toLowerCase();
          return !weekendDays.includes(dayName);
        });

        const empAttendance = attendanceLogs?.filter(a => a.employee_id === emp.id) || [];
        let lateCount = 0;
        let overtimeMinutes = 0;

        empAttendance.forEach(att => {
          if (att.check_in_time) {
            const checkInTime = att.check_in_time.split('T')[1]?.slice(0, 5) || '00:00';
            const expectedTime = workStartTime.slice(0, 5);
            if (checkInTime > expectedTime) {
              lateCount++;
            }
          }

          // Calculate overtime
          if (att.check_out_time && att.check_in_time) {
            const checkOut = parseISO(att.check_out_time);
            const expectedEndParts = workEndTime.split(':');
            const expectedEnd = new Date(checkOut);
            expectedEnd.setHours(parseInt(expectedEndParts[0]), parseInt(expectedEndParts[1]), 0);
            
            if (checkOut > expectedEnd) {
              overtimeMinutes += differenceInMinutes(checkOut, expectedEnd);
            }
          }
        });

        employeeStats.set(emp.id, {
          name: emp.full_name,
          presentDays: empAttendance.length,
          totalDays: workDays.length,
          lateCount,
          overtimeMinutes,
        });
      });

      // Calculate team commitment rate
      let totalPresent = 0;
      let totalExpected = 0;
      let totalLateCount = 0;
      let totalOvertimeMinutes = 0;

      employeeStats.forEach(stats => {
        totalPresent += stats.presentDays;
        totalExpected += stats.totalDays;
        totalLateCount += stats.lateCount;
        totalOvertimeMinutes += stats.overtimeMinutes;
      });

      const teamCommitmentRate = totalExpected > 0 ? (totalPresent / totalExpected) * 100 : 0;
      const absenceRate = totalExpected > 0 ? ((totalExpected - totalPresent) / totalExpected) * 100 : 0;

      // Find most absent and most committed
      let mostAbsent: { name: string; count: number } | null = null;
      let mostCommitted: { name: string; rate: number } | null = null;

      employeeStats.forEach(stats => {
        const absentCount = stats.totalDays - stats.presentDays;
        const commitmentRate = stats.totalDays > 0 ? (stats.presentDays / stats.totalDays) * 100 : 0;

        if (!mostAbsent || absentCount > mostAbsent.count) {
          mostAbsent = { name: stats.name, count: absentCount };
        }
        if (!mostCommitted || commitmentRate > mostCommitted.rate) {
          mostCommitted = { name: stats.name, rate: commitmentRate };
        }
      });

      // Calculate total break minutes
      const totalBreakMinutes = breakLogs.reduce((sum, b) => sum + (b.duration_minutes || 0), 0);

      return {
        teamCommitmentRate: Math.round(teamCommitmentRate),
        absenceRate: Math.round(absenceRate),
        mostAbsentEmployee: mostAbsent,
        mostCommittedEmployee: mostCommitted,
        monthlyLateCount: totalLateCount,
        totalBreakMinutes,
        totalOvertimeMinutes,
        avgOvertimePerEmployee: employees.length > 0 ? Math.round(totalOvertimeMinutes / employees.length) : 0,
        overtimeMultiplier,
      };
    },
    enabled: !!effectiveCompanyId,
  });
};

// Country codes for public holidays
export const COUNTRIES = [
  { code: 'SA', name: 'السعودية', flag: '🇸🇦' },
  { code: 'AE', name: 'الإمارات', flag: '🇦🇪' },
  { code: 'EG', name: 'مصر', flag: '🇪🇬' },
  { code: 'JO', name: 'الأردن', flag: '🇯🇴' },
  { code: 'KW', name: 'الكويت', flag: '🇰🇼' },
  { code: 'QA', name: 'قطر', flag: '🇶🇦' },
  { code: 'BH', name: 'البحرين', flag: '🇧🇭' },
  { code: 'OM', name: 'عُمان', flag: '🇴🇲' },
  { code: 'LB', name: 'لبنان', flag: '🇱🇧' },
  { code: 'SY', name: 'سوريا', flag: '🇸🇾' },
  { code: 'IQ', name: 'العراق', flag: '🇮🇶' },
  { code: 'YE', name: 'اليمن', flag: '🇾🇪' },
  { code: 'MA', name: 'المغرب', flag: '🇲🇦' },
  { code: 'DZ', name: 'الجزائر', flag: '🇩🇿' },
  { code: 'TN', name: 'تونس', flag: '🇹🇳' },
  { code: 'LY', name: 'ليبيا', flag: '🇱🇾' },
  { code: 'SD', name: 'السودان', flag: '🇸🇩' },
];
