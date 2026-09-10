import type { CSSProperties } from 'react';

import type { FormTheme } from '@/types';

/**
 * Le cadrage de la bannière — **une seule formule, pour tout le monde.**
 *
 * Elle vit dans son propre fichier pour une raison précise : elle était
 * autrefois écrite deux fois, et les deux écritures ne disaient pas la même
 * chose. Le constructeur posait l'image en pixels absolus — largeur
 * « largeur du conteneur × zoom », centre au pourcentage demandé. L'aperçu et
 * la page publique, eux, faisaient `object-fit: cover` avec
 * `object-position: x% y%`, ce qui **ignore le zoom purement et simplement** et
 * ne place pas le même point de l'image au même endroit.
 *
 * On cadrait donc avec soin, on cliquait sur Aperçu, et la bannière repartait
 * en plein centre. Puis on recadrait. Indéfiniment.
 *
 * Deux modes, et un seul demande un réglage :
 *
 * · **contain** — le bandeau prend la hauteur de l'image, montrée entière.
 *   Rien n'est rogné, il n'y a donc rien à cadrer. C'est le mode d'une
 *   bannière déjà dessinée : on la montre telle qu'elle a été faite.
 *
 * · **cover** — le bandeau garde la hauteur choisie et l'image se déplace et
 *   s'agrandit dedans. C'est le mode d'une photo, dont on choisit le morceau
 *   qu'on garde.
 *
 * Tout y est relatif au conteneur — `left`, `top` et `width` en pourcentage,
 * `height: auto` pour que le navigateur tienne le rapport natif. Le cadrage
 * vaut donc à n'importe quelle largeur, du téléphone au plein écran, sans une
 * seule mesure en JavaScript.
 */

/** Hauteur du bandeau quand rien n'a été choisi, en pixels. */
export const DEFAULT_BANNER_HEIGHT = 160;

export type BannerFrame = Pick<
  FormTheme,
  'banner_fit' | 'banner_scale' | 'banner_position_x' | 'banner_position_y' | 'banner_height'
>;

/** Le mode d'affichage effectif. `cover` reste le défaut historique. */
export function bannerFit(theme: BannerFrame): 'cover' | 'contain' {
  return theme.banner_fit === 'contain' ? 'contain' : 'cover';
}

/**
 * La hauteur du bandeau, ou `null` quand elle vient de l'image.
 *
 * `null` en « Voir entière » : c'est exactement ce qui permet de ne rien
 * rogner sans avoir à régler quoi que ce soit.
 */
export function bannerBandHeight(theme: BannerFrame): number | null {
  if (bannerFit(theme) === 'contain') return null;
  return theme.banner_height ?? DEFAULT_BANNER_HEIGHT;
}

/** Le style de l'image, identique dans le constructeur, l'aperçu et le public. */
export function bannerImageStyle(theme: BannerFrame): CSSProperties {
  if (bannerFit(theme) === 'contain') {
    return { width: '100%', height: 'auto', display: 'block' };
  }

  const scale = theme.banner_scale ?? 1;
  const x = theme.banner_position_x ?? 50;
  const y = theme.banner_position_y ?? 50;

  return {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    width: `${scale * 100}%`,
    /**
     * `max-width: none`, sans quoi tout zoom au-dessus de 100 % est annulé.
     *
     * La feuille de base de Tailwind pose `img { max-width: 100% }` sur toutes
     * les images du site — une règle saine, qui empêche une photo de déborder
     * de sa colonne. Mais une bannière en mode « Remplir » doit précisément
     * déborder : c'est ce dépassement qu'on déplace pour choisir le morceau
     * qu'on garde. Sans cette ligne, le curseur de zoom monte à 160 % et
     * l'image reste plaquée à 100 % — un réglage qui ne fait rien.
     */
    maxWidth: 'none',
    height: 'auto',
    // Le centre de l'image vient se poser sur le point (x%, y%) du bandeau.
    // C'est la transposition exacte de `imgX = largeur × x/100 − largeurImage/2`
    // qu'employait le constructeur, à ceci près qu'aucune mesure n'est requise.
    transform: 'translate(-50%, -50%)',
    display: 'block',
    userSelect: 'none',
    pointerEvents: 'none'
  };
}

/**
 * Le zoom qui fait tout juste couvrir le bandeau, image centrée.
 *
 * Sert quand on revient sur « Remplir » : on repart d'un cadrage propre plutôt
 * que du zoom laissé par l'image précédente.
 */
export function coverScale(
  imageWidth: number,
  imageHeight: number,
  bandWidth: number,
  bandHeight: number
): number {
  if (imageWidth <= 0 || imageHeight <= 0 || bandWidth <= 0 || bandHeight <= 0) return 1;

  const bandRatio = bandWidth / bandHeight;
  const imageRatio = imageWidth / imageHeight;

  // Une image plus large que le bandeau doit dépasser en largeur pour le
  // remplir en hauteur ; une image plus haute le remplit déjà.
  const scale = imageRatio >= bandRatio ? imageRatio / bandRatio : 1;
  return Math.round(scale * 100) / 100;
}
