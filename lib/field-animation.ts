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
export type ScaleAnimation =
  | 'none'
  | 'gauge'
  | 'ember'
  | 'heat'
  | 'energy'
  | 'molten';
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
  },
  {
    value: 'heat',
    label: 'Roue de feu',
    hint: 'Une bille qui roule la distance parcourue ; le haut de l’échelle prend feu.'
  },
  {
    value: 'energy',
    label: 'Orbe d’énergie',
    hint: 'Une sphère qui se charge : traînée, halo, arcs électriques tout en haut.'
  },
  {
    value: 'molten',
    label: 'Coulée',
    hint: 'Un liquide épais qui ondule dans le sens du geste, et vire à l’orange.'
  }
];

/**
 * Les styles qui remplacent le point par une bille qui roule.
 *
 * Ce n'est pas une catégorie décorative : ces trois-là changent la GÉOMÉTRIE du
 * curseur — un rail plus épais, une bille de 28 px, une couche de dessin
 * au-dessus. Les trois premiers styles gardent le contrôle tel qu'il est. La
 * distinction se lit ici une fois pour toutes, plutôt que dans six conditions
 * réparties dans le rendu.
 */
export function hasRollingBall(animation: ScaleAnimation): boolean {
  return animation === 'heat' || animation === 'energy' || animation === 'molten';
}

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
const ELECTRIC = [86, 136, 255] as const; // le bleu chargé de l'orbe
const VIOLET = [152, 93, 255] as const; // la décharge, tout en haut

/**
 * Le passage d'une couleur à l'autre — **en OKLab, jamais en sRGB.**
 *
 * Interpoler deux couleurs en sRGB revient à faire la moyenne de trois nombres
 * qui ne représentent rien de perceptif. Entre le cyan et l'ambre, cette
 * moyenne tombe sur un olive délavé : la jauge d'un 10 sur 10 avait un ventre
 * sale au milieu, exactement là où l'œil se pose. Ajouter des arrêts ne
 * corrigeait rien — le gris revenait entre chaque paire.
 *
 * On passe donc par OKLCh — OKLab en polaire — et on fait TOURNER la teinte
 * par le plus court chemin au lieu de traverser en ligne droite. La vivacité
 * se conserve d'un bout à l'autre : la jauge chauffe en passant par le vert et
 * l'or, comme le ferait un vrai thermomètre. Les deux bornes sont rendues
 * telles quelles, sans aller-retour, pour qu'une couleur de la charte reste
 * exactement la couleur de la charte.
 */
function mix(from: readonly number[], to: readonly number[], amount: number): string {
  if (amount <= 0) return `rgb(${from[0]}, ${from[1]}, ${from[2]})`;
  if (amount >= 1) return `rgb(${to[0]}, ${to[1]}, ${to[2]})`;

  const start = toOklch(from);
  const end = toOklch(to);

  // La teinte tourne par le plus court chemin. C'est là que tout se joue : le
  // cyan et l'ambre sont presque opposés, et la ligne droite entre les deux
  // passe par l'axe des gris. En tournant, on garde la vivacité de bout en
  // bout — la jauge traverse le vert et l'or au lieu de traverser la boue.
  let turn = end[2] - start[2];
  if (turn > 180) turn -= 360;
  if (turn < -180) turn += 360;

  // Une couleur sans vivacité n'a pas de teinte propre : elle emprunte celle de
  // l'autre plutôt que d'imposer un virage arbitraire.
  if (start[1] < 0.002) turn = 0;
  if (end[1] < 0.002) turn = 0;

  const [red, green, blue] = fromOklch([
    start[0] + (end[0] - start[0]) * amount,
    start[1] + (end[1] - start[1]) * amount,
    start[2] + turn * amount
  ]);
  return `rgb(${red}, ${green}, ${blue})`;
}

/** sRGB encodé (0–255) vers lumière linéaire (0–1). */
function toLinear(value: number): number {
  const unit = value / 255;
  return unit <= 0.04045 ? unit / 12.92 : Math.pow((unit + 0.055) / 1.055, 2.4);
}

/** Lumière linéaire vers un canal sRGB entier, borné. */
function toChannel(value: number): number {
  const encoded =
    value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(Math.max(0, value), 1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, encoded)) * 255);
}

function toOklab(rgb: readonly number[]): [number, number, number] {
  const red = toLinear(rgb[0]);
  const green = toLinear(rgb[1]);
  const blue = toLinear(rgb[2]);

  const long = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
  const medium = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
  const short = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);

  return [
    0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short,
    1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short,
    0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short
  ];
}

/** OKLab en coordonnees polaires : clarte, vivacite, teinte en degres. */
function toOklch(rgb: readonly number[]): [number, number, number] {
  const [lightness, green, blue] = toOklab(rgb);
  const chroma = Math.hypot(green, blue);
  const hue = (Math.atan2(blue, green) * 180) / Math.PI;
  return [lightness, chroma, (hue + 360) % 360];
}

function fromOklch(lch: readonly number[]): [number, number, number] {
  const angle = (lch[2] * Math.PI) / 180;
  return fromOklab([lch[0], Math.cos(angle) * lch[1], Math.sin(angle) * lch[1]]);
}

function fromOklab(lab: readonly number[]): [number, number, number] {
  const long = (lab[0] + 0.3963377774 * lab[1] + 0.2158037573 * lab[2]) ** 3;
  const medium = (lab[0] - 0.1055613458 * lab[1] - 0.0638541728 * lab[2]) ** 3;
  const short = (lab[0] - 0.0894841775 * lab[1] - 1.291485548 * lab[2]) ** 3;

  return [
    toChannel(4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short),
    toChannel(-1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short),
    toChannel(-0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short)
  ];
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

/**
 * La rampe électrique de l'orbe — froid, puis bleu vif, puis violet.
 *
 * Elle a la MÊME forme que la rampe thermique : le cyan tenu jusqu'à
 * mi-échelle, un virage au milieu, un dernier cinquième qui bascule. Seule la
 * destination change. C'est ce qui fait que six styles se lisent comme un seul
 * système et non comme six humeurs : le rythme est commun, la matière varie.
 */
export function energyColor(ratio: number): string {
  const clamped = Math.min(1, Math.max(0, ratio));
  if (clamped <= 0.5) return mix(COOL, COOL, 0);
  if (clamped <= 0.8) return mix(COOL, ELECTRIC, (clamped - 0.5) / 0.3);
  return mix(ELECTRIC, VIOLET, (clamped - 0.8) / 0.2);
}

/**
 * La rampe de la coulée — froide, puis or en fusion, puis braise.
 *
 * Elle passe par l'or plutôt que par l'ambre : un métal en fusion est plus
 * jaune qu'une flamme. Même rythme, matière différente.
 */
export function moltenColor(ratio: number): string {
  const clamped = Math.min(1, Math.max(0, ratio));
  if (clamped <= 0.5) return mix(COOL, COOL, 0);
  if (clamped <= 0.8) return mix(COOL, GOLD, (clamped - 0.5) / 0.3);
  return mix(GOLD, EMBER, (clamped - 0.8) / 0.2);
}

/** La rampe d'un style — c'est le seul endroit qui fait ce choix. */
export function scaleRamp(animation: ScaleAnimation): (ratio: number) => string {
  if (animation === 'energy') return energyColor;
  if (animation === 'molten') return moltenColor;
  return heatColor;
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
  return gradientFrom(heatColor, ratio);
}

/** Le dégradé du style demandé — c'est ce qu'appelle le rendu. */
export function scaleGradient(animation: ScaleAnimation, ratio: number): string {
  return gradientFrom(scaleRamp(animation), ratio);
}

function gradientFrom(colour: (ratio: number) => string, ratio: number): string {
  const filled = Math.min(1, Math.max(0, ratio));
  if (filled <= 0) return colour(0);

  // On ECHANTILLONNE la rampe, on ne se contente pas de ses points
  // d'inflexion. C'est le second temps de la correction du ventre gris : nos
  // couleurs ont beau tourner proprement d'une teinte a l'autre, le navigateur,
  // lui, interpole ce qu'il y a ENTRE deux arrets en sRGB — et la ligne droite
  // du cyan a l'ambre repasse par la boue. Des arrets rapproches ne laissent
  // plus la place a cette erreur.
  const steps = 16;
  const colours: string[] = [];
  for (let step = 0; step <= steps; step += 1) {
    colours.push(colour((step / steps) * filled));
  }

  // Une jauge qui n'a pas depasse la mi-echelle est d'un seul ton : en faire un
  // degrade de seize arrets identiques couterait un calcul pour rien, et
  // rendrait le style illisible dans les outils de developpement.
  if (new Set(colours).size === 1) return colours[0];

  const parts = colours.map(
    (tone, index) => `${tone} ${((index / steps) * 100).toFixed(1)}%`
  );

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

// ============================================================================
// La matière des trois styles à bille
// ============================================================================

/**
 * Le diamètre de la bille, en pixels — **et la largeur du pouce natif.**
 *
 * Les deux valent la même chose, et c'est délibéré. Le navigateur place le
 * centre du pouce à `largeurDuPouce / 2 + part × (largeurDuRail − largeurDuPouce)` :
 * si notre bille dessinée n'adopte pas la même géométrie, elle dérive du doigt
 * aux deux extrémités du rail — de plus en plus visiblement à mesure que le
 * curseur est étroit. Une bille peinte à côté de l'endroit où l'on appuie est
 * pire que pas de bille du tout.
 */
export const BALL_SIZE = 28;

/**
 * La durée pendant laquelle les effets vivent après le dernier changement, en
 * millisecondes.
 *
 * Elle borne tout ce qui coûte cher. Une note haute laissée en place garde sa
 * couleur — elle porte la réponse — mais cesse de brûler : une page de
 * formulaire reste parfois ouverte des heures, et une boucle d'animation
 * permanente sur un téléphone se paye en batterie.
 */
export const ACTIVITY_MS = 900;

/** Le plafond de particules vivantes, par curseur. */
export const MAX_PARTICLES = 28;

/**
 * L'angle dont tourne la bille pour un déplacement donné.
 *
 * Elle roule comme roulerait une bille : l'angle est l'arc parcouru divisé par
 * le rayon. La rotation dit donc quelque chose de vrai — la distance déplacée —
 * et s'inverse quand on revient en arrière, au lieu de repartir de zéro.
 */
export function rollDegrees(deltaRatio: number, trackWidth: number): number {
  const travel = deltaRatio * trackWidth;
  return (travel / (BALL_SIZE / 2)) * (180 / Math.PI);
}

/**
 * L'étirement de l'orbe, d'après la distance franchie d'un coup.
 *
 * Un petit cran ne déforme rien ; un geste large étire la sphère dans le sens
 * du mouvement. C'est un indice de vitesse pris sur la distance, pas une
 * simulation : le curseur avance par crans entiers, il n'y a pas de vitesse
 * continue à mesurer.
 */
export function stretchFor(travel: number): number {
  return Math.min(1.2, 1 + Math.abs(travel) / 220);
}

/** Ce qui s'allume à une hauteur d'échelle donnée. */
export interface ScaleEffects {
  /** Des braises montent depuis la tête de jauge. */
  particles: boolean;
  /** Une bordure de flamme court sur la portion remplie. */
  flame: boolean;
  /** Un halo pulse autour de l'orbe. */
  ring: boolean;
  /** Des arcs claquent au-dessus de l'orbe. */
  arc: boolean;
  /** La surface du liquide ondule dans le sens du geste. */
  wave: boolean;
}

const NOTHING: ScaleEffects = {
  particles: false,
  flame: false,
  ring: false,
  arc: false,
  wave: false
};

/**
 * Ce que dessine un style à une hauteur donnée.
 *
 * **Les seuils sont ici, et nulle part ailleurs.** Ils sont la moitié de l'idée :
 * un curseur qui produirait le même spectacle à 2 sur 10 et à 10 sur 10 ne
 * dirait rien du tout. Les avoir en une seule fonction pure les rend
 * vérifiables — le rendu sur toile, lui, ne l'est pas.
 */
export function scaleEffects(animation: ScaleAnimation, ratio: number): ScaleEffects {
  if (!hasRollingBall(animation)) return NOTHING;
  const height = Math.min(1, Math.max(0, ratio));

  return {
    // Sept sur dix : le moment où la réponse cesse d'être tiède.
    particles: height >= 0.7,
    flame: animation === 'heat' && height >= 0.9,
    ring: animation === 'energy' && height >= 0.5,
    arc: animation === 'energy' && height >= 0.7,
    // Un liquide ondule toujours quand on le déplace, même froid.
    wave: animation === 'molten'
  };
}

/**
 * Vrai au moment où la note atteint le sommet **en venant d'en dessous.**
 *
 * Le petit envol de la bille salue le passage, pas le séjour : rester à 10 ne
 * le rejoue pas, redescendre puis remonter le rejoue. C'est ce qui garde le
 * geste rare, donc lisible.
 */
export function crowns(previous: number, next: number, max: number): boolean {
  return next >= max && previous < max;
}
