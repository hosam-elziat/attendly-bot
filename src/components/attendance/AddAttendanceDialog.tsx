import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, UserPlus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployees } from '@/hooks/useEmployees';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface AddAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddAttendanceDialog = ({ open, onOpenChange, onSuccess }: AddAttendanceDialogProps) => {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const { data: employees = [] } = useEmployees();
  const [submitting, setSubmitting] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [status, setStatus] = useState<'checked_in' | 'checked_out' | 'absent'>('checked_in');

  const resetForm = () => {
    setSelectedEmployee('');
    setCheckInTime('');
    setCheckOutTime('');
    setStatus('checked_in');
  };

  const handleOpen = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const handleSave = async () => {
    if (!selectedEmployee) {
      toast.error(language === 'ar' ? 'يرجى اختيار موظف' : 'Please select an employee');
      return;
    }

    if (status !== 'absent' && !checkInTime) {
      toast.error(language === 'ar' ? 'يرجى تحديد وقت الحضور' : 'Please set check-in time');
      return;
    }

    if (!profile?.company_id) return;

    setSubmitting(true);

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Check if there's already an attendance record for this employee today
      const { data: existing } = await supabase
        .from('attendance_logs')
        .select('id')
        .eq('employee_id', selectedEmployee)
        .eq('date', today)
        .maybeSingle();

      if (existing) {
        toast.error(language === 'ar' ? 'يوجد سجل حضور لهذا الموظف اليوم بالفعل' : 'Attendance record already exists for this employee today');
        setSubmitting(false);
        return;
      }

      const insertData: any = {
        employee_id: selectedEmployee,
        company_id: profile.company_id,
        date: today,
        status: status === 'absent' ? 'checked_out' : status,
      };

      if (status !== 'absent' && checkInTime) {
        insertData.check_in_time = `${today}T${checkInTime}:00`;
      }

      if (checkOutTime) {
        insertData.check_out_time = `${today}T${checkOutTime}:00`;
        insertData.status = 'checked_out';
      }

      const { error } = await supabase
        .from('attendance_logs')
        .insert(insertData);

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم إضافة سجل الحضور بنجاح' : 'Attendance record added successfully');
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error adding attendance:', error);
      toast.error(language === 'ar' ? 'فشل في إضافة سجل الحضور' : 'Failed to add attendance record');
    } finally {
      setSubmitting(false);
    }
  };

  const activeEmployees = employees.filter(emp => emp.is_active);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            {language === 'ar' ? 'إضافة سجل حضور' : 'Add Attendance Record'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الموظف' : 'Employee'}</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر موظف' : 'Select employee'} />
              </SelectTrigger>
              <SelectContent>
                {activeEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الحالة' : 'Status'}</Label>
            <Select value={status} onValueChange={(val) => setStatus(val as 'checked_in' | 'checked_out' | 'absent')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checked_in">{language === 'ar' ? 'حاضر' : 'Present'}</SelectItem>
                <SelectItem value="checked_out">{language === 'ar' ? 'انصرف' : 'Left'}</SelectItem>
                <SelectItem value="absent">{language === 'ar' ? 'غائب' : 'Absent'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status !== 'absent' && (
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

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSave} 
              disabled={submitting}
              className="flex-1"
            >
              {submitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {language === 'ar' ? 'إضافة' : 'Add'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleOpen(false)}
              className="flex-1"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddAttendanceDialog;
