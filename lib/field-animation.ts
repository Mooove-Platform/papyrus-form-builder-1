/**
 * L'animation des champs de notation.
 *
 * **Une seule idée, portée par les deux contrôles : la réponse a une
 * température.** Sur un champ de notation, ce que ressent le répondant EST le
 * contenu ; le contrôle doit donc accuser réception et laisser lire l'ampleur
 * de la réponse d'un coup d'œil. L'échelle va du froid au chaud — le cyan de la
 * marque en bas, l'ambre en haut, la braise tout au bout. Rien d'autre n'est
 * ajouté : pas de confettis sur un deux sur dix.
 *
 * Ce module ne contient aucun JSX : il porte le catalogue des styles, la
 * conversion d'une valeur en température, et les durées. C'est ce qui le rend
 * vérifiable par des tests, là où le rendu ne l'est pas.
 */

// ============================================================================
// Catalogue
// ============================================================================

export type RatingAnimation = 'none' | 'pop' | 'spin' | 'cascade';
export type ScaleAnimation = 'none' | 'gauge' | 'ember';
export type FieldAnimation = RatingAnimation | ScaleAnimation;

export interface AnimationChoice<T extends string> {
  value: T;
  label: string;
  /** Ce que ça fait, en une ligne — c'est ce que lit l'auteur pour choisir. */
  hint: string;
}

/**
 * Les styles proposés pour les étoiles.
 *
 * `none` est le premier ET le défaut : un formulaire déjà publié ne doit pas se
 * mettre à bouger parce qu'on a ajouté cette fonctionnalité.
 */
export const RATING_ANIMATIONS: AnimationChoice<RatingAnimation>[] = [
  { value: 'none', label: 'Aucune', hint: 'L’étoile se remplit, sans mouvement.' },
  { value: 'pop', label: 'Rebond', hint: 'L’étoile choisie grossit puis se pose.' },
  { value: 'spin', label: 'Tour sur soi', hint: 'L’étoile pivote en se remplissant.' },
  {
    value: 'cascade',
    label: 'Cascade',
    hint: 'Les étoiles s’allument l’une après l’autre, de gauche à droite.'
  }
];

/** Les styles proposés pour une échelle en curseur. */
export const SCALE_ANIMATIONS: AnimationChoice<ScaleAnimation>[] = [
  { value: 'none', label: 'Aucune', hint: 'Un rail et un point, sans jauge.' },
  {
    value: 'gauge',
    label: 'Jauge',
    hint: 'Le rail se remplit et se réchauffe à mesure qu’on monte.'
  },
  {
    value: 'ember',
    label: 'Braise',
    hint: 'La jauge, plus une chaleur qui s’intensifie tout en haut.'
  }
];

export function ratingAnimation(value: unknown): RatingAnimation {
  return RATING_ANIMATIONS.some((entry) => entry.value === value)
    ? (value as RatingAnimation)
    : 'none';
}

export function scaleAnimation(value: unknown): ScaleAnimation {
  return SCALE_ANIMATIONS.some((entry) => entry.value === value)
    ? (value as ScaleAnimation)
    : 'none';
}

// ============================================================================
// Température
// ============================================================================

/** Les arrêts de l'échelle, en RVB pour pouvoir interpoler. */
const COOL = [42, 194, 222] as const; // #2ac2de — le cyan Mooove
const GOLD = [245, 179, 1] as const; // #f5b301 — l'or d'une étoile
const WARM = [246, 146, 62] as const; // #f6923e — l'ambre Mooove
const EMBER = [225, 74, 38] as const; // la braise, tout en haut

function mix(from: readonly number[], to: readonly number[], amount: number): string {
  const channel = (i: number) => Math.round(from[i] + (to[i] - from[i]) * amount);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

/**
 * La part du chemin parcourue sur l'échelle, entre 0 et 1.
 *
 * Une échelle d'un seul cran — min égal max — vaudrait une division par zéro.
 * On la traite comme entièrement parcourue : la seule réponse possible est la
 * plus haute.
 */
export function scaleRatio(value: number, min: number, max: number): number {
  if (max <= min) return 1;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

/**
 * La couleur d'une valeur.
 *
 * Le cyan tient jusqu'à mi-échelle, puis vire à l'ambre, puis à la braise dans
 * le dernier cinquième. Ce n'est pas un dégradé linéaire : une note moyenne
 * doit rester visiblement neutre, sinon tout paraît chaud et l'échelle ne dit
 * plus rien.
 */
export function heatColor(ratio: number): string {
  const clamped = Math.min(1, Math.max(0, ratio));
  if (clamped <= 0.5) return mix(COOL, COOL, 0); // le cyan, tenu jusqu'à mi-échelle
  if (clamped <= 0.8) return mix(COOL, WARM, (clamped - 0.5) / 0.3);
  return mix(WARM, EMBER, (clamped - 0.8) / 0.2);
}

/**
 * La couleur d'une étoile — **de l'or, jamais du froid.**
 *
 * Les étoiles ne parcourent pas la même échelle que la jauge, et c'est
 * délibéré. Une étoile est un objet chaud : la peindre en cyan parce qu'elle
 * est la première d'une rangée de cinq donne une notation qu'on ne reconnaît
 * plus. Elles courent donc sur la moitié chaude seulement — or en bas, ambre au
 * milieu, braise tout en haut. L'idée de température tient toujours ; c'est son
 * point de départ qui change.
 *
 * Une échelle de recommandation, elle, a un vrai bas de gamme : c'est pour ça
 * que la jauge, elle, part du cyan.
 */
export function starColor(ratio: number): string {
  const clamped = Math.min(1, Math.max(0, ratio));
  if (clamped <= 0.6) return mix(GOLD, WARM, clamped / 0.6);
  return mix(WARM, EMBER, (clamped - 0.6) / 0.4);
}

/** Vrai dans le dernier cinquième — là où la braise s'allume. */
export function isHot(ratio: number): boolean {
  return ratio > 0.8;
}

/**
 * Le dégradé de la jauge — **en passant par l'ambre, jamais par le gris.**
 *
 * Un dégradé à deux arrêts, du cyan à la braise, traverse une zone morte : en
 * sRGB, le milieu du chemin entre un bleu-vert et un rouge est un gris brunâtre.
 * La jauge d'un 10 sur 10 avait donc un ventre sale au milieu, exactement là où
 * l'œil se pose.
 *
 * On reprend donc les arrêts de l'échelle elle-même. Chacun est placé à sa
 * position ABSOLUE sur l'échelle, ramenée à la portion réellement remplie :
 * une jauge à moitié pleine n'affiche que la moitié froide du chemin, ce qui
 * est précisément ce qu'on veut dire.
 */
export function gaugeGradient(ratio: number): string {
  const filled = Math.min(1, Math.max(0, ratio));
  if (filled <= 0) return heatColor(0);

  // Les points d'inflexion de `heatColor`, plus le bout courant.
  const stops = [0, 0.5, 0.8, filled].filter((stop) => stop <= filled);

  const colours = stops.map((stop) => heatColor(stop));

  // Une jauge qui n'a pas dépassé la mi-échelle est cyan d'un bout à l'autre :
  // en faire un dégradé du cyan vers le cyan coûte un calcul pour rien, et
  // rend le style difficile à lire dans les outils de développement.
  if (new Set(colours).size === 1) return colours[0];

  const parts = stops.map((stop, index) => {
    const position = Math.min(100, (stop / filled) * 100);
    return `${colours[index]} ${position.toFixed(1)}%`;
  });

  return `linear-gradient(90deg, ${parts.join(', ')})`;
}

// ============================================================================
// Durées
// ============================================================================

/**
 * Les durées, en secondes.
 *
 * Un retour immédiat vit sous 150 ms ; au-delà de 500 ms, l'animation se lit
 * comme de la lenteur. On reste dans la fenêtre du « changement d'état
 * courant », et la sortie est plus rapide que l'entrée.
 */
export const MOTION = {
  /** Le geste qui accuse réception. */
  commit: 0.34,
  /** Le remplissage de la jauge, qui suit le doigt. */
  fill: 0.24,
  /** Le décalage entre deux étoiles en cascade. */
  cascadeStep: 0.055,
  /** Retour à l'état neutre. */
  exit: 0.16
} as const;

/** Décélération franche, sans rebond élastique. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * L'intensité du geste, croissante avec la note.
 *
 * C'est ce qui répond à « la récompense est plus belle à quatre et cinq
 * étoiles » sans ajouter un second effet : c'est le MÊME geste, joué plus
 * ample. Ajouter des particules à partir de quatre aurait produit deux
 * animations à maintenir, et une rupture visible entre trois et quatre.
 */
export function commitIntensity(value: number, max: number): number {
  if (max <= 0) return 1;
  const ratio = Math.min(1, Math.max(0, value / max));
  // De 1 (une étoile sur cinq) à 1,5 (le maximum) : perceptible, jamais grotesque.
  return 1 + ratio * 0.5;
}

/** Le délai d'une étoile en cascade — nul dans les autres styles. */
export function cascadeDelay(index: number, style: RatingAnimation): number {
  return style === 'cascade' ? index * MOTION.cascadeStep : 0;
}
