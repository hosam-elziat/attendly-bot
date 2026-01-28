import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { Medal, Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import { useBadges, useSaveBadge, useDeleteBadge, type Badge } from '@/hooks/useRewards';

const CONDITION_TYPES = [
  { value: 'points_milestone', label_en: 'Points Milestone', label_ar: 'حد نقاط' },
  { value: 'attendance_streak', label_en: 'Attendance Streak (Days)', label_ar: 'سلسلة حضور (أيام)' },
  { value: 'first_checkin_count', label_en: 'First Check-in Count', label_ar: 'عدد مرات أول حضور' },
  { value: 'early_checkin_count', label_en: 'Early Check-in Count', label_ar: 'عدد مرات الحضور المبكر' },
  { value: 'no_absence_days', label_en: 'No Absence Days', label_ar: 'أيام بدون غياب' },
  { value: 'purchases_count', label_en: 'Marketplace Purchases', label_ar: 'مشتريات من السوق' },
];

const DEFAULT_BADGES = [
  { name: 'Early Bird', name_ar: 'الطائر المبكر', icon: '🐦', condition_type: 'early_checkin_count', condition_value: 10, description: 'Check in early 10 times', description_ar: 'سجل حضور مبكر 10 مرات' },
  { name: 'Perfect Week', name_ar: 'أسبوع مثالي', icon: '⭐', condition_type: 'attendance_streak', condition_value: 5, description: '5-day attendance streak', description_ar: 'سلسلة حضور 5 أيام' },
  { name: 'Point Master', name_ar: 'سيد النقاط', icon: '💰', condition_type: 'points_milestone', condition_value: 1000, description: 'Reach 1000 points', description_ar: 'الوصول لـ 1000 نقطة' },
  { name: 'Leader', name_ar: 'القائد', icon: '👑', condition_type: 'first_checkin_count', condition_value: 5, description: 'Be first to check in 5 times', description_ar: 'أول حضور 5 مرات' },
];

const RewardsBadgesTab = () => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  const { data: badges, isLoading } = useBadges();
  const saveBadge = useSaveBadge();
  const deleteBadge = useDeleteBadge();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null);
  const [form, setForm] = useState({
    name: '',
    name_ar: '',
    description: '',
    description_ar: '',
    icon: '🏅',
    condition_type: 'points_milestone',
    condition_value: 100,
  });

  const handleEdit = (badge: Badge) => {
    setEditingBadge(badge);
    setForm({
      name: badge.name,
      name_ar: badge.name_ar || '',
      description: badge.description || '',
      description_ar: badge.description_ar || '',
      icon: badge.icon || '🏅',
      condition_type: badge.condition_type,
      condition_value: badge.condition_value,
    });
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingBadge(null);
    setForm({
      name: '',
      name_ar: '',
      description: '',
      description_ar: '',
      icon: '🏅',
      condition_type: 'points_milestone',
      condition_value: 100,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    await saveBadge.mutateAsync({
      id: editingBadge?.id,
      ...form,
    });
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm(isArabic ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete?')) {
      await deleteBadge.mutateAsync(id);
    }
  };

  const initializeDefaultBadges = async () => {
    for (const badge of DEFAULT_BADGES) {
      await saveBadge.mutateAsync(badge);
    }
  };

  const getConditionLabel = (type: string) => {
    const condition = CONDITION_TYPES.find(c => c.value === type);
    return isArabic ? condition?.label_ar : condition?.label_en;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Medal className="w-5 h-5 text-amber-500" />
                {isArabic ? 'الشارات' : 'Badges'}
              </CardTitle>
              <CardDescription>
                {isArabic 
                  ? 'شارات تُمنح تلقائيًا عند تحقيق شروط معينة' 
                  : 'Badges awarded automatically when conditions are met'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {(!badges || badges.length === 0) && (
                <Button variant="outline" onClick={initializeDefaultBadges} disabled={saveBadge.isPending}>
                  {isArabic ? 'إضافة شارات افتراضية' : 'Add Default Badges'}
                </Button>
              )}
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 me-2" />
                {isArabic ? 'إضافة شارة' : 'Add Badge'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {badges && badges.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{badge.icon || '🏅'}</span>
                      <div>
                        <p className="font-bold">
                          {isArabic ? badge.name_ar || badge.name : badge.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getConditionLabel(badge.condition_type)}: {badge.condition_value}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(badge)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(badge.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isArabic ? badge.description_ar || badge.description : badge.description}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Medal className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{isArabic ? 'لم يتم إضافة شارات بعد' : 'No badges added yet'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBadge 
                ? (isArabic ? 'تعديل الشارة' : 'Edit Badge')
                : (isArabic ? 'إضافة شارة جديدة' : 'Add New Badge')
              }
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isArabic ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Early Bird"
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                <Input
                  value={form.name_ar}
                  onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                  placeholder="الطائر المبكر"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? 'الأيقونة (Emoji)' : 'Icon (Emoji)'}</Label>
              <Input
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="🏅"
                className="text-2xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isArabic ? 'نوع الشرط' : 'Condition Type'}</Label>
                <Select
                  value={form.condition_type}
                  onValueChange={(val) => setForm({ ...form, condition_type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {isArabic ? type.label_ar : type.label_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? 'القيمة المطلوبة' : 'Required Value'}</Label>
                <NumberInput
                  value={form.condition_value}
                  onChange={(val) => setForm({ ...form, condition_value: val })}
                  min={1}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Check in early 10 times"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
              <Textarea
                value={form.description_ar}
                onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
                placeholder="سجل حضور مبكر 10 مرات"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSave} disabled={saveBadge.isPending || !form.name}>
              {saveBadge.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              {isArabic ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RewardsBadgesTab;
