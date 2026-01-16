import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ShieldCheck, MapPin, UserCheck, Lock, Loader2, Building, Wifi, Camera, Map, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEmployees } from '@/hooks/useEmployees';

interface EmployeeVerificationSettingsProps {
  employee: any;
  company: any;
  onSuccess: () => void;
}

// Level 3 verification options
const LEVEL3_OPTIONS = [
  { id: 'location', label: 'الموقع الجغرافي (GPS)', icon: Map },
  { id: 'selfie', label: 'صورة سيلفي', icon: Camera },
  { id: 'wifi_ip', label: 'عنوان IP (WiFi الشركة)', icon: Wifi },
];

const EmployeeVerificationSettings = ({ employee, company, onSuccess }: EmployeeVerificationSettingsProps) => {
  const [saving, setSaving] = useState(false);
  const { data: employees = [] } = useEmployees();
  
  // Verification level (null = use company default, 1, 2, 3)
  const [useCompanyDefault, setUseCompanyDefault] = useState(true);
  const [verificationLevel, setVerificationLevel] = useState<number | null>(null);
  
  // Level 2 settings
  const [approverType, setApproverType] = useState<'direct_manager' | 'specific_person'>('direct_manager');
  const [approverId, setApproverId] = useState<string | null>(null);
  
  // Level 3 settings - multiple selection
  const [level3Requirements, setLevel3Requirements] = useState<string[]>(['location']);
  const [allowedWifiIps, setAllowedWifiIps] = useState<string>('');

  useEffect(() => {
    if (employee) {
      const empLevel = (employee as any).attendance_verification_level;
      setUseCompanyDefault(empLevel === null || empLevel === undefined);
      setVerificationLevel(empLevel || (company as any)?.attendance_verification_level || 1);
      setApproverType((employee as any).attendance_approver_type || 'direct_manager');
      setApproverId((employee as any).attendance_approver_id || null);
      setAllowedWifiIps(((employee as any).allowed_wifi_ips || []).join(', '));
      
      // Parse level 3 requirements from employee or company settings
      const empLevel3Mode = (employee as any).level3_verification_mode;
      const companyLevel3Mode = (company as any)?.level3_verification_mode || 'location_only';
      const mode = empLevel3Mode || companyLevel3Mode;
      
      // Convert mode string to array of requirements
      const requirements: string[] = [];
      if (mode.includes('location')) requirements.push('location');
      if (mode.includes('selfie')) requirements.push('selfie');
      if (mode.includes('ip')) requirements.push('wifi_ip');
      if (requirements.length === 0) requirements.push('location');
      setLevel3Requirements(requirements);
    }
  }, [employee, company]);

  const handleLevel3RequirementChange = (requirementId: string, checked: boolean) => {
    setLevel3Requirements(prev => {
      if (checked) {
        return [...prev, requirementId];
      } else {
        // Ensure at least one requirement is selected
        const newReqs = prev.filter(r => r !== requirementId);
        return newReqs.length > 0 ? newReqs : prev;
      }
    });
  };

  const getLevel3ModeString = (): string => {
    const hasLocation = level3Requirements.includes('location');
    const hasSelfie = level3Requirements.includes('selfie');
    const hasIp = level3Requirements.includes('wifi_ip');

    if (hasLocation && hasSelfie && hasIp) return 'location_selfie_ip';
    if (hasLocation && hasSelfie) return 'location_selfie';
    if (hasLocation && hasIp) return 'location_ip';
    if (hasSelfie && hasIp) return 'selfie_ip';
    if (hasLocation) return 'location_only';
    if (hasSelfie) return 'selfie_only';
    if (hasIp) return 'ip_only';
    return 'location_only';
  };

  const handleSave = async () => {
    if (!employee?.id) {
      toast.error('لم يتم العثور على الموظف');
      return;
    }

    // Validate level 3 settings
    if (!useCompanyDefault && verificationLevel === 3) {
      if (level3Requirements.length === 0) {
        toast.error('يجب اختيار طريقة تحقق واحدة على الأقل');
        return;
      }
      if (level3Requirements.includes('wifi_ip') && !allowedWifiIps.trim()) {
        toast.error('يجب إدخال عناوين IP المسموحة عند اختيار التحقق بـ WiFi');
        return;
      }
    }

    setSaving(true);
    
    try {
      const updateData: any = {
        attendance_verification_level: useCompanyDefault ? null : verificationLevel,
        attendance_approver_type: useCompanyDefault ? null : approverType,
        attendance_approver_id: !useCompanyDefault && approverType === 'specific_person' ? approverId : null,
        level3_verification_mode: !useCompanyDefault && verificationLevel === 3 ? getLevel3ModeString() : null,
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
  const companyLevel3Mode = (company as any)?.level3_verification_mode || 'location_only';
  
  const getLevelName = (level: number) => {
    switch (level) {
      case 1: return 'بدون تأكيد';
      case 2: return 'موافقة المدير';
      case 3: return 'التحقق من الموقع/البيانات';
      default: return 'غير محدد';
    }
  };

  const getLevel3ModeLabel = (mode: string) => {
    switch (mode) {
      case 'location_only': return 'الموقع فقط';
      case 'location_selfie': return 'الموقع + سيلفي';
      case 'location_ip': return 'الموقع + WiFi IP';
      case 'location_selfie_ip': return 'الموقع + سيلفي + WiFi IP';
      case 'selfie_only': return 'سيلفي فقط';
      case 'ip_only': return 'WiFi IP فقط';
      case 'selfie_ip': return 'سيلفي + WiFi IP';
      default: return mode;
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
              المستوى الحالي: {getLevelName(companyLevel)}
              {companyLevel === 3 && ` (${getLevel3ModeLabel(companyLevel3Mode)})`}
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
                  التحقق من الموقع/البيانات
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

            {/* Level 3 Multi-Select Requirements */}
            {verificationLevel === 3 && (
              <div className="space-y-4 mt-4 p-4 bg-destructive/10 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-destructive" />
                  <Label className="font-medium">متطلبات التحقق (اختر واحدة أو أكثر)</Label>
                </div>
                
                <div className="space-y-3">
                  {LEVEL3_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isChecked = level3Requirements.includes(option.id);
                    return (
                      <div 
                        key={option.id}
                        className={`flex items-center space-x-3 rtl:space-x-reverse p-3 border rounded-lg transition-colors ${
                          isChecked ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                      >
                        <Checkbox 
                          id={`req-${option.id}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => 
                            handleLevel3RequirementChange(option.id, checked as boolean)
                          }
                        />
                        <Label 
                          htmlFor={`req-${option.id}`} 
                          className="cursor-pointer flex items-center gap-2 flex-1"
                        >
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          {option.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>

                {/* WiFi IPs if selected */}
                {level3Requirements.includes('wifi_ip') && (
                  <div className="space-y-2 mt-4 p-3 bg-background rounded-lg border">
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

                {/* Summary of selected requirements */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm">
                    <AlertTriangle className="w-4 h-4 inline-block me-1 text-amber-500" />
                    <strong>المتطلبات المحددة:</strong>{' '}
                    {level3Requirements.map(r => {
                      const opt = LEVEL3_OPTIONS.find(o => o.id === r);
                      return opt?.label;
                    }).filter(Boolean).join(' + ')}
                  </p>
                </div>
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
