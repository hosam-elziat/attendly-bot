import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FeatureFlag {
  id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  category: string;
  is_enabled_globally: boolean;
  created_at: string;
  updated_at: string;
}

interface CompanyFeatureOverride {
  id: string;
  company_id: string;
  feature_id: string;
  is_enabled: boolean;
  override_reason: string | null;
  overridden_at: string;
}

interface PlanFeature {
  id: string;
  plan_id: string;
  feature_id: string;
  is_included: boolean;
}

export const useFeatureFlags = () => {
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [companyOverrides, setCompanyOverrides] = useState<CompanyFeatureOverride[]>([]);
  const [planFeatures, setPlanFeatures] = useState<PlanFeature[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeatures = useCallback(async () => {
    try {
      const [featuresRes, overridesRes, planFeaturesRes] = await Promise.all([
        supabase.from('feature_flags').select('*').order('category', { ascending: true }),
        supabase.from('company_feature_overrides').select('*'),
        supabase.from('plan_features').select('*'),
      ]);

      if (featuresRes.error) throw featuresRes.error;
      if (overridesRes.error) throw overridesRes.error;
      if (planFeaturesRes.error) throw planFeaturesRes.error;

      setFeatures(featuresRes.data || []);
      setCompanyOverrides(overridesRes.data || []);
      setPlanFeatures(planFeaturesRes.data || []);
    } catch (error) {
      console.error('Error fetching features:', error);
      toast.error('فشل في تحميل الميزات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  const toggleGlobalFeature = async (featureId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ is_enabled_globally: enabled, updated_at: new Date().toISOString() })
        .eq('id', featureId);

      if (error) throw error;
      toast.success(enabled ? 'تم تفعيل الميزة' : 'تم تعطيل الميزة');
      fetchFeatures();
    } catch (error) {
      console.error('Error toggling feature:', error);
      toast.error('فشل في تحديث الميزة');
    }
  };

  const setCompanyFeature = async (companyId: string, featureId: string, enabled: boolean, reason?: string) => {
    try {
      const existing = companyOverrides.find(o => o.company_id === companyId && o.feature_id === featureId);
      
      if (existing) {
        const { error } = await supabase
          .from('company_feature_overrides')
          .update({ is_enabled: enabled, override_reason: reason || null, overridden_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_feature_overrides')
          .insert({ company_id: companyId, feature_id: featureId, is_enabled: enabled, override_reason: reason });
        if (error) throw error;
      }

      toast.success('تم تحديث إعدادات الشركة');
      fetchFeatures();
    } catch (error) {
      console.error('Error setting company feature:', error);
      toast.error('فشل في تحديث الإعدادات');
    }
  };

  const removeCompanyOverride = async (companyId: string, featureId: string) => {
    try {
      const { error } = await supabase
        .from('company_feature_overrides')
        .delete()
        .eq('company_id', companyId)
        .eq('feature_id', featureId);

      if (error) throw error;
      toast.success('تم إزالة التخصيص');
      fetchFeatures();
    } catch (error) {
      console.error('Error removing override:', error);
      toast.error('فشل في إزالة التخصيص');
    }
  };

  const setPlanFeature = async (planId: string, featureId: string, included: boolean) => {
    try {
      const existing = planFeatures.find(p => p.plan_id === planId && p.feature_id === featureId);
      
      if (existing) {
        const { error } = await supabase
          .from('plan_features')
          .update({ is_included: included })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('plan_features')
          .insert({ plan_id: planId, feature_id: featureId, is_included: included });
        if (error) throw error;
      }

      toast.success('تم تحديث ميزات الباقة');
      fetchFeatures();
    } catch (error) {
      console.error('Error setting plan feature:', error);
      toast.error('فشل في تحديث الباقة');
    }
  };

  const getCompanyFeatureStatus = (companyId: string, featureName: string): boolean => {
    const feature = features.find(f => f.name === featureName);
    if (!feature) return true;
    
    const override = companyOverrides.find(o => o.company_id === companyId && o.feature_id === feature.id);
    if (override) return override.is_enabled;
    
    return feature.is_enabled_globally;
  };

  return {
    features,
    companyOverrides,
    planFeatures,
    loading,
    toggleGlobalFeature,
    setCompanyFeature,
    removeCompanyOverride,
    setPlanFeature,
    getCompanyFeatureStatus,
    refetch: fetchFeatures,
  };
};
