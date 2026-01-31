import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Tag,
  Plus,
  RefreshCw,
  Percent,
  DollarSign,
  Calendar,
  Copy,
  Trash2,
  Edit,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface DiscountCode {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  applicable_plans: string[] | null;
  created_at: string;
}

const SuperAdminDiscountCodes = () => {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<DiscountCode | null>(null);

  // New code form
  const [newCode, setNewCode] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    max_uses: '',
    valid_from: '',
    valid_until: '',
    is_active: true
  });

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error('Error fetching codes:', error);
      toast.error('فشل في تحميل أكواد الخصم');
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode({ ...newCode, code });
  };

  const createCode = async () => {
    if (!newCode.code || !newCode.discount_value) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      const { error } = await supabase.from('discount_codes').insert({
        code: newCode.code.toUpperCase(),
        discount_type: newCode.discount_type,
        discount_value: parseFloat(newCode.discount_value),
        max_uses: newCode.max_uses ? parseInt(newCode.max_uses) : null,
        valid_from: newCode.valid_from || null,
        valid_until: newCode.valid_until || null,
        is_active: newCode.is_active
      });

      if (error) throw error;

      toast.success('تم إنشاء كود الخصم بنجاح');
      setCreateDialogOpen(false);
      setNewCode({
        code: '',
        discount_type: 'percentage',
        discount_value: '',
        max_uses: '',
        valid_from: '',
        valid_until: '',
        is_active: true
      });
      fetchCodes();
    } catch (error: any) {
      console.error('Error creating code:', error);
      if (error.code === '23505') {
        toast.error('هذا الكود موجود بالفعل');
      } else {
        toast.error('فشل في إنشاء كود الخصم');
      }
    }
  };

  const toggleCodeStatus = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('discount_codes')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      toast.success(isActive ? 'تم تفعيل الكود' : 'تم تعطيل الكود');
      fetchCodes();
    } catch (error) {
      console.error('Error toggling code:', error);
      toast.error('فشل في تحديث الكود');
    }
  };

  const deleteCode = async (id: string) => {
    try {
      const { error } = await supabase.from('discount_codes').delete().eq('id', id);
      if (error) throw error;
      toast.success('تم حذف الكود');
      fetchCodes();
    } catch (error) {
      console.error('Error deleting code:', error);
      toast.error('فشل في حذف الكود');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('تم نسخ الكود');
  };

  const isCodeValid = (code: DiscountCode) => {
    if (!code.is_active) return false;
    if (code.max_uses && code.used_count >= code.max_uses) return false;
    if (code.valid_until && new Date(code.valid_until) < new Date()) return false;
    if (code.valid_from && new Date(code.valid_from) > new Date()) return false;
    return true;
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">أكواد الخصم</h1>
            <p className="text-slate-400 mt-1">إدارة أكواد الخصم والعروض الترويجية</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCodes}
              className="gap-2 border-slate-700 text-slate-300"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  إنشاء كود جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800 text-white">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    إنشاء كود خصم جديد
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    إنشاء كود خصم جديد للاشتراكات
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>الكود *</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newCode.code}
                        onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                        placeholder="مثال: WELCOME20"
                        className="bg-slate-800 border-slate-700 flex-1"
                      />
                      <Button variant="outline" onClick={generateCode} className="border-slate-700">
                        توليد
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>نوع الخصم</Label>
                      <Select
                        value={newCode.discount_type}
                        onValueChange={(v) => setNewCode({ ...newCode, discount_type: v })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">نسبة مئوية %</SelectItem>
                          <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>قيمة الخصم *</Label>
                      <Input
                        type="number"
                        value={newCode.discount_value}
                        onChange={(e) => setNewCode({ ...newCode, discount_value: e.target.value })}
                        placeholder={newCode.discount_type === 'percentage' ? '20' : '100'}
                        className="bg-slate-800 border-slate-700"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>الحد الأقصى للاستخدام (اتركه فارغاً لغير محدود)</Label>
                    <Input
                      type="number"
                      value={newCode.max_uses}
                      onChange={(e) => setNewCode({ ...newCode, max_uses: e.target.value })}
                      placeholder="مثال: 100"
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>صالح من</Label>
                      <Input
                        type="datetime-local"
                        value={newCode.valid_from}
                        onChange={(e) => setNewCode({ ...newCode, valid_from: e.target.value })}
                        className="bg-slate-800 border-slate-700"
                      />
                    </div>
                    <div>
                      <Label>صالح حتى</Label>
                      <Input
                        type="datetime-local"
                        value={newCode.valid_until}
                        onChange={(e) => setNewCode({ ...newCode, valid_until: e.target.value })}
                        className="bg-slate-800 border-slate-700"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newCode.is_active}
                      onCheckedChange={(v) => setNewCode({ ...newCode, is_active: v })}
                    />
                    <Label>تفعيل الكود فوراً</Label>
                  </div>
                  <Button onClick={createCode} className="w-full">
                    إنشاء الكود
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Tag className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{codes.length}</p>
                <p className="text-slate-400 text-sm">إجمالي الأكواد</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {codes.filter(c => isCodeValid(c)).length}
                </p>
                <p className="text-slate-400 text-sm">أكواد نشطة</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Percent className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {codes.reduce((sum, c) => sum + c.used_count, 0)}
                </p>
                <p className="text-slate-400 text-sm">مرات الاستخدام</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {codes.filter(c => !isCodeValid(c)).length}
                </p>
                <p className="text-slate-400 text-sm">أكواد منتهية</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Codes Table */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              أكواد الخصم
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">الكود</TableHead>
                    <TableHead className="text-slate-400">الخصم</TableHead>
                    <TableHead className="text-slate-400">الاستخدام</TableHead>
                    <TableHead className="text-slate-400">الصلاحية</TableHead>
                    <TableHead className="text-slate-400">الحالة</TableHead>
                    <TableHead className="text-slate-400">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((code) => {
                    const valid = isCodeValid(code);
                    return (
                      <TableRow key={code.id} className="border-slate-800">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-primary font-mono bg-primary/10 px-2 py-1 rounded">
                              {code.code}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyCode(code.code)}
                              className="h-6 w-6 text-slate-400 hover:text-white"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {code.discount_type === 'percentage' ? (
                              <Percent className="w-4 h-4 text-green-400" />
                            ) : (
                              <DollarSign className="w-4 h-4 text-green-400" />
                            )}
                            <span className="text-white">
                              {code.discount_value}
                              {code.discount_type === 'percentage' ? '%' : ' EGP'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {code.used_count} / {code.max_uses || '∞'}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {code.valid_until ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-slate-500" />
                              {new Date(code.valid_until).toLocaleDateString('ar-SA')}
                            </div>
                          ) : (
                            'دائم'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={valid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                            {valid ? 'نشط' : 'غير نشط'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Switch
                              checked={code.is_active}
                              onCheckedChange={(v) => toggleCodeStatus(code.id, v)}
                            />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-red-400"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-slate-900 border-slate-800">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white">حذف الكود؟</AlertDialogTitle>
                                  <AlertDialogDescription className="text-slate-400">
                                    سيتم حذف كود الخصم "{code.code}" نهائياً.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-slate-800 text-white border-slate-700">إلغاء</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteCode(code.id)} className="bg-red-600 hover:bg-red-700">
                                    حذف
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {codes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                        لا توجد أكواد خصم
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminDiscountCodes;
