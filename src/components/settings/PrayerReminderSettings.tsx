import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PrayerReminderSettingsProps {
  company: any;
  onRefetch: () => void;
}

const PRAYERS = [
  { id: 'fajr', label: 'الفجر', emoji: '🌅' },
  { id: 'dhuhr', label: 'الظهر', emoji: '☀️' },
  { id: 'asr', label: 'العصر', emoji: '🌤️' },
  { id: 'maghrib', label: 'المغرب', emoji: '🌇' },
  { id: 'isha', label: 'العشاء', emoji: '🌙' },
];

const PrayerReminderSettings = ({ company, onRefetch }: PrayerReminderSettingsProps) => {
  const [enabled, setEnabled] = useState(false);
  const [selectedPrayers, setSelectedPrayers] = useState<string[]>(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) {
      setEnabled((company as any).prayer_reminders_enabled || false);
      setSelectedPrayers((company as any).prayer_reminders_prayers || ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);
    }
  }, [company]);

  const handleTogglePrayer = (prayerId: string) => {
    setSelectedPrayers(prev =>
      prev.includes(prayerId)
        ? prev.filter(p => p !== prayerId)
        : [...prev, prayerId]
    );
  };

  const handleSave = async () => {
    if (!company?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          prayer_reminders_enabled: enabled,
          prayer_reminders_prayers: selectedPrayers,
        } as any)
        .eq('id', company.id);

      if (error) throw error;
      onRefetch();
      toast.success('تم حفظ إعدادات تذكير الصلاة');
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
          🕌 تذكير مواقيت الصلاة
        </CardTitle>
        <CardDescription>
          إرسال تذكير تلقائي عبر التيليجرام بمواقيت الصلاة حسب دولة الشركة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="prayer-toggle">تفعيل تذكير الصلاة</Label>
          <Switch
            id="prayer-toggle"
            checked={enabled}
            onCheckedChange={setEnabled}
            className="data-[state=checked]:bg-success"
          />
        </div>

        {enabled && (
          <>
            <div className="space-y-3">
              <Label>اختر الصلوات للتذكير بها:</Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {PRAYERS.map(prayer => (
                  <div
                    key={prayer.id}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPrayers.includes(prayer.id)
                        ? 'bg-primary/10 border-primary'
                        : 'bg-muted/30 border-border'
                    }`}
                    onClick={() => handleTogglePrayer(prayer.id)}
                  >
                    <Checkbox
                      checked={selectedPrayers.includes(prayer.id)}
                      onCheckedChange={() => handleTogglePrayer(prayer.id)}
                    />
                    <span className="text-sm">
                      {prayer.emoji} {prayer.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 border text-sm text-muted-foreground">
              🕐 سيتم إرسال التذكير عند حلول وقت الأذان بالضبط
            </div>
          </>
        )}

        <Button onClick={handleSave} disabled={saving} className="btn-primary-gradient">
          {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
          حفظ إعدادات الصلاة
        </Button>
      </CardContent>
    </Card>
  );
};

export default PrayerReminderSettings;
