import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-6">
      <Link href="/" className="absolute left-6 top-6 flex items-center gap-2">
        <Image
          src="/papyrus-logo.png"
          alt="Papyrus"
          width={32}
          height={32}
          className="h-8 w-8"
        />
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
