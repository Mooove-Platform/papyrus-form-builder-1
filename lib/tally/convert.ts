import type {
  Field,
  FieldOption,
  FieldType,
  FieldValidation,
  MultilingualText,
  Section
} from '@/types';
import type {
  TallyBlock,
  TallyFormDetail,
  TallyQuestion,
  TallyRichText,
  TallySubmissionsPage
} from './types';

/**
 * Traduction du modèle Tally vers le modèle Papyrus.
 *
 * **Trois choses à savoir sur le format Tally, et la première explique tout le
 * reste :**
 *
 * 1. *Le libellé d'une question n'est pas dans la question.* C'est un bloc
 *    `TITLE` distinct, `groupType: 'QUESTION'`, posé juste avant le bloc de
 *    saisie — lequel ne porte que `isRequired` et `placeholder`. Une lecture
 *    qui cherche le libellé dans le bloc de saisie ne trouve rien, et c'est
 *    ainsi qu'un import entier a rendu huit champs nommés « Question importée ».
 * 2. *Les options sont des blocs frères.* Chaque choix est un bloc à lui seul ;
 *    ce qui les réunit est `groupUuid`, et c'est aussi par lui que les réponses
 *    retrouvent leur question.
 * 3. *Le texte est un arbre.* Titres et paragraphes vivent dans
 *    `safeHTMLSchema`, des tableaux imbriqués mêlant texte et attributs.
 *
 * Ce qui n'a pas d'équivalent (paiements, calculs Tally, logique
 * conditionnelle) est signalé dans `warnings` plutôt que silencieusement perdu.
 */

// ============================================================================
// Vocabulaire Tally
// ============================================================================

/** Familles de blocs qui produisent un champ de saisie. */
const INPUT_TYPES: Record<string, FieldType> = {
  INPUT_TEXT: 'short_text',
  INPUT_NUMBER: 'number',
  INPUT_EMAIL: 'email',
  INPUT_PHONE_NUMBER: 'phone',
  INPUT_LINK: 'url',
  INPUT_DATE: 'date',
  INPUT_TIME: 'short_text',
  TEXTAREA: 'long_text',
  LINEAR_SCALE: 'nps',
  RATING: 'rating',
  MATRIX: 'matrix',
  FILE_UPLOAD: 'file',
  SIGNATURE: 'signature',
  HIDDEN_FIELDS: 'hidden'
};

/**
 * Familles dont chaque option est un bloc à part, réunies par `groupUuid`.
 * La valeur dit le type Papyrus quand la question n'accepte qu'une réponse.
 */
const CHOICE_TYPES: Record<string, FieldType> = {
  MULTIPLE_CHOICE: 'single_choice',
  CHECKBOXES: 'multiple_choice',
  DROPDOWN: 'dropdown',
  MULTI_SELECT: 'multiple_choice',
  RANKING: 'multiple_choice'
};

/** Blocs de mise en page : du contenu, pas des questions. */
const HEADING_TYPES = new Set(['TITLE', 'HEADING_1', 'HEADING_2', 'HEADING_3']);

/** Blocs sans équivalent dans Papyrus. */
const UNSUPPORTED_TYPES = new Set(['PAYMENT', 'CAPTCHA', 'WALLET_CONNECT']);

/**
 * Blocs qu'on traverse sans rien produire ni rien signaler comme perdu.
 *
 * `CALCULATED_FIELDS` y figure et ce n'est pas un oubli : la FORMULE ne se
 * rejoue pas — Papyrus n'a pas le même moteur — mais ses RÉSULTATS, eux, sont
 * bel et bien importés, par le même chemin que les questions disparues. Le
 * déclarer « sans équivalent » faisait passer pour une perte ce qui arrivait
 * intact dans la colonne d'à côté.
 */
const SILENT_TYPES = new Set([
  'FORM_TITLE',
  'CONDITIONAL_LOGIC',
  'CALCULATED_FIELDS',
  'RESPONDENT_COUNTRY'
]);

// ============================================================================
// Texte
// ============================================================================

function ml(value: string | undefined): MultilingualText {
  return { fr: (value ?? '').trim() };
}

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'"
};

function decodeEntities(value: string): string {
  return value.replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (match) => ENTITIES[match] ?? match);
}

/**
 * Lit le texte riche de Tally.
 *
 * Un nœud vaut `[texte, attributs?]`, un attribut vaut `[clé, valeur]` — deux
 * chaînes. Sans cette distinction, un titre revenait accompagné de `tag`, `p`,
 * `span` et `font-weight` collés au bout.
 */
export function readRichText(node: TallyRichText): string {
  if (typeof node === 'string') return node;
  if (!Array.isArray(node)) return '';

  if (typeof node[0] === 'string') {
    // `['tag', 'span']` est un attribut ; `['Bonjour']` et `['Bonjour', [...]]`
    // sont du texte.
    if (node.length >= 2 && typeof node[1] === 'string') return '';
    return node[0];
  }

  return node.map((child) => readRichText(child)).join('');
}

/** Le texte d'un bloc, quel que soit l'endroit où Tally l'a rangé. */
function blockText(block: TallyBlock): string {
  const payload = block.payload ?? {};
  const raw =
    payload.text ??
    (payload.safeHTMLSchema !== undefined ? readRichText(payload.safeHTMLSchema) : undefined) ??
    payload.title ??
    '';

  // Les retours à la ligne survivent : un bloc de texte Tally en contient
  // souvent, et tout aplatir collait le sous-titre à la date.
  return decodeEntities(String(raw))
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function kindOf(block: TallyBlock): string {
  return block.groupType ?? block.type;
}

// ============================================================================
// Structure
// ============================================================================

export interface ConvertedForm {
  title: string;
  /**
   * Le mode d'affichage fidèle à l'original : Tally ne pagine que sur un saut
   * de page explicite. Sans saut, tout tient sur une page.
   */
  displayMode: 'scroll' | 'sections';
  sections: Section[];
  fields: Field[];
  warnings: string[];
  /** Correspondance `groupUuid` / `uuid` Tally → identifiant Papyrus. */
  fieldIdByTallyId: Map<string, string>;
  /**
   * Correspondance question de réponse → champ Papyrus.
   *
   * Vide au sortir de la conversion : les questions ne sont connues qu'une fois
   * les réponses téléchargées. C'est {@link absorbOrphanQuestions} qui la
   * remplit.
   */
  fieldIdByQuestion: Map<string, string>;
  /** Le contenu de la page de remerciement Tally, s'il y en avait une. */
  thankYou: { title: string; message: string } | null;
}

export function convertForm(detail: TallyFormDetail, formId: string): ConvertedForm {
  const warnings: string[] = [];
  const fieldIdByTallyId = new Map<string, string>();
  const fields: Field[] = [];
  const unsupportedSeen = new Set<string>();

  const blocks = detail.blocks ?? [];

  const sections: Section[] = [newSection(formId, '', 0)];
  let current = sections[0];
  let order = 0;

  /** Le dernier `TITLE` de groupe `QUESTION` : il nomme la question suivante. */
  let pendingLabel = '';
  /** Après la page de remerciement de Tally, le reste n'est plus le formulaire. */
  let thankYou: { title: string; message: string } | null = null;
  let inThankYou = false;

  const push = (field: Field, tallyIds: string[]) => {
    fields.push(field);
    for (const id of tallyIds) if (id) fieldIdByTallyId.set(id, field.id);
  };

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const kind = kindOf(block);
    const payload = block.payload ?? {};
    const text = blockText(block);

    // ── Après un saut « page de remerciement », on récolte, on ne construit plus.
    if (inThankYou) {
      if (text) {
        if (!thankYou) thankYou = { title: text, message: '' };
        else thankYou.message = [thankYou.message, text].filter(Boolean).join('\n');
      }
      continue;
    }

    if (SILENT_TYPES.has(kind) || SILENT_TYPES.has(block.type)) continue;

    if (UNSUPPORTED_TYPES.has(kind) || UNSUPPORTED_TYPES.has(block.type)) {
      unsupportedSeen.add(block.type);
      continue;
    }

    // ── Le libellé de la question qui suit.
    if (block.type === 'TITLE' && kind === 'QUESTION') {
      pendingLabel = text;
      continue;
    }

    // ── Un saut de page ouvre une section. Celui de la page de remerciement
    //    ferme le formulaire.
    if (kind === 'PAGE_BREAK' || block.type === 'PAGE_BREAK') {
      if (payload.isThankYouPage) {
        inThankYou = true;
        continue;
      }
      current = newSection(formId, '', sections.length);
      sections.push(current);
      order = 0;
      continue;
    }

    // ── Intertitres et paragraphes : du contenu, pas des questions.
    if (HEADING_TYPES.has(kind) || HEADING_TYPES.has(block.type) || kind === 'TEXT') {
      if (!text) continue;
      push(
        makeField({
          formId,
          sectionId: current.id,
          type: 'statement',
          label: text,
          order: order++
        }),
        [block.uuid, block.groupUuid ?? '']
      );
      continue;
    }

    if (kind === 'DIVIDER' || block.type === 'DIVIDER') {
      push(
        makeField({ formId, sectionId: current.id, type: 'divider', label: '', order: order++ }),
        [block.uuid]
      );
      continue;
    }

    if (kind === 'IMAGE' || block.type === 'IMAGE') {
      const image = payload.images?.[0];
      if (!image?.url) continue;
      push(
        makeField({
          formId,
          sectionId: current.id,
          type: 'image',
          label: image.alt ?? '',
          order: order++,
          validation: { media_url: image.url, creator_mode_enabled: true }
        }),
        [block.uuid]
      );
      continue;
    }

    if (kind === 'EMBED' || block.type === 'EMBED') {
      if (!payload.inputUrl) continue;
      push(
        makeField({
          formId,
          sectionId: current.id,
          type: 'video',
          label: text,
          order: order++,
          validation: { media_url: payload.inputUrl, creator_mode_enabled: true }
        }),
        [block.uuid]
      );
      continue;
    }

    // ── Un groupe d'options : tous les blocs frères qui partagent `groupUuid`.
    const choiceBase = CHOICE_TYPES[kind];
    if (choiceBase) {
      const group: TallyBlock[] = [];
      const groupUuid = block.groupUuid;
      let cursor = index;
      while (
        cursor < blocks.length &&
        kindOf(blocks[cursor]) === kind &&
        (blocks[cursor].groupUuid ?? blocks[cursor].uuid) === (groupUuid ?? block.uuid)
      ) {
        group.push(blocks[cursor]);
        cursor += 1;
      }
      index = cursor - 1;

      const first = group[0].payload ?? {};
      const multiple = first.allowMultiple === true;
      const type: FieldType =
        kind === 'DROPDOWN' ? 'dropdown' : multiple ? 'multiple_choice' : choiceBase;

      const options: FieldOption[] = group
        .filter((option) => option.payload?.isOtherOption !== true)
        .sort((a, b) => (a.payload?.index ?? 0) - (b.payload?.index ?? 0))
        .map((option) => ({ id: option.uuid, label: ml(blockText(option)) }))
        .filter((option) => option.label.fr.length > 0);

      const validation: FieldValidation = {};
      if (group.some((option) => option.payload?.isOtherOption)) validation.has_other = true;
      if (first.randomize) validation.randomize_options = true;
      if (first.hasMinChoices && typeof first.minChoices === 'number') {
        validation.selection_min = first.minChoices;
      }
      if (first.hasMaxChoices && typeof first.maxChoices === 'number') {
        validation.selection_max = first.maxChoices;
      }

      const field = makeField({
        formId,
        sectionId: current.id,
        type,
        label: pendingLabel,
        order: order++,
        required: first.isRequired === true,
        validation
      });
      field.options = options;
      pendingLabel = '';

      if (kind === 'RANKING') {
        warnings.push(
          `« ${field.label.fr} » était un classement Tally : importé en choix multiple, l'ordre des réponses est perdu.`
        );
      }

      push(field, [
        groupUuid ?? block.uuid,
        ...group.map((option) => option.uuid)
      ]);
      continue;
    }

    // ── Une saisie simple.
    const inputType = INPUT_TYPES[kind] ?? INPUT_TYPES[block.type];
    if (inputType) {
      const field = makeField({
        formId,
        sectionId: current.id,
        type: inputType,
        label: pendingLabel,
        order: order++,
        required: payload.isRequired === true,
        placeholder: payload.placeholder,
        validation: validationFor(kind, payload)
      });
      pendingLabel = '';

      if (kind === 'MATRIX') {
        field.options = (payload.columns ?? []).map((column, position) => ({
          id: column.id ?? `col-${position}`,
          label: ml(column.text)
        }));
        field.rows = (payload.rows ?? []).map((row, position) => ({
          id: row.id ?? `row-${position}`,
          label: ml(row.text)
        }));
      }

      push(field, [block.groupUuid ?? '', block.uuid]);
      continue;
    }

    unsupportedSeen.add(block.type);
  }

  if (unsupportedSeen.size > 0) {
    warnings.push(
      `Blocs Tally sans équivalent, ignorés : ${Array.from(unsupportedSeen).join(', ')}.`
    );
  }

  const hadLogic = blocks.some((block) => kindOf(block) === 'CONDITIONAL_LOGIC');
  if (hadLogic) {
    warnings.push(
      "La logique conditionnelle Tally n'est pas transférable automatiquement : reconstruisez-la dans l'onglet Logique."
    );
  }

  // Une section restée vide n'apporte rien : en mode « une section = une page »,
  // elle afficherait au répondant une page sans titre ni question. On en garde
  // une quand il ne reste rien : `fields.section_id` n'admet pas de vide.
  const withFields = sections.filter((section) =>
    fields.some((field) => field.section_id === section.id)
  );
  const usedSections = (withFields.length > 0 ? withFields : sections.slice(0, 1)).map(
    (section, position) => ({ ...section, section_order: position })
  );

  const keptIds = new Set(usedSections.map((section) => section.id));
  for (const field of fields) {
    if (!keptIds.has(field.section_id)) field.section_id = usedSections[0].id;
  }

  return {
    title: detail.name || 'Formulaire importé de Tally',
    // Tally ne pagine que sur un saut de page explicite : deux sections ou plus
    // veulent dire que l'auteur avait bel et bien découpé son formulaire.
    displayMode: usedSections.length > 1 ? 'sections' : 'scroll',
    sections: usedSections,
    fields,
    warnings,
    fieldIdByTallyId,
    fieldIdByQuestion: new Map<string, string>(),
    thankYou
  };
}

// ============================================================================
// Questions orphelines
// ============================================================================

/** Le type Papyrus d'une question, d'après ce que les réponses en disent. */
const QUESTION_TYPES: Record<string, FieldType> = {
  ...INPUT_TYPES,
  ...CHOICE_TYPES,
  CALCULATED_FIELDS: 'number',
  HIDDEN_FIELDS: 'hidden'
};

/**
 * Déballe un calcul Tally.
 *
 * Un champ calculé ne rend pas sa valeur : il rend `{ "Score": 5 }`,
 * `{ "niveau": "Niveau 1" }` — un objet d'une seule clé, qui est le nom du
 * calcul. Sans ce déballage, la valeur passait pour un objet, la conversion en
 * nombre rendait `null`, et trente mille scores partaient à la poubelle en
 * silence.
 */
function unwrapCalculated(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length !== 1) return value;

  const [, only] = entries[0];
  return only === null || typeof only !== 'object' ? only : value;
}

function isEmptyAnswer(value: unknown): boolean {
  const unwrapped = unwrapCalculated(value);
  return (
    unwrapped === null ||
    unwrapped === undefined ||
    unwrapped === '' ||
    (Array.isArray(unwrapped) && unwrapped.length === 0)
  );
}

/** Le champ d'une question, par son groupe de blocs puis par son libellé. */
function resolveQuestion(converted: ConvertedForm, question: TallyQuestion): string | null {
  for (const origin of question.fields ?? []) {
    const match =
      (origin.blockGroupUuid && converted.fieldIdByTallyId.get(origin.blockGroupUuid)) ||
      (origin.uuid && converted.fieldIdByTallyId.get(origin.uuid));
    if (match) return match;
  }

  if (question.title) {
    const wanted = question.title.trim().toLowerCase();
    const found = converted.fields.find(
      (field) => field.label.fr.trim().toLowerCase() === wanted
    );
    if (found) return found.id;
  }

  return null;
}

/**
 * Recrée les questions qui ont des réponses mais plus de bloc.
 *
 * **Un formulaire Tally vivant perd des questions en route.** On le traduit, on
 * le reformule, on en retire une — et Tally garde les réponses d'avant, sous
 * une question dont le bloc a disparu. Sur les formulaires de l'espace, c'est
 * près de la moitié des réponses : un questionnaire candidat passé de l'anglais
 * au français en gardait deux mille sous ses anciennes questions, et un examen
 * gardait trente mille valeurs calculées.
 *
 * Un import qui ne prend que les blocs actuels affiche donc « 515 réponses »
 * dont la plupart sont vides. On leur redonne un champ, rassemblé dans une
 * section à part pour que l'auteur voie d'un coup d'œil ce qui relève de
 * l'histoire du formulaire et non de sa version d'aujourd'hui.
 */
export function absorbOrphanQuestions(
  converted: ConvertedForm,
  pages: TallySubmissionsPage[],
  formId: string
): void {
  const answered = new Map<string, unknown[]>();
  const questions = new Map<string, TallyQuestion>();

  for (const page of pages) {
    for (const question of page.questions ?? []) questions.set(question.id, question);
    for (const submission of page.submissions ?? []) {
      for (const response of submission.responses ?? []) {
        const value = response.answer !== undefined ? response.answer : response.value;
        if (isEmptyAnswer(value)) continue;
        const bucket = answered.get(response.questionId);
        if (bucket) bucket.push(value);
        else answered.set(response.questionId, [value]);
      }
    }
  }

  let section: Section | null = null;
  let order = 0;
  const calculated = new Set<string>();

  for (const [questionId, question] of questions) {
    const known = resolveQuestion(converted, question);
    if (known) {
      converted.fieldIdByQuestion.set(questionId, known);
      continue;
    }

    const values = answered.get(questionId);
    if (!values || values.length === 0) continue;

    if (!section) {
      section = newSection(formId, 'Questions retirées du formulaire Tally', converted.sections.length);
      converted.sections.push(section);
    }

    const samples = values.map(unwrapCalculated);

    // Le type se déduit de ce qui a été répondu. Un calcul Tally rend tantôt un
    // nombre (« 5 », « 0.22 »), tantôt du texte (« Niveau 1 ») : le déclarer
    // numérique d'office aurait jeté la moitié des valeurs à la conversion.
    const declared = QUESTION_TYPES[question.type] ?? 'short_text';
    const type: FieldType =
      question.type === 'CALCULATED_FIELDS'
        ? samples.every((sample) => Number.isFinite(Number(sample)))
          ? 'number'
          : 'short_text'
        : declared;

    const field = makeField({
      formId,
      sectionId: section.id,
      type,
      label: question.title?.trim() || fallbackLabel(question),
      order: order++
    });

    // Les options d'une question disparue ne sont plus nulle part : ce que les
    // gens ont répondu est la seule trace qu'il en reste.
    if (CHOICE_FIELDS.has(type)) {
      const labels = new Set<string>();
      for (const value of samples) {
        for (const item of Array.isArray(value) ? value : [value]) {
          const label = String(item).trim();
          if (label) labels.add(label);
        }
      }
      field.options = [...labels].map((label) => ({ id: crypto.randomUUID(), label: ml(label) }));
    }

    if (question.type === 'CALCULATED_FIELDS') calculated.add(field.id);

    converted.fields.push(field);
    converted.fieldIdByQuestion.set(questionId, field.id);
  }

  if (section) {
    const recovered = converted.fields.filter((field) => field.section_id === section!.id);
    converted.warnings.push(
      `${recovered.length} question${recovered.length > 1 ? 's ne figurent' : ' ne figure'} plus dans le formulaire Tally : ` +
        'leurs réponses sont conservées dans la section « Questions retirées du formulaire Tally ».'
    );

    if (recovered.some((field) => calculated.has(field.id))) {
      converted.warnings.push(
        'Les calculs Tally ne sont pas rejoués — Papyrus n’a pas le même moteur — mais leurs résultats sont importés tels quels.'
      );
    }
  }
}

/**
 * Le nom d'une question que Tally laisse sans titre.
 *
 * Un calcul en a pourtant un — « Score », « niveau », « taux_fiscal » — mais il
 * est rangé dans `fields[].title`, pas dans `title`, qui vaut `null`. Sans lui,
 * douze colonnes de résultats s'appelleraient toutes « Calcul Tally ».
 */
function fallbackLabel(question: TallyQuestion): string {
  const named = question.fields?.find((origin) => origin.title?.trim())?.title?.trim();
  if (named) return named;

  if (question.type === 'CALCULATED_FIELDS') return `Calcul Tally (${question.id})`;
  if (question.type === 'HIDDEN_FIELDS') return `Champ masqué Tally (${question.id})`;
  return `Question retirée (${question.id})`;
}

function newSection(formId: string, title: string, order: number): Section {
  return {
    id: crypto.randomUUID(),
    form_id: formId,
    title: ml(title),
    description: ml(''),
    section_order: order
  };
}

function validationFor(
  kind: string,
  payload: NonNullable<TallyBlock['payload']>
): FieldValidation {
  const validation: FieldValidation = {};

  if (kind === 'LINEAR_SCALE') {
    validation.min = typeof payload.start === 'number' ? payload.start : 0;
    validation.max = typeof payload.end === 'number' ? payload.end : 10;
  }

  if (kind === 'RATING') {
    validation.max = typeof payload.maxRating === 'number' ? payload.maxRating : 5;
  }

  if (kind === 'INPUT_NUMBER') {
    if (payload.hasMinNumber && typeof payload.minNumber === 'number') {
      validation.min = payload.minNumber;
    }
    if (payload.hasMaxNumber && typeof payload.maxNumber === 'number') {
      validation.max = payload.maxNumber;
    }
  }

  if (kind === 'INPUT_TEXT' || kind === 'TEXTAREA') {
    if (payload.hasMinCharacters && typeof payload.minCharacters === 'number') {
      validation.min = payload.minCharacters;
    }
    if (payload.hasMaxCharacters && typeof payload.maxCharacters === 'number') {
      validation.max = payload.maxCharacters;
    }
  }

  if (kind === 'INPUT_PHONE_NUMBER' && payload.defaultCountryCode) {
    validation.default_country = payload.defaultCountryCode;
  }

  if (kind === 'MATRIX') {
    validation.matrix_mode = 'single';
  }

  return validation;
}

function makeField(input: {
  formId: string;
  sectionId: string;
  type: FieldType;
  label: string;
  order: number;
  required?: boolean;
  placeholder?: string;
  validation?: FieldValidation;
}): Field {
  return {
    id: crypto.randomUUID(),
    form_id: input.formId,
    section_id: input.sectionId,
    type: input.type,
    // Un champ sans libellé reste modifiable dans le constructeur ; un champ
    // nommé « Question importée », lui, se confond avec ses voisins.
    label: ml(input.label),
    description: ml(''),
    placeholder: ml(input.placeholder ?? ''),
    options: [],
    required: input.required ?? false,
    field_order: input.order,
    validation: input.validation ?? {}
  };
}

// ============================================================================
// Réponses
// ============================================================================

export interface ConvertedSubmission {
  externalId: string;
  submittedAt: string;
  responses: Record<string, unknown>;
}

/**
 * Convertit les réponses Tally vers le format `{ champId: valeur }` de Papyrus.
 *
 * **Deux traductions, et l'import en dépendait entièrement.**
 *
 * `questionId` n'est pas un uuid de bloc mais un identifiant court propre aux
 * réponses (`RLvRQd`) ; le pont est `questions[].fields[].blockGroupUuid`, qui
 * pointe vers le groupe de blocs. Et la valeur s'appelle `answer`, pas `value` :
 * une lecture de `value` renvoyait `undefined` pour chaque réponse, et l'import
 * annonçait fièrement « 0 réponse » sur un formulaire qui en comptait 82.
 */
export function convertSubmissions(
  pages: TallySubmissionsPage[],
  converted: ConvertedForm
): ConvertedSubmission[] {
  const fieldsById = new Map(converted.fields.map((field) => [field.id, field]));
  const fieldIdByQuestion = converted.fieldIdByQuestion;

  // `absorbOrphanQuestions` a normalement déjà tout rattaché. On refait le
  // rapprochement pour les questions qu'il n'aurait pas vues — un import sans
  // cette étape doit continuer de produire des réponses, pas rien du tout.
  for (const page of pages) {
    for (const question of page.questions ?? []) {
      if (fieldIdByQuestion.has(question.id)) continue;
      const match = resolveQuestion(converted, question);
      if (match) fieldIdByQuestion.set(question.id, match);
    }
  }

  const results: ConvertedSubmission[] = [];

  for (const page of pages) {
    for (const submission of page.submissions ?? []) {
      const responses: Record<string, unknown> = {};

      for (const answer of submission.responses ?? []) {
        const fieldId = fieldIdByQuestion.get(answer.questionId);
        if (!fieldId) continue;

        const field = fieldsById.get(fieldId);
        if (!field) continue;

        const raw = answer.answer !== undefined ? answer.answer : answer.value;
        const value = normalizeAnswer(raw, field);
        if (value !== null && value !== undefined && value !== '') {
          responses[fieldId] = value;
        }
      }

      if (Object.keys(responses).length === 0) continue;

      results.push({
        externalId: submission.id,
        submittedAt: submission.submittedAt ?? new Date().toISOString(),
        responses
      });
    }
  }

  return results;
}

const CHOICE_FIELDS = new Set(['single_choice', 'multiple_choice', 'dropdown']);

/**
 * Ramène une valeur Tally au format attendu par le champ Papyrus.
 *
 * Tally rend un choix sous son LIBELLÉ, pas sous un identifiant : il faut le
 * retrouver parmi les options importées, sans quoi les tableaux et les
 * graphiques compteraient des chaînes libres au lieu d'options.
 */
function normalizeAnswer(raw: unknown, field: Field): unknown {
  const value = unwrapCalculated(raw);
  if (value === null || value === undefined) return null;

  if (CHOICE_FIELDS.has(field.type)) {
    const byLabel = new Map(
      field.options.map((option) => [option.label.fr.trim().toLowerCase(), option.id])
    );

    const toOptionId = (label: unknown): string => {
      const raw = String(label).trim();
      // Sans correspondance, on garde le texte : c'est une réponse « Autre »,
      // et l'effacer perdrait ce que la personne a écrit.
      return byLabel.get(raw.toLowerCase()) ?? raw;
    };

    if (Array.isArray(value)) {
      const ids = value.map(toOptionId);
      // Un choix unique arrive quand même dans un tableau d'un élément.
      return field.type === 'multiple_choice' ? ids : (ids[0] ?? null);
    }
    return toOptionId(value);
  }

  if (field.type === 'nps' || field.type === 'rating' || field.type === 'number') {
    const parsed = Number(Array.isArray(value) ? value[0] : value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (field.type === 'file') {
    const files = Array.isArray(value) ? value : [value];
    const urls = files
      .map((file) =>
        file && typeof file === 'object' && typeof (file as { url?: unknown }).url === 'string'
          ? (file as { url: string }).url
          : typeof file === 'string'
            ? file
            : null
      )
      .filter((url): url is string => Boolean(url));
    return urls.length > 1 ? urls : (urls[0] ?? null);
  }

  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'object' ? JSON.stringify(item) : item)).join(', ');
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.url === 'string') return record.url;
    return JSON.stringify(value);
  }

  return value;
}
