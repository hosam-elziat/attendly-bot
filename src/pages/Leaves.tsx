import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLeaveRequests, useUpdateLeaveRequest } from '@/hooks/useLeaveRequests';
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
import { Calendar, Check, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const Leaves = () => {
  const { t } = useLanguage();
  const { data: leaveRequests = [], isLoading } = useLeaveRequests();
  const updateLeave = useUpdateLeaveRequest();

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'vacation':
        return <Badge className="bg-primary hover:bg-primary/90">{t('leaves.vacation')}</Badge>;
      case 'sick':
        return <Badge className="bg-warning hover:bg-warning/90">{t('leaves.sick')}</Badge>;
      case 'personal':
        return <Badge variant="secondary">{t('leaves.personal')}</Badge>;
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

  const handleApprove = async (id: string) => {
    await updateLeave.mutateAsync({ id, status: 'approved' });
  };

  const handleReject = async (id: string) => {
    await updateLeave.mutateAsync({ id, status: 'rejected' });
  };

  const pendingCount = leaveRequests.filter(l => l.status === 'pending').length;
  const approvedCount = leaveRequests.filter(l => l.status === 'approved').length;
  const rejectedCount = leaveRequests.filter(l => l.status === 'rejected').length;

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
          {pendingCount > 0 && (
            <Badge variant="outline" className="text-warning border-warning">
              {pendingCount} {pendingCount > 1 ? t('leaves.pendingRequests') : t('leaves.pendingRequest')}
            </Badge>
          )}
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

        {/* Requests Table */}
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
                        {leave.status === 'pending' && (
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-success hover:text-success hover:bg-success/10"
                              onClick={() => handleApprove(leave.id)}
                              disabled={updateLeave.isPending}
                            >
                              <Check className="w-4 h-4 me-1" />
                              {t('leaves.approved')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleReject(leave.id)}
                              disabled={updateLeave.isPending}
                            >
                              <X className="w-4 h-4 me-1" />
                              {t('leaves.rejected')}
                            </Button>
                          </div>
                        )}
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
                          {leave.status === 'pending' && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-success hover:text-success hover:bg-success/10"
                                onClick={() => handleApprove(leave.id)}
                                disabled={updateLeave.isPending}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleReject(leave.id)}
                                disabled={updateLeave.isPending}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
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
      </div>
    </DashboardLayout>
  );
};

export default Leaves;
