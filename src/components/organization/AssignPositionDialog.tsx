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
import { usePositions, useAssignPosition } from '@/hooks/usePositions';
import { useEmployees } from '@/hooks/useEmployees';
import { Search, User, Briefcase, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssignPositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AssignPositionDialog = ({ open, onOpenChange }: AssignPositionDialogProps) => {
  const { language, direction } = useLanguage();
  const isRTL = direction === 'rtl';
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
      <DialogContent 
        className={cn(
          "w-[95vw] max-w-2xl max-h-[85vh] p-0 gap-0",
          isRTL && "text-right"
        )}
        dir={direction}
      >
        <DialogHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
          <DialogTitle className={cn("text-lg sm:text-xl", isRTL && "text-right")}>
            {language === 'ar' ? 'تعيين المناصب للموظفين' : 'Assign Positions to Employees'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-4 sm:p-6 pt-4 space-y-3 sm:space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className={cn(
              "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
              isRTL ? "right-3" : "left-3"
            )} />
            <Input
              placeholder={language === 'ar' ? 'البحث عن موظف...' : 'Search employees...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn("h-10 sm:h-10", isRTL ? "pr-9 text-right" : "pl-9")}
            />
          </div>
          
          {/* Bulk assign */}
          <div className={cn(
            "flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-lg bg-muted/50",
            isRTL && "sm:flex-row-reverse"
          )}>
            <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
              <span className="text-xs sm:text-sm whitespace-nowrap">
                {language === 'ar' ? 'تعيين منصب لعدة موظفين:' : 'Assign position to multiple:'}
              </span>
            </div>
            <Select value={selectedPosition} onValueChange={(val) => setSelectedPosition(val === '__none__' ? '' : val)}>
              <SelectTrigger className={cn(
                "w-full sm:w-48 h-9 sm:h-10 text-sm",
                isRTL && "flex-row-reverse text-right"
              )}>
                <SelectValue placeholder={language === 'ar' ? 'اختر منصب' : 'Select position'} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="__none__">
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
          <ScrollArea className="h-[45vh] sm:h-[400px] rounded-lg border">
            <div className="p-2 space-y-2">
              {filteredEmployees.map(employee => {
                const currentPosition = assignments[employee.id] ?? employee.position_id;
                const positionName = getPositionName(currentPosition);
                
                return (
                  <div
                    key={employee.id}
                    className={cn(
                      "flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors",
                      isRTL && "sm:flex-row-reverse"
                    )}
                  >
                    {/* Employee info */}
                    <div className={cn(
                      "flex items-center gap-3 flex-1 min-w-0",
                      isRTL && "flex-row-reverse"
                    )}>
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <div className={cn("min-w-0 flex-1", isRTL && "text-right")}>
                        <p className="font-medium text-sm sm:text-base truncate">{employee.full_name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {employee.department || employee.email}
                        </p>
                      </div>
                      {positionName && (
                        <Badge variant="secondary" className="text-xs hidden sm:inline-flex flex-shrink-0">
                          {positionName}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Mobile position badge */}
                    {positionName && (
                      <Badge variant="secondary" className="text-xs sm:hidden self-start">
                        {positionName}
                      </Badge>
                    )}
                    
                    {/* Position select */}
                    <Select
                      value={currentPosition || '__none__'}
                      onValueChange={(value) => handleAssign(employee.id, value === '__none__' ? '' : value)}
                    >
                      <SelectTrigger className={cn(
                        "w-full sm:w-40 h-9 sm:h-10 text-sm flex-shrink-0",
                        isRTL && "flex-row-reverse text-right"
                      )}>
                        <SelectValue placeholder={language === 'ar' ? 'اختر منصب' : 'Select'} />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="__none__">
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
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {language === 'ar' ? 'لا يوجد موظفين' : 'No employees found'}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        
        <DialogFooter className={cn(
          "p-4 sm:p-6 pt-0 sm:pt-0",
          isRTL && "sm:justify-start"
        )}>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto h-10"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignPositionDialog;
