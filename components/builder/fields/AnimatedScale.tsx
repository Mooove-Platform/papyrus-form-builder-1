'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';

import {
  BALL_SIZE,
  EASE_OUT,
  MOTION,
  crowns,
  hasRollingBall,
  isHot,
  rollDegrees,
  scaleAnimation,
  scaleGradient,
  scaleRamp,
  scaleRatio,
  stretchFor,
  type ScaleAnimation
} from '@/lib/field-animation';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/utils';

import { ScaleEffects, type ScalePulse } from './ScaleEffects';

/**
 * L'échelle en curseur, transformée en jauge.
 *
 * **Ce n'est pas d'abord une décoration, c'est une correction de lisibilité.**
 * Le rail était uniformément gris : un 8 sur 10 et un 2 sur 10 se ressemblaient
 * au premier coup d'œil, seule la position du point les distinguait. Rempli, le
 * rail dit la quantité, pas seulement la position.
 *
 * Six styles, une seule idée : **la réponse a une température.** Trois d'entre
 * eux la disent par la couleur seule — le rail tel qu'il est, la jauge, la
 * braise. Les trois autres la disent par la MATIÈRE : une bille qui roule
 * vraiment la distance qu'on lui fait parcourir, et un haut d'échelle qui prend
 * feu, se charge ou entre en fusion. Ce sont trois expressions de la même
 * échelle thermique, pas trois humeurs — le rythme des couleurs est commun,
 * seule la destination change.
 *
 * `prefers-reduced-motion` garde le remplissage, la couleur et la position —
 * ils portent la réponse — et retire la rotation, l'étirement, l'envol et toute
 * la couche dessinée. Réduire n'est pas éteindre.
 */

interface Props {
  min: number;
  max: number;
  value: number | null | undefined;
  onChange: (value: number) => void;
  preview: boolean;
  style?: ScaleAnimation;
  /** Ce que porte l'étiquette accessible du curseur. */
  ariaLabel?: string;
}

export function AnimatedScale({
  min,
  max,
  value,
  onChange,
  preview,
  style,
  ariaLabel
}: Props) {
  const animation = scaleAnimation(style);

  const reduced = usePrefersReducedMotion();

  const hasValue = value !== null && value !== undefined;
  const shown = hasValue ? value : Math.round((min + max) / 2);

  const ratio = scaleRatio(shown, min, max);
  const ramp = scaleRamp(animation);
  const colour = ramp(ratio);
  const hot = isHot(ratio) && hasValue;

  // Sans jauge, on garde exactement le rail d'avant.
  const plain = animation === 'none';
  const rolling = hasRollingBall(animation) && !preview;

  // ── La géométrie, mesurée ─────────────────────────────────────────────────
  // La bille roule d'un angle proportionnel à la distance réellement
  // parcourue : sans largeur mesurée, on ne peut pas la calculer. La toile en a
  // besoin aussi. C'est la seule chose qu'on mesure, et seulement pour les
  // styles qui en dépendent.
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = frame.current;
    if (!element || !rolling) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    setWidth(element.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, [rolling]);

  // ── L'élan ────────────────────────────────────────────────────────────────
  const [angle, setAngle] = useState(0);
  const [stretch, setStretch] = useState(1);
  const [pulse, setPulse] = useState<ScalePulse | null>(null);
  /**
   * L'envol est piloté à la main, et c'est délibéré.
   *
   * Confié à la prop `animate` sous forme de suite de valeurs, il se rejouerait
   * à chaque re-rendu du formulaire — une frappe dans un autre champ suffirait
   * à faire sauter une bille qui n'a pas bougé. Le même piège avait déjà touché
   * les étoiles.
   */
  const lift = useAnimationControls();
  const previous = useRef(shown);
  const pulseId = useRef(0);

  /**
   * Ce qui se passe quand on franchit un cran.
   *
   * La valeur, elle, est déjà remontée au formulaire — la réponse ne suit
   * jamais une animation. Ici on ne calcule que ce qui bouge : l'angle
   * accumulé, l'étirement, et le signal qui rouvre la fenêtre de dessin.
   */
  function commit(next: number) {
    const before = previous.current;
    previous.current = next;
    onChange(next);

    if (!rolling || reduced || width <= 0) return;

    const track = Math.max(0, width - BALL_SIZE);
    const crossed = scaleRatio(next, min, max) - scaleRatio(before, min, max);
    const travelled = crossed * track;

    setAngle((current) => current + rollDegrees(crossed, track));
    setStretch(stretchFor(travelled));

    pulseId.current += 1;
    const burst = crowns(before, next, max);
    setPulse({
      id: pulseId.current,
      direction: Math.sign(travelled) || 1,
      travel: travelled,
      burst
    });
    if (burst) void lift.start({ y: [0, -6, 0] });
  }

  // L'orbe se repose dès qu'on lâche : l'étirement dit la vitesse du geste, pas
  // la valeur choisie.
  useEffect(() => {
    if (stretch === 1) return;
    const timer = setTimeout(() => setStretch(1), MOTION.commit * 1000);
    return () => clearTimeout(timer);
  }, [stretch]);

  const trackFill = (
    <motion.div
      className="h-full rounded-full"
      style={{
        // Le dégradé reprend les arrêts de l'échelle : il passe par l'ambre au
        // lieu de traverser le gris.
        background: scaleGradient(animation, ratio),
        // La lueur ne s'allume qu'en haut de l'échelle, et seulement dans les
        // styles qui l'ont demandée.
        boxShadow:
          (animation === 'ember' || animation === 'heat') && hot
            ? `0 0 12px 1px ${colour}`
            : 'none'
      }}
      animate={{ width: `${ratio * 100}%` }}
      initial={false}
      transition={reduced ? { duration: 0 } : { duration: MOTION.fill, ease: EASE_OUT }}
    />
  );

  return (
    <div className={cn('flex w-full items-center gap-3', rolling ? 'py-0.5' : 'py-1')}>
      <div ref={frame} className={cn('relative flex-1', rolling && 'h-11')}>
        {/*
          La couche dessinée : flamme, traînée, arcs, onde, braises.

          Elle vit dans une ancre de hauteur nulle posée au centre du rail, ce
          qui lui donne sa ligne de sol quelle que soit la hauteur du conteneur.
          Elle ne se monte que pour les styles qui dessinent, jamais en
          mouvement réduit, jamais dans l'aperçu du constructeur — un
          formulaire ouvert dans un onglet ne doit rien faire tourner.
        */}
        {rolling && !reduced && width > 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-0">
            <ScaleEffects animation={animation} ratio={ratio} width={width} pulse={pulse} />
          </div>
        )}

        {/* Le rail. En jauge, la portion parcourue est peinte à la température
            de la réponse ; le reste garde le gris du repos. */}
        {rolling ? (
          // La course de la bille est retirée de 14 px à chaque bout : le
          // navigateur place le centre du pouce natif à la moitié de sa
          // largeur, et la bille dessinée doit tomber exactement dessus.
          <div className="pointer-events-none absolute top-1/2 right-3.5 left-3.5 -translate-y-1/2">
            <div
              className={cn(
                'overflow-hidden rounded-full bg-border-strong',
                animation === 'molten' ? 'h-2.5' : 'h-2'
              )}
            >
              {trackFill}
            </div>

            <Ball
              animation={animation}
              ratio={ratio}
              colour={colour}
              angle={reduced ? 0 : angle}
              stretch={reduced ? 1 : stretch}
              lift={lift}
            />
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-border-strong">
            {!plain && trackFill}
          </div>
        )}

        {/*
          La braise, au bout de la jauge et nulle part ailleurs.

          Elle couvrait d'abord toute la portion remplie, en aplat translucide :
          la braise rouge posée sur le cyan du début donnait un gris boueux, et
          le dégradé qu'elle était censée mettre en valeur devenait illisible.
          Une lueur bornée à la tête de jauge dit « haut de l'échelle » sans
          repeindre ce qu'il y a derrière.

          Elle ne tourne que dans le dernier cinquième, et s'arrête d'elle-même
          dès que la note redescend : aucune boucle ne survit à son cas.
        */}
        {animation === 'ember' && hot && !reduced && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute top-1/2 h-3 w-7 -translate-y-1/2 rounded-full"
            style={{
              left: `calc(${ratio * 100}% - 14px)`,
              background: colour,
              filter: 'blur(6px)'
            }}
            animate={{ opacity: [0.35, 0.85, 0.35], scaleX: [1, 1.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        <input
          type="range"
          min={min}
          max={max}
          step={1}
          disabled={preview}
          value={shown}
          aria-label={ariaLabel}
          aria-valuetext={hasValue ? `${shown} sur ${max}` : undefined}
          onChange={(event) => commit(Number(event.target.value))}
          style={plain ? undefined : ({ '--thumb': colour } as React.CSSProperties)}
          className={cn(
            'relative w-full cursor-pointer appearance-none bg-transparent outline-hidden',
            'focus-visible:outline-hidden',
            // La piste native est masquée : c'est la nôtre qui s'affiche dessous.
            '[&::-webkit-slider-runnable-track]:bg-transparent',
            '[&::-moz-range-track]:bg-transparent',
            rolling
              ? [
                  // Le pouce natif fait la largeur de la bille dessinée, et
                  // reste invisible : c'est lui qui porte le clavier, le tactile
                  // et le focus, elle qui porte le regard.
                  'h-11 z-20',
                  '[&::-webkit-slider-runnable-track]:h-11 [&::-moz-range-track]:h-11',
                  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-11 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:bg-transparent',
                  '[&::-moz-range-thumb]:h-11 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-transparent'
                ]
              : [
                  'h-6', // une cible tactile honnête, même si le rail fait 6 px
                  '[&::-webkit-slider-runnable-track]:h-6 [&::-moz-range-track]:h-6',
                  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-xs [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:active:scale-125',
                  plain
                    ? '[&::-webkit-slider-thumb]:bg-(--accent)'
                    : '[&::-webkit-slider-thumb]:bg-(--thumb)',
                  '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-xs [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:hover:scale-110 [&::-moz-range-thumb]:active:scale-125',
                  plain
                    ? '[&::-moz-range-thumb]:bg-(--accent)'
                    : '[&::-moz-range-thumb]:bg-(--thumb)',
                  // Le rail gris d'origine, quand aucune jauge n'est demandée.
                  plain &&
                    'h-1 rounded-lg bg-border-strong [&::-webkit-slider-runnable-track]:h-1 [&::-moz-range-track]:h-1'
                ]
          )}
        />
      </div>

      {/* Le chiffre prend la couleur de sa propre valeur : on lit la note et sa
          température au même endroit. Il change d'un coup — jamais en défilant
          par les valeurs intermédiaires, qui se liraient comme des réponses. */}
      <motion.span
        key={shown}
        className="min-w-[28px] shrink-0 text-right font-mono text-sm font-semibold tabular-nums select-none"
        style={hasValue && !plain ? { color: colour } : undefined}
        initial={rolling && !reduced ? { y: 3, opacity: 0.55 } : false}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.14 }}
      >
        {hasValue ? shown : '—'}
      </motion.span>
    </div>
  );
}

/**
 * La bille des trois styles à matière.
 *
 * Sa rotation n'est pas décorative : l'angle est l'arc réellement parcouru
 * divisé par le rayon, accumulé et signé. Elle roule donc en arrière quand on
 * revient en arrière, au lieu de repartir de zéro — c'est ce qui fait qu'on la
 * lit comme un objet et non comme un curseur qui tourne.
 */
function Ball({
  animation,
  ratio,
  colour,
  angle,
  stretch,
  lift
}: {
  animation: ScaleAnimation;
  ratio: number;
  colour: string;
  angle: number;
  stretch: number;
  lift: ReturnType<typeof useAnimationControls>;
}) {
  const spins = animation !== 'energy';

  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute top-1/2 z-20 block"
      style={{
        left: `${ratio * 100}%`,
        width: BALL_SIZE,
        height: BALL_SIZE,
        marginLeft: -BALL_SIZE / 2,
        marginTop: -BALL_SIZE / 2,
        filter: 'drop-shadow(0 3px 4px rgba(5, 33, 57, 0.18))'
      }}
      // L'envol salue le passage au sommet, pas le séjour : il n'est lancé qu'en
      // franchissant la dernière marche par le bas.
      animate={lift}
      transition={{ duration: 0.32, ease: EASE_OUT }}
    >
      <span
        className="block h-full w-full rounded-full"
        style={{
          transform: `rotate(${spins ? angle : 0}deg) scaleX(${animation === 'energy' ? stretch : 1})`,
          transition: 'transform 120ms linear',
          ...ballSkin(animation, ratio, colour)
        }}
      >
        {animation === 'heat' && (
          // Le moyeu : c'est le contraste entre le moyeu fixe et la jante
          // motivée qui rend la rotation lisible d'un coup d'œil.
          <span className="absolute inset-[8px] rounded-full bg-mooove-ice shadow-[inset_0_0_0_1px_rgba(5,33,57,0.12)]" />
        )}
      </span>
    </motion.span>
  );
}

/** La matière d'une bille — la seule chose qui distingue les trois styles. */
function ballSkin(
  animation: ScaleAnimation,
  ratio: number,
  colour: string
): React.CSSProperties {
  if (animation === 'energy') {
    return {
      background: `radial-gradient(circle at 32% 26%, #ffffff, #c7eafb 20%, ${colour} 58%, #3c5eab 100%)`,
      border: '2px solid #eff9fe',
      boxShadow: `0 0 ${Math.round(ratio * 18)}px ${colour}`
    };
  }

  if (animation === 'molten') {
    // Un roulement d'acier poli : le métal ne chauffe pas, c'est le liquide
    // autour qui entre en fusion.
    return {
      background: 'conic-gradient(#ffffff, #5c7f96, #eff9fe, #052139, #ffffff)',
      border: '2px solid #eff9fe'
    };
  }

  // Six rayons francs, cyan contre navy. Un motif pale ne tourne pas : on le
  // voit bouger sans le voir rouler, et la rotation cesse alors de dire la
  // distance parcourue, qui est tout ce qu'elle a a dire.
  return {
    background:
      'conic-gradient(from 20deg, #2ac2de 0deg 30deg, #052139 30deg 60deg, #2ac2de 60deg 90deg, #052139 90deg 120deg, #2ac2de 120deg 150deg, #052139 150deg 180deg, #2ac2de 180deg 210deg, #052139 210deg 240deg, #2ac2de 240deg 270deg, #052139 270deg 300deg, #2ac2de 300deg 330deg, #052139 330deg 360deg)',
    border: '2px solid #eff9fe',
    position: 'relative'
  };
}
