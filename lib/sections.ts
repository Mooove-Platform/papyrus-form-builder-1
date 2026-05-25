import type { Field } from '@/types';

/**
 * Découpe les champs en pages selon les `section_break`.
 * Chaque section_break démarre une nouvelle page (et son titre sert d'en-tête de page).
 * Si la première page contient des champs avant tout section_break, elle est sans titre.
 */
export function buildPages(fields: Field[]): Field[][] {
  const pages: Field[][] = [];
  let current: Field[] = [];

  for (const field of fields) {
    if (field.type === 'section_break') {
      if (current.length > 0) pages.push(current);
      current = [field];
    } else {
      current.push(field);
    }
  }
  if (current.length > 0) pages.push(current);
  if (pages.length === 0) pages.push([]);
  return pages;
}

/** Champs qui se trouvent dans la même section que le champ source (utilisé par la logique en mode sections). */
export function getFieldsInSameSection(fields: Field[], sourceFieldId: string): Field[] {
  const sourceIdx = fields.findIndex((f) => f.id === sourceFieldId);
  if (sourceIdx === -1) return [];

  let sectionStart = 0;
  for (let i = sourceIdx; i >= 0; i--) {
    if (fields[i].type === 'section_break') {
      sectionStart = i + 1;
      break;
    }
  }

  let sectionEnd = fields.length;
  for (let i = sourceIdx + 1; i < fields.length; i++) {
    if (fields[i].type === 'section_break') {
      sectionEnd = i;
      break;
    }
  }

  return fields.slice(sectionStart, sectionEnd).filter((f) => f.id !== sourceFieldId);
}

/** Liste des sections (section_break) du formulaire — sert de cibles pour Aller à en mode sections. */
export function getSections(fields: Field[]): Field[] {
  return fields.filter((f) => f.type === 'section_break');
}
