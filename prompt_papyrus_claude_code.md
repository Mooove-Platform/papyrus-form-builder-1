# Prompt Claude Code — Form Builder SaaS

## Contexte & vision

Tu vas développer **Papyrus** — un outil de création de formulaires SaaS complet qui remplace Tally, Typeform et Google Forms. L'objectif est d'avoir tous leurs points forts réunis en un seul outil, gratuit, beau, simple d'utilisation et personnalisable à fond.

L'outil est destiné à une équipe (multi-utilisateurs avec rôles admin/membre). Il doit être visuellement exceptionnel — inspire-toi de la qualité UI de Linear, Notion, et Typeform tout en ayant ta propre identité visuelle forte.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 14 (App Router) |
| Langage | TypeScript strict |
| Styling | Tailwind CSS + CSS Variables |
| Animations | Framer Motion |
| Backend / Auth | Supabase (Postgres + Auth + Storage) |
| Hébergement | Vercel (déploiement auto depuis GitHub) |
| IA | Façade interchangeable Claude/GPT (voir section dédiée) |
| Drag & drop builder | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Graphiques dashboard | Recharts |
| Icônes | Lucide React |
| Formulaires internes | React Hook Form + Zod |
| Emails | Resend |

---

## Design System & UI

### Philosophie visuelle
L'outil doit être **visuellement mémorable**. Pas de design générique. Inspire-toi de :
- **Linear** pour la rigueur, la densité d'information, les raccourcis clavier
- **Typeform** pour la fluidité côté répondant, les transitions
- **Notion** pour la simplicité du builder drag & drop
- **Vercel Dashboard** pour la clarté du dashboard et des graphiques

### Direction esthétique
- **Thème clair "Parchemin"** par défaut — fond parchemin `#F7F0DC`, typographie Georgia serif pour les titres, séparateurs en tirets pointillés. L'âme Papyrus.
- **Thème sombre "Parchemin brûlé"** optionnel — fond Navy Mooove `#052139`, accents Cyan `#2AC2DE`.
- Identité visuelle : **Papyrus donne la texture** (parchemin, serif, numérotation romaine), **Mooove donne l'énergie** (Navy comme ancre, Cyan sur les CTAs).
- Typographie : `Aktiv Grotesk` pour tout le corps UI (télécharger via Adobe Fonts ou substitut `DM Sans` si indisponible) + `Georgia` serif uniquement pour les titres H1/H2 en thème clair.
- Coins arrondis : `8px` compact, `12px` standard, `20px` cards
- Micro-animations sur toutes les interactions (hover, focus, transitions de page)
- Sidebar rétractable avec icônes, breadcrumbs dans le header

### Règle d'or des couleurs (CRITIQUE)
**Ne jamais utiliser l'Amber (#F6923E) et le Cyan (#2AC2DE) dans le même bloc visuel.**
- L'Amber s'utilise uniquement avec le Navy ou le Parchemin (thème clair, éléments de chaleur, highlights rares).
- Le Cyan est réservé au thème sombre et aux CTAs principaux.
- L'Electric Blue (#3C5EAB) est pour les badges "Publié", éléments d'affirmation.

### CSS Variables (globals.css)
```css
:root {
  /* Palette Mooove — officielle */
  --mooove-navy: #052139;       /* Couleur principale, autorité, premium */
  --mooove-cyan: #2AC2DE;       /* CTA, énergie, mouvement */
  --mooove-amber: #F6923E;      /* Chaleur humaine — épice, utiliser avec parcimonie */
  --mooove-electric: #3C5EAB;   /* Audace, affirmation, badges */
  --mooove-ice: #EFF9FE;        /* Texte sur fond sombre, fond secondaire */
  --mooove-sky: #C7EAFB;        /* Accents doux, séparateurs */

  /* Palette Papyrus — thème clair */
  --papyrus-bg: #F7F0DC;        /* Fond principal parchemin */
  --papyrus-surface: #FFFDF5;   /* Surfaces, cards */
  --papyrus-border: #D4B896;    /* Bordures, séparateurs */
  --papyrus-muted: #8B7355;     /* Texte secondaire, métadonnées, italiques */
  --papyrus-ink: #2A1F0E;       /* Texte principal sur parchemin */

  /* Thème clair (défaut) */
  --bg-base: #F7F0DC;
  --bg-surface: #FFFDF5;
  --bg-elevated: #FFF8E8;
  --bg-overlay: #F0E6C8;
  --border: #D4B896;
  --border-strong: #C4A882;
  --text-primary: #052139;
  --text-secondary: #8B7355;
  --text-tertiary: #B8A080;
  --accent: #052139;            /* Navy comme accent principal en clair */
  --accent-cta: #2AC2DE;        /* Cyan pour les CTAs — jamais avec Amber */
  --accent-warm: #F6923E;       /* Amber pour highlights — jamais avec Cyan */
  --accent-bold: #3C5EAB;       /* Electric Blue pour badges, statuts */
  --success: #2AC2DE;           /* Cyan = succès/énergie dans cet univers */
  --warning: #F6923E;           /* Amber = attention */
  --danger: #C0392B;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;

  /* Typographie */
  --font-display: Georgia, 'Times New Roman', serif;  /* Titres H1/H2 — âme Papyrus */
  --font-body: 'Aktiv Grotesk', 'DM Sans', sans-serif; /* Tout le reste */
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}

/* Thème sombre "Parchemin brûlé" */
[data-theme="dark"] {
  --bg-base: #052139;
  --bg-surface: #0A3050;
  --bg-elevated: #0D3A60;
  --bg-overlay: #1A4A72;
  --border: #1A4A72;
  --border-strong: #3C5EAB;
  --text-primary: #EFF9FE;
  --text-secondary: #C7EAFB;
  --text-tertiary: #4A6B8A;
  --accent: #2AC2DE;            /* Cyan comme accent principal en sombre */
  --accent-cta: #2AC2DE;
  --accent-warm: #F6923E;       /* Amber toujours possible mais sans Cyan dans le même bloc */
  --accent-bold: #3C5EAB;
  --success: #2AC2DE;
  --warning: #F6923E;
  --danger: #E74C3C;
}
```

### Application des couleurs par composant
```
Sidebar          → bg: --bg-surface, border-right: --border
Header           → bg: --bg-base, border-bottom: --border
Bouton primaire  → bg: --mooove-navy, text: --mooove-ice  [clair] / bg: --mooove-cyan, text: --mooove-navy [sombre]
Bouton CTA       → bg: --mooove-cyan, text: --mooove-navy  (jamais sur fond Amber)
Badge PUBLIÉ     → bg: --mooove-electric, text: --mooove-ice
Badge BROUILLON  → border: --mooove-navy, text: --mooove-navy  [clair] / border: --mooove-electric [sombre]
Badge CLOS       → border-dashed: --papyrus-muted, text: --papyrus-muted, text-decoration: line-through
Barre progression→ track: --border, fill: --mooove-navy [clair] / fill: --mooove-cyan [sombre]
Titres H1/H2     → font-family: --font-display (Georgia), color: --text-primary
Métadonnées      → font-style: italic, color: --text-secondary (--papyrus-muted en clair)
Séparateurs liste→ border-bottom: 1px dashed --border
Numérotation     → i. ii. iii. en Georgia, color: --text-secondary
Recharts accents → stroke/fill: --mooove-cyan [sombre] / --mooove-navy [clair]
```

---

## Architecture des fichiers

```
papyrus/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar + header
│   │   ├── page.tsx                # Home dashboard
│   │   ├── forms/
│   │   │   ├── page.tsx            # Liste des formulaires
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx        # Dashboard form (réponses + graphs)
│   │   │   │   ├── edit/page.tsx   # Builder
│   │   │   │   └── share/page.tsx  # Partage
│   │   ├── templates/page.tsx      # Galerie de modèles
│   │   └── settings/page.tsx       # Équipe + compte + intégrations
│   ├── f/
│   │   └── [slug]/page.tsx         # Formulaire public (répondant)
│   └── api/
│       ├── forms/route.ts
│       ├── forms/[id]/route.ts
│       ├── submit/[slug]/route.ts
│       ├── responses/[formId]/route.ts
│       ├── ai/translate/route.ts
│       ├── ai/analyze/route.ts
│       └── actions/trigger/route.ts
├── components/
│   ├── builder/
│   │   ├── BuilderCanvas.tsx       # Zone drag & drop principale
│   │   ├── FieldPalette.tsx        # Panneau gauche - types de champs
│   │   ├── FieldCard.tsx           # Champ draggable dans le canvas
│   │   ├── FieldSettings.tsx       # Panneau droit - config du champ sélectionné
│   │   ├── LogicEditor.tsx         # Editeur de règles if/else
│   │   ├── ThemeEditor.tsx         # Personnalisation visuelle du form
│   │   ├── TranslationEditor.tsx   # Onglets par langue
│   │   └── FormPreview.tsx         # Preview live
│   ├── dashboard/
│   │   ├── FormCard.tsx
│   │   ├── ResponseTable.tsx
│   │   ├── ChartWidget.tsx
│   │   └── StatsBar.tsx
│   ├── respondent/
│   │   ├── FormScroll.tsx          # Mode 1 page
│   │   ├── FormTypeform.tsx        # Mode 1 question à la fois
│   │   ├── LanguageSwitcher.tsx    # Boutons FR | EN | ES
│   │   └── fields/                 # Rendu de chaque type de champ
│   ├── ui/                         # Composants réutilisables
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Dropdown.tsx
│   │   ├── Badge.tsx
│   │   ├── Toast.tsx
│   │   └── Skeleton.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       ├── Header.tsx
│       └── CommandPalette.tsx      # Cmd+K
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── ai/
│   │   ├── provider.ts             # Facade interchangeable
│   │   ├── claude.ts
│   │   ├── openai.ts
│   │   └── prompts.ts
│   ├── actions-engine/
│   │   ├── index.ts                # Orchestrateur
│   │   ├── webhook.ts
│   │   ├── rest-api.ts
│   │   └── email.ts
│   ├── destinations/
│   │   ├── airtable.ts
│   │   ├── google-sheets.ts
│   │   └── supabase-internal.ts
│   └── utils.ts
├── types/
│   └── index.ts                    # Tous les types TypeScript
└── supabase/
    └── migrations/
        └── 001_initial.sql
```

---

## Schéma base de données Supabase (SQL complet)

```sql
-- Équipes
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text default 'free',
  created_at timestamptz default now()
);

-- Membres d'équipe
create table team_members (
  user_id uuid references auth.users(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  role text check (role in ('admin', 'member')) default 'member',
  joined_at timestamptz default now(),
  primary key (user_id, team_id)
);

-- Formulaires
create table forms (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  created_by uuid references auth.users(id),
  title text not null default 'Nouveau formulaire',
  slug text unique not null,
  description text,
  display_mode text check (display_mode in ('scroll', 'typeform')) default 'scroll',
  status text check (status in ('draft', 'published', 'closed')) default 'draft',
  is_template boolean default false,
  template_origin_id uuid references forms(id),
  theme jsonb default '{"bg":"#F7F0DC","accent":"#052139","font":"Aktiv Grotesk","banner_url":null,"dark_mode":false}',
  access_type text check (access_type in ('public', 'private', 'password')) default 'public',
  access_password text,
  languages text[] default array['fr'],
  default_language text default 'fr',
  published_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Champs du formulaire
create table fields (
  id uuid primary key default gen_random_uuid(),
  form_id uuid references forms(id) on delete cascade,
  type text check (type in (
    'short_text','long_text','email','phone','number',
    'single_choice','multiple_choice','dropdown','rating',
    'nps','date','file','section_break','statement'
  )) not null,
  label jsonb not null default '{"fr":"Question"}',  -- multilingue
  description jsonb default '{}',
  placeholder jsonb default '{}',
  options jsonb default '[]',  -- [{"id":"opt1","label":{"fr":"Oui","en":"Yes"}}]
  required boolean default false,
  field_order int not null,
  validation jsonb default '{}',  -- {min, max, pattern, ...}
  created_at timestamptz default now()
);

-- Règles logiques if/else
create table logic_rules (
  id uuid primary key default gen_random_uuid(),
  form_id uuid references forms(id) on delete cascade,
  source_field_id uuid references fields(id) on delete cascade,
  condition text check (condition in ('equals','not_equals','contains','greater_than','less_than')),
  condition_value text not null,
  action_type text check (action_type in ('show_field','hide_field','jump_to','end_form')),
  target_field_id uuid references fields(id),
  rule_order int default 0,
  created_at timestamptz default now()
);

-- Destinations des réponses
create table form_destinations (
  id uuid primary key default gen_random_uuid(),
  form_id uuid references forms(id) on delete cascade,
  type text check (type in ('supabase','airtable','google_sheets')) not null,
  config jsonb not null default '{}',
  -- airtable: {api_key, base_id, table_id, field_mapping}
  -- google_sheets: {credentials, spreadsheet_id, sheet_name, field_mapping}
  -- supabase: {table_name} (auto-créée)
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Actions post-soumission
create table form_actions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid references forms(id) on delete cascade,
  type text check (type in ('webhook','rest_api','email')) not null,
  name text not null,
  config jsonb not null default '{}',
  -- webhook: {url, method, headers, body_template}
  -- rest_api: {url, method, headers, auth_type, auth_value, field_mapping}
  -- email: {to, subject_template, body_template, send_to_respondent}
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Graphiques dashboard
create table charts (
  id uuid primary key default gen_random_uuid(),
  form_id uuid references forms(id) on delete cascade,
  field_id uuid references fields(id),
  type text check (type in ('bar','pie','line','number','word_cloud','table')),
  title text,
  config jsonb default '{}',
  ai_generated boolean default true,
  display_order int default 0,
  created_at timestamptz default now()
);

-- Traductions IA
create table field_translations (
  id uuid primary key default gen_random_uuid(),
  form_id uuid references forms(id) on delete cascade,
  language text not null,
  translations jsonb not null default '{}',  -- {field_id: {label, description, options}}
  ai_generated boolean default true,
  manually_reviewed boolean default false,
  created_at timestamptz default now(),
  unique(form_id, language)
);

-- Soumissions (métadonnées uniquement - les données vont dans la destination)
create table submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid references forms(id) on delete cascade,
  respondent_language text default 'fr',
  ip_hash text,  -- anonymisé
  user_agent text,
  completed_at timestamptz default now(),
  actions_triggered jsonb default '[]'  -- log des actions executees
);

-- Index performance
create index on fields(form_id, field_order);
create index on logic_rules(form_id);
create index on submissions(form_id, completed_at);

-- RLS (Row Level Security)
alter table teams enable row level security;
alter table forms enable row level security;
alter table fields enable row level security;
alter table submissions enable row level security;

-- Policies (exemples - à adapter)
create policy "Team members can see their forms"
  on forms for select
  using (
    team_id in (
      select team_id from team_members where user_id = auth.uid()
    )
  );
```

---

## Façade IA interchangeable

```typescript
// lib/ai/provider.ts
type AIProvider = 'claude' | 'openai'

const PROVIDER = (process.env.AI_PROVIDER as AIProvider) ?? 'claude'

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function complete(prompt: string, systemPrompt?: string): Promise<string> {
  if (PROVIDER === 'openai') {
    const { default: openai } = await import('./openai')
    return openai.complete(prompt, systemPrompt)
  }
  const { default: claude } = await import('./claude')
  return claude.complete(prompt, systemPrompt)
}

export async function translateForm(formSchema: object, targetLanguage: string): Promise<object> {
  const prompt = `Tu es un traducteur expert. Traduis tous les textes de ce schéma de formulaire vers ${targetLanguage}. 
  Réponds UNIQUEMENT en JSON valide avec la même structure.
  Schéma : ${JSON.stringify(formSchema)}`
  const result = await complete(prompt)
  return JSON.parse(result)
}

export async function analyzeResponses(responses: object[], fields: object[]): Promise<string> {
  const prompt = `Analyse ces réponses de formulaire et donne un résumé en 3-5 points clés avec des insights actionnables.
  Champs : ${JSON.stringify(fields)}
  Réponses (échantillon) : ${JSON.stringify(responses.slice(0, 50))}`
  return complete(prompt)
}

export async function suggestChartType(field: object, sampleData: any[]): Promise<string> {
  const prompt = `Quel type de graphique est le plus adapté pour visualiser ce champ de formulaire ?
  Champ : ${JSON.stringify(field)}
  Données exemple : ${JSON.stringify(sampleData.slice(0, 20))}
  Réponds UNIQUEMENT avec un de ces types : bar, pie, line, number, word_cloud, table`
  return complete(prompt)
}
```

**Variables d'environnement (.env.local) :**
```env
# IA
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
# Pour OpenAI : AI_PROVIDER=openai + OPENAI_API_KEY=sk-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Email
RESEND_API_KEY=...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Moteur d'actions post-soumission

```typescript
// lib/actions-engine/index.ts
import { triggerWebhook } from './webhook'
import { callRestApi } from './rest-api'
import { sendEmail } from './email'

export async function executeActions(
  formId: string,
  submissionData: Record<string, any>,
  respondentEmail?: string
) {
  const { data: actions } = await supabase
    .from('form_actions')
    .select('*')
    .eq('form_id', formId)
    .eq('is_active', true)

  const results = await Promise.allSettled(
    actions?.map(action => {
      switch (action.type) {
        case 'webhook':
          return triggerWebhook(action.config, submissionData)
        case 'rest_api':
          return callRestApi(action.config, submissionData)
        case 'email':
          return sendEmail(action.config, submissionData, respondentEmail)
      }
    }) ?? []
  )
  return results
}

// lib/actions-engine/rest-api.ts
export async function callRestApi(config: any, data: Record<string, any>) {
  // Mapping visuel : {form_field_id: api_field_name}
  const mappedBody = Object.entries(config.field_mapping).reduce(
    (acc, [formFieldId, apiFieldName]) => ({
      ...acc,
      [apiFieldName as string]: data[formFieldId]
    }),
    {}
  )

  return fetch(config.url, {
    method: config.method ?? 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.auth_type === 'bearer' && {
        Authorization: `Bearer ${config.auth_value}`
      }),
      ...(config.auth_type === 'api_key' && {
        [config.auth_header ?? 'X-API-Key']: config.auth_value
      }),
      ...config.headers
    },
    body: JSON.stringify(mappedBody)
  })
}
```

---

## Types TypeScript

```typescript
// types/index.ts

export type FieldType =
  | 'short_text' | 'long_text' | 'email' | 'phone' | 'number'
  | 'single_choice' | 'multiple_choice' | 'dropdown'
  | 'rating' | 'nps' | 'date' | 'file'
  | 'section_break' | 'statement'

export interface MultilingualText {
  fr: string
  en?: string
  es?: string
  [lang: string]: string | undefined
}

export interface FieldOption {
  id: string
  label: MultilingualText
  value?: string
}

export interface Field {
  id: string
  form_id: string
  type: FieldType
  label: MultilingualText
  description: MultilingualText
  placeholder: MultilingualText
  options: FieldOption[]
  required: boolean
  field_order: number
  validation: {
    min?: number
    max?: number
    pattern?: string
    accept?: string[]  // pour file
  }
}

export interface LogicRule {
  id: string
  form_id: string
  source_field_id: string
  condition: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
  condition_value: string
  action_type: 'show_field' | 'hide_field' | 'jump_to' | 'end_form'
  target_field_id?: string
  rule_order: number
}

export interface FormTheme {
  bg: string
  accent: string
  font: string
  banner_url?: string
  logo_url?: string
  text_color?: string
  button_style?: 'filled' | 'outline' | 'ghost'
}

export interface Form {
  id: string
  team_id: string
  title: string
  slug: string
  description?: string
  display_mode: 'scroll' | 'typeform'
  status: 'draft' | 'published' | 'closed'
  is_template: boolean
  theme: FormTheme
  access_type: 'public' | 'private' | 'password'
  languages: string[]
  default_language: string
  fields?: Field[]
  logic_rules?: LogicRule[]
  created_at: string
  updated_at: string
}

export interface FormStats {
  total_responses: number
  completion_rate: number
  avg_time_seconds: number
  responses_by_day: { date: string; count: number }[]
}
```

---

## Pages & composants clés à développer

### 1. Dashboard principal `/`
- Stats globales : total formulaires, réponses cette semaine, taux completion moyen
- Liste des formulaires récents avec status badge (draft/published/closed)
- Bouton "Nouveau formulaire" proéminent
- Accès rapide aux modèles
- Palette de commandes (Cmd+K) pour navigation rapide

### 2. Builder `/forms/[id]/edit`
Structure en 3 colonnes :
- **Colonne gauche (280px)** — Palette de champs organisée par catégorie (Texte, Choix, Fichiers, Mise en page). Drag pour ajouter.
- **Colonne centre (flexible)** — Canvas avec les champs dans l'ordre. Drag & drop pour réorganiser. Clic pour sélectionner. Preview live avec toggle mobile/desktop.
- **Colonne droite (320px)** — Paramètres du champ sélectionné. Onglets : Contenu | Logique | Style. Et en bas : onglets globaux du formulaire : Thème | Langues | Destination | Actions | Partage

**Comportements importants :**
- Autosave toutes les 2s après modification
- Undo/redo (Cmd+Z / Cmd+Shift+Z)
- Chaque champ a un menu contextuel (dupliquer, supprimer, logique)
- Drag handle visible au hover
- Indicateur de preview en temps réel

### 3. Éditeur de logique
Interface visuelle type "si... alors..." :
```
Si [Champ: Êtes-vous étudiant ?] [est égal à] [Oui]
Alors [Afficher] [Champ: Nom de votre école]
```
Bouton "+" pour ajouter des règles. Visualisation du flux sous forme de mini-diagramme.

### 4. Éditeur de thème
- Sélecteur de couleur pour fond, accent, texte
- Upload bannière/logo
- Choix de police (liste de Google Fonts)
- Preview temps réel intégré
- Mode sombre/clair du formulaire

### 5. Éditeur de traductions
Onglets par langue. Pour chaque langue :
- Bouton "Traduire avec l'IA" (traduit tout en 1 clic)
- Chaque champ éditable manuellement
- Indicateur de progression (X/Y champs traduits)
- Badge "IA" vs "Manuel" par champ

### 6. Onglet Actions (post-soumission)
Liste d'actions avec bouton "Ajouter une action". Pour chaque action :
- **Webhook** : URL, méthode, headers custom
- **API REST** : URL, méthode, type d'auth (Bearer/API Key), mapping visuel champs form → champs API
- **Email** : destinataire, sujet, corps avec variables `{{champ_id}}`

Le mapping visuel pour API REST = deux colonnes reliées par des lignes (comme n8n mais simplifié) :
```
[Nom]          →    [first_name]
[Email]        →    [email]  
[Téléphone]    →    [phone]
```

### 7. Vue formulaire répondant `/f/[slug]`
- **Mode scroll** : tout affiché, barre de progression en haut
- **Mode typeform** : 1 question centrée, transitions slide up/down, raccourci Entrée pour suivant
- Bouton langue en haut à droite (FR | EN | ES)
- Responsive parfait mobile/desktop
- Gestion logique if/else côté client (cacher/montrer sans requête serveur)
- Page de confirmation personnalisable (texte + redirect optionnel)

### 8. Dashboard formulaire `/forms/[id]`
- Stats : nb réponses, taux completion, temps moyen, évolution temporelle
- Graphiques générés automatiquement par l'IA pour chaque champ
- Bouton "Analyser avec l'IA" → résumé textuel des insights
- Tableau des réponses brutes avec tri/filtre/recherche
- Export : XLSX, CSV, Google Sheets
- Boutons : Partager, Modifier, Cloner, Archiver

### 9. Galerie de modèles `/templates`
- Grid de cartes avec preview miniature
- Filtres par catégorie (Candidature, Satisfaction, Événement, Contact, etc.)
- Bouton étoile sur chaque formulaire → cloner en template
- Créer depuis un template = copie indépendante

---

## Route API de soumission

```typescript
// app/api/submit/[slug]/route.ts
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const body = await req.json()
  const { slug } = params

  // 1. Récupérer le formulaire + destination + actions
  const form = await getFormBySlug(slug)
  if (!form || form.status !== 'published') return Response.json({ error: 'Form not found' }, { status: 404 })

  // 2. Validation serveur
  const validationErrors = validateSubmission(body.responses, form.fields)
  if (validationErrors.length) return Response.json({ errors: validationErrors }, { status: 422 })

  // 3. Enregistrer dans la destination choisie
  await writeToDestination(form.destination, body.responses, form.fields)

  // 4. Créer la soumission (métadonnées)
  const submission = await createSubmission(form.id, body.language)

  // 5. Exécuter les actions en parallèle (non-bloquant)
  executeActions(form.id, body.responses, body.respondent_email).catch(console.error)

  return Response.json({ success: true, submission_id: submission.id })
}
```

---

## Destinations — auto-création des tables

```typescript
// lib/destinations/supabase-internal.ts
export async function ensureTableExists(formId: string, fields: Field[]) {
  const tableName = `responses_${formId.replace(/-/g, '_')}`
  
  const columns = fields.map(f => {
    switch (f.type) {
      case 'number': case 'rating': case 'nps': return `"${f.id}" numeric`
      case 'multiple_choice': return `"${f.id}" text[]`
      case 'date': return `"${f.id}" date`
      default: return `"${f.id}" text`
    }
  }).join(',\n  ')

  await supabaseAdmin.rpc('exec_sql', {
    sql: `
      create table if not exists "${tableName}" (
        id uuid primary key default gen_random_uuid(),
        submitted_at timestamptz default now(),
        language text,
        ${columns}
      );
    `
  })
  return tableName
}

// Appelé automatiquement à la publication du formulaire
export async function publishForm(formId: string) {
  const form = await getForm(formId)
  await ensureTableExists(formId, form.fields)
  await supabase.from('forms').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', formId)
}
```

---

## Composants UI prioritaires à créer

### Button
```tsx
// Variantes : primary, secondary, ghost, danger
// Tailles : sm, md, lg
// États : loading (spinner), disabled
// Avec icône gauche/droite optionnelle
```

### FieldCard (builder)
```tsx
// Fond semi-transparent avec border au hover
// Drag handle (icône 6 points) à gauche
// Type badge en haut à droite
// Texte de la question en grand
// Menu contextuel (3 points) : Dupliquer | Ajouter logique | Supprimer
// Border accent quand sélectionné
// Animation smooth de réorganisation (framer-motion layout)
```

### ChartWidget (dashboard)
```tsx
// Card avec titre, badge "IA" si auto-généré
// Dropdown pour changer le type de graphique
// Bouton "Supprimer" discret
// Bouton "Ajouter un graphique" en bas de la liste
// Recharts avec couleurs du thème accent
```

---

## Ordre de développement recommandé

### Phase 1 — Fondations (V1)
1. Setup Next.js + Supabase + Tailwind + migrations SQL
2. Auth (login/signup/logout) avec Supabase Auth
3. Gestion équipe + rôles
4. CRUD formulaires (liste, créer, supprimer, archiver)
5. Builder drag & drop avec champs de base (texte, choix, email)
6. Soumission formulaire → Supabase interne
7. Dashboard basique (nb réponses, tableau)

### Phase 2 — Complet (V1 finalisé)
8. Personnalisation thème + bannière
9. Logique if/else visuelle
10. Mode Typeform côté répondant
11. Export XLSX/CSV
12. Graphiques auto (Recharts)
13. Façade IA + traduction multilingue
14. Destinations Airtable + Google Sheets

### Phase 3 — Intégrations (V2)
15. Moteur d'actions (webhook + API REST + email)
16. Mapping visuel champs → API externe
17. Galerie de modèles (étoile = clone)
18. Analyse IA des réponses
19. Palette de commandes Cmd+K
20. Notifications email (Resend)

---

## Contraintes & bonnes pratiques

- **TypeScript strict** partout, zéro `any`
- **RLS activé** sur toutes les tables Supabase — ne jamais bypasser côté client
- **Validation Zod** sur toutes les routes API
- **Optimistic updates** sur le builder (UI réactive sans attendre le serveur)
- **Autosave** dans le builder avec debounce 2s
- **Responsive** — formulaires répondants parfaits sur mobile
- **Accessibilité** — labels, aria, navigation clavier dans le builder
- **Rate limiting** sur la route `/api/submit` (max 10 req/min par IP)
- **Slug unique** généré automatiquement depuis le titre (slugify + suffixe aléatoire)
- **Pas de modification après envoi** — les soumissions sont immuables

---

## Ce que l'outil remplace

| Avant | Après |
|-------|-------|
| Tally (formulaires) | Papyrus builder |
| n8n (automatisation) | Moteur d'actions intégré |
| Jarvis via n8n | Action "API REST" avec mapping visuel |
| Airtable séparé | Destination intégrée, table auto-créée |
| Traduction manuelle | Traduction IA en 1 clic |
| Google Forms (analyse) | Dashboard IA avec graphiques auto |

---

## Démarrage du projet

```bash
npx create-next-app@latest papyrus --typescript --tailwind --app
cd papyrus
npm install @supabase/supabase-js @supabase/ssr @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities framer-motion recharts lucide-react react-hook-form zod @hookform/resolvers resend
npx supabase init
```

Lance les migrations SQL, configure les variables d'environnement, et commence par la Phase 1.
Je veux aussi par la suite pouvoir coder et ca me donner le formaulaire par exemple je vais sur claude je lui dit je veux poser tel question ... il créer un code quon peut mettre dans papyrus et ca affiche le formulaire.