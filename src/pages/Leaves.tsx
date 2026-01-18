import { useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLeaveRequests, useUpdateLeaveRequest, useDeleteLeaveRequest, LeaveRequest } from '@/hooks/useLeaveRequests';
import { useScheduledLeaves, useDeleteScheduledLeave, ScheduledLeave } from '@/hooks/useScheduledLeaves';
import { useEmployees } from '@/hooks/useEmployees';
import { usePositions } from '@/hooks/usePositions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CreateScheduledLeaveDialog from '@/components/attendance/CreateScheduledLeaveDialog';
import { Calendar, Check, X, Loader2, Trash2, RotateCcw, CalendarPlus, Users, Briefcase, User } from 'lucide-react';
import { format } from 'date-fns';

const Leaves = () => {
  const { t, language } = useLanguage();
  const [scheduledLeaveDialogOpen, setScheduledLeaveDialogOpen] = useState(false);
  
  const { data: leaveRequests = [], isLoading } = useLeaveRequests();
  const { data: scheduledLeaves = [], isLoading: scheduledLoading } = useScheduledLeaves();
  const { data: employees = [] } = useEmployees();
  const { data: positions = [] } = usePositions();
  const updateLeave = useUpdateLeaveRequest();
  const deleteLeave = useDeleteLeaveRequest();
  const deleteScheduledLeave = useDeleteScheduledLeave();

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'vacation':
        return <Badge className="bg-primary hover:bg-primary/90">{t('leaves.vacation')}</Badge>;
      case 'sick':
        return <Badge className="bg-warning hover:bg-warning/90">{t('leaves.sick')}</Badge>;
      case 'personal':
        return <Badge variant="secondary">{t('leaves.personal')}</Badge>;
      case 'emergency':
        return <Badge className="bg-destructive hover:bg-destructive/90">{language === 'ar' ? 'طارئة' : 'Emergency'}</Badge>;
      case 'regular':
        return <Badge className="bg-accent hover:bg-accent/90">{language === 'ar' ? 'اعتيادية' : 'Regular'}</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success hover:bg-success/90">{t('leaves.approved')}</Badge>;
      case 'rejected':
        return <Badge variant="destructive">{t('leaves.rejected')}</Badge>;
      case 'pending':
        return <Badge variant="outline">{t('leaves.pending')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleStatusChange = async (leave: LeaveRequest, newStatus: 'approved' | 'rejected') => {
    await updateLeave.mutateAsync({ 
      id: leave.id, 
      status: newStatus, 
      oldData: leave,
      previousStatus: leave.status 
    });
  };

  const handleDelete = async (leave: LeaveRequest) => {
    await deleteLeave.mutateAsync({ id: leave.id, leaveData: leave });
  };

  const pendingCount = leaveRequests.filter(l => l.status === 'pending').length;
  const approvedCount = leaveRequests.filter(l => l.status === 'approved').length;
  const rejectedCount = leaveRequests.filter(l => l.status === 'rejected').length;

  const getTargetName = (leave: ScheduledLeave) => {
    if (leave.target_type === 'company') {
      return language === 'ar' ? 'الشركة كلها' : 'Entire Company';
    } else if (leave.target_type === 'position' && leave.target_id) {
      const position = positions.find(p => p.id === leave.target_id);
      return position ? (language === 'ar' ? (position.title_ar || position.title) : position.title) : '—';
    } else if (leave.target_type === 'employee' && leave.target_id) {
      const employee = employees.find(e => e.id === leave.target_id);
      return employee?.full_name || '—';
    }
    return '—';
  };

  const getTargetTypeBadge = (type: string) => {
    switch (type) {
      case 'company':
        return <Badge className="bg-primary hover:bg-primary/90"><Users className="w-3 h-3 me-1" />{language === 'ar' ? 'الشركة' : 'Company'}</Badge>;
      case 'position':
        return <Badge className="bg-accent hover:bg-accent/90"><Briefcase className="w-3 h-3 me-1" />{language === 'ar' ? 'منصب' : 'Position'}</Badge>;
      case 'employee':
        return <Badge variant="secondary"><User className="w-3 h-3 me-1" />{language === 'ar' ? 'موظف' : 'Employee'}</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const handleDeleteScheduledLeave = async (id: string) => {
    await deleteScheduledLeave.mutateAsync(id);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('nav.leaves')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('leaves.manage')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Badge variant="outline" className="text-warning border-warning">
                {pendingCount} {pendingCount > 1 ? t('leaves.pendingRequests') : t('leaves.pendingRequest')}
              </Badge>
            )}
            <Button onClick={() => setScheduledLeaveDialogOpen(true)} size="sm">
              <CalendarPlus className="w-4 h-4 me-2" />
              {language === 'ar' ? 'إجازة مجدولة' : 'Scheduled Leave'}
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-3">
          {[
            { label: t('leaves.pending'), value: pendingCount, color: 'text-warning' },
            { label: t('leaves.approved'), value: approvedCount, color: 'text-success' },
            { label: t('leaves.rejected'), value: rejectedCount, color: 'text-destructive' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="card-hover">
                <CardContent className="p-3 sm:pt-6 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                    <p className={`text-xl sm:text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tabs for Leave Requests and Scheduled Leaves */}
        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="requests">
              <Calendar className="w-4 h-4 me-2" />
              {language === 'ar' ? 'طلبات الإجازة' : 'Leave Requests'}
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              <CalendarPlus className="w-4 h-4 me-2" />
              {language === 'ar' ? 'الإجازات المجدولة' : 'Scheduled Leaves'}
              {scheduledLeaves.length > 0 && (
                <Badge variant="secondary" className="ms-2">{scheduledLeaves.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Leave Requests Tab */}
          <TabsContent value="requests">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              data-tour="leaves-section"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    {t('nav.leaves')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : leaveRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                      <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/50 mb-4" />
                      <h3 className="text-base sm:text-lg font-medium text-foreground mb-1">{t('leaves.noRequests')}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {t('leaves.noRequestsDesc')}
                      </p>
                    </div>
                  ) : (
                    <>
                    {/* Mobile Cards View */}
                    <div className="block sm:hidden p-3 space-y-3">
                      {leaveRequests.map((leave) => (
                        <Card key={leave.id}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                                  <span className="text-xs font-medium text-accent-foreground">
                                    {leave.employees?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                                  </span>
                                </div>
                                <span className="font-medium text-foreground text-sm">
                                  {leave.employees?.full_name || t('common.unknown')}
                                </span>
                              </div>
                              {getStatusBadge(leave.status)}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
                              {getTypeBadge(leave.leave_type)}
                              <span className="text-muted-foreground">
                                {format(new Date(leave.start_date), 'MMM d')} - {format(new Date(leave.end_date), 'MMM d')}
                              </span>
                              <span className="text-muted-foreground">
                                ({leave.days} {leave.days > 1 ? t('leaves.days') : t('leaves.day')})
                              </span>
                            </div>
                            {leave.reason && (
                              <p className="text-xs text-muted-foreground truncate mb-2">{leave.reason}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {leave.status !== 'approved' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 text-success hover:text-success hover:bg-success/10"
                                  onClick={() => handleStatusChange(leave, 'approved')}
                                  disabled={updateLeave.isPending || deleteLeave.isPending}
                                >
                                  <Check className="w-4 h-4 me-1" />
                                  {t('leaves.approved')}
                                </Button>
                              )}
                              {leave.status !== 'rejected' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleStatusChange(leave, 'rejected')}
                                  disabled={updateLeave.isPending || deleteLeave.isPending}
                                >
                                  <X className="w-4 h-4 me-1" />
                                  {t('leaves.rejected')}
                                </Button>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    disabled={updateLeave.isPending || deleteLeave.isPending}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{language === 'ar' ? 'حذف طلب الإجازة' : 'Delete Leave Request'}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {language === 'ar' 
                                        ? 'هل أنت متأكد من حذف هذا الطلب؟ سيتم استعادة رصيد الإجازات إذا كانت الإجازة معتمدة.'
                                        : 'Are you sure you want to delete this request? Leave balance will be restored if approved.'}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDelete(leave)}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      {language === 'ar' ? 'حذف' : 'Delete'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    {/* Desktop Table View */}
                    <Table className="hidden sm:table">
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('leaves.employee')}</TableHead>
                          <TableHead>{t('leaves.type')}</TableHead>
                          <TableHead>{t('leaves.duration')}</TableHead>
                          <TableHead>{t('leaves.reason')}</TableHead>
                          <TableHead>{t('employees.status')}</TableHead>
                          <TableHead className="text-end">{t('leaves.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaveRequests.map((leave) => (
                          <TableRow key={leave.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
                                  <span className="text-xs font-medium text-accent-foreground">
                                    {leave.employees?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                                  </span>
                                </div>
                                <span className="font-medium text-foreground">
                                  {leave.employees?.full_name || t('common.unknown')}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{getTypeBadge(leave.leave_type)}</TableCell>
                            <TableCell>
                              <div>
                                <p className="text-foreground">
                                  {format(new Date(leave.start_date), 'MMM d')} - {format(new Date(leave.end_date), 'MMM d')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {leave.days} {leave.days > 1 ? t('leaves.days') : t('leaves.day')}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[200px] truncate">
                              {leave.reason || '—'}
                            </TableCell>
                            <TableCell>{getStatusBadge(leave.status)}</TableCell>
                            <TableCell className="text-end">
                              <div className="flex items-center justify-end gap-2">
                                {leave.status !== 'approved' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-success hover:text-success hover:bg-success/10"
                                    onClick={() => handleStatusChange(leave, 'approved')}
                                    disabled={updateLeave.isPending || deleteLeave.isPending}
                                    title={language === 'ar' ? 'موافقة' : 'Approve'}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                )}
                                {leave.status !== 'rejected' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleStatusChange(leave, 'rejected')}
                                    disabled={updateLeave.isPending || deleteLeave.isPending}
                                    title={language === 'ar' ? 'رفض' : 'Reject'}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                )}
                                {leave.status === 'approved' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-warning hover:text-warning hover:bg-warning/10"
                                    onClick={() => handleStatusChange(leave, 'rejected')}
                                    disabled={updateLeave.isPending || deleteLeave.isPending}
                                    title={language === 'ar' ? 'إلغاء الموافقة' : 'Revoke'}
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </Button>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                      disabled={updateLeave.isPending || deleteLeave.isPending}
                                      title={language === 'ar' ? 'حذف' : 'Delete'}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>{language === 'ar' ? 'حذف طلب الإجازة' : 'Delete Leave Request'}</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {language === 'ar' 
                                          ? 'هل أنت متأكد من حذف هذا الطلب؟ سيتم استعادة رصيد الإجازات إذا كانت الإجازة معتمدة.'
                                          : 'Are you sure you want to delete this request? Leave balance will be restored if approved.'}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDelete(leave)}
                                        className="bg-destructive hover:bg-destructive/90"
                                      >
                                        {language === 'ar' ? 'حذف' : 'Delete'}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Scheduled Leaves Tab */}
          <TabsContent value="scheduled">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarPlus className="w-5 h-5 text-primary" />
                    {language === 'ar' ? 'الإجازات المجدولة' : 'Scheduled Leaves'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {scheduledLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : scheduledLeaves.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                      <CalendarPlus className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/50 mb-4" />
                      <h3 className="text-base sm:text-lg font-medium text-foreground mb-1">
                        {language === 'ar' ? 'لا توجد إجازات مجدولة' : 'No scheduled leaves'}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                        {language === 'ar' ? 'يمكنك إنشاء إجازة مجدولة للشركة أو لمنصب أو موظف معين' : 'Create scheduled leaves for company, position, or specific employees'}
                      </p>
                      <Button onClick={() => setScheduledLeaveDialogOpen(true)}>
                        <CalendarPlus className="w-4 h-4 me-2" />
                        {language === 'ar' ? 'إنشاء إجازة' : 'Create Leave'}
                      </Button>
                    </div>
                  ) : (
                    <>
                    {/* Mobile Cards View */}
                    <div className="block sm:hidden p-3 space-y-3">
                      {scheduledLeaves.map((leave) => (
                        <Card key={leave.id}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-foreground text-sm">{leave.leave_name}</span>
                              {getTargetTypeBadge(leave.target_type)}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
                              <span className="text-muted-foreground">
                                {format(new Date(leave.leave_date), 'MMM d, yyyy')}
                                {leave.end_date && leave.end_date !== leave.leave_date && (
                                  <> - {format(new Date(leave.end_date), 'MMM d, yyyy')}</>
                                )}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {language === 'ar' ? 'الهدف: ' : 'Target: '}{getTargetName(leave)}
                            </p>
                            {leave.reason && (
                              <p className="text-xs text-muted-foreground truncate mb-2">{leave.reason}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    disabled={deleteScheduledLeave.isPending}
                                  >
                                    <Trash2 className="w-4 h-4 me-1" />
                                    {language === 'ar' ? 'حذف' : 'Delete'}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{language === 'ar' ? 'حذف الإجازة المجدولة' : 'Delete Scheduled Leave'}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {language === 'ar' 
                                        ? 'هل أنت متأكد من حذف هذه الإجازة؟'
                                        : 'Are you sure you want to delete this scheduled leave?'}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDeleteScheduledLeave(leave.id)}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      {language === 'ar' ? 'حذف' : 'Delete'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    {/* Desktop Table View */}
                    <Table className="hidden sm:table">
                      <TableHeader>
                        <TableRow>
                          <TableHead>{language === 'ar' ? 'اسم الإجازة' : 'Leave Name'}</TableHead>
                          <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                          <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                          <TableHead>{language === 'ar' ? 'الهدف' : 'Target'}</TableHead>
                          <TableHead>{language === 'ar' ? 'أنشأها' : 'Created By'}</TableHead>
                          <TableHead className="text-end">{t('leaves.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scheduledLeaves.map((leave) => (
                          <TableRow key={leave.id}>
                            <TableCell className="font-medium">{leave.leave_name}</TableCell>
                            <TableCell>
                              <div>
                                <p className="text-foreground">
                                  {format(new Date(leave.leave_date), 'MMM d, yyyy')}
                                </p>
                                {leave.end_date && leave.end_date !== leave.leave_date && (
                                  <p className="text-xs text-muted-foreground">
                                    {language === 'ar' ? 'إلى' : 'to'} {format(new Date(leave.end_date), 'MMM d, yyyy')}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{getTargetTypeBadge(leave.target_type)}</TableCell>
                            <TableCell className="text-muted-foreground">{getTargetName(leave)}</TableCell>
                            <TableCell className="text-muted-foreground">{leave.created_by_name || '—'}</TableCell>
                            <TableCell className="text-end">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    disabled={deleteScheduledLeave.isPending}
                                    title={language === 'ar' ? 'حذف' : 'Delete'}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{language === 'ar' ? 'حذف الإجازة المجدولة' : 'Delete Scheduled Leave'}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {language === 'ar' 
                                        ? 'هل أنت متأكد من حذف هذه الإجازة؟'
                                        : 'Are you sure you want to delete this scheduled leave?'}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDeleteScheduledLeave(leave.id)}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      {language === 'ar' ? 'حذف' : 'Delete'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        <CreateScheduledLeaveDialog 
          open={scheduledLeaveDialogOpen} 
          onOpenChange={setScheduledLeaveDialogOpen} 
        />
      </div>
    </DashboardLayout>
  );
};

export default Leaves;
