import { useMemo } from 'react';
import { PositionWithPermissions } from '@/hooks/usePositions';
import PositionCard from './PositionCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { Building2 } from 'lucide-react';

interface OrganizationChartProps {
  positions: PositionWithPermissions[];
  onEdit: (position: PositionWithPermissions) => void;
  onDelete: (position: PositionWithPermissions) => void;
}

const OrganizationChart = ({ positions, onEdit, onDelete }: OrganizationChartProps) => {
  const { language } = useLanguage();
  
  // Build tree structure
  const tree = useMemo(() => {
    const positionMap = new Map<string, PositionWithPermissions>();
    const childrenMap = new Map<string | null, PositionWithPermissions[]>();
    
    // First pass: create maps
    positions.forEach(pos => {
      positionMap.set(pos.id, pos);
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
    
    return { positionMap, childrenMap };
  }, [positions]);

  // Get root positions (those with no parent)
  const rootPositions = tree.childrenMap.get(null) || [];

  // Recursive function to render position with children
  const renderPosition = (position: PositionWithPermissions) => {
    const children = tree.childrenMap.get(position.id) || [];
    return (
      <PositionCard
        key={position.id}
        position={position}
        children={children}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
  };

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
    <div className="space-y-4">
      {rootPositions.map(renderPosition)}
    </div>
  );
};

export default OrganizationChart;
