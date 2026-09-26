# Nido — règles du projet

Application d'organisation du quotidien pour un couple ou un groupe (charge
mentale, courses, menus, coffre à mots de passe, récap par email). Utilisée
**d'abord sur iPhone**, installée sur l'écran d'accueil. Vue d'ensemble :
`README.md` ; backlog : `docs/BACKLOG.md` ; charte : `design/DESIGN.md`.

## Commandes

```bash
npm run dev     # appli (Vite)
npm test        # tests (node --test : src/**/*.test.js et api/**/*.test.js)
npm run lint    # oxlint — aucun nouvel avertissement
npm run build   # doit passer (avec VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY factices)
```

## Conventions

- Code, noms, commentaires et textes de l'interface **en français**.
- Une fonctionnalité = un dossier `src/features/<nom>/` ; la logique pure
  (calculs, dates, parsing) dans un fichier `.js` sans React, testé à côté
  (`*.test.js`).
- Composants d'interface partagés : `src/components/ui.jsx` (Page, Carte,
  Bouton, ChampTexte). Couleurs uniquement via les tokens (`bg-bg-base`,
  `text-text-primary`…), jamais de couleur en dur pour du texte.

## 1. iPhone d'abord (Human Interface Guidelines d'Apple)

- **Mobile d'abord** : chaque écran se conçoit et se vérifie à **320 px**
  (iPhone SE) puis 390 px ; aucun défilement horizontal.
- **Zones tactiles ≥ 44 × 44 pt** : pour un petit bouton, ajouter la classe
  `cible-44` (agrandit la surface cliquable sans changer l'apparence).
- **Champs de saisie en 16 px minimum** (déjà imposé par `src/index.css`),
  sinon Safari zoome à la saisie. Bon `type` / `inputMode` / `autoComplete`
  pour avoir le bon clavier.
- **Retour immédiat au toucher** : état pressé visible (`active:scale-95`),
  mise à jour optimiste de l'écran puis enregistrement ; jamais de clic
  sans réaction visible.
- **Rien qui dépende du survol** (`hover:` seulement en complément).
- **Navigation** : barre d'onglets en bas (5 onglets au plus), grands titres
  de page, actions principales à portée de pouce (bas de l'écran).
- **Zones de sécurité** : respecter `env(safe-area-inset-*)` pour tout
  élément fixé en haut ou en bas.
- **Police système** (SF Pro), tailles lisibles (texte courant ≥ 15 px,
  jamais < 11 px), mise en page qui tient avec le zoom texte du système.
- **Animations** courtes et utiles ; `prefers-reduced-motion` est respecté
  globalement (ne pas le contourner).
- Clair / sombre / système : tout nouvel écran se vérifie dans les deux thèmes.

## 2. Accessibilité (WCAG 2.1 AA)

- **Contraste** ≥ 4.5:1 pour le texte (3:1 pour le texte ≥ 24 px et les
  icônes utiles). Le bleu `accent` sert de fond de bouton ; pour du **texte**
  bleu, utiliser `text-accent-text`. Pas d'`opacity` sur du texte.
- **Un `<main>` et un `<h1>` par écran**, titres dans l'ordre (h1 → h2 → h3).
- Chaque contrôle a un **nom accessible** : libellé visible, `<label>`,
  ou `aria-label` pour les boutons icônes / emoji. Emojis décoratifs en
  `aria-hidden="true"`.
- États exposés : `aria-pressed`, `aria-checked`, `aria-selected`,
  `aria-expanded`, `role="switch"`… ; messages d'état en `role="status"`.
- **Clavier** : tout est atteignable et utilisable au clavier, focus visible
  (déjà global dans `src/index.css`), pas de piège au focus.
- La couleur ne porte jamais seule une information (toujours un texte ou une
  icône en plus).
- `lang="fr"` ; textes clairs, tutoiement, pas de jargon.

## 3. Erreurs et cas limites

- Écrans d'erreur prévus : `src/components/Erreurs.jsx` — page **404**
  (`PageIntrouvable`), **limite d'erreur** globale (`LimiteErreur`, gère
  aussi « nouvelle version » après un déploiement), bandeau **hors
  connexion**. Ne pas les contourner.
- Chaque chargement a un état **chargement**, **vide** (avec une action
  proposée) et **erreur** (message humain, jamais d'erreur technique brute).
- Chaque action renvoie `null` ou un **message d'erreur en français** affiché
  près de l'action ; une mise à jour optimiste qui échoue recharge l'état réel.
- Fonctions serveur (`api/`) : réponses JSON ou pages HTML propres pour
  toutes les erreurs (400/401/404/405/500/503), jamais de trace technique.

## 4. Données et sécurité

- Toute table porte `espace_id` et a une **RLS** (`est_membre` / `est_admin`) ;
  toute requête côté appli filtre explicitement sur l'espace courant.
- Migrations SQL numérotées dans `supabase/migrations/` : **ne jamais
  modifier une migration déjà exécutée en production**, en ajouter une.
  Les tester sur un Postgres local (schéma `auth` / `storage` simulé) :
  RLS vérifiée pour un membre, un non-membre, un admin.
- Aucun secret dans le code : clés dans les variables Vercel / Supabase.
  Coffre : chiffrement uniquement côté navigateur (`src/features/coffre/crypto.js`).
- Contenu saisi par les membres toujours échappé dans le HTML généré côté
  serveur (emails, pages d'action).

## 5. Avant chaque push

1. `npm test`, `npm run lint`, `npm run build` au vert.
2. Parcours testé dans Chromium (Playwright, backend Supabase simulé) à
   320 px, en clair et en sombre.
3. **Audit accessibilité** avec axe-core (règles `wcag2a`, `wcag2aa`,
   `wcag21aa`, `best-practice`) sur les écrans touchés : zéro violation ;
   pas de débordement horizontal ; pas de zone tactile < 44 pt.
4. PR en brouillon, description en français (contenu, vérifications, étapes
   Supabase éventuelles).
