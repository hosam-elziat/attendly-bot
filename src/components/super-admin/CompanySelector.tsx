import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Building, X } from 'lucide-react';

interface CompanySelectorProps {
  selectedCompanyIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

interface Company {
  id: string;
  name: string;
  subscription?: {
    plan_name: string;
  };
}

const CompanySelector = ({ selectedCompanyIds, onSelectionChange }: CompanySelectorProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['admin-companies-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          subscriptions(plan_name)
        `)
        .eq('is_deleted', false)
        .eq('is_suspended', false)
        .eq('telegram_bot_connected', true)
        .order('name');

      if (error) throw error;
      return (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        subscription: c.subscriptions?.[0] || null,
      })) as Company[];
    },
  });

  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const query = searchQuery.toLowerCase();
    return companies.filter(c => c.name.toLowerCase().includes(query));
  }, [companies, searchQuery]);

  const handleToggle = (companyId: string) => {
    if (selectedCompanyIds.includes(companyId)) {
      onSelectionChange(selectedCompanyIds.filter(id => id !== companyId));
    } else {
      onSelectionChange([...selectedCompanyIds, companyId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedCompanyIds.length === filteredCompanies.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredCompanies.map(c => c.id));
    }
  };

  const selectedCompanies = companies.filter(c => selectedCompanyIds.includes(c.id));

  return (
    <div className="space-y-3">
      {/* Selected companies badges */}
      {selectedCompanies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCompanies.slice(0, 5).map((company) => (
            <Badge
              key={company.id}
              variant="secondary"
              className="flex items-center gap-1 cursor-pointer hover:bg-destructive/20"
              onClick={() => handleToggle(company.id)}
            >
              {company.name}
              <X className="w-3 h-3" />
            </Badge>
          ))}
          {selectedCompanies.length > 5 && (
            <Badge variant="outline">+{selectedCompanies.length - 5} أخرى</Badge>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="بحث عن شركة..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10 bg-slate-800 border-slate-600"
        />
      </div>

      {/* Select all */}
      <div className="flex items-center justify-between text-sm text-slate-400">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={selectedCompanyIds.length === filteredCompanies.length && filteredCompanies.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <span>تحديد الكل ({filteredCompanies.length})</span>
        </label>
        <span>{selectedCompanyIds.length} محددة</span>
      </div>

      {/* Companies list */}
      <ScrollArea className="h-48 rounded-md border border-slate-700">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="text-center py-4 text-slate-400">جاري التحميل...</div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-4 text-slate-400">لا توجد شركات</div>
          ) : (
            filteredCompanies.map((company) => (
              <label
                key={company.id}
                className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer"
              >
                <Checkbox
                  checked={selectedCompanyIds.includes(company.id)}
                  onCheckedChange={() => handleToggle(company.id)}
                />
                <Building className="w-4 h-4 text-slate-400" />
                <span className="text-white flex-1">{company.name}</span>
                {company.subscription?.plan_name && (
                  <Badge variant="outline" className="text-xs">
                    {company.subscription.plan_name}
                  </Badge>
                )}
              </label>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default CompanySelector;
