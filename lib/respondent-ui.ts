/**
 * Les mots que Papyrus ajoute lui-même sur un formulaire publié.
 *
 * Le réglage « Langue » du formulaire promettait depuis toujours de régler
 * « les libellés que Papyrus ajoute lui-même : boutons, messages d'erreur,
 * dates ». Il ne réglait rien : ces libellés étaient écrits en français dans
 * les composants. Un formulaire rédigé en anglais s'envoyait donc avec un
 * bouton « Envoyer », un compteur « 0/2500 caractères » et une mention
 * « (obligatoire) » sous chaque question.
 *
 * Ce module est la seule source de ces mots. Il ne contient QUE ce que Papyrus
 * ajoute : ni les questions, ni les descriptions, ni les options — celles-là
 * appartiennent à l'auteur et sont déjà multilingues champ par champ.
 *
 * Le français reste le repli : un formulaire dont la langue n'est pas traduite
 * ici s'affiche en français plutôt qu'avec des clés vides.
 */

export const RESPONDENT_LANGUAGES = ['fr', 'en', 'es'] as const;
export type RespondentLanguage = (typeof RESPONDENT_LANGUAGES)[number];

export interface RespondentStrings {
  previous: string;
  next: string;
  submit: string;
  submitting: string;
  /** « Page 2 sur 5 » */
  pageOf: (current: number, total: number) => string;
  required: string;
  requiredField: string;
  requiredFields: string;
  /** « 120/2500 caractères » */
  characterCount: (current: number, max: number) => string;
  /** « Maximum 2500 caractères » */
  maxCharacters: (max: number) => string;
  thankYouTitle: string;
  thankYouBody: string;
  noQuestions: string;
}

const FR: RespondentStrings = {
  previous: 'Précédent',
  next: 'Suivant',
  submit: 'Envoyer',
  submitting: 'Envoi…',
  pageOf: (current, total) => `Page ${current} sur ${total}`,
  required: '(obligatoire)',
  requiredField: 'Ce champ est obligatoire',
  requiredFields: 'Veuillez remplir tous les champs obligatoires',
  characterCount: (current, max) => `${current}/${max} caractères`,
  maxCharacters: (max) => `Maximum ${max} caractères`,
  thankYouTitle: 'Merci !',
  thankYouBody: 'Merci pour votre réponse ! Nous avons bien reçu vos informations.',
  noQuestions: 'Aucune question disponible'
};

const EN: RespondentStrings = {
  previous: 'Back',
  next: 'Next',
  submit: 'Submit',
  submitting: 'Sending…',
  pageOf: (current, total) => `Page ${current} of ${total}`,
  required: '(required)',
  requiredField: 'This field is required',
  requiredFields: 'Please fill in all required fields',
  characterCount: (current, max) => `${current}/${max} characters`,
  maxCharacters: (max) => `Maximum ${max} characters`,
  thankYouTitle: 'Thank you!',
  thankYouBody: 'Thanks for your response — we have received it.',
  noQuestions: 'No questions to show'
};

const ES: RespondentStrings = {
  previous: 'Atrás',
  next: 'Siguiente',
  submit: 'Enviar',
  submitting: 'Enviando…',
  pageOf: (current, total) => `Página ${current} de ${total}`,
  required: '(obligatorio)',
  requiredField: 'Este campo es obligatorio',
  requiredFields: 'Complete todos los campos obligatorios',
  characterCount: (current, max) => `${current}/${max} caracteres`,
  maxCharacters: (max) => `Máximo ${max} caracteres`,
  thankYouTitle: '¡Gracias!',
  thankYouBody: 'Gracias por su respuesta. La hemos recibido correctamente.',
  noQuestions: 'No hay preguntas disponibles'
};

const BY_LANGUAGE: Record<RespondentLanguage, RespondentStrings> = { fr: FR, en: EN, es: ES };

/**
 * Les mots de l'interface, dans la langue du formulaire.
 *
 * On accepte `fr-FR` comme `fr` : la langue d'un formulaire peut venir d'un
 * import ou d'un modèle, et refuser une étiquette régionale afficherait du
 * français à quelqu'un qui a bel et bien choisi l'anglais.
 */
export function respondentStrings(language: string | null | undefined): RespondentStrings {
  const base = (language ?? '').trim().toLowerCase().split(/[-_]/)[0];
  return BY_LANGUAGE[base as RespondentLanguage] ?? FR;
}

/**
 * Le libellé du bouton d'envoi : celui de l'auteur, sinon celui de la langue.
 *
 * Un libellé personnalisé n'est pas traduit — c'est une phrase écrite à la
 * main (« Réserver ma place », « Get my quote »), et la traduire
 * automatiquement produirait autre chose que ce qui a été écrit.
 */
export function submitLabel(
  custom: string | null | undefined,
  strings: RespondentStrings
): string {
  const trimmed = (custom ?? '').trim();
  return trimmed || strings.submit;
}

export type SubmitAlign = 'left' | 'center' | 'right';

/** La classe d'alignement du bouton d'envoi. `right` reste l'historique. */
export function submitAlignClass(align: SubmitAlign | null | undefined): string {
  if (align === 'left') return 'justify-start';
  if (align === 'center') return 'justify-center';
  return 'justify-end';
}
