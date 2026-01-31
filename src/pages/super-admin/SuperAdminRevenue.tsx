import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus,
  Search,
  Calendar,
  Building2,
  RefreshCw,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

interface RevenueTransaction {
  id: string;
  company_id: string;
  company_name?: string;
  amount: number;
  currency: string;
  transaction_type: string;
  payment_method: string | null;
  notes: string | null;
  reference_id: string | null;
  subscription_id: string | null;
  status: string | null;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
}

const SuperAdminRevenue = () => {
  const [transactions, setTransactions] = useState<RevenueTransaction[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    today: 0,
    thisMonth: 0,
    thisYear: 0,
    currency: 'EGP'
  });

  // New transaction form
  const [newTransaction, setNewTransaction] = useState({
    company_id: '',
    amount: '',
    currency: 'EGP',
    transaction_type: 'subscription',
    payment_method: '',
    notes: ''
  });

  useEffect(() => {
    fetchTransactions();
    fetchCompanies();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('revenue_transactions')
        .select(`
          *,
          companies:company_id (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedData = (data || []).map(t => ({
        ...t,
        company_name: t.companies?.name || 'غير معروف'
      }));

      setTransactions(enrichedData);
      calculateStats(enrichedData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('فشل في تحميل المعاملات');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('id, name').order('name');
    setCompanies(data || []);
  };

  const calculateStats = (data: RevenueTransaction[]) => {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);
    const thisYear = new Date().getFullYear().toString();

    const todayRevenue = data
      .filter(t => t.created_at?.startsWith(today) && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const monthRevenue = data
      .filter(t => t.created_at?.startsWith(thisMonth) && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const yearRevenue = data
      .filter(t => t.created_at?.startsWith(thisYear) && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    setStats({
      today: todayRevenue,
      thisMonth: monthRevenue,
      thisYear: yearRevenue,
      currency: 'EGP'
    });
  };

  const handleAddTransaction = async () => {
    if (!newTransaction.company_id || !newTransaction.amount) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      const { error } = await supabase.from('revenue_transactions').insert({
        company_id: newTransaction.company_id,
        amount: parseFloat(newTransaction.amount),
        currency: newTransaction.currency,
        transaction_type: newTransaction.transaction_type,
        payment_method: newTransaction.payment_method || null,
        notes: newTransaction.notes || null
      });

      if (error) throw error;

      toast.success('تم إضافة المعاملة بنجاح');
      setAddDialogOpen(false);
      setNewTransaction({
        company_id: '',
        amount: '',
        currency: 'EGP',
        transaction_type: 'subscription',
        payment_method: '',
        notes: ''
      });
      fetchTransactions();
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('فشل في إضافة المعاملة');
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'subscription': return 'اشتراك';
      case 'upgrade': return 'ترقية';
      case 'renewal': return 'تجديد';
      case 'refund': return 'استرداد';
      case 'addon': return 'إضافة';
      default: return type;
    }
  };

  const getTransactionTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'subscription': return 'bg-blue-500/20 text-blue-400';
      case 'upgrade': return 'bg-green-500/20 text-green-400';
      case 'renewal': return 'bg-purple-500/20 text-purple-400';
      case 'refund': return 'bg-red-500/20 text-red-400';
      case 'addon': return 'bg-amber-500/20 text-amber-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || t.transaction_type === filterType;
    return matchesSearch && matchesType;
  });

  const exportToCSV = () => {
    const headers = ['التاريخ', 'الشركة', 'المبلغ', 'العملة', 'النوع', 'طريقة الدفع', 'الملاحظات'];
    const rows = filteredTransactions.map(t => [
      new Date(t.created_at).toLocaleString('ar-SA'),
      t.company_name,
      t.amount,
      t.currency,
      getTransactionTypeLabel(t.transaction_type),
      t.payment_method || '',
      t.notes || ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `revenue_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('تم تصدير البيانات');
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">الإيرادات والمعاملات المالية</h1>
            <p className="text-slate-400 mt-1">تتبع جميع المعاملات المالية للمنصة</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTransactions}
              className="gap-2 border-slate-700 text-slate-300"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="gap-2 border-slate-700 text-slate-300"
            >
              <Download className="w-4 h-4" />
              تصدير
            </Button>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  إضافة معاملة
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800 text-white">
                <DialogHeader>
                  <DialogTitle>إضافة معاملة مالية</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    أضف معاملة مالية جديدة للمنصة
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>الشركة *</Label>
                    <Select
                      value={newTransaction.company_id}
                      onValueChange={(v) => setNewTransaction({ ...newTransaction, company_id: v })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue placeholder="اختر الشركة" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>المبلغ *</Label>
                      <Input
                        type="number"
                        value={newTransaction.amount}
                        onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                        className="bg-slate-800 border-slate-700"
                      />
                    </div>
                    <div>
                      <Label>العملة</Label>
                      <Select
                        value={newTransaction.currency}
                        onValueChange={(v) => setNewTransaction({ ...newTransaction, currency: v })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EGP">EGP</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="SAR">SAR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>نوع المعاملة</Label>
                    <Select
                      value={newTransaction.transaction_type}
                      onValueChange={(v) => setNewTransaction({ ...newTransaction, transaction_type: v })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="subscription">اشتراك جديد</SelectItem>
                        <SelectItem value="upgrade">ترقية</SelectItem>
                        <SelectItem value="renewal">تجديد</SelectItem>
                        <SelectItem value="refund">استرداد</SelectItem>
                        <SelectItem value="addon">إضافة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>طريقة الدفع</Label>
                    <Input
                      value={newTransaction.payment_method}
                      onChange={(e) => setNewTransaction({ ...newTransaction, payment_method: e.target.value })}
                      placeholder="مثال: تحويل بنكي، بطاقة ائتمان..."
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div>
                    <Label>ملاحظات</Label>
                    <Input
                      value={newTransaction.notes}
                      onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })}
                      placeholder="تفاصيل إضافية..."
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <Button onClick={handleAddTransaction} className="w-full">
                    إضافة المعاملة
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">إيرادات اليوم</p>
                    <p className="text-2xl font-bold text-white">
                      {stats.today.toLocaleString()} {stats.currency}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">إيرادات الشهر</p>
                    <p className="text-2xl font-bold text-white">
                      {stats.thisMonth.toLocaleString()} {stats.currency}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">إيرادات السنة</p>
                    <p className="text-2xl font-bold text-white">
                      {stats.thisYear.toLocaleString()} {stats.currency}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="البحث في المعاملات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 bg-slate-800 border-slate-700"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[200px] bg-slate-800 border-slate-700">
                  <SelectValue placeholder="نوع المعاملة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="subscription">اشتراك</SelectItem>
                  <SelectItem value="upgrade">ترقية</SelectItem>
                  <SelectItem value="renewal">تجديد</SelectItem>
                  <SelectItem value="refund">استرداد</SelectItem>
                  <SelectItem value="addon">إضافة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              المعاملات ({filteredTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">التاريخ</TableHead>
                    <TableHead className="text-slate-400">الشركة</TableHead>
                    <TableHead className="text-slate-400">المبلغ</TableHead>
                    <TableHead className="text-slate-400">النوع</TableHead>
                    <TableHead className="text-slate-400">طريقة الدفع</TableHead>
                    <TableHead className="text-slate-400">الوصف</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id} className="border-slate-800">
                      <TableCell className="text-slate-300">
                        {new Date(transaction.created_at).toLocaleString('ar-SA')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-primary" />
                          <span className="text-white">{transaction.company_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={transaction.amount >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {transaction.amount >= 0 ? '+' : ''}{transaction.amount.toLocaleString()} {transaction.currency}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTransactionTypeBadgeClass(transaction.transaction_type)}>
                          {getTransactionTypeLabel(transaction.transaction_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {transaction.payment_method || '-'}
                      </TableCell>
                      <TableCell className="text-slate-400 max-w-[200px] truncate">
                        {transaction.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                        لا توجد معاملات
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

export default SuperAdminRevenue;
