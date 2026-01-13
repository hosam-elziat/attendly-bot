import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePositions, useAssignPosition, PositionWithPermissions } from '@/hooks/usePositions';
import { useEmployees } from '@/hooks/useEmployees';
import { Search, User, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssignPositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AssignPositionDialog = ({ open, onOpenChange }: AssignPositionDialogProps) => {
  const { language } = useLanguage();
  const { data: positions = [] } = usePositions();
  const { data: employees = [] } = useEmployees();
  const assignPosition = useAssignPosition();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  // Filter employees based on search
  const filteredEmployees = employees.filter(emp => 
    emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get position name by ID
  const getPositionName = (positionId: string | null) => {
    if (!positionId) return null;
    const pos = positions.find(p => p.id === positionId);
    if (!pos) return null;
    return language === 'ar' && pos.title_ar ? pos.title_ar : pos.title;
  };

  const handleAssign = async (employeeId: string, positionId: string) => {
    try {
      await assignPosition.mutateAsync({ 
        employeeId, 
        positionId: positionId || null 
      });
      setAssignments({ ...assignments, [employeeId]: positionId });
    } catch (error) {
      // Error handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'تعيين المناصب للموظفين' : 'Assign Positions to Employees'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === 'ar' ? 'البحث عن موظف...' : 'Search employees...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9"
            />
          </div>
          
          {/* Bulk assign */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">
              {language === 'ar' ? 'تعيين منصب لعدة موظفين:' : 'Assign position to multiple:'}
            </span>
            <Select value={selectedPosition} onValueChange={setSelectedPosition}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={language === 'ar' ? 'اختر منصب' : 'Select position'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  {language === 'ar' ? 'بدون منصب' : 'No position'}
                </SelectItem>
                {positions.map(pos => (
                  <SelectItem key={pos.id} value={pos.id}>
                    {language === 'ar' && pos.title_ar ? pos.title_ar : pos.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Employee list */}
          <ScrollArea className="h-[400px] rounded-lg border">
            <div className="p-2 space-y-2">
              {filteredEmployees.map(employee => {
                const currentPosition = assignments[employee.id] ?? employee.position_id;
                const positionName = getPositionName(currentPosition);
                
                return (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{employee.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {employee.department || employee.email}
                        </p>
                      </div>
                      {positionName && (
                        <Badge variant="secondary" className="ms-2">
                          {positionName}
                        </Badge>
                      )}
                    </div>
                    
                    <Select
                      value={currentPosition || ''}
                      onValueChange={(value) => handleAssign(employee.id, value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder={language === 'ar' ? 'اختر منصب' : 'Select'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">
                          {language === 'ar' ? 'بدون منصب' : 'No position'}
                        </SelectItem>
                        {positions.map(pos => (
                          <SelectItem key={pos.id} value={pos.id}>
                            {language === 'ar' && pos.title_ar ? pos.title_ar : pos.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
              
              {filteredEmployees.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'لا يوجد موظفين' : 'No employees found'}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignPositionDialog;
