import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployees } from '@/hooks/useEmployees';
import { usePositions } from '@/hooks/usePositions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { ScheduledLeave } from '@/hooks/useScheduledLeaves';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Loader2, Users, User, Briefcase, Edit } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface EditScheduledLeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leave: ScheduledLeave | null;
}

export default function EditScheduledLeaveDialog({
  open,
  onOpenChange,
  leave,
}: EditScheduledLeaveDialogProps) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { data: employees = [] } = useEmployees();
  const { data: positions = [] } = usePositions();
  
  const [loading, setLoading] = useState(false);
  const [leaveName, setLeaveName] = useState('');
  const [leaveDate, setLeaveDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [targetType, setTargetType] = useState<'company' | 'position' | 'employee'>('company');
  const [targetId, setTargetId] = useState<string>('');
  const [reason, setReason] = useState('');

  const activeEmployees = employees.filter(e => e.is_active);
  const activePositions = positions.filter(p => p.is_active);

  // Populate form when leave changes
  useEffect(() => {
    if (leave) {
      setLeaveName(leave.leave_name);
      setLeaveDate(parseISO(leave.leave_date));
      setEndDate(leave.end_date ? parseISO(leave.end_date) : undefined);
      setTargetType(leave.target_type);
      setTargetId(leave.target_id || '');
      setReason(leave.reason || '');
    }
  }, [leave]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!leave || !leaveName) {
      toast.error(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    if ((targetType === 'position' || targetType === 'employee') && !targetId) {
      toast.error(language === 'ar' ? 'يرجى اختيار الهدف' : 'Please select a target');
      return;
    }

    const formattedLeaveDate = format(leaveDate, 'yyyy-MM-dd');
    const formattedEndDate = endDate ? format(endDate, 'yyyy-MM-dd') : formattedLeaveDate;

    setLoading(true);
    try {
      // Update scheduled leave
      const { error } = await supabase
        .from('scheduled_leaves')
        .update({
          leave_name: leaveName,
          leave_date: formattedLeaveDate,
          end_date: formattedEndDate,
          leave_type: targetType === 'company' ? 'company_wide' : targetType === 'position' ? 'position_based' : 'individual',
          target_type: targetType,
          target_id: targetType !== 'company' ? targetId : null,
          reason,
        })
        .eq('id', leave.id);

      if (error) throw error;

      // Send update notifications
      const { error: notifyError } = await supabase.functions.invoke('notify-scheduled-leave-update', {
        body: { 
          scheduled_leave_id: leave.id,
          action: 'update'
        }
      });

      if (notifyError) {
        console.error('Failed to send notifications:', notifyError);
      }

      toast.success(language === 'ar' ? 'تم تحديث الإجازة بنجاح' : 'Leave updated successfully');
      queryClient.invalidateQueries({ queryKey: ['scheduled-leaves'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating scheduled leave:', error);
      toast.error(language === 'ar' ? 'فشل في تحديث الإجازة' : 'Failed to update leave');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            {language === 'ar' ? 'تعديل الإجازة المجدولة' : 'Edit Scheduled Leave'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'اسم/سبب الإجازة *' : 'Leave Name/Reason *'}</Label>
            <Input
              value={leaveName}
              onChange={(e) => setLeaveName(e.target.value)}
              placeholder={language === 'ar' ? 'مثال: عطلة رسمية، إجازة خاصة...' : 'e.g., Public holiday, Special leave...'}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'تاريخ البداية *' : 'Start Date *'}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !leaveDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="me-2 h-4 w-4" />
                    {leaveDate ? format(leaveDate, 'PPP', { locale: language === 'ar' ? ar : undefined }) : (
                      <span>{language === 'ar' ? 'اختر تاريخ' : 'Pick a date'}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={leaveDate}
                    onSelect={(date) => date && setLeaveDate(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={language === 'ar' ? ar : undefined}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'تاريخ النهاية' : 'End Date'}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="me-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP', { locale: language === 'ar' ? ar : undefined }) : (
                      <span>{language === 'ar' ? 'اختياري' : 'Optional'}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => date < leaveDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={language === 'ar' ? ar : undefined}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'نوع الإجازة *' : 'Leave Type *'}</Label>
            <Select value={targetType} onValueChange={(v: 'company' | 'position' | 'employee') => {
              setTargetType(v);
              setTargetId('');
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {language === 'ar' ? 'إجازة عامة للشركة' : 'Company-wide Leave'}
                  </div>
                </SelectItem>
                <SelectItem value="position">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    {language === 'ar' ? 'إجازة لمنصب معين' : 'Position-specific Leave'}
                  </div>
                </SelectItem>
                <SelectItem value="employee">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {language === 'ar' ? 'إجازة لموظف معين' : 'Employee-specific Leave'}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {targetType === 'position' && (
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'اختر المنصب *' : 'Select Position *'}</Label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر المنصب' : 'Select position'} />
                </SelectTrigger>
                <SelectContent>
                  {activePositions.map((pos) => (
                    <SelectItem key={pos.id} value={pos.id}>
                      {language === 'ar' ? (pos.title_ar || pos.title) : pos.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {targetType === 'employee' && (
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'اختر الموظف *' : 'Select Employee *'}</Label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر الموظف' : 'Select employee'} />
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
          )}

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'ملاحظات إضافية' : 'Additional Notes'}</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={language === 'ar' ? 'ملاحظات اختيارية...' : 'Optional notes...'}
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {language === 'ar' ? 'جاري التحديث...' : 'Updating...'}
                </>
              ) : (
                language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
