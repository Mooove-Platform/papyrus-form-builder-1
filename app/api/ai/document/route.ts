import { NextResponse } from 'next/server';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { MAX_IMAGE_BYTES, putObject } from '@/lib/storage/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Ce qu'on joint à l'assistant — un brouillon à lire, ou une image à regarder.
 *
 * **Deux natures de pièce jointe, et c'est le point.** Un PDF, un DOCX, un TXT
 * rendent du texte, que l'assistant reçoit comme s'il avait été tapé. Une
 * image, elle, est déposée sur R2 et son adresse est rendue : l'assistant la
 * REGARDE. C'est ce qui permet de lui envoyer une bannière et de lui dire
 * « pose-la en en-tête et accorde le thème à ses couleurs ».
 *
 * Avant, cette route refusait toute image — « Format non pris en charge » —
 * alors que c'est le fichier qu'on a le plus envie de lui donner. Le sélecteur
 * de fichiers ne les proposait même pas.
 *
 * Elle ne construit rien dans les deux cas : c'est le planificateur qui décide
 * ensuite quels outils appeler.
 *
 * C'est tout ce qui reste de l'ancienne route `/api/generate-form`, qui
 * envoyait ce même texte à un modèle en lui demandant un objet JSON complet et
 * l'importait tel quel. Elle avait une limite de 3 000 caractères et une
 * seconde voie où l'on collait à la main le JSON produit par son propre
 * ChatGPT. Les deux ont disparu : un schéma écrit par un modèle est un schéma
 * que personne n'a validé.
 */

/** Taille maximale d'un document. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Longueur maximale du texte rendu.
 *
 * 40 000 caractères, contre 3 000 auparavant : la limite d'alors venait du
 * modèle gratuit employé, pas du besoin. Un cahier des charges de dix pages
 * tient ici, et c'est justement le document qu'on veut transformer en
 * formulaire.
 */
const MAX_TEXT_LENGTH = 40_000;

export async function POST(request: Request) {
  const {
    data: { user }
  } = await createClient().auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const limit = rateLimit(`ai-document:${user.id}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Trop de documents d’affilée. Patientez un instant.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Fichier trop volumineux (maximum ${MAX_UPLOAD_BYTES / 1024 / 1024} Mo).` },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  /**
   * Une image part sur R2 et revient sous forme d'adresse.
   *
   * Elle ne transite pas en base64 dans la conversation : une bannière de deux
   * mégaoctets encodée pèserait presque trois, à chaque tour, et l'assistant
   * doit de toute façon pouvoir passer cette adresse à `set_banner` — donc
   * elle doit être publique et durable. R2 remplit les deux rôles d'un coup.
   */
  const imageMime = IMAGE_MIME[extensionOf(name)] ?? (file.type.startsWith('image/') ? file.type : null);

  if (imageMime) {
    if (imageMime === 'image/svg+xml') {
      // Un SVG est un document exécutable : il peut porter du script, et le
      // modèle ne saurait pas le lire de toute façon. Il reste accepté comme
      // bannière par le téléversement du constructeur, pas ici.
      return NextResponse.json(
        {
          error:
            'Le SVG ne peut pas être regardé par l’assistant. Exportez-le en PNG ou en JPG, ou posez-le en bannière depuis le panneau Bannière.'
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `Image trop volumineuse (maximum ${MAX_IMAGE_BYTES / 1024 / 1024} Mo).` },
        { status: 413 }
      );
    }

    try {
      const { publicUrl } = await putObject(
        buffer,
        imageMime,
        extensionOf(name) || 'png',
        'assistant'
      );

      return NextResponse.json({ kind: 'image', url: publicUrl, filename: file.name });
    } catch (error) {
      console.error('Dépôt de l’image de l’assistant échoué:', error);

      // Une variable R2 absente n'est pas une panne passagère, et « réessayez »
      // ferait réessayer indéfiniment. On distingue les deux : `getR2Config`
      // nomme la variable manquante dans son message, et lui seul.
      const misconfigured =
        error instanceof Error && /R2_[A-Z_]+/.test(error.message);

      return NextResponse.json(
        {
          error: misconfigured
            ? 'Le stockage des images n’est pas configuré sur ce serveur. Prévenez un administrateur.'
            : 'L’image n’a pas pu être déposée. Réessayez dans un instant.'
        },
        { status: misconfigured ? 503 : 502 }
      );
    }
  }

  let text = '';

  try {
    if (name.endsWith('.pdf') || file.type === 'application/pdf') {
      text = await readPdf(buffer);
    } else if (
      name.endsWith('.docx') ||
      file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      text = (await mammoth.extractRawText({ buffer })).value ?? '';
    } else if (
      name.endsWith('.txt') ||
      name.endsWith('.md') ||
      name.endsWith('.rtf') ||
      file.type.startsWith('text/')
    ) {
      text = buffer.toString('utf-8');
    } else {
      return NextResponse.json(
        {
          error:
            'Format non pris en charge. Joignez une image (PNG, JPG, WebP), ou un document (PDF, DOCX, TXT, MD).'
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Extraction de document échouée:', error);
    return NextResponse.json(
      { error: 'Le texte de ce fichier n’a pas pu être lu. Il est peut-être scanné ou protégé.' },
      { status: 422 }
    );
  }

  const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  if (!cleaned) {
    /**
     * Le cas le plus fréquent, et le moins évident : un PDF exporté depuis un
     * outil de design. Il est fait d'images, il ne contient pas une lettre de
     * texte, et l'ancien message — « il faudrait le retaper » — était un
     * conseil absurde quand ce qu'on voulait, justement, c'était le montrer.
     */
    return NextResponse.json(
      {
        error:
          'Ce document ne contient aucun texte : c’est probablement un visuel. Exportez-le en PNG ou en JPG et joignez-le à nouveau — l’assistant saura alors le regarder.'
      },
      { status: 422 }
    );
  }

  return NextResponse.json({
    text: cleaned.slice(0, MAX_TEXT_LENGTH),
    // Dit plutôt que caché : un cahier des charges tronqué produirait un
    // formulaire incomplet, et l'auteur doit pouvoir s'en apercevoir avant de
    // le publier.
    truncated: cleaned.length > MAX_TEXT_LENGTH,
    characters: cleaned.length,
    filename: file.name
  });
}

/** Les images que le modèle sait regarder, par extension. */
const IMAGE_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  svg: 'image/svg+xml'
};

/** L'extension d'un nom de fichier, en minuscules et sans le point. */
function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? '' : filename.slice(dot + 1).toLowerCase();
}

async function readPdf(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse charge son worker depuis node_modules : en build standalone il
    // faut lui donner un chemin absolu résolu à l'exécution.
    const workerPath = path.join(
      process.cwd(),
      'node_modules',
      'pdfjs-dist',
      'legacy',
      'build',
      'pdf.worker.mjs'
    );
    PDFParse.setWorker(pathToFileURL(workerPath).toString());
  } catch (error) {
    console.warn('Worker PDF local introuvable:', error);
  }

  const parsed = await new PDFParse({ data: buffer }).getText();
  return parsed.text ?? '';
}
