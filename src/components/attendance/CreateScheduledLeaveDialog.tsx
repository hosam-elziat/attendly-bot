import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/hooks/useEmployees';
import { usePositions } from '@/hooks/usePositions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
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
import { Calendar, Loader2, Users, User, Briefcase } from 'lucide-react';
import { format } from 'date-fns';

interface CreateScheduledLeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateScheduledLeaveDialog({
  open,
  onOpenChange,
}: CreateScheduledLeaveDialogProps) {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: employees = [] } = useEmployees();
  const { data: positions = [] } = usePositions();
  
  const [loading, setLoading] = useState(false);
  const [leaveName, setLeaveName] = useState('');
  const [leaveDate, setLeaveDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');
  const [targetType, setTargetType] = useState<'company' | 'position' | 'employee'>('company');
  const [targetId, setTargetId] = useState<string>('');
  const [reason, setReason] = useState('');

  const activeEmployees = employees.filter(e => e.is_active);
  const activePositions = positions.filter(p => p.is_active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.company_id || !leaveName || !leaveDate) {
      toast.error(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    if ((targetType === 'position' || targetType === 'employee') && !targetId) {
      toast.error(language === 'ar' ? 'يرجى اختيار الهدف' : 'Please select a target');
      return;
    }

    setLoading(true);
    try {
      // Create scheduled leave
      const { data: scheduledLeave, error } = await supabase
        .from('scheduled_leaves')
        .insert({
          company_id: profile.company_id,
          leave_name: leaveName,
          leave_date: leaveDate,
          end_date: endDate || leaveDate,
          leave_type: targetType === 'company' ? 'company_wide' : targetType === 'position' ? 'position_based' : 'individual',
          target_type: targetType,
          target_id: targetType !== 'company' ? targetId : null,
          reason,
          created_by: profile.user_id,
          created_by_name: profile.full_name,
        })
        .select()
        .single();

      if (error) throw error;

      // Send notifications
      const { error: notifyError } = await supabase.functions.invoke('notify-scheduled-leave', {
        body: { scheduled_leave_id: scheduledLeave.id }
      });

      if (notifyError) {
        console.error('Failed to send notifications:', notifyError);
      }

      toast.success(language === 'ar' ? 'تم إنشاء الإجازة بنجاح' : 'Leave created successfully');
      queryClient.invalidateQueries({ queryKey: ['scheduled-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      
      // Reset form
      setLeaveName('');
      setLeaveDate(format(new Date(), 'yyyy-MM-dd'));
      setEndDate('');
      setTargetType('company');
      setTargetId('');
      setReason('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating scheduled leave:', error);
      toast.error(language === 'ar' ? 'فشل في إنشاء الإجازة' : 'Failed to create leave');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {language === 'ar' ? 'إنشاء إجازة مجدولة' : 'Create Scheduled Leave'}
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
              <Input
                type="date"
                value={leaveDate}
                onChange={(e) => setLeaveDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'تاريخ النهاية' : 'End Date'}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={leaveDate}
              />
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
                  {language === 'ar' ? 'جاري الإنشاء...' : 'Creating...'}
                </>
              ) : (
                language === 'ar' ? 'إنشاء الإجازة' : 'Create Leave'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
