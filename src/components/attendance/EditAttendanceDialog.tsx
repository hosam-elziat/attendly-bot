import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { useLogAction } from '@/hooks/useAuditLogs';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  company_id: string;
  employees?: {
    full_name: string;
  };
}

interface EditAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: AttendanceRecord | null;
  onSuccess: () => void;
}

const EditAttendanceDialog = ({ open, onOpenChange, record, onSuccess }: EditAttendanceDialogProps) => {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const { data: company } = useCompany();
  const logAction = useLogAction();
  const [submitting, setSubmitting] = useState(false);
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [status, setStatus] = useState('');

  // Extract time in HH:mm format without timezone conversion issues
  const extractTimeFromTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return '';
    // Parse the time part directly from the ISO string to avoid timezone shifts
    const match = timestamp.match(/T(\d{2}):(\d{2})/);
    if (match) {
      return `${match[1]}:${match[2]}`;
    }
    // Fallback: use Date parsing
    const date = new Date(timestamp);
    return format(date, "HH:mm");
  };

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && record) {
      setCheckInTime(extractTimeFromTimestamp(record.check_in_time));
      setCheckOutTime(extractTimeFromTimestamp(record.check_out_time));
      setStatus(record.status || 'checked_in');
    }
    onOpenChange(isOpen);
  };

  const handleSave = async () => {
    if (!record) return;

    setSubmitting(true);

    try {
      // Use the record's actual date, not today
      const recordDate = record.date;
      const wasAbsent = record.status === 'absent';
      const isNowAbsent = status === 'absent';
      
      const updates: any = {
        status: status as "checked_in" | "on_break" | "checked_out" | "absent",
      };

      // Get local timezone offset to preserve the intended time
      const getTimezoneOffset = () => {
        const offset = new Date().getTimezoneOffset();
        const sign = offset <= 0 ? '+' : '-';
        const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
        const minutes = String(Math.abs(offset) % 60).padStart(2, '0');
        return `${sign}${hours}:${minutes}`;
      };

      const tzOffset = getTimezoneOffset();
      const oldCheckInTime = record.check_in_time;
      const oldCheckOutTime = record.check_out_time;
      let newCheckInTimeFormatted = '';
      let newCheckOutTimeFormatted = '';

      // If marking as absent, clear times
      if (isNowAbsent) {
        updates.check_in_time = null;
        updates.check_out_time = null;
      } else {
        if (checkInTime) {
          // Include timezone offset to ensure correct time is stored
          newCheckInTimeFormatted = `${recordDate}T${checkInTime}:00${tzOffset}`;
          updates.check_in_time = newCheckInTimeFormatted;
        }

        if (checkOutTime) {
          newCheckOutTimeFormatted = `${recordDate}T${checkOutTime}:00${tzOffset}`;
          updates.check_out_time = newCheckOutTimeFormatted;
        }
      }

      // Store old data for logging
      const oldData = {
        ...record,
        full_name: record.employees?.full_name,
      };

      const { data, error } = await supabase
        .from('attendance_logs')
        .update(updates)
        .eq('id', record.id)
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await logAction.mutateAsync({
        tableName: 'attendance_logs',
        recordId: record.id,
        action: 'update',
        oldData,
        newData: { ...data, full_name: record.employees?.full_name },
      });

      // If status changed to absent, apply absence deduction
      if (!wasAbsent && isNowAbsent) {
        console.log('Status changed to absent, applying deduction...');
        
        // Get absence deduction amount from company settings
        const absenceDeduction = company?.absence_without_permission_deduction || 1;
        const month = recordDate.substring(0, 7); // YYYY-MM format
        
        // First, remove any existing auto-generated deductions for this attendance log
        await supabase
          .from('salary_adjustments')
          .delete()
          .eq('attendance_log_id', record.id)
          .eq('is_auto_generated', true);
        
        // Insert absence deduction
        const { error: deductionError } = await supabase
          .from('salary_adjustments')
          .insert({
            employee_id: record.employee_id,
            company_id: record.company_id,
            month: month,
            deduction: 0,
            adjustment_days: absenceDeduction,
            description: language === 'ar' 
              ? `غياب بدون إذن - ${recordDate}` 
              : `Absence without permission - ${recordDate}`,
            is_auto_generated: true,
            attendance_log_id: record.id,
            added_by: profile?.user_id,
            added_by_name: profile?.full_name || 'المدير'
          });

        if (deductionError) {
          console.error('Error applying absence deduction:', deductionError);
        } else {
          toast.info(
            language === 'ar' 
              ? `تم تطبيق خصم ${absenceDeduction} يوم للغياب` 
              : `Applied ${absenceDeduction} day absence deduction`
          );
        }
      } 
      // If status changed FROM absent to something else, remove absence deduction
      else if (wasAbsent && !isNowAbsent) {
        console.log('Status changed from absent, removing deduction...');
        
        await supabase
          .from('salary_adjustments')
          .delete()
          .eq('attendance_log_id', record.id)
          .eq('is_auto_generated', true);
        
        toast.info(
          language === 'ar' 
            ? 'تم إلغاء خصم الغياب' 
            : 'Absence deduction removed'
        );
      }
      // If check-in time was modified (and not absent), recalculate deductions
      else if (!isNowAbsent && checkInTime && oldCheckInTime !== newCheckInTimeFormatted) {
        console.log('Check-in time changed, recalculating deductions...');
        
        try {
          const { data: result, error: recalcError } = await supabase.functions.invoke('recalculate-attendance-deduction', {
            body: {
              attendance_log_id: record.id,
              old_check_in_time: oldCheckInTime,
              new_check_in_time: newCheckInTimeFormatted,
              editor_name: profile?.full_name || 'المدير'
            }
          });

          if (recalcError) {
            console.error('Error recalculating deductions:', recalcError);
          } else {
            console.log('Deduction recalculation result:', result);
            
            if (result?.deduction_days > 0) {
              toast.info(
                language === 'ar' 
                  ? `تم تطبيق خصم ${result.deduction_days} يوم` 
                  : `Applied ${result.deduction_days} day deduction`
              );
            } else if (result?.old_late_minutes > 0 && result?.new_late_minutes === 0) {
              toast.info(
                language === 'ar' 
                  ? 'تم إلغاء الخصم السابق' 
                  : 'Previous deduction removed'
              );
            }
          }
        } catch (recalcErr) {
          console.error('Failed to recalculate deductions:', recalcErr);
        }
      }
      
      // If check-out time was modified, remove overtime bonuses related to this attendance
      if (!isNowAbsent && checkOutTime && oldCheckOutTime !== newCheckOutTimeFormatted) {
        console.log('Check-out time changed, removing overtime adjustments...');
        
        // Delete any overtime-related bonuses for this attendance log
        const { data: deletedAdjustments, error: deleteError } = await supabase
          .from('salary_adjustments')
          .delete()
          .eq('attendance_log_id', record.id)
          .eq('is_auto_generated', true)
          .or('description.ilike.%وقت إضافي%,description.ilike.%overtime%')
          .select();
        
        if (deleteError) {
          console.error('Error removing overtime adjustments:', deleteError);
        } else if (deletedAdjustments && deletedAdjustments.length > 0) {
          console.log(`Removed ${deletedAdjustments.length} overtime adjustment(s)`);
          toast.info(
            language === 'ar' 
              ? 'تم حذف الوقت الإضافي والمكافأة' 
              : 'Overtime and bonus removed'
          );
        }
      }

      toast.success(language === 'ar' ? 'تم تحديث الحضور بنجاح' : 'Attendance updated successfully');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error(language === 'ar' ? 'فشل في تحديث الحضور' : 'Failed to update attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const isAbsent = status === 'absent';

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            {language === 'ar' ? 'تعديل الحضور' : 'Edit Attendance'}
          </DialogTitle>
        </DialogHeader>
        
        {record && (
          <div className="space-y-4 mt-4">
            <div className="p-3 rounded-lg bg-accent/50">
              <p className="font-medium text-foreground">{record.employees?.full_name}</p>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الحالة' : 'Status'}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checked_in">{language === 'ar' ? 'حاضر' : 'Checked In'}</SelectItem>
                  <SelectItem value="on_break">{language === 'ar' ? 'استراحة' : 'On Break'}</SelectItem>
                  <SelectItem value="checked_out">{language === 'ar' ? 'انصرف' : 'Checked Out'}</SelectItem>
                  <SelectItem value="absent">{language === 'ar' ? 'غائب' : 'Absent'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!isAbsent && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'وقت الحضور' : 'Check-in Time'}</Label>
                  <Input
                    type="time"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'وقت الانصراف' : 'Check-out Time'}</Label>
                  <Input
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            {isAbsent && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">
                  {language === 'ar' 
                    ? `سيتم تطبيق خصم ${company?.absence_without_permission_deduction || 1} يوم على الراتب` 
                    : `A deduction of ${company?.absence_without_permission_deduction || 1} day(s) will be applied to salary`}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleSave} 
                disabled={submitting}
                className="flex-1"
              >
                {submitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditAttendanceDialog;
