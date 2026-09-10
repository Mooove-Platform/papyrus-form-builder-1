'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Star } from 'lucide-react';

import {
  EASE_OUT,
  MOTION,
  cascadeDelay,
  commitIntensity,
  ratingAnimation,
  scaleRatio,
  starColor,
  type RatingAnimation
} from '@/lib/field-animation';
import { cn } from '@/lib/utils';

/**
 * Les étoiles d'un champ de notation.
 *
 * **Le geste s'amplifie avec la note.** Une étoile sur cinq et cinq sur cinq
 * jouent la MÊME animation, avec plus d'ampleur en haut de l'échelle : c'est ce
 * qui rend la récompense plus belle à quatre et cinq sans ajouter un second
 * effet. Deux animations distinctes auraient produit une rupture visible entre
 * trois et quatre, et deux choses à maintenir.
 *
 * La couleur porte la même idée que la jauge du curseur — la réponse a une
 * température — mais les étoiles courent sur la moitié chaude seulement : or,
 * ambre, puis braise. Une étoile est un objet chaud ; la peindre en cyan parce
 * qu'elle est la première d'une rangée de cinq donne une notation qu'on ne
 * reconnaît plus.
 *
 * `prefers-reduced-motion` garde le remplissage et la couleur, qui portent la
 * réponse, et retire le déplacement et la rotation, qui ne portent que le
 * plaisir. Réduire n'est pas éteindre : le retour reste lisible.
 */

interface Props {
  max: number;
  /** Le constructeur montre les étoiles sans les rendre cliquables. */
  preview: boolean;
  value?: number;
  onChange?: (value: number) => void;
  style?: RatingAnimation;
  /** Libellé d'une étoile, dans la langue du répondant. */
  labelFor?: (index: number) => string;
}

export function AnimatedRating({ max, preview, value, onChange, style, labelFor }: Props) {
  const animation = ratingAnimation(style);
  const reduced = useReducedMotion();

  const [hover, setHover] = useState(0);
  const [localValue, setLocalValue] = useState(0);
  const currentValue = value !== undefined ? value : localValue;

  /**
   * La note qu'on vient de poser, ou `null`.
   *
   * Distincte de la valeur : c'est elle qui déclenche le geste. Sans ce
   * marqueur, chaque re-rendu du formulaire — une frappe dans un autre champ —
   * relancerait l'animation de toutes les étoiles déjà remplies.
   */
  const [justCommitted, setJustCommitted] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const commit = (next: number) => {
    if (onChange) onChange(next);
    else setLocalValue(next);

    if (animation !== 'none') {
      setJustCommitted(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setJustCommitted(null), 700);
    }
  };

  if (preview) {
    return (
      <div className="flex items-center gap-1.5">
        {Array.from({ length: max }).map((_, i) => (
          <Star key={i} className="h-7 w-7 text-text-tertiary" strokeWidth={1.5} />
        ))}
      </div>
    );
  }

  const shown = hover || currentValue;

  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: max }).map((_, index) => {
        const position = index + 1;
        const filled = shown > index;

        // La température de CETTE étoile. La rangée court de l'or à la
        // braise : toutes les étoiles sont chaudes — une étoile cyan ne se
        // reconnaîtrait plus comme une note — et les dernières se creusent.
        const colour = starColor(scaleRatio(position, 1, max));

        // Le geste ne joue que sur les étoiles atteintes par la note qu'on
        // vient de poser — et, en cascade, l'une après l'autre.
        const playing =
          animation !== 'none' && justCommitted !== null && position <= justCommitted;

        const intensity = commitIntensity(justCommitted ?? 0, max);

        return (
          <motion.button
            key={index}
            type="button"
            onMouseEnter={() => setHover(position)}
            onMouseLeave={() => setHover(0)}
            onFocus={() => setHover(position)}
            onBlur={() => setHover(0)}
            onClick={() => commit(position)}
            aria-label={labelFor ? labelFor(position) : `Note ${position}`}
            className="rounded-sm outline-hidden focus-visible:ring-2 focus-visible:ring-accent-cta focus-visible:ring-offset-2"
            animate={
              playing && !reduced
                ? {
                    scale: [1, intensity, 1],
                    rotate: animation === 'spin' ? [0, 360] : 0
                  }
                : { scale: 1, rotate: 0 }
            }
            transition={{
              duration: animation === 'spin' ? MOTION.commit * 1.3 : MOTION.commit,
              delay: playing ? cascadeDelay(index, animation) : 0,
              ease: EASE_OUT
            }}
          >
            <Star
              className={cn('h-7 w-7 transition-colors', !filled && 'text-text-tertiary')}
              strokeWidth={1.5}
              style={filled ? { color: colour, fill: colour } : undefined}
            />
          </motion.button>
        );
      })}
    </div>
  );
}
