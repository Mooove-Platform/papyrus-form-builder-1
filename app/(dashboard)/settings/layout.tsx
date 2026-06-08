'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Users, User, Palette, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const SETTINGS_NAVIGATION = [
  {
    label: 'Profil',
    href: '/settings/profile',
    icon: User,
    description: 'Gérez vos informations personnelles'
  },
  {
    label: 'Équipe',
    href: '/settings/team',
    icon: Users,
    description: 'Membres et invitations'
  },
  {
    label: 'Apparence',
    href: '/settings/appearance',
    icon: Palette,
    description: 'Thème et préférences'
  },
  {
    label: 'Notifications',
    href: '/settings/notifications',
    icon: Bell,
    description: 'Alertes et emails'
  }
];

interface Props {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: Props) {
  const pathname = usePathname();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-var(--mooove-navy)" />
          <h1 className="text-2xl font-display font-medium text-var(--mooove-navy)">
            Paramètres
          </h1>
        </div>
        <p className="text-gray-600">
          Gérez votre compte, votre équipe et vos préférences.
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {SETTINGS_NAVIGATION.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]",
                    isActive
                      ? "bg-var(--mooove-navy) text-white shadow-lg"
                      : "text-gray-700 hover:bg-var(--papyrus-surface) hover:text-var(--mooove-navy)"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5 mr-3 transition-colors",
                    isActive ? "text-white" : "text-gray-500 group-hover:text-var(--mooove-navy)"
                  )} />
                  <div>
                    <div>{item.label}</div>
                    <div className={cn(
                      "text-xs mt-0.5",
                      isActive ? "text-white/80" : "text-gray-500"
                    )}>
                      {item.description}
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3">
          <div className="bg-var(--papyrus-surface) rounded-2xl border border-var(--papyrus-border) p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}