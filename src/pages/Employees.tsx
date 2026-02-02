import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployees, useCreateEmployee, useUpdateEmployee, CreateEmployeeData, Employee } from '@/hooks/useEmployees';
import { useSoftDelete } from '@/hooks/useAuditLogs';
import { useCompany } from '@/hooks/useCompany';
import { useSubscriptionLimit } from '@/hooks/useSubscriptionLimit';
import { usePositions } from '@/hooks/usePositions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TimePicker } from '@/components/ui/time-picker';
import { cn } from '@/lib/utils';
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
import { Plus, Search, MoreHorizontal, Edit, Trash2, Loader2, Users, Clock, Eye, Shield, AlertTriangle, Download, CalendarIcon, UserCheck, UserX } from 'lucide-react';
import EmployeeVerificationForm from '@/components/employees/EmployeeVerificationForm';
import EmployeeLocationSelector from '@/components/employees/EmployeeLocationSelector';
import { useEmployeeLocations, useUpdateEmployeeLocations } from '@/hooks/useCompanyLocations';
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
import { exportEmployeesReport } from '@/lib/exportUtils';
import { toast } from 'sonner';
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
  const { t, direction } = useLanguage();
  const navigate = useNavigate();
  const { data: employees = [], isLoading } = useEmployees();
  const { data: company } = useCompany();
  const { data: positions = [] } = usePositions();
  const createEmployee = useCreateEmployee();
  const softDelete = useSoftDelete();
  const updateEmployee = useUpdateEmployee();
  const { canAddEmployee, isOverLimit, employeesOverLimit, maxEmployees, nextPlan, activeEmployeeCount, isUnlimited } = useSubscriptionLimit();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Safety cleanup: if a Radix Dialog/AlertDialog leaves the document body locked,
  // the UI can appear "frozen" (no clicks/menus). Ensure we always restore interaction
  // once all modals are closed.
  useEffect(() => {
    const anyModalOpen = dialogOpen || editDialogOpen || deleteDialogOpen;
    if (!anyModalOpen) {
      document.body.style.pointerEvents = '';
      document.body.style.overflow = '';
      document.body.removeAttribute('data-scroll-locked');
    }
  }, [dialogOpen, editDialogOpen, deleteDialogOpen]);

  // If for any reason the edit dialog is open without a selected employee, force-close it.
  useEffect(() => {
    if (editDialogOpen && !selectedEmployee) {
      setEditDialogOpen(false);
    }
  }, [editDialogOpen, selectedEmployee]);

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

  const handleEdit = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
    setEditDialogOpen(true);
  }, []);

  const handleEditClose = useCallback(() => {
    setEditDialogOpen(false);
    setSelectedEmployee(null);
  }, []);

  const handleEditSubmit = useCallback(async (data: any) => {
    if (selectedEmployee) {
      const employeeId = selectedEmployee.id;
      const oldData = selectedEmployee;
      
      // Close dialog immediately to prevent UI freeze
      setEditDialogOpen(false);
      setSelectedEmployee(null);
      
      // Then perform the update
      await updateEmployee.mutateAsync({ id: employeeId, oldData, ...data });
    }
  }, [selectedEmployee, updateEmployee]);

  const handleAddClose = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const handleAddSubmit = useCallback(async (data: any) => {
    await createEmployee.mutateAsync(data);
    setDialogOpen(false);
  }, [createEmployee]);

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
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (open && !canAddEmployee) {
              return; // Don't open if at hard limit
            }
            setDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button 
                className="btn-primary-gradient"
                disabled={!canAddEmployee}
                data-tour="add-employee"
              >
                <Plus className="w-4 h-4 me-2" />
                {t('employees.add')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('employees.add')}</DialogTitle>
              </DialogHeader>
              
              {/* Warning when over limit */}
              {isOverLimit && nextPlan && (
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">
                        {t('subscription.overLimitWarning') || 'تجاوزت الحد الأقصى للموظفين'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('subscription.upgradeNotice') || 'لديك'} {activeEmployeeCount}/{maxEmployees} {t('subscription.employees') || 'موظف'}. 
                        {t('subscription.nextMonthUpgrade') || 'من الشهر القادم سيتم ترقيتك تلقائياً إلى باقة'} <strong>{nextPlan.name_ar || nextPlan.name}</strong> {t('subscription.atPrice') || 'بسعر'} <strong>{nextPlan.price_monthly} {nextPlan.currency}</strong> {t('subscription.perMonth') || 'شهرياً'}.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <AddEmployeeForm 
                defaultCurrency={defaultCurrency}
                positions={positions}
                onClose={handleAddClose} 
                onSubmit={handleAddSubmit}
                isLoading={createEmployee.isPending}
              />
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Subscription Limit Warning Banner */}
        {isOverLimit && nextPlan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {t('subscription.limitReached') || 'وصلت للحد الأقصى من الموظفين'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('subscription.currentlyUsing') || 'أنت تستخدم'} {activeEmployeeCount} {t('subscription.outOf') || 'من'} {maxEmployees} {t('subscription.employees') || 'موظف'}. 
                      {employeesOverLimit > 0 && ` (${employeesOverLimit} ${t('subscription.extra') || 'إضافي'})`}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="border-warning text-warning hover:bg-warning/10"
                    onClick={() => navigate('/dashboard/subscription')}
                  >
                    {t('subscription.upgrade') || 'ترقية الباقة'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

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
                  <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${direction === 'rtl' ? 'right-3' : 'left-3'}`} />
                  <Input
                    placeholder={t('employees.search')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={direction === 'rtl' ? 'pr-10' : 'pl-10'}
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
                <Button
                  variant="outline"
                  onClick={() => {
                    const exportData = filteredEmployees.map(emp => ({
                      full_name: emp.full_name,
                      email: emp.email,
                      phone: emp.phone,
                      department: emp.department,
                      hire_date: emp.hire_date,
                      base_salary: emp.base_salary,
                      is_active: emp.is_active ?? true,
                    }));
                    exportEmployeesReport(exportData, direction === 'rtl');
                    toast.success(direction === 'rtl' ? 'تم تصدير التقرير' : 'Report exported');
                  }}
                  className="gap-2"
                  disabled={filteredEmployees.length === 0}
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">{direction === 'rtl' ? 'تصدير' : 'Export'}</span>
                </Button>
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
                              <p className="text-xs text-muted-foreground truncate">{positions.find(p => p.id === employee.position_id)?.title || '—'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {(employee as any).is_freelancer && (
                              <Badge variant="outline" className="text-[10px] border-warning text-warning">
                                {direction === 'rtl' ? 'فريلانسر' : 'Freelancer'}
                              </Badge>
                            )}
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
                      <TableHead>{t('employees.position')}</TableHead>
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
                          {positions.find(p => p.id === employee.position_id)?.title || '—'}
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
                          {(employee as any).is_freelancer 
                            ? `${Number((employee as any).hourly_rate || 0).toLocaleString()} ${getCurrencySymbol(employee.currency)} / ${direction === 'rtl' ? 'ساعة' : 'hr'}`
                            : `${Number(employee.base_salary).toLocaleString()} ${getCurrencySymbol(employee.currency)} / ${employee.salary_type === 'monthly' ? t('employees.monthly') : t('employees.daily')}`
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {(employee as any).is_freelancer && (
                              <Badge variant="outline" className="border-warning text-warning">
                                {direction === 'rtl' ? 'فريلانسر' : 'Freelancer'}
                              </Badge>
                            )}
                            <Badge 
                              variant={employee.is_active ? 'default' : 'secondary'}
                              className={employee.is_active ? 'bg-success hover:bg-success/90' : ''}
                            >
                              {employee.is_active ? t('common.active') : t('common.inactive')}
                            </Badge>
                          </div>
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
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setSelectedEmployee(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('employees.editEmployee')}</DialogTitle>
          </DialogHeader>
          {editDialogOpen && selectedEmployee && (
            <EditEmployeeForm 
              key={selectedEmployee.id}
              employee={selectedEmployee}
              defaultCurrency={defaultCurrency}
              positions={positions}
              company={company}
              employees={employees}
              onClose={handleEditClose} 
              onSubmit={handleEditSubmit}
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
  position_id?: string;
  is_freelancer?: boolean;
  hourly_rate?: number;
  // Verification settings
  attendance_verification_level?: number | null;
  attendance_approver_type?: string | null;
  attendance_approver_id?: string | null;
  level3_verification_mode?: string | null;
  allowed_wifi_ips?: string[] | null;
  biometric_verification_enabled?: boolean | null;
}

interface AddEmployeeFormProps {
  defaultCurrency: string;
  onClose: () => void;
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  isLoading: boolean;
  positions: { id: string; title: string; title_ar: string | null }[];
}

const AddEmployeeForm = ({ defaultCurrency, onClose, onSubmit, isLoading, positions }: AddEmployeeFormProps) => {
  const { t, language } = useLanguage();
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
    position_id: '',
    is_freelancer: false,
    hourly_rate: 0,
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
          <Label>{language === 'ar' ? 'المنصب' : 'Position'}</Label>
          <Select 
            value={formData.position_id || 'none'} 
            onValueChange={(value) => setFormData({ ...formData, position_id: value === 'none' ? '' : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={language === 'ar' ? 'اختر المنصب' : 'Select position'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                {language === 'ar' ? 'بدون منصب' : 'No position'}
              </SelectItem>
              {positions.map((pos) => (
                <SelectItem key={pos.id} value={pos.id}>
                  {language === 'ar' && pos.title_ar ? pos.title_ar : pos.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('employeeDetails.hireDate')}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.hire_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="me-2 h-4 w-4" />
                {formData.hire_date ? (
                  format(parseISO(formData.hire_date), 'PPP', { locale: ar })
                ) : (
                  <span>{language === 'ar' ? 'اختر التاريخ' : 'Pick a date'}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.hire_date ? parseISO(formData.hire_date) : undefined}
                onSelect={(date) => setFormData({ ...formData, hire_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
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
          <Label htmlFor="address">{t('employeeDetails.address')}</Label>
          <Input 
            id="address" 
            placeholder={t('employees.addressPlaceholder')}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>
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
      
      {/* Salary Info */}
      <div className="border-t pt-4">
        <Label className="text-base font-medium">{t('employees.salaryInfo')}</Label>
        
        {/* Freelancer Toggle */}
        <div className="mt-3 mb-4">
          <Card 
            className={cn(
              "p-4 transition-all duration-300 border-2",
              formData.is_freelancer 
                ? "bg-warning/10 border-warning/30" 
                : "bg-muted/30 border-muted-foreground/20"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                  formData.is_freelancer ? "bg-warning/20" : "bg-muted-foreground/10"
                )}>
                  <Clock className={cn("w-5 h-5", formData.is_freelancer ? "text-warning" : "text-muted-foreground")} />
                </div>
                <div>
                  <p className={cn("font-medium", formData.is_freelancer ? "text-warning" : "text-muted-foreground")}>
                    {language === 'ar' ? 'عمالة غير منتظمة (Freelancer)' : 'Freelancer (Hourly)'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' 
                      ? 'يُحسب الراتب بالساعة - لا تطبق قوانين الشركة' 
                      : 'Paid hourly - Company policies do not apply'}
                  </p>
                </div>
              </div>
              <Switch 
                checked={formData.is_freelancer === true}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_freelancer: checked }))}
              />
            </div>
          </Card>
          
          {formData.is_freelancer && (
            <div className="mt-3 p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <p className="text-sm text-warning-foreground">
                <strong>{language === 'ar' ? '⚠️ ملاحظة:' : '⚠️ Note:'}</strong>{' '}
                {language === 'ar' 
                  ? 'الموظف الفريلانسر لا يطبق عليه: خصومات التأخير، الغياب التلقائي، تنبيهات الحضور، أو أي سياسات أخرى للشركة. يتم حساب راتبه فقط بناءً على ساعات العمل الفعلية.'
                  : 'Freelancer employees are exempt from: late deductions, auto-absence, attendance reminders, or any other company policies. Salary is calculated solely based on actual hours worked.'}
              </p>
            </div>
          )}
        </div>
        
        <div className="grid gap-4 sm:grid-cols-3 mt-3">
          {formData.is_freelancer ? (
            <>
              <div className="space-y-2 sm:col-span-2">
                <Label>{language === 'ar' ? 'سعر الساعة' : 'Hourly Rate'}</Label>
                <NumberInput 
                  value={formData.hourly_rate || 0}
                  onChange={(value) => setFormData({ ...formData, hourly_rate: value })}
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
            </>
          ) : (
            <>
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
                <NumberInput 
                  id="salary" 
                  value={formData.base_salary || 0}
                  onChange={(value) => setFormData({ ...formData, base_salary: value })}
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
            </>
          )}
        </div>
      </div>

      {/* Work Schedule - only show for non-freelancers or with note */}
      <div className="border-t pt-4">
        <Label className="text-base font-medium">{t('employees.workSchedule')}</Label>
        <p className="text-sm text-muted-foreground mb-3">
          {formData.is_freelancer 
            ? (language === 'ar' ? 'اختياري - للتذكير فقط (لن يتم تطبيق خصومات)' : 'Optional - For reminders only (no deductions applied)')
            : t('employees.workScheduleDesc')}
        </p>
        
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>{t('settings.workStart')}</Label>
            <TimePicker
              value={formData.work_start_time}
              onChange={(time) => setFormData({ ...formData, work_start_time: time })}
              placeholder={language === 'ar' ? 'وقت البدء' : 'Start time'}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('settings.workEnd')}</Label>
            <TimePicker
              value={formData.work_end_time}
              onChange={(time) => setFormData({ ...formData, work_end_time: time })}
              placeholder={language === 'ar' ? 'وقت الانتهاء' : 'End time'}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('settings.breakDuration')}</Label>
            <NumberInput 
              value={formData.break_duration_minutes}
              onChange={(value) => setFormData({ ...formData, break_duration_minutes: value })}
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
  onSubmit: (data: Partial<EmployeeFormData & {
    attendance_verification_level: number | null;
    attendance_approver_type: string | null;
    attendance_approver_id: string | null;
    level3_verification_mode: string | null;
    allowed_wifi_ips: string[] | null;
  }>) => Promise<void>;
  isLoading: boolean;
  positions: { id: string; title: string; title_ar: string | null }[];
  company: any;
  employees: Employee[];
}

const EditEmployeeForm = ({ employee, defaultCurrency, onClose, onSubmit, isLoading, positions, company, employees }: EditEmployeeFormProps) => {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState<EmployeeFormData>({
    full_name: employee.full_name,
    email: employee.email,
    department: employee.department || '',
    salary_type: employee.salary_type || 'monthly',
    base_salary: Number(employee.base_salary) || 0,
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
    position_id: employee.position_id || '',
    is_freelancer: employee.is_freelancer || false,
    hourly_rate: employee.hourly_rate || 0,
  });

  // Verification settings state
  const parseLevel3Requirements = (mode: string | null): string[] => {
    if (!mode) return ['location'];
    const requirements: string[] = [];
    if (mode.includes('location')) requirements.push('location');
    if (mode.includes('selfie')) requirements.push('selfie');
    if (mode.includes('ip')) requirements.push('wifi_ip');
    return requirements.length > 0 ? requirements : ['location'];
  };

  const [verificationSettings, setVerificationSettings] = useState(() => ({
    useCompanyDefault: (employee as any).attendance_verification_level === null || (employee as any).attendance_verification_level === undefined,
    verificationLevel: (employee as any).attendance_verification_level || (company as any)?.attendance_verification_level || 1,
    approverType: ((employee as any).attendance_approver_type || 'direct_manager') as 'direct_manager' | 'specific_person',
    approverId: (employee as any).attendance_approver_id || null,
    level3Requirements: parseLevel3Requirements((employee as any).level3_verification_mode),
    allowedWifiIps: ((employee as any).allowed_wifi_ips || []).join(', '),
    biometricEnabled: (employee as any).biometric_verification_enabled ?? false,
  }));

  // Memoized callback for verification settings
  const handleVerificationSettingsChange = useCallback((newSettings: typeof verificationSettings) => {
    setVerificationSettings(newSettings);
  }, []);

  // Employee locations state
  const { data: employeeLocationsDataRaw } = useEmployeeLocations(employee.id);
  const updateEmployeeLocations = useUpdateEmployeeLocations();
  const locationsInitializedRef = useRef(false);
  
  // Initialize locations only once from the fetched data
  const initialLocationIds = useMemo(() => {
    if (employeeLocationsDataRaw && employeeLocationsDataRaw.length > 0) {
      return employeeLocationsDataRaw.map(loc => loc.location_id);
    }
    return [];
  }, [employeeLocationsDataRaw]);

  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  // Memoized callback for location changes
  const handleLocationIdsChange = useCallback((ids: string[]) => {
    setSelectedLocationIds(ids);
  }, []);

  // Effect to update selected locations when data loads (only once)
  useEffect(() => {
    if (!locationsInitializedRef.current && initialLocationIds.length > 0) {
      setSelectedLocationIds(initialLocationIds);
      locationsInitializedRef.current = true;
    }
  }, [initialLocationIds]);
  
  const employeeLocationsData = employeeLocationsDataRaw ?? [];

  const getLevel3ModeString = (requirements: string[]): string => {
    const hasLocation = requirements.includes('location');
    const hasSelfie = requirements.includes('selfie');
    const hasIp = requirements.includes('wifi_ip');

    if (hasLocation && hasSelfie && hasIp) return 'location_selfie_ip';
    if (hasLocation && hasSelfie) return 'location_selfie';
    if (hasLocation && hasIp) return 'location_ip';
    if (hasSelfie && hasIp) return 'selfie_ip';
    if (hasLocation) return 'location_only';
    if (hasSelfie) return 'selfie_only';
    if (hasIp) return 'ip_only';
    return 'location_only';
  };
  
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
    
    try {
      // Build verification data
      const verificationData = {
        attendance_verification_level: verificationSettings.useCompanyDefault ? null : verificationSettings.verificationLevel,
        attendance_approver_type: verificationSettings.useCompanyDefault ? null : verificationSettings.approverType,
        attendance_approver_id: !verificationSettings.useCompanyDefault && verificationSettings.approverType === 'specific_person' ? verificationSettings.approverId : null,
        level3_verification_mode: !verificationSettings.useCompanyDefault && verificationSettings.verificationLevel === 3 ? getLevel3ModeString(verificationSettings.level3Requirements) : null,
        allowed_wifi_ips: verificationSettings.allowedWifiIps.trim() 
          ? verificationSettings.allowedWifiIps.split(',').map(ip => ip.trim()).filter(ip => ip) 
          : null,
        biometric_verification_enabled: verificationSettings.biometricEnabled,
      };

      // Submit employee data first, then update locations
      await onSubmit({
        ...formData,
        work_start_time: formData.work_start_time + ':00',
        work_end_time: formData.work_end_time + ':00',
        ...verificationData,
      });

      // Update employee locations after main update succeeds
      await updateEmployeeLocations.mutateAsync({
        employeeId: employee.id,
        locationIds: selectedLocationIds,
      });
    } catch (error) {
      console.error('Error updating employee:', error);
    }
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
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">{t('employees.email')}</Label>
            <Input 
              id="edit-email" 
              type="email" 
              required 
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
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
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-national_id">{t('employeeDetails.nationalId')}</Label>
          <Input 
            id="edit-national_id" 
            value={formData.national_id}
            onChange={(e) => setFormData(prev => ({ ...prev, national_id: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{language === 'ar' ? 'المنصب' : 'Position'}</Label>
          <Select 
            value={formData.position_id || 'none'} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, position_id: value === 'none' ? '' : value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={language === 'ar' ? 'اختر المنصب' : 'Select position'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                {language === 'ar' ? 'بدون منصب' : 'No position'}
              </SelectItem>
              {positions.map((pos) => (
                <SelectItem key={pos.id} value={pos.id}>
                  {language === 'ar' && pos.title_ar ? pos.title_ar : pos.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('employees.status')}</Label>
          <Card className={cn(
            "p-4 transition-all duration-300 cursor-pointer border-2",
            formData.is_active 
              ? "bg-success/10 border-success/30 hover:border-success/50" 
              : "bg-muted/50 border-muted-foreground/20 hover:border-muted-foreground/40"
          )}
          onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                  formData.is_active ? "bg-success/20" : "bg-muted-foreground/10"
                )}>
                  {formData.is_active ? (
                    <UserCheck className="w-5 h-5 text-success" />
                  ) : (
                    <UserX className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className={cn(
                    "font-medium",
                    formData.is_active ? "text-success" : "text-muted-foreground"
                  )}>
                    {formData.is_active ? t('common.active') : t('common.inactive')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formData.is_active 
                      ? (language === 'ar' ? 'الموظف يعمل حالياً' : 'Employee is currently working')
                      : (language === 'ar' ? 'الموظف غير نشط' : 'Employee is inactive')
                    }
                  </p>
                </div>
              </div>
              <Switch 
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit-department">{t('employees.department')}</Label>
          <Input 
            id="edit-department" 
            value={formData.department}
            onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('employeeDetails.hireDate')}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.hire_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="me-2 h-4 w-4" />
                {formData.hire_date ? (
                  format(parseISO(formData.hire_date), 'PPP', { locale: ar })
                ) : (
                  <span>{language === 'ar' ? 'اختر التاريخ' : 'Pick a date'}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.hire_date ? parseISO(formData.hire_date) : undefined}
                onSelect={(date) => setFormData(prev => ({ ...prev, hire_date: date ? format(date, 'yyyy-MM-dd') : '' }))}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit-address">{t('employeeDetails.address')}</Label>
          <Input 
            id="edit-address" 
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-telegram_id">Telegram ID</Label>
          <Input 
            id="edit-telegram_id" 
            placeholder="123456789"
            value={formData.telegram_chat_id}
            onChange={(e) => setFormData(prev => ({ ...prev, telegram_chat_id: e.target.value }))}
          />
        </div>
      </div>
      
      {/* Salary Info */}
      <div className="border-t pt-4">
        <Label className="text-base font-medium">{t('employees.salaryInfo')}</Label>
        
        {/* Freelancer Toggle */}
        <div className="mt-3 mb-4">
          <div 
            className={cn(
              "p-4 transition-all duration-300 border-2 rounded-lg",
              formData.is_freelancer 
                ? "bg-warning/10 border-warning/30" 
                : "bg-muted/30 border-muted-foreground/20"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                  formData.is_freelancer ? "bg-warning/20" : "bg-muted-foreground/10"
                )}>
                  <Clock className={cn("w-5 h-5", formData.is_freelancer ? "text-warning" : "text-muted-foreground")} />
                </div>
                <div>
                  <p className={cn("font-medium", formData.is_freelancer ? "text-warning" : "text-muted-foreground")}>
                    {language === 'ar' ? 'عمالة غير منتظمة (Freelancer)' : 'Freelancer (Hourly)'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' 
                      ? 'يُحسب الراتب بالساعة - لا تطبق قوانين الشركة' 
                      : 'Paid hourly - Company policies do not apply'}
                  </p>
                </div>
              </div>
              <Switch 
                checked={formData.is_freelancer === true}
                onCheckedChange={(checked) => {
                  setFormData(prev => ({ ...prev, is_freelancer: checked }));
                }}
              />
            </div>
          </div>
          
          {formData.is_freelancer && (
            <div className="mt-3 p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <p className="text-sm text-warning-foreground">
                <strong>{language === 'ar' ? '⚠️ ملاحظة:' : '⚠️ Note:'}</strong>{' '}
                {language === 'ar' 
                  ? 'الموظف الفريلانسر لا يطبق عليه: خصومات التأخير، الغياب التلقائي، تنبيهات الحضور، أو أي سياسات أخرى للشركة. يتم حساب راتبه فقط بناءً على ساعات العمل الفعلية.'
                  : 'Freelancer employees are exempt from: late deductions, auto-absence, attendance reminders, or any other company policies. Salary is calculated solely based on actual hours worked.'}
              </p>
            </div>
          )}
        </div>
        
        <div className="grid gap-4 sm:grid-cols-3 mt-3">
          {formData.is_freelancer ? (
            <>
              <div className="space-y-2 sm:col-span-2">
                <Label>{language === 'ar' ? 'سعر الساعة' : 'Hourly Rate'}</Label>
                <NumberInput 
                  value={formData.hourly_rate || 0}
                  onChange={(value) => setFormData(prev => ({ ...prev, hourly_rate: value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('employees.currency')}</Label>
                <Select 
                  value={formData.currency} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
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
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>{t('employees.salaryType')}</Label>
                <Select 
                  value={formData.salary_type} 
                  onValueChange={(value: 'monthly' | 'daily') => setFormData(prev => ({ ...prev, salary_type: value }))}
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
                <NumberInput 
                  id="edit-salary" 
                  value={formData.base_salary || 0}
                  onChange={(value) => setFormData(prev => ({ ...prev, base_salary: value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('employees.currency')}</Label>
                <Select 
                  value={formData.currency} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
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
            </>
          )}
        </div>
      </div>

      {/* Work Schedule */}
      <div className="border-t pt-4">
        <Label className="text-base font-medium">{t('employees.workSchedule')}</Label>
        <p className="text-sm text-muted-foreground mb-3">
          {formData.is_freelancer 
            ? (language === 'ar' ? 'اختياري - للتذكير فقط (لن يتم تطبيق خصومات)' : 'Optional - For reminders only (no deductions applied)')
            : t('employees.workScheduleDesc')}
        </p>
        
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>{t('settings.workStart')}</Label>
            <TimePicker
              value={formData.work_start_time}
              onChange={(time) => setFormData(prev => ({ ...prev, work_start_time: time }))}
              placeholder={language === 'ar' ? 'وقت البدء' : 'Start time'}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('settings.workEnd')}</Label>
            <TimePicker
              value={formData.work_end_time}
              onChange={(time) => setFormData(prev => ({ ...prev, work_end_time: time }))}
              placeholder={language === 'ar' ? 'وقت الانتهاء' : 'End time'}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('settings.breakDuration')}</Label>
            <NumberInput 
              value={formData.break_duration_minutes}
              onChange={(value) => setFormData(prev => ({ ...prev, break_duration_minutes: value }))}
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

      {/* Verification Settings */}
      <EmployeeVerificationForm
        employee={employee}
        company={company}
        employees={employees}
        value={verificationSettings}
        onChange={handleVerificationSettingsChange}
      />

      {/* Employee Locations */}
      {(verificationSettings.verificationLevel === 3 || (verificationSettings.useCompanyDefault && (company as any)?.attendance_verification_level === 3)) && (
        <div className="border-t pt-4">
          <EmployeeLocationSelector
            employeeId={employee.id}
            selectedLocationIds={selectedLocationIds}
            onChange={handleLocationIdsChange}
          />
        </div>
      )}

      {/* Notes */}
      <div className="border-t pt-4 space-y-2">
        <Label htmlFor="edit-notes">{t('employeeDetails.notes')}</Label>
        <Textarea 
          id="edit-notes" 
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
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
