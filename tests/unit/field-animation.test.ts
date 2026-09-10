import { describe, expect, it } from 'vitest';

import {
  RATING_ANIMATIONS,
  SCALE_ANIMATIONS,
  cascadeDelay,
  commitIntensity,
  gaugeGradient,
  heatColor,
  isHot,
  ratingAnimation,
  scaleAnimation,
  scaleRatio,
  starColor
} from '@/lib/field-animation';

/**
 * L'idée que ces tests protègent : **la réponse a une température.**
 *
 * Une seule échelle de couleur porte les deux contrôles — les étoiles et la
 * jauge du curseur. Si l'une des deux se met à interpréter la valeur
 * autrement, un 8 sur 10 et quatre étoiles sur cinq cesseraient de se
 * ressembler, et l'idée s'effondrerait.
 */

describe('catalogue des styles', () => {
  it('propose « aucune » en premier, dans les deux familles', () => {
    // C'est le défaut, et c'est ce qui garantit qu'un formulaire déjà publié
    // ne se met pas à bouger parce qu'on a ajouté la fonctionnalité.
    expect(RATING_ANIMATIONS[0].value).toBe('none');
    expect(SCALE_ANIMATIONS[0].value).toBe('none');
  });

  it('n’expose que des valeurs sans accent ni espace', () => {
    // Elles partent en base et reviennent dans du CSS : une étiquette française
    // s'y était glissée une première fois.
    for (const choice of [...RATING_ANIMATIONS, ...SCALE_ANIMATIONS]) {
      expect(choice.value, choice.label).toMatch(/^[a-z]+$/);
    }
  });

  it('retombe sur « aucune » devant une valeur inconnue', () => {
    // Un style retiré du catalogue, ou une donnée importée : mieux vaut ne rien
    // animer que planter au rendu.
    expect(ratingAnimation('confetti')).toBe('none');
    expect(ratingAnimation(undefined)).toBe('none');
    expect(ratingAnimation(42)).toBe('none');
    expect(scaleAnimation('spin')).toBe('none'); // un style d'étoile, pas d'échelle
    expect(scaleAnimation('ember')).toBe('ember');
  });
});

describe('température de la réponse', () => {
  it('reste froide jusqu’à la moitié de l’échelle', () => {
    // Une note moyenne doit se lire comme neutre. Un dégradé linéaire du bas
    // vers le haut réchaufferait déjà un 5 sur 10, et l'échelle ne dirait plus
    // rien.
    const cyan = heatColor(0);
    expect(heatColor(0.25)).toBe(cyan);
    expect(heatColor(0.5)).toBe(cyan);
  });

  it('se réchauffe au-dessus de la moitié', () => {
    expect(heatColor(0.7)).not.toBe(heatColor(0.5));
  });

  it('n’allume la braise que dans le dernier cinquième', () => {
    expect(isHot(0.5)).toBe(false);
    expect(isHot(0.8)).toBe(false);
    expect(isHot(0.81)).toBe(true);
    expect(isHot(1)).toBe(true);
  });

  it('rend toujours une couleur lisible, même hors bornes', () => {
    for (const ratio of [-3, 0, 0.5, 1, 9]) {
      expect(heatColor(ratio)).toMatch(/^rgb\(\d{1,3}, \d{1,3}, \d{1,3}\)$/);
    }
  });
});

describe('position sur l’échelle', () => {
  it('mesure la part parcourue entre les bornes', () => {
    expect(scaleRatio(0, 0, 10)).toBe(0);
    expect(scaleRatio(5, 0, 10)).toBe(0.5);
    expect(scaleRatio(10, 0, 10)).toBe(1);
    // Une échelle qui ne part pas de zéro : 3 sur une échelle 1–5.
    expect(scaleRatio(3, 1, 5)).toBe(0.5);
  });

  it('ne divise pas par zéro sur une échelle d’un seul cran', () => {
    // La seule réponse possible est la plus haute : on la traite comme telle.
    expect(scaleRatio(7, 7, 7)).toBe(1);
    expect(scaleRatio(7, 9, 3)).toBe(1);
  });

  it('borne une valeur hors échelle', () => {
    expect(scaleRatio(-5, 0, 10)).toBe(0);
    expect(scaleRatio(99, 0, 10)).toBe(1);
  });
});

describe('ampleur du geste', () => {
  it('grandit avec la note', () => {
    // La même animation, jouée plus ample : c'est ce qui rend cinq étoiles plus
    // belles que deux, sans un second effet à entretenir.
    const une = commitIntensity(1, 5);
    const quatre = commitIntensity(4, 5);
    const cinq = commitIntensity(5, 5);

    expect(quatre).toBeGreaterThan(une);
    expect(cinq).toBeGreaterThan(quatre);
  });

  it('reste dans des proportions raisonnables', () => {
    // Perceptible, jamais grotesque : une étoile qui doublerait de taille
    // sauterait par-dessus ses voisines.
    expect(commitIntensity(5, 5)).toBeLessThanOrEqual(1.5);
    expect(commitIntensity(1, 5)).toBeGreaterThanOrEqual(1);
  });

  it('ne casse pas sur une échelle vide', () => {
    expect(commitIntensity(0, 0)).toBe(1);
  });
});

describe('cascade', () => {
  it('décale les étoiles l’une après l’autre', () => {
    expect(cascadeDelay(0, 'cascade')).toBe(0);
    expect(cascadeDelay(3, 'cascade')).toBeGreaterThan(cascadeDelay(1, 'cascade'));
  });

  it('ne décale rien dans les autres styles', () => {
    // Sinon la quatrième étoile d'un « rebond » partirait en retard sans raison.
    expect(cascadeDelay(4, 'pop')).toBe(0);
    expect(cascadeDelay(4, 'spin')).toBe(0);
    expect(cascadeDelay(4, 'none')).toBe(0);
  });

  it('garde la cascade complète sous une demi-seconde', () => {
    // Au-delà, l'animation se lit comme de la latence.
    expect(cascadeDelay(9, 'cascade')).toBeLessThan(0.5);
  });
});

describe('couleur des étoiles', () => {
  it('reste chaude d’un bout à l’autre de la rangée', () => {
    // Le brief disait « ça devient jaune ». Une première version faisait courir
    // les étoiles sur la même échelle que la jauge : les trois premières
    // sortaient en cyan, et une notation cyan ne se reconnaît plus.
    for (const ratio of [0, 0.25, 0.5, 0.75, 1]) {
      const [r, , b] = starColor(ratio)
        .match(/\d+/g)!
        .map(Number);
      expect(r, `rouge à ${ratio}`).toBeGreaterThan(b);
    }
  });

  it('part de l’or et finit sur la braise', () => {
    expect(starColor(0)).toBe('rgb(245, 179, 1)');
    expect(starColor(1)).toBe('rgb(225, 74, 38)');
  });

  it('se creuse à mesure qu’on monte', () => {
    const bleu = (ratio: number) => Number(starColor(ratio).match(/\d+/g)![2]);
    expect(bleu(1)).toBeGreaterThan(bleu(0));
  });
});

describe('dégradé de la jauge', () => {
  it('traverse l’ambre au lieu du gris', () => {
    // Un dégradé à deux arrêts, cyan vers braise, passe par un gris brunâtre en
    // sRGB : la jauge d'un 10 sur 10 avait un ventre sale au milieu.
    const full = gaugeGradient(1);
    expect(full).toContain('linear-gradient');
    // Les arrêts intermédiaires de l'échelle doivent y figurer.
    expect(full.split(',').length).toBeGreaterThanOrEqual(4);
  });

  it('ne montre que la part froide quand la jauge est peu remplie', () => {
    // Une jauge à 30 % n'a pas encore atteint l'ambre : elle doit rester unie.
    expect(gaugeGradient(0.3)).toBe(heatColor(0.3));
  });

  it('rend une couleur exploitable à vide', () => {
    expect(gaugeGradient(0)).toBe(heatColor(0));
  });

  it('ne place jamais un arrêt au-delà de 100 %', () => {
    for (const ratio of [0.51, 0.7, 0.81, 1]) {
      for (const position of gaugeGradient(ratio).match(/([\d.]+)%/g) ?? []) {
        expect(Number.parseFloat(position), `${ratio} -> ${position}`).toBeLessThanOrEqual(100);
      }
    }
  });
});
