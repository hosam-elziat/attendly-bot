import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ShieldCheck, MapPin, UserCheck, Lock, Loader2, Building, Wifi } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEmployees } from '@/hooks/useEmployees';

interface EmployeeVerificationSettingsProps {
  employee: any;
  company: any;
  onSuccess: () => void;
}

const EmployeeVerificationSettings = ({ employee, company, onSuccess }: EmployeeVerificationSettingsProps) => {
  const [saving, setSaving] = useState(false);
  const { data: employees = [] } = useEmployees();
  
  // Verification level (null = use company default, 1, 2, 3)
  const [useCompanyDefault, setUseCompanyDefault] = useState(true);
  const [verificationLevel, setVerificationLevel] = useState<number | null>(null);
  
  // Level 2 settings
  const [approverType, setApproverType] = useState<'direct_manager' | 'specific_person'>('direct_manager');
  const [approverId, setApproverId] = useState<string | null>(null);
  
  // WiFi IPs for level 3
  const [allowedWifiIps, setAllowedWifiIps] = useState<string>('');

  useEffect(() => {
    if (employee) {
      const empLevel = (employee as any).attendance_verification_level;
      setUseCompanyDefault(empLevel === null || empLevel === undefined);
      setVerificationLevel(empLevel || (company as any)?.attendance_verification_level || 1);
      setApproverType((employee as any).attendance_approver_type || 'direct_manager');
      setApproverId((employee as any).attendance_approver_id || null);
      setAllowedWifiIps(((employee as any).allowed_wifi_ips || []).join(', '));
    }
  }, [employee, company]);

  const handleSave = async () => {
    if (!employee?.id) {
      toast.error('لم يتم العثور على الموظف');
      return;
    }

    setSaving(true);
    
    try {
      const updateData: any = {
        attendance_verification_level: useCompanyDefault ? null : verificationLevel,
        attendance_approver_type: useCompanyDefault ? null : approverType,
        attendance_approver_id: !useCompanyDefault && approverType === 'specific_person' ? approverId : null,
      };

      // Parse WiFi IPs
      if (allowedWifiIps.trim()) {
        updateData.allowed_wifi_ips = allowedWifiIps.split(',').map(ip => ip.trim()).filter(ip => ip);
      } else {
        updateData.allowed_wifi_ips = null;
      }

      const { error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', employee.id);

      if (error) throw error;
      
      onSuccess();
      toast.success('تم حفظ إعدادات التحقق للموظف');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('فشل في الحفظ: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const companyLevel = (company as any)?.attendance_verification_level || 1;
  const getLevelName = (level: number) => {
    switch (level) {
      case 1: return 'بدون تأكيد';
      case 2: return 'موافقة المدير';
      case 3: return 'التحقق من الموقع';
      default: return 'غير محدد';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="w-5 h-5 text-primary" />
          إعدادات التحقق من الحضور
        </CardTitle>
        <CardDescription>
          تحديد مستوى التحقق المطلوب لهذا الموظف
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Use Company Default */}
        <div className="flex items-center space-x-3 rtl:space-x-reverse p-3 bg-muted/50 rounded-lg">
          <input 
            type="checkbox" 
            id="use-default"
            checked={useCompanyDefault}
            onChange={(e) => setUseCompanyDefault(e.target.checked)}
            className="w-4 h-4"
          />
          <Label htmlFor="use-default" className="cursor-pointer flex-1">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-muted-foreground" />
              استخدام الإعداد الافتراضي للشركة
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              المستوى الحالي للشركة: {getLevelName(companyLevel)}
            </p>
          </Label>
        </div>

        {/* Custom Settings */}
        {!useCompanyDefault && (
          <div className="space-y-4 p-4 border rounded-lg">
            <Label className="font-medium">مستوى التحقق المخصص</Label>
            <RadioGroup 
              value={verificationLevel?.toString() || '1'} 
              onValueChange={(v) => setVerificationLevel(parseInt(v))}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <RadioGroupItem value="1" id="emp-level-1" />
                <Label htmlFor="emp-level-1" className="cursor-pointer flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  بدون تأكيد
                </Label>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <RadioGroupItem value="2" id="emp-level-2" />
                <Label htmlFor="emp-level-2" className="cursor-pointer flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-amber-500" />
                  موافقة المدير
                </Label>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <RadioGroupItem value="3" id="emp-level-3" />
                <Label htmlFor="emp-level-3" className="cursor-pointer flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-destructive" />
                  التحقق من الموقع
                </Label>
              </div>
            </RadioGroup>

            {/* Level 2 Approver */}
            {verificationLevel === 2 && (
              <div className="space-y-3 mt-4 p-3 bg-amber-500/10 rounded-lg">
                <Label>من يوافق على حضور هذا الموظف؟</Label>
                <RadioGroup 
                  value={approverType} 
                  onValueChange={(v) => setApproverType(v as 'direct_manager' | 'specific_person')}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <RadioGroupItem value="direct_manager" id="emp-direct" />
                    <Label htmlFor="emp-direct" className="cursor-pointer">المدير المباشر</Label>
                  </div>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <RadioGroupItem value="specific_person" id="emp-specific" />
                    <Label htmlFor="emp-specific" className="cursor-pointer">شخص محدد</Label>
                  </div>
                </RadioGroup>

                {approverType === 'specific_person' && (
                  <Select value={approverId || ''} onValueChange={setApproverId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر موظف..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.filter(e => e.id !== employee.id).map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Level 3 WiFi IPs */}
            {verificationLevel === 3 && (
              <div className="space-y-3 mt-4 p-3 bg-destructive/10 rounded-lg">
                <Label className="flex items-center gap-2">
                  <Wifi className="w-4 h-4" />
                  عناوين IP المسموحة (WiFi الشركة)
                </Label>
                <Input 
                  placeholder="مثال: 192.168.1.1, 10.0.0.1"
                  value={allowedWifiIps}
                  onChange={(e) => setAllowedWifiIps(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  افصل بين العناوين بفاصلة. يستخدم للتحقق من اتصال الموظف بشبكة الشركة.
                </p>
              </div>
            )}
          </div>
        )}

        <Button onClick={handleSave} className="btn-primary-gradient" disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
          حفظ
        </Button>
      </CardContent>
    </Card>
  );
};

export default EmployeeVerificationSettings;
