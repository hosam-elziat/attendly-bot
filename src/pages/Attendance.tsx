import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAttendance, useAttendanceStats } from '@/hooks/useAttendance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Clock, LogIn, LogOut, Coffee, Loader2, Edit, Plus, Calendar, Search, Trash2 } from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import EditAttendanceDialog from '@/components/attendance/EditAttendanceDialog';
import AddAttendanceDialog from '@/components/attendance/AddAttendanceDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

const Attendance = () => {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: stats } = useAttendanceStats();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dateFilter, setDateFilter] = useState('today');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');

  // Fetch all attendance based on date filter
  // For "today" filter, also include yesterday's records that are still active (night shifts)
  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ['attendance-all', profile?.company_id, dateFilter],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      let startDate: Date;
      let endDate: Date = today;
      
      switch (dateFilter) {
        case 'yesterday':
          startDate = subDays(today, 1);
          endDate = subDays(today, 1);
          break;
        case 'week':
          startDate = startOfWeek(today, { weekStartsOn: 0 });
          break;
        case 'month':
          startDate = startOfMonth(today);
          break;
        case 'today':
        default:
          startDate = today;
          break;
      }
      
      // For today filter, also fetch yesterday's active records (night shifts)
      if (dateFilter === 'today') {
        const [todayData, yesterdayActiveData] = await Promise.all([
          supabase
            .from('attendance_logs')
            .select(`
              *,
              employees (
                full_name,
                email
              )
            `)
            .eq('company_id', profile.company_id)
            .eq('date', todayStr)
            .order('check_in_time', { ascending: false }),
          supabase
            .from('attendance_logs')
            .select(`
              *,
              employees (
                full_name,
                email
              )
            `)
            .eq('company_id', profile.company_id)
            .eq('date', yesterdayStr)
            .in('status', ['checked_in', 'on_break'])
            .order('check_in_time', { ascending: false }),
        ]);

        if (todayData.error) throw todayData.error;
        if (yesterdayActiveData.error) throw yesterdayActiveData.error;

        // Mark yesterday's records as night shift
        const markedYesterdayData = (yesterdayActiveData.data || []).map(record => ({
          ...record,
          isNightShift: true,
        }));

        return [...(todayData.data || []), ...markedYesterdayData];
      }
      
      const { data, error } = await supabase
        .from('attendance_logs')
        .select(`
          *,
          employees (
            full_name,
            email
          )
        `)
        .eq('company_id', profile.company_id)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: false })
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  // Filter by status and search
  const filteredAttendance = useMemo(() => {
    return attendance.filter((record: any) => {
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
      const matchesSearch = !searchQuery || 
        record.employees?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [attendance, statusFilter, searchQuery]);

  const handleEditClick = (record: any) => {
    setSelectedRecord(record);
    setEditDialogOpen(true);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['attendance-all'] });
    queryClient.invalidateQueries({ queryKey: ['attendance'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
    queryClient.invalidateQueries({ queryKey: ['salary-adjustments'] });
    queryClient.invalidateQueries({ queryKey: ['employee-adjustments'] });
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId || !profile?.company_id) return;
    
    setDeleting(true);
    try {
      // First, delete any linked salary adjustments (soft delete via deleted_records table)
      const { data: linkedAdjustments } = await supabase
        .from('salary_adjustments')
        .select('id')
        .eq('attendance_log_id', deleteId);
      
      if (linkedAdjustments && linkedAdjustments.length > 0) {
        // Delete linked salary adjustments
        await supabase
          .from('salary_adjustments')
          .delete()
          .eq('attendance_log_id', deleteId);
      }

      // Get attendance record for logging
      const { data: recordToDelete } = await supabase
        .from('attendance_logs')
        .select('*, employees(full_name)')
        .eq('id', deleteId)
        .single();

      // Save to deleted_records for potential recovery
      if (recordToDelete) {
        await supabase.from('deleted_records').insert({
          company_id: profile.company_id,
          table_name: 'attendance_logs',
          record_id: deleteId,
          record_data: recordToDelete,
          deleted_by: profile.user_id,
        });
      }

      // Delete the attendance record
      const { error } = await supabase
        .from('attendance_logs')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      toast.success(language === 'ar' ? 'تم حذف سجل الحضور بنجاح' : 'Attendance record deleted');
      handleSuccess();
    } catch (error) {
      console.error('Error deleting attendance:', error);
      toast.error(language === 'ar' ? 'فشل في حذف سجل الحضور' : 'Failed to delete attendance');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteId(null);
    }
  };

  const getStatusBadge = (status: string, isNightShift?: boolean) => {
    const nightShiftLabel = isNightShift ? (
      <span className="ms-1 text-xs text-muted-foreground">
        ({language === 'ar' ? 'وردية ليلية' : 'Night'})
      </span>
    ) : null;

    switch (status) {
      case 'checked_in':
        return (
          <div className="flex items-center gap-1">
            <Badge className="bg-success hover:bg-success/90">{t('attendance.present')}</Badge>
            {nightShiftLabel}
          </div>
        );
      case 'on_break':
        return (
          <div className="flex items-center gap-1">
            <Badge variant="secondary">{t('attendance.onBreak')}</Badge>
            {nightShiftLabel}
          </div>
        );
      case 'checked_out':
        return <Badge variant="outline">{t('attendance.left')}</Badge>;
      case 'absent':
        return <Badge variant="destructive">{language === 'ar' ? 'غائب' : 'Absent'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '—';
    return format(new Date(timestamp), 'hh:mm a');
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'EEE, d MMM', { locale: language === 'ar' ? ar : undefined });
  };

  const statCards = [
    { icon: LogIn, label: t('attendance.checkedIn'), value: stats?.present ?? 0, color: 'text-success' },
    { icon: LogOut, label: t('attendance.checkedOut'), value: stats?.checkedOut ?? 0, color: 'text-muted-foreground' },
    { icon: Coffee, label: t('attendance.onBreak'), value: stats?.onBreak ?? 0, color: 'text-warning' },
    { icon: Clock, label: t('attendance.totalEmployees'), value: stats?.totalEmployees ?? 0, color: 'text-primary' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold text-foreground">{t('nav.attendance')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('attendance.trackDaily')}
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="card-hover">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-accent flex items-center justify-center">
                      <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-xl sm:text-2xl font-bold text-foreground">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>


        {/* Filters & Add Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={language === 'ar' ? 'بحث عن موظف...' : 'Search employee...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ps-9"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder={t('attendance.selectDate')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">{t('attendance.today')}</SelectItem>
                      <SelectItem value="yesterday">{t('attendance.yesterday')}</SelectItem>
                      <SelectItem value="week">{t('attendance.thisWeek')}</SelectItem>
                      <SelectItem value="month">{t('attendance.thisMonth')}</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder={t('attendance.filterStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('attendance.allStatus')}</SelectItem>
                      <SelectItem value="checked_in">{t('attendance.present')}</SelectItem>
                      <SelectItem value="on_break">{t('attendance.onBreak')}</SelectItem>
                      <SelectItem value="checked_out">{t('attendance.left')}</SelectItem>
                      <SelectItem value="absent">{language === 'ar' ? 'غائب' : 'Absent'}</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button onClick={() => setAddDialogOpen(true)} className="gap-2 sm:ms-auto">
                    <Plus className="w-4 h-4" />
                    {language === 'ar' ? 'إضافة حضور' : 'Add Attendance'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Attendance Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                {language === 'ar' ? 'سجلات الحضور' : 'Attendance Records'}
                <Badge variant="secondary" className="ms-2">{filteredAttendance.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredAttendance.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">{t('attendance.noRecords')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('attendance.noRecordsDesc')}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('attendance.employee')}</TableHead>
                        <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                        <TableHead>{t('attendance.checkIn')}</TableHead>
                        <TableHead>{t('attendance.checkOut')}</TableHead>
                        <TableHead>{t('employees.status')}</TableHead>
                        <TableHead>{t('common.actions') || 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAttendance.map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-accent flex items-center justify-center">
                                <span className="text-xs font-medium text-accent-foreground">
                                  {record.employees?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'U'}
                                </span>
                              </div>
                              <span className="font-medium text-foreground text-sm">
                                {record.employees?.full_name || t('common.unknown')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(record.date)}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatTime(record.check_in_time)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatTime(record.check_out_time)}
                          </TableCell>
                          <TableCell>{getStatusBadge(record.status, record.isNightShift)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClick(record)}
                                className="text-primary hover:text-primary/80 h-8 w-8 p-0"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(record.id)}
                                className="text-destructive hover:text-destructive/80 h-8 w-8 p-0"
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
        </motion.div>
      </div>

      <EditAttendanceDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        record={selectedRecord}
        onSuccess={handleSuccess}
      />

      <AddAttendanceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'حذف سجل الحضور' : 'Delete Attendance Record'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' 
                ? 'هل أنت متأكد من حذف هذا السجل؟ سيتم حذف أي خصومات تلقائية مرتبطة به. يمكن استرجاع السجل لاحقاً من سجل المحذوفات.'
                : 'Are you sure you want to delete this record? Any linked automatic deductions will also be removed. The record can be recovered later from the deleted records log.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {language === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Attendance;