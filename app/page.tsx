import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Texture parchemin subtile */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 10%, rgba(212,184,150,0.25), transparent 40%), radial-gradient(circle at 80% 70%, rgba(246,146,62,0.10), transparent 50%)'
        }}
      />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-mooove-navy text-mooove-ice">
            <span className="font-display text-lg italic">P</span>
          </div>
          <span className="font-display text-xl">Papyrus</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/dashboard"
            className="rounded-md bg-mooove-navy px-4 py-2 text-mooove-ice transition hover:opacity-90"
          >
            Ouvrir l&apos;app
          </Link>
        </nav>
      </header>

      <section className="relative mx-auto max-w-4xl px-6 pt-20 pb-32 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong/60 bg-bg-surface px-3 py-1 text-xs text-text-secondary">
          <Sparkles className="h-3 w-3 text-accent-warm" />
          <span className="papyrus-meta not-italic">i. Beta privée — Mooove</span>
        </span>

        <h1 className="mt-6 font-display text-6xl leading-[1.05] tracking-tight md:text-7xl">
          Le formulaire,
          <br />
          <span className="italic text-papyrus-muted">repensé.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-text-secondary">
          Papyrus réunit la puissance de Tally, la fluidité de Typeform et l&apos;élégance d&apos;un parchemin. Builder
          drag &amp; drop, logique conditionnelle, traduction IA, dashboard temps réel.
        </p>

        <div className="mt-10 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 rounded-md bg-mooove-navy px-5 py-3 text-sm font-medium text-mooove-ice transition hover:opacity-90"
          >
            Créer mon premier formulaire
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="mx-auto mt-20 papyrus-divider w-24" />
        <p className="mt-6 papyrus-meta text-sm">
          Construit avec ❒ par l&apos;équipe Mooove · Next.js, Supabase, Claude
        </p>
      </section>
    </main>
  );
}
