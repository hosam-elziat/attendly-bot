import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAuditLogs,
  useDeletedRecords,
  useRestoreRecord,
  getTableNameArabic,
  getActionArabic,
  type DeletedRecord,
} from '@/hooks/useAuditLogs';

const History = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const locale = isRTL ? ar : enUS;
  
  const { data: auditLogs, isLoading: logsLoading } = useAuditLogs();
  const { data: deletedRecords, isLoading: deletedLoading } = useDeletedRecords();
  const restoreRecord = useRestoreRecord();
  
  const [selectedRecord, setSelectedRecord] = useState<DeletedRecord | null>(null);

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
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {isRTL ? 'آخر التعديلات' : 'Recent Changes'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {logsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : !auditLogs?.length ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <HistoryIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{isRTL ? 'لا توجد تعديلات مسجلة' : 'No changes recorded'}</p>
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
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence>
                            {auditLogs.map((log, index) => (
                              <motion.tr
                                key={log.id}
                                initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="group hover:bg-muted/50"
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
                  <CardTitle className="flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />
                    {isRTL ? 'العناصر المحذوفة' : 'Deleted Items'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {deletedLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : !deletedRecords?.length ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{isRTL ? 'لا توجد عناصر محذوفة' : 'No deleted items'}</p>
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
                            {deletedRecords.map((record, index) => (
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
      </div>
    </DashboardLayout>
  );
};

export default History;
