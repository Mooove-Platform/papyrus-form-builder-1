'use client';

import { createContext, useContext, useMemo } from 'react';

import { respondentStrings, type RespondentStrings } from '@/lib/respondent-ui';

/**
 * La langue du formulaire, portée par le contexte plutôt que par une propriété.
 *
 * `FieldRenderer` fait deux mille sept cents lignes et une douzaine de
 * sous-composants ; trois d'entre eux affichent un compteur de caractères en
 * français. Faire descendre une propriété jusque-là aurait voulu dire toucher
 * chaque signature intermédiaire — beaucoup de bruit pour trois chaînes, et
 * une occasion d'en oublier une.
 *
 * Le repli est le français : le constructeur, lui, n'enveloppe rien et reste
 * donc dans la langue de l'application, ce qui est le bon comportement — ce
 * sont ses écrans à lui, pas ceux du répondant.
 */
const RespondentStringsContext = createContext<RespondentStrings>(respondentStrings('fr'));

export function RespondentStringsProvider({
  language,
  children
}: {
  language: string | null | undefined;
  children: React.ReactNode;
}) {
  const value = useMemo(() => respondentStrings(language), [language]);

  return (
    <RespondentStringsContext.Provider value={value}>{children}</RespondentStringsContext.Provider>
  );
}

export function useRespondentStrings(): RespondentStrings {
  return useContext(RespondentStringsContext);
}
