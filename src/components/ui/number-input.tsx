import * as React from "react";
import { cn } from "@/lib/utils";

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | string | undefined;
  onChange: (value: number) => void;
  allowEmpty?: boolean;
  emptyValue?: number;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value, onChange, allowEmpty = true, emptyValue = 0, min, max, step = "0.01", ...props }, ref) => {
    // Use the value directly - treat undefined/null as emptyValue
    const displayValue = value === undefined || value === null || value === '' 
      ? '' 
      : String(value);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Allow empty input - call onChange with emptyValue
      if (inputValue === '' || inputValue === '-') {
        onChange(emptyValue);
        return;
      }

      // Parse the value
      const isFloat = step && parseFloat(String(step)) % 1 !== 0;
      const numValue = isFloat ? parseFloat(inputValue) : parseInt(inputValue, 10);

      // If not a valid number, don't update
      if (isNaN(numValue)) {
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

      onChange(constrainedValue);
    };

    const handleBlur = () => {
      // On blur, ensure value is valid
      const currentValue = typeof value === 'string' ? parseFloat(value) : (value ?? emptyValue);
      
      if (isNaN(currentValue)) {
        onChange(emptyValue);
        return;
      }

      // Apply constraints on blur
      let constrainedValue = currentValue;
      if (min !== undefined && currentValue < Number(min)) {
        constrainedValue = Number(min);
      }
      if (max !== undefined && currentValue > Number(max)) {
        constrainedValue = Number(max);
      }
      
      if (constrainedValue !== currentValue) {
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
