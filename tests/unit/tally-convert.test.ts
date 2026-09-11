import { describe, expect, it } from 'vitest';

import { convertForm, convertSubmissions } from '@/lib/tally/convert';
import type { TallyBlock, TallyFormDetail, TallySubmissionsPage } from '@/lib/tally/types';

/**
 * Ce que protègent ces tests : **un import Tally rend un formulaire ouvrable,
 * et des réponses lisibles.**
 *
 * Le convertisseur replie une liste plate de blocs — un titre de question est
 * un bloc, chacune de ses options en est un autre — en champs imbriqués. Il
 * n'avait aucune couverture, alors que c'est lui qui décide de ce que devient
 * un formulaire de 248 réponses. Le montage a d'ailleurs vécu longtemps sans
 * jamais s'exécuter : la route qui l'appelle échouait avant lui.
 */

const FORM_ID = '00000000-0000-0000-0000-0000000000ff';

function convert(blocks: TallyBlock[]) {
  const detail: TallyFormDetail = { id: 'dW81GV', name: 'Retour conférence', blocks };
  return convertForm(detail, FORM_ID);
}

describe('structure', () => {
  it('replie un groupe de blocs en un champ à options', () => {
    // C'est le cœur du format Tally : la question et ses options sont des
    // blocs frères reliés par `groupUuid`.
    const { fields } = convert([
      { uuid: 'q', type: 'MULTIPLE_CHOICE', groupUuid: 'g', payload: { label: 'Connu par ?' } },
      { uuid: 'o1', type: 'MULTIPLE_CHOICE_OPTION', groupUuid: 'g', payload: { text: 'LinkedIn' } },
      { uuid: 'o2', type: 'MULTIPLE_CHOICE_OPTION', groupUuid: 'g', payload: { text: 'Un collègue' } }
    ]);

    expect(fields).toHaveLength(1);
    expect(fields[0].type).toBe('single_choice');
    expect(fields[0].label.fr).toBe('Connu par ?');
    expect(fields[0].options.map((option) => option.label.fr)).toEqual([
      'LinkedIn',
      'Un collègue'
    ]);
  });

  it('retire le HTML que Tally glisse dans les titres', () => {
    const { fields } = convert([
      { uuid: 'q', type: 'INPUT_TEXT', payload: { label: '<b>Nom</b>&nbsp;complet' } }
    ]);
    expect(fields[0].label.fr).toBe('Nom complet');
  });

  it('ouvre une section sur un titre, et n’en laisse aucune vide', () => {
    /**
     * Le défaut que ce test empêche de revenir.
     *
     * Une section d'ouverture est créée d'emblée — un formulaire Tally peut
     * commencer par une question, et `fields.section_id` n'admet pas de vide.
     * Mais quand le formulaire commence par un TITRE, comme presque tous, cette
     * ouverture restait vide et le tri final la gardait quand même : en mode
     * « une section = une page », chaque import s'ouvrait donc sur une page
     * blanche.
     */
    const { sections, fields } = convert([
      { uuid: 't1', type: 'HEADING_2', payload: { title: 'Vous' } },
      { uuid: 'q1', type: 'INPUT_TEXT', payload: { label: 'Nom' } },
      { uuid: 't2', type: 'HEADING_2', payload: { title: 'Logistique' } },
      { uuid: 'q2', type: 'INPUT_DATE', payload: { label: 'Date' } }
    ]);

    expect(sections.map((section) => section.title.fr)).toEqual(['Vous', 'Logistique']);
    // Les rangs se resserrent : une section retirée ne laisse pas de trou.
    expect(sections.map((section) => section.section_order)).toEqual([0, 1]);
    // Et chaque champ pointe vers une section qui existe encore.
    const ids = new Set(sections.map((section) => section.id));
    for (const field of fields) expect(ids.has(field.section_id)).toBe(true);
  });

  it('garde une section quand le formulaire n’a aucune question', () => {
    // `fields.section_id` est obligatoire : un import sans question doit tout
    // de même produire un formulaire qu'on peut ouvrir et compléter.
    const { sections } = convert([
      { uuid: 't', type: 'HEADING_2', payload: { title: 'Vide' } }
    ]);
    expect(sections).toHaveLength(1);
    expect(sections[0].section_order).toBe(0);
  });

  it('signale ce qu’il ne sait pas traduire, au lieu de le perdre', () => {
    const { warnings, fields } = convert([
      { uuid: 'q', type: 'INPUT_TEXT', payload: { label: 'Nom' } },
      { uuid: 'p', type: 'PAYMENT', payload: { label: 'Frais' } }
    ]);

    expect(fields).toHaveLength(1);
    expect(warnings.join(' ')).toContain('PAYMENT');
    // La logique conditionnelle n'est jamais transférable : on le dit à chaque
    // import plutôt que de laisser croire qu'elle a suivi.
    expect(warnings.join(' ')).toContain('Logique');
  });

  it('traduit l’échelle et la notation vers leurs équivalents', () => {
    const { fields } = convert([
      {
        uuid: 'q1',
        type: 'LINEAR_SCALE',
        payload: { label: 'Recommanderiez-vous ?', min: 0, max: 10 }
      },
      { uuid: 'q2', type: 'RATING', payload: { label: 'Note', maxRating: 5 } }
    ]);

    expect(fields[0].type).toBe('nps');
    expect(fields[1].type).toBe('rating');
  });
});

describe('réponses', () => {
  const blocks: TallyBlock[] = [
    { uuid: 'q-nom', type: 'INPUT_TEXT', payload: { label: 'Nom' } },
    { uuid: 'q-choix', type: 'MULTIPLE_CHOICE', groupUuid: 'g', payload: { label: 'Canal' } },
    { uuid: 'o1', type: 'MULTIPLE_CHOICE_OPTION', groupUuid: 'g', payload: { text: 'LinkedIn' } }
  ];

  function page(responses: { questionId: string; value: unknown }[]): TallySubmissionsPage {
    return {
      questions: [
        { id: 'q-nom', type: 'INPUT_TEXT', title: 'Nom' },
        { id: 'q-choix', type: 'MULTIPLE_CHOICE', title: 'Canal', options: [{ id: 'o1', text: 'LinkedIn' }] }
      ],
      submissions: [{ id: 'sub-1', submittedAt: '2026-06-11T09:14:00.000Z', responses }]
    };
  }

  it('range les réponses sous les identifiants Papyrus, pas ceux de Tally', () => {
    const converted = convert(blocks);
    const [submission] = convertSubmissions(
      [page([{ questionId: 'q-nom', value: 'Aurélie' }])],
      converted.fieldIdByTallyId,
      converted.fields
    );

    const nameField = converted.fields.find((field) => field.label.fr === 'Nom')!;
    expect(submission.responses[nameField.id]).toBe('Aurélie');
    expect(submission.externalId).toBe('sub-1');
  });

  it('rend un choix sous une option que le formulaire connaît', () => {
    // Sinon les tableaux et les graphiques afficheraient un uuid brut à la
    // place du libellé choisi.
    const converted = convert(blocks);
    const choice = converted.fields.find((field) => field.label.fr === 'Canal')!;
    const [submission] = convertSubmissions(
      [page([{ questionId: 'q-choix', value: ['o1'] }])],
      converted.fieldIdByTallyId,
      converted.fields
    );

    const answered = submission.responses[choice.id] as string[];
    const known = new Set(choice.options.map((option) => option.id));
    expect(answered.every((id) => known.has(id))).toBe(true);
  });

  it('ignore une réponse dont la question n’a pas été importée', () => {
    // Ne jamais deviner : une valeur rattachée au mauvais champ est pire
    // qu'une valeur absente, parce qu'elle se lit comme une vraie réponse.
    const converted = convert(blocks);
    const [submission] = convertSubmissions(
      [
        page([
          { questionId: 'q-nom', value: 'Marc' },
          { questionId: 'q-disparue', value: 'à jeter' }
        ])
      ],
      converted.fieldIdByTallyId,
      converted.fields
    );

    expect(Object.keys(submission.responses)).toHaveLength(1);
    expect(Object.values(submission.responses)).not.toContain('à jeter');
  });

  it('écarte une soumission entièrement vide', () => {
    const converted = convert(blocks);
    const submissions = convertSubmissions(
      [page([{ questionId: 'q-inconnue', value: 'rien' }])],
      converted.fieldIdByTallyId,
      converted.fields
    );
    expect(submissions).toHaveLength(0);
  });

  it('réduit un fichier Tally à son adresse', () => {
    const detail = convert([{ uuid: 'q-f', type: 'FILE_UPLOAD', payload: { label: 'Pièce' } }]);
    const [submission] = convertSubmissions(
      [
        {
          questions: [{ id: 'q-f', type: 'FILE_UPLOAD', title: 'Pièce' }],
          submissions: [
            {
              id: 's',
              submittedAt: '2026-06-11T09:14:00.000Z',
              responses: [{ questionId: 'q-f', value: { url: 'https://tally.so/x.pdf', name: 'x.pdf' } }]
            }
          ]
        }
      ],
      detail.fieldIdByTallyId,
      detail.fields
    );

    expect(Object.values(submission.responses)[0]).toBe('https://tally.so/x.pdf');
  });
});
