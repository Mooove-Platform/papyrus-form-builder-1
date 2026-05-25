import type { CSSProperties } from 'react';
import type { FormTheme } from '@/types';

export interface BackgroundPreset {
  id: string;
  label: string;
  apply: Partial<FormTheme>;
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: 'parchemin',
    label: 'Parchemin',
    apply: { bg_type: 'color', bg_color: '#F7F0DC', bg: '#F7F0DC' }
  },
  {
    id: 'creme',
    label: 'Crème',
    apply: { bg_type: 'color', bg_color: '#FFFDF5', bg: '#FFFDF5' }
  },
  {
    id: 'aube',
    label: 'Aube',
    apply: {
      bg_type: 'gradient',
      bg_gradient_from: '#F7F0DC',
      bg_gradient_to: '#C7EAFB',
      bg_gradient_angle: 160,
      bg: 'linear-gradient(160deg, #F7F0DC, #C7EAFB)'
    }
  },
  {
    id: 'crepuscule',
    label: 'Crépuscule',
    apply: {
      bg_type: 'gradient',
      bg_gradient_from: '#F6923E',
      bg_gradient_to: '#052139',
      bg_gradient_angle: 180,
      bg: 'linear-gradient(180deg, #F6923E, #052139)'
    }
  },
  {
    id: 'brume',
    label: 'Brume',
    apply: {
      bg_type: 'gradient',
      bg_gradient_from: '#EFF9FE',
      bg_gradient_to: '#FFFFFF',
      bg_gradient_angle: 180,
      bg: 'linear-gradient(180deg, #EFF9FE, #FFFFFF)'
    }
  },
  {
    id: 'ardoise',
    label: 'Ardoise',
    apply: { bg_type: 'color', bg_color: '#052139', bg: '#052139' }
  }
];

/** Résout les propriétés de theme en valeur CSS background utilisable. */
export function getBackgroundStyle(theme: FormTheme): CSSProperties {
  const type = theme.bg_type ?? 'color';

  switch (type) {
    case 'gradient': {
      const angle = theme.bg_gradient_angle ?? 135;
      const from = theme.bg_gradient_from ?? '#F7F0DC';
      const to = theme.bg_gradient_to ?? '#EFF9FE';
      return { backgroundImage: `linear-gradient(${angle}deg, ${from}, ${to})` };
    }
    case 'image': {
      if (!theme.bg_image_url) {
        return { backgroundColor: theme.bg_color ?? theme.bg ?? '#F7F0DC' };
      }
      const opacity = (theme.bg_image_opacity ?? 0) / 100;
      // Overlay parchemin transparent par-dessus l'image pour atténuer
      const overlay =
        opacity > 0
          ? `linear-gradient(rgba(247, 240, 220, ${opacity}), rgba(247, 240, 220, ${opacity})), `
          : '';
      return {
        backgroundImage: `${overlay}url(${theme.bg_image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    }
    case 'color':
    case 'preset':
    default:
      return { backgroundColor: theme.bg_color ?? theme.bg ?? '#F7F0DC' };
  }
}

/** Résout les propriétés CSS pour la bannière. */
export function getBannerStyle(theme: FormTheme): CSSProperties {
  const fit = theme.banner_fit ?? 'cover';
  const position = theme.banner_position ?? 'center';
  return {
    objectFit: fit,
    objectPosition: position,
    backgroundColor: fit === 'contain' ? '#F7F0DC' : undefined
  };
}
