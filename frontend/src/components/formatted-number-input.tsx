
'use client'

import { Input } from "@/components/ui/input"
import React, { useEffect, useState, forwardRef } from "react"

interface FormattedNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  [key: string]: any;
}

export const FormattedNumberInput = forwardRef<HTMLInputElement, FormattedNumberInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(value?.toLocaleString('en-US') || '');

    useEffect(() => {
      // This effect ensures that if the form value is reset externally, the display updates.
      if (value !== parseFloat(displayValue.replace(/,/g, ''))) {
        setDisplayValue(value?.toLocaleString('en-US') || '');
      }
    }, [value, displayValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/,/g, '');
      const numberValue = parseFloat(rawValue);

      if (!isNaN(numberValue)) {
        setDisplayValue(numberValue.toLocaleString('en-US'));
        onChange(numberValue);
      } else if (rawValue === '' || rawValue === '-') {
        setDisplayValue(rawValue);
        onChange(0);
      }
    };

    return <Input ref={ref} type="text" value={displayValue} onChange={handleChange} {...props} />;
  }
);

FormattedNumberInput.displayName = 'FormattedNumberInput';
