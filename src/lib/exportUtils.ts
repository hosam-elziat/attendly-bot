import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export const exportToExcel = <T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn[],
  filename: string,
  sheetName: string = 'Sheet1'
): void => {
  // Create worksheet data with headers
  const worksheetData = [
    columns.map(col => col.header),
    ...data.map(item => 
      columns.map(col => {
        const value = item[col.key];
        // Handle different types
        if (value === null || value === undefined) return '';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (value instanceof Date) return format(value, 'yyyy-MM-dd HH:mm');
        return String(value);
      })
    )
  ];

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  worksheet['!cols'] = columns.map(col => ({ wch: col.width || 15 }));

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate file and trigger download
  XLSX.writeFile(workbook, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};

export const exportToCSV = <T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
): void => {
  // Create CSV content
  const headers = columns.map(col => col.header).join(',');
  const rows = data.map(item =>
    columns.map(col => {
      const value = item[col.key];
      if (value === null || value === undefined) return '';
      // Escape quotes and wrap in quotes if contains comma
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  );

  const csvContent = [headers, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Salary export helpers
export const exportSalaryReport = (
  employees: Array<{
    full_name: string;
    base_salary: number | null;
    total_bonus: number;
    total_deduction: number;
    work_days: number;
    currency: string | null;
  }>,
  month: string,
  isRTL: boolean
): void => {
  const columns: ExportColumn[] = isRTL
    ? [
        { header: 'اسم الموظف', key: 'full_name', width: 25 },
        { header: 'الراتب الأساسي', key: 'base_salary', width: 15 },
        { header: 'المكافآت', key: 'total_bonus', width: 12 },
        { header: 'الخصومات', key: 'total_deduction', width: 12 },
        { header: 'صافي الراتب', key: 'net_salary', width: 15 },
        { header: 'أيام العمل', key: 'work_days', width: 12 },
        { header: 'العملة', key: 'currency', width: 10 },
      ]
    : [
        { header: 'Employee Name', key: 'full_name', width: 25 },
        { header: 'Base Salary', key: 'base_salary', width: 15 },
        { header: 'Bonuses', key: 'total_bonus', width: 12 },
        { header: 'Deductions', key: 'total_deduction', width: 12 },
        { header: 'Net Salary', key: 'net_salary', width: 15 },
        { header: 'Work Days', key: 'work_days', width: 12 },
        { header: 'Currency', key: 'currency', width: 10 },
      ];

  const dataWithNet = employees.map(emp => ({
    ...emp,
    base_salary: emp.base_salary || 0,
    net_salary: (emp.base_salary || 0) + emp.total_bonus - emp.total_deduction,
    currency: emp.currency || 'SAR',
  }));

  exportToExcel(dataWithNet, columns, `salary_report_${month}`, isRTL ? 'تقرير الرواتب' : 'Salary Report');
};

// Attendance export helpers
export const exportAttendanceReport = (
  attendance: Array<{
    employee_name: string;
    date: string;
    check_in_time: string | null;
    check_out_time: string | null;
    status: string;
    notes: string | null;
  }>,
  isRTL: boolean
): void => {
  const columns: ExportColumn[] = isRTL
    ? [
        { header: 'اسم الموظف', key: 'employee_name', width: 25 },
        { header: 'التاريخ', key: 'date', width: 12 },
        { header: 'وقت الحضور', key: 'check_in_time', width: 12 },
        { header: 'وقت الانصراف', key: 'check_out_time', width: 12 },
        { header: 'الحالة', key: 'status', width: 12 },
        { header: 'ملاحظات', key: 'notes', width: 25 },
      ]
    : [
        { header: 'Employee Name', key: 'employee_name', width: 25 },
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Check In', key: 'check_in_time', width: 12 },
        { header: 'Check Out', key: 'check_out_time', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Notes', key: 'notes', width: 25 },
      ];

  exportToExcel(attendance, columns, 'attendance_report', isRTL ? 'تقرير الحضور' : 'Attendance Report');
};

// Employees export helpers
export const exportEmployeesReport = (
  employees: Array<{
    full_name: string;
    email: string;
    phone: string | null;
    department: string | null;
    hire_date: string | null;
    base_salary: number | null;
    is_active: boolean;
  }>,
  isRTL: boolean
): void => {
  const columns: ExportColumn[] = isRTL
    ? [
        { header: 'الاسم', key: 'full_name', width: 25 },
        { header: 'البريد الإلكتروني', key: 'email', width: 30 },
        { header: 'الهاتف', key: 'phone', width: 15 },
        { header: 'القسم', key: 'department', width: 15 },
        { header: 'تاريخ التعيين', key: 'hire_date', width: 12 },
        { header: 'الراتب', key: 'base_salary', width: 12 },
        { header: 'نشط', key: 'is_active', width: 8 },
      ]
    : [
        { header: 'Name', key: 'full_name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Department', key: 'department', width: 15 },
        { header: 'Hire Date', key: 'hire_date', width: 12 },
        { header: 'Salary', key: 'base_salary', width: 12 },
        { header: 'Active', key: 'is_active', width: 8 },
      ];

  exportToExcel(employees, columns, 'employees_report', isRTL ? 'تقرير الموظفين' : 'Employees Report');
};
