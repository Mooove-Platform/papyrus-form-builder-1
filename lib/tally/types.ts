/**
 * Formes de données renvoyées par Tally.
 *
 * **Relevées sur l'API, pas déduites.** La version précédente décrivait un
 * format plausible — une question portant son propre libellé, des options
 * imbriquées, une réponse dans `value` — et le convertisseur écrit d'après elle
 * produisait huit champs nommés « Question importée » et zéro réponse. Ce
 * fichier décrit ce que `GET /forms/{id}` et `GET /forms/{id}/submissions`
 * renvoient réellement.
 *
 * Tout reste facultatif là où l'observation montre des variations : Tally
 * n'offre aucun schéma public stable.
 */

export interface TallyFormSummary {
  id: string;
  name: string;
  status?: string;
  numberOfSubmissions?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Le texte riche de Tally : des tableaux imbriqués où un nœud vaut
 * `[texte, attributs?]` et un attribut vaut `[clé, valeur]`.
 * `readRichText` sait les distinguer ; rien d'autre n'a besoin de le savoir.
 */
export type TallyRichText = unknown;

export interface TallyBlockPayload {
  /** Le texte d'un titre, d'un paragraphe, d'un en-tête. */
  safeHTMLSchema?: TallyRichText;
  /** Présent sur `FORM_TITLE` : la même chose, déjà aplatie. */
  title?: string;
  /** Le libellé d'une option de choix. */
  text?: string;

  isRequired?: boolean;
  isHidden?: boolean;
  placeholder?: string;

  /** Rang d'une option dans son groupe. */
  index?: number;
  /** Sur une option : la question accepte plusieurs réponses. */
  allowMultiple?: boolean;
  randomize?: boolean;
  hasOtherOption?: boolean;
  isOtherOption?: boolean;
  hasMinChoices?: boolean;
  minChoices?: number;
  hasMaxChoices?: boolean;
  maxChoices?: number;

  /** Bornes d'une échelle linéaire. */
  start?: number;
  end?: number;
  step?: number;
  /** Nombre d'étoiles d'une notation. */
  maxRating?: number;

  hasMinCharacters?: boolean;
  minCharacters?: number;
  hasMaxCharacters?: boolean;
  maxCharacters?: number;
  hasMinNumber?: boolean;
  minNumber?: number;
  hasMaxNumber?: boolean;
  maxNumber?: number;

  defaultCountryCode?: string;

  /** Les images d'un bloc `IMAGE`. */
  images?: { url?: string; alt?: string; width?: number; height?: number }[];
  /** L'adresse d'un bloc `EMBED`. */
  inputUrl?: string;
  provider?: string;

  /** Sur un `PAGE_BREAK` : la page de remerciement de Tally. */
  isThankYouPage?: boolean;

  rows?: { id?: string; text?: string }[];
  columns?: { id?: string; text?: string }[];
}

export interface TallyBlock {
  uuid: string;
  type: string;
  /**
   * L'identifiant du GROUPE, et c'est lui qui compte.
   *
   * Les options d'une même question le partagent, et c'est par lui que les
   * réponses retrouvent leur question (`questions[].fields[].blockGroupUuid`).
   */
  groupUuid?: string;
  /**
   * La famille du bloc — plus fiable que `type` pour décider.
   *
   * `TITLE` en est l'exemple : `groupType: 'QUESTION'` en fait le libellé de la
   * question suivante, `groupType: 'TITLE'` en fait un intertitre.
   */
  groupType?: string;
  payload?: TallyBlockPayload;
}

export interface TallyFormDetail {
  id: string;
  name: string;
  status?: string;
  blocks?: TallyBlock[];
}

/** Le bloc d'origine d'une question, tel que le donnent les réponses. */
export interface TallyQuestionField {
  uuid?: string;
  blockGroupUuid?: string;
  questionType?: string;
  title?: string;
}

export interface TallyQuestion {
  /** Un identifiant court (`RLvRQd`), PAS un uuid de bloc. */
  id: string;
  type: string;
  title?: string;
  fields?: TallyQuestionField[];
}

export interface TallyResponse {
  questionId: string;
  /** Le nom réel du champ côté Tally. */
  answer?: unknown;
  /** Toléré par prudence : d'anciennes réponses d'API le nommaient ainsi. */
  value?: unknown;
}

export interface TallySubmission {
  id: string;
  submittedAt?: string;
  isCompleted?: boolean;
  responses?: TallyResponse[];
}

export interface TallySubmissionsPage {
  page?: number;
  limit?: number;
  hasMore?: boolean;
  totalNumberOfSubmissionsPerFilter?: Record<string, number>;
  questions?: TallyQuestion[];
  submissions?: TallySubmission[];
}

/** Résultat d'un import, tel qu'affiché à l'utilisateur. */
export interface TallyImportResult {
  formId: string;
  formTitle: string;
  fieldsImported: number;
  responsesImported: number;
  /** Points sur lesquels l'import a dû faire un compromis. */
  warnings: string[];
}
