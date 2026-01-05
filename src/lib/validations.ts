import { z } from 'zod';

// Employee validation schema
export const EmployeeSchema = z.object({
  full_name: z.string()
    .trim()
    .min(1, 'Full name is required')
    .max(100, 'Full name must be less than 100 characters'),
  email: z.string()
    .trim()
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters'),
  department: z.string()
    .trim()
    .max(100, 'Department must be less than 100 characters')
    .optional()
    .nullable(),
  salary_type: z.enum(['monthly', 'daily']).default('monthly'),
  base_salary: z.number()
    .min(0, 'Salary cannot be negative')
    .max(999999999, 'Salary exceeds maximum allowed'),
  work_start_time: z.string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format')
    .optional(),
  work_end_time: z.string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format')
    .optional(),
  break_duration_minutes: z.number()
    .min(0, 'Break duration cannot be negative')
    .max(480, 'Break duration cannot exceed 8 hours')
    .optional(),
  weekend_days: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

export type ValidatedEmployeeData = z.infer<typeof EmployeeSchema>;

// Company validation schema
export const CompanySchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Company name is required')
    .max(100, 'Company name must be less than 100 characters'),
  timezone: z.string()
    .max(50, 'Timezone must be less than 50 characters')
    .optional(),
  work_start_time: z.string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format')
    .optional(),
  work_end_time: z.string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format')
    .optional(),
  break_duration_minutes: z.number()
    .min(0, 'Break duration cannot be negative')
    .max(480, 'Break duration cannot exceed 8 hours')
    .optional(),
});

export type ValidatedCompanyData = z.infer<typeof CompanySchema>;

// Leave request validation schema
export const LeaveRequestSchema = z.object({
  leave_type: z.enum(['vacation', 'sick', 'personal']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  days: z.number()
    .min(1, 'Leave must be at least 1 day')
    .max(365, 'Leave cannot exceed 365 days'),
  reason: z.string()
    .trim()
    .max(500, 'Reason must be less than 500 characters')
    .optional()
    .nullable(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

export type ValidatedLeaveRequestData = z.infer<typeof LeaveRequestSchema>;

// Auth validation schema
export const AuthSchema = z.object({
  email: z.string()
    .trim()
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(72, 'Password must be less than 72 characters'),
  fullName: z.string()
    .trim()
    .min(1, 'Full name is required')
    .max(100, 'Full name must be less than 100 characters')
    .optional(),
  companyName: z.string()
    .trim()
    .min(1, 'Company name is required')
    .max(100, 'Company name must be less than 100 characters')
    .optional(),
});

export const SignUpSchema = AuthSchema.extend({
  fullName: z.string()
    .trim()
    .min(1, 'Full name is required')
    .max(100, 'Full name must be less than 100 characters'),
  companyName: z.string()
    .trim()
    .min(1, 'Company name is required')
    .max(100, 'Company name must be less than 100 characters'),
});

export const SignInSchema = AuthSchema.pick({
  email: true,
  password: true,
});

export type ValidatedSignUpData = z.infer<typeof SignUpSchema>;
export type ValidatedSignInData = z.infer<typeof SignInSchema>;

// Utility function to safely parse and get errors
export function validateWithErrors<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });
  
  return { success: false, errors };
}
