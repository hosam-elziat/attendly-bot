import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ShieldCheck, MapPin, UserCheck, Lock, Loader2, Wifi, Camera, Map, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePositions } from '@/hooks/usePositions';
import { useEmployees } from '@/hooks/useEmployees';

interface AttendanceVerificationSettingsProps {
  company: any;
  onRefetch: () => void;
}

const AttendanceVerificationSettings = ({ company, onRefetch }: AttendanceVerificationSettingsProps) => {
  const [saving, setSaving] = useState(false);
  const { data: positions = [] } = usePositions();
  const { data: employees = [] } = useEmployees();
  
  // Verification level (1, 2, 3)
  const [verificationLevel, setVerificationLevel] = useState(1);
  
  // Level 2 settings
  const [approverType, setApproverType] = useState<'direct_manager' | 'specific_person'>('direct_manager');
  const [approverId, setApproverId] = useState<string | null>(null);
  
  // Level 3 settings
  const [level3Mode, setLevel3Mode] = useState<string>('location_only');
  const [companyLatitude, setCompanyLatitude] = useState<string>('');
  const [companyLongitude, setCompanyLongitude] = useState<string>('');
  const [locationRadius, setLocationRadius] = useState(100);

  useEffect(() => {
    if (company) {
      setVerificationLevel((company as any).attendance_verification_level || 1);
      setApproverType((company as any).attendance_approver_type || 'direct_manager');
      setApproverId((company as any).attendance_approver_id || null);
      setLevel3Mode((company as any).level3_verification_mode || 'location_only');
      setCompanyLatitude((company as any).company_latitude?.toString() || '');
      setCompanyLongitude((company as any).company_longitude?.toString() || '');
      setLocationRadius((company as any).location_radius_meters || 100);
    }
  }, [company]);

  const handleSave = async () => {
    if (!company?.id) {
      toast.error('لم يتم العثور على الشركة');
      return;
    }

    // Validate level 3 settings
    if (verificationLevel === 3) {
      if (!companyLatitude || !companyLongitude) {
        toast.error('يجب تحديد موقع الشركة للمستوى الثالث');
        return;
      }
      const lat = parseFloat(companyLatitude);
      const lng = parseFloat(companyLongitude);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        toast.error('إحداثيات الموقع غير صحيحة');
        return;
      }
    }

    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          attendance_verification_level: verificationLevel,
          attendance_approver_type: approverType,
          attendance_approver_id: verificationLevel >= 2 && approverType === 'specific_person' ? approverId : null,
          level3_verification_mode: level3Mode,
          company_latitude: companyLatitude ? parseFloat(companyLatitude) : null,
          company_longitude: companyLongitude ? parseFloat(companyLongitude) : null,
          location_radius_meters: locationRadius,
        } as any)
        .eq('id', company.id);

      if (error) throw error;
      
      await onRefetch();
      toast.success('تم حفظ إعدادات التحقق من الحضور');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('فشل في الحفظ: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getLocationFromBrowser = () => {
    if (!navigator.geolocation) {
      toast.error('المتصفح لا يدعم تحديد الموقع');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCompanyLatitude(position.coords.latitude.toString());
        setCompanyLongitude(position.coords.longitude.toString());
        toast.success('تم تحديد موقع الشركة بنجاح');
      },
      (error) => {
        toast.error('فشل في تحديد الموقع: ' + error.message);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          إعدادات التحقق من الحضور
        </CardTitle>
        <CardDescription>
          تحديد مستوى التحقق المطلوب عند تسجيل حضور الموظفين
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Verification Level Selection */}
        <div className="space-y-4">
          <Label className="text-base font-medium">مستوى التحقق الافتراضي</Label>
          <RadioGroup 
            value={verificationLevel.toString()} 
            onValueChange={(v) => setVerificationLevel(parseInt(v))}
            className="space-y-3"
          >
            {/* Level 1 */}
            <div className={`flex items-start space-x-3 rtl:space-x-reverse p-4 border rounded-lg cursor-pointer transition-colors ${verificationLevel === 1 ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
              <RadioGroupItem value="1" id="level-1" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="level-1" className="flex items-center gap-2 cursor-pointer font-medium">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  المستوى الأول - بدون تأكيد
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  يتم تسجيل الحضور مباشرة دون الحاجة لموافقة أي شخص
                </p>
              </div>
            </div>

            {/* Level 2 */}
            <div className={`flex items-start space-x-3 rtl:space-x-reverse p-4 border rounded-lg cursor-pointer transition-colors ${verificationLevel === 2 ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
              <RadioGroupItem value="2" id="level-2" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="level-2" className="flex items-center gap-2 cursor-pointer font-medium">
                  <UserCheck className="w-4 h-4 text-amber-500" />
                  المستوى الثاني - موافقة المدير
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  يجب موافقة المدير المباشر أو شخص محدد على تسجيل الحضور
                </p>
              </div>
            </div>

            {/* Level 3 */}
            <div className={`flex items-start space-x-3 rtl:space-x-reverse p-4 border rounded-lg cursor-pointer transition-colors ${verificationLevel === 3 ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
              <RadioGroupItem value="3" id="level-3" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="level-3" className="flex items-center gap-2 cursor-pointer font-medium">
                  <MapPin className="w-4 h-4 text-destructive" />
                  المستوى الثالث - التحقق من الموقع
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  التأكد من وجود الموظف في موقع الشركة مع إجراءات مكافحة الاحتيال
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Level 2 Settings */}
        {verificationLevel >= 2 && (
          <div className="space-y-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
            <h4 className="font-medium flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              إعدادات المستوى الثاني - الموافقة
            </h4>
            
            <div className="space-y-3">
              <Label>من يقوم بالموافقة على الحضور؟</Label>
              <RadioGroup 
                value={approverType} 
                onValueChange={(v) => setApproverType(v as 'direct_manager' | 'specific_person')}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <RadioGroupItem value="direct_manager" id="direct-manager" />
                  <Label htmlFor="direct-manager" className="cursor-pointer">
                    المدير المباشر (حسب الهيكل التنظيمي)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <RadioGroupItem value="specific_person" id="specific-person" />
                  <Label htmlFor="specific-person" className="cursor-pointer">
                    شخص محدد
                  </Label>
                </div>
              </RadioGroup>

              {approverType === 'specific_person' && (
                <div className="space-y-2">
                  <Label>اختر الموظف المسؤول</Label>
                  <Select value={approverId || ''} onValueChange={setApproverId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر موظف..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <AlertTriangle className="w-4 h-4 inline-block me-1 text-amber-500" />
                طلبات الحضور ستبقى معلقة حتى موافقة المسؤول. يمكن للمدير تعديل وقت الحضور أو رفض الطلب.
              </p>
            </div>
          </div>
        )}

        {/* Level 3 Settings */}
        {verificationLevel === 3 && (
          <div className="space-y-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
            <h4 className="font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              إعدادات المستوى الثالث - التحقق من الموقع
            </h4>

            {/* Verification Mode */}
            <div className="space-y-3">
              <Label>طريقة التحقق</Label>
              <Select value={level3Mode} onValueChange={setLevel3Mode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="location_only">
                    <div className="flex items-center gap-2">
                      <Map className="w-4 h-4" />
                      <span>الموقع فقط</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="location_selfie">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      <span>الموقع + صورة سيلفي</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="location_ip">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4" />
                      <span>الموقع + IP الشبكة</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="location_selfie_ip">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      <span>الموقع + سيلفي + IP (الأقصى أماناً)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Company Location */}
            <div className="space-y-3">
              <Label>موقع الشركة</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="latitude" className="text-sm text-muted-foreground">خط العرض (Latitude)</Label>
                  <Input 
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder="مثال: 30.0444"
                    value={companyLatitude}
                    onChange={(e) => setCompanyLatitude(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude" className="text-sm text-muted-foreground">خط الطول (Longitude)</Label>
                  <Input 
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder="مثال: 31.2357"
                    value={companyLongitude}
                    onChange={(e) => setCompanyLongitude(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={getLocationFromBrowser}
                className="w-full sm:w-auto"
              >
                <MapPin className="w-4 h-4 me-2" />
                تحديد الموقع الحالي
              </Button>
            </div>

            {/* Location Radius */}
            <div className="space-y-2">
              <Label htmlFor="radius">نطاق الموقع (بالمتر)</Label>
              <Input 
                id="radius"
                type="number"
                min={10}
                max={5000}
                value={locationRadius}
                onChange={(e) => setLocationRadius(Math.min(5000, Math.max(10, parseInt(e.target.value) || 100)))}
              />
              <p className="text-xs text-muted-foreground">
                الموظف يجب أن يكون داخل {locationRadius} متر من موقع الشركة
              </p>
            </div>

            {/* Anti-fraud Notice */}
            <div className="p-3 bg-destructive/10 rounded-lg">
              <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                إجراءات مكافحة الاحتيال المفعلة:
              </h5>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>كشف استخدام VPN وتطبيقات تغيير الموقع</li>
                <li>تتبع تاريخ المواقع وكشف القفزات المفاجئة</li>
                <li>التحقق من عنوان IP مقابل عناوين الشركة المعروفة</li>
                {level3Mode.includes('selfie') && <li>التحقق من صورة السيلفي بالذكاء الاصطناعي</li>}
              </ul>
            </div>
          </div>
        )}

        <Button onClick={handleSave} className="btn-primary-gradient w-full sm:w-auto" disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
          حفظ الإعدادات
        </Button>
      </CardContent>
    </Card>
  );
};

export default AttendanceVerificationSettings;
