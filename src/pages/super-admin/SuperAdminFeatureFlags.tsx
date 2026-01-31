import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { FeatureFlagsManager } from '@/components/super-admin/FeatureFlagsManager';

const SuperAdminFeatureFlags = () => {
  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">التحكم في الميزات</h1>
          <p className="text-slate-400 mt-1">
            تفعيل وتعطيل الميزات على مستوى النظام أو لكل شركة/باقة
          </p>
        </div>

        <FeatureFlagsManager />
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminFeatureFlags;
