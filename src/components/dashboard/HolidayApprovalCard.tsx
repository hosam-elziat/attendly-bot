import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Flag, Check, X, Calendar, Loader2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePublicHolidays, PublicHoliday } from '@/hooks/usePublicHolidays';
import {
  useApprovedHolidays,
  useApproveHoliday,
  useRejectHoliday,
  useSyncPublicHolidays,
  ApprovedHoliday,
} from '@/hooks/useApprovedHolidays';

const HolidayApprovalCard = () => {
  const { language } = useLanguage();
  const { data: publicHolidays, isLoading: publicLoading } = usePublicHolidays();
  const { data: approvedHolidays, isLoading: approvedLoading } = useApprovedHolidays(
    new Date().getFullYear(),
    new Date().getMonth()
  );
  const syncHolidays = useSyncPublicHolidays();
  const approveHoliday = useApproveHoliday();
  const rejectHoliday = useRejectHoliday();

  const [daysInputs, setDaysInputs] = useState<Record<string, number>>({});
  const [startDateInputs, setStartDateInputs] = useState<Record<string, Date>>({});

  // Sync public holidays to approved_holidays table
  useEffect(() => {
    if (publicHolidays && publicHolidays.length > 0 && !syncHolidays.isPending) {
      const holidaysToSync = publicHolidays.map((h) => ({
        date: h.date,
        name: h.name,
        localName: h.localName,
      }));
      syncHolidays.mutate(holidaysToSync);
    }
  }, [publicHolidays]);

  const isLoading = publicLoading || approvedLoading;

  // Merge public holidays with approved holidays status
  const mergedHolidays = publicHolidays?.map((holiday) => {
    const approved = approvedHolidays?.find(
      (ah) => ah.holiday_date === holiday.date
    );
    return {
      ...holiday,
      approvedRecord: approved,
      isApproved: approved?.is_approved || false,
      daysCount: approved?.days_count || 1,
      startDate: approved?.start_date || holiday.date,
      id: approved?.id,
    };
  }) || [];

  const handleDaysChange = (holidayDate: string, days: number) => {
    setDaysInputs((prev) => ({ ...prev, [holidayDate]: days }));
  };

  const handleStartDateChange = (holidayDate: string, date: Date | undefined) => {
    if (date) {
      setStartDateInputs((prev) => ({ ...prev, [holidayDate]: date }));
    }
  };

  const getStartDate = (holiday: typeof mergedHolidays[0]) => {
    return startDateInputs[holiday.date] || new Date(holiday.date);
  };

  const handleApprove = (holiday: typeof mergedHolidays[0]) => {
    if (!holiday.id) return;
    const days = daysInputs[holiday.date] || holiday.daysCount || 1;
    const startDate = startDateInputs[holiday.date] || new Date(holiday.date);
    approveHoliday.mutate({ 
      holidayId: holiday.id, 
      daysCount: days,
      startDate: format(startDate, 'yyyy-MM-dd')
    });
  };

  const handleReject = (holiday: typeof mergedHolidays[0]) => {
    if (!holiday.id) return;
    rejectHoliday.mutate(holiday.id);
  };

  if (isLoading) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!mergedHolidays || mergedHolidays.length === 0) {
    return null;
  }

  return (
    <Card className="mt-4 border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Flag className="w-4 h-4 text-primary" />
          {language === 'ar' ? 'الإجازات الرسمية هذا الشهر' : 'Public Holidays This Month'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mergedHolidays.map((holiday, index) => (
            <div
              key={index}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-background/50 border"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">
                    {language === 'ar' ? holiday.localName : holiday.name}
                  </p>
                  {holiday.isApproved && (
                    <Badge variant="default" className="bg-success text-success-foreground">
                      <Check className="w-3 h-3 mr-1" />
                      {language === 'ar' ? 'معتمد' : 'Approved'}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="w-3 h-3" />
                  {holiday.isApproved ? (
                    // Show the approved start date for approved holidays
                    format(new Date(holiday.startDate), 'EEEE, d MMMM yyyy', {
                      locale: language === 'ar' ? ar : undefined,
                    })
                  ) : (
                    // Show original holiday date for non-approved
                    format(new Date(holiday.date), 'EEEE, d MMMM yyyy', {
                      locale: language === 'ar' ? ar : undefined,
                    })
                  )}
                  {holiday.isApproved && holiday.daysCount > 1 && (
                    <span className="text-primary font-medium">
                      ({holiday.daysCount} {language === 'ar' ? 'أيام' : 'days'})
                    </span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!holiday.isApproved && (
                  <>
                    {/* Start Date Picker */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {language === 'ar' ? 'تاريخ البدء:' : 'Start:'}
                      </span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "h-8 w-[120px] justify-start text-left font-normal",
                              !startDateInputs[holiday.date] && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-1 h-3 w-3" />
                            <span className="text-xs">
                              {format(getStartDate(holiday), 'd/M/yyyy')}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={getStartDate(holiday)}
                            onSelect={(date) => handleStartDateChange(holiday.date, date)}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Days Count Input */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {language === 'ar' ? 'عدد الأيام:' : 'Days:'}
                      </span>
                      <Input
                        type="number"
                        min={1}
                        max={7}
                        value={daysInputs[holiday.date] || holiday.daysCount || 1}
                        onChange={(e) =>
                          handleDaysChange(holiday.date, parseInt(e.target.value) || 1)
                        }
                        className="w-16 h-8 text-center"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-success hover:bg-success/90"
                      onClick={() => handleApprove(holiday)}
                      disabled={approveHoliday.isPending || !holiday.id}
                    >
                      {approveHoliday.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span className="mr-1 hidden sm:inline">
                        {language === 'ar' ? 'اعتماد' : 'Approve'}
                      </span>
                    </Button>
                  </>
                )}

                {holiday.isApproved && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(holiday)}
                    disabled={rejectHoliday.isPending}
                  >
                    {rejectHoliday.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    <span className="mr-1 hidden sm:inline">
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </span>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default HolidayApprovalCard;
