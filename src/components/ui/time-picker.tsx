import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  placeholder?: string;
  className?: string;
}

const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const minutes = ["00", "15", "30", "45"];

export function TimePicker({ value, onChange, placeholder = "اختر الوقت", className }: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  
  const [selectedHour, selectedMinute] = React.useMemo(() => {
    if (!value) return ["09", "00"];
    const parts = value.split(":");
    return [parts[0] || "09", parts[1] || "00"];
  }, [value]);

  const handleHourChange = (hour: string) => {
    onChange(`${hour}:${selectedMinute}`);
  };

  const handleMinuteChange = (minute: string) => {
    onChange(`${selectedHour}:${minute}`);
    setOpen(false);
  };

  const formatTime = (time: string) => {
    if (!time) return placeholder;
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const period = hour >= 12 ? "م" : "ص";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${m} ${period}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
        <div className="flex">
          {/* Hours */}
          <div className="border-e">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground text-center bg-muted/50">
              ساعة
            </div>
            <ScrollArea className="h-[200px] w-16">
              <div className="p-1">
                {hours.map((hour) => (
                  <Button
                    key={hour}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-center font-mono",
                      selectedHour === hour && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                    )}
                    onClick={() => handleHourChange(hour)}
                  >
                    {hour}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          {/* Minutes */}
          <div>
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground text-center bg-muted/50">
              دقيقة
            </div>
            <ScrollArea className="h-[200px] w-16">
              <div className="p-1">
                {minutes.map((minute) => (
                  <Button
                    key={minute}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-center font-mono",
                      selectedMinute === minute && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                    )}
                    onClick={() => handleMinuteChange(minute)}
                  >
                    {minute}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        
        {/* Current Time Display */}
        <div className="border-t p-2 bg-muted/30">
          <div className="text-center">
            <span className="text-lg font-semibold font-mono">
              {selectedHour}:{selectedMinute}
            </span>
            <span className="text-sm text-muted-foreground ms-2">
              ({formatTime(`${selectedHour}:${selectedMinute}`)})
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
