import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from '@/contexts/SuperAdminContext';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Building2, 
  Users, 
  Search,
  Eye,
  Ban,
  CheckCircle,
  Mail,
  Calendar,
  Clock
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  telegram_bot_connected: boolean;
  work_start_time: string;
  work_end_time: string;
  country_code: string;
  employee_count?: number;
  owner_email?: string;
  subscription_status?: string;
}

interface CompanyDetails {
  company: Company;
  employees: Array<{
    id: string;
    full_name: string;
    email: string;
    department: string | null;
    is_active: boolean;
  }>;
  subscription: {
    status: string;
    plan_name: string;
    current_period_end: string;
  } | null;
}

const SuperAdminCompanies = () => {
  const { isSuperAdmin } = useSuperAdmin();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchCompanies = async () => {
    try {
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (companiesError) throw companiesError;

      // Fetch employee counts
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('company_id');

      if (empError) throw empError;

      // Fetch profiles for owner emails
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('user_id, email');

      if (profError) throw profError;

      // Fetch subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('company_id, status');

      if (subError) throw subError;

      const enrichedCompanies = (companiesData || []).map(company => ({
        ...company,
        employee_count: (employees || []).filter(e => e.company_id === company.id).length,
        owner_email: (profiles || []).find(p => p.user_id === company.owner_id)?.email || 'غير معروف',
        subscription_status: (subscriptions || []).find(s => s.company_id === company.id)?.status || 'none',
      }));

      setCompanies(enrichedCompanies);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('فشل في تحميل الشركات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const viewCompanyDetails = async (company: Company) => {
    try {
      const [employeesRes, subscriptionRes] = await Promise.all([
        supabase
          .from('employees')
          .select('id, full_name, email, department, is_active')
          .eq('company_id', company.id),
        supabase
          .from('subscriptions')
          .select('status, plan_name, current_period_end')
          .eq('company_id', company.id)
          .maybeSingle(),
      ]);

      setSelectedCompany({
        company,
        employees: employeesRes.data || [],
        subscription: subscriptionRes.data,
      });
      setDetailsOpen(true);
    } catch (error) {
      console.error('Error fetching company details:', error);
      toast.error('فشل في تحميل تفاصيل الشركة');
    }
  };

  const toggleSubscription = async (companyId: string, currentStatus: string) => {
    if (!isSuperAdmin) {
      toast.error('ليس لديك صلاحية لتنفيذ هذا الإجراء');
      return;
    }

    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: newStatus })
        .eq('company_id', companyId);

      if (error) throw error;

      toast.success(newStatus === 'active' ? 'تم تفعيل الاشتراك' : 'تم إيقاف الاشتراك');
      fetchCompanies();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('فشل في تحديث الاشتراك');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">نشط</Badge>;
      case 'trial':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">تجريبي</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">موقوف</Badge>;
      case 'expired':
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">منتهي</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">غير محدد</Badge>;
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.owner_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">الشركات</h1>
            <p className="text-slate-400 mt-1">إدارة جميع الشركات في النظام</p>
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="البحث عن شركة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 w-full sm:w-64 bg-slate-900 border-slate-700 text-white"
            />
          </div>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-slate-800/50">
                  <TableHead className="text-slate-400">الشركة</TableHead>
                  <TableHead className="text-slate-400">البريد الإلكتروني</TableHead>
                  <TableHead className="text-slate-400">الموظفين</TableHead>
                  <TableHead className="text-slate-400">الاشتراك</TableHead>
                  <TableHead className="text-slate-400">تاريخ التسجيل</TableHead>
                  <TableHead className="text-slate-400">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : filteredCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                      لا توجد شركات
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompanies.map((company) => (
                    <TableRow key={company.id} className="border-slate-800 hover:bg-slate-800/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <span className="text-white font-medium">{company.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">{company.owner_email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-300">
                          <Users className="w-4 h-4" />
                          {company.employee_count}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(company.subscription_status || 'none')}</TableCell>
                      <TableCell className="text-slate-300">
                        {new Date(company.created_at).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewCompanyDetails(company)}
                            className="text-slate-300 hover:text-white"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSubscription(company.id, company.subscription_status || '')}
                              className={company.subscription_status === 'active' || company.subscription_status === 'trial'
                                ? 'text-red-400 hover:text-red-300'
                                : 'text-green-400 hover:text-green-300'
                              }
                            >
                              {company.subscription_status === 'active' || company.subscription_status === 'trial' 
                                ? <Ban className="w-4 h-4" />
                                : <CheckCircle className="w-4 h-4" />
                              }
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Company Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-primary" />
                {selectedCompany?.company.name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedCompany && (
              <div className="space-y-6 mt-4">
                {/* Company Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-800/50">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">البريد الإلكتروني</span>
                    </div>
                    <p className="text-white">{selectedCompany.company.owner_email}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800/50">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">تاريخ التسجيل</span>
                    </div>
                    <p className="text-white">
                      {new Date(selectedCompany.company.created_at).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800/50">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">أوقات العمل</span>
                    </div>
                    <p className="text-white">
                      {selectedCompany.company.work_start_time} - {selectedCompany.company.work_end_time}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800/50">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">عدد الموظفين</span>
                    </div>
                    <p className="text-white">{selectedCompany.employees.length}</p>
                  </div>
                </div>

                {/* Subscription Info */}
                {selectedCompany.subscription && (
                  <div className="p-4 rounded-xl bg-slate-800/50">
                    <h4 className="text-slate-400 text-sm mb-2">الاشتراك</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{selectedCompany.subscription.plan_name}</p>
                        <p className="text-slate-400 text-sm">
                          ينتهي: {new Date(selectedCompany.subscription.current_period_end).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                      {getStatusBadge(selectedCompany.subscription.status)}
                    </div>
                  </div>
                )}

                {/* Employees List */}
                <div>
                  <h4 className="text-slate-400 text-sm mb-3">الموظفين</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedCompany.employees.map((employee) => (
                      <div 
                        key={employee.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50"
                      >
                        <div>
                          <p className="text-white">{employee.full_name}</p>
                          <p className="text-slate-400 text-xs">{employee.email}</p>
                        </div>
                        <Badge 
                          className={employee.is_active 
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                          }
                        >
                          {employee.is_active ? 'نشط' : 'غير نشط'}
                        </Badge>
                      </div>
                    ))}
                    {selectedCompany.employees.length === 0 && (
                      <p className="text-slate-400 text-center py-4">لا يوجد موظفين</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminCompanies;
