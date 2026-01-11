import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import {
  History as HistoryIcon,
  Trash2,
  RotateCcw,
  Clock,
  User,
  FileText,
  Plus,
  Edit,
  RefreshCw,
  Loader2,
  Search,
  Eye,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAuditLogs,
  useDeletedRecords,
  useRestoreRecord,
  getTableNameArabic,
  getActionArabic,
  type DeletedRecord,
  type AuditLog,
} from '@/hooks/useAuditLogs';

// Field name translations for display
const fieldNameTranslations: Record<string, string> = {
  full_name: 'الاسم الكامل',
  email: 'البريد الإلكتروني',
  phone: 'رقم الهاتف',
  department: 'القسم',
  base_salary: 'الراتب الأساسي',
  salary_type: 'نوع الراتب',
  hire_date: 'تاريخ التعيين',
  is_active: 'نشط',
  work_start_time: 'وقت بدء العمل',
  work_end_time: 'وقت انتهاء العمل',
  break_duration_minutes: 'مدة الاستراحة (دقائق)',
  weekend_days: 'أيام الإجازة الأسبوعية',
  notes: 'ملاحظات',
  address: 'العنوان',
  national_id: 'رقم الهوية',
  currency: 'العملة',
  check_in_time: 'وقت الحضور',
  check_out_time: 'وقت الانصراف',
  status: 'الحالة',
  date: 'التاريخ',
  bonus: 'مكافأة',
  deduction: 'خصم',
  description: 'الوصف',
  month: 'الشهر',
  leave_type: 'نوع الإجازة',
  start_date: 'تاريخ البداية',
  end_date: 'تاريخ النهاية',
  days: 'عدد الأيام',
  reason: 'السبب',
  telegram_chat_id: 'معرف تيليجرام',
  monthly_late_balance_minutes: 'رصيد التأخير الشهري',
};

const History = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const locale = isRTL ? ar : enUS;
  
  const { data: auditLogs, isLoading: logsLoading } = useAuditLogs();
  const { data: deletedRecords, isLoading: deletedLoading } = useDeletedRecords();
  const restoreRecord = useRestoreRecord();
  
  const [selectedRecord, setSelectedRecord] = useState<DeletedRecord | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [deletedSearchQuery, setDeletedSearchQuery] = useState('');

  // Filter audit logs based on search
  const filteredLogs = useMemo(() => {
    if (!auditLogs) return [];
    if (!logSearchQuery.trim()) return auditLogs;
    
    const query = logSearchQuery.toLowerCase();
    return auditLogs.filter(log => 
      log.user_email?.toLowerCase().includes(query) ||
      log.description?.toLowerCase().includes(query) ||
      getTableNameArabic(log.table_name).toLowerCase().includes(query) ||
      getActionArabic(log.action).toLowerCase().includes(query) ||
      JSON.stringify(log.new_data || {}).toLowerCase().includes(query) ||
      JSON.stringify(log.old_data || {}).toLowerCase().includes(query)
    );
  }, [auditLogs, logSearchQuery]);

  // Filter deleted records based on search
  const filteredDeleted = useMemo(() => {
    if (!deletedRecords) return [];
    if (!deletedSearchQuery.trim()) return deletedRecords;
    
    const query = deletedSearchQuery.toLowerCase();
    return deletedRecords.filter(record => 
      getTableNameArabic(record.table_name).toLowerCase().includes(query) ||
      JSON.stringify(record.record_data).toLowerCase().includes(query)
    );
  }, [deletedRecords, deletedSearchQuery]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'insert':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'update':
        return <Edit className="h-4 w-4 text-blue-500" />;
      case 'delete':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'restore':
        return <RefreshCw className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'insert':
        return 'default';
      case 'update':
        return 'secondary';
      case 'delete':
        return 'destructive';
      case 'restore':
        return 'outline';
      default:
        return 'default';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy - HH:mm:ss', { locale });
  };

  const getRecordName = (data: Record<string, unknown> | null): string => {
    if (!data) return '-';
    return (data.full_name as string) || 
           (data.name as string) || 
           (data.description as string) || 
           (data.id as string)?.slice(0, 8) || 
           '-';
  };

  const getFieldDisplayName = (field: string): string => {
    return fieldNameTranslations[field] || field;
  };

  const formatFieldValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const getChangedFields = (oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null) => {
    const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];
    
    if (!oldData && newData) {
      // Insert - show all new data
      Object.entries(newData).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'created_at' && key !== 'updated_at' && key !== 'company_id') {
          changes.push({ field: key, oldValue: null, newValue: value });
        }
      });
    } else if (oldData && newData) {
      // Update - show changed fields
      const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
      allKeys.forEach(key => {
        if (key !== 'id' && key !== 'created_at' && key !== 'updated_at' && key !== 'company_id') {
          const oldVal = oldData[key];
          const newVal = newData[key];
          if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changes.push({ field: key, oldValue: oldVal, newValue: newVal });
          }
        }
      });
    } else if (oldData && !newData) {
      // Delete - show deleted data
      Object.entries(oldData).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'created_at' && key !== 'updated_at' && key !== 'company_id') {
          changes.push({ field: key, oldValue: value, newValue: null });
        }
      });
    }
    
    return changes;
  };

  const handleRestore = async (record: DeletedRecord) => {
    await restoreRecord.mutateAsync(record);
    setSelectedRecord(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <HistoryIcon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isRTL ? 'سجل التعديلات' : 'Activity History'}
            </h1>
            <p className="text-muted-foreground">
              {isRTL
                ? 'تتبع جميع التغييرات واستعادة العناصر المحذوفة'
                : 'Track all changes and restore deleted items'}
            </p>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/20">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'إجمالي التعديلات' : 'Total Changes'}
                </p>
                <p className="text-2xl font-bold">{auditLogs?.length || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-500/20">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'عناصر محذوفة' : 'Deleted Items'}
                </p>
                <p className="text-2xl font-bold">{deletedRecords?.length || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/20">
                <RotateCcw className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'قابلة للاستعادة' : 'Restorable'}
                </p>
                <p className="text-2xl font-bold">
                  {deletedRecords?.filter((r) => !r.is_restored).length || 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="history" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="history" className="gap-2">
                <Clock className="h-4 w-4" />
                {isRTL ? 'سجل التعديلات' : 'Change Log'}
              </TabsTrigger>
              <TabsTrigger value="deleted" className="gap-2">
                <Trash2 className="h-4 w-4" />
                {isRTL ? 'المحذوفات' : 'Deleted Items'}
              </TabsTrigger>
            </TabsList>

            {/* History Tab */}
            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      {isRTL ? 'آخر التعديلات' : 'Recent Changes'}
                    </CardTitle>
                    <div className="relative w-full md:w-80">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={isRTL ? 'بحث في التعديلات...' : 'Search changes...'}
                        value={logSearchQuery}
                        onChange={(e) => setLogSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {logsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : !filteredLogs?.length ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <HistoryIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{logSearchQuery ? (isRTL ? 'لا توجد نتائج للبحث' : 'No search results') : (isRTL ? 'لا توجد تعديلات مسجلة' : 'No changes recorded')}</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{isRTL ? 'الإجراء' : 'Action'}</TableHead>
                            <TableHead>{isRTL ? 'الجدول' : 'Table'}</TableHead>
                            <TableHead>{isRTL ? 'التفاصيل' : 'Details'}</TableHead>
                            <TableHead>{isRTL ? 'المستخدم' : 'User'}</TableHead>
                            <TableHead>{isRTL ? 'التاريخ والوقت' : 'Date & Time'}</TableHead>
                            <TableHead>{isRTL ? 'عرض' : 'View'}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence>
                            {filteredLogs.map((log, index) => (
                              <motion.tr
                                key={log.id}
                                initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="group hover:bg-muted/50 cursor-pointer"
                                onClick={() => setSelectedLog(log)}
                              >
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {getActionIcon(log.action)}
                                    <Badge variant={getActionBadgeVariant(log.action)}>
                                      {getActionArabic(log.action)}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {getTableNameArabic(log.table_name)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {log.description || getRecordName(log.new_data || log.old_data)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{log.user_email || '-'}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    {formatDateTime(log.created_at)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="gap-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLog(log);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Deleted Items Tab */}
            <TabsContent value="deleted" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="flex items-center gap-2">
                      <Trash2 className="h-5 w-5" />
                      {isRTL ? 'العناصر المحذوفة' : 'Deleted Items'}
                    </CardTitle>
                    <div className="relative w-full md:w-80">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={isRTL ? 'بحث في المحذوفات...' : 'Search deleted items...'}
                        value={deletedSearchQuery}
                        onChange={(e) => setDeletedSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {deletedLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : !filteredDeleted?.length ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{deletedSearchQuery ? (isRTL ? 'لا توجد نتائج للبحث' : 'No search results') : (isRTL ? 'لا توجد عناصر محذوفة' : 'No deleted items')}</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{isRTL ? 'الجدول' : 'Table'}</TableHead>
                            <TableHead>{isRTL ? 'البيانات' : 'Data'}</TableHead>
                            <TableHead>{isRTL ? 'تاريخ الحذف' : 'Deleted At'}</TableHead>
                            <TableHead>{isRTL ? 'إجراءات' : 'Actions'}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence>
                            {filteredDeleted.map((record, index) => (
                              <motion.tr
                                key={record.id}
                                initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="group hover:bg-muted/50"
                              >
                                <TableCell>
                                  <Badge variant="outline">
                                    {getTableNameArabic(record.table_name)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="max-w-xs">
                                    <p className="font-medium truncate">
                                      {getRecordName(record.record_data)}
                                    </p>
                                    {record.record_data.email && (
                                      <p className="text-sm text-muted-foreground truncate">
                                        {record.record_data.email as string}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    {formatDateTime(record.deleted_at)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-2"
                                        onClick={() => setSelectedRecord(record)}
                                      >
                                        <RotateCcw className="h-4 w-4" />
                                        {isRTL ? 'استعادة' : 'Restore'}
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          {isRTL ? 'تأكيد الاستعادة' : 'Confirm Restore'}
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          {isRTL
                                            ? `هل تريد استعادة "${getRecordName(record.record_data)}" إلى ${getTableNameArabic(record.table_name)}؟`
                                            : `Do you want to restore "${getRecordName(record.record_data)}" to ${record.table_name}?`}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          {isRTL ? 'إلغاء' : 'Cancel'}
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleRestore(record)}
                                          disabled={restoreRecord.isPending}
                                        >
                                          {restoreRecord.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <>
                                              <RotateCcw className="h-4 w-4 mr-2" />
                                              {isRTL ? 'استعادة' : 'Restore'}
                                            </>
                                          )}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </TableCell>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Log Details Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {selectedLog && getActionIcon(selectedLog.action)}
                <span>{isRTL ? 'تفاصيل التعديل' : 'Change Details'}</span>
              </DialogTitle>
            </DialogHeader>
            
            {selectedLog && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm text-muted-foreground">{isRTL ? 'نوع الإجراء' : 'Action Type'}</p>
                    <Badge variant={getActionBadgeVariant(selectedLog.action)} className="mt-1">
                      {getActionArabic(selectedLog.action)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{isRTL ? 'الجدول' : 'Table'}</p>
                    <Badge variant="outline" className="mt-1">
                      {getTableNameArabic(selectedLog.table_name)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{isRTL ? 'المستخدم' : 'User'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{selectedLog.user_email || '-'}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{isRTL ? 'التاريخ والوقت' : 'Date & Time'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{formatDateTime(selectedLog.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedLog.description && (
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-2">{isRTL ? 'الوصف' : 'Description'}</p>
                    <p className="font-medium">{selectedLog.description}</p>
                  </div>
                )}

                {/* Changes */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {isRTL ? 'التغييرات التفصيلية' : 'Detailed Changes'}
                  </h4>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-1/3">{isRTL ? 'الحقل' : 'Field'}</TableHead>
                          <TableHead className="w-1/3">{isRTL ? 'القيمة السابقة' : 'Old Value'}</TableHead>
                          <TableHead className="w-1/12 text-center"></TableHead>
                          <TableHead className="w-1/3">{isRTL ? 'القيمة الجديدة' : 'New Value'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getChangedFields(selectedLog.old_data, selectedLog.new_data).map((change, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {getFieldDisplayName(change.field)}
                            </TableCell>
                            <TableCell className={change.oldValue !== null ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20' : 'text-muted-foreground'}>
                              {formatFieldValue(change.oldValue)}
                            </TableCell>
                            <TableCell className="text-center">
                              {isRTL ? <ArrowLeft className="h-4 w-4 mx-auto text-muted-foreground" /> : <ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" />}
                            </TableCell>
                            <TableCell className={change.newValue !== null ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20' : 'text-muted-foreground'}>
                              {formatFieldValue(change.newValue)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {getChangedFields(selectedLog.old_data, selectedLog.new_data).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              {isRTL ? 'لا توجد تفاصيل إضافية' : 'No additional details'}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default History;
