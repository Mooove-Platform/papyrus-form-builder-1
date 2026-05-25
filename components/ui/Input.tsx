import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, hint, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm text-text-secondary">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'h-10 w-full rounded-md border bg-bg-surface px-3 text-sm text-text-primary',
            'placeholder:text-text-tertiary',
            'transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-cta/20',
            error ? 'border-danger' : 'border-border-strong',
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-xs text-text-tertiary">{hint}</p>}
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
