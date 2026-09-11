import { describe, expect, it } from 'vitest';

import {
  absorbOrphanQuestions,
  convertForm,
  convertSubmissions,
  readRichText
} from '@/lib/tally/convert';
import type { TallyBlock, TallyFormDetail, TallySubmissionsPage } from '@/lib/tally/types';

/**
 * Ce que protègent ces tests : **un import Tally rend le formulaire tel qu'il
 * était, et ses réponses avec.**
 *
 * Les formes ci-dessous sont relevées sur des charges réelles de l'API Tally —
 * le contenu est neutralisé, la structure ne l'est pas. C'est le point : la
 * série précédente avait été écrite d'après nos propres types, elle passait au
 * vert, et l'import produisait pourtant huit champs nommés « Question
 * importée » et zéro réponse. Un fixture inventé ne teste que l'imagination de
 * celui qui l'a écrit.
 */

const FORM_ID = '00000000-0000-0000-0000-0000000000ff';

function convert(blocks: TallyBlock[]) {
  const detail: TallyFormDetail = { id: 'dW81GV', name: 'Retour conférence', blocks };
  return convertForm(detail, FORM_ID);
}

/** Un titre de question : bloc `TITLE`, groupe `QUESTION`, texte en arbre. */
function questionTitle(uuid: string, group: string, text: string): TallyBlock {
  return {
    uuid,
    type: 'TITLE',
    groupUuid: group,
    groupType: 'QUESTION',
    payload: { safeHTMLSchema: [[text]] }
  };
}

describe('texte riche', () => {
  it('lit le texte et laisse les attributs de côté', () => {
    // Le défaut évité : un nœud vaut `[texte, attributs?]` et un attribut vaut
    // `[clé, valeur]`. Sans la distinction, un titre revenait avec « tag »,
    // « p » et « font-weight » collés au bout.
    const schema = [
      [
        [
          ['JUIN 11', [['tag', 'span']]],
          [' — Conférence'],
          ['&amp; transformation', [['tag', 'span']]]
        ],
        [['tag', 'p']]
      ]
    ];

    expect(readRichText(schema)).toBe('JUIN 11 — Conférence&amp; transformation');
  });

  it('accepte la forme la plus simple', () => {
    expect(readRichText([['Une seule ligne']])).toBe('Une seule ligne');
  });
});

describe('structure', () => {
  it('donne à la question le titre du bloc qui la précède', () => {
    /**
     * Le défaut que ce test empêche de revenir.
     *
     * Chez Tally, le libellé d'une question N'EST PAS dans la question : c'est
     * un bloc `TITLE` distinct posé juste avant, et le bloc de saisie ne porte
     * que `isRequired` et `placeholder`. Une lecture qui cherche le libellé
     * dans le bloc de saisie ne trouve rien — d'où un formulaire entier de
     * champs nommés « Question importée ».
     */
    const { fields } = convert([
      questionTitle('t1', 'g-t1', 'Prénom'),
      {
        uuid: 'i1',
        type: 'INPUT_TEXT',
        groupUuid: 'g-i1',
        groupType: 'INPUT_TEXT',
        payload: { isRequired: true, placeholder: 'Votre prénom' }
      }
    ]);

    expect(fields).toHaveLength(1);
    expect(fields[0].label.fr).toBe('Prénom');
    expect(fields[0].type).toBe('short_text');
    expect(fields[0].required).toBe(true);
    expect(fields[0].placeholder.fr).toBe('Votre prénom');
  });

  it('réunit les options éparpillées en un seul champ', () => {
    // Chaque option est un bloc à part ; ce qui les relie est `groupUuid`.
    const option = (uuid: string, index: number, text: string): TallyBlock => ({
      uuid,
      type: 'MULTIPLE_CHOICE_OPTION',
      groupUuid: 'g-choix',
      groupType: 'MULTIPLE_CHOICE',
      payload: { isRequired: true, index, text }
    });

    const { fields } = convert([
      questionTitle('t', 'g-t', 'Qui vous a aidé ?'),
      option('o2', 1, 'Des groupes en ligne'),
      option('o1', 0, 'Mon réseau personnel'),
      option('o3', 2, 'Personne')
    ]);

    expect(fields).toHaveLength(1);
    expect(fields[0].type).toBe('single_choice');
    expect(fields[0].label.fr).toBe('Qui vous a aidé ?');
    // Rangées par `index`, pas par ordre d'arrivée.
    expect(fields[0].options.map((option) => option.label.fr)).toEqual([
      'Mon réseau personnel',
      'Des groupes en ligne',
      'Personne'
    ]);
  });

  it('distingue un choix unique d’un choix multiple', () => {
    const { fields } = convert([
      questionTitle('t', 'g-t', 'Sujets'),
      {
        uuid: 'o1',
        type: 'MULTIPLE_CHOICE_OPTION',
        groupUuid: 'g-c',
        groupType: 'MULTIPLE_CHOICE',
        payload: { index: 0, text: 'IA', allowMultiple: true }
      },
      {
        uuid: 'o2',
        type: 'MULTIPLE_CHOICE_OPTION',
        groupUuid: 'g-c',
        groupType: 'MULTIPLE_CHOICE',
        payload: { index: 1, text: 'Transformation', allowMultiple: true }
      }
    ]);

    expect(fields[0].type).toBe('multiple_choice');
  });

  it('reprend les bornes d’une échelle au lieu d’en inventer', () => {
    const { fields } = convert([
      questionTitle('t', 'g-t', 'Nous recommanderiez-vous ?'),
      {
        uuid: 's',
        type: 'LINEAR_SCALE',
        groupUuid: 'g-s',
        groupType: 'LINEAR_SCALE',
        payload: { isRequired: true, start: 1, end: 10, step: 1 }
      }
    ]);

    expect(fields[0].type).toBe('nps');
    expect(fields[0].validation.min).toBe(1);
    expect(fields[0].validation.max).toBe(10);
  });

  it('garde les intertitres et les paragraphes comme contenu', () => {
    // « Tout importer » veut dire tout : le texte d'introduction fait partie du
    // formulaire, il ne se jette pas parce qu'il n'est pas une question.
    const { fields } = convert([
      { uuid: 'h', type: 'TITLE', groupUuid: 'g-h', groupType: 'TITLE', payload: { safeHTMLSchema: [['Bienvenue']] } },
      { uuid: 'p', type: 'TEXT', groupUuid: 'g-p', groupType: 'TEXT', payload: { safeHTMLSchema: [['Merci de répondre.']] } }
    ]);

    expect(fields.map((field) => field.type)).toEqual(['statement', 'statement']);
    expect(fields.map((field) => field.label.fr)).toEqual(['Bienvenue', 'Merci de répondre.']);
  });

  it('ne compte ni le titre du formulaire ni la logique comme des pertes', () => {
    // `FORM_TITLE` est le titre, déjà repris ; `CONDITIONAL_LOGIC` a son propre
    // avertissement. Les annoncer « sans équivalent » faisait passer deux
    // éléments parfaitement traités pour des dégâts.
    const { warnings, fields } = convert([
      { uuid: 'f', type: 'FORM_TITLE', groupType: 'FORM_TITLE', payload: { title: 'Retour' } },
      questionTitle('t', 'g-t', 'Nom'),
      { uuid: 'i', type: 'INPUT_TEXT', groupUuid: 'g-i', groupType: 'INPUT_TEXT', payload: {} },
      { uuid: 'l', type: 'CONDITIONAL_LOGIC', groupUuid: 'g-l', groupType: 'CONDITIONAL_LOGIC', payload: {} }
    ]);

    expect(fields).toHaveLength(1);
    expect(warnings.join(' ')).not.toContain('sans équivalent');
    expect(warnings.join(' ')).toContain('Logique');
  });

  it('signale ce qu’il ne sait vraiment pas traduire', () => {
    const { warnings } = convert([
      { uuid: 'p', type: 'PAYMENT', groupUuid: 'g-p', groupType: 'PAYMENT', payload: {} }
    ]);
    expect(warnings.join(' ')).toContain('PAYMENT');
  });

  it('pagine seulement là où Tally paginait', () => {
    const single = convert([
      questionTitle('t', 'g-t', 'Nom'),
      { uuid: 'i', type: 'INPUT_TEXT', groupUuid: 'g-i', groupType: 'INPUT_TEXT', payload: {} }
    ]);
    expect(single.displayMode).toBe('scroll');
    expect(single.sections).toHaveLength(1);

    const paged = convert([
      questionTitle('t1', 'g-t1', 'Nom'),
      { uuid: 'i1', type: 'INPUT_TEXT', groupUuid: 'g-i1', groupType: 'INPUT_TEXT', payload: {} },
      { uuid: 'b', type: 'PAGE_BREAK', groupUuid: 'g-b', groupType: 'PAGE_BREAK', payload: { index: 0 } },
      questionTitle('t2', 'g-t2', 'Ville'),
      { uuid: 'i2', type: 'INPUT_TEXT', groupUuid: 'g-i2', groupType: 'INPUT_TEXT', payload: {} }
    ]);
    expect(paged.displayMode).toBe('sections');
    expect(paged.sections).toHaveLength(2);
    expect(paged.sections.map((section) => section.section_order)).toEqual([0, 1]);
  });

  it('récolte la page de remerciement au lieu d’en faire une section', () => {
    const { sections, fields, thankYou } = convert([
      questionTitle('t', 'g-t', 'Nom'),
      { uuid: 'i', type: 'INPUT_TEXT', groupUuid: 'g-i', groupType: 'INPUT_TEXT', payload: {} },
      {
        uuid: 'b',
        type: 'PAGE_BREAK',
        groupUuid: 'g-b',
        groupType: 'PAGE_BREAK',
        payload: { isThankYouPage: true }
      },
      { uuid: 'ty', type: 'TITLE', groupUuid: 'g-ty', groupType: 'TITLE', payload: { safeHTMLSchema: [['Merci !']] } }
    ]);

    expect(sections).toHaveLength(1);
    expect(fields).toHaveLength(1);
    expect(thankYou?.title).toBe('Merci !');
  });

  it('laisse toujours une section, même sans une seule question', () => {
    // `fields.section_id` est obligatoire : un import vide doit tout de même
    // produire un formulaire qu'on peut ouvrir.
    const { sections } = convert([]);
    expect(sections).toHaveLength(1);
    expect(sections[0].section_order).toBe(0);
  });
});

describe('réponses', () => {
  const blocks: TallyBlock[] = [
    questionTitle('t1', 'g-t1', 'Prénom'),
    { uuid: 'i1', type: 'INPUT_TEXT', groupUuid: 'g-i1', groupType: 'INPUT_TEXT', payload: {} },
    questionTitle('t2', 'g-t2', 'Canal'),
    {
      uuid: 'o1',
      type: 'MULTIPLE_CHOICE_OPTION',
      groupUuid: 'g-c',
      groupType: 'MULTIPLE_CHOICE',
      payload: { index: 0, text: 'Mon réseau personnel' }
    },
    {
      uuid: 'o2',
      type: 'MULTIPLE_CHOICE_OPTION',
      groupUuid: 'g-c',
      groupType: 'MULTIPLE_CHOICE',
      payload: { index: 1, text: 'Un collègue' }
    },
    questionTitle('t3', 'g-t3', 'Note'),
    {
      uuid: 's',
      type: 'LINEAR_SCALE',
      groupUuid: 'g-s',
      groupType: 'LINEAR_SCALE',
      payload: { start: 0, end: 10 }
    }
  ];

  /** Une page de réponses, exactement comme Tally la renvoie. */
  function page(responses: { questionId: string; answer: unknown }[]): TallySubmissionsPage {
    return {
      page: 1,
      hasMore: false,
      questions: [
        {
          id: 'RLvRQd',
          type: 'INPUT_TEXT',
          title: 'Prénom',
          fields: [{ uuid: 'g-i1', blockGroupUuid: 'g-i1', questionType: 'INPUT_TEXT', title: 'Prénom' }]
        },
        {
          id: 'yx9Ppd',
          type: 'MULTIPLE_CHOICE',
          title: 'Canal',
          fields: [{ uuid: 'g-c', blockGroupUuid: 'g-c', questionType: 'MULTIPLE_CHOICE', title: 'Canal' }]
        },
        {
          id: '52Z1GE',
          type: 'LINEAR_SCALE',
          title: 'Note',
          fields: [{ uuid: 'g-s', blockGroupUuid: 'g-s', questionType: 'LINEAR_SCALE', title: 'Note' }]
        }
      ],
      submissions: [
        { id: 'kbAVG81', submittedAt: '2026-06-10T12:18:07.000Z', isCompleted: true, responses }
      ]
    };
  }

  function run(responses: { questionId: string; answer: unknown }[]) {
    const converted = convert(blocks);
    const submissions = convertSubmissions([page(responses)], converted);
    return { converted, submissions };
  }

  it('retrouve la question par son groupe de blocs', () => {
    /**
     * Le défaut que ce test empêche de revenir.
     *
     * `questionId` est un identifiant court propre aux réponses (`RLvRQd`), pas
     * un uuid de bloc. Le pont est `questions[].fields[].blockGroupUuid`. Sans
     * lui, aucune réponse ne trouvait son champ.
     */
    const { converted, submissions } = run([{ questionId: 'RLvRQd', answer: 'Aurélie' }]);
    const prenom = converted.fields.find((field) => field.label.fr === 'Prénom')!;

    expect(submissions).toHaveLength(1);
    expect(submissions[0].responses[prenom.id]).toBe('Aurélie');
    expect(submissions[0].externalId).toBe('kbAVG81');
  });

  it('lit la valeur dans `answer`', () => {
    // Elle était lue dans `value`, qui n'existe pas : chaque réponse valait
    // `undefined`, et l'import annonçait « 0 réponse » sur 82.
    const { submissions } = run([{ questionId: 'RLvRQd', answer: 'Marc' }]);
    expect(Object.values(submissions[0].responses)).toContain('Marc');
  });

  it('rend un choix sous l’option du formulaire, pas sous son libellé brut', () => {
    // Tally renvoie le LIBELLÉ choisi. Sans traduction, les tableaux et les
    // graphiques compteraient des chaînes libres au lieu d'options.
    const { converted, submissions } = run([
      { questionId: 'yx9Ppd', answer: ['Un collègue'] }
    ]);
    const canal = converted.fields.find((field) => field.label.fr === 'Canal')!;
    const chosen = canal.options.find((option) => option.label.fr === 'Un collègue')!;

    expect(submissions[0].responses[canal.id]).toBe(chosen.id);
  });

  it('garde le texte d’une réponse « Autre » qu’aucune option ne porte', () => {
    const { converted, submissions } = run([
      { questionId: 'yx9Ppd', answer: ['Par le podcast'] }
    ]);
    const canal = converted.fields.find((field) => field.label.fr === 'Canal')!;
    expect(submissions[0].responses[canal.id]).toBe('Par le podcast');
  });

  it('rend une échelle en nombre', () => {
    const { converted, submissions } = run([{ questionId: '52Z1GE', answer: 9 }]);
    const note = converted.fields.find((field) => field.label.fr === 'Note')!;
    expect(submissions[0].responses[note.id]).toBe(9);
  });

  it('ignore une réponse dont la question n’a pas été importée', () => {
    // Ne jamais deviner : une valeur rattachée au mauvais champ se lit comme
    // une vraie réponse, ce qui est pire qu'une absence.
    const { submissions } = run([
      { questionId: 'RLvRQd', answer: 'Marc' },
      { questionId: 'INCONNU', answer: 'à jeter' }
    ]);
    expect(Object.keys(submissions[0].responses)).toHaveLength(1);
    expect(Object.values(submissions[0].responses)).not.toContain('à jeter');
  });

  it('écarte une soumission entièrement vide', () => {
    const { submissions } = run([{ questionId: 'INCONNU', answer: 'rien' }]);
    expect(submissions).toHaveLength(0);
  });
});

describe('questions disparues du formulaire', () => {
  /**
   * Ce que protège cette série.
   *
   * Un formulaire Tally vivant perd des questions : on le traduit, on le
   * reformule, on en retire une — et Tally garde les réponses d'avant sous une
   * question dont le bloc n'existe plus. Sur les formulaires de cet espace,
   * c'était près de la moitié des réponses : un questionnaire candidat passé de
   * l'anglais au français en gardait deux mille, et un examen trente mille
   * valeurs calculées. Un import qui ne lit que les blocs actuels annonce
   * « 515 réponses » dont la plupart sont vides.
   */

  const blocks: TallyBlock[] = [
    questionTitle('t', 'g-t', 'Prénom'),
    { uuid: 'i', type: 'INPUT_TEXT', groupUuid: 'g-i', groupType: 'INPUT_TEXT', payload: {} }
  ];

  function pageWith(
    questions: TallySubmissionsPage['questions'],
    responses: { questionId: string; answer: unknown }[]
  ): TallySubmissionsPage {
    return {
      questions,
      submissions: [{ id: 's1', submittedAt: '2026-06-10T12:00:00.000Z', responses }]
    };
  }

  it('recrée une question retirée plutôt que de jeter ses réponses', () => {
    const converted = convert(blocks);
    const pages = [
      pageWith(
        [
          { id: 'Q1', type: 'INPUT_TEXT', title: 'Prénom', fields: [{ blockGroupUuid: 'g-i' }] },
          { id: 'Q2', type: 'TEXTAREA', title: 'Ancienne question', fields: [{ blockGroupUuid: 'disparu' }] }
        ],
        [
          { questionId: 'Q1', answer: 'Aurélie' },
          { questionId: 'Q2', answer: 'Une réponse d’avant' }
        ]
      )
    ];

    absorbOrphanQuestions(converted, pages, FORM_ID);
    const submissions = convertSubmissions(pages, converted);

    const recovered = converted.fields.find((field) => field.label.fr === 'Ancienne question');
    expect(recovered, 'la question retirée devient un champ').toBeTruthy();
    expect(submissions[0].responses[recovered!.id]).toBe('Une réponse d’avant');

    // Rangée à part : l'auteur doit voir d'un coup d'œil ce qui relève de
    // l'histoire du formulaire et non de sa version d'aujourd'hui.
    const aside = converted.sections.find(
      (section) => section.title.fr === 'Questions retirées du formulaire Tally'
    );
    expect(aside?.id).toBe(recovered!.section_id);
    expect(converted.warnings.join(' ')).toContain('ne figure plus');
  });

  it('ne recrée rien pour une question restée sans réponse', () => {
    // Une question supprimée que personne n'avait remplie n'a pas à revenir
    // encombrer le formulaire.
    const converted = convert(blocks);
    const pages = [
      pageWith(
        [{ id: 'Q9', type: 'TEXTAREA', title: 'Jamais remplie', fields: [{ blockGroupUuid: 'disparu' }] }],
        []
      )
    ];

    absorbOrphanQuestions(converted, pages, FORM_ID);
    expect(converted.fields).toHaveLength(1);
  });

  it('déballe un calcul Tally et lui rend son nom', () => {
    // Un champ calculé ne rend pas sa valeur : il rend `{ "Score": 5 }`, et son
    // nom vit dans `fields[].title` parce que `title` vaut `null`. Sans le
    // déballage, la conversion en nombre rendait `null` ; sans le nom, douze
    // colonnes de résultats s'appelaient toutes pareil.
    const converted = convert(blocks);
    const pages = [
      pageWith(
        [
          {
            id: 'C1',
            type: 'CALCULATED_FIELDS',
            title: undefined,
            fields: [{ blockGroupUuid: 'calc', title: 'Score' }]
          },
          {
            id: 'C2',
            type: 'CALCULATED_FIELDS',
            title: undefined,
            fields: [{ blockGroupUuid: 'calc2', title: 'niveau' }]
          }
        ],
        [
          { questionId: 'C1', answer: { Score: 5 } },
          { questionId: 'C2', answer: { niveau: 'Niveau 1' } }
        ]
      )
    ];

    absorbOrphanQuestions(converted, pages, FORM_ID);
    const submissions = convertSubmissions(pages, converted);

    const score = converted.fields.find((field) => field.label.fr === 'Score')!;
    const niveau = converted.fields.find((field) => field.label.fr === 'niveau')!;

    // Le type se déduit des valeurs : un score est un nombre, un niveau non.
    expect(score.type).toBe('number');
    expect(niveau.type).toBe('short_text');
    expect(submissions[0].responses[score.id]).toBe(5);
    expect(submissions[0].responses[niveau.id]).toBe('Niveau 1');
  });

  it('ignore un calcul dont le résultat est vide', () => {
    const converted = convert(blocks);
    const pages = [
      pageWith(
        [{ id: 'C3', type: 'CALCULATED_FIELDS', fields: [{ blockGroupUuid: 'calc3', title: 'vide' }] }],
        [{ questionId: 'C3', answer: { vide: '' } }]
      )
    ];

    absorbOrphanQuestions(converted, pages, FORM_ID);
    expect(converted.fields.find((field) => field.label.fr === 'vide')).toBeUndefined();
  });

  it('reconstitue les options d’une question disparue depuis les réponses', () => {
    // Ses options ne sont plus nulle part : ce que les gens ont répondu est la
    // seule trace qu'il en reste.
    const converted = convert(blocks);
    const pages: TallySubmissionsPage[] = [
      {
        questions: [
          { id: 'Q5', type: 'CHECKBOXES', title: 'Sujets', fields: [{ blockGroupUuid: 'parti' }] }
        ],
        submissions: [
          { id: 's1', submittedAt: '2026-06-10T12:00:00.000Z', responses: [{ questionId: 'Q5', answer: ['IA'] }] },
          { id: 's2', submittedAt: '2026-06-10T12:05:00.000Z', responses: [{ questionId: 'Q5', answer: ['IA', 'Transformation'] }] }
        ]
      }
    ];

    absorbOrphanQuestions(converted, pages, FORM_ID);
    const sujets = converted.fields.find((field) => field.label.fr === 'Sujets')!;

    expect(sujets.type).toBe('multiple_choice');
    expect(sujets.options.map((option) => option.label.fr).sort()).toEqual(['IA', 'Transformation']);

    const submissions = convertSubmissions(pages, converted);
    const known = new Set(sujets.options.map((option) => option.id));
    for (const submission of submissions) {
      for (const id of submission.responses[sujets.id] as string[]) {
        expect(known.has(id)).toBe(true);
      }
    }
  });
});
