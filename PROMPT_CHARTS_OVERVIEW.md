# Graphiques automatiques — Onglet "Vue d'ensemble"

## Contexte
Dans `/forms/[id]`, l'onglet "Vue d'ensemble" doit afficher des graphiques générés
automatiquement à partir des réponses, un par champ (sauf texte libre). Le choix du type
de graphique suit des règles déterministes (pas d'IA), basées sur le type de champ et le
volume de données. Stack disponible : Recharts (déjà installé), @dnd-kit (déjà installé).

## Fichiers à lire en premier
```
types/index.ts (Field, FormStats)
components/dashboard/ChartWidget.tsx (s'il existe déjà)
app/(dashboard)/forms/[id]/page.tsx (ou l'onglet vue d'ensemble)
lib/scoring.ts (pour le style des barres/couleurs déjà utilisé)
```

---

## Partie 1 — Règles de sélection automatique du graphique

Crée `lib/chart-selector.ts` :

```typescript
export type ChartKind = 'pie' | 'bar' | 'bar_horizontal' | 'number_big' | 'list' | 'histogram' | 'heatmap'

export function selectChartKind(field: Field, responseCount: number): ChartKind {
  switch (field.type) {
    case 'single_choice':
    case 'dropdown':
      return field.options.length <= 6 ? 'pie' : 'bar_horizontal'
    case 'multiple_choice':
      return 'bar_horizontal'
    case 'rating':
    case 'nps':
      return 'bar'  // + score moyen affiché séparément au-dessus
    case 'matrix':
      return 'heatmap'  // toggle disponible vers 'bar' groupé par ligne
    case 'date':
      return 'histogram'
    case 'short_text':
    case 'long_text':
      return 'list'  // pas de graphique, liste scrollable des réponses
    default:
      return 'list'
  }
}
```

### Regroupement "Autres" pour les camemberts avec beaucoup d'options
Dans la fonction qui prépare les données du camembert :
```typescript
export function preparePieData(optionCounts: { label: string; count: number }[], maxSlices = 5) {
  const sorted = [...optionCounts].sort((a, b) => b.count - a.count)
  if (sorted.length <= maxSlices) return sorted
  const top = sorted.slice(0, maxSlices)
  const rest = sorted.slice(maxSlices)
  const othersCount = rest.reduce((sum, o) => sum + o.count, 0)
  return [...top, { label: 'Autres', count: othersCount, _grouped: rest }]
}
```
Le slice "Autres" doit être cliquable : au clic, afficher un petit popover ou une liste dépliée
montrant le détail des options regroupées (`_grouped`).

---

## Partie 2 — Composant ChartWidget

Refonds ou crée `components/dashboard/ChartWidget.tsx` avec cette structure :

```tsx
interface ChartWidgetProps {
  field: Field
  data: ResponseData[]
  title: string
  onTitleChange: (newTitle: string) => void
  onDelete: () => void
  isExportMode?: boolean  // true en contexte PDF — cache les contrôles
}
```

**Rendu attendu :**
- Card avec le titre éditable inline (clic sur le titre → input, blur/Enter pour confirmer)
- Le graphique selon `selectChartKind`
- Badge "IA" retiré si non pertinent (les graphiques ne sont plus générés par IA, juste auto-sélectionnés) — remplace par rien ou par une icône discrète
- Bouton supprimer (icône poubelle, coin supérieur droit, caché si `isExportMode`)
- Pour `matrix` : un toggle Heatmap / Barres (coin supérieur droit du widget, caché si `isExportMode`)
- Pour `pie` : légende à droite du camembert (pas en dessous) + pourcentage affiché directement dans chaque part (utilise le `label` prop de Recharts `<Pie>` avec un renderer custom affichant `${(percent * 100).toFixed(0)}%`)

### Drag & drop pour réordonner
Utilise `@dnd-kit/sortable` (déjà dans le projet) pour permettre de glisser-déposer les cards de graphiques dans l'onglet Vue d'ensemble. Persiste l'ordre dans `form.theme.chart_order` ou une nouvelle propriété `display_order` sur une entité `charts` si elle existe déjà dans le store local.

---

## Partie 3 — Export PDF

Crée `lib/export/export-pdf.ts` :

**Approche** : utilise `html2canvas` + `jspdf` (à installer : `npm install html2canvas jspdf`).

```typescript
export async function exportOverviewToPDF(formTitle: string, responseCount: number, containerElement: HTMLElement) {
  // 1. Cloner temporairement le container avec isExportMode=true sur tous les widgets
  //    (re-render React avec le flag, pas de manipulation DOM brute)
  // 2. Capturer chaque ChartWidget individuellement via html2canvas (meilleure qualité
  //    que de capturer toute la page d'un coup)
  // 3. Assembler en PDF avec jsPDF :
  //    - Page de garde : titre du formulaire (grand, centré) + "X réponses" en sous-titre
  //    - Pages suivantes : grille 2 colonnes, les images des graphiques capturés
  //    - Le nombre de pages dépend du nombre de graphiques (pagination automatique)
}
```

**Étapes concrètes :**
1. Avant la capture, passe `isExportMode={true}` à tous les `ChartWidget` (re-render temporaire) pour masquer toggles/boutons supprimer/drag handles
2. Capture chaque widget avec `html2canvas(element, { backgroundColor: '#FFFDF5', scale: 2 })` pour une bonne résolution
3. Crée le PDF avec `jsPDF({ unit: 'mm', format: 'a4' })` :
   - Page 1 : titre + stats, fond `--papyrus-bg`
   - Pages suivantes : 2 images de graphique par ligne, marge cohérente
4. Restaure `isExportMode={false}` après la capture
5. Déclenche le téléchargement avec `doc.save(\`${formTitle}-rapport.pdf\`)`

**Bouton dans l'UI** : "Exporter en PDF" dans l'onglet Vue d'ensemble, à côté du titre de section.

---

## Partie 4 — Export HTML interactif

Crée `lib/export/export-html.ts` :

**Approche** : génère un fichier `.html` autonome qui embarque :
- Les données des réponses (figées au moment de l'export, en JSON inline dans un `<script>`)
- React + Recharts via CDN (unpkg ou jsdelivr)
- Le rendu des `ChartWidget` mais en lecture seule pour les contrôles d'édition (pas de
  drag & drop, pas de suppression, pas d'édition de titre) — **seule l'interactivité native
  des graphiques reste active** : hover/tooltip Recharts, et le toggle Heatmap/Barres pour
  les matrices reste fonctionnel (c'est de l'interactivité de visualisation, pas d'édition)

```typescript
export function generateInteractiveHTML(form: Form, chartsData: ChartData[]): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${form.title} — Rapport interactif</title>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/recharts/umd/Recharts.js"></script>
  <style>/* reprendre les variables CSS Parchemin essentielles, fond papyrus-bg, etc. */</style>
</head>
<body>
  <div id="root"></div>
  <script id="chart-data" type="application/json">${JSON.stringify(chartsData)}</script>
  <script>
    // Composant minimal de rendu des graphiques en lecture seule,
    // réutilisant la même logique de selectChartKind compilée en JS vanilla
    // (pas de build step possible ici — code autonome)
  </script>
</body>
</html>`
}
```

**Important** : comme ce fichier n'a pas de build step (pas de webpack/vite), le composant
de rendu doit être écrit en JS vanilla utilisant l'API `Recharts` globale exposée par le
script UMD, pas du JSX. Génère un composant simplifié qui couvre au minimum : pie, bar,
bar_horizontal, heatmap basique (grille colorée en CSS plutôt que Recharts si plus simple).

**Bouton dans l'UI** : "Exporter en HTML interactif", à côté du bouton PDF.

---

## Critères de validation
- [ ] `single_choice` avec 4 options → camembert avec légende à droite et % dans chaque part
- [ ] `single_choice` avec 10 options → barres horizontales, ou camembert avec "Autres" regroupant le surplus
- [ ] `multiple_choice` → toujours barres horizontales
- [ ] `matrix` → toggle heatmap/barres fonctionnel
- [ ] Titre d'un graphique modifiable en cliquant dessus
- [ ] Glisser-déposer réordonne les graphiques et persiste l'ordre
- [ ] Export PDF : 2 colonnes, page de garde avec titre + nb réponses, aucun toggle/bouton visible
- [ ] Export HTML : fichier autonome ouvrable sans backend, tooltips et toggle matrice fonctionnels, pas d'édition possible

## Règles
- Zéro `any`
- Annonce les fichiers que tu vas créer/modifier avant de commencer
- Si `html2canvas` ou `jspdf` ne sont pas installables (vérifie le réseau), dis-le moi avant de chercher une alternative
