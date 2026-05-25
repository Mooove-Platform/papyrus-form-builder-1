import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'published' | 'draft' | 'closed' | 'neutral' | 'ai';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const styles: Record<BadgeVariant, string> = {
  published: 'bg-mooove-electric text-mooove-ice border-transparent',
  draft: 'border-mooove-navy text-mooove-navy bg-transparent',
  closed:
    'border-dashed border-papyrus-muted text-papyrus-muted bg-transparent line-through decoration-papyrus-muted',
  neutral: 'bg-bg-elevated text-text-secondary border-border',
  ai: 'bg-mooove-cyan/10 text-mooove-navy border-mooove-cyan/30'
};

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
