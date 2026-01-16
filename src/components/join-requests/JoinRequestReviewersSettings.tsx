import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePositions } from '@/hooks/usePositions';
import { useEmployees } from '@/hooks/useEmployees';
import { 
  useJoinRequestReviewers, 
  useAddJoinRequestReviewer, 
  useRemoveJoinRequestReviewer 
} from '@/hooks/useJoinRequestReviewers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, X, Users, Briefcase, Plus, Loader2 } from 'lucide-react';

interface JoinRequestReviewersSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const JoinRequestReviewersSettings = ({ open, onOpenChange }: JoinRequestReviewersSettingsProps) => {
  const { language } = useLanguage();
  const { data: reviewers = [], isLoading: loadingReviewers } = useJoinRequestReviewers();
  const { data: positions = [] } = usePositions();
  const { data: employees = [] } = useEmployees();
  const addReviewer = useAddJoinRequestReviewer();
  const removeReviewer = useRemoveJoinRequestReviewer();

  const [addType, setAddType] = useState<'position' | 'employee'>('position');
  const [selectedId, setSelectedId] = useState<string>('');

  const activePositions = positions.filter(p => p.is_active);
  const activeEmployees = employees.filter(e => e.is_active && e.telegram_chat_id);

  // Get names for display
  const getReviewerName = (type: 'position' | 'employee', id: string) => {
    if (type === 'position') {
      const position = positions.find(p => p.id === id);
      return position?.title || language === 'ar' ? 'منصب محذوف' : 'Deleted Position';
    } else {
      const employee = employees.find(e => e.id === id);
      return employee?.full_name || language === 'ar' ? 'موظف محذوف' : 'Deleted Employee';
    }
  };

  // Filter out already added items
  const availablePositions = activePositions.filter(
    p => !reviewers.some(r => r.reviewer_type === 'position' && r.reviewer_id === p.id)
  );
  const availableEmployees = activeEmployees.filter(
    e => !reviewers.some(r => r.reviewer_type === 'employee' && r.reviewer_id === e.id)
  );

  const handleAdd = async () => {
    if (!selectedId) return;
    
    await addReviewer.mutateAsync({
      reviewerType: addType,
      reviewerId: selectedId,
    });
    
    setSelectedId('');
  };

  const handleRemove = async (reviewerId: string) => {
    await removeReviewer.mutateAsync(reviewerId);
  };

  const positionReviewers = reviewers.filter(r => r.reviewer_type === 'position');
  const employeeReviewers = reviewers.filter(r => r.reviewer_type === 'employee');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {language === 'ar' ? 'إعدادات مراجعي طلبات الانضمام' : 'Join Request Reviewers Settings'}
          </DialogTitle>
          <DialogDescription>
            {language === 'ar' 
              ? 'اختر المناصب والموظفين الذين سيتلقون إشعارات طلبات الانضمام على تليجرام' 
              : 'Select positions and employees who will receive join request notifications on Telegram'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Reviewer */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <Label className="text-sm font-medium">
              {language === 'ar' ? 'إضافة مراجع جديد' : 'Add New Reviewer'}
            </Label>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={addType === 'position' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setAddType('position');
                  setSelectedId('');
                }}
                className="w-full"
              >
                <Briefcase className="w-4 h-4 me-1" />
                {language === 'ar' ? 'منصب' : 'Position'}
              </Button>
              <Button
                type="button"
                variant={addType === 'employee' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setAddType('employee');
                  setSelectedId('');
                }}
                className="w-full"
              >
                <Users className="w-4 h-4 me-1" />
                {language === 'ar' ? 'موظف' : 'Employee'}
              </Button>
            </div>

            <div className="flex gap-2">
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={
                    addType === 'position' 
                      ? (language === 'ar' ? 'اختر منصب...' : 'Select position...') 
                      : (language === 'ar' ? 'اختر موظف...' : 'Select employee...')
                  } />
                </SelectTrigger>
                <SelectContent>
                  {addType === 'position' ? (
                    availablePositions.length > 0 ? (
                      availablePositions.map(position => (
                        <SelectItem key={position.id} value={position.id}>
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-3 h-3" />
                            {language === 'ar' && position.title_ar ? position.title_ar : position.title}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        {language === 'ar' ? 'لا توجد مناصب متاحة' : 'No positions available'}
                      </div>
                    )
                  ) : (
                    availableEmployees.length > 0 ? (
                      availableEmployees.map(employee => (
                        <SelectItem key={employee.id} value={employee.id}>
                          <div className="flex items-center gap-2">
                            <Users className="w-3 h-3" />
                            {employee.full_name}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        {language === 'ar' ? 'لا يوجد موظفين متاحين (يجب أن يكون لديهم تليجرام)' : 'No employees available (must have Telegram)'}
                      </div>
                    )
                  )}
                </SelectContent>
              </Select>
              
              <Button 
                onClick={handleAdd} 
                disabled={!selectedId || addReviewer.isPending}
                size="icon"
              >
                {addReviewer.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Current Reviewers */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {language === 'ar' ? 'المراجعون الحاليون' : 'Current Reviewers'}
              {reviewers.length > 0 && (
                <Badge variant="secondary" className="ms-2">
                  {reviewers.length}
                </Badge>
              )}
            </Label>

            {loadingReviewers ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : reviewers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground border rounded-lg bg-muted/10">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {language === 'ar' 
                    ? 'لم يتم تحديد مراجعين بعد. ستتم مراجعة الطلبات من لوحة التحكم فقط.' 
                    : 'No reviewers set. Requests will only be reviewed from the dashboard.'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[200px] border rounded-lg p-2">
                <div className="space-y-2">
                  {/* Position Reviewers */}
                  {positionReviewers.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1 px-1">
                        <Briefcase className="w-3 h-3" />
                        {language === 'ar' ? 'المناصب' : 'Positions'}
                      </p>
                      {positionReviewers.map(reviewer => (
                        <div 
                          key={reviewer.id} 
                          className="flex items-center justify-between p-2 rounded-md bg-primary/5 border border-primary/10"
                        >
                          <span className="text-sm font-medium">
                            {getReviewerName('position', reviewer.reviewer_id)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemove(reviewer.id)}
                            disabled={removeReviewer.isPending}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Employee Reviewers */}
                  {employeeReviewers.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1 px-1">
                        <Users className="w-3 h-3" />
                        {language === 'ar' ? 'الموظفين' : 'Employees'}
                      </p>
                      {employeeReviewers.map(reviewer => (
                        <div 
                          key={reviewer.id} 
                          className="flex items-center justify-between p-2 rounded-md bg-secondary/50 border"
                        >
                          <span className="text-sm font-medium">
                            {getReviewerName('employee', reviewer.reviewer_id)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemove(reviewer.id)}
                            disabled={removeReviewer.isPending}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Info */}
          <div className="text-xs text-muted-foreground p-3 bg-muted/20 rounded-lg">
            <p>
              {language === 'ar' 
                ? '💡 عند اختيار منصب، سيتم إرسال الإشعار لأول موظف في هذا المنصب لديه حساب تليجرام مرتبط.' 
                : '💡 When selecting a position, the notification will be sent to the first employee in that position with a linked Telegram account.'}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JoinRequestReviewersSettings;
