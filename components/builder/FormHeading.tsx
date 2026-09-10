'use client';

import type { CSSProperties } from 'react';

import { LIMITS } from '@/lib/constants/limits';
import { cn } from '@/lib/utils';

/**
 * Le titre et la description d'un formulaire — **un seul composant, partout.**
 *
 * Ces deux lignes étaient recopiées dans les trois vues publiques, et le
 * constructeur, lui, n'en dessinait qu'une : la description, en italique et en
 * petit, sous la bannière. Le titre n'existait nulle part sur la toile — il
 * vivait dans la barre d'outils, en corps 18, sans étiquette. L'auteur voyait
 * donc un grand titre sur la page publiée et n'avait, dans l'éditeur, rien qui
 * lui ressemble à modifier. « Ça n'apparaît nulle part » : c'est exactement ce
 * que le montage produisait.
 *
 * Ici, la toile affiche ce que la page publie, dans la même typographie, et
 * c'est cet affichage-là qu'on modifie. Une seule définition du bloc : les deux
 * ne peuvent plus diverger.
 */

interface Props {
  title: string;
  description?: string;
  /** La couleur de texte du thème, quand l'auteur en a choisi une. */
  descriptionColor?: string;
  /**
   * `page` : en tête d'un formulaire qui défile ou qui pagine.
   * `intro` : l'écran d'accueil du mode « une question à la fois », où le bloc
   * est seul à l'écran et respire davantage.
   */
  variant?: 'page' | 'intro';
  /** Fourni par le constructeur seulement. Absent = rendu figé. */
  edit?: {
    onTitleChange: (value: string) => void;
    onTitleCommit: () => void;
    onDescriptionChange: (value: string) => void;
    onDescriptionCommit: () => void;
  };
}

export function FormHeading({
  title,
  description,
  descriptionColor,
  variant = 'page',
  edit
}: Props) {
  // La graisse et l'interlettrage sont ecrits ici, alors qu'une regle globale
  // les donne deja a `h1`. C'est volontaire : un `textarea` n'est pas un titre
  // pour le navigateur, il n'herite donc de rien. Sans ca, le meme texte
  // s'affichait maigre dans l'editeur et gras sur la page — la toile mentait
  // sur ce qu'elle montrait.
  const titleClass = cn(
    'font-display text-4xl font-bold tracking-[-0.02em] text-text-primary',
    variant === 'intro' && 'mb-4'
  );
  const descriptionClass =
    variant === 'intro' ? 'text-lg leading-relaxed' : 'papyrus-meta mt-2 text-base';
  const descriptionStyle: CSSProperties = {
    color: descriptionColor ?? 'var(--fg-secondary)'
  };

  if (!edit) {
    return (
      <header className="mb-8">
        <h1 className={titleClass}>{title}</h1>
        {description && (
          <p className={descriptionClass} style={descriptionStyle}>
            {description}
          </p>
        )}
      </header>
    );
  }

  return (
    <header className="mb-8">
      <Editable
        value={title}
        onChange={edit.onTitleChange}
        onCommit={edit.onTitleCommit}
        limit={LIMITS.FORM_TITLE_MAX}
        placeholder="Titre du formulaire"
        label="Titre du formulaire"
        className={titleClass}
        singleLine
      />
      <Editable
        value={description ?? ''}
        onChange={edit.onDescriptionChange}
        onCommit={edit.onDescriptionCommit}
        limit={LIMITS.FORM_DESCRIPTION_MAX}
        placeholder="Ajoutez une description (facultative)"
        label="Description du formulaire"
        className={descriptionClass}
        style={descriptionStyle}
      />
    </header>
  );
}

/**
 * Un texte qu'on modifie là où il s'affiche.
 *
 * Deux choses le rendent utilisable, et c'est ce qui manquait à l'ancien
 * champ : **il grandit avec son contenu** — un titre long ne se cache pas
 * derrière un défilement horizontal d'une ligne — et **il se signale au
 * survol.** Un champ sans bordure ni fond posé au milieu d'une page se lit
 * comme du texte figé ; personne ne clique sur du texte figé.
 *
 * La hauteur suit le contenu sans mesurer quoi que ce soit : le champ et une
 * copie invisible du même texte occupent la même cellule de grille, et c'est la
 * copie, qui se replie normalement, qui impose la hauteur.
 */
function Editable({
  value,
  onChange,
  onCommit,
  limit,
  placeholder,
  label,
  className,
  style,
  singleLine = false
}: {
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  limit: number;
  placeholder: string;
  label: string;
  className?: string;
  style?: CSSProperties;
  singleLine?: boolean;
}) {
  const nearLimit = value.length > limit * 0.8;

  return (
    <div className="group relative -mx-2 rounded-md px-2 py-1 transition-colors hover:bg-accent/6 focus-within:bg-accent/6 focus-within:ring-1 focus-within:ring-accent/40">
      <div className="grid cursor-text">
        {/* La copie invisible : c'est elle qui donne sa hauteur au champ. */}
        <span
          aria-hidden
          className={cn(
            'pointer-events-none invisible [grid-area:1/1] whitespace-pre-wrap break-words select-none',
            className
          )}
          style={style}
        >
          {value || placeholder}{' '}
        </span>

        <textarea
          value={value}
          onChange={(event) =>
            onChange(singleLine ? event.target.value.replace(/\n/g, '') : event.target.value)
          }
          onBlur={onCommit}
          onKeyDown={(event) => {
            if (singleLine && event.key === 'Enter') {
              event.preventDefault();
              (event.target as HTMLTextAreaElement).blur();
            }
          }}
          maxLength={limit}
          rows={1}
          aria-label={label}
          placeholder={placeholder}
          className={cn(
            '[grid-area:1/1] resize-none overflow-hidden border-0 bg-transparent outline-hidden',
            'placeholder:text-text-tertiary',
            className
          )}
          style={style}
        />
      </div>

      {nearLimit && (
        <span
          className={cn(
            'pointer-events-none absolute right-2 -bottom-4 font-mono text-[10px] select-none',
            value.length >= limit ? 'font-semibold text-red-500' : 'text-text-tertiary'
          )}
        >
          {value.length}/{limit}
        </span>
      )}
    </div>
  );
}
