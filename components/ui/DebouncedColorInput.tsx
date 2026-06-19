'use client';

import { useEffect, useState, useRef } from 'react';

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
}

export function DebouncedColorInput({
  value,
  onChange,
  debounceMs = 250,
  className,
  ...props
}: Props) {
  const [localColor, setLocalColor] = useState(value);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronise state when the value prop changes from outside
  useEffect(() => {
    setLocalColor(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalColor(val);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      onChange(val);
    }, debounceMs);
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <input
      type="color"
      value={localColor}
      onChange={handleChange}
      className={className}
      {...props}
    />
  );
}
