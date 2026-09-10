'use client';

import { useRef, useState, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import type { FormTheme } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useMediaUpload } from '@/lib/hooks/useMediaUpload';

interface Props {
  theme: FormTheme;
  selectedElement: 'banner' | 'logo';
  onChange: (patch: Partial<FormTheme>) => void;
}

export function FormHeaderSettings({ theme, selectedElement, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload: uploadImage, uploading, progress } = useMediaUpload();

  const [localBannerScale, setLocalBannerScale] = useState(theme.banner_scale ?? 1);
  const [localBannerX, setLocalBannerX] = useState(theme.banner_position_x ?? 50);
  const [localBannerY, setLocalBannerY] = useState(theme.banner_position_y ?? 50);
  const [localLogoSize, setLocalLogoSize] = useState(theme.logo_size ?? 1);
  const [localHeight, setLocalHeight] = useState(theme.banner_height ?? 160);

  useEffect(() => {
    setLocalBannerScale(theme.banner_scale ?? 1);
  }, [theme.banner_scale]);

  useEffect(() => {
    setLocalBannerX(theme.banner_position_x ?? 50);
  }, [theme.banner_position_x]);

  useEffect(() => {
    setLocalBannerY(theme.banner_position_y ?? 50);
  }, [theme.banner_position_y]);

  useEffect(() => {
    setLocalLogoSize(theme.logo_size ?? 1);
  }, [theme.logo_size]);

  useEffect(() => {
    setLocalHeight(theme.banner_height ?? 160);
  }, [theme.banner_height]);

  /** L'image part directement vers Cloudflare R2 ; le thème ne garde que l'URL publique. */
  async function handleImageUpload(file: File) {
    const url = await uploadImage(file);
    if (!url) return;

    if (selectedElement !== 'banner') {
      onChange({ logo_url: url });
      return;
    }

    /**
     * Une bannière qu'on téléverse arrive en « Voir entière ».
     *
     * Le défaut d'avant était « Remplir » : une bannière déjà dessinée — un
     * visuel large, avec son titre et ses logos — entrait donc rognée en haut
     * et en bas, et il fallait la recadrer pour retrouver ce qu'on venait
     * d'envoyer. Montrer l'image entière ne demande aucun réglage et ne se
     * trompe jamais ; « Remplir » reste à un clic pour les photos.
     */
    onChange({ banner_url: url, banner_fit: 'contain' });
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
                disabled={uploading}
                className="flex w-full flex-col items-center gap-2 rounded-md border border-dashed border-border-strong bg-bg-base px-4 py-6 text-sm text-text-secondary transition hover:border-accent disabled:cursor-wait disabled:opacity-60"
              >
                <Upload className="h-5 w-5" />
                {uploading ? `Envoi en cours… ${progress}%` : 'Téléverser une bannière'}
                <span className="text-xs text-text-tertiary">PNG, JPG, WebP, SVG · max 10 Mo</span>
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
              <Section title="Mode d’affichage">
                {/*
                  Deux modes, et non trois. « Toute largeur » figurait ici comme un
                  troisième mode alors que c’est une largeur, pas un cadrage : la
                  choisir forçait « Remplir » en douce, et le cadrage patiemment
                  réglé repartait à zéro. Elle a maintenant son propre
                  interrupteur, où elle se combine avec l’un ou l’autre mode.
                */}
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { value: 'contain', label: 'Voir entière', hint: 'rien n’est rogné' },
                    { value: 'cover', label: 'Remplir', hint: 'peut rogner' }
                  ] as const).map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => onChange({ banner_fit: mode.value })}
                      className={cn(
                        'rounded-md border p-2 text-left transition',
                        (theme.banner_fit ?? 'cover') === mode.value
                          ? 'border-accent bg-accent/5 text-text-primary'
                          : 'border-border-strong text-text-secondary hover:border-accent'
                      )}
                    >
                      <div className="text-xs font-medium">{mode.label}</div>
                      <div className="text-[10px] text-text-tertiary">{mode.hint}</div>
                    </button>
                  ))}
                </div>

                <label className="mt-2 flex cursor-pointer items-start justify-between gap-3 rounded-md border border-border-strong p-2.5 transition hover:border-accent">
                  <span>
                    <span className="block text-xs font-medium text-text-primary">
                      Toute la largeur
                    </span>
                    <span className="block text-[10px] text-text-tertiary">
                      Bord à bord, sans marge ni coins arrondis
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={theme.banner_full_width === true}
                    onChange={(e) => onChange({ banner_full_width: e.target.checked })}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                  />
                </label>
              </Section>

              {/*
                Rien à cadrer en « Voir entière » : le bandeau prend la hauteur de
                l’image. Afficher malgré tout un zoom et deux positions laisserait
                croire qu’ils agissent — c’est exactement ce qui donnait
                l’impression que la bannière ne répondait pas.
              */}
              {(theme.banner_fit ?? 'cover') === 'contain' ? (
                <Section title="Cadrage">
                  <p className="text-xs leading-relaxed text-text-tertiary">
                    L’image est montrée entière, telle qu’elle a été dessinée. Le
                    bandeau prend sa hauteur : il n’y a rien à régler, et l’aperçu
                    comme le formulaire publié afficheront exactement ceci.
                  </p>
                </Section>
              ) : (
                <Section title="Hauteur et cadrage">
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 flex items-center justify-between text-xs text-text-secondary">
                        <span>Hauteur du bandeau</span>
                        <span className="font-mono text-text-tertiary">{localHeight} px</span>
                      </label>
                      <input
                        type="range"
                        min={80}
                        max={480}
                        step={8}
                        value={localHeight}
                        onChange={(e) => setLocalHeight(Number(e.target.value))}
                        onMouseUp={(e) => onChange({ banner_height: Number(e.currentTarget.value) })}
                        onTouchEnd={(e) => onChange({ banner_height: Number(e.currentTarget.value) })}
                        onKeyUp={(e) => onChange({ banner_height: Number(e.currentTarget.value) })}
                        className="w-full accent-accent"
                      />
                    </div>

                    <div>
                      <label className="mb-1 flex items-center justify-between text-xs text-text-secondary">
                        <span>Zoom</span>
                        <span className="font-mono text-text-tertiary">
                          {Math.round(localBannerScale * 100)}%
                        </span>
                      </label>
                      <input
                        type="range"
                        min={0.05}
                        max={3}
                        step={0.05}
                        value={localBannerScale}
                        onChange={(e) => setLocalBannerScale(Number(e.target.value))}
                        onMouseUp={(e) => onChange({ banner_scale: Number(e.currentTarget.value) })}
                        onTouchEnd={(e) => onChange({ banner_scale: Number(e.currentTarget.value) })}
                        onKeyUp={(e) => onChange({ banner_scale: Number(e.currentTarget.value) })}
                        className="w-full accent-accent"
                      />
                    </div>

                    <div>
                      <label className="mb-1 flex items-center justify-between text-xs text-text-secondary">
                        <span>Position horizontale</span>
                        <span className="font-mono text-text-tertiary">{localBannerX}%</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={localBannerX}
                        onChange={(e) => setLocalBannerX(Number(e.target.value))}
                        onMouseUp={(e) => onChange({ banner_position_x: Number(e.currentTarget.value) })}
                        onTouchEnd={(e) => onChange({ banner_position_x: Number(e.currentTarget.value) })}
                        onKeyUp={(e) => onChange({ banner_position_x: Number(e.currentTarget.value) })}
                        className="w-full accent-accent"
                      />
                    </div>

                    <div>
                      <label className="mb-1 flex items-center justify-between text-xs text-text-secondary">
                        <span>Position verticale</span>
                        <span className="font-mono text-text-tertiary">{localBannerY}%</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={localBannerY}
                        onChange={(e) => setLocalBannerY(Number(e.target.value))}
                        onMouseUp={(e) => onChange({ banner_position_y: Number(e.currentTarget.value) })}
                        onTouchEnd={(e) => onChange({ banner_position_y: Number(e.currentTarget.value) })}
                        onKeyUp={(e) => onChange({ banner_position_y: Number(e.currentTarget.value) })}
                        className="w-full accent-accent"
                      />
                    </div>
                  </div>
                </Section>
              )}

              {/* Réinitialiser n’a de sens que là où l’on cadre. */}
              {(theme.banner_fit ?? 'cover') === 'cover' && (
                <div className="flex justify-end pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onChange({
                        banner_scale: 1,
                        banner_position_x: 50,
                        banner_position_y: 50,
                        banner_height: 160
                      })
                    }
                  >
                    Réinitialiser le cadrage
                  </Button>
                </div>
              )}
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
              disabled={uploading}
              className="flex w-full flex-col items-center gap-2 rounded-md border border-dashed border-border-strong bg-bg-base px-4 py-6 text-sm text-text-secondary transition hover:border-accent disabled:cursor-wait disabled:opacity-60"
            >
              <Upload className="h-5 w-5" />
              {uploading ? `Envoi en cours… ${progress}%` : 'Téléverser un logo'}
              <span className="text-xs text-text-tertiary">PNG, JPG, WebP, SVG · format carré recommandé · max 10 Mo</span>
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
                  <span className="font-mono text-text-tertiary">{Math.round(localLogoSize * 100)}%</span>
                </label>
                <input
                  type="range"
                  min={0.5}
                  max={3}
                  step={0.1}
                  value={localLogoSize}
                  onChange={(e) => setLocalLogoSize(Number(e.target.value))}
                  onMouseUp={(e) => onChange({ logo_size: Number(e.currentTarget.value) })}
                  onTouchEnd={(e) => onChange({ logo_size: Number(e.currentTarget.value) })}
                  onKeyUp={(e) => onChange({ logo_size: Number(e.currentTarget.value) })}
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