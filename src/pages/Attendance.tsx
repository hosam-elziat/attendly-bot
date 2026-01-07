import { useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAttendance, useAttendanceStats } from '@/hooks/useAttendance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Clock, LogIn, LogOut, Coffee, Loader2, Edit, Plus } from 'lucide-react';
import { format } from 'date-fns';
import EditAttendanceDialog from '@/components/attendance/EditAttendanceDialog';
import AddAttendanceDialog from '@/components/attendance/AddAttendanceDialog';

import { useQueryClient } from '@tanstack/react-query';

const Attendance = () => {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const { data: attendance = [], isLoading } = useAttendance();
  const { data: stats } = useAttendanceStats();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  const handleEditClick = (record: any) => {
    setSelectedRecord(record);
    setEditDialogOpen(true);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['attendance'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'checked_in':
        return <Badge className="bg-success hover:bg-success/90">{t('attendance.present')}</Badge>;
      case 'on_break':
        return <Badge variant="secondary">{t('attendance.onBreak')}</Badge>;
      case 'checked_out':
        return <Badge variant="outline">{t('attendance.left')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '—';
    return format(new Date(timestamp), 'hh:mm a');
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="card-hover">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center">
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>


        {/* Date Filter & Add Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Select defaultValue="today">
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder={t('attendance.selectDate')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">{t('attendance.today')}</SelectItem>
                      <SelectItem value="yesterday">{t('attendance.yesterday')}</SelectItem>
                      <SelectItem value="week">{t('attendance.thisWeek')}</SelectItem>
                      <SelectItem value="month">{t('attendance.thisMonth')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder={t('attendance.filterStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('attendance.allStatus')}</SelectItem>
                      <SelectItem value="checked_in">{t('attendance.present')}</SelectItem>
                      <SelectItem value="on_break">{t('attendance.onBreak')}</SelectItem>
                      <SelectItem value="checked_out">{t('attendance.left')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  {language === 'ar' ? 'إضافة حضور' : 'Add Attendance'}
                </Button>
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
                {t('attendance.todayAttendance')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : attendance.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">{t('attendance.noRecords')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('attendance.noRecordsDesc')}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('attendance.employee')}</TableHead>
                      <TableHead>{t('attendance.checkIn')}</TableHead>
                      <TableHead>{t('attendance.checkOut')}</TableHead>
                      <TableHead>{t('employees.status')}</TableHead>
                      <TableHead>{t('common.actions') || 'الإجراءات'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
                              <span className="text-xs font-medium text-accent-foreground">
                                {record.employees?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                              </span>
                            </div>
                            <span className="font-medium text-foreground">
                              {record.employees?.full_name || t('common.unknown')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatTime(record.check_in_time)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatTime(record.check_out_time)}
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(record)}
                            className="text-primary hover:text-primary/80"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
    </DashboardLayout>
  );
};

export default Attendance;
