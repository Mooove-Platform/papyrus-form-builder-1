import { describe, expect, it } from 'vitest';

import {
  DEFAULT_BANNER_HEIGHT,
  bannerBandHeight,
  bannerFit,
  bannerImageStyle,
  coverScale
} from '@/lib/banner-frame';

/**
 * Ce que ces tests protègent : **une seule formule de cadrage.**
 *
 * Le constructeur et la page publique en avaient deux. La première posait
 * l'image en pixels absolus avec son zoom ; la seconde faisait
 * `object-fit: cover` avec `object-position`, qui ignore le zoom. Résultat :
 * on cadrait la bannière, on ouvrait l'aperçu, et elle repartait au centre.
 *
 * Il n'existe plus qu'un seul chemin — `bannerImageStyle` — et ces tests
 * vérifient qu'il ne se remet pas à dépendre du mode d'affichage de l'appelant.
 */

describe('mode d’affichage', () => {
  it('retombe sur « Remplir » quand rien n’est choisi', () => {
    expect(bannerFit({})).toBe('cover');
    expect(bannerFit({ banner_fit: 'cover' })).toBe('cover');
    expect(bannerFit({ banner_fit: 'contain' })).toBe('contain');
  });

  it('laisse la hauteur du bandeau à l’image en « Voir entière »', () => {
    // C'est là toute la différence : pas de hauteur imposée, donc rien à
    // recadrer. Une bannière déjà dessinée s'affiche telle quelle.
    expect(bannerBandHeight({ banner_fit: 'contain' })).toBeNull();
    expect(bannerBandHeight({ banner_fit: 'contain', banner_height: 300 })).toBeNull();
  });

  it('applique la hauteur choisie en « Remplir »', () => {
    expect(bannerBandHeight({})).toBe(DEFAULT_BANNER_HEIGHT);
    expect(bannerBandHeight({ banner_height: 320 })).toBe(320);
  });
});

describe('cadrage de l’image', () => {
  it('montre l’image entière, sans transformation, en « Voir entière »', () => {
    const style = bannerImageStyle({ banner_fit: 'contain', banner_scale: 2.5 });

    expect(style.width).toBe('100%');
    expect(style.height).toBe('auto');
    // Le zoom est délibérément ignoré : il n'y a rien à zoomer, l'image est
    // montrée en entier. Le panneau le cache d'ailleurs dans ce mode.
    expect(style.transform).toBeUndefined();
    expect(style.position).toBeUndefined();
  });

  it('traduit zoom et position en pourcentages du conteneur', () => {
    const style = bannerImageStyle({
      banner_fit: 'cover',
      banner_scale: 1.4,
      banner_position_x: 30,
      banner_position_y: 70
    });

    expect(style.width).toBe('140%');
    expect(style.left).toBe('30%');
    expect(style.top).toBe('70%');
    // Le centre de l'image se pose sur le point demandé — c'est la formule du
    // constructeur, transposée sans une seule mesure en JavaScript.
    expect(style.transform).toBe('translate(-50%, -50%)');
    expect(style.height).toBe('auto');
  });

  it('centre au zoom 1 quand rien n’a été réglé', () => {
    const style = bannerImageStyle({});

    expect(style.width).toBe('100%');
    expect(style.left).toBe('50%');
    expect(style.top).toBe('50%');
  });

  it('rend le même style pour le même thème, appelé deux fois', () => {
    // Le test qui dit tout : l'aperçu et le constructeur appellent cette même
    // fonction avec le même thème. Ils ne peuvent donc plus diverger.
    const theme = {
      banner_fit: 'cover' as const,
      banner_scale: 0.7,
      banner_position_x: 12,
      banner_position_y: 88
    };

    expect(bannerImageStyle(theme)).toEqual(bannerImageStyle({ ...theme }));
  });
});

describe('zoom de couverture', () => {
  it('dépasse en largeur pour une image plus large que le bandeau', () => {
    // Une bannière 1200×300 (rapport 4) dans un bandeau 600×160 (rapport 3,75)
    // doit s'élargir un peu pour le remplir en hauteur.
    expect(coverScale(1200, 300, 600, 160)).toBeCloseTo(4 / 3.75, 2);
  });

  it('reste à 1 pour une image plus haute que le bandeau', () => {
    // Elle couvre déjà la hauteur : l'élargir ne ferait que rogner davantage.
    expect(coverScale(600, 900, 600, 160)).toBe(1);
  });

  it('ne divise jamais par zéro', () => {
    expect(coverScale(0, 0, 600, 160)).toBe(1);
    expect(coverScale(1200, 300, 0, 0)).toBe(1);
  });
});
