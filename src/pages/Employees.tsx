import { useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployees, useCreateEmployee, useDeleteEmployee, useUpdateEmployee, CreateEmployeeData, Employee } from '@/hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Plus, Search, MoreHorizontal, Edit, Trash2, Loader2, Users, Clock } from 'lucide-react';
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

const WEEKDAYS = [
  { id: 'sunday', label: 'Sun' },
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
];

const Employees = () => {
  const { t } = useLanguage();
  const { data: employees = [], isLoading } = useEmployees();
  const createEmployee = useCreateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const updateEmployee = useUpdateEmployee();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

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
      await deleteEmployee.mutateAsync(selectedEmployee.id);
      setDeleteDialogOpen(false);
      setSelectedEmployee(null);
    }
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEditDialogOpen(true);
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
              Manage your team members, roles, and work schedules
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary-gradient">
                <Plus className="w-4 h-4 me-2" />
                {t('employees.add')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('employees.add')}</DialogTitle>
              </DialogHeader>
              <AddEmployeeForm 
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
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
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
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No employees yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get started by adding your first team member
                  </p>
                  <Button onClick={() => setDialogOpen(true)} className="btn-primary-gradient">
                    <Plus className="w-4 h-4 me-2" />
                    Add Employee
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>{t('employees.department')}</TableHead>
                      <TableHead>Work Hours</TableHead>
                      <TableHead>Salary</TableHead>
                      <TableHead>{t('employees.status')}</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
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
                          ${Number(employee.base_salary).toLocaleString()} / {employee.salary_type}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={employee.is_active ? 'default' : 'secondary'}
                            className={employee.is_active ? 'bg-success hover:bg-success/90' : ''}
                          >
                            {employee.is_active ? t('common.active') : t('common.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
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
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this employee? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEmployee.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Employee Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <EditEmployeeForm 
              employee={selectedEmployee}
              onClose={() => {
                setEditDialogOpen(false);
                setSelectedEmployee(null);
              }} 
              onSubmit={async (data) => {
                await updateEmployee.mutateAsync({ id: selectedEmployee.id, ...data });
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
}

interface AddEmployeeFormProps {
  onClose: () => void;
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  isLoading: boolean;
}

const AddEmployeeForm = ({ onClose, onSubmit, isLoading }: AddEmployeeFormProps) => {
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input 
            id="name" 
            placeholder="John Doe" 
            required 
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="john@company.com" 
            required 
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="department">{t('employees.department')}</Label>
        <Input 
          id="department" 
          placeholder="Engineering" 
          value={formData.department}
          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
        />
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Salary Type</Label>
          <Select 
            value={formData.salary_type} 
            onValueChange={(value: 'monthly' | 'daily') => setFormData({ ...formData, salary_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="salary">Salary Amount</Label>
          <Input 
            id="salary" 
            type="number" 
            placeholder="5000" 
            value={formData.base_salary || ''}
            onChange={(e) => setFormData({ ...formData, base_salary: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <Label className="text-base font-medium">Work Schedule</Label>
        <p className="text-sm text-muted-foreground mb-3">Set individual work hours for this employee</p>
        
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="work-start">Start Time</Label>
            <Input 
              id="work-start" 
              type="time" 
              value={formData.work_start_time}
              onChange={(e) => setFormData({ ...formData, work_start_time: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="work-end">End Time</Label>
            <Input 
              id="work-end" 
              type="time" 
              value={formData.work_end_time}
              onChange={(e) => setFormData({ ...formData, work_end_time: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="break">Break (min)</Label>
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
        <Label>Weekend Days</Label>
        <div className="flex flex-wrap gap-3">
          {WEEKDAYS.map((day) => (
            <div key={day.id} className="flex items-center space-x-2">
              <Checkbox 
                id={`add-${day.id}`}
                checked={formData.weekend_days?.includes(day.id)}
                onCheckedChange={() => handleWeekendToggle(day.id)}
              />
              <Label htmlFor={`add-${day.id}`} className="text-sm font-normal cursor-pointer">
                {day.label}
              </Label>
            </div>
          ))}
        </div>
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
  onClose: () => void;
  onSubmit: (data: Partial<EmployeeFormData>) => Promise<void>;
  isLoading: boolean;
}

const EditEmployeeForm = ({ employee, onClose, onSubmit, isLoading }: EditEmployeeFormProps) => {
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit-name">Full Name</Label>
          <Input 
            id="edit-name" 
            required 
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-email">Email</Label>
          <Input 
            id="edit-email" 
            type="email" 
            required 
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
          <Label>Status</Label>
          <Select 
            value={formData.is_active ? 'active' : 'inactive'} 
            onValueChange={(value) => setFormData({ ...formData, is_active: value === 'active' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Salary Type</Label>
          <Select 
            value={formData.salary_type} 
            onValueChange={(value: 'monthly' | 'daily') => setFormData({ ...formData, salary_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-salary">Salary Amount</Label>
          <Input 
            id="edit-salary" 
            type="number" 
            value={formData.base_salary || ''}
            onChange={(e) => setFormData({ ...formData, base_salary: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <Label className="text-base font-medium">Work Schedule</Label>
        <p className="text-sm text-muted-foreground mb-3">Individual work hours for this employee</p>
        
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="edit-work-start">Start Time</Label>
            <Input 
              id="edit-work-start" 
              type="time" 
              value={formData.work_start_time}
              onChange={(e) => setFormData({ ...formData, work_start_time: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-work-end">End Time</Label>
            <Input 
              id="edit-work-end" 
              type="time" 
              value={formData.work_end_time}
              onChange={(e) => setFormData({ ...formData, work_end_time: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-break">Break (min)</Label>
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
        <Label>Weekend Days</Label>
        <div className="flex flex-wrap gap-3">
          {WEEKDAYS.map((day) => (
            <div key={day.id} className="flex items-center space-x-2">
              <Checkbox 
                id={`edit-${day.id}`}
                checked={formData.weekend_days?.includes(day.id)}
                onCheckedChange={() => handleWeekendToggle(day.id)}
              />
              <Label htmlFor={`edit-${day.id}`} className="text-sm font-normal cursor-pointer">
                {day.label}
              </Label>
            </div>
          ))}
        </div>
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
