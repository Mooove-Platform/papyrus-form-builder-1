# Papyrus

Form builder SaaS — successeur de Tally / Typeform, par Mooove.

Stack : Next.js 14 (App Router) · TypeScript · Tailwind · Supabase · Framer Motion · Recharts · @dnd-kit · Resend.

## Démarrer (mode local — aucun setup)

L'app démarre par défaut en **mode local** : pas de Supabase, pas d'auth, les formulaires sont stockés dans le `localStorage` du navigateur.

```bash
npm install
npm run dev
```

http://localhost:3000 → tu peux créer, éditer, supprimer des formulaires immédiatement. Tout reste sur ton ordi.

## Passer en mode Supabase (plus tard)

Quand tu es prêt à brancher la base et l'auth :

1. Crée un projet Supabase, lance `supabase/migrations/001_initial.sql` dans le SQL editor.
2. Dans `.env.local` :
   ```
   NEXT_PUBLIC_LOCAL_MODE=false
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
3. `npm run dev` → l'auth Supabase s'active, les pages dashboard liront depuis Postgres.

> Note : la migration des formulaires localStorage → Supabase n'est pas encore automatisée. À ajouter quand tu basculeras.

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_LOCAL_MODE` | `true` = mode local (localStorage). `false` = Supabase. |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase (mode Supabase) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé admin (server-only, jamais exposée) |
| `AI_PROVIDER` | `claude` ou `openai` |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | Clé du provider IA |
| `RESEND_API_KEY` | Pour les emails post-soumission |
| `NEXT_PUBLIC_APP_URL` | URL publique (`http://localhost:3000` en local) |

## Architecture

Voir `prompt_papyrus_claude_code.md` pour le brief complet (design system, schéma BDD, règles couleurs, phases).

```
app/
  (auth)/         login, signup
  (dashboard)/    dashboard, forms, templates, settings
  f/[slug]/       formulaire public
  api/            routes API
components/
  builder/        canvas, palette, settings, logique
  dashboard/      cards, charts, stats
  respondent/     vue côté répondant
  ui/             primitives (Button, Input, Badge…)
  layout/         Sidebar, Header
lib/
  supabase/       clients (browser, server, middleware)
  ai/             façade interchangeable Claude/GPT
  actions-engine/ webhook, REST API, email
  destinations/   Airtable, Google Sheets, Supabase interne
types/            sources de vérité TS
supabase/migrations/  SQL versionné
```

## État actuel

**Phase 1 — Fondations (en cours)**

- [x] Setup Next.js + Tailwind + design system Parchemin/Mooove
- [x] Auth Supabase (login/signup) + middleware + RLS
- [x] Schéma BDD complet + RLS policies + auto-création d'équipe à l'inscription
- [x] Dashboard shell (sidebar, header, breadcrumbs)
- [x] CRUD formulaire de base (créer, lister, voir)
- [x] Builder shell 3 colonnes
- [ ] Builder drag &amp; drop fonctionnel (`@dnd-kit`)
- [ ] Soumission formulaire publique `/f/[slug]` + écriture Supabase
- [ ] Tableau des réponses

**Phase 2** — Thème, logique, traduction IA, exports, graphiques.
**Phase 3** — Actions (webhook/REST/email), templates, analyse IA, Cmd+K.

## Règle d'or design

**Ne jamais mélanger Amber `#F6923E` et Cyan `#2AC2DE` dans le même bloc visuel.**

- Amber → uniquement avec Navy ou Parchemin (chaleur, highlights rares).
- Cyan → réservé aux CTAs et au thème sombre.
- Electric Blue `#3C5EAB` → badges « Publié », statuts d'affirmation.
