'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Durée totale du déroulé en secondes. Défaut : 0.9s. */
  duration?: number;
  /** Délai avant de démarrer. Défaut : 0. */
  delay?: number;
}

/**
 * Dévoile son contenu comme un parchemin qui se déroule du haut vers le bas.
 *
 * On évite tout wrapper avec `overflow-hidden` ou `h-full` : ça rognerait les marges
 * négatives de la page enfant. Le `clipPath` fait son boulot tout seul, et une fois
 * l'animation finie (`inset(0 0 0% 0)`), il n'y a plus aucune contrainte visuelle.
 */
export function UnrollParchment({ children, duration = 0.9, delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ clipPath: 'inset(0 0 100% 0)', scaleY: 0.98 }}
      animate={{ clipPath: 'inset(0 0 0% 0)', scaleY: 1 }}
      transition={{
        clipPath: { duration, ease: [0.22, 1, 0.36, 1], delay },
        scaleY: { duration, ease: [0.22, 1, 0.36, 1], delay }
      }}
      style={{ transformOrigin: 'top center' }}
      className="flex h-full w-full flex-1 flex-col overflow-hidden"
    >
      {children}
    </motion.div>
  );
}
