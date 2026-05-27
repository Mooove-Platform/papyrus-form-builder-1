'use client';

import { useRef } from 'react';
import { Upload, X } from 'lucide-react';
import type { FormTheme } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

interface Props {
  theme: FormTheme;
  selectedElement: 'banner' | 'logo';
  onChange: (patch: Partial<FormTheme>) => void;
}

export function FormHeaderSettings({ theme, selectedElement, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageUpload(file: File) {
    if (file.size > MAX_IMAGE_BYTES) {
      alert(`Image trop lourde (${Math.round(file.size / 1024)} Ko). En mode local, max 1,5 Mo.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      if (selectedElement === 'banner') {
        onChange({ banner_url: url });
      } else {
        onChange({ logo_url: url });
      }
    };
    reader.readAsDataURL(file);
  }

  if (selectedElement === 'banner') {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-border pb-3">
          <div className="papyrus-meta text-xs uppercase tracking-wide not-italic">i. Bannière</div>
          <p className="mt-1 text-xs text-text-tertiary">Image d'en-tête du formulaire</p>
        </div>

        <div className="flex-1 pt-5 space-y-5">
          <Section title="Image">
            {theme.banner_url ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={theme.banner_url}
                  alt="aperçu bannière"
                  className="h-20 w-full rounded-md border border-border bg-bg-base object-cover"
                />
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-text-secondary hover:underline"
                  >
                    Remplacer
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ banner_url: null })}
                    className="flex items-center gap-1 text-xs text-danger hover:underline"
                  >
                    <X className="h-3 w-3" /> Retirer
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-md border border-dashed border-border-strong bg-bg-base px-4 py-6 text-sm text-text-secondary transition hover:border-accent"
              >
                <Upload className="h-5 w-5" />
                Téléverser une bannière
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
              value={theme.banner_url?.startsWith('data:') ? '' : theme.banner_url ?? ''}
              onChange={(e) => onChange({ banner_url: e.target.value || null })}
              placeholder="https://…"
            />
          </Section>

          {theme.banner_url && (
            <>
              <Section title="Mode d'affichage">
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { value: 'cover', label: 'Remplir', hint: 'peut rogner' },
                    { value: 'contain', label: 'Voir entière', hint: 'sans rogner' },
                    { value: 'full-width', label: 'Toute largeur', hint: 'plein écran' }
                  ] as const).map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => {
                        if (mode.value === 'full-width') {
                          onChange({ banner_fit: 'cover', banner_full_width: true });
                        } else {
                          onChange({ banner_fit: mode.value, banner_full_width: false });
                        }
                      }}
                      className={cn(
                        'rounded-md border p-2 text-left transition',
                        (mode.value === 'full-width'
                          ? theme.banner_full_width
                          : (theme.banner_fit ?? 'cover') === mode.value && !theme.banner_full_width)
                          ? 'border-accent bg-accent/5 text-text-primary'
                          : 'border-border-strong text-text-secondary hover:border-accent'
                      )}
                    >
                      <div className="text-xs font-medium">{mode.label}</div>
                      <div className="text-[10px] text-text-tertiary">{mode.hint}</div>
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="Taille et position de l'image">
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 flex items-center justify-between text-xs text-text-secondary">
                      <span>Zoom</span>
                      <span className="font-mono text-text-tertiary">{Math.round((theme.banner_scale ?? 1) * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min={0.05}
                      max={3}
                      step={0.05}
                      value={theme.banner_scale ?? 1}
                      onChange={(e) => onChange({ banner_scale: Number(e.target.value) })}
                      className="w-full accent-accent"
                    />
                  </div>

                  <div>
                    <label className="mb-1 flex items-center justify-between text-xs text-text-secondary">
                      <span>Position horizontale</span>
                      <span className="font-mono text-text-tertiary">{theme.banner_position_x ?? 50}%</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={theme.banner_position_x ?? 50}
                      onChange={(e) => onChange({ banner_position_x: Number(e.target.value) })}
                      className="w-full accent-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center justify-between text-xs text-text-secondary">
                      <span>Position verticale</span>
                      <span className="font-mono text-text-tertiary">{theme.banner_position_y ?? 50}%</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={theme.banner_position_y ?? 50}
                      onChange={(e) => onChange({ banner_position_y: Number(e.target.value) })}
                      className="w-full accent-accent"
                    />
                  </div>
                </div>
              </Section>

              {/* Bouton Réinitialiser */}
              <div className="flex justify-end pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({
                    banner_scale: 1,
                    banner_position_x: 50,
                    banner_position_y: 50,
                  })}
                >
                  Réinitialiser le cadrage
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Logo settings
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border pb-3">
        <div className="papyrus-meta text-xs uppercase tracking-wide not-italic">i. Logo</div>
        <p className="mt-1 text-xs text-text-tertiary">Logo affiché sur la bannière</p>
      </div>

      <div className="flex-1 pt-5 space-y-5">
        <Section title="Image">
          {theme.logo_url ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={theme.logo_url}
                alt="aperçu logo"
                className="h-16 w-16 rounded-full border border-border bg-bg-base object-cover mx-auto"
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-text-secondary hover:underline"
                >
                  Remplacer
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ logo_url: null })}
                  className="flex items-center gap-1 text-xs text-danger hover:underline"
                >
                  <X className="h-3 w-3" /> Retirer
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-md border border-dashed border-border-strong bg-bg-base px-4 py-6 text-sm text-text-secondary transition hover:border-accent"
            >
              <Upload className="h-5 w-5" />
              Téléverser un logo
              <span className="text-xs text-text-tertiary">PNG, JPG, SVG · format carré recommandé · max 1,5 Mo</span>
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
            value={theme.logo_url?.startsWith('data:') ? '' : theme.logo_url ?? ''}
            onChange={(e) => onChange({ logo_url: e.target.value || null })}
            placeholder="https://…"
          />
        </Section>

        {theme.logo_url && (
          <>
            <Section title="Format du logo">
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { value: 'circle', label: 'Rond' },
                  { value: 'rounded', label: 'Carré' }
                ] as const).map((shape) => (
                  <button
                    key={shape.value}
                    type="button"
                    onClick={() => onChange({ logo_shape: shape.value })}
                    className={cn(
                      'rounded-md border p-2 text-center transition',
                      (theme.logo_shape ?? 'circle') === shape.value
                        ? 'border-accent bg-accent/5 text-text-primary'
                        : 'border-border-strong text-text-secondary hover:border-accent'
                    )}
                  >
                    <div className="text-xs font-medium">{shape.label}</div>
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Zoom du logo">
              <div>
                <label className="mb-1 flex items-center justify-between text-xs text-text-secondary">
                  <span>Zoom</span>
                  <span className="font-mono text-text-tertiary">{Math.round((theme.logo_size ?? 1) * 100)}%</span>
                </label>
                <input
                  type="range"
                  min={0.5}
                  max={3}
                  step={0.1}
                  value={theme.logo_size ?? 1}
                  onChange={(e) => onChange({ logo_size: Number(e.target.value) })}
                  className="w-full accent-accent"
                />
              </div>
            </Section>
          </>
        )}
      </div>
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