import { useMemo, useState, useCallback } from 'react';
import { PositionWithPermissions } from '@/hooks/usePositions';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Building2, 
  ChevronDown, 
  ChevronRight, 
  Edit2, 
  Trash2, 
  Users, 
  ShieldCheck, 
  GripVertical,
  MoreHorizontal,
  Crown,
  Briefcase,
  UserCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
  isLast?: boolean;
}

const getLevelIcon = (level: number) => {
  if (level === 1) return Crown;
  if (level === 2) return Briefcase;
  return UserCircle;
};

const getLevelColor = (level: number) => {
  if (level === 1) return 'from-amber-500 to-orange-600';
  if (level === 2) return 'from-blue-500 to-indigo-600';
  if (level === 3) return 'from-emerald-500 to-teal-600';
  return 'from-slate-500 to-slate-600';
};

const PositionNode = ({ 
  position, 
  childrenMap, 
  level, 
  onEdit, 
  onDelete,
  onDragStart,
  onDrop,
  onDragOver,
  draggingId,
  isLast = false
}: PositionNodeProps) => {
  const { language } = useLanguage();
  const [expanded, setExpanded] = useState(true);
  const children = childrenMap.get(position.id) || [];
  const hasChildren = children.length > 0;
  
  const permissions = position.position_permissions;
  const activePermissions = permissions ? [
    permissions.can_manage_attendance && (language === 'ar' ? 'الحضور' : 'Attendance'),
    permissions.can_approve_leaves && (language === 'ar' ? 'الإجازات' : 'Leaves'),
    permissions.can_make_deductions && (language === 'ar' ? 'الخصومات' : 'Deductions'),
    permissions.can_add_bonuses && (language === 'ar' ? 'المكافآت' : 'Bonuses'),
    permissions.can_view_salaries && (language === 'ar' ? 'الرواتب' : 'Salaries'),
    permissions.can_manage_subordinates && (language === 'ar' ? 'المرؤوسين' : 'Subordinates'),
    permissions.can_view_reports && (language === 'ar' ? 'التقارير' : 'Reports'),
  ].filter(Boolean) : [];

  const isDragging = draggingId === position.id;
  const LevelIcon = getLevelIcon(position.level);
  const levelColor = getLevelColor(position.level);

  return (
    <div className="relative">
      {/* Mobile-friendly position card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "relative rounded-xl border bg-card shadow-sm transition-all duration-200",
          "hover:shadow-md hover:border-primary/30",
          isDragging && "opacity-50 scale-95",
          level === 0 && "ring-2 ring-primary/20"
        )}
        draggable
        onDragStart={(e) => onDragStart?.(e as unknown as React.DragEvent, position.id)}
        onDrop={(e) => onDrop?.(e as unknown as React.DragEvent, position.id)}
        onDragOver={(e) => onDragOver?.(e as unknown as React.DragEvent)}
      >
        {/* Level indicator strip */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r",
          levelColor
        )} />
        
        <div className="p-3 sm:p-4">
          {/* Header row */}
          <div className="flex items-start gap-2 sm:gap-3">
            {/* Drag handle - hidden on mobile, shown on larger screens */}
            <div className="hidden sm:flex cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground mt-1">
              <GripVertical className="h-4 w-4" />
            </div>
            
            {/* Level icon */}
            <div className={cn(
              "shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br flex items-center justify-center shadow-sm",
              levelColor
            )}>
              <LevelIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground text-sm sm:text-base truncate max-w-[150px] sm:max-w-none">
                  {language === 'ar' && position.title_ar ? position.title_ar : position.title}
                </h3>
                <Badge 
                  variant="secondary" 
                  className="text-[10px] sm:text-xs shrink-0 px-1.5 sm:px-2"
                >
                  {language === 'ar' ? `م${position.level}` : `L${position.level}`}
                </Badge>
              </div>
              
              {/* Stats row */}
              <div className="flex items-center gap-2 sm:gap-3 mt-1.5 flex-wrap">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{position.employees_count || 0}</span>
                </div>
                
                {activePermissions.length > 0 && (
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-muted-foreground">
                      {activePermissions.length}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={language === 'ar' ? 'start' : 'end'} className="bg-popover">
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
          </div>
          
          {/* Description - collapsible on mobile */}
          {position.description && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2 ps-11 sm:ps-[52px]">
              {position.description}
            </p>
          )}
          
          {/* Permissions badges - shown inline on mobile */}
          {activePermissions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 ps-11 sm:ps-[52px]">
              {activePermissions.slice(0, 2).map((perm, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline" 
                  className="text-[10px] px-1.5 py-0 h-5 bg-primary/5"
                >
                  {perm}
                </Badge>
              ))}
              {activePermissions.length > 2 && (
                <Badge 
                  variant="outline" 
                  className="text-[10px] px-1.5 py-0 h-5 bg-muted"
                >
                  +{activePermissions.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
      </motion.div>
      
      {/* Children with improved hierarchy lines */}
      <AnimatePresence>
        {hasChildren && expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "relative mt-2 space-y-2",
              language === 'ar' ? 'pr-4 sm:pr-6 mr-4 sm:mr-5' : 'pl-4 sm:pl-6 ml-4 sm:ml-5'
            )}
          >
            {/* Vertical connecting line */}
            <div 
              className={cn(
                "absolute top-0 bottom-2 w-0.5 bg-gradient-to-b from-border to-transparent",
                language === 'ar' ? '-right-px' : '-left-px'
              )}
            />
            
            {children.map((child, index) => (
              <div key={child.id} className="relative">
                {/* Horizontal connecting line */}
                <div 
                  className={cn(
                    "absolute top-5 w-3 sm:w-4 border-t-2 border-border",
                    language === 'ar' ? 'right-0 -mr-4 sm:-mr-6' : 'left-0 -ml-4 sm:-ml-6'
                  )}
                />
                
                <PositionNode
                  position={child}
                  childrenMap={childrenMap}
                  level={level + 1}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onDragStart={onDragStart}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  draggingId={draggingId}
                  isLast={index === children.length - 1}
                />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const OrganizationChart = ({ positions, onEdit, onDelete, onMove }: OrganizationChartProps) => {
  const { language } = useLanguage();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  
  // Build tree structure using legacy reports_to field
  const { childrenMap, rootPositions } = useMemo(() => {
    const childrenMap = new Map<string | null, PositionWithPermissions[]>();
    const positionMap = new Map<string, PositionWithPermissions>();
    
    // Create position lookup map
    positions.forEach(pos => {
      positionMap.set(pos.id, pos);
    });
    
    // Detect circular dependencies
    const hasCircularDependency = (posId: string, visited: Set<string> = new Set()): boolean => {
      if (visited.has(posId)) return true;
      visited.add(posId);
      const pos = positionMap.get(posId);
      if (pos?.reports_to) {
        return hasCircularDependency(pos.reports_to, visited);
      }
      return false;
    };
    
    // Group positions by their parent, handling circular dependencies
    const circularPositions = new Set<string>();
    positions.forEach(pos => {
      // Check for circular dependency
      if (pos.reports_to && hasCircularDependency(pos.id)) {
        circularPositions.add(pos.id);
      }
    });
    
    positions.forEach(pos => {
      // If position is in a circular dependency, treat it as root
      const parentId = circularPositions.has(pos.id) ? null : pos.reports_to;
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(pos);
    });
    
    // Sort children by level
    childrenMap.forEach((children) => {
      children.sort((a, b) => a.level - b.level);
    });
    
    // Get root positions (those with no parent or broken out of circular dependency)
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
      <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4">
          <Building2 className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
        </div>
        <h3 className="text-base sm:text-lg font-medium mb-2">
          {language === 'ar' ? 'لا توجد مناصب بعد' : 'No positions yet'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {language === 'ar' 
            ? 'ابدأ بإنشاء الهيكل التنظيمي لشركتك'
            : 'Start building your organizational structure'
          }
        </p>
      </div>
    );
  }

  return (
    <div 
      className="space-y-3"
      onDragEnd={handleDragEnd}
    >
      {/* Drop zone for root level - only visible when dragging */}
      <AnimatePresence>
        {draggingId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-2 border-dashed border-primary/50 rounded-xl p-3 sm:p-4 text-center text-sm text-primary bg-primary/5"
            onDrop={(e) => handleDrop(e as unknown as React.DragEvent, null)}
            onDragOver={(e) => handleDragOver(e as unknown as React.DragEvent)}
          >
            {language === 'ar' ? 'أفلت هنا لجعله منصب رئيسي' : 'Drop here to make it a root position'}
          </motion.div>
        )}
      </AnimatePresence>
      
      {rootPositions.map((position, index) => (
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
          isLast={index === rootPositions.length - 1}
        />
      ))}
    </div>
  );
};

export default OrganizationChart;