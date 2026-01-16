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

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
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
      
      const updates: any = {
        status: status as "checked_in" | "on_break" | "checked_out",
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

      if (checkInTime) {
        // Include timezone offset to ensure correct time is stored
        updates.check_in_time = `${recordDate}T${checkInTime}:00${tzOffset}`;
      }

      if (checkOutTime) {
        updates.check_out_time = `${recordDate}T${checkOutTime}:00${tzOffset}`;
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
                </SelectContent>
              </Select>
            </div>

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
