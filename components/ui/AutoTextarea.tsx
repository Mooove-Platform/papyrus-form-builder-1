'use client';

import { forwardRef, useEffect, useRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface Props extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'> {
  minRows?: number;
}

/** Textarea qui grandit automatiquement avec son contenu. */
export const AutoTextarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ className, value, minRows = 1, onChange, ...rest }, externalRef) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    function setRefs(el: HTMLTextAreaElement | null) {
      innerRef.current = el;
      if (typeof externalRef === 'function') externalRef(el);
      else if (externalRef) (externalRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    }

    function resize() {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }

    useEffect(resize, [value]);
    useEffect(() => {
      // Resize au montage
      resize();
    }, []);

    // Si value n'est pas fourni, on laisse le textarea totalement non contrôlé
    // (sinon React peut le verrouiller à une chaîne vide et empêcher la frappe).
    const controlledProps = value !== undefined ? { value } : {};

    return (
      <textarea
        ref={setRefs}
        rows={minRows}
        {...controlledProps}
        onChange={(e) => {
          onChange?.(e);
          // Resize en temps réel pour éviter le flash de scroll
          requestAnimationFrame(resize);
        }}
        className={cn('resize-none overflow-hidden', className)}
        {...rest}
      />
    );
  }
);
AutoTextarea.displayName = 'AutoTextarea';
