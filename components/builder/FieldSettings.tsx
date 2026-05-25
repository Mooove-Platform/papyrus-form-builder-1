'use client';

import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import type { Field, FieldValidation, Form, MultilingualText } from '@/types';
import { FIELD_META } from '@/lib/field-meta';
import { COUNTRIES } from '@/lib/constants/countries';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { OptionsEditor } from './OptionsEditor';
import { StyleEditor } from './StyleEditor';
import { LogicEditor } from './LogicEditor';
import { MatrixEditor } from './MatrixEditor';
import { SubfieldsEditor } from './SubfieldsEditor';
import { Switch } from '@/components/ui/Switch';

interface Props {
  form: Form;
  field: Field;
  globalStyle?: import('@/types').FieldStyle;
  onChange: (patch: Partial<Field>) => void;
}

type Tab = 'content' | 'style' | 'logic';

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

export function FieldSettings({ form, field, globalStyle, onChange }: Props) {
  const [tab, setTab] = useState<Tab>('content');
  const meta = FIELD_META[field.type];
  const isLayout = field.type === 'section_break' || field.type === 'image' || field.type === 'banner' || field.type === 'logo';
  const supportsLogic = !isLayout && field.type !== 'statement';

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border pb-3">
        <div className="papyrus-meta text-xs uppercase tracking-wide not-italic">i. {meta.label}</div>
        <p className="mt-1 text-xs text-text-tertiary">{meta.description}</p>
      </div>

      {/* Tabs */}
      <div className="-mx-5 flex border-b border-border bg-bg-surface">
        <TabButton active={tab === 'content'} onClick={() => setTab('content')}>
          Contenu
        </TabButton>
        <TabButton active={tab === 'style'} onClick={() => setTab('style')}>
          Style
        </TabButton>
        <TabButton
          active={tab === 'logic'}
          onClick={() => setTab('logic')}
          disabled={!supportsLogic}
        >
          Logique
        </TabButton>
      </div>

      {/* Tab content */}
      <div className="flex-1 pt-5">
        {tab === 'content' && <ContentTab field={field} onChange={onChange} />}
        {tab === 'style' && <StyleEditor field={field} globalStyle={globalStyle} onChange={onChange} />}
        {tab === 'logic' && supportsLogic && <LogicEditor form={form} field={field} />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  disabled,
  onClick,
  children
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex-1 border-b-2 px-3 py-2.5 text-xs font-medium uppercase tracking-wide transition',
        active
          ? 'border-accent text-text-primary'
          : 'border-transparent text-text-tertiary hover:text-text-secondary',
        disabled && 'cursor-not-allowed opacity-40 hover:text-text-tertiary'
      )}
    >
      {children}
    </button>
  );
}

// ============================================================================
// Content tab — paramètres standards par type de champ
// ============================================================================

function ContentTab({ field, onChange }: { field: Field; onChange: (patch: Partial<Field>) => void }) {
  const meta = FIELD_META[field.type];
  const lang = 'fr';
  const fileInputRef = useRef<HTMLInputElement>(null);

  function patchMultilingual(key: 'label' | 'description' | 'placeholder', value: string) {
    const current = field[key] ?? ({} as MultilingualText);
    onChange({ [key]: { ...current, [lang]: value } } as Partial<Field>);
  }

  function patchValidation(patch: Partial<FieldValidation>) {
    onChange({ validation: { ...field.validation, ...patch } });
  }

  function handleImageUpload(file: File) {
    if (file.size > MAX_IMAGE_BYTES) {
      alert(
        `Image trop lourde (${Math.round(file.size / 1024)} Ko). En mode local, max 1,5 Mo. Compresse-la ou utilise une URL.`
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patchValidation({ media_url: reader.result as string });
    reader.readAsDataURL(file);
  }

  const isLayout = field.type === 'section_break' || field.type === 'statement' || field.type === 'banner' || field.type === 'logo';

  return (
    <div className="space-y-5">
      {field.type !== 'image' && field.type !== 'video' && (
        <Section title="Contenu">
          <Input
            label={isLayout ? 'Titre' : 'Question'}
            value={field.label?.[lang] ?? ''}
            onChange={(e) => patchMultilingual('label', e.target.value)}
            placeholder={isLayout ? 'Titre de la section' : 'Quelle est votre question ?'}
          />
          <Input
            label={field.type === 'statement' ? 'Texte' : 'Description'}
            value={field.description?.[lang] ?? ''}
            onChange={(e) => patchMultilingual('description', e.target.value)}
            placeholder="Précision optionnelle"
          />
          {meta.hasPlaceholder && (
            <Input
              label="Placeholder"
              value={field.placeholder?.[lang] ?? ''}
              onChange={(e) => patchMultilingual('placeholder', e.target.value)}
              placeholder="Texte indicatif dans le champ vide"
            />
          )}
        </Section>
      )}

      {field.type === 'video' && (
        <Section title="Vidéo">
          <Input
            label="Lien YouTube ou Vimeo"
            value={field.validation?.media_url ?? ''}
            onChange={(e) => patchValidation({ media_url: e.target.value || undefined })}
            placeholder="https://youtube.com/watch?v=..."
          />
          <p className="text-[11px] text-text-tertiary">
            Formats acceptés : youtu.be/ID · youtube.com/watch?v=ID · youtube.com/shorts/ID · vimeo.com/ID
          </p>
        </Section>
      )}

      {field.type === 'image' && (
        <Section title="Image">
          {field.validation?.media_url ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={field.validation.media_url}
                alt="aperçu"
                className="max-h-32 w-full rounded-md border border-border bg-bg-base object-contain"
              />
              <button
                type="button"
                onClick={() => patchValidation({ media_url: undefined })}
                className="flex items-center gap-1.5 text-xs text-danger hover:underline"
              >
                <X className="h-3.5 w-3.5" />
                Retirer l&apos;image
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-md border border-dashed border-border-strong bg-bg-base px-4 py-6 text-sm text-text-secondary transition hover:border-accent"
            >
              <Upload className="h-5 w-5" />
              Téléverser une image
              <span className="text-xs text-text-tertiary">PNG, JPG, SVG · max 1,5 Mo</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImageUpload(f);
              e.target.value = '';
            }}
          />

          <Input
            label="… ou coller une URL"
            value={
              field.validation?.media_url?.startsWith('data:')
                ? ''
                : field.validation?.media_url ?? ''
            }
            onChange={(e) => patchValidation({ media_url: e.target.value || undefined })}
            placeholder="https://…"
          />

          <div>
            <label className="block text-sm text-text-secondary">Alignement</label>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {(['left', 'center', 'right'] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => patchValidation({ alignment: a })}
                  className={`rounded-md border px-3 py-2 text-xs transition ${
                    (field.validation?.alignment ?? 'center') === a
                      ? 'border-accent bg-accent/5 text-text-primary'
                      : 'border-border-strong text-text-secondary hover:border-accent'
                  }`}
                >
                  {a === 'left' ? 'Gauche' : a === 'right' ? 'Droite' : 'Centre'}
                </button>
              ))}
            </div>
          </div>
        </Section>
      )}

      {meta.hasOptions && field.type !== 'matrix' && (
        <Section title="Options">
          <OptionsEditor
            options={field.options}
            onChange={(options) => onChange({ options })}
            scoringEnabled={form?.scoring_enabled ?? false}
          />
        </Section>
      )}

      {(field.type === 'single_choice' || field.type === 'multiple_choice') && (
        <Section title="Disposition">
          <label className="block text-xs text-text-secondary">Nombre de colonnes</label>
          <div className="grid grid-cols-3 gap-1.5">
            {[1, 2, 3].map((n) => {
              const active = (field.validation?.options_columns ?? 1) === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => patchValidation({ options_columns: n as 1 | 2 | 3 })}
                  className={`rounded-md border py-2 text-sm font-medium transition ${
                    active
                      ? 'border-accent bg-accent/5 text-text-primary'
                      : 'border-border-strong text-text-secondary hover:border-accent'
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-text-tertiary">
            Sur mobile, les options reviennent automatiquement en une colonne.
          </p>
        </Section>
      )}

      {field.type === 'single_choice' && (
        <Section title="Affichage">
          <label className="block text-xs text-text-secondary">Style des options</label>
          <div className="grid grid-cols-2 gap-1.5">
            {([
              { value: 'cards', label: 'Cartes' },
              { value: 'buttons', label: 'Boutons' }
            ] as const).map((opt) => {
              const active = (field.validation?.display_style ?? 'cards') === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => patchValidation({ display_style: opt.value })}
                  className={`rounded-md border py-2 text-sm font-medium transition ${
                    active
                      ? 'border-accent bg-accent/5 text-text-primary'
                      : 'border-border-strong text-text-secondary hover:border-accent'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-text-tertiary">
            Cartes = case à cocher visible · Boutons = pastilles pleines.
          </p>
        </Section>
      )}

      {field.type === 'multiple_choice' && (
        <Section title="Limite de sélection">
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              label="Minimum"
              value={field.validation?.selection_min ?? ''}
              onChange={(e) =>
                patchValidation({
                  selection_min: e.target.value === '' ? undefined : Number(e.target.value)
                })
              }
              placeholder="—"
            />
            <Input
              type="number"
              label="Maximum"
              value={field.validation?.selection_max ?? ''}
              onChange={(e) =>
                patchValidation({
                  selection_max: e.target.value === '' ? undefined : Number(e.target.value)
                })
              }
              placeholder="—"
            />
          </div>
          <p className="text-[11px] text-text-tertiary">
            Si renseignées, le répondant ne pourra pas valider hors de cette plage. Laisse vide pour aucune limite.
          </p>
        </Section>
      )}

      {(field.type === 'single_choice' ||
        field.type === 'multiple_choice' ||
        field.type === 'dropdown') && (
        <Section title="Ordre des options">
          <Switch
            checked={field.validation?.randomize_options ?? false}
            onChange={(randomize_options) => patchValidation({ randomize_options })}
            label="Randomiser l'ordre des options"
            description="Mélange aléatoire à chaque chargement pour le répondant. Ton ordre dans le builder reste intact."
          />
        </Section>
      )}

      {field.type === 'multiple_choice' && (
        <Section title="Sous-questions par option cochée">
          <Switch
            checked={field.validation?.has_subfields ?? false}
            onChange={(has_subfields) => patchValidation({ has_subfields })}
            label="Activer les sous-questions"
            description="Une seule série de sous-questions, répétée sous chaque option cochée par le répondant."
          />
          {field.validation?.has_subfields && (
            <SubfieldsEditor
              subfields={field.subfields ?? []}
              onChange={(subfields) => onChange({ subfields })}
            />
          )}
        </Section>
      )}

      {field.type === 'matrix' && (
        <Section title="Matrice">
          <MatrixEditor field={field} onChange={onChange} scoringEnabled={form?.scoring_enabled ?? false} />
        </Section>
      )}

      {field.type === 'phone' && (
        <Section title="Indicatif par défaut">
          <select
            value={field.validation?.default_country ?? 'FR'}
            onChange={(e) => patchValidation({ default_country: e.target.value })}
            className="h-10 w-full rounded-md border border-border-strong bg-bg-surface px-3 text-sm focus:border-accent focus:outline-none"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.dialCode})
              </option>
            ))}
          </select>
        </Section>
      )}

      {field.type === 'rating' && (
        <Section title="Échelle">
          <label className="block text-sm text-text-secondary">Nombre d&apos;étoiles</label>
          <select
            value={field.validation?.max ?? 5}
            onChange={(e) => patchValidation({ max: Number(e.target.value) })}
            className="h-10 w-full rounded-md border border-border-strong bg-bg-surface px-3 text-sm focus:border-accent focus:outline-none"
          >
            {[3, 5, 7, 10].map((n) => (
              <option key={n} value={n}>
                {n} étoiles
              </option>
            ))}
          </select>
        </Section>
      )}

      {field.type === 'number' && (
        <Section title="Validation">
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              label="Minimum"
              value={field.validation?.min ?? ''}
              onChange={(e) =>
                patchValidation({ min: e.target.value === '' ? undefined : Number(e.target.value) })
              }
            />
            <Input
              type="number"
              label="Maximum"
              value={field.validation?.max ?? ''}
              onChange={(e) =>
                patchValidation({ max: e.target.value === '' ? undefined : Number(e.target.value) })
              }
            />
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-t border-dashed border-border pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
