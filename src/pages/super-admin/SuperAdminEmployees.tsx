import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Users, 
  Search,
  Building2,
  Mail,
  Phone
} from 'lucide-react';

interface Employee {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  is_active: boolean;
  company_id: string;
  company_name?: string;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
}

const SuperAdminEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [employeesRes, companiesRes] = await Promise.all([
          supabase
            .from('employees')
            .select('id, full_name, email, phone, department, is_active, company_id, created_at')
            .order('created_at', { ascending: false }),
          supabase
            .from('companies')
            .select('id, name'),
        ]);

        if (employeesRes.error) throw employeesRes.error;
        if (companiesRes.error) throw companiesRes.error;

        const enrichedEmployees = (employeesRes.data || []).map(emp => ({
          ...emp,
          company_name: (companiesRes.data || []).find(c => c.id === emp.company_id)?.name || 'غير معروف',
        }));

        setEmployees(enrichedEmployees);
        setCompanies(companiesRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('فشل في تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      employee.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.company_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCompany = selectedCompany === 'all' || employee.company_id === selectedCompany;

    return matchesSearch && matchesCompany;
  });

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">الموظفين</h1>
          <p className="text-slate-400 mt-1">عرض جميع الموظفين في النظام</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="البحث عن موظف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 bg-slate-900 border-slate-700 text-white"
            />
          </div>
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-full sm:w-64 bg-slate-900 border-slate-700 text-white">
              <SelectValue placeholder="جميع الشركات" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all" className="text-white">جميع الشركات</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id} className="text-white">
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{employees.length}</p>
                  <p className="text-slate-400 text-sm">إجمالي الموظفين</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {employees.filter(e => e.is_active).length}
                  </p>
                  <p className="text-slate-400 text-sm">موظفين نشطين</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{companies.length}</p>
                  <p className="text-slate-400 text-sm">شركات</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employees Table */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-slate-800/50">
                  <TableHead className="text-slate-400">الموظف</TableHead>
                  <TableHead className="text-slate-400">البريد الإلكتروني</TableHead>
                  <TableHead className="text-slate-400">الهاتف</TableHead>
                  <TableHead className="text-slate-400">القسم</TableHead>
                  <TableHead className="text-slate-400">الشركة</TableHead>
                  <TableHead className="text-slate-400">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                      لا يوجد موظفين
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.id} className="border-slate-800 hover:bg-slate-800/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-primary font-medium">
                              {employee.full_name.charAt(0)}
                            </span>
                          </div>
                          <span className="text-white font-medium">{employee.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-300">
                          <Mail className="w-4 h-4" />
                          {employee.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {employee.phone ? (
                          <div className="flex items-center gap-2 text-slate-300">
                            <Phone className="w-4 h-4" />
                            {employee.phone}
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {employee.department || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-300">
                          <Building2 className="w-4 h-4" />
                          {employee.company_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={employee.is_active 
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                          }
                        >
                          {employee.is_active ? 'نشط' : 'غير نشط'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminEmployees;
