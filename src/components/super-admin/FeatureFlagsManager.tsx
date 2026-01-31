import { useState } from 'react';
import { motion } from 'framer-motion';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Settings,
  Building2,
  CreditCard,
  Search,
  Power,
  PowerOff,
  AlertTriangle,
  CheckCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Company {
  id: string;
  name: string;
}

interface Plan {
  id: string;
  name: string;
  name_ar: string | null;
}

export const FeatureFlagsManager = () => {
  const { 
    features, 
    companyOverrides, 
    planFeatures,
    loading, 
    toggleGlobalFeature,
    setCompanyFeature,
    removeCompanyOverride,
    setPlanFeature,
    refetch
  } = useFeatureFlags();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadCompanies = async () => {
    const { data } = await supabase.from('companies').select('id, name').order('name');
    setCompanies(data || []);
  };

  const loadPlans = async () => {
    const { data } = await supabase.from('subscription_plans').select('id, name, name_ar').order('name');
    setPlans(data || []);
  };

  const openCompanyDialog = async (company: Company) => {
    setSelectedCompany(company);
    setCompanyDialogOpen(true);
  };

  const openPlanDialog = async (plan: Plan) => {
    setSelectedPlan(plan);
    setPlanDialogOpen(true);
  };

  const getCompanyFeatureStatus = (companyId: string, featureId: string) => {
    const override = companyOverrides.find(o => o.company_id === companyId && o.feature_id === featureId);
    if (override) return { hasOverride: true, enabled: override.is_enabled };
    
    const feature = features.find(f => f.id === featureId);
    return { hasOverride: false, enabled: feature?.is_enabled_globally ?? true };
  };

  const getPlanFeatureStatus = (planId: string, featureId: string) => {
    const planFeature = planFeatures.find(p => p.plan_id === planId && p.feature_id === featureId);
    if (planFeature) return { hasConfig: true, included: planFeature.is_included };
    
    return { hasConfig: false, included: true };
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'module': return 'وحدة';
      case 'feature': return 'ميزة';
      case 'ui': return 'واجهة';
      default: return category;
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-slate-400 mt-4">جاري تحميل الميزات...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="global" className="space-y-6">
        <TabsList className="bg-slate-900 border-slate-800">
          <TabsTrigger value="global" className="data-[state=active]:bg-primary gap-2">
            <Settings className="w-4 h-4" />
            الإعدادات العامة
          </TabsTrigger>
          <TabsTrigger value="companies" className="data-[state=active]:bg-primary gap-2" onClick={loadCompanies}>
            <Building2 className="w-4 h-4" />
            حسب الشركة
          </TabsTrigger>
          <TabsTrigger value="plans" className="data-[state=active]:bg-primary gap-2" onClick={loadPlans}>
            <CreditCard className="w-4 h-4" />
            حسب الباقة
          </TabsTrigger>
        </TabsList>

        {/* Global Features Tab */}
        <TabsContent value="global">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                التحكم العام في الميزات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          feature.is_enabled_globally ? 'bg-green-500/20' : 'bg-slate-700'
                        }`}>
                          {feature.is_enabled_globally ? (
                            <ToggleRight className="w-5 h-5 text-green-400" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">{feature.name_ar || feature.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-slate-700 text-slate-300 text-xs">
                              {getCategoryLabel(feature.category)}
                            </Badge>
                            {feature.description && (
                              <span className="text-slate-500 text-xs truncate max-w-[200px]">
                                {feature.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={feature.is_enabled_globally}
                        onCheckedChange={(checked) => toggleGlobalFeature(feature.id, checked)}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Per Company Tab */}
        <TabsContent value="companies">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                التحكم حسب الشركة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="البحث عن شركة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10 bg-slate-800 border-slate-700"
                  />
                </div>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {filteredCompanies.map((company) => {
                    const hasOverrides = companyOverrides.some(o => o.company_id === company.id);
                    return (
                      <div
                        key={company.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition-colors"
                        onClick={() => openCompanyDialog(company)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{company.name}</p>
                            {hasOverrides && (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs mt-1">
                                تخصيص نشط
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                  {filteredCompanies.length === 0 && (
                    <p className="text-slate-400 text-center py-8">لا توجد شركات</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Per Plan Tab */}
        <TabsContent value="plans">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                التحكم حسب الباقة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition-colors"
                    onClick={() => openPlanDialog(plan)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{plan.name_ar || plan.name}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {plans.length === 0 && (
                  <p className="text-slate-400 text-center py-8">لا توجد باقات</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Company Features Dialog */}
      <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              تخصيص ميزات: {selectedCompany?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {features.map((feature) => {
              const status = selectedCompany ? getCompanyFeatureStatus(selectedCompany.id, feature.id) : { hasOverride: false, enabled: true };
              return (
                <div
                  key={feature.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      status.enabled ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      {status.enabled ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <PowerOff className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-white text-sm">{feature.name_ar || feature.name}</p>
                      {status.hasOverride && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                          مُخصص
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={status.enabled}
                      onCheckedChange={(checked) => {
                        if (selectedCompany) {
                          setCompanyFeature(selectedCompany.id, feature.id, checked);
                        }
                      }}
                    />
                    {status.hasOverride && selectedCompany && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCompanyOverride(selectedCompany.id, feature.id)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        إزالة
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Plan Features Dialog */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              ميزات الباقة: {selectedPlan?.name_ar || selectedPlan?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {features.map((feature) => {
              const status = selectedPlan ? getPlanFeatureStatus(selectedPlan.id, feature.id) : { hasConfig: false, included: true };
              return (
                <div
                  key={feature.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      status.included ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      {status.included ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <PowerOff className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-white text-sm">{feature.name_ar || feature.name}</p>
                    </div>
                  </div>
                  <Switch
                    checked={status.included}
                    onCheckedChange={(checked) => {
                      if (selectedPlan) {
                        setPlanFeature(selectedPlan.id, feature.id, checked);
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
