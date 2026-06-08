'use client';

import { useState, useEffect, type FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { IS_LOCAL_MODE } from '@/lib/mode';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // En mode local : pas de connexion nécessaire, on redirige direct
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
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // Vérifier s'il y a une URL d'invitation en attente
    const inviteRedirect = sessionStorage.getItem('redirect_after_login');
    if (inviteRedirect) {
      sessionStorage.removeItem('redirect_after_login');
      router.push(inviteRedirect);
      router.refresh();
      return;
    }

    const redirect = searchParams.get('redirect') || '/dashboard';
    router.push(redirect);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl">Connexion à Papyrus</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          name="email"
          label="Email"
          placeholder="vous@mooove.live"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          name="password"
          label="Mot de passe"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}
        <Button type="submit" className="w-full" loading={loading}>
          Se connecter
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Pas encore de compte ?{' '}
        <Link href="/signup" className="text-accent-bold underline-offset-4 hover:underline">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto w-full max-w-sm text-center">
        <p className="papyrus-meta text-sm">Chargement…</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
