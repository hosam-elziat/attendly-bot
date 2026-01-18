import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Clock, Coffee } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface AbsentEmployeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AbsentEmployee {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  weekend_days: string[] | null;
  reason: 'no_checkin' | 'on_leave' | 'weekend' | 'pending_leave' | 'marked_absent';
  leaveType?: string;
  leaveReason?: string;
}

const AbsentEmployeesDialog = ({ open, onOpenChange }: AbsentEmployeesDialogProps) => {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const dayOfWeek = format(today, 'EEEE').toLowerCase();

  const { data: absentEmployees = [], isLoading } = useQuery({
    queryKey: ['absent-employees', profile?.company_id, todayStr],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      // Get all active employees
      const { data: employees } = await supabase
        .from('employees')
        .select('id, full_name, email, department, weekend_days')
        .eq('company_id', profile.company_id)
        .eq('is_active', true);

      if (!employees) return [];

      // Get today's attendance with status
      const { data: attendance } = await supabase
        .from('attendance_logs')
        .select('employee_id, status')
        .eq('company_id', profile.company_id)
        .eq('date', todayStr);

      const checkedInIds = new Set(
        attendance?.filter(a => a.status !== 'absent').map(a => a.employee_id) || []
      );
      const markedAbsentIds = new Set(
        attendance?.filter(a => a.status === 'absent').map(a => a.employee_id) || []
      );

      // Get approved leaves for today
      const { data: approvedLeaves } = await supabase
        .from('leave_requests')
        .select('employee_id, leave_type, reason')
        .eq('company_id', profile.company_id)
        .eq('status', 'approved')
        .lte('start_date', todayStr)
        .gte('end_date', todayStr);

      const onLeaveMap = new Map(
        approvedLeaves?.map(l => [l.employee_id, { type: l.leave_type, reason: l.reason }]) || []
      );

      // Get pending leaves for today
      const { data: pendingLeaves } = await supabase
        .from('leave_requests')
        .select('employee_id')
        .eq('company_id', profile.company_id)
        .eq('status', 'pending')
        .lte('start_date', todayStr)
        .gte('end_date', todayStr);

      const pendingLeaveIds = new Set(pendingLeaves?.map(l => l.employee_id) || []);

      // Find absent employees
      const absent: AbsentEmployee[] = [];

      for (const emp of employees) {
        // Skip if already checked in (and not absent)
        if (checkedInIds.has(emp.id)) continue;

        // Check if marked as absent
        if (markedAbsentIds.has(emp.id)) {
          absent.push({
            ...emp,
            reason: 'marked_absent',
          });
          continue;
        }

        // Check if it's their weekend
        const weekendDays = emp.weekend_days || ['friday'];
        if (weekendDays.includes(dayOfWeek)) {
          absent.push({
            ...emp,
            reason: 'weekend',
          });
          continue;
        }

        // Check if on approved leave
        const leaveInfo = onLeaveMap.get(emp.id);
        if (leaveInfo) {
          absent.push({
            ...emp,
            reason: 'on_leave',
            leaveType: leaveInfo.type,
            leaveReason: leaveInfo.reason || undefined,
          });
          continue;
        }

        // Check if has pending leave
        if (pendingLeaveIds.has(emp.id)) {
          absent.push({
            ...emp,
            reason: 'pending_leave',
          });
          continue;
        }

        // Otherwise, no check-in
        absent.push({
          ...emp,
          reason: 'no_checkin',
        });
      }

      return absent;
    },
    enabled: open && !!profile?.company_id,
  });

  const getReasonBadge = (emp: AbsentEmployee) => {
    switch (emp.reason) {
      case 'weekend':
        return (
          <Badge variant="secondary" className="gap-1">
            <Coffee className="w-3 h-3" />
            {language === 'ar' ? 'إجازة أسبوعية' : 'Weekend'}
          </Badge>
        );
      case 'on_leave':
        return (
          <Badge className="bg-success hover:bg-success/90 gap-1">
            <Calendar className="w-3 h-3" />
            {language === 'ar' 
              ? emp.leaveType === 'vacation' ? 'إجازة سنوية'
                : emp.leaveType === 'sick' ? 'إجازة مرضية'
                : emp.leaveType === 'emergency' ? 'إجازة طارئة'
                : 'إجازة'
              : emp.leaveType || 'On Leave'}
          </Badge>
        );
      case 'pending_leave':
        return (
          <Badge variant="outline" className="gap-1 border-warning text-warning">
            <Clock className="w-3 h-3" />
            {language === 'ar' ? 'طلب إجازة معلق' : 'Pending Leave'}
          </Badge>
        );
      case 'marked_absent':
        return (
          <Badge variant="destructive" className="gap-1">
            <Clock className="w-3 h-3" />
            {language === 'ar' ? 'غائب' : 'Absent'}
          </Badge>
        );
      case 'no_checkin':
      default:
        return (
          <Badge variant="destructive" className="gap-1">
            <Clock className="w-3 h-3" />
            {language === 'ar' ? 'لم يسجل حضور' : 'No Check-in'}
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-destructive" />
            {language === 'ar' ? 'الموظفون الغائبون اليوم' : 'Absent Employees Today'}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : absentEmployees.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {language === 'ar' ? 'جميع الموظفين حاضرون! 🎉' : 'All employees are present! 🎉'}
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {absentEmployees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {emp.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{emp.full_name}</p>
                    {emp.department && (
                      <p className="text-xs text-muted-foreground">{emp.department}</p>
                    )}
                    {emp.leaveReason && (
                      <p className="text-xs text-muted-foreground mt-0.5">{emp.leaveReason}</p>
                    )}
                  </div>
                </div>
                {getReasonBadge(emp)}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AbsentEmployeesDialog;
