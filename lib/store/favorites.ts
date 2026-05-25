'use client';

/**
 * Gestion des modèles favoris d'un utilisateur — stocké dans localStorage.
 * Quand Supabase sera branché, on aura une table `favorites (user_id, template_id)`.
 */

const STORAGE_KEY = 'papyrus.favorites.v1';
const EVENT = 'papyrus:favorites-changed';

function readAll(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(ids: string[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function listFavorites(): string[] {
  return readAll();
}

export function isFavorite(templateId: string): boolean {
  return readAll().includes(templateId);
}

export function toggleFavorite(templateId: string): boolean {
  const all = readAll();
  const idx = all.indexOf(templateId);
  if (idx >= 0) {
    all.splice(idx, 1);
    writeAll(all);
    return false;
  }
  all.push(templateId);
  writeAll(all);
  return true;
}

export const FAVORITES_EVENT = EVENT;
