import { useState, useRef } from 'react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Mail, 
  Trash2,
  HardDrive,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileJson
} from 'lucide-react';
import { useBackups, useBackupStats, useCreateBackup, useSendBackupEmail, useRestoreBackup, useDeleteBackup, Backup } from '@/hooks/useBackups';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';

const SuperAdminBackups = () => {
  const { user } = useSuperAdmin();
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [fileRestoreDialogOpen, setFileRestoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [targetCompanyId, setTargetCompanyId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: backups, isLoading } = useBackups(selectedCompany === 'all' ? undefined : selectedCompany);
  const { data: stats } = useBackupStats();
  const createBackup = useCreateBackup();
  const sendBackupEmail = useSendBackupEmail();
  const restoreBackup = useRestoreBackup();
  const deleteBackup = useDeleteBackup();

  const { data: companies } = useQuery({
    queryKey: ['companies-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const handleCreateBackup = async (companyId?: string) => {
    await createBackup.mutateAsync({
      companyId,
      backupAll: !companyId,
      createdBy: user?.id
    });
  };

  const handleSendEmails = async () => {
    await sendBackupEmail.mutateAsync({ sendAllPending: true });
  };

  const handleDownload = (backup: Backup) => {
    const dataStr = JSON.stringify(backup.backup_data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${backup.companies?.name || 'unknown'}_${format(new Date(backup.created_at), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestoreFromSystem = async () => {
    if (!selectedBackup) return;
    
    await restoreBackup.mutateAsync({
      backupId: selectedBackup.id,
      companyId: selectedBackup.company_id,
      restoredBy: user?.id
    });
    
    setRestoreDialogOpen(false);
    setSelectedBackup(null);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        // Validate structure
        if (!json.backup_info || !json.data) {
          toast.error('ملف غير صالح: يجب أن يحتوي على backup_info و data');
          return;
        }

        setUploadedFile(json);
        
        // Auto-select company if available
        if (json.backup_info.company_id) {
          setTargetCompanyId(json.backup_info.company_id);
        }
        
        toast.success('تم تحميل الملف بنجاح');
      } catch (error) {
        toast.error('ملف JSON غير صالح');
        setUploadedFile(null);
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreFromFile = async () => {
    if (!uploadedFile || !targetCompanyId) {
      toast.error('يرجى اختيار الشركة المستهدفة');
      return;
    }

    await restoreBackup.mutateAsync({
      backupData: uploadedFile,
      companyId: targetCompanyId,
      restoredBy: user?.id
    });

    setFileRestoreDialogOpen(false);
    setUploadedFile(null);
    setUploadedFileName('');
    setTargetCompanyId('');
  };

  const handleDelete = async () => {
    if (!selectedBackup) return;
    
    await deleteBackup.mutateAsync(selectedBackup.id);
    setDeleteDialogOpen(false);
    setSelectedBackup(null);
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle2 className="w-3 h-3 ml-1" />مكتمل</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400"><XCircle className="w-3 h-3 ml-1" />فشل</Badge>;
      case 'restoring':
        return <Badge className="bg-yellow-500/20 text-yellow-400"><RefreshCw className="w-3 h-3 ml-1 animate-spin" />جاري الاستعادة</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500/20 text-blue-400"><RefreshCw className="w-3 h-3 ml-1 animate-spin" />جاري النسخ</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">النسخ الاحتياطي</h1>
            <p className="text-slate-400">إدارة النسخ الاحتياطية واستعادة البيانات</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={() => handleCreateBackup()} 
              disabled={createBackup.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              <Database className="w-4 h-4 ml-2" />
              {createBackup.isPending ? 'جاري النسخ...' : 'نسخة احتياطية للكل'}
            </Button>
            <Button 
              onClick={handleSendEmails} 
              disabled={sendBackupEmail.isPending}
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <Mail className="w-4 h-4 ml-2" />
              {sendBackupEmail.isPending ? 'جاري الإرسال...' : 'إرسال الإيميلات'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/20">
                  <Database className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">إجمالي النسخ</p>
                  <p className="text-2xl font-bold text-white">{stats?.totalBackups || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/20">
                  <HardDrive className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">المساحة المستخدمة</p>
                  <p className="text-2xl font-bold text-white">{formatSize(stats?.totalSize || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/20">
                  <Mail className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">إيميلات مرسلة</p>
                  <p className="text-2xl font-bold text-white">{stats?.emailsSent || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/20">
                  <Clock className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">آخر نسخة</p>
                  <p className="text-lg font-bold text-white">
                    {stats?.lastBackup 
                      ? format(new Date(stats.lastBackup), 'dd MMM yyyy', { locale: ar })
                      : 'لا يوجد'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Restore Buttons */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              استعادة البيانات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <Button
                onClick={() => setRestoreDialogOpen(true)}
                variant="outline"
                className="border-green-500/50 text-green-400 hover:bg-green-500/10"
              >
                <Database className="w-4 h-4 ml-2" />
                استعادة من النظام الداخلي
              </Button>
              <Button
                onClick={() => setFileRestoreDialogOpen(true)}
                variant="outline"
                className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
              >
                <Upload className="w-4 h-4 ml-2" />
                استعادة من ملف JSON
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Backups Table */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-white">سجل النسخ الاحتياطية</CardTitle>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-[200px] bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="جميع الشركات" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all">جميع الشركات</SelectItem>
                  {companies?.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-400">جاري التحميل...</div>
            ) : backups?.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد نسخ احتياطية</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400">الشركة</TableHead>
                      <TableHead className="text-slate-400">التاريخ</TableHead>
                      <TableHead className="text-slate-400">النوع</TableHead>
                      <TableHead className="text-slate-400">الحجم</TableHead>
                      <TableHead className="text-slate-400">الحالة</TableHead>
                      <TableHead className="text-slate-400">الإيميل</TableHead>
                      <TableHead className="text-slate-400">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups?.map((backup) => (
                      <TableRow key={backup.id} className="border-slate-800 hover:bg-slate-800/50">
                        <TableCell className="text-white font-medium">
                          {backup.companies?.name || 'غير معروف'}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {format(new Date(backup.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={backup.backup_type === 'automatic' ? 'secondary' : 'outline'}>
                            {backup.backup_type === 'automatic' ? 'تلقائي' : 'يدوي'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {formatSize(backup.size_bytes)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(backup.status)}
                        </TableCell>
                        <TableCell>
                          {backup.email_sent ? (
                            <Badge className="bg-green-500/20 text-green-400">تم الإرسال</Badge>
                          ) : (
                            <Badge className="bg-slate-500/20 text-slate-400">لم يرسل</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDownload(backup)}
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedBackup(backup);
                                setRestoreDialogOpen(true);
                              }}
                              className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedBackup(backup);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Restore from System Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>استعادة من النظام الداخلي</DialogTitle>
            <DialogDescription className="text-slate-400">
              اختر نسخة احتياطية لاستعادة البيانات منها
            </DialogDescription>
          </DialogHeader>
          
          {selectedBackup ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-800 space-y-2">
                <p><strong>الشركة:</strong> {selectedBackup.companies?.name}</p>
                <p><strong>التاريخ:</strong> {format(new Date(selectedBackup.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}</p>
                <p><strong>الحجم:</strong> {formatSize(selectedBackup.size_bytes)}</p>
                <p><strong>السجلات:</strong> {selectedBackup.backup_data?.backup_info?.total_records || 0}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 mt-0.5" />
                  <div>
                    <p className="font-medium">تحذير هام</p>
                    <p className="text-sm">سيتم حذف البيانات الحالية واستبدالها بالبيانات من النسخة الاحتياطية.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Label>اختر الشركة أولاً</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue placeholder="اختر شركة" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {companies?.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Label>اختر النسخة الاحتياطية</Label>
              <div className="max-h-[200px] overflow-y-auto space-y-2">
                {backups?.filter(b => b.status === 'completed').map((backup) => (
                  <div
                    key={backup.id}
                    onClick={() => setSelectedBackup(backup)}
                    className="p-3 rounded-lg bg-slate-800 cursor-pointer hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span>{backup.companies?.name}</span>
                      <span className="text-sm text-slate-400">
                        {format(new Date(backup.created_at), 'dd MMM yyyy', { locale: ar })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => {
              setRestoreDialogOpen(false);
              setSelectedBackup(null);
            }}>
              إلغاء
            </Button>
            <Button 
              onClick={handleRestoreFromSystem}
              disabled={!selectedBackup || restoreBackup.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {restoreBackup.isPending ? 'جاري الاستعادة...' : 'تأكيد الاستعادة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore from File Dialog */}
      <Dialog open={fileRestoreDialogOpen} onOpenChange={setFileRestoreDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>استعادة من ملف JSON</DialogTitle>
            <DialogDescription className="text-slate-400">
              قم برفع ملف النسخة الاحتياطية واختر الشركة المستهدفة
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* File Upload */}
            <div>
              <Label>ملف النسخة الاحتياطية</Label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 p-8 border-2 border-dashed border-slate-700 rounded-lg text-center cursor-pointer hover:border-primary transition-colors"
              >
                <FileJson className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                {uploadedFileName ? (
                  <p className="text-green-400">{uploadedFileName}</p>
                ) : (
                  <p className="text-slate-400">اضغط هنا لرفع ملف JSON</p>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* File Preview */}
            {uploadedFile && (
              <div className="p-4 rounded-lg bg-slate-800 space-y-2">
                <p><strong>الشركة الأصلية:</strong> {uploadedFile.backup_info?.company_name}</p>
                <p><strong>تاريخ النسخة:</strong> {uploadedFile.backup_info?.backup_date ? format(new Date(uploadedFile.backup_info.backup_date), 'dd MMM yyyy - HH:mm', { locale: ar }) : 'غير معروف'}</p>
                <p><strong>إجمالي السجلات:</strong> {uploadedFile.backup_info?.total_records || 0}</p>
              </div>
            )}

            {/* Target Company */}
            <div>
              <Label>الشركة المستهدفة</Label>
              <Select value={targetCompanyId} onValueChange={setTargetCompanyId}>
                <SelectTrigger className="mt-2 bg-slate-800 border-slate-700">
                  <SelectValue placeholder="اختر الشركة المستهدفة" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {companies?.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Warning */}
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 mt-0.5" />
                <div>
                  <p className="font-medium">تحذير هام</p>
                  <p className="text-sm">سيتم حذف جميع البيانات الحالية للشركة المستهدفة واستبدالها بالبيانات من الملف المرفوع.</p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => {
              setFileRestoreDialogOpen(false);
              setUploadedFile(null);
              setUploadedFileName('');
              setTargetCompanyId('');
            }}>
              إلغاء
            </Button>
            <Button 
              onClick={handleRestoreFromFile}
              disabled={!uploadedFile || !targetCompanyId || restoreBackup.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {restoreBackup.isPending ? 'جاري الاستعادة...' : 'تأكيد الاستعادة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">حذف النسخة الاحتياطية</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              هل أنت متأكد من حذف هذه النسخة الاحتياطية؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SuperAdminLayout>
  );
};

export default SuperAdminBackups;
