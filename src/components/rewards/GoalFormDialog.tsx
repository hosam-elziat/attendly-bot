import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Target, Gift, Calendar, Users, Crown } from 'lucide-react';
import { useCreateGoal, useUpdateGoal, RewardGoal } from '@/hooks/useRewardGoals';
import { useMarketplaceItems } from '@/hooks/useMarketplace';

interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: RewardGoal | null;
}

const GoalFormDialog = ({ open, onOpenChange, goal }: GoalFormDialogProps) => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const { data: items } = useMarketplaceItems();
  
  const isEditing = !!goal;
  
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    description: '',
    description_ar: '',
    goal_type: 'everyone_reaches' as 'first_to_reach' | 'everyone_reaches',
    duration_type: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'custom',
    start_date: '',
    end_date: '',
    points_threshold: 100,
    reward_type: 'points' as 'points' | 'item' | 'custom',
    reward_points: 50,
    reward_item_id: '',
    reward_description: '',
    reward_description_ar: '',
    is_active: true,
  });

  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name || '',
        name_ar: goal.name_ar || '',
        description: goal.description || '',
        description_ar: goal.description_ar || '',
        goal_type: goal.goal_type || 'everyone_reaches',
        duration_type: goal.duration_type || 'monthly',
        start_date: goal.start_date || '',
        end_date: goal.end_date || '',
        points_threshold: goal.points_threshold || 100,
        reward_type: goal.reward_type || 'points',
        reward_points: goal.reward_points || 50,
        reward_item_id: goal.reward_item_id || '',
        reward_description: goal.reward_description || '',
        reward_description_ar: goal.reward_description_ar || '',
        is_active: goal.is_active ?? true,
      });
    } else {
      setFormData({
        name: '',
        name_ar: '',
        description: '',
        description_ar: '',
        goal_type: 'everyone_reaches',
        duration_type: 'monthly',
        start_date: '',
        end_date: '',
        points_threshold: 100,
        reward_type: 'points',
        reward_points: 50,
        reward_item_id: '',
        reward_description: '',
        reward_description_ar: '',
        is_active: true,
      });
    }
  }, [goal, open]);

  const handleSubmit = async () => {
    const data = {
      ...formData,
      reward_item_id: formData.reward_type === 'item' ? formData.reward_item_id || null : null,
      reward_points: formData.reward_type === 'points' ? formData.reward_points : null,
      start_date: formData.duration_type === 'custom' ? formData.start_date || null : null,
      end_date: formData.duration_type === 'custom' ? formData.end_date || null : null,
    };

    if (isEditing && goal) {
      await updateGoal.mutateAsync({ id: goal.id, ...data });
    } else {
      await createGoal.mutateAsync(data);
    }
    onOpenChange(false);
  };

  const isPending = createGoal.isPending || updateGoal.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            {isEditing 
              ? (isArabic ? 'تعديل الهدف' : 'Edit Goal')
              : (isArabic ? 'إنشاء هدف جديد' : 'Create New Goal')
            }
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{isArabic ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Monthly Challenge"
              />
            </div>
            <div className="space-y-2">
              <Label>{isArabic ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
              <Input
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                placeholder="تحدي الشهر"
                dir="rtl"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>{isArabic ? 'الوصف' : 'Description'}</Label>
            <Textarea
              value={isArabic ? formData.description_ar : formData.description}
              onChange={(e) => setFormData({ 
                ...formData, 
                [isArabic ? 'description_ar' : 'description']: e.target.value 
              })}
              placeholder={isArabic ? 'وصف الهدف...' : 'Goal description...'}
              rows={2}
            />
          </div>

          {/* Goal Type */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {isArabic ? 'نوع الهدف' : 'Goal Type'}
            </Label>
            <Select
              value={formData.goal_type}
              onValueChange={(value: 'first_to_reach' | 'everyone_reaches') => 
                setFormData({ ...formData, goal_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone_reaches">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {isArabic ? 'كل من يحقق الهدف' : 'Everyone who Reaches'}
                  </div>
                </SelectItem>
                <SelectItem value="first_to_reach">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    {isArabic ? 'أول من يحقق (فائز واحد)' : 'First to Reach (One Winner)'}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {isArabic ? 'المدة' : 'Duration'}
            </Label>
            <Select
              value={formData.duration_type}
              onValueChange={(value: 'daily' | 'weekly' | 'monthly' | 'custom') => 
                setFormData({ ...formData, duration_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{isArabic ? 'يومي' : 'Daily'}</SelectItem>
                <SelectItem value="weekly">{isArabic ? 'أسبوعي' : 'Weekly'}</SelectItem>
                <SelectItem value="monthly">{isArabic ? 'شهري' : 'Monthly'}</SelectItem>
                <SelectItem value="custom">{isArabic ? 'مخصص' : 'Custom'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Dates */}
          {formData.duration_type === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{isArabic ? 'تاريخ البداية' : 'Start Date'}</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? 'تاريخ النهاية' : 'End Date'}</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Points Threshold */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              {isArabic ? 'النقاط المطلوبة للتحقيق' : 'Points Required to Achieve'}
            </Label>
            <Input
              type="number"
              min={1}
              value={formData.points_threshold}
              onChange={(e) => setFormData({ ...formData, points_threshold: parseInt(e.target.value) || 0 })}
            />
          </div>

          {/* Reward Type */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Gift className="w-4 h-4" />
              {isArabic ? 'نوع المكافأة' : 'Reward Type'}
            </Label>
            <Select
              value={formData.reward_type}
              onValueChange={(value: 'points' | 'item' | 'custom') => 
                setFormData({ ...formData, reward_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="points">{isArabic ? 'نقاط إضافية' : 'Bonus Points'}</SelectItem>
                <SelectItem value="item">{isArabic ? 'منتج من السوق' : 'Marketplace Item'}</SelectItem>
                <SelectItem value="custom">{isArabic ? 'مكافأة مخصصة' : 'Custom Reward'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reward Value based on type */}
          {formData.reward_type === 'points' && (
            <div className="space-y-2">
              <Label>{isArabic ? 'نقاط المكافأة' : 'Reward Points'}</Label>
              <Input
                type="number"
                min={1}
                value={formData.reward_points}
                onChange={(e) => setFormData({ ...formData, reward_points: parseInt(e.target.value) || 0 })}
              />
            </div>
          )}

          {formData.reward_type === 'item' && (
            <div className="space-y-2">
              <Label>{isArabic ? 'المنتج' : 'Item'}</Label>
              <Select
                value={formData.reward_item_id}
                onValueChange={(value) => setFormData({ ...formData, reward_item_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isArabic ? 'اختر منتج' : 'Select item'} />
                </SelectTrigger>
                <SelectContent>
                  {items?.filter(i => i.is_active).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {isArabic ? item.name_ar || item.name : item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.reward_type === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{isArabic ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                <Input
                  value={formData.reward_description}
                  onChange={(e) => setFormData({ ...formData, reward_description: e.target.value })}
                  placeholder="Free lunch"
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                <Input
                  value={formData.reward_description_ar}
                  onChange={(e) => setFormData({ ...formData, reward_description_ar: e.target.value })}
                  placeholder="غداء مجاني"
                  dir="rtl"
                />
              </div>
            </div>
          )}

          {/* Active Switch */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label>{isArabic ? 'الهدف نشط' : 'Goal Active'}</Label>
              <p className="text-xs text-muted-foreground">
                {isArabic ? 'يمكن للموظفين تحقيقه' : 'Employees can achieve it'}
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={isPending || !formData.name}
              className="flex-1"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              {isEditing 
                ? (isArabic ? 'حفظ التغييرات' : 'Save Changes')
                : (isArabic ? 'إنشاء الهدف' : 'Create Goal')
              }
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoalFormDialog;
