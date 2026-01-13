import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Users, 
  ChevronDown, 
  ChevronRight,
  Shield,
  ShieldCheck
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PositionWithPermissions } from '@/hooks/usePositions';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface PositionCardProps {
  position: PositionWithPermissions;
  children?: PositionWithPermissions[];
  onEdit: (position: PositionWithPermissions) => void;
  onDelete: (position: PositionWithPermissions) => void;
  level?: number;
}

const PositionCard = ({ position, children, onEdit, onDelete, level = 0 }: PositionCardProps) => {
  const { language } = useLanguage();
  const [expanded, setExpanded] = useState(true);
  const hasChildren = children && children.length > 0;
  
  const permissions = position.position_permissions;
  const activePermissions = permissions ? [
    permissions.can_manage_attendance && (language === 'ar' ? 'إدارة الحضور' : 'Attendance'),
    permissions.can_approve_leaves && (language === 'ar' ? 'الإجازات' : 'Leaves'),
    permissions.can_make_deductions && (language === 'ar' ? 'الخصومات' : 'Deductions'),
    permissions.can_add_bonuses && (language === 'ar' ? 'المكافآت' : 'Bonuses'),
    permissions.can_view_salaries && (language === 'ar' ? 'الرواتب' : 'Salaries'),
    permissions.can_manage_subordinates && (language === 'ar' ? 'إدارة المرؤوسين' : 'Subordinates'),
    permissions.can_view_reports && (language === 'ar' ? 'التقارير' : 'Reports'),
  ].filter(Boolean) : [];

  return (
    <div className="relative">
      {/* Connection line */}
      {level > 0 && (
        <div 
          className={cn(
            "absolute top-6 w-6 border-t-2 border-border",
            language === 'ar' ? 'right-0 -mr-6' : 'left-0 -ml-6'
          )}
        />
      )}
      
      <Card className={cn(
        "transition-all duration-200 hover:shadow-md",
        level === 0 && "border-primary/30 bg-primary/5"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 mt-0.5"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground truncate">
                    {language === 'ar' && position.title_ar ? position.title_ar : position.title}
                  </h3>
                  <Badge variant="outline" className="shrink-0">
                    {language === 'ar' ? `المستوى ${position.level}` : `Level ${position.level}`}
                  </Badge>
                </div>
                
                {position.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {position.description}
                  </p>
                )}
                
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>
                      {position.employees_count || 0} {language === 'ar' ? 'موظف' : 'employees'}
                    </span>
                  </div>
                  
                  {activePermissions.length > 0 && (
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-muted-foreground">
                        {activePermissions.length} {language === 'ar' ? 'صلاحية' : 'permissions'}
                      </span>
                    </div>
                  )}
                </div>
                
                {activePermissions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {activePermissions.slice(0, 3).map((perm, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {perm}
                      </Badge>
                    ))}
                    {activePermissions.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{activePermissions.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={language === 'ar' ? 'start' : 'end'}>
                <DropdownMenuItem onClick={() => onEdit(position)}>
                  <Edit2 className="h-4 w-4 me-2" />
                  {language === 'ar' ? 'تعديل' : 'Edit'}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(position)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 me-2" />
                  {language === 'ar' ? 'حذف' : 'Delete'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
      
      {/* Children */}
      {hasChildren && expanded && (
        <div className={cn(
          "mt-3 space-y-3 relative",
          language === 'ar' ? 'pr-6 mr-3' : 'pl-6 ml-3'
        )}>
          {/* Vertical line */}
          <div 
            className={cn(
              "absolute top-0 bottom-3 w-0.5 bg-border",
              language === 'ar' ? 'right-0' : 'left-0'
            )}
          />
          {children.map(child => (
            <PositionCard
              key={child.id}
              position={child}
              children={[]}
              onEdit={onEdit}
              onDelete={onDelete}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PositionCard;
