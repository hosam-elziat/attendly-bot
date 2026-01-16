import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
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
import { ShieldCheck, MapPin, UserCheck, Lock, Building, Wifi, Camera, Map } from 'lucide-react';

interface Employee {
  id: string;
  full_name: string;
  attendance_verification_level?: number | null;
  attendance_approver_type?: string | null;
  attendance_approver_id?: string | null;
  level3_verification_mode?: string | null;
  allowed_wifi_ips?: string[] | null;
}

interface Company {
  attendance_verification_level?: number | null;
  level3_verification_mode?: string | null;
}

interface EmployeeVerificationFormProps {
  employee: Employee;
  company: Company | null;
  employees: Employee[];
  value: {
    useCompanyDefault: boolean;
    verificationLevel: number;
    approverType: 'direct_manager' | 'specific_person';
    approverId: string | null;
    level3Requirements: string[];
    allowedWifiIps: string;
  };
  onChange: (value: EmployeeVerificationFormProps['value']) => void;
}

const LEVEL3_OPTIONS = [
  { id: 'location', label: 'الموقع الجغرافي (GPS)', icon: Map },
  { id: 'selfie', label: 'صورة سيلفي', icon: Camera },
  { id: 'wifi_ip', label: 'عنوان IP (WiFi الشركة)', icon: Wifi },
];

const EmployeeVerificationForm = ({ 
  employee, 
  company, 
  employees,
  value,
  onChange 
}: EmployeeVerificationFormProps) => {
  
  const companyLevel = company?.attendance_verification_level || 1;
  const companyLevel3Mode = company?.level3_verification_mode || 'location_only';
  
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

  const handleLevel3RequirementChange = (requirementId: string, checked: boolean) => {
    let newReqs: string[];
    if (checked) {
      newReqs = [...value.level3Requirements, requirementId];
    } else {
      newReqs = value.level3Requirements.filter(r => r !== requirementId);
      if (newReqs.length === 0) newReqs = value.level3Requirements;
    }
    onChange({ ...value, level3Requirements: newReqs });
  };

  return (
    <div className="border-t pt-4 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <Label className="text-base font-medium">إعدادات التحقق من الحضور</Label>
      </div>

      {/* Use Company Default */}
      <div className="flex items-center space-x-3 rtl:space-x-reverse p-3 bg-muted/50 rounded-lg">
        <input 
          type="checkbox" 
          id="use-default-edit"
          checked={value.useCompanyDefault}
          onChange={(e) => onChange({ ...value, useCompanyDefault: e.target.checked })}
          className="w-4 h-4"
        />
        <Label htmlFor="use-default-edit" className="cursor-pointer flex-1">
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
      {!value.useCompanyDefault && (
        <div className="space-y-3 p-4 border rounded-lg">
          <Label className="font-medium text-sm">مستوى التحقق المخصص</Label>
          <RadioGroup 
            value={value.verificationLevel.toString()} 
            onValueChange={(v) => onChange({ ...value, verificationLevel: parseInt(v) })}
            className="space-y-2"
          >
            {/* Level 1 */}
            <div className={`p-3 rounded-lg border transition-colors ${value.verificationLevel === 1 ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <RadioGroupItem value="1" id="edit-level-1" />
                <Label htmlFor="edit-level-1" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-green-500" />
                    <span className="font-medium text-sm">المستوى الأول: بدون تأكيد</span>
                  </div>
                </Label>
              </div>
            </div>

            {/* Level 2 */}
            <div className={`rounded-lg border transition-colors ${value.verificationLevel === 2 ? 'border-amber-500 bg-amber-500/5' : 'hover:bg-muted/50'}`}>
              <div className="p-3">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <RadioGroupItem value="2" id="edit-level-2" />
                  <Label htmlFor="edit-level-2" className="cursor-pointer flex-1">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-amber-500" />
                      <span className="font-medium text-sm">المستوى الثاني: موافقة المدير</span>
                    </div>
                  </Label>
                </div>
              </div>
              
              {value.verificationLevel === 2 && (
                <div className="p-3 pt-0 border-t border-amber-500/20 mt-2">
                  <RadioGroup 
                    value={value.approverType} 
                    onValueChange={(v) => onChange({ ...value, approverType: v as 'direct_manager' | 'specific_person' })}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <RadioGroupItem value="direct_manager" id="edit-direct" />
                      <Label htmlFor="edit-direct" className="cursor-pointer text-sm">المدير المباشر</Label>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <RadioGroupItem value="specific_person" id="edit-specific" />
                      <Label htmlFor="edit-specific" className="cursor-pointer text-sm">شخص محدد</Label>
                    </div>
                  </RadioGroup>

                  {value.approverType === 'specific_person' && (
                    <Select value={value.approverId || ''} onValueChange={(v) => onChange({ ...value, approverId: v })}>
                      <SelectTrigger className="mt-2">
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
            </div>

            {/* Level 3 */}
            <div className={`rounded-lg border transition-colors ${value.verificationLevel === 3 ? 'border-destructive bg-destructive/5' : 'hover:bg-muted/50'}`}>
              <div className="p-3">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <RadioGroupItem value="3" id="edit-level-3" />
                  <Label htmlFor="edit-level-3" className="cursor-pointer flex-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-destructive" />
                      <span className="font-medium text-sm">المستوى الثالث: التحقق المتقدم</span>
                    </div>
                  </Label>
                </div>
              </div>

              {value.verificationLevel === 3 && (
                <div className="p-3 pt-0 border-t border-destructive/20 mt-2 space-y-3">
                  <Label className="font-medium text-xs">اختر طرق التحقق المطلوبة:</Label>
                  
                  <div className="space-y-2">
                    {LEVEL3_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const isChecked = value.level3Requirements.includes(option.id);
                      return (
                        <div 
                          key={option.id}
                          className={`flex items-center space-x-3 rtl:space-x-reverse p-2 border rounded-lg transition-colors cursor-pointer ${
                            isChecked ? 'border-destructive bg-destructive/10' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => handleLevel3RequirementChange(option.id, !isChecked)}
                        >
                          <Checkbox 
                            id={`edit-req-${option.id}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => 
                              handleLevel3RequirementChange(option.id, checked as boolean)
                            }
                          />
                          <Label 
                            htmlFor={`edit-req-${option.id}`} 
                            className="cursor-pointer flex items-center gap-2 flex-1 text-sm"
                          >
                            <Icon className={`w-4 h-4 ${isChecked ? 'text-destructive' : 'text-muted-foreground'}`} />
                            {option.label}
                          </Label>
                        </div>
                      );
                    })}
                  </div>

                  {value.level3Requirements.includes('wifi_ip') && (
                    <div className="space-y-2 p-2 bg-background rounded-lg border">
                      <Label className="flex items-center gap-2 text-xs">
                        <Wifi className="w-3 h-3" />
                        عناوين IP المسموحة
                      </Label>
                      <Input 
                        placeholder="مثال: 192.168.1.1, 10.0.0.1"
                        value={value.allowedWifiIps}
                        onChange={(e) => onChange({ ...value, allowedWifiIps: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </RadioGroup>
        </div>
      )}
    </div>
  );
};

export default EmployeeVerificationForm;
