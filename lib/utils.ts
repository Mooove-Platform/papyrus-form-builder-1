import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Compose des classNames Tailwind en gérant les conflits. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Slugify simple — accents, espaces, caractères spéciaux. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Slug unique avec suffixe court random — compatible RLS uniqueness. */
export function uniqueSlug(input: string): string {
  const base = slugify(input) || 'form';
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

/** Hash léger d'IP pour anonymisation côté serveur (non cryptographique). */
export function hashIp(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = (hash << 5) - hash + ip.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/** Formate un compteur (1.2k, 12k, 1.4M). */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}
