# Papyrus — Roadmap

> Carnet de route du builder de formulaires Mooove. Ce qu'il sait faire aujourd'hui, ce qu'il fera demain, et dans quel ordre.
> Pour la vision long terme et la stack, voir [`prompt_papyrus_claude_code.md`](prompt_papyrus_claude_code.md). Ce document **est** la source de vérité pour le statut.

**Légende** · ✅ livré · 🛠️ en cours · ⏳ à faire · 🔮 idée long terme

---

## État actuel — v0.1 « Builder local »

Le cœur de l'outil — la création d'un formulaire — est solide et utilisable hors-ligne (persistance localStorage, pas encore branché à Supabase). Les répondants ne peuvent pas encore remplir un formulaire publié : c'est l'étape v0.2.

**Ce qu'on peut faire maintenant**
- Créer / dupliquer / supprimer un formulaire et naviguer entre eux
- Ajouter 16 types de champs depuis une palette catégorisée
- Réordonner les champs en drag & drop, mise en page 1 ou 2 colonnes
- Personnaliser à fond le rendu (fond, bannière, couleurs, typographie globale ou par champ)
- Prévisualiser dans les 3 modes (Pages, Défilement, Une à une) en desktop ou mobile
- Configurer la logique conditionnelle (stockée, pas encore évaluée à l'exécution)
- Tester la sauvegarde & reprise et l'anti-doublon depuis l'aperçu

---

## Versions

### v0.1 — Builder local ✅ (livré, finitions en cours)

**Création**
- ✅ Liste des formulaires + création / duplication / suppression
- ✅ Édition inline du titre + slug auto
- ✅ Statut brouillon / publié (toggle, pas encore d'effet réel)
- ✅ 16 types de champs : `short_text`, `long_text`, `email`, `url`, `phone` (avec indicatif pays), `number`, `date`, `single_choice`, `multiple_choice`, `dropdown`, `rating`, `nps`, `file`, `matrix`, `image`, `video` (YouTube/Vimeo), `section_break`, `statement`
- ✅ Drag & drop des champs (dnd-kit)
- ✅ Mise en page : `full` ou `half` (2 par ligne, responsive 1 col sur mobile)
- ✅ Option « Autre » pour les champs à choix, avec libellé personnalisable
- ✅ Disposition des options en 1 / 2 / 3 colonnes

**Design**
- ✅ Fond : couleur unie, dégradé, image (avec voile de lisibilité), preset
- ✅ Bannière avec mode d'affichage (cover / contain) et position
- ✅ Couleur des blocs (carte des questions)
- ✅ Couleur d'accent restreinte à la marque Mooove (Navy / Electric / Cyan)
- ✅ Style typographique global ou par champ (couleur, police, taille, alignement, gras, italique)
- ✅ L'accent s'applique partout : boutons, radio/checkbox natifs, cartes sélectionnées, liserés des sous-questions, matrice…

**Modes d'aperçu**
- ✅ Pages — avec barre de progression + navigation Suivant/Précédent + validation HTML5
- ✅ Défilement — tout sur une page, scroll
- ✅ Une à une — style Typeform, carte centrée, Entrée pour avancer, animations Framer Motion
- ✅ Bannière + titre du formulaire affichés sur la première slide du mode Une à une
- ✅ Texte libre (statement) rendu distinct d'une question (liseré gauche, pas de carte)

**Choix unique** (single_choice)
- ✅ Affichage en cartes (radio classique) ou en boutons pleins
- ✅ Randomisation de l'ordre des options à chaque chargement

**Choix multiple** (multiple_choice)
- ✅ Limite de sélection min/max avec message en rouge hors plage et blocage du bouton Suivant
- ✅ Randomisation de l'ordre des options
- ✅ Sous-questions par option cochée — un seul jeu de sous-champs, répété sous chaque option cochée par le répondant. Tous les types de champs sont éligibles comme sous-question. Stockage prévu en colonnes `[field_id]__[option_slug]__[subfield_id]` ([`lib/submission-columns.ts`](lib/submission-columns.ts))
- ✅ Isolation DOM des sous-questions répétées (id composite) — pas d'inter-blocage entre options

**Réglages du formulaire**
- ✅ Sauvegarde et reprise — auto-save dans `localStorage`, bannière « Vous avez une réponse en cours · Reprendre / Recommencer ». Activé par défaut.
- ✅ Anti-doublon par email — toggle ; nécessite un champ email. Activé par défaut. Stub `/api/check-duplicate` en place.

**Logique conditionnelle**
- ✅ Éditeur de règles (afficher/masquer un champ, sauter à une section)
- ✅ Actions et cibles adaptées au mode d'affichage
- ⏳ Évaluation à l'exécution pendant le remplissage *(v0.2)*

**Persistance**
- ✅ localStorage (mode `IS_LOCAL_MODE`)
- ✅ Migration Supabase prête côté SQL (avec RLS) mais désactivée
- ⏳ Bascule effective vers Supabase + import depuis localStorage *(v0.2)*

---

### v0.1.5 — Modèles, dashboard & fondations workspace 🛠️ (en cours)

On enrichit le builder côté découverte / réutilisation avant de partir sur la collecte. Tout reste local pour l'instant, mais le modèle de données est prêt pour le multi-tenant.

**Page Modèles — 3 onglets**
- ⏳ **Mes modèles** — formulaires que j'ai marqués `is_template` (perso)
- ⏳ **Modèles de l'équipe** — partagés au sein de mon workspace (l'admin peut « élever » un modèle perso au scope orga)
- ⏳ **Modèles Mooove** — bibliothèque officielle, seedée en dur dans le code ([`lib/templates/seeds.ts`](lib/templates/seeds.ts) à créer) : NPS, satisfaction client, brief créatif, recrutement, événement…
- ⏳ Bouton ⭐ favori sur chaque carte — les favoris remontent dans le dashboard
- ⏳ Action « Utiliser ce modèle » qui clone dans mes formulaires personnels

**Dashboard — refonte**
- ⏳ Section **Modèles favoris** (3-4 cartes en haut)
- ⏳ Section **Formulaires récents** (5 derniers édités, statut, badge réponses quand v0.2)
- ⏳ Section **Brouillons** non publiés
- ⏳ Bandeau de **stats rapides** (total formulaires, drafts, réponses du mois)
- ⏳ Activité récente *(post-v0.2 — quand vraies réponses)*

**Page Formulaire `/forms/[id]` — refonte**
- ⏳ En-tête avec titre, statut, badge « Modèle », et menu d'actions
- ⏳ Actions : **Modifier** / **Cloner** / **Convertir en modèle** (toggle) / **Archiver** (toggle) / **Supprimer**
- ⏳ Onglet **Vue d'ensemble** — préfiguration des graphiques par champ (vraies données en v0.3)
- ⏳ Onglet **Réponses** — table brute + boutons Export CSV/XLSX (désactivés jusqu'à v0.2)
- ⏳ Onglet **Partage** — lien direct copiable, QR code généré (via `api.qrserver.com`), code d'intégration iframe
- ⏳ Bandeau stats : 4 cartes (réponses, vues, taux complétion, temps moyen) avec valeurs « bientôt » en attendant v0.2

**Fondations workspace (local pour l'instant)**
- ⏳ Notion de `scope` sur Form : `'personal' | 'workspace' | 'global'` — détermine qui voit le modèle
- ⏳ Store local pour les favoris : `{ user_id, template_id }[]` dans localStorage
- ⏳ Un seul « workspace local » par défaut (id : `local`) pour faire tenir l'archi multi-tenant sans backend
- ⏳ Plus tard (v1.0 + Supabase) : vrais workspaces, vrais users, vrais rôles admin/membre. Le code écrit maintenant n'aura qu'à changer la source de données.

---

### v0.2 — Page publique & collecte 🛠️ (prochaine étape)

Sans cette version, les formulaires ne sont pas réellement utilisables : c'est la priorité.

- ⏳ Page publique `/f/[slug]` — rend le formulaire à partir de son slug, accessible sans auth
- ⏳ Soumission des réponses — POST vers une route serveur qui persiste dans la table `submissions`
- ⏳ Activation Supabase : bascule du mode local vers Supabase derrière un flag, import optionnel des formulaires existants depuis localStorage
- ⏳ Génération automatique des colonnes au moment de la publication : la table de réponses du formulaire reçoit une colonne par champ + une colonne par paire `option × sous-champ` (voir `subfieldColumn()`)
- ⏳ Évaluation à l'exécution de la logique conditionnelle (montrer/cacher un champ, sauter à une section, terminer)
- ⏳ Wiring réel du save & resume sur `/f/[slug]` (la mécanique existe déjà côté aperçu)
- ⏳ Wiring réel du check-duplicate par email avant soumission finale (route stub déjà en place)
- ⏳ Page de remerciement personnalisable après soumission
- ⏳ Mode « formulaire fermé » (statut `closed`) + page d'erreur explicite
- ⏳ Captcha léger anti-spam (à choisir : Turnstile, hCaptcha, ou honeypot maison)

---

### v0.3 — Tableau des réponses ⏳

Une fois les réponses qui rentrent, il faut les regarder. (Le dashboard d'accueil est livré en v0.1.5, c'est ici qu'on construit la vue détaillée par formulaire.)

- ⏳ Tableau des réponses d'un formulaire — tri, filtre, recherche, pagination
- ⏳ Export CSV (et éventuellement Excel) en respectant le naming `field_id__option__subfield`
- ⏳ Vue détaillée d'une réponse individuelle
- ⏳ Statistiques de complétion (vues, taux de complétion, temps moyen)
- ⏳ Suppression / archivage d'une réponse (avec confirmation)
- 🔮 Graphiques auto-générés (Recharts) par champ — barres pour les choix, ligne pour les dates, etc.

---

### v0.4 — IA & multilingue ⏳

La façade IA (`lib/ai/`) est déjà prête mais non branchée.

- ⏳ Génération de formulaires à partir d'un prompt en langage naturel (« Crée-moi un sondage de satisfaction client »)
- ⏳ Suggestions de questions selon le contexte
- ⏳ Traduction automatique des libellés (FR ↔ EN ↔ ES) via Claude ou GPT
- ⏳ Validation manuelle des traductions IA dans l'UI
- 🔮 Graphiques IA — auto-choix du type de viz pour chaque champ
- 🔮 Résumé IA des réponses textuelles longues

---

### v0.5 — Templates multi-tenant (post-Supabase) ⏳

L'UI des templates est livrée dès v0.1.5 (mode local). Cette version branche le vrai partage entre utilisateurs / workspaces.

- ⏳ Partage cross-workspace via Supabase RLS (Row Level Security)
- ⏳ Galerie publique de modèles communautaires (créateurs externes)
- ⏳ Statistiques sur un modèle (combien de clones, ratings…)
- ⏳ Versionning des modèles Mooove (mise à jour sans casser les clones existants)

---

### v0.6 — Actions & intégrations ⏳

- ⏳ Webhook personnalisé déclenché à la soumission
- ⏳ Envoi d'email post-soumission (Resend) — au répondant ou au créateur, avec template
- ⏳ Appel API REST avec mapping visuel des champs vers les paramètres
- ⏳ Connecteur **Airtable** — mappe les champs Papyrus vers les colonnes Airtable
- ⏳ Connecteur **Google Sheets**
- 🔮 Connecteur Notion, Slack, Discord

---

### v1.0 — Équipes & multi-utilisateurs ⏳

- ⏳ Authentification Supabase (email/password + OAuth Google)
- ⏳ Espaces de travail (« team ») avec rôles admin / membre
- ⏳ Partage d'un formulaire au sein d'une équipe
- ⏳ Historique des modifications (audit log)
- 🔮 Commentaires sur les champs en mode édition collaborative
- 🔮 Édition simultanée à plusieurs (CRDT / Liveblocks ?)

---

## Décisions techniques importantes

À garder en tête avant de modifier le code :

**Sous-questions de `multiple_choice`** — un seul jeu de sous-champs est défini dans `field.subfields`, puis répété visuellement sous chaque option cochée. Chaque répétition reçoit un id composite `{optionId}__{subfieldId}` qui sert à la fois de `name` HTML (isolation des radios) et de nom de colonne SQL (`fieldColumn`/`subfieldColumn` dans [`lib/submission-columns.ts`](lib/submission-columns.ts)). **Ne jamais utiliser un id générique** : sinon les radios répétées se regroupent en un seul jeu.

**Couleur d'accent** — propagée via la variable CSS `--accent` posée sur le conteneur racine (modal d'aperçu, canvas du builder). Tout `border-accent`, `bg-accent`, `text-accent`, `accent-color` (radio/checkbox natifs) la lit automatiquement. Pour faire suivre l'accent à un nouveau composant, **ne pas coder en dur** `accent-mooove-navy` — utiliser `style={{ accentColor: 'var(--accent)' }}` ou les classes Tailwind `*-accent`.

**Save & resume** — l'auto-save écoute `input` + `change` qui remontent dans le conteneur ([`SaveResumeBar`](components/builder/SaveResumeBar.tsx)) et stocke un snapshot `{ [field.id]: value }`. La restauration walk le DOM et `dispatchEvent` un événement `input` pour que React voie la nouvelle valeur. Tous les inputs collecteurs de réponse doivent avoir un attribut `name={field.id}` (ou composite pour les sous-champs).

**Validation native HTML5** — les bornes `required`, `min`, `max`, type `email`/`url`/`number` sont utilisées telles quelles. Pour les contraintes plus complexes (au moins une case cochée, plage de sélection min/max), un input hidden avec `setCustomValidity` porte le message d'erreur. Le bouton submit doit rester `type="submit"` pour que la validation se déclenche.

**Mode local vs Supabase** — `IS_LOCAL_MODE` (env `NEXT_PUBLIC_LOCAL_MODE=true`) coupe l'auth et fait pointer tout le store sur `lib/store/local-forms.ts`. Le code Supabase est commenté dans les routes API (ex. `app/api/check-duplicate`). Ne pas dégrader le mode local — c'est la cible de dev quotidien.

**Type `SubField`** — sous-ensemble de `Field` sans les métadonnées du formulaire (`form_id`, `field_order`, `created_at`). Tous les types de champ sont autorisés comme sous-questions, donc on peut quasiment réutiliser `FieldRenderer` tel quel via un pseudo-Field.

---

## Dette technique & bugs connus

- ⏳ Mode `Une à une` (typeform) : la sauvegarde des valeurs entre slides est imparfaite — chaque `motion.form` a sa propre clé donc le DOM est remonté à chaque transition. À résoudre en lifting du state ou en clés stables quand on branchera la page publique.
- ⏳ Mode `Pages` (sections) : même soucis, `<form key={pageIdx}>` remonte les inputs à chaque changement de page. Les valeurs sont perdues si on revient en arrière.
- ⏳ Les sous-champs `rating`, `nps`, `file` ne peuvent pas être restaurés par save & resume — pas de `name`/value standard. Acceptable pour v0.1, à corriger pour v0.2.
- ⏳ Le toggle « Affichage en boutons » du `single_choice` ne stocke pas son `selected` dans un input nommé — la save & resume ne fonctionne pas dans ce mode. Idem : à corriger pour v0.2.
- ⏳ Le rechargement complet de l'image bannière à chaque keystroke sur le titre du formulaire (parce que `useForm` réémet l'objet entier) — pas critique mais perfectible.
- ⏳ Les formulaires créés avant l'ajout des défauts `save_and_resume` / `unique_email` ont ces valeurs à `undefined` — le toggle s'affiche bien mais l'effet ne s'active pas tant qu'on ne re-coche pas manuellement.

---

## Notes sur les tests

Aucun framework de test n'est installé (Vitest, Playwright, etc.). Les vérifications se font à la main dans le navigateur. Si on veut sérieusement industrialiser, c'est un chantier v1.0+ (typique avant l'ouverture publique).
