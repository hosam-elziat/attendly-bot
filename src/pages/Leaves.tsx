import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
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
import { Calendar, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface LeaveRequest {
  id: string;
  name: string;
  type: 'vacation' | 'sick' | 'personal';
  startDate: string;
  endDate: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
}

const mockLeaves: LeaveRequest[] = [
  { id: '1', name: 'Sarah Johnson', type: 'vacation', startDate: 'Jan 15', endDate: 'Jan 20', days: 5, status: 'pending', reason: 'Family vacation' },
  { id: '2', name: 'Ahmed Hassan', type: 'sick', startDate: 'Jan 12', endDate: 'Jan 12', days: 1, status: 'approved', reason: 'Doctor appointment' },
  { id: '3', name: 'Emily Chen', type: 'personal', startDate: 'Jan 18', endDate: 'Jan 18', days: 1, status: 'pending', reason: 'Personal matters' },
  { id: '4', name: 'Michael Brown', type: 'vacation', startDate: 'Jan 25', endDate: 'Jan 30', days: 5, status: 'rejected', reason: 'Travel abroad' },
];

const Leaves = () => {
  const { t } = useLanguage();

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'vacation':
        return <Badge className="bg-primary hover:bg-primary/90">Vacation</Badge>;
      case 'sick':
        return <Badge className="bg-warning hover:bg-warning/90">Sick</Badge>;
      case 'personal':
        return <Badge variant="secondary">Personal</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success hover:bg-success/90">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleApprove = (id: string, name: string) => {
    toast.success(`Leave request for ${name} approved`);
  };

  const handleReject = (id: string, name: string) => {
    toast.error(`Leave request for ${name} rejected`);
  };

  const pendingCount = mockLeaves.filter(l => l.status === 'pending').length;

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
              Review and manage leave requests
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge variant="outline" className="text-warning border-warning">
              {pendingCount} pending request{pendingCount > 1 ? 's' : ''}
            </Badge>
          )}
        </motion.div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Pending', value: pendingCount, color: 'text-warning' },
            { label: 'Approved', value: mockLeaves.filter(l => l.status === 'approved').length, color: 'text-success' },
            { label: 'Rejected', value: mockLeaves.filter(l => l.status === 'rejected').length, color: 'text-destructive' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="card-hover">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
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
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Leave Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockLeaves.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
                            <span className="text-xs font-medium text-accent-foreground">
                              {leave.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <span className="font-medium text-foreground">{leave.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(leave.type)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-foreground">{leave.startDate} - {leave.endDate}</p>
                          <p className="text-xs text-muted-foreground">{leave.days} day{leave.days > 1 ? 's' : ''}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {leave.reason}
                      </TableCell>
                      <TableCell>{getStatusBadge(leave.status)}</TableCell>
                      <TableCell className="text-right">
                        {leave.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-success hover:text-success hover:bg-success/10"
                              onClick={() => handleApprove(leave.id, leave.name)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleReject(leave.id, leave.name)}
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
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Leaves;
