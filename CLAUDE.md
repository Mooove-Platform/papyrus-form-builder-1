# CLAUDE.md — Instructions agent pour Papyrus

> Ce fichier est lu automatiquement par Claude Code à chaque session.
> Il définit comment tu dois te comporter sur ce projet.

---

## 🎯 Contexte projet

**Papyrus** est un form builder SaaS développé par Mooove.
Stack : Next.js 14 (App Router) · TypeScript strict · Tailwind CSS · Supabase · Framer Motion · @dnd-kit · Recharts · Lucide React · React Hook Form + Zod · Resend.

Référence technique complète → `prompt_papyrus_claude_code.md` à la racine.

---

## 🧠 Règles de comportement — OBLIGATOIRES

### 1. Ne jamais halluciner — demander plutôt qu'inventer

- Si tu ne connais pas l'état exact d'un fichier → **lis-le d'abord** (`read_file` ou `cat`)
- Si tu n'es pas sûr d'un path → **vérifie** (`ls` ou `find`)
- Si la demande est ambiguë sur un point technique → **pose UNE seule question précise** avant de coder
- Tu n'inventes jamais l'état d'un composant que tu n'as pas lu

### 2. Travailler par scope minimal

- Tu ne modifies QUE les fichiers concernés par la tâche demandée
- Tu ne refactores pas en dehors du scope sauf si explicitement demandé
- Si tu vois un bug en dehors du scope → tu le **signales** mais ne le corriges pas sans permission

### 3. Avant de coder

Avant chaque tâche significative, annonce :
```
📋 Scope : [ce que tu vas faire]
📁 Fichiers touchés : [liste]
❓ Hypothèses : [ce que tu assumes si applicable]
```

Si tu as besoin de clarification → pose ta question AVANT de commencer, pas au milieu.

### 4. TypeScript strict — zéro compromis

- Zéro `any`, zéro `@ts-ignore`
- Tous les types viennent de `types/index.ts` (source de vérité)
- Si un type manque dans `types/index.ts` → tu le crées là-bas, pas inline
- Props des composants toujours typées avec une interface nommée

### 5. Structure fichiers — ne jamais dévier

```
app/           → pages et routes API uniquement
components/    → composants React (voir sous-dossiers ci-dessous)
  builder/     → canvas, palette, settings, logique
  dashboard/   → cards, charts, stats
  respondent/  → vue répondant + champs
  ui/          → primitives réutilisables (Button, Input, Badge…)
  layout/      → Sidebar, Header, CommandPalette
lib/           → logique métier, clients, utils
types/         → types TypeScript — SOURCE DE VÉRITÉ
supabase/      → migrations SQL uniquement
```

Tu ne crées jamais un fichier en dehors de cette structure sans le signaler.

### 6. Design system — règles non-négociables

**Couleurs → toujours via CSS variables, jamais en dur :**
```css
--mooove-navy: #052139    /* fond bouton primaire thème clair */
--mooove-cyan: #2AC2DE    /* CTA, thème sombre */
--mooove-amber: #F6923E   /* highlights rares — JAMAIS avec Cyan */
--mooove-electric: #3C5EAB /* badges Publié */
--papyrus-bg: #F7F0DC     /* fond principal */
--papyrus-surface: #FFFDF5 /* cards, surfaces */
--papyrus-border: #D4B896  /* bordures */
```

**Règle d'or : JAMAIS Amber (#F6923E) et Cyan (#2AC2DE) dans le même bloc visuel.**

**Typo :**
- Titres H1/H2 → `font-family: var(--font-display)` (Georgia)
- Tout le reste → `font-family: var(--font-body)` (Aktiv Grotesk / DM Sans)

**Coins arrondis :**
- Compact : `rounded` (8px) — inputs, badges
- Standard : `rounded-xl` (12px) — boutons, panels
- Cards : `rounded-2xl` (20px) — cards dashboard, blocs builder

### 7. Composants UI — toujours utiliser les primitives existantes

Avant de créer un élément UI → vérifie d'abord `components/ui/` :
- `Button.tsx` → variantes : `primary`, `secondary`, `ghost`, `danger`
- `Input.tsx` → texte, email, number, password
- `Badge.tsx` → statuts formulaire
- `Modal.tsx` → toutes les modales
- `Toast.tsx` → notifications
- `Skeleton.tsx` → états de chargement

Si un primitif manque → crée-le dans `components/ui/` avant de l'utiliser.

### 8. Mode local vs Supabase

L'app tourne en **mode local par défaut** (`NEXT_PUBLIC_LOCAL_MODE=true`).
- Mode local → données dans `localStorage`
- Mode Supabase → base Postgres + Auth + RLS

Toujours vérifier `NEXT_PUBLIC_LOCAL_MODE` avant d'appeler Supabase.
Pattern :
```typescript
const isLocal = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true'
if (isLocal) { /* localStorage */ } else { /* Supabase */ }
```

### 9. Autosave dans le builder

Le builder a un autosave avec debounce 2s.
Ne jamais bypasser ce mécanisme pour une "sauvegarde directe" sans le signaler.

### 10. Quand la tâche est terminée

Après chaque tâche, fournis :
```
✅ Fait : [résumé]
📁 Fichiers modifiés/créés : [liste avec paths complets]
⚠️ Points d'attention : [ce que le dev doit savoir / tester]
🔜 Prochaine étape suggérée : [optionnel]
```

---

## 📦 Phase actuelle — Phase 1 : Builder

**Focus actuel : le form builder.**
Le backend (Supabase, auth, soumissions) sera branché plus tard.
Pour l'instant : tout fonctionne en localStorage, données mockées.

### Ce qui est fait ✅
- Setup Next.js + Tailwind + design system Parchemin
- Auth Supabase (login/signup) + middleware + RLS
- Schéma BDD complet + policies RLS
- Dashboard shell (sidebar, header, breadcrumbs)
- CRUD formulaire de base
- Builder shell 3 colonnes

### En cours / à faire 🔨
- Builder : ajout de champs depuis la palette (clic → ajout au canvas)
- Builder : drag & drop pour réordonner les champs (`@dnd-kit`)
- Builder : settings panel droit (config du champ sélectionné)
- Builder : autosave localStorage
- Mode génération IA : prompt texte → formulaire JSON → affichage dans le builder

### Types de champs supportés (Phase 1)
```
Texte      : short_text, long_text, email, phone, number, url
Choix      : single_choice, multiple_choice, dropdown
Évaluation : rating (étoiles 1-5), nps (0-10)
Structure  : section_break, statement (texte libre)
```

---

## 🤖 Feature : Génération formulaire par IA (à implémenter)

L'utilisateur peut décrire son formulaire en langage naturel → Claude génère un JSON → le builder l'affiche.

**Flow :**
1. Interface : bouton "Générer avec l'IA" dans le builder ou sur la page de création
2. Input : textarea où l'utilisateur décrit son formulaire
3. Appel : `lib/ai/provider.ts` → `generateFormSchema(description)`
4. Output : JSON conforme au type `Form` (voir `types/index.ts`)
5. Résultat : les champs apparaissent dans le canvas, modifiables

**Format JSON attendu en sortie de l'IA :**
```json
{
  "title": "Titre du formulaire",
  "description": "Description optionnelle",
  "fields": [
    {
      "type": "short_text",
      "label": { "fr": "Quel est ton nom ?" },
      "required": true,
      "field_order": 0
    },
    {
      "type": "single_choice",
      "label": { "fr": "Quelle est ta situation ?" },
      "options": [
        { "id": "opt1", "label": { "fr": "Étudiant" } },
        { "id": "opt2", "label": { "fr": "Salarié" } }
      ],
      "required": false,
      "field_order": 1
    }
  ]
}
```

L'IA doit répondre **uniquement en JSON valide**, sans texte avant ni après.

---

## ❌ Ce que tu ne fais JAMAIS

- Utiliser `any` en TypeScript
- Hardcoder des couleurs hex en dehors de `globals.css`
- Créer des fichiers hors de la structure définie sans le signaler
- Modifier le schéma SQL sans le mettre dans une nouvelle migration `supabase/migrations/`
- Bypasser les RLS policies côté client
- Commencer à coder sans avoir lu les fichiers existants concernés
- Continuer si tu as une ambiguïté bloquante → tu poses UNE question précise

---

## 📖 Références

- Design system complet + schéma BDD + roadmap → `prompt_papyrus_claude_code.md`
- Types TypeScript → `types/index.ts`
- Variables CSS → `app/globals.css`
- Règles ESLint → `.eslintrc.json`
