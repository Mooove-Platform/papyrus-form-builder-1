'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';

import type { ConfirmationCelebration, ConfirmationMedia } from '@/types';
import { parseVideoEmbed } from '@/lib/video';

/**
 * Ce qui ouvre la page de remerciement.
 *
 * **Un seul objet en tête, jamais deux.** Si l'auteur a mis une image, une
 * vidéo ou un GIF, c'est lui qu'on voit : la pastille verte à coche disparaît.
 * Garder les deux ferait deux points focaux à quinze pixels l'un de l'autre, et
 * la page perdrait ce qu'elle a de mieux à montrer.
 *
 * L'animation d'arrivée est le seul moment autorisé à se faire remarquer sur
 * cette page — c'est la fin du parcours, la seule qui n'a rien à demander. Elle
 * joue une fois, puis se démonte : une page de remerciement reste parfois
 * ouverte des heures dans un onglet, et rien ne doit y tourner en fond.
 */

interface Props {
  media?: ConfirmationMedia;
  celebration?: ConfirmationCelebration;
  /** La couleur de la pastille — celle du formulaire. */
  accent: string;
  /** Le texte alternatif, déjà résolu dans la langue du répondant. */
  alt?: string;
}

export function ConfirmationMediaBlock({ media, celebration, accent, alt }: Props) {
  const reduced = useReducedMotion();
  const style = celebration ?? 'seal';

  const kind = media?.kind ?? 'none';
  const url = media?.url?.trim();
  const hasMedia = kind !== 'none' && Boolean(url);

  const width = Math.min(720, Math.max(120, media?.width ?? 420));

  /** Arrivée commune : depuis un état déjà visible, sans rebond. */
  const entrance =
    style === 'none' || reduced
      ? undefined
      : {
          initial: { opacity: 0, scale: 0.94 },
          animate: { opacity: 1, scale: 1 },
          transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const }
        };

  if (hasMedia) {
    return (
      // `relative` est indispensable : la salve se place en absolu par rapport
      // au premier ancêtre positionné. Sans lui, elle s'ancrait sur la page
      // entière et partait hors champ — invisible, mais bel et bien animée.
      <motion.div
        className="relative mx-auto mb-8"
        style={{ maxWidth: width }}
        {...entrance}
      >
        <MediaSurface kind={kind} url={url!} alt={alt} loop={media?.loop !== false} />
        {style === 'confetti' && !reduced && <Confetti accent={accent} />}
      </motion.div>
    );
  }

  return (
    <div className="relative">
      <motion.div
        className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
        style={{ backgroundColor: accent }}
        {...entrance}
      >
        <Check className="h-10 w-10 text-white" />
      </motion.div>
      {style === 'confetti' && !reduced && <Confetti accent={accent} />}
    </div>
  );
}

/** L'image, la vidéo ou le cadre — chacun avec ce qu'il lui faut, rien de plus. */
function MediaSurface({
  kind,
  url,
  alt,
  loop
}: {
  kind: ConfirmationMedia['kind'];
  url: string;
  alt?: string;
  loop: boolean;
}) {
  if (kind === 'image') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        // Sans description, l'image est décorative : la donner à lire sous son
        // nom de fichier serait pire que de la taire.
        alt={alt ?? ''}
        {...(alt ? {} : { 'aria-hidden': true })}
        className="mx-auto h-auto w-full rounded-xl"
      />
    );
  }

  if (kind === 'video') {
    return (
      <video
        src={url}
        // Muette et sans commande quand elle boucle : c'est un GIF déguisé, et
        // une lecture automatique avec du son est une agression.
        autoPlay
        muted
        playsInline
        loop={loop}
        controls={!loop}
        className="mx-auto h-auto w-full rounded-xl"
      />
    );
  }

  const parsed = parseVideoEmbed(url);
  if (!parsed) return null;

  return (
    <div className="relative mx-auto w-full overflow-hidden rounded-xl" style={{ aspectRatio: '16 / 9' }}>
      <iframe
        src={parsed.embedUrl}
        title={alt ?? 'Vidéo'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
}

/**
 * La salve — vingt-quatre éclats, une fois, puis plus rien.
 *
 * Pas de bibliothèque : vingt-quatre éléments animés par la couche de mouvement
 * déjà présente font le travail, et une dépendance de plus pour une seconde
 * d'animation ne se justifie pas. Les positions sont figées à la première
 * évaluation du module, si bien qu'un re-rendu ne rejoue pas la salve.
 */
const SPARKS = Array.from({ length: 24 }).map((_, index) => {
  const angle = (index / 24) * Math.PI * 2;
  const spread = 90 + ((index * 37) % 70);
  return {
    x: Math.cos(angle) * spread,
    y: Math.sin(angle) * spread - 40, // vers le haut : la gravité vient après
    rotate: (index * 53) % 360,
    delay: ((index * 17) % 10) / 60,
    size: index % 3 === 0 ? 10 : 6
  };
});

function Confetti({ accent }: { accent: string }) {
  // Les couleurs de la marque, plus celle du formulaire : la salve appartient
  // au formulaire qu'on vient d'envoyer, pas à un thème générique de fête.
  const colours = [accent, '#2ac2de', '#f5b301', '#f6923e'];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {SPARKS.map((spark, index) => (
        <motion.span
          key={index}
          className="absolute rounded-[2px]"
          style={{
            width: spark.size,
            height: spark.size * 0.6,
            backgroundColor: colours[index % colours.length]
          }}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.6, rotate: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            x: spark.x,
            // La retombée : l'éclat monte, puis redescend un peu.
            y: [0, spark.y, spark.y + 60],
            scale: [0.6, 1, 0.9],
            rotate: spark.rotate
          }}
          transition={{
            duration: 1.1,
            delay: spark.delay,
            ease: 'easeOut',
            times: [0, 0.25, 0.7, 1]
          }}
        />
      ))}
    </div>
  );
}
