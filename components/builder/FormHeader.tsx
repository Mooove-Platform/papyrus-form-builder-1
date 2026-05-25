'use client';

import { Layout, Circle } from 'lucide-react';
import type { FormTheme } from '@/types';
import { cn } from '@/lib/utils';



interface Props {
  theme: FormTheme;
  selectedElement: 'banner' | 'logo' | null;
  onSelectBanner: () => void;
  onSelectLogo: () => void;
  onThemeChange?: (patch: Partial<FormTheme>) => void;
  preview?: boolean;
}

export function FormHeader({ theme, selectedElement, onSelectBanner, onSelectLogo, onThemeChange, preview = false }: Props) {
  const hasBanner = !!theme.banner_url;
  const hasLogo = !!theme.logo_url;
  const logoShape = theme.logo_shape ?? 'circle'; // Défaut en rond

  // En mode preview, si aucune image n'est définie, le header est invisible
  if (preview && !hasBanner && !hasLogo) {
    return null;
  }

  // Gestion de l'espacement : si logo seul en preview, on garde un espace pour le logo
  const needsLogoSpace = preview && hasLogo && !hasBanner;

  return (
    <div className={cn("relative", needsLogoSpace ? "mb-12 pt-24" : "mb-12")}>
      {/* Zone Bannière - ne se rend qu'en mode éditeur OU si elle a une URL */}
      {(!preview || hasBanner) && (
        <div
          onClick={!preview ? onSelectBanner : undefined}
          className={cn(
            'h-40 relative overflow-hidden transition-colors',
            theme.banner_full_width
              ? 'w-screen ml-[calc(-50vw+50%)] mr-[calc(-50vw+50%)]'
              : 'w-full rounded-lg',
            !preview && 'cursor-pointer',
            selectedElement === 'banner' && 'ring-2 ring-accent',
            !hasBanner && 'border-2 border-dashed border-border-strong bg-bg-surface',
            !theme.banner_full_width && !hasBanner && 'rounded-lg'
          )}
        >
          {hasBanner ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={theme.banner_url!}
                alt="Bannière"
                className="w-full h-full object-cover transition-transform"
                style={{
                  objectFit: theme.banner_fit ?? 'cover',
                  objectPosition: `${theme.banner_position_x ?? 50}% ${theme.banner_position_y ?? 50}%`,
                  transform: `scale(${theme.banner_scale ?? 1})`
                }}
              />
              {/* Overlay de sélection en mode éditeur */}
              {!preview && (
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="opacity-0 hover:opacity-100 bg-white/90 px-3 py-1 rounded-md text-sm text-text-primary">
                    Cliquer pour modifier la bannière
                  </div>
                </div>
              )}
            </>
          ) : (
            !preview && (
              <div className="flex items-center justify-center h-full text-text-tertiary">
                <div className="flex flex-col items-center gap-2">
                  <Layout className="h-8 w-8" />
                  <span className="text-sm font-medium">Ajouter une bannière</span>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Zone Logo - ne se rend qu'en mode éditeur OU si elle a une URL */}
      {(!preview || hasLogo) && (
        <div
          onClick={!preview ? onSelectLogo : undefined}
          className={cn(
            'absolute transition-colors',
            // Positionnement adaptatif selon la présence de bannière
            preview && !hasBanner
              ? 'top-4 left-8' // Logo en haut avec espace en preview sans bannière
              : 'bottom-[-25%] left-8', // Position à cheval normale : 50% sur bannière, 50% sur fond blanc
            'w-20 h-20', // Taille fixe du conteneur (80px x 80px)
            'overflow-hidden', // Confine l'image zoomée dans le cercle
            'border-4 border-white shadow-lg', // Bordure blanche style LinkedIn
            !preview && 'cursor-pointer',
            selectedElement === 'logo' && 'ring-2 ring-accent ring-offset-2'
          )}
          style={{
            borderRadius: logoShape === 'circle' ? '50%' : logoShape === 'rounded' ? '12px' : '8px'
          }}
        >
          {hasLogo ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={theme.logo_url!}
                alt="Logo"
                className={cn(
                  'w-full h-full object-cover transition-transform',
                  logoShape === 'circle' ? 'rounded-full' : logoShape === 'rounded' ? 'rounded-xl' : 'rounded'
                )}
                style={{
                  transform: `scale(${theme.logo_size ?? 1})`, // Zoom appliqué uniquement sur l'image
                  transformOrigin: 'center center' // Centre le zoom sur l'image
                }}
              />
              {/* Overlay de sélection en mode éditeur */}
              {!preview && (
                <div className={cn(
                  'absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center',
                  logoShape === 'circle' ? 'rounded-full' : logoShape === 'rounded' ? 'rounded-xl' : 'rounded'
                )}>
                  <div className="opacity-0 hover:opacity-100 bg-white/90 px-2 py-1 rounded text-xs text-text-primary whitespace-nowrap">
                    Modifier logo
                  </div>
                </div>
              )}
            </div>
          ) : (
            !preview && (
              <div
                className={cn(
                  "w-full h-full border-2 border-dashed border-border-strong bg-bg-surface flex items-center justify-center text-text-tertiary",
                  logoShape === 'circle' ? 'rounded-full' : logoShape === 'rounded' ? 'rounded-xl' : 'rounded'
                )}
              >
                <div className="flex flex-col items-center gap-1">
                  <Circle className="h-6 w-6" />
                  <span className="text-[10px] font-medium">Logo</span>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}