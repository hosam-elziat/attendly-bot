import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Clock, LogIn, LogOut, Coffee } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  name: string;
  checkIn: string;
  checkOut: string | null;
  breakDuration: string;
  totalHours: string;
  status: 'present' | 'late' | 'on_break' | 'left';
}

const mockAttendance: AttendanceRecord[] = [
  { id: '1', name: 'Sarah Johnson', checkIn: '08:30 AM', checkOut: null, breakDuration: '30 min', totalHours: '4h 30m', status: 'present' },
  { id: '2', name: 'Ahmed Hassan', checkIn: '08:45 AM', checkOut: null, breakDuration: '15 min', totalHours: '4h 15m', status: 'on_break' },
  { id: '3', name: 'Emily Chen', checkIn: '09:15 AM', checkOut: null, breakDuration: '0 min', totalHours: '3h 45m', status: 'late' },
  { id: '4', name: 'Michael Brown', checkIn: '08:00 AM', checkOut: '05:00 PM', breakDuration: '60 min', totalHours: '8h 00m', status: 'left' },
  { id: '5', name: 'Fatima Al-Rashid', checkIn: '08:32 AM', checkOut: null, breakDuration: '45 min', totalHours: '4h 28m', status: 'present' },
];

const Attendance = () => {
  const { t } = useLanguage();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-success hover:bg-success/90">Present</Badge>;
      case 'late':
        return <Badge className="bg-warning hover:bg-warning/90">Late</Badge>;
      case 'on_break':
        return <Badge variant="secondary">On Break</Badge>;
      case 'left':
        return <Badge variant="outline">Left</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = [
    { icon: LogIn, label: 'Checked In', value: '24', color: 'text-success' },
    { icon: LogOut, label: 'Checked Out', value: '8', color: 'text-muted-foreground' },
    { icon: Coffee, label: 'On Break', value: '3', color: 'text-warning' },
    { icon: Clock, label: 'Average Hours', value: '7.5h', color: 'text-primary' },
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
            Track daily check-ins, breaks, and working hours
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
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

        {/* Date Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <Select defaultValue="today">
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Select date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="on_break">On Break</SelectItem>
                    <SelectItem value="left">Left</SelectItem>
                  </SelectContent>
                </Select>
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
                Today's Attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Break</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockAttendance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
                            <span className="text-xs font-medium text-accent-foreground">
                              {record.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <span className="font-medium text-foreground">{record.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{record.checkIn}</TableCell>
                      <TableCell className="text-muted-foreground">{record.checkOut || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{record.breakDuration}</TableCell>
                      <TableCell className="font-medium text-foreground">{record.totalHours}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Attendance;
