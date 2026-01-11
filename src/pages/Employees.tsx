import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployees, useCreateEmployee, useUpdateEmployee, CreateEmployeeData, Employee } from '@/hooks/useEmployees';
import { useSoftDelete } from '@/hooks/useAuditLogs';
import { useCompany } from '@/hooks/useCompany';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Plus, Search, MoreHorizontal, Edit, Trash2, Loader2, Users, Clock, Eye, Shield } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { CURRENCIES, ARAB_COUNTRIES } from './EmployeeDetails';

const WEEKDAYS = [
  { id: 'sunday', labelKey: 'common.sun' },
  { id: 'monday', labelKey: 'common.mon' },
  { id: 'tuesday', labelKey: 'common.tue' },
  { id: 'wednesday', labelKey: 'common.wed' },
  { id: 'thursday', labelKey: 'common.thu' },
  { id: 'friday', labelKey: 'common.fri' },
  { id: 'saturday', labelKey: 'common.sat' },
];

export const EMPLOYEE_ROLES = [
  { id: 'admin', labelKey: 'employees.roleAdmin' },
  { id: 'manager', labelKey: 'employees.roleManager' },
  { id: 'employee', labelKey: 'employees.roleEmployee' },
];

const Employees = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: employees = [], isLoading } = useEmployees();
  const { data: company } = useCompany();
  const createEmployee = useCreateEmployee();
  const softDelete = useSoftDelete();
  const updateEmployee = useUpdateEmployee();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const defaultCurrency = (company as any)?.default_currency || 'SAR';

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.department?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && emp.is_active) ||
      (statusFilter === 'inactive' && !emp.is_active);

    return matchesSearch && matchesStatus;
  });

  const handleDelete = async () => {
    if (selectedEmployee) {
      await softDelete.mutateAsync({
        tableName: 'employees',
        recordId: selectedEmployee.id,
        recordData: JSON.parse(JSON.stringify(selectedEmployee)),
      });
      setDeleteDialogOpen(false);
      setSelectedEmployee(null);
    }
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEditDialogOpen(true);
  };

  const getCurrencySymbol = (code: string | null) => {
    const currency = CURRENCIES.find(c => c.code === (code || defaultCurrency));
    return currency?.symbol || 'ر.س';
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
            <h1 className="text-2xl font-bold text-foreground">{t('employees.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('employees.manage')}
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary-gradient">
                <Plus className="w-4 h-4 me-2" />
                {t('employees.add')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('employees.add')}</DialogTitle>
              </DialogHeader>
              <AddEmployeeForm 
                defaultCurrency={defaultCurrency}
                onClose={() => setDialogOpen(false)} 
                onSubmit={async (data) => {
                  await createEmployee.mutateAsync(data);
                  setDialogOpen(false);
                }}
                isLoading={createEmployee.isPending}
              />
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t('employees.search')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ps-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder={t('employees.status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('employees.allStatus')}</SelectItem>
                    <SelectItem value="active">{t('common.active')}</SelectItem>
                    <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Users className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-foreground mb-1">{t('employees.noEmployees')}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                    {t('employees.getStarted')}
                  </p>
                  <Button onClick={() => setDialogOpen(true)} className="btn-primary-gradient">
                    <Plus className="w-4 h-4 me-2" />
                    {t('employees.add')}
                  </Button>
                </div>
              ) : (
                <>
                {/* Mobile Cards View */}
                <div className="block sm:hidden p-3 space-y-3">
                  {filteredEmployees.map((employee) => (
                    <Card key={employee.id} className="cursor-pointer" onClick={() => navigate(`/dashboard/employees/${employee.id}`)}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-medium text-accent-foreground">
                                {employee.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground text-sm truncate">{employee.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{employee.department || '—'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={employee.is_active ? 'default' : 'secondary'}
                              className={`text-[10px] ${employee.is_active ? 'bg-success hover:bg-success/90' : ''}`}
                            >
                              {employee.is_active ? t('common.active') : t('common.inactive')}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/employees/${employee.id}`); }}>
                                  <Eye className="w-4 h-4 me-2" />
                                  {t('employees.viewDetails')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(employee); }}>
                                  <Edit className="w-4 h-4 me-2" />
                                  {t('common.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEmployee(employee);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 me-2" />
                                  {t('common.delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{employee.work_start_time?.slice(0, 5) || '09:00'} - {employee.work_end_time?.slice(0, 5) || '17:00'}</span>
                          </div>
                          <span>{Number(employee.base_salary).toLocaleString()} {getCurrencySymbol(employee.currency)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Desktop Table View */}
                <Table className="hidden sm:table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('employees.fullName')}</TableHead>
                      <TableHead>{t('employees.department')}</TableHead>
                      <TableHead>{t('employees.workHours')}</TableHead>
                      <TableHead>{t('employees.salary')}</TableHead>
                      <TableHead>{t('employees.status')}</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <TableRow key={employee.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/dashboard/employees/${employee.id}`)}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
                              <span className="text-xs font-medium text-accent-foreground">
                                {employee.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{employee.full_name}</p>
                              <p className="text-sm text-muted-foreground">{employee.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {employee.department || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span className="text-xs">
                              {employee.work_start_time?.slice(0, 5) || '09:00'} - {employee.work_end_time?.slice(0, 5) || '17:00'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {Number(employee.base_salary).toLocaleString()} {getCurrencySymbol(employee.currency)} / {employee.salary_type === 'monthly' ? t('employees.monthly') : t('employees.daily')}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={employee.is_active ? 'default' : 'secondary'}
                            className={employee.is_active ? 'bg-success hover:bg-success/90' : ''}
                          >
                            {employee.is_active ? t('common.active') : t('common.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/dashboard/employees/${employee.id}`)}>
                                <Eye className="w-4 h-4 me-2" />
                                {t('employees.viewDetails')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(employee)}>
                                <Edit className="w-4 h-4 me-2" />
                                {t('common.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedEmployee(employee);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 me-2" />
                                {t('common.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('employees.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('employees.deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {softDelete.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('common.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Employee Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('employees.editEmployee')}</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <EditEmployeeForm 
              employee={selectedEmployee}
              defaultCurrency={defaultCurrency}
              onClose={() => {
                setEditDialogOpen(false);
                setSelectedEmployee(null);
              }} 
              onSubmit={async (data) => {
                await updateEmployee.mutateAsync({ id: selectedEmployee.id, oldData: selectedEmployee, ...data });
                setEditDialogOpen(false);
                setSelectedEmployee(null);
              }}
              isLoading={updateEmployee.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

interface EmployeeFormData extends CreateEmployeeData {
  work_start_time?: string;
  work_end_time?: string;
  break_duration_minutes?: number;
  weekend_days?: string[];
  is_active?: boolean;
  phone?: string;
  national_id?: string;
  address?: string;
  hire_date?: string;
  currency?: string;
  notes?: string;
  telegram_chat_id?: string;
}

interface AddEmployeeFormProps {
  defaultCurrency: string;
  onClose: () => void;
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  isLoading: boolean;
}

const AddEmployeeForm = ({ defaultCurrency, onClose, onSubmit, isLoading }: AddEmployeeFormProps) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<EmployeeFormData>({
    full_name: '',
    email: '',
    department: '',
    salary_type: 'monthly',
    base_salary: 0,
    work_start_time: '09:00',
    work_end_time: '17:00',
    break_duration_minutes: 60,
    weekend_days: ['friday', 'saturday'],
    phone: '',
    national_id: '',
    address: '',
    hire_date: '',
    currency: defaultCurrency,
    notes: '',
    telegram_chat_id: '',
  });
  
  const handleWeekendToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      weekend_days: prev.weekend_days?.includes(day)
        ? prev.weekend_days.filter(d => d !== day)
        : [...(prev.weekend_days || []), day]
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Basic Info */}
      <div className="space-y-2">
        <Label className="text-base font-medium">{t('employees.basicInfo')}</Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">{t('employees.fullName')}</Label>
            <Input 
              id="name" 
              placeholder={t('employees.fullNamePlaceholder')}
              required 
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('employees.email')}</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="email@company.com" 
              required 
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">{t('employeeDetails.phone')}</Label>
          <Input 
            id="phone" 
            placeholder="+966 5xx xxx xxxx"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="national_id">{t('employeeDetails.nationalId')}</Label>
          <Input 
            id="national_id" 
            placeholder="1234567890"
            value={formData.national_id}
            onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="department">{t('employees.department')}</Label>
          <Input 
            id="department" 
            placeholder={t('employees.departmentPlaceholder')}
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hire_date">{t('employeeDetails.hireDate')}</Label>
          <Input 
            id="hire_date" 
            type="date"
            value={formData.hire_date}
            onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="address">{t('employeeDetails.address')}</Label>
          <Input 
            id="address" 
            placeholder={t('employees.addressPlaceholder')}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telegram_id">Telegram ID</Label>
          <Input 
            id="telegram_id" 
            placeholder="123456789"
            value={formData.telegram_chat_id}
            onChange={(e) => setFormData({ ...formData, telegram_chat_id: e.target.value })}
          />
        </div>
      </div>
      
      {/* Salary Info */}
      <div className="border-t pt-4">
        <Label className="text-base font-medium">{t('employees.salaryInfo')}</Label>
        <div className="grid gap-4 sm:grid-cols-3 mt-3">
          <div className="space-y-2">
            <Label>{t('employees.salaryType')}</Label>
            <Select 
              value={formData.salary_type} 
              onValueChange={(value: 'monthly' | 'daily') => setFormData({ ...formData, salary_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">{t('employees.monthly')}</SelectItem>
                <SelectItem value="daily">{t('employees.daily')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="salary">{t('employees.salaryAmount')}</Label>
            <Input 
              id="salary" 
              type="number" 
              placeholder="5000" 
              value={formData.base_salary || ''}
              onChange={(e) => setFormData({ ...formData, base_salary: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('employees.currency')}</Label>
            <Select 
              value={formData.currency} 
              onValueChange={(value) => setFormData({ ...formData, currency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((curr) => (
                  <SelectItem key={curr.code} value={curr.code}>
                    {curr.symbol} - {curr.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Work Schedule */}
      <div className="border-t pt-4">
        <Label className="text-base font-medium">{t('employees.workSchedule')}</Label>
        <p className="text-sm text-muted-foreground mb-3">{t('employees.workScheduleDesc')}</p>
        
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="work-start">{t('settings.workStart')}</Label>
            <Input 
              id="work-start" 
              type="time" 
              value={formData.work_start_time}
              onChange={(e) => setFormData({ ...formData, work_start_time: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="work-end">{t('settings.workEnd')}</Label>
            <Input 
              id="work-end" 
              type="time" 
              value={formData.work_end_time}
              onChange={(e) => setFormData({ ...formData, work_end_time: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="break">{t('settings.breakDuration')}</Label>
            <Input 
              id="break" 
              type="number" 
              value={formData.break_duration_minutes}
              onChange={(e) => setFormData({ ...formData, break_duration_minutes: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('employees.weekendDays')}</Label>
        <div className="flex flex-wrap gap-3">
          {WEEKDAYS.map((day) => (
            <div key={day.id} className="flex items-center space-x-2 rtl:space-x-reverse">
              <Checkbox 
                id={`add-${day.id}`}
                checked={formData.weekend_days?.includes(day.id)}
                onCheckedChange={() => handleWeekendToggle(day.id)}
              />
              <Label htmlFor={`add-${day.id}`} className="text-sm font-normal cursor-pointer">
                {t(day.labelKey)}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="border-t pt-4 space-y-2">
        <Label htmlFor="notes">{t('employeeDetails.notes')}</Label>
        <Textarea 
          id="notes" 
          placeholder={t('employees.notesPlaceholder')}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" className="flex-1 btn-primary-gradient" disabled={isLoading}>
          {isLoading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
};

interface EditEmployeeFormProps {
  employee: Employee;
  defaultCurrency: string;
  onClose: () => void;
  onSubmit: (data: Partial<EmployeeFormData>) => Promise<void>;
  isLoading: boolean;
}

const EditEmployeeForm = ({ employee, defaultCurrency, onClose, onSubmit, isLoading }: EditEmployeeFormProps) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<EmployeeFormData>({
    full_name: employee.full_name,
    email: employee.email,
    department: employee.department || '',
    salary_type: employee.salary_type,
    base_salary: Number(employee.base_salary),
    work_start_time: employee.work_start_time?.slice(0, 5) || '09:00',
    work_end_time: employee.work_end_time?.slice(0, 5) || '17:00',
    break_duration_minutes: employee.break_duration_minutes || 60,
    weekend_days: employee.weekend_days || ['friday', 'saturday'],
    is_active: employee.is_active,
    phone: employee.phone || '',
    national_id: employee.national_id || '',
    address: employee.address || '',
    hire_date: employee.hire_date || '',
    currency: employee.currency || defaultCurrency,
    notes: employee.notes || '',
    telegram_chat_id: employee.telegram_chat_id || '',
  });
  
  const handleWeekendToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      weekend_days: prev.weekend_days?.includes(day)
        ? prev.weekend_days.filter(d => d !== day)
        : [...(prev.weekend_days || []), day]
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      ...formData,
      work_start_time: formData.work_start_time + ':00',
      work_end_time: formData.work_end_time + ':00',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Basic Info */}
      <div className="space-y-2">
        <Label className="text-base font-medium">{t('employees.basicInfo')}</Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-name">{t('employees.fullName')}</Label>
            <Input 
              id="edit-name" 
              required 
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">{t('employees.email')}</Label>
            <Input 
              id="edit-email" 
              type="email" 
              required 
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit-phone">{t('employeeDetails.phone')}</Label>
          <Input 
            id="edit-phone" 
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-national_id">{t('employeeDetails.nationalId')}</Label>
          <Input 
            id="edit-national_id" 
            value={formData.national_id}
            onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit-department">{t('employees.department')}</Label>
          <Input 
            id="edit-department" 
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('employees.status')}</Label>
          <Select 
            value={formData.is_active ? 'active' : 'inactive'} 
            onValueChange={(value) => setFormData({ ...formData, is_active: value === 'active' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t('common.active')}</SelectItem>
              <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit-hire_date">{t('employeeDetails.hireDate')}</Label>
          <Input 
            id="edit-hire_date" 
            type="date"
            value={formData.hire_date}
            onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-address">{t('employeeDetails.address')}</Label>
          <Input 
            id="edit-address" 
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-telegram_id">Telegram ID</Label>
          <Input 
            id="edit-telegram_id" 
            placeholder="123456789"
            value={formData.telegram_chat_id}
            onChange={(e) => setFormData({ ...formData, telegram_chat_id: e.target.value })}
          />
        </div>
      </div>
      
      {/* Salary Info */}
      <div className="border-t pt-4">
        <Label className="text-base font-medium">{t('employees.salaryInfo')}</Label>
        <div className="grid gap-4 sm:grid-cols-3 mt-3">
          <div className="space-y-2">
            <Label>{t('employees.salaryType')}</Label>
            <Select 
              value={formData.salary_type} 
              onValueChange={(value: 'monthly' | 'daily') => setFormData({ ...formData, salary_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">{t('employees.monthly')}</SelectItem>
                <SelectItem value="daily">{t('employees.daily')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-salary">{t('employees.salaryAmount')}</Label>
            <Input 
              id="edit-salary" 
              type="number" 
              value={formData.base_salary || ''}
              onChange={(e) => setFormData({ ...formData, base_salary: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('employees.currency')}</Label>
            <Select 
              value={formData.currency} 
              onValueChange={(value) => setFormData({ ...formData, currency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((curr) => (
                  <SelectItem key={curr.code} value={curr.code}>
                    {curr.symbol} - {curr.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Work Schedule */}
      <div className="border-t pt-4">
        <Label className="text-base font-medium">{t('employees.workSchedule')}</Label>
        <p className="text-sm text-muted-foreground mb-3">{t('employees.workScheduleDesc')}</p>
        
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="edit-work-start">{t('settings.workStart')}</Label>
            <Input 
              id="edit-work-start" 
              type="time" 
              value={formData.work_start_time}
              onChange={(e) => setFormData({ ...formData, work_start_time: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-work-end">{t('settings.workEnd')}</Label>
            <Input 
              id="edit-work-end" 
              type="time" 
              value={formData.work_end_time}
              onChange={(e) => setFormData({ ...formData, work_end_time: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-break">{t('settings.breakDuration')}</Label>
            <Input 
              id="edit-break" 
              type="number" 
              value={formData.break_duration_minutes}
              onChange={(e) => setFormData({ ...formData, break_duration_minutes: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('employees.weekendDays')}</Label>
        <div className="flex flex-wrap gap-3">
          {WEEKDAYS.map((day) => (
            <div key={day.id} className="flex items-center space-x-2 rtl:space-x-reverse">
              <Checkbox 
                id={`edit-${day.id}`}
                checked={formData.weekend_days?.includes(day.id)}
                onCheckedChange={() => handleWeekendToggle(day.id)}
              />
              <Label htmlFor={`edit-${day.id}`} className="text-sm font-normal cursor-pointer">
                {t(day.labelKey)}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="border-t pt-4 space-y-2">
        <Label htmlFor="edit-notes">{t('employeeDetails.notes')}</Label>
        <Textarea 
          id="edit-notes" 
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" className="flex-1 btn-primary-gradient" disabled={isLoading}>
          {isLoading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
};

export default Employees;
