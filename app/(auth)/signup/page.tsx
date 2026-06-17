'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { IS_LOCAL_MODE } from '@/lib/mode';
import { getBaseUrl } from '@/lib/utils';

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (IS_LOCAL_MODE) router.replace('/dashboard');
  }, [router]);

  if (IS_LOCAL_MODE) {
    return (
      <div className="mx-auto w-full max-w-sm text-center">
        <p className="papyrus-meta text-sm">Mode local — redirection en cours…</p>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();

    // Déterminer l'URL de redirection après confirmation
    const inviteRedirect = sessionStorage.getItem('redirect_after_signup');
    const baseUrl = getBaseUrl();
    let emailRedirectTo = `${baseUrl}/confirm`;

    if (inviteRedirect) {
      // Inclure l'URL d'invitation dans les paramètres de redirection
      emailRedirectTo = `${baseUrl}/confirm?redirect=${encodeURIComponent(inviteRedirect)}`;
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { team_name: 'Mon espace' },
        emailRedirectTo
      }
    });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Si "Confirm email" est désactivé dans Supabase, session est directement disponible
    if (signUpData.session) {
      const redirectTo = inviteRedirect || '/dashboard';
      router.replace(redirectTo);
      return;
    }

    // Sinon, "Confirm email" est actif → afficher l'écran de confirmation
    setEmailSent(true);
    setLoading(false);
  }

  // Affichage après envoi de l'email de confirmation
  if (emailSent) {
    return (
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-mooove-cyan/10">
            <svg className="h-8 w-8 text-mooove-cyan" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="font-display text-3xl">Confirmez votre email</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Un email de confirmation a été envoyé à <strong>{email}</strong>
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-papyrus-surface border border-papyrus-border p-4 text-sm">
            <p className="mb-2">
              <strong>Prochaines étapes :</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 text-text-secondary">
              <li>Ouvrez votre boîte mail</li>
              <li>Cliquez sur le lien de confirmation</li>
              <li>Votre compte sera activé et vous pourrez vous connecter</li>
            </ol>
          </div>

          <Button
            onClick={() => setEmailSent(false)}
            variant="ghost"
            className="w-full"
          >
            Retour à l'inscription
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-accent-bold underline-offset-4 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl">Créez votre Papyrus.</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        <Input
          type="email"
          name="email"
          label="Email"
          autoComplete="email"
          placeholder="vous@mooove.live"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          name="password"
          label="Mot de passe"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="8 caractères minimum"
          minLength={8}
        />
        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}
        <Button type="submit" variant="cta" className="w-full" loading={loading}>
          Créer mon compte
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Déjà un compte ?{' '}
        <Link href="/login" className="text-accent-bold underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
