'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FileText, LayoutDashboard, LayoutTemplate, LogOut, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/forms', label: 'Formulaires', icon: FileText },
  { href: '/templates', label: 'Modèles', icon: LayoutTemplate },
  { href: '/settings', label: 'Paramètres', icon: Settings }
];

interface Props {
  teamName: string;
  userEmail: string;
}

export function Sidebar({ teamName, userEmail }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-bg-surface">
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-mooove-navy text-mooove-ice">
          <span className="font-display italic">P</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-display text-base">Papyrus</span>
          <span className="papyrus-meta text-xs">{teamName}</span>
        </div>
      </div>

      <nav className="px-3 py-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'mb-0.5 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition',
                active
                  ? 'bg-bg-elevated text-text-primary'
                  : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Illustration : plante de papyrus, occupe l'espace vide entre la nav et le footer */}
      {/* mixBlendMode multiply : fait disparaître un fond blanc en le fusionnant
          avec le parchemin de la sidebar. Sans effet si le PNG est déjà transparent. */}
      <div className="relative flex flex-1 items-end justify-center px-3 pb-4">
        <Image
          src="/papyrus-plant.png"
          alt="Papyrus"
          width={220}
          height={220}
          className="h-auto w-full max-w-[180px] select-none"
          style={{ mixBlendMode: 'multiply' }}
          priority
        />
      </div>

      <div className="border-t border-border px-3 py-3">
        <div className="px-3 pb-2 text-xs text-text-tertiary truncate">{userEmail}</div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-secondary transition hover:bg-bg-elevated hover:text-text-primary"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}

