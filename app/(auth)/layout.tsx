import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-6">
      <Link href="/" className="absolute left-6 top-6 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-mooove-navy text-mooove-ice">
          <span className="font-display italic">P</span>
        </div>
        <span className="font-display text-lg">Papyrus</span>
      </Link>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 0%, rgba(212,184,150,0.4), transparent 60%)'
        }}
      />

      {children}
    </div>
  );
}
