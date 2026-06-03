import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Form } from '@/types';
import { Check } from 'lucide-react';

interface PageProps {
  params: {
    slug: string;
  };
}

async function getFormBySlug(slug: string): Promise<Form | null> {
  const supabase = createClient();
  const { data: form, error } = await supabase
    .from('forms')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return form;
}

export default async function ThankYouPage({ params }: PageProps) {
  const form = await getFormBySlug(params.slug);

  if (!form) {
    notFound();
  }

  const accentColor = form.theme?.accent || '#052139';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-base p-6 text-center">
      <div className="mx-auto w-full max-w-md space-y-6 rounded-lg border border-border bg-bg-surface p-8 shadow-sm">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: accentColor }}
        >
          <Check className="h-8 w-8 text-white" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-semibold text-text-primary">
            Merci pour votre réponse !
          </h1>
          <p className="text-sm text-text-secondary">
            Nous avons bien reçu vos informations et vous remercions de votre participation.
          </p>
        </div>
        <div className="pt-4 border-t border-border">
          <Link href={`/f/${form.slug}`} className="inline-block text-xs text-text-tertiary hover:text-text-secondary transition underline underline-offset-4">
            Retour au formulaire
          </Link>
        </div>
      </div>
    </div>
  );
}
