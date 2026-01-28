import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { ShoppingBag, Loader2, Plus, Edit, Trash2, Star, Clock, Gift, Zap } from 'lucide-react';
import { useMarketplaceItems, useSaveMarketplaceItem, useDeleteMarketplaceItem, useMarketplaceCategories, useSaveMarketplaceCategory, type MarketplaceItem, type MarketplaceCategory } from '@/hooks/useMarketplace';

const ITEM_TYPES = [
  { value: 'benefit', label_en: 'Benefit', label_ar: 'ميزة', icon: Gift },
  { value: 'time_off', label_en: 'Time Off', label_ar: 'إجازة/إذن', icon: Clock },
  { value: 'powerup', label_en: 'Power-up', label_ar: 'تعزيز', icon: Zap },
  { value: 'premium', label_en: 'Premium', label_ar: 'مميز', icon: Star },
];

const EFFECT_TYPES = [
  { value: 'leave_day', label_en: 'Leave Day', label_ar: 'يوم إجازة' },
  { value: 'permission_hours', label_en: 'Permission Hours', label_ar: 'ساعات إذن' },
  { value: 'late_pass', label_en: 'Late Pass', label_ar: 'سماح تأخير' },
  { value: 'early_leave', label_en: 'Early Leave', label_ar: 'انصراف مبكر' },
  { value: 'bonus_points', label_en: 'Bonus Points', label_ar: 'نقاط إضافية' },
  { value: 'secret_message', label_en: 'Secret Message', label_ar: 'رسالة سرية' },
  { value: 'other', label_en: 'Other', label_ar: 'أخرى' },
];

const DEFAULT_ITEMS = [
  { name: 'Extra Leave Day', name_ar: 'يوم إجازة إضافي', description: 'Get one extra leave day', description_ar: 'احصل على يوم إجازة إضافي', points_price: 1000, item_type: 'time_off', effect_type: 'leave_day', approval_required: true },
  { name: '2-Hour Permission', name_ar: 'إذن ساعتين', description: 'Get 2 hours permission', description_ar: 'احصل على إذن ساعتين', points_price: 300, item_type: 'time_off', effect_type: 'permission_hours', approval_required: true },
  { name: 'Late Pass', name_ar: 'سماح تأخير', description: 'One-time late arrival pass', description_ar: 'سماح تأخير لمرة واحدة', points_price: 200, item_type: 'powerup', effect_type: 'late_pass', approval_required: false },
  { name: 'Secret Message', name_ar: 'رسالة سرية', description: 'Send anonymous message', description_ar: 'أرسل رسالة مجهولة', points_price: 500, item_type: 'premium', effect_type: 'secret_message', approval_required: true, is_premium: true },
];

const MarketplaceItemsTab = () => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  const { data: items, isLoading } = useMarketplaceItems();
  const { data: categories } = useMarketplaceCategories();
  const saveItem = useSaveMarketplaceItem();
  const deleteItem = useDeleteMarketplaceItem();
  const saveCategory = useSaveMarketplaceCategory();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MarketplaceItem | null>(null);
  const [form, setForm] = useState({
    name: '',
    name_ar: '',
    description: '',
    description_ar: '',
    points_price: 100,
    item_type: 'benefit',
    effect_type: 'other',
    approval_required: false,
    is_premium: false,
    is_active: true,
    usage_limit_type: 'unlimited',
    usage_limit_value: 0,
    category_id: '',
  });

  const handleEdit = (item: MarketplaceItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      name_ar: item.name_ar || '',
      description: item.description || '',
      description_ar: item.description_ar || '',
      points_price: item.points_price,
      item_type: item.item_type,
      effect_type: item.effect_type || 'other',
      approval_required: item.approval_required,
      is_premium: item.is_premium,
      is_active: item.is_active,
      usage_limit_type: item.usage_limit_type || 'unlimited',
      usage_limit_value: item.usage_limit_value || 0,
      category_id: item.category_id || '',
    });
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setForm({
      name: '',
      name_ar: '',
      description: '',
      description_ar: '',
      points_price: 100,
      item_type: 'benefit',
      effect_type: 'other',
      approval_required: false,
      is_premium: false,
      is_active: true,
      usage_limit_type: 'unlimited',
      usage_limit_value: 0,
      category_id: '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    await saveItem.mutateAsync({
      id: editingItem?.id,
      ...form,
      category_id: form.category_id || null,
      usage_limit_type: form.usage_limit_type === 'unlimited' ? null : form.usage_limit_type,
      usage_limit_value: form.usage_limit_value || null,
    });
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm(isArabic ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete?')) {
      await deleteItem.mutateAsync(id);
    }
  };

  const initializeDefaultItems = async () => {
    // First create default categories
    const defaultCategories = [
      { name: 'Time Off', name_ar: 'إجازات', icon: '📅', sort_order: 1 },
      { name: 'Benefits', name_ar: 'مميزات', icon: '🎁', sort_order: 2 },
      { name: 'Premium', name_ar: 'مميز', icon: '💎', sort_order: 3 },
    ];
    
    for (const cat of defaultCategories) {
      await saveCategory.mutateAsync(cat);
    }
    
    // Then create items
    for (const item of DEFAULT_ITEMS) {
      await saveItem.mutateAsync(item);
    }
  };

  const getItemTypeIcon = (type: string) => {
    const item = ITEM_TYPES.find(t => t.value === type);
    return item?.icon || Gift;
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
                <ShoppingBag className="w-5 h-5 text-primary" />
                {isArabic ? 'عناصر السوق' : 'Marketplace Items'}
              </CardTitle>
              <CardDescription>
                {isArabic 
                  ? 'إدارة العناصر المتاحة للشراء بالنقاط' 
                  : 'Manage items available for purchase with points'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {(!items || items.length === 0) && (
                <Button variant="outline" onClick={initializeDefaultItems} disabled={saveItem.isPending}>
                  {isArabic ? 'إضافة عناصر افتراضية' : 'Add Default Items'}
                </Button>
              )}
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 me-2" />
                {isArabic ? 'إضافة عنصر' : 'Add Item'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items && items.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.filter(i => i.is_active).map((item) => {
                const TypeIcon = getItemTypeIcon(item.item_type);
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border bg-card hover:shadow-md transition-shadow ${
                      item.is_premium ? 'border-amber-500/50 bg-gradient-to-br from-amber-500/5 to-orange-500/5' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${item.is_premium ? 'bg-amber-500/20' : 'bg-primary/10'}`}>
                          <TypeIcon className={`w-5 h-5 ${item.is_premium ? 'text-amber-500' : 'text-primary'}`} />
                        </div>
                        <div>
                          <p className="font-bold">
                            {isArabic ? item.name_ar || item.name : item.name}
                          </p>
                          <div className="flex gap-1 mt-1">
                            {item.is_premium && (
                              <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-600">
                                Premium
                              </Badge>
                            )}
                            {item.approval_required && (
                              <Badge variant="outline" className="text-[10px]">
                                {isArabic ? 'يتطلب موافقة' : 'Approval'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {isArabic ? item.description_ar || item.description : item.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {isArabic ? 'السعر' : 'Price'}
                      </span>
                      <span className="font-bold text-primary">
                        {item.points_price.toLocaleString()} ⭐
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{isArabic ? 'لم يتم إضافة عناصر بعد' : 'No items added yet'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem 
                ? (isArabic ? 'تعديل العنصر' : 'Edit Item')
                : (isArabic ? 'إضافة عنصر جديد' : 'Add New Item')
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
                  placeholder="Extra Leave Day"
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                <Input
                  value={form.name_ar}
                  onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                  placeholder="يوم إجازة إضافي"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
              <Textarea
                value={form.description_ar}
                onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isArabic ? 'السعر (نقاط)' : 'Price (Points)'}</Label>
                <NumberInput
                  value={form.points_price}
                  onChange={(val) => setForm({ ...form, points_price: val })}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label>{isArabic ? 'النوع' : 'Type'}</Label>
                <Select
                  value={form.item_type}
                  onValueChange={(val) => setForm({ ...form, item_type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {isArabic ? type.label_ar : type.label_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? 'التأثير' : 'Effect'}</Label>
              <Select
                value={form.effect_type}
                onValueChange={(val) => setForm({ ...form, effect_type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EFFECT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {isArabic ? type.label_ar : type.label_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>{isArabic ? 'يتطلب موافقة المدير' : 'Requires Approval'}</Label>
              <Switch
                checked={form.approval_required}
                onCheckedChange={(val) => setForm({ ...form, approval_required: val })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>{isArabic ? 'عنصر مميز (Premium)' : 'Premium Item'}</Label>
              <Switch
                checked={form.is_premium}
                onCheckedChange={(val) => setForm({ ...form, is_premium: val })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSave} disabled={saveItem.isPending || !form.name}>
              {saveItem.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              {isArabic ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MarketplaceItemsTab;
