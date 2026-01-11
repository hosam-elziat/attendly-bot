import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, DollarSign, Plus, Minus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLogAction } from '@/hooks/useAuditLogs';

interface EditDeductionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  month: string;
  onSuccess: () => void;
}

const EditDeductionDialog = ({ open, onOpenChange, employeeId, employeeName, month, onSuccess }: EditDeductionDialogProps) => {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const logAction = useLogAction();
  const [submitting, setSubmitting] = useState(false);
  const [bonus, setBonus] = useState('');
  const [deduction, setDeduction] = useState('');
  const [description, setDescription] = useState('');
  const [activeTab, setActiveTab] = useState('bonus');

  const handleSave = async () => {
    if (!profile?.company_id) return;

    const amount = activeTab === 'bonus' ? parseFloat(bonus) : parseFloat(deduction);
    
    if (isNaN(amount) || amount <= 0) {
      toast.error(language === 'ar' ? 'الرجاء إدخال مبلغ صحيح' : 'Please enter a valid amount');
      return;
    }

    setSubmitting(true);

    try {
      // Convert month string (YYYY-MM) to date format (YYYY-MM-01)
      const monthDate = `${month}-01`;
      
      const insertData = {
        employee_id: employeeId,
        company_id: profile.company_id,
        month: monthDate,
        bonus: activeTab === 'bonus' ? amount : 0,
        deduction: activeTab === 'deduction' ? amount : 0,
        description: description || null,
      };

      const { data, error } = await supabase
        .from('salary_adjustments')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await logAction.mutateAsync({
        tableName: 'salary_adjustments',
        recordId: data.id,
        action: 'insert',
        newData: { ...insertData, id: data.id, full_name: employeeName },
      });

      toast.success(
        activeTab === 'bonus' 
          ? (language === 'ar' ? 'تم إضافة المكافأة بنجاح' : 'Bonus added successfully')
          : (language === 'ar' ? 'تم إضافة الخصم بنجاح' : 'Deduction added successfully')
      );
      
      onOpenChange(false);
      setBonus('');
      setDeduction('');
      setDescription('');
      onSuccess();
    } catch (error) {
      console.error('Error adding adjustment:', error);
      toast.error(language === 'ar' ? 'فشل في إضافة التعديل' : 'Failed to add adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            {language === 'ar' ? 'تعديل الراتب' : 'Salary Adjustment'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="p-3 rounded-lg bg-accent/50">
            <p className="font-medium text-foreground">{employeeName}</p>
            <p className="text-sm text-muted-foreground">{month}</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bonus" className="flex items-center gap-1">
                <Plus className="w-3 h-3" />
                {language === 'ar' ? 'مكافأة' : 'Bonus'}
              </TabsTrigger>
              <TabsTrigger value="deduction" className="flex items-center gap-1">
                <Minus className="w-3 h-3" />
                {language === 'ar' ? 'خصم' : 'Deduction'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bonus" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'مبلغ المكافأة' : 'Bonus Amount'}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={bonus}
                  onChange={(e) => setBonus(e.target.value)}
                  placeholder="0.00"
                  className="text-success"
                />
              </div>
            </TabsContent>

            <TabsContent value="deduction" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'مبلغ الخصم' : 'Deduction Amount'}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deduction}
                  onChange={(e) => setDeduction(e.target.value)}
                  placeholder="0.00"
                  className="text-destructive"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'السبب (اختياري)' : 'Reason (Optional)'}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={language === 'ar' ? 'سبب المكافأة أو الخصم...' : 'Reason for bonus or deduction...'}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSave} 
              disabled={submitting}
              className={`flex-1 ${activeTab === 'bonus' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'}`}
            >
              {submitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {activeTab === 'bonus' 
                ? (language === 'ar' ? 'إضافة مكافأة' : 'Add Bonus')
                : (language === 'ar' ? 'إضافة خصم' : 'Add Deduction')}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditDeductionDialog;
