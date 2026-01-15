import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  PositionWithPermissions, 
  CreatePositionData,
  useCreatePosition,
  useUpdatePosition
} from '@/hooks/usePositions';
import { Shield } from 'lucide-react';

interface PositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position?: PositionWithPermissions | null;
  positions: PositionWithPermissions[];
}

const PositionDialog = ({ open, onOpenChange, position, positions }: PositionDialogProps) => {
  const { language } = useLanguage();
  const createPosition = useCreatePosition();
  const updatePosition = useUpdatePosition();
  
  const [formData, setFormData] = useState({
    title: '',
    title_ar: '',
    description: '',
    reports_to_positions: [] as string[],
    level: 0,
  });
  
  const [permissions, setPermissions] = useState({
    can_manage_attendance: false,
    can_approve_leaves: false,
    can_make_deductions: false,
    can_add_bonuses: false,
    can_view_salaries: false,
    can_manage_subordinates: false,
    can_view_reports: false,
  });

  useEffect(() => {
    if (position) {
      setFormData({
        title: position.title,
        title_ar: position.title_ar || '',
        description: position.description || '',
        reports_to_positions: position.reports_to_positions || (position.reports_to ? [position.reports_to] : []),
        level: position.level,
      });
      if (position.position_permissions) {
        setPermissions({
          can_manage_attendance: position.position_permissions.can_manage_attendance,
          can_approve_leaves: position.position_permissions.can_approve_leaves,
          can_make_deductions: position.position_permissions.can_make_deductions,
          can_add_bonuses: position.position_permissions.can_add_bonuses,
          can_view_salaries: position.position_permissions.can_view_salaries,
          can_manage_subordinates: position.position_permissions.can_manage_subordinates,
          can_view_reports: position.position_permissions.can_view_reports,
        });
      }
    } else {
      setFormData({
        title: '',
        title_ar: '',
        description: '',
        reports_to_positions: [],
        level: 0,
      });
      setPermissions({
        can_manage_attendance: false,
        can_approve_leaves: false,
        can_make_deductions: false,
        can_add_bonuses: false,
        can_view_salaries: false,
        can_manage_subordinates: false,
        can_view_reports: false,
      });
    }
  }, [position, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: CreatePositionData = {
      title: formData.title,
      title_ar: formData.title_ar || undefined,
      description: formData.description || undefined,
      reports_to_positions: formData.reports_to_positions,
      level: formData.level,
      permissions,
    };

    try {
      if (position) {
        await updatePosition.mutateAsync({
          id: position.id,
          data: {
            title: data.title,
            title_ar: data.title_ar,
            description: data.description,
            level: data.level,
          },
          permissions,
          reports_to_positions: formData.reports_to_positions,
        });
      } else {
        await createPosition.mutateAsync(data);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleReportsToToggle = (posId: string) => {
    setFormData(prev => ({
      ...prev,
      reports_to_positions: prev.reports_to_positions.includes(posId)
        ? prev.reports_to_positions.filter(id => id !== posId)
        : [...prev.reports_to_positions, posId]
    }));
  };

  const permissionLabels = {
    can_manage_attendance: {
      en: 'Manage Attendance',
      ar: 'إدارة الحضور',
      desc_en: 'Can add, edit, and delete attendance records',
      desc_ar: 'يمكنه إضافة وتعديل وحذف سجلات الحضور',
    },
    can_approve_leaves: {
      en: 'Approve Leaves',
      ar: 'الموافقة على الإجازات',
      desc_en: 'Can approve or reject leave requests',
      desc_ar: 'يمكنه الموافقة أو رفض طلبات الإجازة',
    },
    can_make_deductions: {
      en: 'Make Deductions',
      ar: 'إجراء الخصومات',
      desc_en: 'Can add salary deductions for subordinates',
      desc_ar: 'يمكنه إضافة خصومات على رواتب المرؤوسين',
    },
    can_add_bonuses: {
      en: 'Add Bonuses',
      ar: 'إضافة المكافآت',
      desc_en: 'Can add bonuses to subordinates',
      desc_ar: 'يمكنه إضافة مكافآت للمرؤوسين',
    },
    can_view_salaries: {
      en: 'View Salaries',
      ar: 'عرض الرواتب',
      desc_en: 'Can view salary information of subordinates',
      desc_ar: 'يمكنه عرض معلومات رواتب المرؤوسين',
    },
    can_manage_subordinates: {
      en: 'Manage Subordinates',
      ar: 'إدارة المرؤوسين',
      desc_en: 'Can edit subordinate employee information',
      desc_ar: 'يمكنه تعديل معلومات الموظفين المرؤوسين',
    },
    can_view_reports: {
      en: 'View Reports',
      ar: 'عرض التقارير',
      desc_en: 'Can access reports and analytics',
      desc_ar: 'يمكنه الوصول للتقارير والإحصائيات',
    },
  };

  const isLoading = createPosition.isPending || updatePosition.isPending;

  // Filter out current position from parent options to prevent self-reference
  const parentOptions = positions.filter(p => p.id !== position?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {position 
              ? (language === 'ar' ? 'تعديل المنصب' : 'Edit Position')
              : (language === 'ar' ? 'إضافة منصب جديد' : 'Add New Position')
            }
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">
              {language === 'ar' ? 'المعلومات الأساسية' : 'Basic Information'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  {language === 'ar' ? 'اسم المنصب (إنجليزي)' : 'Position Title (English)'}
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="CEO, Manager, Developer..."
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="title_ar">
                  {language === 'ar' ? 'اسم المنصب (عربي)' : 'Position Title (Arabic)'}
                </Label>
                <Input
                  id="title_ar"
                  value={formData.title_ar}
                  onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                  placeholder="الرئيس التنفيذي، مدير، مطور..."
                  dir="rtl"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">
                {language === 'ar' ? 'الوصف' : 'Description'}
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={language === 'ar' ? 'وصف مختصر للمنصب...' : 'Brief description of the position...'}
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label>
                {language === 'ar' ? 'يتبع إلى (يمكن اختيار أكثر من منصب)' : 'Reports To (multiple selection allowed)'}
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md bg-muted/20">
                {parentOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground col-span-2">
                    {language === 'ar' ? 'لا توجد مناصب أخرى' : 'No other positions available'}
                  </p>
                ) : (
                  parentOptions.map(pos => (
                    <div key={pos.id} className="flex items-center space-x-2 rtl:space-x-reverse">
                      <Checkbox
                        id={`reports-${pos.id}`}
                        checked={formData.reports_to_positions.includes(pos.id)}
                        onCheckedChange={() => handleReportsToToggle(pos.id)}
                      />
                      <Label htmlFor={`reports-${pos.id}`} className="text-sm cursor-pointer">
                        {language === 'ar' && pos.title_ar ? pos.title_ar : pos.title}
                      </Label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' 
                  ? 'اترك فارغاً إذا كان هذا أعلى منصب'
                  : 'Leave empty if this is a top-level position'
                }
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="space-y-2">
                <Label htmlFor="level">
                  {language === 'ar' ? 'المستوى' : 'Level'}
                </Label>
                <Input
                  id="level"
                  type="number"
                  min="0"
                  max="10"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' 
                    ? '0 = أعلى مستوى، أرقام أكبر = مستويات أدنى'
                    : '0 = Top level, higher numbers = lower levels'
                  }
                </p>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Permissions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="font-medium text-sm text-muted-foreground">
                {language === 'ar' ? 'الصلاحيات' : 'Permissions'}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(permissionLabels).map(([key, labels]) => (
                <div 
                  key={key}
                  className="flex items-start space-x-3 rtl:space-x-reverse p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={key}
                    checked={permissions[key as keyof typeof permissions]}
                    onCheckedChange={(checked) => 
                      setPermissions({ ...permissions, [key]: checked === true })
                    }
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <Label htmlFor={key} className="text-sm font-medium cursor-pointer">
                      {language === 'ar' ? labels.ar : labels.en}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? labels.desc_ar : labels.desc_en}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading 
                ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                : position 
                  ? (language === 'ar' ? 'حفظ التغييرات' : 'Save Changes')
                  : (language === 'ar' ? 'إنشاء المنصب' : 'Create Position')
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PositionDialog;
