import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { decodeState, exchangeCode, fetchGoogleEmail } from '@/lib/google/oauth';
import { saveGoogleCredentials } from '@/lib/google/credentials';
import { getBaseUrl } from '@/lib/base-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Retour de l'écran de consentement Google.
 *
 * Le `state` est vérifié avant tout : sans cette signature, n'importe quel site
 * pourrait faire rattacher un compte Google à un espace de travail choisi par
 * lui. On revalide malgré tout l'appartenance à l'espace côté serveur — un
 * `state` légitime peut avoir été émis pour un utilisateur qui a depuis quitté
 * l'équipe.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  /**
   * L'adresse publique de l'application, jamais celle vue par le serveur.
   *
   * Derrière le proxy d'Easypanel, Next écoute sur `0.0.0.0:80` et c'est cette
   * adresse-là qu'il reconstruit dans `request.url`. La redirection de retour
   * envoyait donc le navigateur sur `https://0.0.0.0:80/forms/…`, qui n'existe
   * nulle part : `ERR_ADDRESS_INVALID`, juste après avoir accordé l'accès à
   * Drive. Le compte Google était bel et bien rattaché — c'est le retour à
   * l'écran qui échouait, ce qui donnait l'impression que la connexion avait
   * raté.
   *
   * `getBaseUrl` existait déjà, écrit pour ce défaut précis, et corrigeait le
   * retour de connexion. Cette route-ci ne l'avait jamais appelé.
   */
  const origin = getBaseUrl(request);

  const errorParam = url.searchParams.get('error');
  const code = url.searchParams.get('code');
  const state = decodeState(url.searchParams.get('state'));

  const back = (params: Record<string, string>) => {
    const target = new URL(
      state?.formId ? `/forms/${state.formId}` : '/settings/integrations',
      origin
    );
    if (state?.formId) target.searchParams.set('tab', 'integrations');
    Object.entries(params).forEach(([key, value]) => target.searchParams.set(key, value));
    return NextResponse.redirect(target);
  };

  if (errorParam) {
    return back({ google: 'refused' });
  }

  if (!state || !code) {
    return back({ google: 'invalid_state' });
  }

  // L'utilisateur revenu de Google doit être celui qui a lancé la connexion.
  const {
    data: { user }
  } = await createClient().auth.getUser();

  if (!user || user.id !== state.userId) {
    return back({ google: 'invalid_state' });
  }

  const { data: membership } = await createAdminClient()
    .from('team_members')
    .select('role')
    .eq('team_id', state.teamId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    return back({ google: 'forbidden' });
  }

  try {
    const tokens = await exchangeCode(code);

    if (!tokens.refresh_token) {
      // Sans refresh token, la connexion expirerait au bout d'une heure sans
      // moyen de la renouveler. `prompt=consent` est censé l'éviter.
      return back({ google: 'no_refresh_token' });
    }

    const email = await fetchGoogleEmail(tokens.access_token);

    await saveGoogleCredentials({
      teamId: state.teamId,
      refreshToken: tokens.refresh_token,
      email,
      scopes: tokens.scope ?? '',
      userId: user.id
    });

    return back({ google: 'connected' });
  } catch (error) {
    console.error('Callback Google échoué:', error);
    return back({ google: 'error' });
  }
}
