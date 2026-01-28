import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NumberInput } from '@/components/ui/number-input';
import { Users, Loader2, Search, Plus, Minus, History, Star, Crown } from 'lucide-react';
import { useEmployeeWallets, useAddManualPoints, usePointsHistory, type EmployeeWallet, type PointsHistory as PointsHistoryType } from '@/hooks/useRewards';
import { useEmployees } from '@/hooks/useEmployees';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const EmployeeWalletsTab = () => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  const { data: wallets, isLoading: walletsLoading } = useEmployeeWallets();
  const { data: employees } = useEmployees();
  const addPoints = useAddManualPoints();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<(EmployeeWallet & { employee?: { id: string; full_name: string; email: string } }) | null>(null);
  const [pointsForm, setPointsForm] = useState({
    points: 0,
    description: '',
    isDeduction: false,
  });
  
  const { data: pointsHistory, isLoading: historyLoading } = usePointsHistory(
    historyDialogOpen ? selectedWallet?.employee_id : undefined, 
    20
  );

  // Merge wallet data with employee data - add type
  type WalletWithEmployee = EmployeeWallet & { employee?: { id: string; full_name: string; email: string } };
  
  const walletsWithEmployees: WalletWithEmployee[] = wallets?.map(wallet => {
    const employee = employees?.find(e => e.id === wallet.employee_id);
    return { ...wallet, employee: employee ? { id: employee.id, full_name: employee.full_name, email: employee.email } : undefined };
  }).filter(w => w.employee) || [];

  // Filter by search
  const filteredWallets = walletsWithEmployees?.filter(w => 
    w.employee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.employee?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Employees without wallets
  const employeesWithoutWallets = employees?.filter(
    e => !wallets?.some(w => w.employee_id === e.id)
  );

  const handleAddPoints = (wallet: WalletWithEmployee, isDeduction: boolean) => {
    setSelectedWallet(wallet);
    setPointsForm({ points: 0, description: '', isDeduction });
    setPointsDialogOpen(true);
  };

  const handleViewHistory = (wallet: WalletWithEmployee) => {
    setSelectedWallet(wallet);
    setHistoryDialogOpen(true);
  };

  const confirmAddPoints = async () => {
    if (!selectedWallet) return;
    
    const points = pointsForm.isDeduction ? -Math.abs(pointsForm.points) : Math.abs(pointsForm.points);
    
    await addPoints.mutateAsync({
      employeeId: selectedWallet.employee_id,
      points,
      description: pointsForm.description || (pointsForm.isDeduction 
        ? (isArabic ? 'خصم يدوي' : 'Manual deduction')
        : (isArabic ? 'مكافأة يدوية' : 'Manual bonus')
      ),
    });
    
    setPointsDialogOpen(false);
    setSelectedWallet(null);
  };

  if (walletsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                {isArabic ? 'محافظ الموظفين' : 'Employee Wallets'}
              </CardTitle>
              <CardDescription>
                {isArabic 
                  ? 'عرض وإدارة أرصدة نقاط الموظفين' 
                  : 'View and manage employee point balances'}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isArabic ? 'بحث...' : 'Search...'}
                className="ps-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredWallets && filteredWallets.length > 0 ? (
            <div className="space-y-3">
              {filteredWallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary font-medium">
                          {wallet.employee?.full_name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {wallet.employee?.full_name}
                          </p>
                          {wallet.current_level && (
                            <Badge variant="secondary" className="gap-1 shrink-0">
                              <Crown className="w-3 h-3" />
                              {isArabic 
                                ? wallet.current_level.name_ar || wallet.current_level.name 
                                : wallet.current_level.name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {wallet.employee?.email}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-end">
                        <p className="text-2xl font-bold text-primary">
                          {wallet.total_points.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isArabic ? 'نقطة' : 'points'}
                        </p>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleAddPoints(wallet, false)}
                          title={isArabic ? 'إضافة نقاط' : 'Add points'}
                        >
                          <Plus className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleAddPoints(wallet, true)}
                          title={isArabic ? 'خصم نقاط' : 'Deduct points'}
                        >
                          <Minus className="w-4 h-4 text-red-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleViewHistory(wallet)}
                          title={isArabic ? 'السجل' : 'History'}
                        >
                          <History className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
                    <span>
                      {isArabic ? 'مكتسب' : 'Earned'}: {wallet.earned_points.toLocaleString()}
                    </span>
                    <span>
                      {isArabic ? 'مستهلك' : 'Spent'}: {wallet.spent_points.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{isArabic ? 'لا توجد محافظ بعد' : 'No wallets yet'}</p>
              <p className="text-sm mt-2">
                {isArabic 
                  ? 'سيتم إنشاء المحافظ تلقائياً عند كسب النقاط' 
                  : 'Wallets will be created automatically when points are earned'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Deduct Points Dialog */}
      <Dialog open={pointsDialogOpen} onOpenChange={setPointsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pointsForm.isDeduction 
                ? (isArabic ? 'خصم نقاط' : 'Deduct Points')
                : (isArabic ? 'إضافة نقاط' : 'Add Points')
              }
            </DialogTitle>
            <DialogDescription>
              {selectedWallet?.employee?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isArabic ? 'عدد النقاط' : 'Points Amount'}</Label>
              <NumberInput
                value={pointsForm.points}
                onChange={(val) => setPointsForm({ ...pointsForm, points: val })}
                min={1}
              />
            </div>

            <div className="space-y-2">
              <Label>{isArabic ? 'الوصف' : 'Description'}</Label>
              <Textarea
                value={pointsForm.description}
                onChange={(e) => setPointsForm({ ...pointsForm, description: e.target.value })}
                placeholder={isArabic ? 'سبب الإضافة/الخصم...' : 'Reason for points...'}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPointsDialogOpen(false)}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              onClick={confirmAddPoints} 
              disabled={addPoints.isPending || pointsForm.points <= 0}
              variant={pointsForm.isDeduction ? 'destructive' : 'default'}
            >
              {addPoints.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
              {pointsForm.isDeduction 
                ? (isArabic ? 'خصم' : 'Deduct')
                : (isArabic ? 'إضافة' : 'Add')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Points History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              {isArabic ? 'سجل النقاط' : 'Points History'}
            </DialogTitle>
            <DialogDescription>
              {selectedWallet?.employee?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : pointsHistory && pointsHistory.length > 0 ? (
              <div className="space-y-2">
                {pointsHistory.map((entry: PointsHistoryType) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-lg bg-muted/50 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {entry.description || entry.event_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), 'PPp', { 
                          locale: isArabic ? ar : undefined 
                        })}
                      </p>
                    </div>
                    <Badge 
                      variant={entry.points >= 0 ? 'default' : 'destructive'}
                      className="shrink-0"
                    >
                      {entry.points > 0 ? '+' : ''}{entry.points}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{isArabic ? 'لا يوجد سجل' : 'No history yet'}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EmployeeWalletsTab;
