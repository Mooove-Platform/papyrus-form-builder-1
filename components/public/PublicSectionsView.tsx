'use client';

import { useState, useEffect, useRef } from 'react';
import type { Form, Field } from '@/types';
import type { ScoreResult } from '@/lib/scoring';
import type { EmbedOptions } from '@/lib/embed';
import { FormHeader } from '@/components/builder/FormHeader';
import { ScoreDisplay } from '@/components/respondent/ScoreDisplay';
import { PublicFieldCard } from './PublicFieldCard';
import { PricingSummary } from './PricingSummary';
import { buildPages } from '@/lib/sections';
import { cn } from '@/lib/utils';
import { submitAlignClass, submitLabel } from '@/lib/respondent-ui';
import { useRespondentStrings } from './respondent-strings';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

interface Props {
  form: Form;
  responses: Record<string, any>;
  updateResponse: (fieldId: string, response: any) => void;
  visibleFields: Set<string>;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  validateRequiredFields: () => { isValid: boolean; missingFields: Field[] };
  scoreResult?: ScoreResult;
  showScoreToRespondent?: boolean;
  embed?: EmbedOptions;
  /**
   * Force la mise en page téléphone, pour le cadre étroit de l'aperçu.
   *
   * La vraie page publique ne le passe pas : elle s'appuie sur les points de
   * rupture CSS, qui regardent la fenêtre.
   */
  mobile?: boolean;
}

/** Types de question pour lesquels un clic vaut réponse définitive. */
const AUTO_JUMP_TYPES = ['single_choice', 'dropdown', 'rating', 'nps'];

export function PublicSectionsView({
  form,
  responses,
  updateResponse,
  visibleFields,
  onSubmit,
  isSubmitting,
  validateRequiredFields,
  scoreResult,
  showScoreToRespondent,
  embed,
  mobile
}: Props) {
  const fields = form.fields?.filter(f => visibleFields.has(f.id)) || [];

  /**
   * Une section dont tous les champs sont masqués par la logique ne fait pas une
   * page : le répondant tomberait sur un écran vide, avec pour seul recours le
   * bouton « Suivant ». Elle est donc écartée du parcours.
   *
   * Le repli garde la première section quand plus rien n'est visible : mieux
   * vaut une page vide que zéro page, où il ne resterait aucun bouton pour
   * envoyer le formulaire.
   */
  const allPages = buildPages({ sections: form.sections, fields });
  const populated = allPages.filter((page) => page.fields.length > 0);
  const pages = populated.length > 0 ? populated : allPages.slice(0, 1);

  const [pageIdx, setPageIdx] = useState(0);

  useEffect(() => {
    // Intégré dans un site tiers, faire défiler la page hôte serait intrusif :
    // le répondant verrait la page de son hôte sauter en haut à chaque étape.
    if (embed?.enabled) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pageIdx, embed?.enabled]);

  const total = pages.length;

  // Le nombre de pages peut diminuer sous les pieds du répondant : une règle
  // conditionnelle qui masque les derniers champs supprime la page qui les
  // portait. Sans ce recadrage, `pages[pageIdx]` vaut undefined et le répondant
  // se retrouve devant une page vide, sans bouton pour avancer.
  useEffect(() => {
    if (pageIdx > total - 1) setPageIdx(Math.max(0, total - 1));
  }, [pageIdx, total]);

  const currentPage = pages[Math.min(pageIdx, total - 1)];
  const progress = total > 0 ? ((pageIdx + 1) / total) * 100 : 0;
  const isLast = pageIdx === total - 1;
  const isFirst = pageIdx === 0;

  /** Il n'y a un « précédent » que s'il existe une page derrière. */
  const canGoBack = !isFirst;

  const strings = useRespondentStrings();
  const settings = form.settings ?? {};

  // Une section sans titre ne montre pas d'entête : c'est le cas de la section
  // d'ouverture d'un formulaire qui commence directement par ses questions.
  const pageHeader = currentPage?.title?.fr ? currentPage : null;
  const pageFields = currentPage?.fields ?? [];

  /**
   * Passage automatique à la page suivante.
   *
   * Comme chez Tally, l'option ne s'applique qu'à une page ne contenant qu'une
   * seule question à réponse unique : sur une page à plusieurs champs, avancer
   * dès la première réponse ferait perdre les suivantes. La dernière page est
   * exclue — envoyer un formulaire sans que le répondant ait cliqué serait
   * franchement hostile.
   */
  const autoJumpField =
    form.settings?.auto_jump === true &&
    !isLast &&
    pageFields.length === 1 &&
    AUTO_JUMP_TYPES.includes(pageFields[0].type)
      ? pageFields[0]
      : null;

  const autoJumpTimer = useRef<number | null>(null);

  const handleAnswer = (fieldId: string, value: unknown) => {
    updateResponse(fieldId, value);

    if (!autoJumpField || autoJumpField.id !== fieldId) return;
    if (value === undefined || value === null || value === '') return;

    if (autoJumpTimer.current) window.clearTimeout(autoJumpTimer.current);
    // Court délai : le répondant doit voir son choix se cocher avant que la page
    // ne change, sans quoi l'interface paraît avoir décidé à sa place.
    autoJumpTimer.current = window.setTimeout(() => {
      setPageIdx(i => Math.min(total - 1, i + 1));
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (autoJumpTimer.current) window.clearTimeout(autoJumpTimer.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLast) {
      // Validation finale
      const validation = validateRequiredFields();
      if (!validation.isValid) {
        const fieldNames = validation.missingFields.map(f => f.label.fr || 'Champ sans nom').join(', ');
        toast.error(`Veuillez remplir les champs obligatoires : ${fieldNames}`);
        return;
      }

      await onSubmit();
    } else {
      // Aller à la page suivante
      setPageIdx(i => Math.min(total - 1, i + 1));
    }
  };

  return (
    <div className={embed?.enabled ? 'w-full' : 'min-h-screen'}>
      {/* Barre de progression */}
      <div className="sticky top-0 z-50 bg-white border-b border-border">
        <div
          className="h-2 bg-accent transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
        <div className="px-8 py-4">
          <p className="text-sm text-text-secondary text-center">
            {strings.pageOf(pageIdx + 1, total)}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className={cn('max-w-2xl px-8 py-8', embed?.alignLeft ? 'mr-auto' : 'mx-auto')}
      >

        {/* Header de formulaire (seulement sur la première page) */}
        {isFirst && !embed?.hideTitle && (
          <div className="mb-8">
            <FormHeader
              theme={form.theme}
              selectedElement={null}
              preview={true}
            />
            <header className="mb-8">
              <h1 className="font-display text-4xl text-text-primary">{form.title}</h1>
              {form.description && (
                <p
                  className="papyrus-meta mt-2 text-base"
                  style={{ color: form.theme.text_color ?? 'var(--fg-secondary)' }}
                >
                  {form.description}
                </p>
              )}
            </header>
          </div>
        )}

        {/* Header de section */}
        {pageHeader && (
          <div className="mb-8">
            <h2 className="font-display text-2xl text-text-primary">
              {pageHeader.title.fr}
            </h2>
            {pageHeader.description.fr && (
              <p className="papyrus-meta mt-2 text-base">
                {pageHeader.description.fr}
              </p>
            )}
          </div>
        )}

        {/* Champs de la page courante */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {pageFields.map((field) => {
            const span = (field.layout_width ?? 'full') === 'full' ? 'col-span-2' : 'col-span-1';
            return (
              <PublicFieldCard
                key={field.id}
                field={field}
                form={form}
                span={span}
                mobile={mobile}
                responses={responses}
                updateResponse={handleAnswer}
              />
            );
          })}
        </div>

        {/* Score (sur la dernière page) */}
        {isLast && showScoreToRespondent && scoreResult && scoreResult.maxScore > 0 && (
          <div className="mb-8">
            <ScoreDisplay
              scoreResult={scoreResult}
              scoreLabel={form.theme.score_label}
              scoreDescription={form.theme.score_description}
            />
          </div>
        )}

        {/* Récapitulatif chiffré — sur la dernière page, là où l'on envoie.
            L'afficher plus tôt annoncerait un total que les pages suivantes
            feraient encore bouger. */}
        {isLast && (
          <div className="mb-8">
            <PricingSummary form={form} responses={responses} updateResponse={updateResponse} />
          </div>
        )}

        {/*
          Navigation.

          **Le bouton « Précédent » n'existe plus sur la première page.** Il y
          était, grisé et inerte : sur un formulaire d'une seule page — le cas
          le plus courant — le répondant voyait donc une flèche de retour qui
          ne menait nulle part, juste sous la dernière question. Un bouton
          désactivé se justifie quand l'action redeviendra possible ; ici, elle
          ne le redeviendra jamais.

          L'alignement suit le réglage de l'auteur, et c'est la rangée entière
          qui bascule : centrer l'envoi sans rien d'autre à sa gauche laisserait
          un bouton pendu à droite d'un vide.
        */}
        <div
          className={cn(
            'flex items-center gap-3',
            canGoBack ? 'justify-between' : submitAlignClass(settings.submit_align)
          )}
        >
          {canGoBack && (
            <button
              type="button"
              onClick={() => setPageIdx((i) => Math.max(0, i - 1))}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-bg-elevated"
            >
              <ArrowLeft className="h-4 w-4" />
              {strings.previous}
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition',
              'bg-accent text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isLast ? (
              isSubmitting ? (
                strings.submitting
              ) : (
                submitLabel(settings.submit_label, strings)
              )
            ) : (
              <>
                {strings.next}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}