import { memo, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Building } from 'lucide-react';
import { useCompanyLocations } from '@/hooks/useCompanyLocations';

interface EmployeeLocationSelectorProps {
  employeeId: string;
  selectedLocationIds: string[];
  onChange: (locationIds: string[]) => void;
}

const EmployeeLocationSelector = memo(({ 
  employeeId, 
  selectedLocationIds, 
  onChange 
}: EmployeeLocationSelectorProps) => {
  const { data: locations = [], isLoading } = useCompanyLocations();

  const handleToggle = useCallback((locationId: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedLocationIds, locationId]);
    } else {
      onChange(selectedLocationIds.filter(id => id !== locationId));
    }
  }, [selectedLocationIds, onChange]);

  if (isLoading) {
    return (
      <div className="p-3 bg-muted/50 rounded-lg animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3"></div>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="p-4 bg-muted/30 border rounded-lg text-center">
        <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground">
          لم يتم إضافة مواقع للشركة بعد
        </p>
        <p className="text-xs text-muted-foreground">
          أضف مواقع من الإعدادات لتعيينها للموظفين
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Building className="w-4 h-4 text-primary" />
        <Label className="font-medium">مواقع العمل المسموحة</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        اختر المواقع التي يمكن للموظف تسجيل الحضور منها (يمكن اختيار أكثر من موقع)
      </p>
      <div className="space-y-2">
        {locations.map((location) => {
          const isChecked = selectedLocationIds.includes(location.id);
          return (
            <label 
              key={location.id}
              htmlFor={`loc-${location.id}`}
              className={`flex items-center space-x-3 rtl:space-x-reverse p-3 border rounded-lg transition-colors cursor-pointer ${
                isChecked ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
            >
              <Checkbox 
                id={`loc-${location.id}`}
                checked={isChecked}
                onCheckedChange={(checked) => handleToggle(location.id, checked as boolean)}
              />
              <div className="flex-1">
                <span className={`font-medium text-sm ${isChecked ? 'text-primary' : 'text-foreground'}`}>
                  {location.name}
                </span>
                <p className="text-xs text-muted-foreground">
                  نطاق {location.radius_meters} متر
                </p>
              </div>
              <MapPin className={`w-4 h-4 ${isChecked ? 'text-primary' : 'text-muted-foreground'}`} />
            </label>
          );
        })}
      </div>
      {selectedLocationIds.length === 0 && (
        <p className="text-xs text-amber-600 bg-amber-500/10 p-2 rounded">
          ⚠️ إذا لم يتم تحديد أي موقع، سيتمكن الموظف من التسجيل من أي موقع من مواقع الشركة
        </p>
      )}
    </div>
  );
});

EmployeeLocationSelector.displayName = 'EmployeeLocationSelector';

export default EmployeeLocationSelector;
