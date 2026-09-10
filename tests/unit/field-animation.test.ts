import { describe, expect, it } from 'vitest';

import {
  BALL_SIZE,
  RATING_ANIMATIONS,
  SCALE_ANIMATIONS,
  cascadeDelay,
  commitIntensity,
  crowns,
  energyColor,
  gaugeGradient,
  hasRollingBall,
  heatColor,
  isHot,
  moltenColor,
  ratingAnimation,
  rollDegrees,
  scaleAnimation,
  scaleEffects,
  scaleGradient,
  scaleRatio,
  starColor,
  stretchFor
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


/**
 * Ce que protège la suite qui suit : **les trois styles à bille sont trois
 * matières de la MÊME échelle, et leurs seuils sont la moitié de l'idée.**
 *
 * Un curseur qui produirait le même spectacle à 2 sur 10 et à 10 sur 10 ne
 * dirait rien du tout : c'est la montée en intensité qui porte la réponse. Les
 * seuils vivent donc dans une fonction pure — le rendu sur toile, lui, n'est
 * pas vérifiable ici.
 */

describe('les styles à bille', () => {
  it('en propose trois, et eux seuls changent la géométrie du curseur', () => {
    expect(hasRollingBall('heat')).toBe(true);
    expect(hasRollingBall('energy')).toBe(true);
    expect(hasRollingBall('molten')).toBe(true);

    // Les trois premiers gardent le contrôle tel qu'il est : ils ne coûtent ni
    // mesure, ni toile, ni boucle d'animation.
    expect(hasRollingBall('none')).toBe(false);
    expect(hasRollingBall('gauge')).toBe(false);
    expect(hasRollingBall('ember')).toBe(false);
  });

  it('les garde tous dans le catalogue, « aucune » en tête', () => {
    expect(SCALE_ANIMATIONS[0].value).toBe('none');
    expect(SCALE_ANIMATIONS.map((choice) => choice.value)).toEqual([
      'none',
      'gauge',
      'ember',
      'heat',
      'energy',
      'molten'
    ]);
  });

  it('les reconnaît quand ils reviennent de la base', () => {
    // Ils y sont écrits en clair : un style qui ne se relit pas rendrait
    // « aucune » à un formulaire déjà publié animé.
    expect(scaleAnimation('heat')).toBe('heat');
    expect(scaleAnimation('energy')).toBe('energy');
    expect(scaleAnimation('molten')).toBe('molten');
  });
});

describe('les trois rampes', () => {
  it('partagent le rythme de l’échelle thermique', () => {
    // Le cyan tenu jusqu'à mi-échelle, un virage au milieu, un dernier
    // cinquième qui bascule. C'est ce qui fait lire six styles comme un seul
    // système : le rythme est commun, seule la destination change.
    const cyan = heatColor(0);
    expect(energyColor(0.5)).toBe(cyan);
    expect(moltenColor(0.5)).toBe(cyan);
    expect(energyColor(0.25)).toBe(cyan);
  });

  it('divergent au-dessus de la moitié', () => {
    // Sans quoi les trois styles auraient la même couleur et ne se
    // distingueraient que par le bruit qu'ils font.
    expect(energyColor(0.9)).not.toBe(heatColor(0.9));
    expect(moltenColor(0.7)).not.toBe(heatColor(0.7));
  });

  it('font suivre le dégradé au style demandé', () => {
    // Sous la mi-échelle, la jauge est d'un seul ton : un dégradé du cyan vers
    // le cyan est un calcul pour rien.
    expect(scaleGradient('energy', 0.3)).toBe(energyColor(0));
    expect(scaleGradient('molten', 1)).toContain('linear-gradient');
    expect(scaleGradient('heat', 1)).toBe(gaugeGradient(1));
  });
});

describe('la bille roule vraiment', () => {
  it('tourne de l’arc parcouru, divisé par son rayon', () => {
    // La rotation dit une chose vraie — la distance déplacée. Une valeur
    // arbitraire ferait tourner une bille qui glisse.
    const track = 314;
    const expected = (track / (BALL_SIZE / 2)) * (180 / Math.PI);
    expect(rollDegrees(1, track)).toBeCloseTo(expected, 6);
  });

  it('revient en arrière au lieu de repartir de zéro', () => {
    expect(rollDegrees(-0.4, 200)).toBeCloseTo(-rollDegrees(0.4, 200), 6);
    expect(rollDegrees(0, 200)).toBe(0);
  });

  it('n’étire l’orbe que sur un geste large, et jamais au-delà du raisonnable', () => {
    expect(stretchFor(0)).toBe(1);
    expect(stretchFor(-80)).toBe(stretchFor(80)); // le sens ne change pas l'ampleur
    expect(stretchFor(10000)).toBe(1.2);
  });
});

describe('les seuils des effets', () => {
  it('ne dessinent rien pour les styles sans bille', () => {
    for (const style of ['none', 'gauge', 'ember'] as const) {
      expect(Object.values(scaleEffects(style, 1))).toEqual([false, false, false, false, false]);
    }
  });

  it('n’allument les braises qu’à partir de sept sur dix', () => {
    // Le moment où la réponse cesse d'être tiède. En dessous, une note
    // moyenne recevrait la même fête qu'une note haute.
    expect(scaleEffects('heat', 0.6).particles).toBe(false);
    expect(scaleEffects('heat', 0.7).particles).toBe(true);
    expect(scaleEffects('molten', 0.7).particles).toBe(true);
  });

  it('réserve chaque effet à son style', () => {
    expect(scaleEffects('heat', 1).flame).toBe(true);
    expect(scaleEffects('molten', 1).flame).toBe(false);
    expect(scaleEffects('energy', 1).flame).toBe(false);

    expect(scaleEffects('energy', 0.5).ring).toBe(true);
    expect(scaleEffects('energy', 0.4).ring).toBe(false);
    expect(scaleEffects('heat', 1).ring).toBe(false);

    expect(scaleEffects('energy', 0.7).arc).toBe(true);
    expect(scaleEffects('energy', 0.6).arc).toBe(false);

    // Un liquide ondule quand on le déplace, même froid : c'est l'onde qui dit
    // que la matière a de l'inertie, pas la température.
    expect(scaleEffects('molten', 0).wave).toBe(true);
    expect(scaleEffects('heat', 1).wave).toBe(false);
  });

  it('n’enflamme la jauge que dans le dernier dixième', () => {
    expect(scaleEffects('heat', 0.89).flame).toBe(false);
    expect(scaleEffects('heat', 0.9).flame).toBe(true);
  });
});

describe('l’envol du sommet', () => {
  it('salue le passage, pas le séjour', () => {
    // Rester à 10 ne le rejoue pas : un geste répété en boucle cesse d'être un
    // geste. Redescendre puis remonter le rejoue.
    expect(crowns(9, 10, 10)).toBe(true);
    expect(crowns(10, 10, 10)).toBe(false);
    expect(crowns(10, 9, 10)).toBe(false);
    expect(crowns(0, 10, 10)).toBe(true);
  });
});


describe('le chemin entre deux couleurs', () => {
  /** L'ecart entre le canal le plus fort et le plus faible : la vivacite. */
  function chroma(colour: string): number {
    const channels = colour.match(/\d+/g)!.map(Number);
    return Math.max(...channels) - Math.min(...channels);
  }

  it('garde sa vivacite au milieu, au lieu de virer au gris', () => {
    // Le defaut que ce test empeche de revenir : en sRGB, la moyenne du cyan et
    // de l'ambre est un olive delave. La jauge d'un 10 sur 10 avait un ventre
    // sale a mi-parcours, exactement la ou l'oeil se pose. Ajouter des arrets
    // ne corrigeait rien : le gris revenait entre chaque paire.
    // En ligne droite dans l'espace sRGB, ce point valait 22 : un olive de
    // vase. Le seuil est pose loin en dessous de ce qu'on obtient, pour
    // attraper une regression sans se casser sur un arrondi.
    expect(chroma(heatColor(0.65))).toBeGreaterThan(80);
    expect(chroma(energyColor(0.65))).toBeGreaterThan(80);
    expect(chroma(moltenColor(0.65))).toBeGreaterThan(80);
    expect(chroma(starColor(0.3))).toBeGreaterThan(80);
  });

  it('rend les bornes exactement telles quelles', () => {
    // Un aller-retour par un espace perceptif arrondit : une couleur de la
    // charte doit rester la couleur de la charte, au canal pres.
    expect(heatColor(0)).toBe('rgb(42, 194, 222)');
    expect(heatColor(1)).toBe('rgb(225, 74, 38)');
    expect(moltenColor(0)).toBe('rgb(42, 194, 222)');
  });
});
