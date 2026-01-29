import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { Settings2, Loader2, Edit, TrendingUp, TrendingDown, Plus, Trash2 } from 'lucide-react';
import { useRewardRules, useUpdateRewardRule, useCreateRewardRule, useDeleteRewardRule, type RewardRule } from '@/hooks/useRewards';

const RewardsRulesTab = () => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  const { data: rules, isLoading } = useRewardRules();
  const updateRule = useUpdateRewardRule();
  const createRule = useCreateRewardRule();
  const deleteRule = useDeleteRewardRule();
  
  const [editingRule, setEditingRule] = useState<RewardRule | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    points_value: 0,
    daily_limit: undefined as number | undefined,
    weekly_limit: undefined as number | undefined,
    monthly_limit: undefined as number | undefined,
  });
  
  const [newRuleForm, setNewRuleForm] = useState({
    event_type: '',
    event_name: '',
    event_name_ar: '',
    points_value: 0,
    daily_limit: undefined as number | undefined,
    weekly_limit: undefined as number | undefined,
    monthly_limit: undefined as number | undefined,
    description: '',
  });

  const handleEdit = (rule: RewardRule) => {
    setEditingRule(rule);
    setEditForm({
      points_value: rule.points_value,
      daily_limit: rule.daily_limit ?? undefined,
      weekly_limit: rule.weekly_limit ?? undefined,
      monthly_limit: rule.monthly_limit ?? undefined,
    });
  };

  const handleSave = async () => {
    if (!editingRule) return;
    
    await updateRule.mutateAsync({
      id: editingRule.id,
      points_value: editForm.points_value,
      daily_limit: editForm.daily_limit || null,
      weekly_limit: editForm.weekly_limit || null,
      monthly_limit: editForm.monthly_limit || null,
    });
    
    setEditingRule(null);
  };

  const handleToggle = async (rule: RewardRule) => {
    await updateRule.mutateAsync({
      id: rule.id,
      is_enabled: !rule.is_enabled,
    });
  };

  const handleDelete = async (rule: RewardRule) => {
    if (confirm(isArabic ? 'هل أنت متأكد من حذف هذه القاعدة؟' : 'Are you sure you want to delete this rule?')) {
      await deleteRule.mutateAsync(rule.id);
    }
  };

  const handleAddRule = async () => {
    if (!newRuleForm.event_type || !newRuleForm.event_name) return;
    
    await createRule.mutateAsync({
      event_type: newRuleForm.event_type,
      event_name: newRuleForm.event_name,
      event_name_ar: newRuleForm.event_name_ar || undefined,
      points_value: newRuleForm.points_value,
      daily_limit: newRuleForm.daily_limit,
      weekly_limit: newRuleForm.weekly_limit,
      monthly_limit: newRuleForm.monthly_limit,
      description: newRuleForm.description || undefined,
    });
    
    setIsAddDialogOpen(false);
    setNewRuleForm({
      event_type: '',
      event_name: '',
      event_name_ar: '',
      points_value: 0,
      daily_limit: undefined,
      weekly_limit: undefined,
      monthly_limit: undefined,
      description: '',
    });
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
                <Settings2 className="w-5 h-5" />
                {isArabic ? 'قواعد النقاط' : 'Points Rules'}
              </CardTitle>
              <CardDescription>
                {isArabic 
                  ? 'تحديد النقاط لكل حدث - النقاط السالبة تعني خصم' 
                  : 'Configure points for each event - negative points mean deduction'}
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 me-2" />
              {isArabic ? 'إضافة قاعدة' : 'Add Rule'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isArabic ? 'الحدث' : 'Event'}</TableHead>
                  <TableHead className="text-center">{isArabic ? 'النقاط' : 'Points'}</TableHead>
                  <TableHead className="text-center">{isArabic ? 'الحدود' : 'Limits'}</TableHead>
                  <TableHead className="text-center">{isArabic ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="text-center">{isArabic ? 'إجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules?.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {isArabic ? rule.event_name_ar || rule.event_name : rule.event_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{rule.event_type}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={rule.points_value >= 0 ? 'default' : 'destructive'}
                        className="gap-1"
                      >
                        {rule.points_value >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {rule.points_value > 0 ? '+' : ''}{rule.points_value}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="text-xs space-y-0.5">
                        {rule.daily_limit && (
                          <p>{isArabic ? 'يومي' : 'Daily'}: {rule.daily_limit}</p>
                        )}
                        {rule.weekly_limit && (
                          <p>{isArabic ? 'أسبوعي' : 'Weekly'}: {rule.weekly_limit}</p>
                        )}
                        {rule.monthly_limit && (
                          <p>{isArabic ? 'شهري' : 'Monthly'}: {rule.monthly_limit}</p>
                        )}
                        {!rule.daily_limit && !rule.weekly_limit && !rule.monthly_limit && (
                          <p className="text-muted-foreground">{isArabic ? 'بلا حدود' : 'Unlimited'}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={rule.is_enabled}
                        onCheckedChange={() => handleToggle(rule)}
                        disabled={updateRule.isPending}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(rule)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(rule)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingRule} onOpenChange={() => setEditingRule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isArabic ? 'تعديل قاعدة النقاط' : 'Edit Points Rule'}
            </DialogTitle>
            <DialogDescription>
              {editingRule && (isArabic ? editingRule.event_name_ar || editingRule.event_name : editingRule.event_name)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isArabic ? 'النقاط' : 'Points'}</Label>
              <Input
                type="number"
                value={editForm.points_value}
                onChange={(e) => setEditForm({ ...editForm, points_value: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                {isArabic ? 'القيمة السالبة تعني خصم نقاط' : 'Negative value means point deduction'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{isArabic ? 'حد يومي' : 'Daily Limit'}</Label>
                <NumberInput
                  value={editForm.daily_limit || 0}
                  onChange={(val) => setEditForm({ ...editForm, daily_limit: val || undefined })}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? 'حد أسبوعي' : 'Weekly Limit'}</Label>
                <NumberInput
                  value={editForm.weekly_limit || 0}
                  onChange={(val) => setEditForm({ ...editForm, weekly_limit: val || undefined })}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? 'حد شهري' : 'Monthly Limit'}</Label>
                <NumberInput
                  value={editForm.monthly_limit || 0}
                  onChange={(val) => setEditForm({ ...editForm, monthly_limit: val || undefined })}
                  min={0}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRule(null)}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSave} disabled={updateRule.isPending}>
              {updateRule.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              {isArabic ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Rule Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isArabic ? 'إضافة قاعدة نقاط جديدة' : 'Add New Points Rule'}
            </DialogTitle>
            <DialogDescription>
              {isArabic ? 'أدخل بيانات القاعدة الجديدة' : 'Enter the new rule details'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isArabic ? 'معرف الحدث (بالإنجليزية)' : 'Event Type (English)'}</Label>
              <Input
                value={newRuleForm.event_type}
                onChange={(e) => setNewRuleForm({ ...newRuleForm, event_type: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="custom_event"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? 'اسم الحدث (بالإنجليزية)' : 'Event Name (English)'}</Label>
              <Input
                value={newRuleForm.event_name}
                onChange={(e) => setNewRuleForm({ ...newRuleForm, event_name: e.target.value })}
                placeholder="Custom Event"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? 'اسم الحدث (بالعربية)' : 'Event Name (Arabic)'}</Label>
              <Input
                value={newRuleForm.event_name_ar}
                onChange={(e) => setNewRuleForm({ ...newRuleForm, event_name_ar: e.target.value })}
                placeholder="حدث مخصص"
                dir="rtl"
              />
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? 'النقاط' : 'Points'}</Label>
              <Input
                type="number"
                value={newRuleForm.points_value}
                onChange={(e) => setNewRuleForm({ ...newRuleForm, points_value: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                {isArabic ? 'القيمة السالبة تعني خصم نقاط' : 'Negative value means point deduction'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{isArabic ? 'حد يومي' : 'Daily'}</Label>
                <NumberInput
                  value={newRuleForm.daily_limit || 0}
                  onChange={(val) => setNewRuleForm({ ...newRuleForm, daily_limit: val || undefined })}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? 'أسبوعي' : 'Weekly'}</Label>
                <NumberInput
                  value={newRuleForm.weekly_limit || 0}
                  onChange={(val) => setNewRuleForm({ ...newRuleForm, weekly_limit: val || undefined })}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? 'شهري' : 'Monthly'}</Label>
                <NumberInput
                  value={newRuleForm.monthly_limit || 0}
                  onChange={(val) => setNewRuleForm({ ...newRuleForm, monthly_limit: val || undefined })}
                  min={0}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? 'الوصف (اختياري)' : 'Description (optional)'}</Label>
              <Input
                value={newRuleForm.description}
                onChange={(e) => setNewRuleForm({ ...newRuleForm, description: e.target.value })}
                placeholder={isArabic ? 'وصف القاعدة...' : 'Rule description...'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleAddRule} 
              disabled={createRule.isPending || !newRuleForm.event_type || !newRuleForm.event_name}
            >
              {createRule.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              {isArabic ? 'إضافة' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RewardsRulesTab;
