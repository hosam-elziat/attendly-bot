import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Plus,
  Edit,
  Trash2,
  Loader2,
  Tag,
  Percent
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  min_employees: number;
  max_employees: number | null;
  price_monthly: number;
  price_quarterly: number | null;
  price_yearly: number | null;
  currency: string;
  trial_days: number;
  is_active: boolean;
  is_unlimited: boolean;
  features: string[];
  created_at: string;
}

interface DiscountCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

const SuperAdminPlans = () => {
  const { isSuperAdmin } = useSuperAdmin();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newPlan, setNewPlan] = useState({
    name: '',
    name_ar: '',
    description: '',
    min_employees: 1,
    max_employees: 10,
    price_monthly: 0,
    price_quarterly: 0,
    price_yearly: 0,
    currency: 'EGP',
    trial_days: 14,
    is_unlimited: false,
    features: '',
  });

  const [newCode, setNewCode] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 10,
    max_uses: 100,
    valid_until: '',
    is_active: true,
  });

  const fetchData = async () => {
    try {
      const [plansRes, codesRes] = await Promise.all([
        supabase.from('subscription_plans').select('*').order('min_employees', { ascending: true }),
        supabase.from('discount_codes').select('*').order('created_at', { ascending: false }),
      ]);

      if (plansRes.error) throw plansRes.error;
      if (codesRes.error) throw codesRes.error;

      setPlans((plansRes.data || []).map(p => ({
        ...p,
        features: Array.isArray(p.features) ? (p.features as string[]) : [],
      })));
      setDiscountCodes((codesRes.data || []).map(c => ({
        ...c,
        discount_type: c.discount_type as 'percentage' | 'fixed',
      })));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSavePlan = async () => {
    if (!isSuperAdmin) return;
    if (!newPlan.name) {
      toast.error('الرجاء إدخال اسم الباقة');
      return;
    }

    setSubmitting(true);
    try {
      const planData = {
        name: newPlan.name,
        name_ar: newPlan.name_ar || null,
        description: newPlan.description || null,
        min_employees: newPlan.min_employees,
        max_employees: newPlan.is_unlimited ? null : newPlan.max_employees,
        price_monthly: newPlan.price_monthly,
        price_quarterly: newPlan.price_quarterly || null,
        price_yearly: newPlan.price_yearly || null,
        currency: newPlan.currency,
        trial_days: newPlan.trial_days,
        is_unlimited: newPlan.is_unlimited,
        features: newPlan.features.split('\n').filter(f => f.trim()),
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(planData)
          .eq('id', editingPlan.id);
        if (error) throw error;
        toast.success('تم تحديث الباقة');
      } else {
        const { error } = await supabase
          .from('subscription_plans')
          .insert(planData);
        if (error) throw error;
        toast.success('تم إضافة الباقة');
      }

      setPlanDialogOpen(false);
      setEditingPlan(null);
      resetPlanForm();
      fetchData();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('فشل في حفظ الباقة');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!isSuperAdmin) return;
    if (!confirm('هل أنت متأكد من حذف هذه الباقة؟')) return;

    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);
      if (error) throw error;
      toast.success('تم حذف الباقة');
      fetchData();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('فشل في حذف الباقة');
    }
  };

  const handleTogglePlanStatus = async (planId: string, isActive: boolean) => {
    if (!isSuperAdmin) return;

    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ is_active: !isActive })
        .eq('id', planId);
      if (error) throw error;
      toast.success(isActive ? 'تم إيقاف الباقة' : 'تم تفعيل الباقة');
      fetchData();
    } catch (error) {
      console.error('Error toggling plan:', error);
      toast.error('فشل في تحديث الباقة');
    }
  };

  const handleSaveCode = async () => {
    if (!isSuperAdmin) return;
    if (!newCode.code) {
      toast.error('الرجاء إدخال كود الخصم');
      return;
    }

    setSubmitting(true);
    try {
      const codeData = {
        code: newCode.code.toUpperCase(),
        discount_type: newCode.discount_type,
        discount_value: newCode.discount_value,
        max_uses: newCode.max_uses || null,
        valid_until: newCode.valid_until || null,
        is_active: newCode.is_active,
      };

      if (editingCode) {
        const { error } = await supabase
          .from('discount_codes')
          .update(codeData)
          .eq('id', editingCode.id);
        if (error) throw error;
        toast.success('تم تحديث الكود');
      } else {
        const { error } = await supabase
          .from('discount_codes')
          .insert(codeData);
        if (error) throw error;
        toast.success('تم إضافة الكود');
      }

      setCodeDialogOpen(false);
      setEditingCode(null);
      resetCodeForm();
      fetchData();
    } catch (error) {
      console.error('Error saving code:', error);
      toast.error('فشل في حفظ الكود');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!isSuperAdmin) return;
    if (!confirm('هل أنت متأكد من حذف هذا الكود؟')) return;

    try {
      const { error } = await supabase
        .from('discount_codes')
        .delete()
        .eq('id', codeId);
      if (error) throw error;
      toast.success('تم حذف الكود');
      fetchData();
    } catch (error) {
      console.error('Error deleting code:', error);
      toast.error('فشل في حذف الكود');
    }
  };

  const resetPlanForm = () => {
    setNewPlan({
      name: '',
      name_ar: '',
      description: '',
      min_employees: 1,
      max_employees: 10,
      price_monthly: 0,
      price_quarterly: 0,
      price_yearly: 0,
      currency: 'EGP',
      trial_days: 14,
      is_unlimited: false,
      features: '',
    });
  };

  const resetCodeForm = () => {
    setNewCode({
      code: '',
      discount_type: 'percentage',
      discount_value: 10,
      max_uses: 100,
      valid_until: '',
      is_active: true,
    });
  };

  const openEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setNewPlan({
      name: plan.name,
      name_ar: plan.name_ar || '',
      description: plan.description || '',
      min_employees: plan.min_employees,
      max_employees: plan.max_employees || 10,
      price_monthly: plan.price_monthly,
      price_quarterly: plan.price_quarterly || 0,
      price_yearly: plan.price_yearly || 0,
      currency: plan.currency,
      trial_days: plan.trial_days,
      is_unlimited: plan.is_unlimited,
      features: plan.features.join('\n'),
    });
    setPlanDialogOpen(true);
  };

  const openEditCode = (code: DiscountCode) => {
    setEditingCode(code);
    setNewCode({
      code: code.code,
      discount_type: code.discount_type,
      discount_value: code.discount_value,
      max_uses: code.max_uses || 100,
      valid_until: code.valid_until ? code.valid_until.split('T')[0] : '',
      is_active: code.is_active,
    });
    setCodeDialogOpen(true);
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">الباقات والأسعار</h1>
          <p className="text-slate-400 mt-1">إدارة باقات الاشتراك وأكواد الخصم</p>
        </div>

        <Tabs defaultValue="plans" className="space-y-6">
          <TabsList className="bg-slate-900 border-slate-800">
            <TabsTrigger value="plans" className="data-[state=active]:bg-primary">الباقات</TabsTrigger>
            <TabsTrigger value="discounts" className="data-[state=active]:bg-primary">أكواد الخصم</TabsTrigger>
          </TabsList>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-6">
            <div className="flex justify-end">
              {isSuperAdmin && (
                <Dialog open={planDialogOpen} onOpenChange={(open) => {
                  setPlanDialogOpen(open);
                  if (!open) { setEditingPlan(null); resetPlanForm(); }
                }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      إضافة باقة
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        {editingPlan ? 'تعديل الباقة' : 'إضافة باقة جديدة'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>اسم الباقة (English)</Label>
                          <Input
                            value={newPlan.name}
                            onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                            className="bg-slate-800 border-slate-700"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>اسم الباقة (عربي)</Label>
                          <Input
                            value={newPlan.name_ar}
                            onChange={(e) => setNewPlan({ ...newPlan, name_ar: e.target.value })}
                            className="bg-slate-800 border-slate-700"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>الوصف</Label>
                        <Input
                          value={newPlan.description}
                          onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                          className="bg-slate-800 border-slate-700"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800">
                        <Label>عدد موظفين غير محدود</Label>
                        <Switch
                          checked={newPlan.is_unlimited}
                          onCheckedChange={(checked) => setNewPlan({ ...newPlan, is_unlimited: checked })}
                        />
                      </div>
                      {!newPlan.is_unlimited && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>الحد الأدنى للموظفين</Label>
                            <Input
                              type="number"
                              value={newPlan.min_employees}
                              onChange={(e) => setNewPlan({ ...newPlan, min_employees: parseInt(e.target.value) || 1 })}
                              className="bg-slate-800 border-slate-700"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>الحد الأقصى للموظفين</Label>
                            <Input
                              type="number"
                              value={newPlan.max_employees}
                              onChange={(e) => setNewPlan({ ...newPlan, max_employees: parseInt(e.target.value) || 10 })}
                              className="bg-slate-800 border-slate-700"
                            />
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>السعر الشهري</Label>
                          <Input
                            type="number"
                            value={newPlan.price_monthly}
                            onChange={(e) => setNewPlan({ ...newPlan, price_monthly: parseFloat(e.target.value) || 0 })}
                            className="bg-slate-800 border-slate-700"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>العملة</Label>
                          <Select
                            value={newPlan.currency}
                            onValueChange={(value) => setNewPlan({ ...newPlan, currency: value })}
                          >
                            <SelectTrigger className="bg-slate-800 border-slate-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700">
                              <SelectItem value="EGP" className="text-white">جنيه مصري (EGP)</SelectItem>
                              <SelectItem value="SAR" className="text-white">ريال سعودي (SAR)</SelectItem>
                              <SelectItem value="USD" className="text-white">دولار أمريكي (USD)</SelectItem>
                              <SelectItem value="AED" className="text-white">درهم إماراتي (AED)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>سعر 3 شهور</Label>
                          <Input
                            type="number"
                            value={newPlan.price_quarterly}
                            onChange={(e) => setNewPlan({ ...newPlan, price_quarterly: parseFloat(e.target.value) || 0 })}
                            className="bg-slate-800 border-slate-700"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>السعر السنوي</Label>
                          <Input
                            type="number"
                            value={newPlan.price_yearly}
                            onChange={(e) => setNewPlan({ ...newPlan, price_yearly: parseFloat(e.target.value) || 0 })}
                            className="bg-slate-800 border-slate-700"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>أيام التجربة المجانية</Label>
                        <Input
                          type="number"
                          value={newPlan.trial_days}
                          onChange={(e) => setNewPlan({ ...newPlan, trial_days: parseInt(e.target.value) || 0 })}
                          className="bg-slate-800 border-slate-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>المميزات (سطر لكل ميزة)</Label>
                        <textarea
                          value={newPlan.features}
                          onChange={(e) => setNewPlan({ ...newPlan, features: e.target.value })}
                          className="w-full h-24 p-3 rounded-md bg-slate-800 border border-slate-700 text-white resize-none"
                          placeholder="ميزة 1&#10;ميزة 2&#10;ميزة 3"
                        />
                      </div>
                      <Button onClick={handleSavePlan} disabled={submitting} className="w-full">
                        {submitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                        {editingPlan ? 'حفظ التغييرات' : 'إضافة الباقة'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {loading ? (
                <p className="text-slate-400 col-span-4 text-center py-8">جاري التحميل...</p>
              ) : plans.length === 0 ? (
                <p className="text-slate-400 col-span-4 text-center py-8">لا توجد باقات</p>
              ) : (
                plans.map((plan) => (
                  <Card key={plan.id} className={`bg-slate-900 border-slate-800 ${!plan.is_active ? 'opacity-50' : ''}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-white text-lg">{plan.name_ar || plan.name}</CardTitle>
                        <Badge className={plan.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}>
                          {plan.is_active ? 'نشط' : 'موقوف'}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-sm">{plan.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center py-4 rounded-lg bg-slate-800/50">
                        <p className="text-3xl font-bold text-primary">{plan.price_monthly}</p>
                        <p className="text-slate-400 text-sm">{plan.currency} / شهرياً</p>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="text-slate-300">
                          {plan.is_unlimited ? 'عدد غير محدود من الموظفين' : `${plan.min_employees} - ${plan.max_employees} موظف`}
                        </p>
                        <p className="text-slate-400">{plan.trial_days} يوم تجربة</p>
                        {plan.price_quarterly && (
                          <p className="text-slate-400">3 شهور: {plan.price_quarterly} {plan.currency}</p>
                        )}
                        {plan.price_yearly && (
                          <p className="text-slate-400">سنوي: {plan.price_yearly} {plan.currency}</p>
                        )}
                      </div>
                      {isSuperAdmin && (
                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditPlan(plan)}>
                            <Edit className="w-4 h-4 me-1" /> تعديل
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTogglePlanStatus(plan.id, plan.is_active)}
                            className={plan.is_active ? 'text-amber-400 border-amber-400' : 'text-green-400 border-green-400'}
                          >
                            {plan.is_active ? 'إيقاف' : 'تفعيل'}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeletePlan(plan.id)} className="text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Discount Codes Tab */}
          <TabsContent value="discounts" className="space-y-6">
            <div className="flex justify-end">
              {isSuperAdmin && (
                <Dialog open={codeDialogOpen} onOpenChange={(open) => {
                  setCodeDialogOpen(open);
                  if (!open) { setEditingCode(null); resetCodeForm(); }
                }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      إضافة كود خصم
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border-slate-800 text-white">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Tag className="w-5 h-5" />
                        {editingCode ? 'تعديل كود الخصم' : 'إضافة كود خصم'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>كود الخصم</Label>
                        <Input
                          value={newCode.code}
                          onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                          placeholder="SAVE20"
                          className="bg-slate-800 border-slate-700"
                          dir="ltr"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>نوع الخصم</Label>
                          <Select
                            value={newCode.discount_type}
                            onValueChange={(value: 'percentage' | 'fixed') => setNewCode({ ...newCode, discount_type: value })}
                          >
                            <SelectTrigger className="bg-slate-800 border-slate-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700">
                              <SelectItem value="percentage" className="text-white">نسبة مئوية (%)</SelectItem>
                              <SelectItem value="fixed" className="text-white">مبلغ ثابت</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>قيمة الخصم</Label>
                          <Input
                            type="number"
                            value={newCode.discount_value}
                            onChange={(e) => setNewCode({ ...newCode, discount_value: parseFloat(e.target.value) || 0 })}
                            className="bg-slate-800 border-slate-700"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>الحد الأقصى للاستخدام</Label>
                          <Input
                            type="number"
                            value={newCode.max_uses}
                            onChange={(e) => setNewCode({ ...newCode, max_uses: parseInt(e.target.value) || 0 })}
                            className="bg-slate-800 border-slate-700"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>تاريخ الانتهاء</Label>
                          <Input
                            type="date"
                            value={newCode.valid_until}
                            onChange={(e) => setNewCode({ ...newCode, valid_until: e.target.value })}
                            className="bg-slate-800 border-slate-700"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800">
                        <Label>الكود نشط</Label>
                        <Switch
                          checked={newCode.is_active}
                          onCheckedChange={(checked) => setNewCode({ ...newCode, is_active: checked })}
                        />
                      </div>
                      <Button onClick={handleSaveCode} disabled={submitting} className="w-full">
                        {submitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                        {editingCode ? 'حفظ التغييرات' : 'إضافة الكود'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Discount Codes Table */}
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-slate-800/50">
                      <TableHead className="text-slate-400">الكود</TableHead>
                      <TableHead className="text-slate-400">الخصم</TableHead>
                      <TableHead className="text-slate-400">الاستخدام</TableHead>
                      <TableHead className="text-slate-400">تاريخ الانتهاء</TableHead>
                      <TableHead className="text-slate-400">الحالة</TableHead>
                      {isSuperAdmin && <TableHead className="text-slate-400">الإجراءات</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                          جاري التحميل...
                        </TableCell>
                      </TableRow>
                    ) : discountCodes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                          لا توجد أكواد خصم
                        </TableCell>
                      </TableRow>
                    ) : (
                      discountCodes.map((code) => (
                        <TableRow key={code.id} className="border-slate-800 hover:bg-slate-800/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                                <Percent className="w-5 h-5 text-primary" />
                              </div>
                              <span className="text-white font-mono font-medium">{code.code}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {code.discount_value}{code.discount_type === 'percentage' ? '%' : ' (ثابت)'}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {code.used_count} / {code.max_uses || '∞'}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {code.valid_until ? new Date(code.valid_until).toLocaleDateString('ar-SA') : 'غير محدد'}
                          </TableCell>
                          <TableCell>
                            <Badge className={code.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}>
                              {code.is_active ? 'نشط' : 'موقوف'}
                            </Badge>
                          </TableCell>
                          {isSuperAdmin && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => openEditCode(code)} className="text-slate-300">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteCode(code.id)} className="text-red-400">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminPlans;
