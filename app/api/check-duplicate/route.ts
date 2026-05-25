import { NextResponse } from 'next/server';
import { IS_LOCAL_MODE } from '@/lib/mode';

/**
 * Vérifie si un email a déjà soumis ce formulaire (toggle "Un seul envoi par personne").
 *
 * En mode local : pas de back-end, donc on regarde un store local (ou on répond toujours
 * `duplicate: false`). Quand Supabase sera branché, la requête ira sur la table `submissions`
 * et matchera form_id + respondent_email.
 *
 * Requête : POST { form_id: string, email: string }
 * Réponse : { duplicate: boolean }
 */
export async function POST(req: Request) {
  let body: { form_id?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide.' }, { status: 400 });
  }

  const { form_id, email } = body;
  if (!form_id || !email) {
    return NextResponse.json(
      { error: 'form_id et email sont requis.' },
      { status: 400 }
    );
  }

  if (IS_LOCAL_MODE) {
    // En local, pas de back-end : on ne peut pas savoir. On renvoie false (non doublon).
    // Le navigateur peut faire son propre check via localStorage si besoin.
    return NextResponse.json({ duplicate: false, mode: 'local' });
  }

  // TODO : quand Supabase sera branché —
  // const supabase = createServerClient(...);
  // const { count } = await supabase
  //   .from('submissions')
  //   .select('id', { count: 'exact', head: true })
  //   .eq('form_id', form_id)
  //   .eq('respondent_email', email.toLowerCase().trim());
  // return NextResponse.json({ duplicate: (count ?? 0) > 0 });

  return NextResponse.json({ duplicate: false, mode: 'stub' });
}
