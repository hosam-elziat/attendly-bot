/**
 * Export utilities - Pure JavaScript implementation
 * Replaced vulnerable xlsx package with custom XLSX generation
 * Security: No external dependencies for spreadsheet generation
 */
import { format } from 'date-fns';

interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

/**
 * Escape XML special characters for XLSX generation
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Convert column index to Excel column letter (0 -> A, 1 -> B, 26 -> AA, etc.)
 */
function getColumnLetter(index: number): string {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}

/**
 * Generate a minimal valid XLSX file as a blob
 * This is a pure JavaScript implementation without external dependencies
 */
async function generateXlsxBlob(
  data: string[][],
  sheetName: string = 'Sheet1'
): Promise<Blob> {
  // Build sheet XML
  const rows = data.map((row, rowIndex) => {
    const cells = row.map((cell, colIndex) => {
      const cellRef = `${getColumnLetter(colIndex)}${rowIndex + 1}`;
      const escapedValue = escapeXml(String(cell));
      // Use inline string type (t="inlineStr")
      return `<c r="${cellRef}" t="inlineStr"><is><t>${escapedValue}</t></is></c>`;
    }).join('');
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join('');

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetData>${rows}</sheetData>
</worksheet>`;

  // Build workbook XML
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

  // Build workbook relationships
  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

  // Build content types
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

  // Build root relationships
  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  // Use JSZip-like approach with Blob API
  // Since we can't use external ZIP libraries, we'll use the browser's compression API if available
  // Fallback: Use a simple uncompressed ZIP structure
  
  const files: { path: string; content: string }[] = [
    { path: '[Content_Types].xml', content: contentTypesXml },
    { path: '_rels/.rels', content: rootRelsXml },
    { path: 'xl/workbook.xml', content: workbookXml },
    { path: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
    { path: 'xl/worksheets/sheet1.xml', content: sheetXml },
  ];

  // Create ZIP using CompressionStream if available, otherwise use uncompressed
  return createZipBlob(files);
}

/**
 * Create a ZIP blob from files using pure JavaScript
 */
async function createZipBlob(files: { path: string; content: string }[]): Promise<Blob> {
  const encoder = new TextEncoder();
  const blobParts: Blob[] = [];
  const centralDirectoryParts: Blob[] = [];
  let offset = 0;

  for (const file of files) {
    const pathBytes = encoder.encode(file.path);
    const contentBytes = encoder.encode(file.content);
    
    // Local file header
    const localHeader = new Uint8Array(30 + pathBytes.length);
    const localView = new DataView(localHeader.buffer);
    
    localView.setUint32(0, 0x04034b50, true); // Local file header signature
    localView.setUint16(4, 20, true); // Version needed to extract
    localView.setUint16(6, 0, true); // General purpose bit flag
    localView.setUint16(8, 0, true); // Compression method (stored)
    localView.setUint16(10, 0, true); // File last mod time
    localView.setUint16(12, 0, true); // File last mod date
    localView.setUint32(14, crc32(contentBytes), true); // CRC-32
    localView.setUint32(18, contentBytes.length, true); // Compressed size
    localView.setUint32(22, contentBytes.length, true); // Uncompressed size
    localView.setUint16(26, pathBytes.length, true); // File name length
    localView.setUint16(28, 0, true); // Extra field length
    localHeader.set(pathBytes, 30);

    blobParts.push(new Blob([localHeader]));
    blobParts.push(new Blob([contentBytes]));

    // Central directory header
    const centralHeader = new Uint8Array(46 + pathBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    
    centralView.setUint32(0, 0x02014b50, true); // Central directory signature
    centralView.setUint16(4, 20, true); // Version made by
    centralView.setUint16(6, 20, true); // Version needed to extract
    centralView.setUint16(8, 0, true); // General purpose bit flag
    centralView.setUint16(10, 0, true); // Compression method
    centralView.setUint16(12, 0, true); // File last mod time
    centralView.setUint16(14, 0, true); // File last mod date
    centralView.setUint32(16, crc32(contentBytes), true); // CRC-32
    centralView.setUint32(20, contentBytes.length, true); // Compressed size
    centralView.setUint32(24, contentBytes.length, true); // Uncompressed size
    centralView.setUint16(28, pathBytes.length, true); // File name length
    centralView.setUint16(30, 0, true); // Extra field length
    centralView.setUint16(32, 0, true); // File comment length
    centralView.setUint16(34, 0, true); // Disk number start
    centralView.setUint16(36, 0, true); // Internal file attributes
    centralView.setUint32(38, 0, true); // External file attributes
    centralView.setUint32(42, offset, true); // Relative offset of local header
    centralHeader.set(pathBytes, 46);
    
    centralDirectoryParts.push(new Blob([centralHeader]));
    offset += localHeader.length + contentBytes.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const header of centralDirectoryParts) {
    blobParts.push(header);
    centralDirSize += header.size;
  }

  // End of central directory record
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true); // End of central directory signature
  endView.setUint16(4, 0, true); // Number of this disk
  endView.setUint16(6, 0, true); // Disk where central directory starts
  endView.setUint16(8, files.length, true); // Number of central directory records on this disk
  endView.setUint16(10, files.length, true); // Total number of central directory records
  endView.setUint32(12, centralDirSize, true); // Size of central directory
  endView.setUint32(16, centralDirOffset, true); // Offset of start of central directory
  endView.setUint16(20, 0, true); // Comment length
  blobParts.push(new Blob([endRecord]));

  return new Blob(blobParts, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * CRC-32 implementation for ZIP files
 */
function crc32(data: Uint8Array): number {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export const exportToExcel = async <T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn[],
  filename: string,
  sheetName: string = 'Sheet1'
): Promise<void> => {
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

  try {
    const blob = await generateXlsxBlob(worksheetData, sheetName);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Excel export failed, falling back to CSV:', error);
    // Fallback to CSV if XLSX generation fails
    exportToCSV(data, columns, filename);
  }
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
