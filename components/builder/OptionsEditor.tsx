'use client';

import { ChevronDown, ChevronUp, GripVertical, Plus, X } from 'lucide-react';
import type { FieldOption } from '@/types';
import { newOptionId } from '@/lib/store/local-forms';

interface Props {
  options: FieldOption[];
  onChange: (next: FieldOption[]) => void;
  scoringEnabled?: boolean;
}

export function OptionsEditor({ options, onChange, scoringEnabled = false }: Props) {
  function update(id: string, label: string) {
    onChange(options.map((o) => (o.id === id ? { ...o, label: { ...o.label, fr: label } } : o)));
  }

  function updatePoints(id: string, points: number) {
    onChange(options.map((o) => (o.id === id ? { ...o, points } : o)));
  }

  function remove(id: string) {
    onChange(options.filter((o) => o.id !== id));
  }

  function add() {
    onChange([
      ...options,
      { id: newOptionId(), label: { fr: `Option ${options.length + 1}` }, ...(scoringEnabled && { points: 0 }) }
    ]);
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Options</div>
      <div className="space-y-1.5">
        {options.map((opt) => (
          <div key={opt.id} className="group flex items-center gap-1.5">
            <GripVertical className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
            <input
              value={opt.label.fr || ''}
              onChange={(e) => update(opt.id, e.target.value)}
              placeholder="Texte de l'option"
              className="h-8 flex-1 rounded-md border border-border-strong bg-bg-base px-2.5 text-sm text-text-primary focus:border-accent focus:outline-none"
            />
            {scoringEnabled && (
              <div className="flex items-center gap-0.5 rounded-md border border-border-strong bg-bg-base px-1.5 py-1">
                <span className="text-xs text-text-secondary min-w-[24px] text-center">
                  {opt.points ?? 0}pts
                </span>
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => updatePoints(opt.id, (opt.points ?? 0) + 1)}
                    className="rounded p-0.5 text-text-tertiary hover:bg-accent/10 hover:text-accent"
                    aria-label="Augmenter les points"
                  >
                    <ChevronUp className="h-2.5 w-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePoints(opt.id, Math.max(0, (opt.points ?? 0) - 1))}
                    className="rounded p-0.5 text-text-tertiary hover:bg-accent/10 hover:text-accent"
                    aria-label="Diminuer les points"
                  >
                    <ChevronDown className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => remove(opt.id)}
              className="rounded p-1 text-text-tertiary opacity-0 transition hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
              aria-label="Supprimer l'option"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border-strong px-3 py-1.5 text-xs text-text-secondary transition hover:border-accent hover:text-text-primary"
      >
        <Plus className="h-3.5 w-3.5" />
        Ajouter une option
      </button>
    </div>
  );
}
