import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePositions, useDeletePosition, useMovePosition, PositionWithPermissions } from '@/hooks/usePositions';
import OrganizationChart from '@/components/organization/OrganizationChart';
import PositionDialog from '@/components/organization/PositionDialog';
import AssignPositionDialog from '@/components/organization/AssignPositionDialog';
import { Plus, Users, Building2, Shield, GitBranch } from 'lucide-react';

const Organization = () => {
  const { language } = useLanguage();
  const { data: positions = [], isLoading } = usePositions();
  const deletePosition = useDeletePosition();
  const movePosition = useMovePosition();
  
  const [positionDialogOpen, setPositionDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<PositionWithPermissions | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [positionToDelete, setPositionToDelete] = useState<PositionWithPermissions | null>(null);

  const handleEdit = (position: PositionWithPermissions) => {
    setSelectedPosition(position);
    setPositionDialogOpen(true);
  };

  const handleDelete = (position: PositionWithPermissions) => {
    setPositionToDelete(position);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (positionToDelete) {
      await deletePosition.mutateAsync(positionToDelete.id);
      setDeleteDialogOpen(false);
      setPositionToDelete(null);
    }
  };

  const handleMovePosition = async (positionId: string, newParentId: string | null) => {
    await movePosition.mutateAsync({ positionId, newParentId });
  };

  const handleAddNew = () => {
    setSelectedPosition(null);
    setPositionDialogOpen(true);
  };

  // Calculate stats
  const totalPositions = positions.length;
  const totalEmployeesAssigned = positions.reduce((acc, pos) => acc + (pos.employees_count || 0), 0);
  const positionsWithPermissions = positions.filter(
    pos => pos.position_permissions && Object.values(pos.position_permissions).some(v => v === true)
  ).length;
  const hierarchyLevels = new Set(positions.map(p => p.level)).size;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header - Mobile optimized */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {language === 'ar' ? 'الهيكل التنظيمي' : 'Organization Structure'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">
              {language === 'ar' 
                ? 'إدارة المناصب والصلاحيات والتسلسل الوظيفي'
                : 'Manage positions, permissions, and organizational hierarchy'
              }
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setAssignDialogOpen(true)}
              size="sm"
              className="flex-1 sm:flex-none h-9 sm:h-10 text-xs sm:text-sm touch-manipulation"
            >
              <Users className="h-4 w-4 me-1 sm:me-2" />
              <span className="truncate">{language === 'ar' ? 'تعيين الموظفين' : 'Assign'}</span>
            </Button>
            <Button 
              onClick={handleAddNew}
              size="sm"
              className="flex-1 sm:flex-none h-9 sm:h-10 text-xs sm:text-sm touch-manipulation"
            >
              <Plus className="h-4 w-4 me-1 sm:me-2" />
              <span className="truncate">{language === 'ar' ? 'إضافة منصب' : 'Add Position'}</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards - Mobile optimized grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-4">
          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold truncate">{totalPositions}</p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground truncate">
                    {language === 'ar' ? 'المناصب' : 'Positions'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold truncate">{totalEmployeesAssigned}</p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground truncate">
                    {language === 'ar' ? 'موظف معين' : 'Assigned'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold truncate">{positionsWithPermissions}</p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground truncate">
                    {language === 'ar' ? 'لديه صلاحيات' : 'With Perms'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                  <GitBranch className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold truncate">{hierarchyLevels}</p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground truncate">
                    {language === 'ar' ? 'مستويات' : 'Levels'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Organization Chart - Mobile optimized */}
        <Card className="overflow-hidden">
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <GitBranch className="h-4 w-4 sm:h-5 sm:w-5" />
              {language === 'ar' ? 'شجرة الهيكل التنظيمي' : 'Organization Tree'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {isLoading ? (
              <div className="space-y-3 sm:space-y-4">
                <Skeleton className="h-20 sm:h-24 w-full rounded-xl" />
                <div className="ps-4 sm:ps-8 space-y-3 sm:space-y-4">
                  <Skeleton className="h-16 sm:h-20 w-full rounded-xl" />
                  <Skeleton className="h-16 sm:h-20 w-full rounded-xl" />
                </div>
              </div>
            ) : (
              <OrganizationChart
                positions={positions}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onMove={handleMovePosition}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Position Dialog */}
      <PositionDialog
        open={positionDialogOpen}
        onOpenChange={setPositionDialogOpen}
        position={selectedPosition}
        positions={positions}
      />

      {/* Assign Position Dialog */}
      <AssignPositionDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'حذف المنصب' : 'Delete Position'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar'
                ? `هل أنت متأكد من حذف منصب "${positionToDelete?.title_ar || positionToDelete?.title}"؟ سيتم إزالة المنصب من جميع الموظفين المرتبطين به.`
                : `Are you sure you want to delete "${positionToDelete?.title}"? This will remove the position from all associated employees.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {language === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Organization;
