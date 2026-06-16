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

/** Calcule le temps relatif écoulé depuis une date (ex: "il y a 3 jours"). */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 0) return 'à l\'instant';
  if (diffInSeconds < 60) return 'il y a quelques secondes';

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `il y a ${diffInMonths} mois`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `il y a ${diffInYears} an${diffInYears > 1 ? 's' : ''}`;
}

/**
 * Récupère l'URL de base de l'application de manière sécurisée et dynamique.
 * Gère le cas où NEXT_PUBLIC_APP_URL est mal configuré en production (ex: pointant vers localhost).
 */
export function getBaseUrl(): string {
  let url = process.env.NEXT_PUBLIC_APP_URL || '';

  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    // Si la variable d'env n'est pas définie OU si elle pointe vers localhost mais qu'on est en prod,
    // on utilise l'origine actuelle.
    if (!url || (url.includes('localhost') && !isLocalhost)) {
      url = window.location.origin;
    }
  }

  // S'assurer qu'il n'y a pas de slash de fin
  return url.replace(/\/$/, '');
}
