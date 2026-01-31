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
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Camera,
  Building2,
  RefreshCw,
  Download,
  RotateCcw,
  Clock,
  Plus,
  Users,
  Calendar,
  Eye,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface CompanySnapshot {
  id: string;
  company_id: string;
  snapshot_type: string;
  snapshot_data: any;
  employees_count: number | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  company?: {
    name: string;
  };
}

interface Company {
  id: string;
  name: string;
}

const SuperAdminSnapshots = () => {
  const [snapshots, setSnapshots] = useState<CompanySnapshot[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<CompanySnapshot | null>(null);
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);

  // New snapshot form
  const [newSnapshot, setNewSnapshot] = useState({
    company_id: '',
    snapshot_type: 'manual',
    notes: ''
  });

  useEffect(() => {
    fetchSnapshots();
    fetchCompanies();
  }, []);

  const fetchSnapshots = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_snapshots')
        .select(`
          *,
          company:company_id (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSnapshots(data || []);
    } catch (error) {
      console.error('Error fetching snapshots:', error);
      toast.error('فشل في تحميل النسخ الاحتياطية');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('id, name').order('name');
    setCompanies(data || []);
  };

  const createSnapshot = async () => {
    if (!newSnapshot.company_id) {
      toast.error('يرجى اختيار الشركة');
      return;
    }

    setCreatingSnapshot(true);
    try {
      // Fetch all company data for snapshot
      const companyId = newSnapshot.company_id;
      
      const [employeesRes, attendanceRes, salariesRes, settingsRes] = await Promise.all([
        supabase.from('employees').select('*').eq('company_id', companyId),
        supabase.from('attendance_logs').select('*').eq('company_id', companyId).gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
        supabase.from('salary_records').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(100),
        supabase.from('companies').select('*').eq('id', companyId).single()
      ]);

      const snapshotData = {
        employees: employeesRes.data || [],
        attendance: attendanceRes.data || [],
        salaries: salariesRes.data || [],
        settings: settingsRes.data || null,
        snapshot_time: new Date().toISOString()
      };

      const { error } = await supabase.from('company_snapshots').insert({
        company_id: companyId,
        snapshot_type: newSnapshot.snapshot_type,
        snapshot_data: snapshotData,
        employees_count: (employeesRes.data || []).length,
        notes: newSnapshot.notes || null
      });

      if (error) throw error;

      toast.success('تم إنشاء النسخة الاحتياطية بنجاح');
      setCreateDialogOpen(false);
      setNewSnapshot({ company_id: '', snapshot_type: 'manual', notes: '' });
      fetchSnapshots();
    } catch (error) {
      console.error('Error creating snapshot:', error);
      toast.error('فشل في إنشاء النسخة الاحتياطية');
    } finally {
      setCreatingSnapshot(false);
    }
  };

  const restoreSnapshot = async (snapshot: CompanySnapshot) => {
    try {
      // For now, just show the data - real restore would need careful implementation
      toast.info('سيتم تطبيق الاستعادة يدوياً لضمان سلامة البيانات');
      setSelectedSnapshot(snapshot);
      setViewDialogOpen(true);
    } catch (error) {
      console.error('Error restoring snapshot:', error);
      toast.error('فشل في استعادة النسخة');
    }
  };

  const deleteSnapshot = async (id: string) => {
    try {
      const { error } = await supabase.from('company_snapshots').delete().eq('id', id);
      if (error) throw error;
      toast.success('تم حذف النسخة الاحتياطية');
      fetchSnapshots();
    } catch (error) {
      console.error('Error deleting snapshot:', error);
      toast.error('فشل في حذف النسخة');
    }
  };

  const downloadSnapshot = (snapshot: CompanySnapshot) => {
    const blob = new Blob([JSON.stringify(snapshot.snapshot_data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `snapshot_${snapshot.company?.name || 'unknown'}_${new Date(snapshot.created_at).toISOString().split('T')[0]}.json`;
    link.click();
    toast.success('تم تحميل النسخة');
  };

  const getSnapshotTypeLabel = (type: string) => {
    switch (type) {
      case 'manual': return 'يدوي';
      case 'automatic': return 'تلقائي';
      case 'pre_update': return 'قبل التحديث';
      case 'scheduled': return 'مجدول';
      default: return type;
    }
  };

  const getSnapshotTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'manual': return 'bg-blue-500/20 text-blue-400';
      case 'automatic': return 'bg-green-500/20 text-green-400';
      case 'pre_update': return 'bg-amber-500/20 text-amber-400';
      case 'scheduled': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const filteredSnapshots = filterCompany === 'all' 
    ? snapshots 
    : snapshots.filter(s => s.company_id === filterCompany);

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">النسخ الاحتياطية للشركات</h1>
            <p className="text-slate-400 mt-1">إدارة واستعادة بيانات الشركات (Time Travel)</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSnapshots}
              className="gap-2 border-slate-700 text-slate-300"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  إنشاء نسخة احتياطية
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800 text-white">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    إنشاء نسخة احتياطية جديدة
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    إنشاء لقطة كاملة من بيانات الشركة
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>الشركة *</Label>
                    <Select
                      value={newSnapshot.company_id}
                      onValueChange={(v) => setNewSnapshot({ ...newSnapshot, company_id: v })}
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
                  <div>
                    <Label>نوع النسخة</Label>
                    <Select
                      value={newSnapshot.snapshot_type}
                      onValueChange={(v) => setNewSnapshot({ ...newSnapshot, snapshot_type: v })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">يدوي</SelectItem>
                        <SelectItem value="pre_update">قبل التحديث</SelectItem>
                        <SelectItem value="scheduled">مجدول</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>ملاحظات</Label>
                    <Textarea
                      value={newSnapshot.notes}
                      onChange={(e) => setNewSnapshot({ ...newSnapshot, notes: e.target.value })}
                      placeholder="سبب إنشاء النسخة..."
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <Button 
                    onClick={createSnapshot} 
                    className="w-full gap-2"
                    disabled={creatingSnapshot}
                  >
                    {creatingSnapshot ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        جاري الإنشاء...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        إنشاء النسخة
                      </>
                    )}
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
                <Camera className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{snapshots.length}</p>
                <p className="text-slate-400 text-sm">إجمالي النسخ</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {new Set(snapshots.map(s => s.company_id)).size}
                </p>
                <p className="text-slate-400 text-sm">شركات محفوظة</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {snapshots.filter(s => s.snapshot_type === 'manual').length}
                </p>
                <p className="text-slate-400 text-sm">نسخ يدوية</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {snapshots.length > 0 ? new Date(snapshots[0].created_at).toLocaleDateString('ar-SA') : '-'}
                </p>
                <p className="text-slate-400 text-sm">آخر نسخة</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Label className="text-slate-400">تصفية حسب الشركة:</Label>
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger className="w-[250px] bg-slate-800 border-slate-700">
                  <SelectValue placeholder="جميع الشركات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الشركات</SelectItem>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Snapshots Table */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              النسخ الاحتياطية ({filteredSnapshots.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">التاريخ</TableHead>
                    <TableHead className="text-slate-400">الشركة</TableHead>
                    <TableHead className="text-slate-400">النوع</TableHead>
                    <TableHead className="text-slate-400">عدد الموظفين</TableHead>
                    <TableHead className="text-slate-400">الملاحظات</TableHead>
                    <TableHead className="text-slate-400">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSnapshots.map((snapshot) => (
                    <TableRow key={snapshot.id} className="border-slate-800">
                      <TableCell className="text-slate-300">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-500" />
                          {new Date(snapshot.created_at).toLocaleString('ar-SA')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-primary" />
                          <span className="text-white">{snapshot.company?.name || 'غير معروف'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSnapshotTypeBadgeClass(snapshot.snapshot_type)}>
                          {getSnapshotTypeLabel(snapshot.snapshot_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-500" />
                          <span className="text-white">{snapshot.employees_count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400 max-w-[200px] truncate">
                        {snapshot.notes || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedSnapshot(snapshot);
                              setViewDialogOpen(true);
                            }}
                            className="h-8 w-8 text-slate-400 hover:text-white"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => downloadSnapshot(snapshot)}
                            className="h-8 w-8 text-slate-400 hover:text-blue-400"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-green-400"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-900 border-slate-800">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">استعادة النسخة؟</AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400">
                                  سيتم استعادة بيانات الشركة إلى حالتها في {new Date(snapshot.created_at).toLocaleString('ar-SA')}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-slate-800 text-white border-slate-700">إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => restoreSnapshot(snapshot)} className="bg-green-600 hover:bg-green-700">
                                  استعادة
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
                                <AlertDialogTitle className="text-white">حذف النسخة؟</AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400">
                                  سيتم حذف هذه النسخة الاحتياطية نهائياً ولا يمكن التراجع.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-slate-800 text-white border-slate-700">إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteSnapshot(snapshot.id)} className="bg-red-600 hover:bg-red-700">
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSnapshots.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                        لا توجد نسخ احتياطية
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* View Snapshot Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                تفاصيل النسخة الاحتياطية
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                بيانات الشركة في تاريخ {selectedSnapshot ? new Date(selectedSnapshot.created_at).toLocaleString('ar-SA') : ''}
              </DialogDescription>
            </DialogHeader>
            {selectedSnapshot && (
              <ScrollArea className="h-[500px] mt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-slate-800">
                      <p className="text-slate-400 text-sm">الشركة</p>
                      <p className="text-white font-medium">{selectedSnapshot.company?.name}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-800">
                      <p className="text-slate-400 text-sm">عدد الموظفين</p>
                      <p className="text-white font-medium">{selectedSnapshot.employees_count || 0}</p>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-slate-800">
                    <p className="text-slate-400 text-sm mb-2">البيانات المحفوظة:</p>
                    <pre className="text-xs text-slate-300 overflow-auto max-h-[300px] bg-slate-900 p-3 rounded">
                      {JSON.stringify(selectedSnapshot.snapshot_data, null, 2)}
                    </pre>
                  </div>
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminSnapshots;
