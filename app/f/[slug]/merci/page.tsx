import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicForm } from '@/lib/public-form';
import { ThankYouPage } from '@/components/public/ThankYouPage';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Page de remerciement accessible par lien direct.
 *
 * Le parcours normal affiche l'écran de remerciement sans changer d'URL (il
 * peut porter le score du répondant). Cette page couvre le cas d'un accès
 * direct, par exemple depuis un signet.
 *
 * **Elle monte le vrai écran, elle ne le recopie plus.** Elle en dessinait
 * auparavant sa propre version — une pastille, un titre, un message — qui
 * ignorait tout le reste du réglage : l'image, la vidéo, l'animation
 * d'arrivée, la mention sous le numéro et le bouton de fin. L'auteur composait
 * donc un écran de remerciement dont la moitié disparaissait selon la porte
 * par laquelle on arrivait. C'est le défaut qu'on avait déjà corrigé pour
 * l'aperçu du constructeur ; il vivait encore ici.
 *
 * Ce qui reste propre à cette page : ni jeton `{{…}}` résolu, ni numéro de
 * commande — arrivé par un signet, personne ne sait de quelle réponse il
 * s'agit. Les deux tombent d'eux-mêmes, faute de réponses et de numéro à
 * passer.
 */
export default async function ThankYouRoute({ params }: PageProps) {
  const { slug } = await params;
  const form = await getPublicForm(slug);

  if (!form) notFound();

  return (
    <div className="relative">
      <ThankYouPage form={form} submissionId={null} invoiceNumber={null} responses={{}} />

      {/* L'écran de remerciement occupe toute la hauteur de la fenêtre : posé
          à sa suite dans le flux, ce lien tombait sous la ligne de flottaison
          d'une page qui, elle, tient à l'écran. Il s'ancre donc en bas. */}
      <div className="absolute inset-x-0 bottom-6 text-center">
        <Link
          href={`/f/${form.slug}`}
          className="text-xs text-text-tertiary underline underline-offset-4 transition hover:text-text-secondary"
        >
          Retour au formulaire
        </Link>
      </div>
    </div>
  );
}
