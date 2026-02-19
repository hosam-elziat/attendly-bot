import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RamadanQuizSettingsProps {
  company: any;
  onRefetch: () => void;
}

const RamadanQuizSettings = ({ company, onRefetch }: RamadanQuizSettingsProps) => {
  const [enabled, setEnabled] = useState(false);
  const [autoInRamadan, setAutoInRamadan] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) {
      setEnabled((company as any).ramadan_quiz_enabled || false);
      setAutoInRamadan((company as any).ramadan_quiz_auto_in_ramadan ?? true);
    }
  }, [company]);

  const handleSave = async () => {
    if (!company?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          ramadan_quiz_enabled: enabled,
          ramadan_quiz_auto_in_ramadan: autoInRamadan,
        } as any)
        .eq('id', company.id);

      if (error) throw error;
      onRefetch();
      toast.success('تم حفظ إعدادات مسابقة رمضان');
    } catch (err: any) {
      toast.error('فشل في الحفظ: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🌙 مسابقة رمضان
        </CardTitle>
        <CardDescription>
          مسابقة يومية بأسئلة دينية وثقافية - أول إجابة صحيحة 100 نقطة، الثانية 50 نقطة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="quiz-toggle">تفعيل المسابقة</Label>
            <p className="text-xs text-muted-foreground">
              سيتم إرسال سؤال يومي قبل أذان المغرب بنصف ساعة
            </p>
          </div>
          <Switch
            id="quiz-toggle"
            checked={enabled}
            onCheckedChange={setEnabled}
            className="data-[state=checked]:bg-green-500"
          />
        </div>

        {enabled && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
            <div>
              <Label htmlFor="auto-ramadan">تفعيل تلقائي في رمضان</Label>
              <p className="text-xs text-muted-foreground">
                تعمل تلقائياً في شهر رمضان بالإضافة للتفعيل اليدوي
              </p>
            </div>
            <Switch
              id="auto-ramadan"
              checked={autoInRamadan}
              onCheckedChange={setAutoInRamadan}
            />
          </div>
        )}

        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <h4 className="font-medium text-sm mb-2">📋 قواعد المسابقة:</h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>سؤال واحد يومياً يُرسل لجميع الموظفين</li>
            <li>⚡ أول إجابة صحيحة: <strong>100 نقطة</strong></li>
            <li>⭐ ثاني إجابة صحيحة: <strong>50 نقطة</strong></li>
            <li>✨ باقي الإجابات الصحيحة: <strong>50 نقطة</strong></li>
            <li>❌ الإجابة الخاطئة: لا نقاط</li>
            <li>كل موظف يجيب مرة واحدة فقط</li>
          </ul>
        </div>

        <Button onClick={handleSave} disabled={saving} className="btn-primary-gradient">
          {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
          حفظ إعدادات المسابقة
        </Button>
      </CardContent>
    </Card>
  );
};

export default RamadanQuizSettings;
