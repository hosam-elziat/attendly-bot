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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { DollarSign, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SalaryRecord {
  id: string;
  name: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  status: 'paid' | 'pending' | 'processing';
  workDays: number;
  totalDays: number;
}

const mockSalaries: SalaryRecord[] = [
  { id: '1', name: 'Sarah Johnson', baseSalary: 5000, bonus: 500, deductions: 200, netSalary: 5300, status: 'paid', workDays: 22, totalDays: 22 },
  { id: '2', name: 'Ahmed Hassan', baseSalary: 3500, bonus: 0, deductions: 100, netSalary: 3400, status: 'pending', workDays: 20, totalDays: 22 },
  { id: '3', name: 'Emily Chen', baseSalary: 3800, bonus: 200, deductions: 0, netSalary: 4000, status: 'processing', workDays: 22, totalDays: 22 },
  { id: '4', name: 'Michael Brown', baseSalary: 3200, bonus: 0, deductions: 500, netSalary: 2700, status: 'pending', workDays: 18, totalDays: 22 },
  { id: '5', name: 'Fatima Al-Rashid', baseSalary: 4500, bonus: 300, deductions: 0, netSalary: 4800, status: 'paid', workDays: 22, totalDays: 22 },
];

const Salaries = () => {
  const { t } = useLanguage();

  const totalPayroll = mockSalaries.reduce((sum, s) => sum + s.netSalary, 0);
  const totalBonuses = mockSalaries.reduce((sum, s) => sum + s.bonus, 0);
  const totalDeductions = mockSalaries.reduce((sum, s) => sum + s.deductions, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-success hover:bg-success/90">Paid</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-warning hover:bg-warning/90">Processing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
            <h1 className="text-2xl font-bold text-foreground">{t('nav.salaries')}</h1>
            <p className="text-muted-foreground mt-1">
              View and manage monthly salary calculations
            </p>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 me-2" />
            Export Report
          </Button>
        </motion.div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="card-hover">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Payroll</p>
                    <p className="text-2xl font-bold text-foreground">${totalPayroll.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card className="card-hover">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Bonuses</p>
                    <p className="text-2xl font-bold text-success">+${totalBonuses.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card className="card-hover">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Deductions</p>
                    <p className="text-2xl font-bold text-destructive">-${totalDeductions.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Month Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <Select defaultValue="january">
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="january">January 2025</SelectItem>
                    <SelectItem value="december">December 2024</SelectItem>
                    <SelectItem value="november">November 2024</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Salary Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Salary Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Work Days</TableHead>
                    <TableHead>Base Salary</TableHead>
                    <TableHead>Bonus</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockSalaries.map((salary) => (
                    <TableRow key={salary.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
                            <span className="text-xs font-medium text-accent-foreground">
                              {salary.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <span className="font-medium text-foreground">{salary.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {salary.workDays}/{salary.totalDays}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        ${salary.baseSalary.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {salary.bonus > 0 ? (
                          <span className="text-success flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            +${salary.bonus}
                          </span>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Minus className="w-3 h-3" />
                            $0
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {salary.deductions > 0 ? (
                          <span className="text-destructive flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" />
                            -${salary.deductions}
                          </span>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Minus className="w-3 h-3" />
                            $0
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-bold text-foreground">
                        ${salary.netSalary.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(salary.status)}</TableCell>
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

export default Salaries;
