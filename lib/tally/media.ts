import 'server-only';

import type { Field } from '@/types';
import { putObject } from '@/lib/storage/r2';

/**
 * Rapatrie les images d'un formulaire Tally dans notre stockage.
 *
 * **Garder l'adresse d'origine ne marche pas, et pas seulement par principe.**
 * La politique de sécurité de la page n'autorise les images que depuis nos
 * propres domaines : une adresse Tally donne une vignette cassée, sans erreur
 * visible, sur le formulaire comme dans le constructeur. Et une image importée
 * qui disparaîtrait le jour où le formulaire Tally est supprimé n'est pas
 * vraiment importée.
 *
 * Les échecs ne font pas échouer l'import : une image manquante vaut mieux
 * qu'un formulaire de quarante questions et cinq cents réponses perdu pour une
 * vignette.
 */

const MAX_IMAGES = 20;
const MAX_BYTES = 10 * 1024 * 1024;
const TIMEOUT_MS = 15_000;

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif'
};

export async function mirrorTallyImages(
  fields: Field[],
  warnings: string[]
): Promise<void> {
  const targets = fields.filter(
    (field) =>
      (field.type === 'image' || field.type === 'video') &&
      typeof field.validation?.media_url === 'string' &&
      /^https?:\/\//i.test(field.validation.media_url)
  );

  if (targets.length === 0) return;

  let copied = 0;
  let failed = 0;

  for (const field of targets.slice(0, MAX_IMAGES)) {
    // Une vidéo intégrée (YouTube, Vimeo) reste un lien : c'est un lecteur, pas
    // un fichier, et le cadre l'accepte déjà.
    if (field.type === 'video') continue;

    try {
      const mirrored = await fetchImage(field.validation.media_url as string);
      if (!mirrored) {
        failed += 1;
        continue;
      }
      field.validation.media_url = mirrored;
      copied += 1;
    } catch {
      failed += 1;
    }
  }

  if (targets.length > MAX_IMAGES) {
    failed += targets.length - MAX_IMAGES;
  }

  if (copied > 0) {
    warnings.push(
      `${copied} image${copied > 1 ? 's ont été recopiées' : ' a été recopiée'} depuis Tally dans votre espace.`
    );
  }
  if (failed > 0) {
    warnings.push(
      `${failed} image${failed > 1 ? 's n’ont' : ' n’a'} pas pu être récupérée${failed > 1 ? 's' : ''} depuis Tally : le champ reste, l’image est à remettre.`
    );
  }
}

async function fetchImage(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) return null;

    const type = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const extension = EXTENSIONS[type];
    if (!extension) return null;

    const length = Number(response.headers.get('content-length') ?? 0);
    if (length > MAX_BYTES) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) return null;

    const { publicUrl } = await putObject(buffer, type, extension, 'tally');
    return publicUrl;
  } finally {
    clearTimeout(timeout);
  }
}
