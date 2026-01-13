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
import { usePositions, useDeletePosition, PositionWithPermissions } from '@/hooks/usePositions';
import OrganizationChart from '@/components/organization/OrganizationChart';
import PositionDialog from '@/components/organization/PositionDialog';
import AssignPositionDialog from '@/components/organization/AssignPositionDialog';
import { Plus, Users, Building2, Shield, GitBranch } from 'lucide-react';

const Organization = () => {
  const { language } = useLanguage();
  const { data: positions = [], isLoading } = usePositions();
  const deletePosition = useDeletePosition();
  
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {language === 'ar' ? 'الهيكل التنظيمي' : 'Organization Structure'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === 'ar' 
                ? 'إدارة المناصب والصلاحيات والتسلسل الوظيفي'
                : 'Manage positions, permissions, and organizational hierarchy'
              }
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAssignDialogOpen(true)}>
              <Users className="h-4 w-4 me-2" />
              {language === 'ar' ? 'تعيين الموظفين' : 'Assign Employees'}
            </Button>
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 me-2" />
              {language === 'ar' ? 'إضافة منصب' : 'Add Position'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalPositions}</p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'المناصب' : 'Positions'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalEmployeesAssigned}</p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'موظف معين' : 'Assigned'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{positionsWithPermissions}</p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'لديه صلاحيات' : 'With Permissions'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <GitBranch className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{hierarchyLevels}</p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'مستويات' : 'Levels'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Organization Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              {language === 'ar' ? 'شجرة الهيكل التنظيمي' : 'Organization Tree'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <div className="ps-8 space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            ) : (
              <OrganizationChart
                positions={positions}
                onEdit={handleEdit}
                onDelete={handleDelete}
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
