import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useLogAction } from '@/hooks/useAuditLogs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Trash2, 
  Edit, 
  TrendingUp, 
  TrendingDown, 
  Loader2, 
  Clock,
  User,
  Calendar,
  Bot
} from 'lucide-react';

export interface SalaryAdjustment {
  id: string;
  employee_id: string;
  company_id: string;
  month: string;
  bonus: number;
  deduction: number;
  adjustment_days: number | null;
  description: string | null;
  added_by: string | null;
  added_by_name: string | null;
  created_at: string;
  updated_at?: string;
  attendance_log_id: string | null;
  is_auto_generated: boolean;
  employees?: {
    full_name: string;
  };
}

interface AdjustmentsListProps {
  adjustments: SalaryAdjustment[];
  loading?: boolean;
  onRefresh: () => void;
  showEmployeeName?: boolean;
  emptyMessage?: string;
}

const AdjustmentsList = ({
  adjustments,
  loading = false,
  onRefresh,
  showEmployeeName = true,
  emptyMessage,
}: AdjustmentsListProps) => {
  const { language, direction } = useLanguage();
  const { profile } = useAuth();
  const logAction = useLogAction();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editAdjustment, setEditAdjustment] = useState<SalaryAdjustment | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setDeleting(true);
    try {
      const adjustmentToDelete = adjustments.find(a => a.id === deleteId);
      
      const { error } = await supabase
        .from('salary_adjustments')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      // Log the action
      if (adjustmentToDelete) {
        await logAction.mutateAsync({
          tableName: 'salary_adjustments',
          recordId: deleteId,
          action: 'delete',
          oldData: adjustmentToDelete as unknown as Record<string, unknown>,
        });
      }

      toast.success(language === 'ar' ? 'تم حذف التعديل بنجاح' : 'Adjustment deleted successfully');
      onRefresh();
    } catch (error) {
      console.error('Error deleting adjustment:', error);
      toast.error(language === 'ar' ? 'فشل في حذف التعديل' : 'Failed to delete adjustment');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleEdit = (adjustment: SalaryAdjustment) => {
    setEditAdjustment(adjustment);
    setEditAmount(String(adjustment.bonus > 0 ? adjustment.bonus : adjustment.deduction));
    setEditDescription(adjustment.description || '');
  };

  const handleSaveEdit = async () => {
    if (!editAdjustment) return;
    
    setSaving(true);
    try {
      const amount = parseFloat(editAmount) || 0;
      const isBonus = editAdjustment.bonus > 0;
      
      const updates = {
        bonus: isBonus ? amount : 0,
        deduction: isBonus ? 0 : amount,
        description: editDescription || null,
      };

      const { error } = await supabase
        .from('salary_adjustments')
        .update(updates)
        .eq('id', editAdjustment.id);

      if (error) throw error;

      // Log the action
      await logAction.mutateAsync({
        tableName: 'salary_adjustments',
        recordId: editAdjustment.id,
        action: 'update',
        oldData: editAdjustment as unknown as Record<string, unknown>,
        newData: { ...editAdjustment, ...updates } as unknown as Record<string, unknown>,
      });

      toast.success(language === 'ar' ? 'تم تحديث التعديل بنجاح' : 'Adjustment updated successfully');
      setEditAdjustment(null);
      onRefresh();
    } catch (error) {
      console.error('Error updating adjustment:', error);
      toast.error(language === 'ar' ? 'فشل في تحديث التعديل' : 'Failed to update adjustment');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, 'dd/MM/yyyy - HH:mm', { locale: language === 'ar' ? ar : undefined });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (adjustments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage || (language === 'ar' ? 'لا توجد تعديلات' : 'No adjustments')}
      </div>
    );
  }

  return (
    <>
      {/* Mobile Cards View */}
      <div className="block sm:hidden space-y-3">
        {adjustments.map((adjustment) => {
          const isBonus = adjustment.bonus > 0;
          const amount = isBonus ? adjustment.bonus : adjustment.deduction;
          
          return (
            <Card key={adjustment.id}>
              <CardContent className="p-3">
                <div className={`flex items-start justify-between ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center gap-2 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isBonus ? 'bg-success/10' : 'bg-destructive/10'
                    }`}>
                      {isBonus 
                        ? <TrendingUp className="w-4 h-4 text-success" />
                        : <TrendingDown className="w-4 h-4 text-destructive" />
                      }
                    </div>
                    <div className={direction === 'rtl' ? 'text-right' : ''}>
                      <Badge className={isBonus ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'}>
                        {isBonus 
                          ? (language === 'ar' ? 'مكافأة' : 'Bonus')
                          : (language === 'ar' ? 'خصم' : 'Deduction')
                        }
                      </Badge>
                      <p className={`font-bold text-lg mt-1 ${isBonus ? 'text-success' : 'text-destructive'}`}>
                        {isBonus ? '+' : '-'}{amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(adjustment)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(adjustment.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className={`mt-3 space-y-2 text-sm ${direction === 'rtl' ? 'text-right' : ''}`}>
                  {showEmployeeName && adjustment.employees && (
                    <div className={`flex items-center gap-2 text-muted-foreground ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      <User className="w-4 h-4" />
                      <span>{adjustment.employees.full_name}</span>
                    </div>
                  )}
                  
                  <div className={`flex items-center gap-2 text-muted-foreground ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(adjustment.created_at)}</span>
                  </div>
                  
                  <div className={`flex items-center gap-2 text-muted-foreground ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    {adjustment.is_auto_generated ? (
                      <>
                        <Bot className="w-4 h-4" />
                        <span>{language === 'ar' ? 'تلقائي' : 'Auto'}</span>
                      </>
                    ) : (
                      <>
                        <User className="w-4 h-4" />
                        <span>{adjustment.added_by_name || '—'}</span>
                      </>
                    )}
                  </div>
                  
                  {adjustment.description && (
                    <p className="text-muted-foreground bg-muted/50 p-2 rounded">
                      {adjustment.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={direction === 'rtl' ? 'text-right' : ''}>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
              {showEmployeeName && (
                <TableHead className={direction === 'rtl' ? 'text-right' : ''}>{language === 'ar' ? 'الموظف' : 'Employee'}</TableHead>
              )}
              <TableHead className={direction === 'rtl' ? 'text-right' : ''}>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
              <TableHead className={direction === 'rtl' ? 'text-right' : ''}>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
              <TableHead className={direction === 'rtl' ? 'text-right' : ''}>{language === 'ar' ? 'أضافه' : 'Added By'}</TableHead>
              <TableHead className={direction === 'rtl' ? 'text-right' : ''}>{language === 'ar' ? 'السبب' : 'Reason'}</TableHead>
              <TableHead className={direction === 'rtl' ? 'text-right' : ''}>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adjustments.map((adjustment) => {
              const isBonus = adjustment.bonus > 0;
              const amount = isBonus ? adjustment.bonus : adjustment.deduction;
              
              return (
                <TableRow key={adjustment.id}>
                  <TableCell className={direction === 'rtl' ? 'text-right' : ''}>
                    <Badge className={isBonus ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'}>
                      {isBonus 
                        ? (language === 'ar' ? 'مكافأة' : 'Bonus')
                        : (language === 'ar' ? 'خصم' : 'Deduction')
                      }
                    </Badge>
                  </TableCell>
                  {showEmployeeName && (
                    <TableCell className={direction === 'rtl' ? 'text-right' : ''}>{adjustment.employees?.full_name || '—'}</TableCell>
                  )}
                  <TableCell className={direction === 'rtl' ? 'text-right' : ''}>
                    <span className={`font-bold ${isBonus ? 'text-success' : 'text-destructive'}`}>
                      {isBonus ? '+' : '-'}{amount.toLocaleString()}
                    </span>
                    {adjustment.adjustment_days && (
                      <span className="text-xs text-muted-foreground block">
                        ({adjustment.adjustment_days} {language === 'ar' ? 'يوم' : 'days'})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className={`text-muted-foreground ${direction === 'rtl' ? 'text-right' : ''}`}>
                    {formatDate(adjustment.created_at)}
                  </TableCell>
                  <TableCell className={direction === 'rtl' ? 'text-right' : ''}>
                    {adjustment.is_auto_generated ? (
                      <Badge variant="outline" className="gap-1">
                        <Bot className="w-3 h-3" />
                        {language === 'ar' ? 'تلقائي' : 'Auto'}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">{adjustment.added_by_name || '—'}</span>
                    )}
                  </TableCell>
                  <TableCell className={`max-w-[200px] truncate text-muted-foreground ${direction === 'rtl' ? 'text-right' : ''}`}>
                    {adjustment.description || '—'}
                  </TableCell>
                  <TableCell className={direction === 'rtl' ? 'text-right' : ''}>
                    <div className={`flex gap-1 ${direction === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(adjustment)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(adjustment.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'حذف التعديل' : 'Delete Adjustment'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar' 
                ? 'هل أنت متأكد من حذف هذا التعديل؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete this adjustment? This action cannot be undone.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {language === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={!!editAdjustment} onOpenChange={() => setEditAdjustment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              {language === 'ar' ? 'تعديل' : 'Edit Adjustment'}
            </DialogTitle>
          </DialogHeader>
          
          {editAdjustment && (
            <div className="space-y-4 mt-4">
              <div className="p-3 rounded-lg bg-accent/50">
                <Badge className={editAdjustment.bonus > 0 ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'}>
                  {editAdjustment.bonus > 0 
                    ? (language === 'ar' ? 'مكافأة' : 'Bonus')
                    : (language === 'ar' ? 'خصم' : 'Deduction')
                  }
                </Badge>
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'المبلغ' : 'Amount'}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className={editAdjustment.bonus > 0 ? 'text-success' : 'text-destructive'}
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'السبب' : 'Reason'}</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleSaveEdit} 
                  disabled={saving}
                  className="flex-1"
                >
                  {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditAdjustment(null)}
                  className="flex-1"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdjustmentsList;
