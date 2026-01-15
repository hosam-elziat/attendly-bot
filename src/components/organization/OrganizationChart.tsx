import { useMemo, useState, useCallback } from 'react';
import { PositionWithPermissions } from '@/hooks/usePositions';
import { useLanguage } from '@/contexts/LanguageContext';
import { Building2, ChevronDown, ChevronRight, MoreVertical, Edit2, Trash2, Users, ShieldCheck, GripVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface OrganizationChartProps {
  positions: PositionWithPermissions[];
  onEdit: (position: PositionWithPermissions) => void;
  onDelete: (position: PositionWithPermissions) => void;
  onMove?: (positionId: string, newParentId: string | null) => void;
}

interface PositionNodeProps {
  position: PositionWithPermissions;
  childrenMap: Map<string | null, PositionWithPermissions[]>;
  level: number;
  onEdit: (position: PositionWithPermissions) => void;
  onDelete: (position: PositionWithPermissions) => void;
  onDragStart?: (e: React.DragEvent, positionId: string) => void;
  onDrop?: (e: React.DragEvent, targetId: string | null) => void;
  onDragOver?: (e: React.DragEvent) => void;
  draggingId?: string | null;
}

const PositionNode = ({ 
  position, 
  childrenMap, 
  level, 
  onEdit, 
  onDelete,
  onDragStart,
  onDrop,
  onDragOver,
  draggingId
}: PositionNodeProps) => {
  const { language } = useLanguage();
  const [expanded, setExpanded] = useState(true);
  const children = childrenMap.get(position.id) || [];
  const hasChildren = children.length > 0;
  
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

  const isDragging = draggingId === position.id;

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
      
      <Card 
        className={cn(
          "transition-all duration-200 hover:shadow-md",
          level === 0 && "border-primary/30 bg-primary/5",
          isDragging && "opacity-50"
        )}
        draggable
        onDragStart={(e) => onDragStart?.(e, position.id)}
        onDrop={(e) => onDrop?.(e, position.id)}
        onDragOver={onDragOver}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                <GripVertical className="h-5 w-5" />
              </div>
              
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
            <PositionNode
              key={child.id}
              position={child}
              childrenMap={childrenMap}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onDragStart={onDragStart}
              onDrop={onDrop}
              onDragOver={onDragOver}
              draggingId={draggingId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const OrganizationChart = ({ positions, onEdit, onDelete, onMove }: OrganizationChartProps) => {
  const { language } = useLanguage();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  
  // Build tree structure using legacy reports_to field
  const { childrenMap, rootPositions } = useMemo(() => {
    const childrenMap = new Map<string | null, PositionWithPermissions[]>();
    
    // Group positions by their parent
    positions.forEach(pos => {
      const parentId = pos.reports_to;
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(pos);
    });
    
    // Sort children by level
    childrenMap.forEach((children) => {
      children.sort((a, b) => a.level - b.level);
    });
    
    // Get root positions (those with no parent)
    const rootPositions = childrenMap.get(null) || [];
    
    return { childrenMap, rootPositions };
  }, [positions]);

  const handleDragStart = useCallback((e: React.DragEvent, positionId: string) => {
    e.dataTransfer.setData('text/plain', positionId);
    setDraggingId(positionId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    
    if (sourceId && sourceId !== targetId && onMove) {
      onMove(sourceId, targetId);
    }
    setDraggingId(null);
  }, [onMove]);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">
          {language === 'ar' ? 'لا توجد مناصب بعد' : 'No positions yet'}
        </h3>
        <p className="text-muted-foreground max-w-sm">
          {language === 'ar' 
            ? 'ابدأ بإنشاء الهيكل التنظيمي لشركتك بإضافة المناصب والصلاحيات'
            : 'Start building your organizational structure by adding positions and permissions'
          }
        </p>
      </div>
    );
  }

  return (
    <div 
      className="space-y-4"
      onDragEnd={handleDragEnd}
    >
      {/* Drop zone for root level */}
      <div 
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center text-muted-foreground transition-colors",
          draggingId ? "border-primary bg-primary/5" : "border-transparent"
        )}
        onDrop={(e) => handleDrop(e, null)}
        onDragOver={handleDragOver}
      >
        {draggingId && (language === 'ar' ? 'أفلت هنا لجعله منصب رئيسي' : 'Drop here to make it a root position')}
      </div>
      
      {rootPositions.map(position => (
        <PositionNode
          key={position.id}
          position={position}
          childrenMap={childrenMap}
          level={0}
          onEdit={onEdit}
          onDelete={onDelete}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          draggingId={draggingId}
        />
      ))}
    </div>
  );
};

export default OrganizationChart;
