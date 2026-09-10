import { describe, expect, it } from 'vitest';

import {
  RESPONDENT_LANGUAGES,
  respondentStrings,
  submitAlignClass,
  submitLabel
} from '@/lib/respondent-ui';

/**
 * Ce que ces tests protègent.
 *
 * Le réglage « Langue » d'un formulaire promettait de régler « les libellés que
 * Papyrus ajoute lui-même : boutons, messages d'erreur, dates ». Il ne réglait
 * rien : ces libellés étaient écrits en français dans les composants. Un
 * formulaire rédigé en anglais s'envoyait avec un bouton « Envoyer », un
 * compteur « 0/2500 caractères » et une mention « (obligatoire) ».
 */

describe('langue de l’interface', () => {
  it('rend l’anglais pour un formulaire en anglais', () => {
    const en = respondentStrings('en');

    expect(en.submit).toBe('Submit');
    expect(en.previous).toBe('Back');
    expect(en.next).toBe('Next');
    expect(en.required).toBe('(required)');
  });

  it('accepte une étiquette régionale', () => {
    // `en-GB` vient d'un import ou d'un modèle. Refuser l'étiquette afficherait
    // du français à quelqu'un qui a bel et bien choisi l'anglais.
    expect(respondentStrings('en-GB').submit).toBe('Submit');
    expect(respondentStrings('es_MX').submit).toBe('Enviar');
    expect(respondentStrings('FR').submit).toBe('Envoyer');
  });

  it('retombe sur le français plutôt que sur du vide', () => {
    expect(respondentStrings(undefined).submit).toBe('Envoyer');
    expect(respondentStrings(null).submit).toBe('Envoyer');
    expect(respondentStrings('').submit).toBe('Envoyer');
    // Une langue qu'on ne traduit pas encore : mieux vaut du français lisible
    // que des clés manquantes à l'écran.
    expect(respondentStrings('de').submit).toBe('Envoyer');
  });

  it('traduit tout ce que Papyrus ajoute, dans chaque langue', () => {
    // Le test qui empêche une traduction à moitié faite : toute clé ajoutée à
    // l'interface doit exister partout, sinon `undefined` s'affiche.
    const reference = Object.keys(respondentStrings('fr')).sort();

    for (const language of RESPONDENT_LANGUAGES) {
      expect(Object.keys(respondentStrings(language)).sort(), language).toEqual(reference);
    }
  });

  it('compose les phrases à trous dans la bonne langue', () => {
    expect(respondentStrings('fr').pageOf(2, 5)).toBe('Page 2 sur 5');
    expect(respondentStrings('en').pageOf(2, 5)).toBe('Page 2 of 5');
    expect(respondentStrings('en').characterCount(0, 2500)).toBe('0/2500 characters');
    expect(respondentStrings('es').maxCharacters(140)).toBe('Máximo 140 caracteres');
  });
});

describe('libellé du bouton d’envoi', () => {
  it('préfère le texte écrit par l’auteur', () => {
    expect(submitLabel('Book my seat', respondentStrings('en'))).toBe('Book my seat');
  });

  it('ne traduit pas un libellé personnalisé', () => {
    // Il a été écrit à la main : le traduire produirait autre chose que ce qui
    // a été demandé.
    expect(submitLabel('Réserver ma place', respondentStrings('en'))).toBe('Réserver ma place');
  });

  it('retombe sur le mot de la langue quand rien n’est écrit', () => {
    expect(submitLabel('', respondentStrings('en'))).toBe('Submit');
    expect(submitLabel('   ', respondentStrings('en'))).toBe('Submit');
    expect(submitLabel(undefined, respondentStrings('fr'))).toBe('Envoyer');
  });
});

describe('position du bouton d’envoi', () => {
  it('reste à droite par défaut', () => {
    // L'historique : ne pas déplacer le bouton des formulaires existants.
    expect(submitAlignClass(undefined)).toBe('justify-end');
    expect(submitAlignClass('right')).toBe('justify-end');
  });

  it('centre et aligne à gauche sur demande', () => {
    expect(submitAlignClass('center')).toBe('justify-center');
    expect(submitAlignClass('left')).toBe('justify-start');
  });
});
