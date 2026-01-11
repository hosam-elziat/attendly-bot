import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, UserPlus, Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployees } from '@/hooks/useEmployees';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useLogAction } from '@/hooks/useAuditLogs';

interface AddAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddAttendanceDialog = ({ open, onOpenChange, onSuccess }: AddAttendanceDialogProps) => {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const { data: employees = [] } = useEmployees();
  const logAction = useLogAction();
  const [submitting, setSubmitting] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [status, setStatus] = useState<'checked_in' | 'checked_out' | 'absent'>('checked_in');

  // Get selected employee's default work times
  const selectedEmployeeData = employees.find(emp => emp.id === selectedEmployee);

  const resetForm = () => {
    setSelectedEmployee('');
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    setCheckInTime('');
    setCheckOutTime('');
    setStatus('checked_in');
  };

  const handleOpen = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    } else {
      // Set today's date when opening
      setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    }
    onOpenChange(isOpen);
  };

  const handleSave = async () => {
    if (!selectedEmployee) {
      toast.error(language === 'ar' ? 'يرجى اختيار موظف' : 'Please select an employee');
      return;
    }

    if (!profile?.company_id) return;

    setSubmitting(true);

    try {
      // Check if there's already an attendance record for this employee on selected date
      const { data: existing } = await supabase
        .from('attendance_logs')
        .select('id')
        .eq('employee_id', selectedEmployee)
        .eq('date', selectedDate)
        .maybeSingle();

      if (existing) {
        toast.error(language === 'ar' ? 'يوجد سجل حضور لهذا الموظف في هذا التاريخ بالفعل' : 'Attendance record already exists for this employee on this date');
        setSubmitting(false);
        return;
      }

      const insertData: any = {
        employee_id: selectedEmployee,
        company_id: profile.company_id,
        date: selectedDate,
        status: status === 'absent' ? 'checked_out' : status,
      };

      // If no times selected and not absent, use employee's default work times
      if (status !== 'absent') {
        const defaultCheckIn = selectedEmployeeData?.work_start_time || '09:00:00';
        const defaultCheckOut = selectedEmployeeData?.work_end_time || '17:00:00';
        
        const checkInToUse = checkInTime || defaultCheckIn.slice(0, 5);
        const checkOutToUse = checkOutTime || defaultCheckOut.slice(0, 5);
        
        insertData.check_in_time = `${selectedDate}T${checkInToUse}:00`;
        
        if (checkOutTime || status === 'checked_out') {
          insertData.check_out_time = `${selectedDate}T${checkOutToUse}:00`;
          insertData.status = 'checked_out';
        }
      }

      const { data, error } = await supabase
        .from('attendance_logs')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await logAction.mutateAsync({
        tableName: 'attendance_logs',
        recordId: data.id,
        action: 'insert',
        newData: { ...insertData, id: data.id, full_name: selectedEmployeeData?.full_name },
      });

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
  const todayFormatted = format(new Date(), 'EEEE، d MMMM yyyy', { locale: language === 'ar' ? ar : undefined });

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            {language === 'ar' ? 'إضافة حضور' : 'Add Attendance'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Today's date display */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/50">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{todayFormatted}</span>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'التاريخ' : 'Date'}</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

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
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'وقت الحضور' : 'Check-in Time'}</Label>
                  <Input
                    type="time"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    placeholder={selectedEmployeeData?.work_start_time?.slice(0, 5) || '09:00'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'وقت الانصراف' : 'Check-out Time'}</Label>
                  <Input
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    placeholder={selectedEmployeeData?.work_end_time?.slice(0, 5) || '17:00'}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' 
                  ? 'اتركه فارغاً لاستخدام ساعات العمل الافتراضية للموظف'
                  : 'Leave empty to use employee\'s default work hours'}
              </p>
            </>
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
