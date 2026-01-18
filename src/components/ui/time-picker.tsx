import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  placeholder?: string;
  className?: string;
}

export function TimePicker({ value, onChange, placeholder = "اختر الوقت", className }: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<'hours' | 'minutes'>('hours');
  
  const [selectedHour, selectedMinute] = React.useMemo(() => {
    if (!value) return [9, 0];
    const parts = value.split(":");
    return [parseInt(parts[0]) || 9, parseInt(parts[1]) || 0];
  }, [value]);

  const handleHourSelect = (hour: number) => {
    onChange(`${hour.toString().padStart(2, "0")}:${selectedMinute.toString().padStart(2, "0")}`);
    setMode('minutes');
  };

  const handleMinuteSelect = (minute: number) => {
    onChange(`${selectedHour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`);
    setOpen(false);
    setMode('hours');
  };

  const formatTime = (time: string) => {
    if (!time) return placeholder;
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const period = hour >= 12 ? "م" : "ص";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${m.padStart(2, '0')} ${period}`;
  };

  // Clock face positions for hours (12-hour format displayed, but we track 24h)
  const hourPositions = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutePositions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const getPosition = (index: number, total: number, radius: number) => {
    const angle = (index * (360 / total) - 90) * (Math.PI / 180);
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  };

  const displayHour = selectedHour === 0 ? 12 : selectedHour > 12 ? selectedHour - 12 : selectedHour;
  const isPM = selectedHour >= 12;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setMode('hours'); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal gap-2",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1">{formatTime(value || "")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4 pointer-events-auto" align="start">
        {/* Time Display */}
        <div className="flex items-center justify-center gap-1 mb-4">
          <button
            type="button"
            onClick={() => setMode('hours')}
            className={cn(
              "text-4xl font-bold px-2 py-1 rounded-lg transition-colors",
              mode === 'hours' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            {selectedHour.toString().padStart(2, '0')}
          </button>
          <span className="text-4xl font-bold">:</span>
          <button
            type="button"
            onClick={() => setMode('minutes')}
            className={cn(
              "text-4xl font-bold px-2 py-1 rounded-lg transition-colors",
              mode === 'minutes' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            {selectedMinute.toString().padStart(2, '0')}
          </button>
        </div>

        {/* AM/PM Toggle */}
        <div className="flex justify-center gap-2 mb-4">
          <Button
            type="button"
            variant={!isPM ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const newHour = selectedHour >= 12 ? selectedHour - 12 : selectedHour;
              onChange(`${newHour.toString().padStart(2, "0")}:${selectedMinute.toString().padStart(2, "0")}`);
            }}
          >
            ص
          </Button>
          <Button
            type="button"
            variant={isPM ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const newHour = selectedHour < 12 ? selectedHour + 12 : selectedHour;
              onChange(`${newHour.toString().padStart(2, "0")}:${selectedMinute.toString().padStart(2, "0")}`);
            }}
          >
            م
          </Button>
        </div>

        {/* Clock Face */}
        <div className="relative w-[220px] h-[220px] mx-auto">
          {/* Clock background */}
          <div className="absolute inset-0 rounded-full bg-muted/50 border-2 border-border" />
          
          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary z-10" />
          
          {/* Clock hand */}
          <div 
            className="absolute top-1/2 left-1/2 origin-bottom bg-primary rounded-full z-5"
            style={{
              width: '2px',
              height: mode === 'hours' ? '60px' : '80px',
              transform: `translate(-50%, -100%) rotate(${
                mode === 'hours' 
                  ? (displayHour % 12) * 30 
                  : selectedMinute * 6
              }deg)`,
              transition: 'transform 0.2s ease-out',
            }}
          />

          {/* Hour/Minute numbers */}
          {mode === 'hours' ? (
            hourPositions.map((hour, index) => {
              const pos = getPosition(index, 12, 85);
              const actualHour = isPM ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
              const isSelected = selectedHour === actualHour || (selectedHour === 0 && hour === 12 && !isPM) || (selectedHour === 12 && hour === 12 && isPM);
              
              return (
                <button
                  key={hour}
                  type="button"
                  onClick={() => handleHourSelect(actualHour)}
                  className={cn(
                    "absolute w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    isSelected 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-primary/20"
                  )}
                  style={{
                    left: `calc(50% + ${pos.x}px - 18px)`,
                    top: `calc(50% + ${pos.y}px - 18px)`,
                  }}
                >
                  {hour}
                </button>
              );
            })
          ) : (
            minutePositions.map((minute, index) => {
              const pos = getPosition(index, 12, 85);
              const isSelected = selectedMinute === minute;
              
              return (
                <button
                  key={minute}
                  type="button"
                  onClick={() => handleMinuteSelect(minute)}
                  className={cn(
                    "absolute w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    isSelected 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-primary/20"
                  )}
                  style={{
                    left: `calc(50% + ${pos.x}px - 18px)`,
                    top: `calc(50% + ${pos.y}px - 18px)`,
                  }}
                >
                  {minute.toString().padStart(2, '0')}
                </button>
              );
            })
          )}
        </div>

        {/* Mode indicator */}
        <div className="text-center text-sm text-muted-foreground mt-3">
          {mode === 'hours' ? 'اختر الساعة' : 'اختر الدقائق'}
        </div>
      </PopoverContent>
    </Popover>
  );
}
