import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, User, Building } from 'lucide-react';

interface EmployeeSelectorProps {
  selectedEmployeeIds: string[];
  onSelectionChange: (ids: string[]) => void;
  companyFilter?: string; // Optional: filter by specific company
}

const EmployeeSelector = ({ selectedEmployeeIds, onSelectionChange, companyFilter }: EmployeeSelectorProps) => {
  const [search, setSearch] = useState('');

  const { data: employees, isLoading } = useQuery({
    queryKey: ['admin-employees-selector', companyFilter],
    queryFn: async () => {
      let query = supabase
        .from('employees')
        .select(`
          id,
          full_name,
          email,
          telegram_chat_id,
          company:companies(id, name)
        `)
        .eq('is_active', true)
        .not('telegram_chat_id', 'is', null)
        .order('full_name');

      if (companyFilter) {
        query = query.eq('company_id', companyFilter);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const filteredEmployees = employees?.filter(emp => 
    emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
    emp.email.toLowerCase().includes(search.toLowerCase()) ||
    (emp.company as any)?.name?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const toggleEmployee = (empId: string) => {
    if (selectedEmployeeIds.includes(empId)) {
      onSelectionChange(selectedEmployeeIds.filter(id => id !== empId));
    } else {
      onSelectionChange([...selectedEmployeeIds, empId]);
    }
  };

  const toggleAll = () => {
    if (selectedEmployeeIds.length === filteredEmployees.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredEmployees.map(e => e.id));
    }
  };

  return (
    <div className="space-y-3 p-3 bg-slate-800 rounded-lg">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث عن موظف..."
          className="ps-9 bg-slate-700 border-slate-600"
        />
      </div>

      <div className="flex items-center justify-between py-2 border-b border-slate-600">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={filteredEmployees.length > 0 && selectedEmployeeIds.length === filteredEmployees.length}
            onCheckedChange={toggleAll}
          />
          <span className="text-sm text-slate-300">تحديد الكل</span>
        </label>
        <Badge variant="secondary">
          {selectedEmployeeIds.length} محدد
        </Badge>
      </div>

      <ScrollArea className="h-[300px]">
        {isLoading ? (
          <div className="text-center py-4 text-slate-400">جاري التحميل...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-4 text-slate-400">لا يوجد موظفين متصلين بالتيليجرام</div>
        ) : (
          <div className="space-y-2">
            {filteredEmployees.map((emp) => (
              <label
                key={emp.id}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  selectedEmployeeIds.includes(emp.id)
                    ? 'bg-primary/20 border border-primary/30'
                    : 'bg-slate-700/50 hover:bg-slate-700'
                }`}
              >
                <Checkbox
                  checked={selectedEmployeeIds.includes(emp.id)}
                  onCheckedChange={() => toggleEmployee(emp.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-slate-400" />
                    <span className="text-sm text-white truncate">{emp.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Building className="w-3 h-3 text-slate-500" />
                    <span className="text-xs text-slate-400 truncate">
                      {(emp.company as any)?.name || 'غير محدد'}
                    </span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default EmployeeSelector;
