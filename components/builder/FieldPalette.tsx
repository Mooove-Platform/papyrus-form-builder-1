'use client';

import { Plus } from 'lucide-react';
import { FIELD_CATEGORIES, FIELD_META } from '@/lib/field-meta';
import type { FieldType } from '@/types';

interface Props {
  onAdd: (type: FieldType) => void;
}

export function FieldPalette({ onAdd }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="papyrus-meta text-xs uppercase tracking-wide not-italic">i. Ajouter un champ</h2>
        <p className="mt-1 text-xs text-text-tertiary">Cliquez pour ajouter au formulaire</p>
      </div>

      {FIELD_CATEGORIES.map((cat) => (
        <div key={cat.title}>
          <div className="px-1 pb-2 text-xs font-medium uppercase tracking-wider text-text-tertiary">
            {cat.title}
          </div>
          <div className="space-y-1">
            {cat.types.map((type) => {
              const meta = FIELD_META[type];
              const Icon = meta.icon;
              return (
                <button
                  key={type}
                  onClick={() => onAdd(type)}
                  className="group flex w-full items-center gap-3 rounded-md border border-transparent px-2.5 py-2 text-left transition hover:border-border hover:bg-bg-elevated"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-bg-elevated text-text-secondary transition group-hover:bg-mooove-navy group-hover:text-mooove-ice">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm text-text-primary">{meta.label}</span>
                    <span className="block text-xs text-text-tertiary">{meta.description}</span>
                  </span>
                  <Plus className="h-3.5 w-3.5 shrink-0 text-text-tertiary opacity-0 transition group-hover:opacity-100" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
