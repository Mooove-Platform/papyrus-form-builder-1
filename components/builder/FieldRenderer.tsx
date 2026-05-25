'use client';

import { useMemo, useState } from 'react';
import { Star, Upload, ImageOff, PlayCircle } from 'lucide-react';
import type { Field, FieldOption, SubField } from '@/types';
import { DEFAULT_MAX_LENGTH } from '@/lib/field-meta';
import { AutoTextarea } from '@/components/ui/AutoTextarea';
import { PhoneField as BuilderPhoneField } from './fields/PhoneField';
import { PhoneField as RespondentPhoneField } from '@/components/respondent/fields/PhoneField';
import { parseVideoEmbed } from '@/lib/video';
import { cn } from '@/lib/utils';

/** Mélange un tableau de façon stable pour une vie de composant (Fisher–Yates). */
function shuffled<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Renvoie les options dans l'ordre du builder ou mélangées, selon la config. */
function useDisplayOptions(field: Field): FieldOption[] {
  const shouldRandomize = field.validation?.randomize_options ?? false;
  // useMemo sur l'identité du champ + flag : on mélange une seule fois par montage,
  // pas à chaque re-render (sinon les options sauteraient quand l'utilisateur tape).
  return useMemo(
    () => (shouldRandomize ? shuffled(field.options ?? []) : field.options ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [field.id, shouldRandomize]
  );
}

interface Props {
  field: Field;
  /** En mode preview (builder), les champs qui collectent une réponse ne sont PAS interactifs.
   *  Le créateur ne doit pas pouvoir cliquer une étoile, un NPS, etc. */
  preview?: boolean;
  /** Si true, force la mise en page mobile (1 colonne pour les options). */
  mobile?: boolean;
}

/** Rendu UI d'un champ — utilisé dans le builder (preview) et la vue publique. */
export function FieldRenderer({ field, preview = false, mobile = false }: Props) {
  const lang = 'fr';
  const placeholder = field.placeholder?.[lang] ?? '';
  const required = field.required;
  const baseInput =
    'w-full rounded-md border border-border-strong bg-bg-base px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none disabled:cursor-default disabled:opacity-100';

  switch (field.type) {
    case 'short_text':
      return (
        <input
          type="text"
          name={field.id}
          required={required && !preview}
          maxLength={field.validation?.max ?? DEFAULT_MAX_LENGTH.short_text}
          className={baseInput}
          placeholder={placeholder || 'Votre réponse'}
          disabled={preview}
        />
      );

    case 'email':
      return (
        <ValidatedTextInput
          name={field.id}
          type="email"
          required={required && !preview}
          maxLength={DEFAULT_MAX_LENGTH.email}
          placeholder={placeholder || 'vous@exemple.com'}
          baseInput={baseInput}
          preview={preview}
        />
      );

    case 'url':
      return (
        <ValidatedTextInput
          name={field.id}
          type="url"
          required={required && !preview}
          maxLength={DEFAULT_MAX_LENGTH.url}
          placeholder={placeholder || 'https://exemple.com'}
          baseInput={baseInput}
          preview={preview}
        />
      );

    case 'long_text':
      return (
        <AutoTextarea
          name={field.id}
          minRows={3}
          required={required && !preview}
          maxLength={field.validation?.max ?? DEFAULT_MAX_LENGTH.long_text}
          className={`${baseInput} break-words`}
          placeholder={placeholder || 'Votre réponse…'}
          disabled={preview}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          name={field.id}
          required={required && !preview}
          className={baseInput}
          placeholder={placeholder || '0'}
          min={field.validation?.min}
          max={field.validation?.max}
          disabled={preview}
        />
      );

    case 'phone':
      return preview ? (
        <BuilderPhoneField
          placeholder={placeholder || '57 12 34 56'}
        />
      ) : (
        <RespondentPhoneField
          name={field.id}
          required={required}
          placeholder={placeholder || '57 12 34 56'}
        />
      );

    case 'date':
      return (
        <input
          type="date"
          name={field.id}
          required={required && !preview}
          className={baseInput}
          disabled={preview}
        />
      );

    case 'single_choice':
      return <SingleChoice field={field} preview={preview} mobile={mobile} required={required} />;

    case 'multiple_choice':
      return <MultipleChoice field={field} preview={preview} mobile={mobile} required={required} />;

    case 'dropdown':
      return <DropdownChoice field={field} preview={preview} baseInput={baseInput} required={required} />;

    case 'rating': {
      const max = field.validation?.max ?? 5;
      return <Rating max={max} preview={preview} />;
    }

    case 'nps':
      return <NpsScale preview={preview} />;

    case 'file':
      return <FilePicker preview={preview} required={required} />;

    case 'matrix':
      return <MatrixField field={field} preview={preview} />;

    case 'image': {
      const url = field.validation?.media_url;
      const alignment = field.validation?.alignment ?? 'center';
      const alignClass =
        alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center';
      if (!url) {
        return (
          <div className="flex items-center justify-center rounded-md border border-dashed border-border-strong bg-bg-base px-4 py-10 text-text-tertiary">
            <div className="flex flex-col items-center gap-2">
              <ImageOff className="h-6 w-6" />
              <span className="text-xs">Ajoutez une image dans le panneau de droite</span>
            </div>
          </div>
        );
      }
      return (
        <div className={`flex ${alignClass}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={field.label.fr || 'Image'}
            className="max-h-80 max-w-full rounded-md object-contain"
          />
        </div>
      );
    }

    case 'video': {
      const url = field.validation?.media_url;
      if (!url) {
        return (
          <div className="flex items-center justify-center rounded-md border border-dashed border-border-strong bg-bg-base px-4 py-10 text-text-tertiary">
            <div className="flex flex-col items-center gap-2">
              <PlayCircle className="h-6 w-6" />
              <span className="text-xs">Collez un lien YouTube ou Vimeo dans le panneau de droite</span>
            </div>
          </div>
        );
      }
      const parsed = parseVideoEmbed(url);
      if (!parsed) {
        return (
          <div className="rounded-md border border-dashed border-danger/40 bg-danger/5 px-4 py-3 text-xs text-danger">
            URL non reconnue — uniquement YouTube et Vimeo sont supportés pour l&apos;instant.
          </div>
        );
      }
      return (
        <div className="aspect-video w-full overflow-hidden rounded-md border border-border bg-black">
          <iframe
            src={parsed.embedUrl}
            title={field.label.fr || 'Vidéo'}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }

    case 'section_break':
    case 'statement':
      // Gérés par FieldCard (rendu spécial)
      return null;

    default:
      return null;
  }
}

function EmptyOptions() {
  return (
    <div className="rounded-md border border-dashed border-border-strong bg-bg-base px-3 py-2 text-xs text-text-tertiary">
      Aucune option — ajoutez-en dans le panneau de droite
    </div>
  );
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/[^\s]+$/i;

function ValidatedTextInput({
  name,
  type,
  maxLength,
  placeholder,
  baseInput,
  preview,
  required
}: {
  name?: string;
  type: 'email' | 'url';
  maxLength: number;
  placeholder: string;
  baseInput: string;
  preview: boolean;
  required?: boolean;
}) {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);

  let error: string | null = null;
  if (touched && value) {
    if (type === 'email' && !EMAIL_REGEX.test(value)) {
      error = 'Email invalide — il doit contenir « @ » et un domaine.';
    } else if (type === 'url' && !URL_REGEX.test(value)) {
      error = 'URL invalide — doit commencer par http:// ou https://';
    }
  }

  return (
    <div className="space-y-1">
      <input
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        disabled={preview}
        className={`${baseInput} ${error ? 'border-danger focus:border-danger' : ''}`}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

const OTHER_VALUE = '__other__';

function optionsGridClass(cols: number, mobile: boolean): string {
  if (mobile || cols === 1) return 'space-y-2';
  if (cols === 3) return 'grid grid-cols-3 gap-2';
  return 'grid grid-cols-2 gap-2';
}

function SingleChoice({ field, preview, mobile, required }: { field: Field; preview: boolean; mobile: boolean; required?: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [otherText, setOtherText] = useState('');
  const hasOther = field.validation?.has_other ?? false;
  const otherLabel = field.validation?.other_label || 'Autre';
  const cols = field.validation?.options_columns ?? 1;
  const style = field.validation?.display_style ?? 'cards';
  const isButtons = style === 'buttons';
  const displayOptions = useDisplayOptions(field);

  // Rendu en boutons pleins (radio caché, bouton visible).
  if (isButtons) {
    return (
      <div className="space-y-2">
        {/* Validation native cachée : un radio required invisible pour bloquer si rien n'est coché. */}
        {required && !preview && (
          <input
            type="radio"
            name={field.id}
            tabIndex={-1}
            required
            checked={selected !== null}
            onChange={() => {}}
            onInvalid={(e) =>
              (e.target as HTMLInputElement).setCustomValidity('Choisis une option.')
            }
            onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
            style={{
              position: 'absolute',
              opacity: 0,
              pointerEvents: 'none',
              height: 0,
              width: 0
            }}
            aria-hidden
          />
        )}
        <div className={optionsGridClass(cols, mobile)}>
          {displayOptions.length === 0 && !hasOther && <EmptyOptions />}
          {displayOptions.map((opt, i) => {
            const active = selected === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={preview}
                onClick={() => !preview && setSelected(opt.id)}
                className={cn(
                  'w-full break-words rounded-md border px-3 py-2 text-center text-sm transition',
                  active
                    ? 'border-accent bg-accent text-mooove-ice'
                    : 'border-border-strong bg-bg-base text-text-primary',
                  preview ? 'cursor-default' : 'cursor-pointer hover:border-accent'
                )}
              >
                {opt.label.fr || `Option ${i + 1}`}
              </button>
            );
          })}
          {hasOther && (
            <button
              type="button"
              disabled={preview}
              onClick={() => !preview && setSelected(OTHER_VALUE)}
              className={cn(
                'w-full break-words rounded-md border px-3 py-2 text-center text-sm italic transition',
                selected === OTHER_VALUE
                  ? 'border-accent bg-accent text-mooove-ice'
                  : 'border-border-strong bg-bg-base text-text-secondary',
                preview ? 'cursor-default' : 'cursor-pointer hover:border-accent'
              )}
            >
              {otherLabel}
            </button>
          )}
        </div>
        {hasOther && selected === OTHER_VALUE && (
          <input
            type="text"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            disabled={preview}
            placeholder="Précisez…"
            className="w-full rounded-md border border-border-strong bg-bg-base px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
        )}
      </div>
    );
  }

  // Rendu en cartes (radio classique visible).
  return (
    <div className="space-y-2">
      <div className={optionsGridClass(cols, mobile)}>
        {displayOptions.length === 0 && !hasOther && <EmptyOptions />}
        {displayOptions.map((opt, i) => (
          <label
            key={opt.id}
            className={`flex items-center gap-2.5 rounded-md border border-border bg-bg-base px-3 py-2 text-sm text-text-primary transition has-[:checked]:border-accent has-[:checked]:bg-accent/5 ${
              preview ? 'cursor-default' : 'cursor-pointer hover:border-accent'
            }`}
          >
            <input
              type="radio"
              name={field.id}
              value={opt.id}
              required={required && !preview}
              disabled={preview}
              checked={selected === opt.id}
              onChange={() => setSelected(opt.id)}
              className="h-4 w-4"
              style={{ accentColor: 'var(--accent)' }}
            />
            <span className="break-words">{opt.label.fr || `Option ${i + 1}`}</span>
          </label>
        ))}
      </div>
      {hasOther && (
        <div>
          <label
            className={`flex items-center gap-2.5 rounded-md border border-border bg-bg-base px-3 py-2 text-sm text-text-primary transition has-[:checked]:border-accent has-[:checked]:bg-accent/5 ${
              preview ? 'cursor-default' : 'cursor-pointer hover:border-accent'
            }`}
          >
            <input
              type="radio"
              name={field.id}
              disabled={preview}
              checked={selected === OTHER_VALUE}
              onChange={() => setSelected(OTHER_VALUE)}
              className="h-4 w-4"
              style={{ accentColor: 'var(--accent)' }}
            />
            <span className="break-words italic text-text-secondary">{otherLabel}</span>
          </label>
          {selected === OTHER_VALUE && (
            <input
              type="text"
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              disabled={preview}
              placeholder="Précisez…"
              className="mt-1 w-full rounded-md border border-border-strong bg-bg-base px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />
          )}
        </div>
      )}
    </div>
  );
}

function MultipleChoice({ field, preview, mobile, required }: { field: Field; preview: boolean; mobile: boolean; required?: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [otherText, setOtherText] = useState('');
  // Réponses aux sous-questions : { [optionId]: { [subfieldId]: string } }
  const [subAnswers, setSubAnswers] = useState<Record<string, Record<string, string>>>({});
  const hasOther = field.validation?.has_other ?? false;
  const otherLabel = field.validation?.other_label || 'Autre';
  const cols = field.validation?.options_columns ?? 1;
  const hasSubfields = field.validation?.has_subfields ?? false;
  const subfields = field.subfields ?? [];
  const min = field.validation?.selection_min;
  const max = field.validation?.selection_max;
  const displayOptions = useDisplayOptions(field);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        // Si une borne max est définie, on bloque l'ajout
        if (typeof max === 'number' && next.size >= max) return prev;
        next.add(id);
      }
      return next;
    });
  }

  function setSubAnswer(optId: string, sfId: string, value: string) {
    setSubAnswers((prev) => ({
      ...prev,
      [optId]: { ...(prev[optId] ?? {}), [sfId]: value }
    }));
  }

  const totalChecked = selected.size;
  // La sélection est valide si elle respecte min/max ET la contrainte required.
  const minOk = typeof min === 'number' ? totalChecked >= min : true;
  const maxOk = typeof max === 'number' ? totalChecked <= max : true;
  const selectionValid = minOk && maxOk && (!required || totalChecked > 0);

  const limitMessage = formatLimitMessage(min, max);
  const errorMessage = !minOk
    ? `Choisis au moins ${min} option${(min ?? 0) > 1 ? 's' : ''}.`
    : !maxOk
      ? `Maximum ${max} option${(max ?? 0) > 1 ? 's' : ''}.`
      : required && totalChecked === 0
        ? 'Coche au moins une option.'
        : null;

  return (
    <div className="space-y-2">
      {/* Champ caché pour validation native : exprime la validité combinée required + min/max */}
      {!preview && (required || typeof min === 'number' || typeof max === 'number') && (
        <input
          type="text"
          tabIndex={-1}
          required
          value={selectionValid ? '1' : ''}
          onChange={() => {}}
          onInvalid={(e) =>
            (e.target as HTMLInputElement).setCustomValidity(errorMessage || 'Sélection invalide.')
          }
          onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
            height: 0,
            width: 0
          }}
          aria-hidden
        />
      )}

      {/* Sous-questions activées : chaque option occupe une ligne pour pouvoir
          afficher les sous-champs en dessous quand l'option est cochée. */}
      {hasSubfields ? (
        <div className="space-y-2">
          {displayOptions.length === 0 && !hasOther && <EmptyOptions />}
          {displayOptions.map((opt, i) => {
            const checked = selected.has(opt.id);
            return (
              <div key={opt.id}>
                <label
                  className={`flex items-center gap-2.5 rounded-md border border-border bg-bg-base px-3 py-2 text-sm text-text-primary transition has-[:checked]:border-accent has-[:checked]:bg-accent/5 ${
                    preview ? 'cursor-default' : 'cursor-pointer hover:border-accent'
                  }`}
                >
                  <input
                    type="checkbox"
                    name={field.id}
                    value={opt.id}
                    disabled={preview}
                    checked={checked}
                    onChange={() => toggle(opt.id)}
                    className="h-4 w-4 rounded"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span className="break-words">{opt.label.fr || `Option ${i + 1}`}</span>
                </label>
                {checked && subfields.length > 0 && (
                  <div className="ml-6 mt-2 space-y-3 border-l-2 border-accent/30 pl-4">
                    {subfields.map((sf) => (
                      <SubfieldRenderer
                        key={`${opt.id}-${sf.id}`}
                        subfield={sf}
                        optionId={opt.id}
                        value={subAnswers[opt.id]?.[sf.id] ?? ''}
                        onChange={(v) => setSubAnswer(opt.id, sf.id, v)}
                        preview={preview}
                        mobile={mobile}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className={optionsGridClass(cols, mobile)}>
          {displayOptions.length === 0 && !hasOther && <EmptyOptions />}
          {displayOptions.map((opt, i) => (
            <label
              key={opt.id}
              className={`flex items-center gap-2.5 rounded-md border border-border bg-bg-base px-3 py-2 text-sm text-text-primary transition has-[:checked]:border-accent has-[:checked]:bg-accent/5 ${
                preview ? 'cursor-default' : 'cursor-pointer hover:border-accent'
              }`}
            >
              <input
                type="checkbox"
                name={field.id}
                value={opt.id}
                disabled={preview}
                checked={selected.has(opt.id)}
                onChange={() => toggle(opt.id)}
                className="h-4 w-4 rounded"
                style={{ accentColor: 'var(--accent)' }}
              />
              <span className="break-words">{opt.label.fr || `Option ${i + 1}`}</span>
            </label>
          ))}
        </div>
      )}

      {hasOther && (
        <div>
          <label
            className={`flex items-center gap-2.5 rounded-md border border-border bg-bg-base px-3 py-2 text-sm text-text-primary transition has-[:checked]:border-accent has-[:checked]:bg-accent/5 ${
              preview ? 'cursor-default' : 'cursor-pointer hover:border-accent'
            }`}
          >
            <input
              type="checkbox"
              disabled={preview}
              checked={selected.has(OTHER_VALUE)}
              onChange={() => toggle(OTHER_VALUE)}
              className="h-4 w-4 rounded"
              style={{ accentColor: 'var(--accent)' }}
            />
            <span className="break-words italic text-text-secondary">{otherLabel}</span>
          </label>
          {selected.has(OTHER_VALUE) && (
            <input
              type="text"
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              disabled={preview}
              placeholder="Précisez…"
              className="mt-1 w-full rounded-md border border-border-strong bg-bg-base px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />
          )}
        </div>
      )}

      {/* Indication sur la plage autorisée — rouge si la sélection est hors plage */}
      {limitMessage && (
        <p
          className={cn(
            'text-[11px] italic',
            minOk && maxOk ? 'text-text-tertiary' : 'font-medium not-italic text-danger'
          )}
        >
          {limitMessage} · {totalChecked} coché{totalChecked > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

function formatLimitMessage(min?: number, max?: number): string | null {
  if (typeof min === 'number' && typeof max === 'number') {
    if (min === max) return `Choisis exactement ${min} option${min > 1 ? 's' : ''}`;
    return `Choisis entre ${min} et ${max} options`;
  }
  if (typeof min === 'number') return `Choisis au moins ${min} option${min > 1 ? 's' : ''}`;
  if (typeof max === 'number') return `Choisis jusqu'à ${max} option${max > 1 ? 's' : ''}`;
  return null;
}

/** Rendu d'un sous-champ sous une option cochée — délègue à FieldRenderer en adaptant la forme. */
function SubfieldRenderer({
  subfield,
  optionId,
  value,
  onChange,
  preview,
  mobile
}: {
  subfield: SubField;
  /** ID de l'option parente cochée — sert à isoler ce sous-champ des autres répétitions
   *  (sinon toutes les radios "privé/partagé" partagent le même name et se comportent comme un seul groupe). */
  optionId: string;
  value: string;
  onChange: (value: string) => void;
  preview: boolean;
  mobile: boolean;
}) {
  // On compose l'id : { optionId }__{ subfieldId } — c'est aussi le format prévu pour
  // la colonne SQL (lib/submission-columns.ts) à la soumission.
  const compositeId = `${optionId}__${subfield.id}`;

  // On adapte le SubField en pseudo-Field pour réutiliser FieldRenderer. L'id composite
  // garantit l'unicité des `name` HTML pour chaque répétition.
  const pseudoField: Field = {
    id: compositeId,
    form_id: '',
    type: subfield.type,
    label: subfield.label,
    description: subfield.description,
    placeholder: subfield.placeholder,
    options: subfield.options,
    rows: subfield.rows,
    required: subfield.required,
    field_order: 0,
    validation: subfield.validation,
    style: subfield.style
  };

  return (
    <div className="space-y-1">
      <label className="block text-xs text-text-secondary">
        {subfield.label.fr || 'Sous-question'}
        {subfield.required && <span className="ml-1 text-danger">*</span>}
      </label>
      <FieldRenderer field={pseudoField} preview={preview} mobile={mobile} />
      {/* On garde value/onChange pour la persistance localStorage (save & resume) future :
          la collecte se fait par DOM/FormData côté soumission. */}
      <input type="hidden" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function DropdownChoice({
  field,
  preview,
  baseInput,
  required
}: {
  field: Field;
  preview: boolean;
  baseInput: string;
  required?: boolean;
}) {
  const [value, setValue] = useState('');
  const [otherText, setOtherText] = useState('');
  const hasOther = field.validation?.has_other ?? false;
  const otherLabel = field.validation?.other_label || 'Autre';
  const displayOptions = useDisplayOptions(field);

  return (
    <div className="space-y-2">
      <select
        name={field.id}
        className={baseInput}
        disabled={preview}
        required={required && !preview}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        <option value="" disabled>
          Sélectionner…
        </option>
        {displayOptions.map((opt, i) => (
          <option key={opt.id} value={opt.id}>
            {opt.label.fr || `Option ${i + 1}`}
          </option>
        ))}
        {hasOther && <option value={OTHER_VALUE}>{otherLabel}</option>}
      </select>
      {hasOther && value === OTHER_VALUE && (
        <input
          type="text"
          value={otherText}
          onChange={(e) => setOtherText(e.target.value)}
          disabled={preview}
          placeholder="Précisez…"
          className={baseInput}
        />
      )}
    </div>
  );
}

function Rating({ max, preview }: { max: number; preview: boolean }) {
  const [hover, setHover] = useState(0);
  const [value, setValue] = useState(0);

  if (preview) {
    return (
      <div className="flex items-center gap-1.5">
        {Array.from({ length: max }).map((_, i) => (
          <Star key={i} className="h-7 w-7 text-text-tertiary" strokeWidth={1.5} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: max }).map((_, i) => {
        const filled = (hover || value) > i;
        return (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHover(i + 1)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setValue(i + 1)}
            className="transition"
            aria-label={`Note ${i + 1}`}
          >
            <Star
              className={`h-7 w-7 transition ${filled ? 'fill-mooove-amber text-mooove-amber' : 'text-text-tertiary'}`}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </div>
  );
}

function NpsScale({ preview }: { preview: boolean }) {
  const [value, setValue] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 11 }).map((_, i) => (
          <button
            key={i}
            type="button"
            disabled={preview}
            onClick={() => setValue(i)}
            className={`h-9 w-9 rounded-md border text-sm transition disabled:cursor-default ${
              value === i && !preview
                ? 'border-accent bg-accent text-mooove-ice'
                : 'border-border-strong bg-bg-base text-text-primary'
            } ${!preview && 'hover:border-accent'}`}
          >
            {i}
          </button>
        ))}
      </div>
      <div className="flex justify-between px-1 text-xs text-text-tertiary">
        <span>Pas du tout probable</span>
        <span>Extrêmement probable</span>
      </div>
    </div>
  );
}

function FilePicker({ preview, required }: { preview: boolean; required?: boolean }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const inputId = `file-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <label
      htmlFor={inputId}
      className={`flex flex-col items-center gap-2 rounded-md border border-dashed border-border-strong bg-bg-base px-4 py-6 text-sm text-text-secondary transition ${
        preview ? 'cursor-default' : 'cursor-pointer hover:border-accent hover:bg-bg-elevated'
      }`}
    >
      <Upload className="h-5 w-5" />
      {fileName ? (
        <span className="break-all text-center text-text-primary">{fileName}</span>
      ) : (
        <span className="text-center">
          <span className="text-text-primary underline-offset-4">Choisir un fichier</span>
          <span className="block text-xs text-text-tertiary">
            ou glissez-le ici · photo, vidéo, document…
          </span>
        </span>
      )}
      <input
        id={inputId}
        type="file"
        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
        className="hidden"
        required={required && !preview}
        disabled={preview}
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />
    </label>
  );
}

function MatrixField({ field, preview }: { field: Field; preview: boolean }) {
  const rows = field.rows ?? [];
  const cols = field.options ?? [];
  const mode = field.validation?.matrix_mode ?? 'single';
  const inputType = mode === 'multiple' ? 'checkbox' : 'radio';

  if (rows.length === 0 || cols.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border-strong bg-bg-base px-3 py-2 text-xs text-text-tertiary">
        Configurez les lignes et colonnes dans le panneau de droite
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-bg-base">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-elevated/40 text-text-secondary">
            <th className="px-3 py-2 text-left text-xs font-medium" />
            {cols.map((col) => (
              <th key={col.id} className="px-3 py-2 text-center text-xs font-medium">
                {col.label.fr || '—'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr
              key={row.id}
              className={rIdx < rows.length - 1 ? 'border-b border-dashed border-border' : ''}
            >
              <td className="break-words px-3 py-2 text-text-primary">
                {row.label.fr || `Ligne ${rIdx + 1}`}
              </td>
              {cols.map((col) => (
                <td key={col.id} className="px-3 py-2 text-center">
                  <input
                    type={inputType}
                    name={mode === 'single' ? `${field.id}-${row.id}` : undefined}
                    disabled={preview}
                    className={`h-4 w-4 ${inputType === 'checkbox' ? 'rounded' : ''}`}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
