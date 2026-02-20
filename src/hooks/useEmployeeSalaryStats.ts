import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdminCompanyAccess } from '@/hooks/useSuperAdminCompanyAccess';
import { useCompany } from './useCompany';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, differenceInMinutes, subMonths } from 'date-fns';

export type SalaryFilterPeriod = 'this_month' | 'last_month' | 'this_year' | 'all_time';

interface EmployeeSalaryStats {
  baseSalary: number;
  salaryType: 'monthly' | 'daily';
  earnedSalary: number;
  totalDeductions: number;
  totalBonuses: number;
  netSalary: number;
  deductionPercentage: number;
  workDays: number;
  expectedWorkDays: number;
  overtimeHours: number;
  overtimeAmount: number;
  lateMinutes: number;
  lateDeductionAmount: number;
}

export const useEmployeeSalaryStats = (
  employeeId: string | undefined,
  period: SalaryFilterPeriod,
  employee?: {
    base_salary: number;
    salary_type: 'monthly' | 'daily';
    work_start_time: string | null;
    work_end_time: string | null;
    weekend_days: string[] | null;
    break_duration_minutes: number | null;
    is_freelancer?: boolean;
    hourly_rate?: number | null;
  }
) => {
  const { effectiveCompanyId } = useSuperAdminCompanyAccess();
  const { data: company } = useCompany();

  // Calculate date range
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'this_month':
        return { start: startOfMonth(now), end: now };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'this_year':
        return { start: startOfYear(now), end: now };
      case 'all_time':
        return { start: new Date(2000, 0, 1), end: now };
    }
  }, [period]);

  // Fetch attendance for this employee in period
  const { data: attendanceLogs = [] } = useQuery({
    queryKey: ['employee-attendance-salary', employeeId, period, effectiveCompanyId],
    queryFn: async () => {
      if (!employeeId || !effectiveCompanyId) return [];
      
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('company_id', effectiveCompanyId)
        .gte('date', dateRange.start.toISOString().split('T')[0])
        .lte('date', dateRange.end.toISOString().split('T')[0]);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!employeeId && !!effectiveCompanyId,
  });

  // Fetch salary adjustments
  const { data: adjustments = [] } = useQuery({
    queryKey: ['employee-adjustments', employeeId, period, effectiveCompanyId],
    queryFn: async () => {
      if (!employeeId || !effectiveCompanyId) return [];
      
      const { data, error } = await supabase
        .from('salary_adjustments')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('company_id', effectiveCompanyId)
        .gte('month', dateRange.start.toISOString().split('T')[0])
        .lte('month', dateRange.end.toISOString().split('T')[0]);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!employeeId && !!effectiveCompanyId,
  });

  const stats = useMemo<EmployeeSalaryStats>(() => {
    if (!employee) {
      return {
        baseSalary: 0,
        salaryType: 'monthly',
        earnedSalary: 0,
        totalDeductions: 0,
        totalBonuses: 0,
        netSalary: 0,
        deductionPercentage: 0,
        workDays: 0,
        expectedWorkDays: 0,
        overtimeHours: 0,
        overtimeAmount: 0,
        lateMinutes: 0,
        lateDeductionAmount: 0,
      };
    }

    const isFreelancer = employee.is_freelancer === true;
    const hourlyRate = Number(employee.hourly_rate) || 0;
    const baseSalary = Number(employee.base_salary) || 0;
    const salaryType = employee.salary_type || 'monthly';
    const weekendDays = employee.weekend_days || ['friday', 'saturday'];
    const breakMinutes = employee.break_duration_minutes || 60;
    const overtimeMultiplier = Number(company?.overtime_multiplier) || 2;
    
    // Parse work hours
    const [startHour, startMin] = (employee.work_start_time || '09:00:00').split(':').map(Number);
    const [endHour, endMin] = (employee.work_end_time || '17:00:00').split(':').map(Number);
    const expectedDailyMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin) - breakMinutes;

    // Count expected work days
    const expectedWorkDays = getExpectedWorkDays(dateRange.start, dateRange.end, weekendDays);
    
    // Calculate actual work days and hours
    let workDays = 0;
    let totalWorkedMinutes = 0;
    let totalLateMinutes = 0;
    let totalOvertimeMinutes = 0;

    attendanceLogs.forEach(log => {
      // Skip absent logs entirely - they don't count as work days
      if (log.status === 'absent') return;

      if (log.check_in_time && log.check_out_time) {
        const checkIn = parseISO(log.check_in_time);
        const checkOut = parseISO(log.check_out_time);

        // Cap checkout to same-day end to avoid next-day overflow
        const sameDayEnd = new Date(checkIn);
        sameDayEnd.setHours(23, 59, 59, 999);
        const effectiveCheckOut = checkOut > sameDayEnd ? sameDayEnd : checkOut;

        workDays++;

        // Freelancers: no break subtraction (paid for raw hours worked)
        const workedMinutes = isFreelancer
          ? differenceInMinutes(effectiveCheckOut, checkIn)
          : differenceInMinutes(effectiveCheckOut, checkIn) - breakMinutes;
        totalWorkedMinutes += Math.max(0, workedMinutes);

        // For freelancers, skip late/overtime calculations - they're paid purely by hours
        if (!isFreelancer) {
          // Check late arrival
          const expectedStart = new Date(checkIn);
          expectedStart.setHours(startHour, startMin, 0, 0);
          if (checkIn > expectedStart) {
            totalLateMinutes += differenceInMinutes(checkIn, expectedStart);
          }

          // Check overtime
          if (workedMinutes > expectedDailyMinutes) {
            totalOvertimeMinutes += workedMinutes - expectedDailyMinutes;
          }
        }
      } else if (log.check_in_time) {
        // Only count as work day if still checked in (not yet checked out)
        if (log.status === 'checked_in' || log.status === 'on_break') {
          workDays++;
        }
      }
    });

    // Calculate earned salary
    let earnedSalary = 0;
    if (isFreelancer) {
      // Freelancer: paid by actual hours worked
      const totalHoursWorked = totalWorkedMinutes / 60;
      earnedSalary = totalHoursWorked * hourlyRate;
    } else if (salaryType === 'monthly') {
      // Monthly: proportional to days worked
      const dailyRate = baseSalary / 30;
      earnedSalary = dailyRate * workDays;
    } else {
      earnedSalary = baseSalary * workDays;
    }

    // Calculate overtime hours for display purposes only (informational)
    // Actual overtime bonuses come from salary_adjustments table (source of truth)
    let overtimeHours = 0;
    let overtimeAmount = 0; // Kept for display only, NOT added to netSalary
    if (!isFreelancer) {
      const regularHourlyRate = salaryType === 'monthly' 
        ? baseSalary / 30 / (expectedDailyMinutes / 60)
        : baseSalary / (expectedDailyMinutes / 60);
      overtimeHours = totalOvertimeMinutes / 60;
      overtimeAmount = overtimeHours * regularHourlyRate * overtimeMultiplier;
    }

    // Calculate late deductions display (informational only)
    // Real deductions are tracked in salary_adjustments (is_auto_generated=true)
    let lateDeductionAmount = 0;
    if (!isFreelancer && company) {
      const regularHourlyRate = salaryType === 'monthly' 
        ? baseSalary / 30 / (expectedDailyMinutes / 60)
        : baseSalary / (expectedDailyMinutes / 60);
      lateDeductionAmount = (totalLateMinutes / 60) * regularHourlyRate * 0.5;
    }

    // Sum adjustments from salary_adjustments table (source of truth for bonuses/deductions)
    const totalBonuses = adjustments.reduce((sum, adj) => sum + Number(adj.bonus || 0), 0);
    const totalDeductions = adjustments.reduce((sum, adj) => sum + Number(adj.deduction || 0), 0);

    // Net salary: earned + bonuses - deductions (all from salary_adjustments only)
    // Overtime is already recorded as a bonus in salary_adjustments, so we don't add it again here
    const netSalary = earnedSalary + totalBonuses - totalDeductions;
    const deductionPercentage = earnedSalary > 0 ? (totalDeductions / earnedSalary) * 100 : 0;

    return {
      baseSalary,
      salaryType,
      earnedSalary: Math.round(earnedSalary * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      totalBonuses: Math.round(totalBonuses * 100) / 100,
      netSalary: Math.round(netSalary * 100) / 100,
      deductionPercentage: Math.round(deductionPercentage * 10) / 10,
      workDays,
      expectedWorkDays,
      overtimeHours: Math.round(overtimeHours * 10) / 10,
      overtimeAmount: Math.round(overtimeAmount * 100) / 100,
      lateMinutes: totalLateMinutes,
      lateDeductionAmount: Math.round(lateDeductionAmount * 100) / 100,
    };
  }, [employee, attendanceLogs, adjustments, dateRange, company]);

  return stats;
};

function getExpectedWorkDays(start: Date, end: Date, weekendDays: string[]): number {
  let count = 0;
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const current = new Date(start);
  const endDate = new Date(end);
  
  while (current <= endDate) {
    const dayName = dayNames[current.getDay()];
    if (!weekendDays.includes(dayName)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}
