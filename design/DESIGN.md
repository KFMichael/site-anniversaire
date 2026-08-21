# Identité visuelle — style iOS

Remplace l'ancienne identité (fond sombre fixe, dégradé coucher de soleil,
Fraunces/Inter). Référence pour tout le site.

## Thème clair/sombre automatique

Pas de bouton de bascule. Le thème suit `prefers-color-scheme` du système,
via une media query en CSS qui redéfinit les tokens de couleur — les
composants ne connaissent jamais le thème actif, ils utilisent toujours les
mêmes classes (`bg-bg-base`, `text-text-primary`, etc.).

## Couleurs

| Token                      | Light                        | Dark                          |
|-----------------------------|-------------------------------|--------------------------------|
| `--color-bg-base`           | `#F2F2F7`                     | `#000000`                      |
| `--color-bg-elevated`       | `#FFFFFF`                     | `#1C1C1E`                      |
| `--color-bg-elevated-glass` | `rgb(255 255 255 / 0.72)`     | `rgb(28 28 30 / 0.72)`         |
| `--color-text-primary`      | `#000000`                     | `#FFFFFF`                      |
| `--color-text-secondary`    | `#48484A`                     | `#C7C7CC`                      |
| `--color-text-muted`        | `#6B6B70`                     | `#98989E`                      |
| `--color-separator`         | `rgb(60 60 67 / 0.15)`        | `rgb(255 255 255 / 0.15)`      |
| `--color-accent`            | `#0071EB` (identique dans les deux thèmes) |

`--color-accent` est une teinte iOS "systemBlue" (proche de #007AFF, ajustée
de ~2% pour que le texte blanc sur bouton accent et le texte accent sur fond
de page passent tous les deux le seuil AA 4.5:1 dans les deux thèmes — le
#007AFF pur échoue de justesse, à 4.02:1, sur fond blanc). Règle d'usage :
l'accent n'apparaît **jamais en texte nu directement sur le fond de page** —
seulement en remplissage de pastille/bouton (texte blanc dessus) ou en
bordure/anneau de focus (non soumis au seuil 4.5:1 des textes).

Contrastes vérifiés (WCAG AA, 4.5:1 texte normal) : primary/secondary/muted
sur base et sur elevated, dans les deux thèmes ; blanc sur accent, accent sur
fond clair — voir calculs dans l'historique du projet.

## Typographie

Uniquement Inter (`--font-sans`). Fraunces et `font-display` sont retirés.
Hiérarchie construite par poids et taille, pas par police :
- Titres : `font-semibold` / `font-bold`, tailles `text-2xl` à `text-5xl`
- Corps / labels : `font-normal` / `font-medium`, `text-sm` à `text-base`

## Coins arrondis

- Boutons capsule (CTA pleine largeur ou pilule) : `rounded-full` (inchangé)
- Boutons rectangulaires, champs de formulaire, badges : `rounded-2xl` (16px)
- Cartes, popups, panneaux, image de la lightbox : `rounded-3xl` (24px)

## Ombres

Les cartes/popups perdent leur bordure `border-white/10` au profit d'une
ombre diffuse (jamais de bordure dure sur un élément "élevé") :
- `--shadow-soft` : élévation normale (cartes, formulaires)
- `--shadow-elevated` : élévation forte (popup/lightbox)

Les deux sont plus opaques en dark mode (une ombre à 8% d'opacité est
invisible sur fond noir).

## Glassmorphism

`backdrop-blur-xl` (≈20px) + `bg-bg-elevated-glass` sur : la barre de
navigation et les cartes qui flottent au-dessus du fond de section (cartes
d'activité, formulaires-cartes, lignes admin). Jamais sur le fond principal
d'une section (`bg-bg-base` reste opaque).

## Animations

- `--ease-spring` = `cubic-bezier(0.34, 1.56, 0.64, 1)` : léger rebond en fin
  de transition, remplace les `ease` par défaut sur toutes les transitions.
- Tout bouton cliquable : `active:scale-95` avec une transition courte
  (~150-200ms), retour haptique visuel façon iOS.

## Navigation

Barre du haut en verre dépoli (`bg-bg-elevated-glass backdrop-blur-xl`,
bordure basse `border-separator`), onglet actif en pastille pleine
`bg-accent text-white`.
