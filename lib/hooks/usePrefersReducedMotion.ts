'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/**
 * La préférence système « moins de mouvement », lue sans faire mentir le
 * serveur.
 *
 * **Le défaut qu'elle corrige.** Le serveur ne peut rien savoir de la
 * préférence de qui va lire la page : `useReducedMotion` y répond « je ne sais
 * pas », ce que tout le monde lit comme « anime », puis répond la vérité dès la
 * première image côté navigateur. Un formulaire portant une note haute était
 * donc envoyé avec sa lueur, que le navigateur retirait aussitôt — et React
 * signalait un balisage divergent, ce qui, en pire, lui fait refaire tout
 * l'arbre à la main.
 *
 * `useSyncExternalStore` a exactement une réponse pour ce cas : son troisième
 * argument sert AU SERVEUR ET À L'HYDRATATION. On y répond « calme ». Les deux
 * côtés disent donc la même chose au premier rendu, la vérité arrive au
 * suivant, et un changement de préférence en cours de route est répercuté sans
 * rien recharger.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true
  );
}
