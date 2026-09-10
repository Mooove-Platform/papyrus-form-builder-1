import fs from 'node:fs';
import { expect, test, type ConsoleMessage, type Page } from '@playwright/test';

/**
 * La revue de bout en bout de l'application, connectée.
 *
 * Les autres fichiers de `tests/e2e` visent chacun une fonctionnalité. Celui-ci
 * vise l'inverse : il traverse TOUT — chaque écran du tableau de bord, chaque
 * onglet d'un projet et d'un formulaire, le constructeur, l'aperçu, les trois
 * modes d'affichage, la publication, la réponse publique — et échoue au premier
 * écran qui casse.
 *
 * Il existe parce qu'un défaut de rendu ne se voit dans aucun test unitaire et
 * dans aucune vérification de type. Ce qu'il a trouvé à sa première exécution :
 * un séparateur promu en écran plein numéroté, un champ caché devenu une
 * question, un intitulé affiché deux fois, et le message « ajoutez-en dans le
 * panneau de droite » — destiné à l'auteur — montré au répondant sur un
 * formulaire publié.
 *
 * **Chaque page est écoutée.** Une erreur de console ou une exception non
 * rattrapée fait échouer le test qui l'a provoquée, même si l'écran a l'air
 * correct : c'est exactement la forme que prend un composant qui tombe pendant
 * l'hydratation — la page s'affiche, puis ne réagit plus.
 *
 * Il lui faut une session et un formulaire d'essai :
 *   E2E_SESSION_FILE   le fichier écrit par la préparation (compte, équipe, cookie)
 *   E2E_AUDIT_SLUG     l'adresse publique du formulaire d'essai
 *   E2E_AUDIT_FORM     son identifiant
 *   E2E_AUDIT_PROJECT  celui de son projet
 * Sans eux, tout est ignoré.
 */

const sessionFile = process.env.E2E_SESSION_FILE;

interface AuditSession {
  teamId: string;
  cookieName: string;
  cookieValue: string;
  accessToken: string;
  supabaseUrl: string;
  anonKey: string;
}

const session: AuditSession | null = sessionFile
  ? (JSON.parse(fs.readFileSync(sessionFile, 'utf8')) as AuditSession)
  : null;

const SLUG = process.env.E2E_AUDIT_SLUG ?? '';
const FORM = process.env.E2E_AUDIT_FORM ?? '';
const PROJECT = process.env.E2E_AUDIT_PROJECT ?? '';

/**
 * Ce qu'on accepte de voir passer dans la console.
 *
 * La liste est courte et le restera : chaque ligne ici est un bruit qu'on a
 * regardé et jugé inoffensif. Tout le reste fait échouer.
 */
const IGNORED_CONSOLE = ['Failed to load resource', 'favicon', 'Extra attributes from the server'];

function watchConsole(page: Page): string[] {
  const errors: string[] = [];

  page.on('console', (message: ConsoleMessage) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (IGNORED_CONSOLE.some((pattern) => text.includes(pattern))) return;
    errors.push(text);
  });

  page.on('pageerror', (error) => {
    errors.push(`exception : ${error.message}`);
  });

  return errors;
}

/** Next affiche ses plantages dans un gabarit reconnaissable. */
async function expectNoCrash(page: Page) {
  await expect(page.locator('text=Application error')).toHaveCount(0);
  await expect(page.locator('text=Unhandled Runtime Error')).toHaveCount(0);
  await expect(page.locator('#__next_error__')).toHaveCount(0);
}

/**
 * Le mode d'affichage, changé en base plutôt que par l'interface.
 *
 * Le test du constructeur vise le BASCULEMENT ; ceux-ci visent le RENDU. Les
 * mélanger ferait qu'un défaut de l'un masquerait celui de l'autre.
 */
async function patchForm(page: Page, data: Record<string, unknown>) {
  const response = await page.request.patch(
    `${session!.supabaseUrl}/rest/v1/forms?slug=eq.${SLUG}`,
    {
      headers: {
        apikey: session!.anonKey,
        Authorization: `Bearer ${session!.accessToken}`,
        'Content-Type': 'application/json',
        'Content-Profile': 'papyrus'
      },
      data
    }
  );
  expect(response.ok(), `mise à jour du formulaire ${JSON.stringify(data)}`).toBeTruthy();
}

async function setDisplayMode(page: Page, mode: string) {
  await patchForm(page, { display_mode: mode });
}

test.describe('Revue complète', () => {
  test.skip(!session, 'E2E_SESSION_FILE non défini');

  /**
   * En série, tout le fichier.
   *
   * Presque chaque test écrit dans le MÊME formulaire d'essai : mode
   * d'affichage, langue, thème, réglages du bouton. En parallèle, l'un défait
   * ce que l'autre vient de poser, et l'échec désigne alors la mauvaise
   * coupable — on a corrigé deux fois un défaut qui n'existait pas.
   *
   * Des blocs `serial` imbriqués ne suffisaient pas : ils ordonnent leurs
   * propres tests, mais deux blocs restent parallèles entre eux.
   */
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ context, baseURL }) => {
    if (!session) return;
    const origin = new URL(baseURL ?? 'http://localhost:3100').origin;
    await context.addCookies([
      {
        name: session.cookieName,
        value: session.cookieValue,
        url: origin,
        httpOnly: false,
        secure: origin.startsWith('https')
      }
    ]);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 1. Chaque écran du tableau de bord s'ouvre
  // ══════════════════════════════════════════════════════════════════════════

  const SCREENS: { path: string; expect: RegExp }[] = [
    { path: '/dashboard', expect: /Papyrus|Tableau|Bonjour|formulaire/i },
    { path: '/projects', expect: /Projets/i },
    { path: '/projects/nouveau', expect: /projet/i },
    { path: '/forms', expect: /formulaire/i },
    { path: '/templates', expect: /Mod[èe]le/i },
    { path: '/partners', expect: /Partenaire/i },
    { path: '/contacts', expect: /Contact/i },
    { path: '/settings/profile', expect: /Profil/i },
    { path: '/settings/team', expect: /[ÉE]quipe/i },
    { path: '/settings/assistant', expect: /Assistant/i },
    { path: '/settings/integrations', expect: /Int[ée]gration|Tally/i },
    { path: '/settings/access', expect: /Acc[èe]s|domaine/i }
  ];

  for (const screen of SCREENS) {
    test(`écran ${screen.path}`, async ({ page }) => {
      const errors = watchConsole(page);

      const response = await page.goto(screen.path);
      expect(response?.status(), `${screen.path} répond`).toBeLessThan(400);

      await expectNoCrash(page);
      await expect(page.locator('body')).toContainText(screen.expect, { timeout: 15_000 });

      // Le temps que les effets de chargement se déclenchent : c'est là que
      // tombent les composants qui lisent une donnée absente.
      await page.waitForTimeout(1200);
      await expectNoCrash(page);

      expect(errors, `console de ${screen.path}`).toEqual([]);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 1 bis. « Nouveau projet » mène à l'assistant de création, partout
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Le défaut que ce test empêche de revenir.
   *
   * `/projects/nouveau` — trois questions puis l'assistant — existait, et trois
   * des quatre portes marquées « Nouveau projet » ne s'y rendaient pas : le
   * tableau de bord renvoyait à la liste, la barre latérale aussi, et la liste
   * elle-même ouvrait sa propre fenêtre à un champ. Créer un projet par la
   * porte d'entrée du produit donnait donc un espace vide : aucun formulaire à
   * remplir, aucun assistant à qui parler.
   *
   * On vérifie l'adresse d'arrivée et non l'apparence : c'est le routage qui
   * avait divergé, et c'est lui qui peut diverger à nouveau.
   */
  const DOORS: { from: string; label: RegExp }[] = [
    { from: '/projects', label: /Nouveau projet/i },
    { from: '/dashboard', label: /Nouveau projet/i }
  ];

  for (const door of DOORS) {
    test(`« Nouveau projet » depuis ${door.from} ouvre l'assistant`, async ({ page }) => {
      const errors = watchConsole(page);

      await page.goto(door.from);
      await expectNoCrash(page);

      await page.getByRole('button', { name: door.label }).first().click();
      await page.waitForURL('**/projects/nouveau', { timeout: 15_000 });

      // La première question de l'assistant, pas une fenêtre à un champ.
      await expect(page.locator('body')).toContainText(/Comment s’appelle ce projet|s'appelle ce projet/i, {
        timeout: 15_000
      });
      await expectNoCrash(page);

      expect(errors, `console depuis ${door.from}`).toEqual([]);
    });
  }

  test('l’espace d’un projet propose l’assistant', async ({ page }) => {
    test.skip(!PROJECT, 'E2E_AUDIT_PROJECT non défini');
    const errors = watchConsole(page);

    await page.goto(`/projects/${PROJECT}`);
    await expectNoCrash(page);

    // Le panneau n'existait que dans l'espace d'un formulaire : un projet
    // ouvert le lendemain n'avait plus aucun moyen de parler à l'assistant.
    const button = page.getByRole('button', { name: /^Assistant$/i }).first();
    await expect(button).toBeVisible({ timeout: 15_000 });
    await button.click();

    // La barre latérale est elle aussi un `aside` : on vise le panneau par ce
    // qu'il contient, et non par sa balise.
    await expect(page.getByRole('button', { name: /Fermer l’assistant/i })).toBeVisible({
      timeout: 10_000
    });
    await page.waitForTimeout(800);
    await expectNoCrash(page);

    expect(errors, 'console du panneau assistant').toEqual([]);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 1 ter. La bannière est cadrée pareil partout
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Le défaut que ce test empêche de revenir.
   *
   * Le constructeur et la page publique dessinaient la bannière avec deux
   * formules différentes. Le constructeur posait l’image en pixels absolus,
   * avec son zoom et son centre. La page publique faisait `object-fit: cover`
   * et `object-position`, ce qui **ignore le zoom** et ne place pas le même
   * point au même endroit. On cadrait donc avec soin, on ouvrait l’aperçu, et
   * la bannière repartait au centre — indéfiniment.
   *
   * On ne compare pas des pixels : les deux pages n’ont pas la même largeur.
   * On relit dans la géométrie rendue les TROIS valeurs réglées — centre
   * horizontal, centre vertical, zoom — et on vérifie que chacune des deux
   * pages rend bien celles qui sont enregistrées.
   */

  /** Une image 4:1, en `data:` — la géométrie seule nous intéresse. */
  const TEST_BANNER =
    'data:image/svg+xml;base64,' +
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100"><rect width="400" height="100" fill="#F0781E"/></svg>'
    ).toString('base64');

  const FRAMING = {
    banner_url: TEST_BANNER,
    banner_fit: 'cover',
    banner_scale: 1.6,
    banner_position_x: 28,
    banner_position_y: 72,
    banner_height: 240
  };

  /** Relit le cadrage effectif depuis l’image affichée. */
  async function readFraming(page: Page) {
    return page.evaluate(() => {
      const img = document.querySelector('img[alt="Bannière"]') as HTMLImageElement | null;
      if (!img?.parentElement) return null;
      const band = img.parentElement.getBoundingClientRect();
      const rect = img.getBoundingClientRect();
      return {
        centreX: Math.round(((rect.left + rect.width / 2 - band.left) / band.width) * 1000) / 10,
        centreY: Math.round(((rect.top + rect.height / 2 - band.top) / band.height) * 1000) / 10,
        zoom: Math.round((rect.width / band.width) * 100) / 100
      };
    });
  }

  // Les deux ecrivent le theme du meme formulaire : lances en parallele, l'un
  // ecraserait le reglage que l'autre vient de poser, et l'echec designerait
  // la mauvaise coupable.
  test.describe('Bannière', () => {
    test.describe.configure({ mode: 'serial' });

    test('la bannière est cadrée à l’identique dans le constructeur et en public', async ({
      page,
      context
    }) => {
      test.skip(!FORM || !SLUG, 'E2E_AUDIT_FORM ou E2E_AUDIT_SLUG non défini');
      test.setTimeout(90_000);

      await patchForm(page, { theme: { ...FRAMING }, status: 'published' });

      await page.goto(`/forms/${FORM}/edit`);
      await page.waitForTimeout(2500);
      const inBuilder = await readFraming(page);

      // Page publique, dans un contexte non connecté : c’est ce que voit un
      // répondant, et la largeur n’y est pas la même — d’où la comparaison sur
      // les valeurs réglées plutôt que sur des pixels.
      const anon = await context.browser()!.newContext();
      const visitor = await anon.newPage();
      await visitor.goto(`${page.url().split('/forms/')[0]}/f/${SLUG}`);
      await visitor.waitForTimeout(2500);
      const onPublic = await readFraming(visitor);
      await anon.close();

      expect(inBuilder, 'bannière visible dans le constructeur').not.toBeNull();
      expect(onPublic, 'bannière visible sur la page publique').not.toBeNull();

      // Le zoom est le plus révélateur : c’est lui que l’ancienne page publique
      // jetait entièrement.
      expect(onPublic!.zoom, 'zoom rendu en public').toBeCloseTo(FRAMING.banner_scale, 1);
      expect(onPublic!.centreX, 'centre horizontal en public').toBeCloseTo(
        FRAMING.banner_position_x,
        0
      );
      expect(onPublic!.centreY, 'centre vertical en public').toBeCloseTo(
        FRAMING.banner_position_y,
        0
      );

      expect(inBuilder!.zoom, 'zoom identique').toBeCloseTo(onPublic!.zoom, 1);
      expect(inBuilder!.centreX, 'centre horizontal identique').toBeCloseTo(onPublic!.centreX, 0);
      expect(inBuilder!.centreY, 'centre vertical identique').toBeCloseTo(onPublic!.centreY, 0);
    });

    test('« Voir entière » ne rogne rien et ne demande aucun réglage', async ({ page }) => {
      test.skip(!SLUG, 'E2E_AUDIT_SLUG non défini');

      // Un zoom absurde est laissé dans le thème exprès : en « Voir entière » il
      // ne doit avoir aucun effet, puisqu’il n’y a rien à cadrer.
      await patchForm(page, {
        theme: { ...FRAMING, banner_fit: 'contain', banner_scale: 2.4 },
        status: 'published'
      });

      await page.goto(`/f/${SLUG}`);
      await page.waitForTimeout(2000);

      const shown = await page.evaluate(() => {
        const img = document.querySelector('img[alt="Bannière"]') as HTMLImageElement | null;
        if (!img?.parentElement) return null;
        const band = img.parentElement.getBoundingClientRect();
        const rect = img.getBoundingClientRect();
        return {
          largeur: Math.round((rect.width / band.width) * 100) / 100,
          // Le bandeau prend la hauteur de l’image : rien ne dépasse, rien ne
          // manque. C’est ce qui fait qu’il n’y a rien à régler.
          hauteur: Math.round((rect.height / band.height) * 100) / 100
        };
      });

      expect(shown, 'bannière visible').not.toBeNull();
      expect(shown!.largeur, 'image montrée sur toute la largeur, sans zoom').toBeCloseTo(1, 1);
      expect(shown!.hauteur, 'bandeau à la hauteur de l’image, rien de rogné').toBeCloseTo(1, 1);
    });

  });

  // ══════════════════════════════════════════════════════════════════════════
  // 1 quater. Les boutons du répondant
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Trois défauts que ces tests empêchent de revenir.
   *
   * 1. **Un bouton « Précédent » là où il n'y a pas de précédent.** Il était
   *    affiché grisé sur la première page. Sur un formulaire d'une seule page —
   *    le cas le plus courant — le répondant voyait donc une flèche de retour
   *    inerte sous la dernière question.
   *
   * 2. **Le bouton d'envoi écrit en dur, en français.** Le réglage « Langue »
   *    promettait de régler « les libellés que Papyrus ajoute lui-même », et ne
   *    réglait rien : un formulaire rédigé en anglais s'envoyait avec un bouton
   *    « Envoyer » et un compteur « 0/2500 caractères ».
   *
   * 3. **Le bouton collé à droite**, sans moyen de le déplacer ni de le nommer.
   */
  test.describe('Boutons du répondant', () => {
    test.describe.configure({ mode: 'serial' });

    /** Où se pose un bouton dans sa rangée. */
    async function placement(page: Page, name: RegExp) {
      return page.evaluate((pattern) => {
        const regex = new RegExp(pattern, 'i');
        const button = [...document.querySelectorAll('button')].find((element) =>
          regex.test((element.textContent ?? '').trim())
        );
        if (!button?.parentElement) return null;

        const row = button.parentElement.getBoundingClientRect();
        const rect = button.getBoundingClientRect();
        const left = rect.left - row.left;
        const right = row.right - rect.right;

        if (Math.abs(left - right) < 12) return 'center';
        return left < right ? 'left' : 'right';
      }, name.source);
    }

    test('aucun bouton de retour quand il n’y a pas de page précédente', async ({ page }) => {
      test.skip(!SLUG, 'E2E_AUDIT_SLUG non défini');

      await patchForm(page, { display_mode: 'sections', status: 'published' });
      await page.goto(`/f/${SLUG}`);
      await page.waitForTimeout(1500);

      // Ni affiché, ni désactivé : absent. Un bouton grisé se justifie quand
      // l'action redeviendra possible ; celle-ci ne le redeviendra jamais.
      await expect(page.getByRole('button', { name: /^(Précédent|Back|Atrás)$/ })).toHaveCount(0);

      // Et « une question à la fois », qui avait le même défaut sur son premier
      // écran.
      await patchForm(page, { display_mode: 'typeform' });
      await page.goto(`/f/${SLUG}`);
      await page.waitForTimeout(1500);
      await expect(page.getByRole('button', { name: /^(Retour|Back|Atrás)$/ })).toHaveCount(0);
    });

    test('l’interface suit la langue du formulaire', async ({ page }) => {
      test.skip(!SLUG, 'E2E_AUDIT_SLUG non défini');

      await patchForm(page, {
        display_mode: 'sections',
        default_language: 'en',
        status: 'published'
      });
      await page.goto(`/f/${SLUG}`);
      await page.waitForTimeout(1500);

      await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Suivant' })).toHaveCount(0);

      await patchForm(page, { default_language: 'fr' });
      await page.goto(`/f/${SLUG}`);
      await page.waitForTimeout(1500);

      await expect(page.getByRole('button', { name: 'Suivant' })).toBeVisible();
    });

    test('le bouton d’envoi porte le texte et la position choisis', async ({ page }) => {
      test.skip(!SLUG, 'E2E_AUDIT_SLUG non défini');

      // Mode « tout sur une page » : le bouton d'envoi y est seul, donc
      // atteignable sans répondre aux questions obligatoires des pages
      // précédentes.
      await patchForm(page, {
        display_mode: 'scroll',
        default_language: 'en',
        status: 'published',
        settings: { submit_align: 'center', submit_label: 'Send my feedback' }
      });
      await page.goto(`/f/${SLUG}`);
      await page.waitForTimeout(1500);

      const custom = page.getByRole('button', { name: 'Send my feedback' });
      await expect(custom).toBeVisible();
      expect(await placement(page, /Send my feedback/)).toBe('center');

      // Sans libellé écrit à la main, c'est le mot de la langue qui revient.
      await patchForm(page, { settings: { submit_align: 'left' } });
      await page.goto(`/f/${SLUG}`);
      await page.waitForTimeout(1500);

      await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
      expect(await placement(page, /Submit/)).toBe('left');

      // Et le réglage historique — à droite — reste le défaut.
      await patchForm(page, { default_language: 'fr', settings: {} });
      await page.goto(`/f/${SLUG}`);
      await page.waitForTimeout(1500);

      await expect(page.getByRole('button', { name: 'Envoyer' })).toBeVisible();
      expect(await placement(page, /Envoyer/)).toBe('right');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 1 quinquies. L'écran de remerciement
  // ══════════════════════════════════════════════════════════════════════════

  test.describe('Écran de remerciement', () => {
    test.describe.configure({ mode: 'serial' });

    /**
     * Le défaut que ces tests empêchent de revenir.
     *
     * `/f/[slug]/merci` dessinait sa PROPRE version de l'écran de remerciement
     * — une pastille, un titre, un message — qui ignorait tout le reste du
     * réglage : l'image, la vidéo, l'animation d'arrivée, la mention sous le
     * numéro et le bouton de fin. L'auteur composait donc un écran dont la
     * moitié disparaissait selon la porte par laquelle on arrivait. C'est
     * exactement le défaut déjà corrigé pour l'aperçu du constructeur ; il
     * vivait encore ici.
     */

    /** Une image minuscule, en `data:` — c'est le rendu qui nous intéresse. */
    const TINY_IMAGE =
      'data:image/svg+xml;base64,' +
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120"><rect width="240" height="120" fill="#2AC2DE"/></svg>'
      ).toString('base64');

    test('l’image de l’auteur s’affiche, et remplace la pastille', async ({ page }) => {
      test.skip(!SLUG, 'E2E_AUDIT_SLUG non défini');

      await patchForm(page, {
        status: 'published',
        confirmation_config: {
          title: { fr: 'Merci !' },
          message: { fr: 'Réponse enregistrée.' },
          media: { kind: 'image', url: TINY_IMAGE, width: 360, alt: { fr: 'Notre équipe' } },
          celebration: 'seal'
        }
      });

      const errors = watchConsole(page);
      await page.goto(`/f/${SLUG}/merci`);
      await page.waitForTimeout(1200);

      await expect(page.getByAltText('Notre équipe')).toBeVisible();
      // Un seul objet en tête : la pastille cède la place au média.
      await expect(page.locator('svg.lucide-check')).toHaveCount(0);

      await expectNoCrash(page);
      expect(errors, 'console de l’écran de remerciement').toEqual([]);
    });

    test('la salve joue une fois, puis se retire', async ({ page }) => {
      test.skip(!SLUG, 'E2E_AUDIT_SLUG non défini');

      await patchForm(page, {
        confirmation_config: { title: { fr: 'Merci !' }, celebration: 'confetti' }
      });

      await page.goto(`/f/${SLUG}/merci`);
      await page.waitForTimeout(300);

      // Elle existe pendant la salve…
      const sparks = page.locator('span.absolute.rounded-\\[2px\\]');
      expect(await sparks.count(), 'éclats pendant la salve').toBeGreaterThan(0);

      // …et rien ne tourne en fond ensuite : une page de remerciement reste
      // parfois ouverte des heures dans un onglet.
      await page.waitForTimeout(2200);
      const opacities = await sparks.evaluateAll((nodes) =>
        nodes.map((node) => Number(getComputedStyle(node).opacity))
      );
      expect(Math.max(0, ...opacities), 'éclats éteints après la salve').toBeLessThan(0.05);
    });

    test('le lien vidéo devient un lecteur, et rien d’autre ne passe', async ({ page }) => {
      test.skip(!SLUG, 'E2E_AUDIT_SLUG non défini');

      await patchForm(page, {
        confirmation_config: {
          title: { fr: 'Merci !' },
          media: { kind: 'embed', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
          celebration: 'none'
        }
      });

      await page.goto(`/f/${SLUG}/merci`);
      await page.waitForTimeout(1200);
      await expect(page.locator('iframe[src*="youtube.com/embed/"]')).toHaveCount(1);

      // Une adresse qui n'est ni YouTube ni Vimeo n'est pas encadrée : la
      // politique de sécurité la bloquerait, et un cadre vide vaut moins que
      // rien du tout.
      await patchForm(page, {
        confirmation_config: {
          title: { fr: 'Merci !' },
          media: { kind: 'embed', url: 'https://exemple.test/video.mp4' }
        }
      });
      await page.goto(`/f/${SLUG}/merci`);
      await page.waitForTimeout(900);
      await expect(page.locator('iframe')).toHaveCount(0);
      await expectNoCrash(page);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. Les onglets d'un projet et d'un formulaire
  // ══════════════════════════════════════════════════════════════════════════

  test('les onglets du projet', async ({ page }) => {
    test.skip(!PROJECT, 'E2E_AUDIT_PROJECT non défini');
    test.setTimeout(120_000);
    const errors = watchConsole(page);

    for (const tab of ['forms', 'records', 'partners', 'insights', 'settings']) {
      await page.goto(`/projects/${PROJECT}?tab=${tab}`);
      await page.waitForTimeout(1800);
      await expectNoCrash(page);
    }

    expect(errors, 'console des onglets de projet').toEqual([]);
  });

  test('les onglets du formulaire', async ({ page }) => {
    test.skip(!PROJECT || !FORM, 'E2E_AUDIT_FORM non défini');
    test.setTimeout(240_000);
    const errors = watchConsole(page);

    const base = `/projects/${PROJECT}/forms/${FORM}`;
    const routes = [
      `${base}?tab=setup&sub=build`,
      `${base}?tab=setup&sub=design`,
      `${base}?tab=setup&sub=pricing`,
      `${base}?tab=setup&sub=email`,
      `${base}?tab=setup&sub=integrations`,
      `${base}?tab=setup&sub=settings`,
      `${base}?tab=records`,
      `${base}?tab=insights`,
      `${base}?tab=share`
    ];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForTimeout(2200);
      await expectNoCrash(page);
    }

    expect(errors, 'console des onglets de formulaire').toEqual([]);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2 bis. L'en-tête du formulaire
  // ══════════════════════════════════════════════════════════════════════════

  test('le titre et la description se modifient là où ils s’affichent', async ({ page }) => {
    test.skip(!FORM || !SLUG, 'E2E_AUDIT_FORM non défini');
    test.setTimeout(180_000);

    /**
     * Le défaut que ce test empêche de revenir.
     *
     * La toile du constructeur ne dessinait que la description, en italique et
     * en corps 14 ; le titre vivait dans la barre d'outils, en corps 18, sans
     * étiquette, dans un champ sans bordure qui se lisait comme un fil
     * d'Ariane. L'auteur voyait un grand titre sur la page publiée et n'avait,
     * dans l'éditeur, rien qui lui ressemble — « ça n'apparaît nulle part ».
     */

    const errors = watchConsole(page);
    const titre = `Revue d’en-tête ${Date.now()}`;
    const description = 'Modifiée depuis la toile, à sa vraie taille.';

    await page.goto(`/forms/${FORM}/edit`);
    await page.waitForTimeout(3000);

    // Les deux se trouvent sur la toile, l'un sous l'autre, et portent un nom.
    const champTitre = page.getByRole('textbox', { name: 'Titre du formulaire' });
    const champDescription = page.getByRole('textbox', { name: 'Description du formulaire' });
    await expect(champTitre).toBeVisible();
    await expect(champDescription).toBeVisible();

    // Ils s'affichent dans la typographie publiée : c'est ce qui fait qu'on
    // les reconnaît. Un titre en corps 18 dans l'éditeur et en corps 36 sur la
    // page ne se reconnaissent pas l'un l'autre.
    const corps = await champTitre.evaluate((node) => {
      const style = getComputedStyle(node);
      return { size: parseFloat(style.fontSize), weight: Number(style.fontWeight) };
    });
    expect(corps.size, 'corps du titre sur la toile').toBeGreaterThanOrEqual(32);
    expect(corps.weight, 'graisse du titre sur la toile').toBeGreaterThanOrEqual(700);

    await champTitre.fill(titre);
    await champDescription.fill(description);
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(2500);

    // Enregistrés : rechargés, ils sont toujours là.
    await page.reload();
    await page.waitForTimeout(3000);
    await expect(page.getByRole('textbox', { name: 'Titre du formulaire' })).toHaveValue(titre);
    await expect(page.getByRole('textbox', { name: 'Description du formulaire' })).toHaveValue(
      description
    );

    // Et publiés : c'est le même composant des deux côtés.
    await patchForm(page, { status: 'published' });
    await page.goto(`/f/${SLUG}`);
    await page.waitForTimeout(1500);
    await expect(page.getByRole('heading', { level: 1, name: titre })).toBeVisible();
    await expect(page.getByText(description)).toBeVisible();

    await expectNoCrash(page);
    expect(errors, 'console de l’en-tête').toEqual([]);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 3. Le constructeur : créer, ajouter, changer de mode, prévisualiser
  // ══════════════════════════════════════════════════════════════════════════

  test('construire un formulaire et basculer entre les trois modes', async ({ page }) => {
    test.setTimeout(300_000);
    const errors = watchConsole(page);

    await page.goto('/forms');
    await page.getByRole('button', { name: /Créer un formulaire/i }).first().click();
    await page.waitForURL(/\/forms\/[0-9a-f-]+\/edit/, { timeout: 30_000 });
    await expectNoCrash(page);

    // Trois familles de rendu : une saisie, un choix (plusieurs contrôles), une
    // note. Ce sont celles que les modes traitent différemment.
    for (const label of ['Réponse courte', 'Choix unique', 'Note']) {
      await page.getByRole('button', { name: new RegExp(`^${label}`) }).first().click();
      await page.waitForTimeout(700);
    }

    await expectNoCrash(page);
    await expect(page.locator('text=Sauvegardé').first()).toBeVisible({ timeout: 25_000 });

    /**
     * Revenir au panneau d'apparence.
     *
     * Ajouter une question la sélectionne, et le panneau de droite montre alors
     * ses réglages. Le sélecteur de mode vit dans le panneau d'apparence, qui
     * ne revient qu'en cliquant le canevas lui-même — pas une carte posée
     * dessus. On vise donc la gouttière, à gauche de la colonne centrale.
     */
    const deselect = async () => {
      const canvas = page.locator('div.flex-1.h-full.overflow-y-auto').first();
      const box = await canvas.boundingBox();
      if (box) await page.mouse.click(box.x + 12, box.y + box.height - 40);
      await page.waitForTimeout(500);
    };

    for (const mode of ['Défilement', 'Une à une', 'Pages']) {
      await deselect();

      await page.getByRole('button', { name: new RegExp(mode) }).first().click();
      await page.waitForTimeout(1200);
      await expectNoCrash(page);

      // Depuis la revue, l'aperçu monte la VRAIE vue publique : ce que l'auteur
      // voit ici est ce que le répondant verra.
      await page.getByRole('button', { name: /Aperçu/ }).first().click();
      await page.waitForTimeout(2200);
      await expectNoCrash(page);

      await expect(
        page.getByRole('button', { name: /Commencer|^Envoyer|Suivant/ }).first()
      ).toBeVisible({ timeout: 10_000 });

      await page.keyboard.press('Escape');
      await page.waitForTimeout(800);
    }

    expect(errors, 'console du constructeur').toEqual([]);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 4. La vue publique, dans les trois modes
  //
  // En série, et non en parallèle : ces tests changent le mode d'affichage du
  // MÊME formulaire. Lancés de front, chacun bascule le formulaire sous les
  // pieds des autres, et l'échec qui en résulte ne dit rien de l'application.
  // ══════════════════════════════════════════════════════════════════════════

  test.describe('Vue publique', () => {
    test.describe.configure({ mode: 'serial' });

  test('formulaire public — tout sur une page', async ({ page }) => {
    test.skip(!SLUG, 'E2E_AUDIT_SLUG non défini');
    await setDisplayMode(page, 'scroll');

    const errors = watchConsole(page);
    expect((await page.goto(`/f/${SLUG}`))?.status()).toBe(200);
    await page.waitForTimeout(1800);
    await expectNoCrash(page);

    // Tout est là d'un coup : la première question comme la dernière.
    await expect(page.getByLabel(/Nom complet/)).toBeVisible();
    await expect(page.getByText('Signature').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Envoyer/ })).toBeVisible();

    expect(errors, 'console du mode défilement').toEqual([]);
  });

  test('formulaire public — une section par page', async ({ page }) => {
    test.skip(!SLUG, 'E2E_AUDIT_SLUG non défini');
    await setDisplayMode(page, 'sections');

    const errors = watchConsole(page);
    await page.goto(`/f/${SLUG}`);
    await page.waitForTimeout(1800);
    await expectNoCrash(page);

    await expect(page.locator('body')).toContainText('Page 1 sur 2');

    // Les obligatoires bloquent le passage : c'est voulu, et c'est vérifié.
    await page.getByRole('button', { name: /Suivant/ }).first().click();
    await page.waitForTimeout(900);
    await expect(page.locator('body')).toContainText('Page 1 sur 2');

    await page.getByLabel(/Nom complet/).fill('Auditrice');
    await page.getByLabel(/Adresse e-mail/).fill('audit@exemple.mu');
    await page.getByRole('button', { name: /Suivant/ }).first().click();
    await page.waitForTimeout(1400);

    await expect(page.locator('body')).toContainText('Page 2 sur 2');
    await expect(page.getByRole('button', { name: /^Envoyer/ })).toBeVisible();

    expect(errors, 'console du mode sections').toEqual([]);
  });

  test('formulaire public — une question à la fois', async ({ page }) => {
    test.skip(!SLUG, 'E2E_AUDIT_SLUG non défini');
    await setDisplayMode(page, 'typeform');

    const errors = watchConsole(page);
    await page.goto(`/f/${SLUG}`);
    await page.waitForTimeout(1800);
    await expectNoCrash(page);

    // L'écran d'accueil annonce un nombre de questions. Il comptait les
    // séparateurs et les champs cachés : « 27 questions » pour vingt-trois.
    const intro = await page.locator('body').innerText();
    const announced = Number(intro.match(/(\d+) questions/)?.[1] ?? 0);
    expect(announced).toBeGreaterThan(0);

    await page.getByRole('button', { name: /Commencer/ }).click();
    await page.waitForTimeout(1000);

    await expect(page.getByLabel(/Nom complet/)).toBeVisible();
    await expect(page.locator('body')).toContainText(`1 / ${announced}`);

    expect(errors, 'console du mode une-à-une').toEqual([]);
  });

  test('aucun écran ne montre le texte destiné à l’auteur', async ({ page }) => {
    test.skip(!SLUG, 'E2E_AUDIT_SLUG non défini');
    test.setTimeout(240_000);
    await setDisplayMode(page, 'typeform');

    const errors = watchConsole(page);
    await page.goto(`/f/${SLUG}`);
    await page.waitForTimeout(1800);
    await page.getByRole('button', { name: /Commencer/ }).click();
    await page.waitForTimeout(800);

    /**
     * « ajoutez-en dans le panneau de droite », « choisissez ce qui doit être
     * compté » : ces phrases s'affichaient sur un formulaire publié, devant
     * quelqu'un qui n'a pas de panneau de droite. Elles viennent de composants
     * partagés entre le constructeur et la vue publique — et le seul endroit
     * où ce défaut se voit est ici, en traversant chaque écran.
     */
    for (let step = 0; step < 40; step += 1) {
      const body = await page.locator('body').innerText();

      expect(body, `écran ${step + 1}`).not.toContain('panneau de droite');
      expect(body, `écran ${step + 1}`).not.toContain('Aucune source');
      expect(body, `écran ${step + 1}`).not.toContain('Aucune sous-question');

      const next = page.getByRole('button', { name: /^Suivant/ });
      if (!(await next.count())) break;

      const required = page.locator('input[required]:visible, textarea[required]:visible').first();
      if (await required.count()) await required.fill('audit@exemple.mu').catch(() => {});

      await next.first().click();
      await page.waitForTimeout(500);
    }

    expect(errors, 'console du parcours complet').toEqual([]);
  });

  test('un formulaire clos s’explique au lieu de planter', async ({ page }) => {
    test.skip(!SLUG, 'E2E_AUDIT_SLUG non défini');

    /**
     * Il répondait 500.
     *
     * `ClosedFormPage` est un composant SERVEUR ; il passait deux rappels vides
     * à `FormHeader`, qui est un composant client. Next refuse de sérialiser une
     * fonction à travers cette frontière, et la page échouait — pour deux
     * fonctions que l'en-tête, en mode aperçu, n'appelle jamais. Le jour où un
     * formulaire atteignait sa date de clôture, ses visiteurs recevaient une
     * erreur serveur au lieu du message rédigé par l'auteur.
     */
    const errors = watchConsole(page);

    await patchForm(page, { closes_at: new Date(Date.now() - 3_600_000).toISOString() });

    try {
      const response = await page.goto(`/f/${SLUG}`);
      expect(response?.status(), 'la page répond').toBe(200);
      await expectNoCrash(page);
      // L'apostrophe vient du message par défaut : droite ici, courbe ailleurs.
      await expect(page.locator('body')).toContainText(/n['’]accepte plus de r|ferm/i);
      expect(errors, 'console du formulaire clos').toEqual([]);
    } finally {
      await patchForm(page, { closes_at: null });
    }
  });

  test('le QR code est dessiné, pas emprunté', async ({ page }) => {
    test.skip(!PROJECT || !FORM, 'formulaire d’essai non défini');

    /**
     * Il venait d'`api.qrserver.com` et ne s'affichait jamais : la politique de
     * sécurité de contenu n'autorise `img-src` que pour nos propres domaines,
     * donc le navigateur bloquait l'image sans un mot. Il est désormais calculé
     * dans le navigateur, en `data:`.
     */
    const errors = watchConsole(page);

    await page.goto(`/projects/${PROJECT}/forms/${FORM}?tab=share`);
    await page.waitForTimeout(3000);

    const qr = page.locator('img[alt="QR code du formulaire"]');
    await expect(qr).toBeVisible({ timeout: 10_000 });
    await expect(qr).toHaveAttribute('src', /^data:image\//);

    const box = await qr.boundingBox();
    expect(box?.width ?? 0, 'le QR occupe la place prévue').toBeGreaterThan(150);

    expect(errors, 'console de l’onglet Partage').toEqual([]);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 5. Répondre pour de vrai, et retrouver la réponse
  // ══════════════════════════════════════════════════════════════════════════

  test('une réponse envoyée arrive dans l’onglet Réponses', async ({ page }) => {
    test.skip(!SLUG || !FORM || !PROJECT, 'formulaire d’essai non défini');
    test.setTimeout(240_000);
    await setDisplayMode(page, 'scroll');

    const errors = watchConsole(page);
    const marker = `Auditrice ${Date.now()}`;

    await page.goto(`/f/${SLUG}`);
    await page.waitForTimeout(1800);

    await page.getByLabel(/Nom complet/).fill(marker);
    await page.getByLabel(/Adresse e-mail/).fill(`audit+${Date.now()}@exemple.mu`);
    await page.getByRole('button', { name: /^Envoyer/ }).click();

    await expect(page.getByText(/merci|enregistr/i).first()).toBeVisible({ timeout: 25_000 });
    await expectNoCrash(page);

    await page.goto(`/projects/${PROJECT}/forms/${FORM}?tab=records`);
    await page.waitForTimeout(3500);
    await expectNoCrash(page);
    await expect(page.locator('body')).toContainText(marker, { timeout: 25_000 });

    expect(errors, 'console du parcours de réponse').toEqual([]);
  });
  });
});
