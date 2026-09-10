'use client';

import { motion, useReducedMotion } from 'framer-motion';

import {
  EASE_OUT,
  MOTION,
  gaugeGradient,
  heatColor,
  isHot,
  scaleAnimation,
  scaleRatio,
  type ScaleAnimation
} from '@/lib/field-animation';
import { cn } from '@/lib/utils';

/**
 * L'échelle en curseur, transformée en jauge.
 *
 * **Ce n'est pas d'abord une décoration, c'est une correction de lisibilité.**
 * Le rail était uniformément gris : un 8 sur 10 et un 2 sur 10 se ressemblaient
 * au premier coup d'œil, seule la position du point les distinguait. Rempli, le
 * rail dit la quantité, pas seulement la position.
 *
 * La chaleur du remplissage suit la même règle que les étoiles — cyan jusqu'à
 * mi-échelle, ambre au-dessus, braise dans le dernier cinquième. Le style
 * « Braise » ajoute une lueur, et rien d'autre : pas de particules, pas de
 * flammes dessinées. Une lueur qui s'intensifie dit « haut de l'échelle » aussi
 * bien, et tient sur un téléphone.
 *
 * `prefers-reduced-motion` garde le remplissage et la couleur — ils portent la
 * réponse — et retire la transition de largeur et la pulsation.
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
  const reduced = useReducedMotion();

  const hasValue = value !== null && value !== undefined;
  const shown = hasValue ? value : Math.round((min + max) / 2);

  const ratio = scaleRatio(shown, min, max);
  const colour = heatColor(ratio);
  const hot = isHot(ratio) && hasValue;

  // Sans jauge, on garde exactement le rail d'avant.
  const plain = animation === 'none';

  return (
    <div className="flex w-full items-center gap-3 py-1">
      <div className="relative flex-1">
        {/* Le rail. En jauge, la portion parcourue est peinte à la
            température de la réponse ; le reste garde le gris du repos. */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-border-strong">
          {!plain && (
            <motion.div
              className="h-full rounded-full"
              style={{
                // Le dégradé reprend les arrêts de l'échelle : il passe par
                // l'ambre au lieu de traverser le gris.
                background: gaugeGradient(ratio),
                // La lueur ne s'allume qu'en haut de l'échelle, et seulement
                // dans le style « Braise ».
                boxShadow:
                  animation === 'ember' && hot ? `0 0 12px 1px ${colour}` : 'none'
              }}
              animate={{ width: `${ratio * 100}%` }}
              initial={false}
              transition={
                reduced ? { duration: 0 } : { duration: MOTION.fill, ease: EASE_OUT }
              }
            />
          )}
        </div>

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
          onChange={(event) => onChange(Number(event.target.value))}
          style={
            plain
              ? undefined
              : ({ '--thumb': colour } as React.CSSProperties)
          }
          className={cn(
            'relative w-full cursor-pointer appearance-none bg-transparent outline-hidden',
            'h-6', // une cible tactile honnête, même si le rail fait 6 px
            'focus-visible:outline-hidden',
            // La piste native est masquée : c'est la nôtre qui s'affiche dessous.
            '[&::-webkit-slider-runnable-track]:h-6 [&::-webkit-slider-runnable-track]:bg-transparent',
            '[&::-moz-range-track]:h-6 [&::-moz-range-track]:bg-transparent',
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-xs [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:active:scale-125',
            plain
              ? '[&::-webkit-slider-thumb]:bg-(--accent)'
              : '[&::-webkit-slider-thumb]:bg-(--thumb)',
            '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-xs [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:hover:scale-110 [&::-moz-range-thumb]:active:scale-125',
            plain ? '[&::-moz-range-thumb]:bg-(--accent)' : '[&::-moz-range-thumb]:bg-(--thumb)',
            // Le rail gris d'origine, quand aucune jauge n'est demandée.
            plain &&
              'h-1 rounded-lg bg-border-strong [&::-webkit-slider-runnable-track]:h-1 [&::-moz-range-track]:h-1'
          )}
        />
      </div>

      {/* Le chiffre prend la couleur de sa propre valeur : on lit la note et sa
          température au même endroit. */}
      <span
        className="min-w-[28px] shrink-0 text-right font-mono text-sm font-semibold tabular-nums select-none"
        style={hasValue && !plain ? { color: colour } : undefined}
      >
        {hasValue ? shown : '—'}
      </span>
    </div>
  );
}
