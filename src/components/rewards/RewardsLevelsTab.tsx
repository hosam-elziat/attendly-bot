import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { Crown, Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import { useRewardLevels, useSaveRewardLevel, useDeleteRewardLevel, type RewardLevel } from '@/hooks/useRewards';

const DEFAULT_LEVELS = [
  { level_order: 1, name: 'Bronze', name_ar: 'برونزي', min_points: 0, icon: '🥉', color: '#CD7F32' },
  { level_order: 2, name: 'Silver', name_ar: 'فضي', min_points: 500, icon: '🥈', color: '#C0C0C0' },
  { level_order: 3, name: 'Gold', name_ar: 'ذهبي', min_points: 1500, icon: '🥇', color: '#FFD700' },
  { level_order: 4, name: 'Platinum', name_ar: 'بلاتيني', min_points: 3500, icon: '💎', color: '#E5E4E2' },
  { level_order: 5, name: 'Diamond', name_ar: 'ماسي', min_points: 7000, icon: '👑', color: '#B9F2FF' },
];

const RewardsLevelsTab = () => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  const { data: levels, isLoading } = useRewardLevels();
  const saveLevel = useSaveRewardLevel();
  const deleteLevel = useDeleteRewardLevel();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Partial<RewardLevel> | null>(null);
  const [form, setForm] = useState({
    name: '',
    name_ar: '',
    min_points: 0,
    icon: '⭐',
    color: '#FFD700',
    level_order: 1,
  });

  const handleEdit = (level: RewardLevel) => {
    setEditingLevel(level);
    setForm({
      name: level.name,
      name_ar: level.name_ar || '',
      min_points: level.min_points,
      icon: level.icon || '⭐',
      color: level.color || '#FFD700',
      level_order: level.level_order,
    });
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingLevel(null);
    setForm({
      name: '',
      name_ar: '',
      min_points: 0,
      icon: '⭐',
      color: '#FFD700',
      level_order: (levels?.length || 0) + 1,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    await saveLevel.mutateAsync({
      id: editingLevel?.id,
      ...form,
    });
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm(isArabic ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete?')) {
      await deleteLevel.mutateAsync(id);
    }
  };

  const initializeDefaultLevels = async () => {
    for (const level of DEFAULT_LEVELS) {
      await saveLevel.mutateAsync(level);
    }
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
                <Crown className="w-5 h-5 text-amber-500" />
                {isArabic ? 'المستويات' : 'Levels'}
              </CardTitle>
              <CardDescription>
                {isArabic 
                  ? 'تحديد مستويات الموظفين بناءً على النقاط' 
                  : 'Define employee levels based on points'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {(!levels || levels.length === 0) && (
                <Button variant="outline" onClick={initializeDefaultLevels} disabled={saveLevel.isPending}>
                  {isArabic ? 'إضافة المستويات الافتراضية' : 'Add Default Levels'}
                </Button>
              )}
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 me-2" />
                {isArabic ? 'إضافة مستوى' : 'Add Level'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {levels && levels.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {levels.map((level) => (
                <div
                  key={level.id}
                  className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
                  style={{ borderColor: level.color || undefined }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{level.icon || '⭐'}</span>
                      <div>
                        <p className="font-bold">
                          {isArabic ? level.name_ar || level.name : level.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isArabic ? 'المستوى' : 'Level'} {level.level_order}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(level)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(level.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {isArabic ? 'الحد الأدنى' : 'Min Points'}
                    </span>
                    <span className="font-bold text-primary">
                      {level.min_points.toLocaleString()} {isArabic ? 'نقطة' : 'pts'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Crown className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{isArabic ? 'لم يتم إضافة مستويات بعد' : 'No levels added yet'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLevel 
                ? (isArabic ? 'تعديل المستوى' : 'Edit Level')
                : (isArabic ? 'إضافة مستوى جديد' : 'Add New Level')
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
                  placeholder="Gold"
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                <Input
                  value={form.name_ar}
                  onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                  placeholder="ذهبي"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isArabic ? 'الحد الأدنى للنقاط' : 'Minimum Points'}</Label>
                <NumberInput
                  value={form.min_points}
                  onChange={(val) => setForm({ ...form, min_points: val })}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? 'الترتيب' : 'Order'}</Label>
                <NumberInput
                  value={form.level_order}
                  onChange={(val) => setForm({ ...form, level_order: val })}
                  min={1}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isArabic ? 'الأيقونة (Emoji)' : 'Icon (Emoji)'}</Label>
                <Input
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="🥇"
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? 'اللون' : 'Color'}</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    placeholder="#FFD700"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSave} disabled={saveLevel.isPending || !form.name}>
              {saveLevel.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              {isArabic ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RewardsLevelsTab;
