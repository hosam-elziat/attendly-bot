import * as React from "react";
import { cn } from "@/lib/utils";

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | string;
  onChange: (value: number) => void;
  allowEmpty?: boolean;
  emptyValue?: number;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value, onChange, allowEmpty = true, emptyValue = 0, min, max, step, ...props }, ref) => {
    // Store the display value as string to allow empty state
    const [displayValue, setDisplayValue] = React.useState<string>(String(value ?? ''));
    
    // Track if we're internally updating to avoid loops
    const isInternalUpdate = React.useRef(false);

    // Sync display value when external value changes
    React.useEffect(() => {
      // Skip if this update was triggered internally
      if (isInternalUpdate.current) {
        isInternalUpdate.current = false;
        return;
      }
      
      const numericValue = typeof value === 'string' ? parseFloat(value) || emptyValue : (value ?? emptyValue);
      setDisplayValue(String(numericValue));
    }, [value, emptyValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Allow empty input
      if (inputValue === '' || inputValue === '-') {
        setDisplayValue(inputValue);
        if (inputValue === '') {
          onChange(emptyValue);
        }
        return;
      }

      // Parse the value
      const isFloat = step && parseFloat(String(step)) % 1 !== 0;
      const numValue = isFloat ? parseFloat(inputValue) : parseInt(inputValue, 10);

      // If not a valid number, just update display
      if (isNaN(numValue)) {
        setDisplayValue(inputValue);
        return;
      }

      // Apply min/max constraints
      let constrainedValue = numValue;
      if (min !== undefined && numValue < Number(min)) {
        constrainedValue = Number(min);
      }
      if (max !== undefined && numValue > Number(max)) {
        constrainedValue = Number(max);
      }

      setDisplayValue(inputValue);
      isInternalUpdate.current = true;
      onChange(constrainedValue);
    };

    const handleBlur = () => {
      // On blur, if empty, set to emptyValue
      if (displayValue === '' || displayValue === '-') {
        setDisplayValue(String(emptyValue));
        isInternalUpdate.current = true;
        onChange(emptyValue);
        return;
      }

      // Ensure display matches the constrained value
      const isFloat = step && parseFloat(String(step)) % 1 !== 0;
      const numValue = isFloat ? parseFloat(displayValue) : parseInt(displayValue, 10);
      
      if (!isNaN(numValue)) {
        let constrainedValue = numValue;
        if (min !== undefined && numValue < Number(min)) {
          constrainedValue = Number(min);
        }
        if (max !== undefined && numValue > Number(max)) {
          constrainedValue = Number(max);
        }
        setDisplayValue(String(constrainedValue));
        isInternalUpdate.current = true;
        onChange(constrainedValue);
      }
    };

    return (
      <input
        type="number"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        min={min}
        max={max}
        step={step}
        {...props}
      />
    );
  },
);
NumberInput.displayName = "NumberInput";

export { NumberInput };
