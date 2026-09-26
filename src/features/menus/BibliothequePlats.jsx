import { useMemo, useState } from 'react'
import { Bouton, Carte, ChampTexte } from '../../components/ui'
import { normaliser } from '../courses/liste'
import { CATEGORIES_PLATS, categoriePlat } from './categories'

export default function BibliothequePlats({ menus }) {
  const { plats } = menus
  const [recherche, setRecherche] = useState('')
  const [edition, setEdition] = useState(null) // null | 'nouveau' | id du plat
  const [message, setMessage] = useState('')

  const groupes = useMemo(() => {
    const terme = normaliser(recherche)
    const visibles = plats.filter(
      (p) =>
        !terme ||
        normaliser(p.nom).includes(terme) ||
        p.ingredients.some((i) => normaliser(i).includes(terme))
    )
    return CATEGORIES_PLATS.map((c) => ({
      categorie: c,
      plats: visibles.filter((p) => categoriePlat(p.categorie).id === c.id),
    })).filter((g) => g.plats.length > 0)
  }, [plats, recherche])

  async function enregistrer(id, plat) {
    const erreur = await menus.enregistrerPlat(id, plat)
    setMessage(erreur ?? '')
    if (!erreur) setEdition(null)
  }

  async function supprimer(plat) {
    if (!window.confirm(`Supprimer « ${plat.nom} » ? Les soirs où il était prévu deviendront vides.`)) return
    setMessage((await menus.supprimerPlat(plat.id)) ?? '')
    setEdition(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          type="search"
          placeholder="Plat ou ingrédient"
          aria-label="Rechercher un plat ou un ingrédient"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="font-sans flex-1 min-w-0 px-4 py-2.5 rounded-2xl border border-separator bg-bg-elevated text-text-primary focus:outline-none focus:border-accent"
        />
        <Bouton className="!px-4 shrink-0" onClick={() => setEdition('nouveau')}>
          + Plat
        </Bouton>
      </div>

      {message && <p className="font-sans text-sm text-text-muted italic px-1">{message}</p>}

      {edition === 'nouveau' && (
        <FormulairePlat onEnregistrer={(p) => enregistrer(null, p)} onAnnuler={() => setEdition(null)} />
      )}

      {groupes.map(({ categorie, plats: duGroupe }) => (
        <section key={categorie.id} className="flex flex-col gap-1.5">
          <h3 className="font-sans text-xs uppercase tracking-wide text-text-muted px-1">
            {categorie.emoji} {categorie.label}
          </h3>
          <ul className="rounded-3xl bg-bg-elevated shadow-soft divide-y divide-separator overflow-hidden">
            {duGroupe.map((p) =>
              edition === p.id ? (
                <li key={p.id} className="p-2">
                  <FormulairePlat
                    plat={p}
                    onEnregistrer={(modif) => enregistrer(p.id, modif)}
                    onAnnuler={() => setEdition(null)}
                    onSupprimer={() => supprimer(p)}
                  />
                </li>
              ) : (
                <li key={p.id}>
                  <button
                    onClick={() => setEdition(p.id)}
                    className="w-full text-left px-4 py-3 flex flex-col gap-0.5"
                  >
                    <span className="font-sans text-text-primary">
                      {p.nom}
                      {p.rapide && <span className="text-xs text-text-muted"> · ⚡ rapide</span>}
                    </span>
                    {p.ingredients.length > 0 && (
                      <span className="font-sans text-xs text-text-muted line-clamp-1">
                        {p.ingredients.join(', ')}
                      </span>
                    )}
                  </button>
                </li>
              )
            )}
          </ul>
        </section>
      ))}
    </div>
  )
}

function FormulairePlat({ plat, onEnregistrer, onAnnuler, onSupprimer }) {
  const [nom, setNom] = useState(plat?.nom ?? '')
  const [categorie, setCategorie] = useState(plat?.categorie ?? 'autre')
  const [rapide, setRapide] = useState(plat?.rapide ?? true)
  const [ingredients, setIngredients] = useState((plat?.ingredients ?? []).join(', '))
  const prefixe = plat ? `plat-${plat.id}` : 'plat-nouveau'

  function soumettre(e) {
    e.preventDefault()
    onEnregistrer({
      nom: nom.trim(),
      categorie,
      rapide,
      ingredients: ingredients
        .split(/[,\n]/)
        .map((i) => i.trim())
        .filter(Boolean),
    })
  }

  return (
    <Carte titre={plat ? 'Modifier le plat' : 'Nouveau plat'}>
      <form onSubmit={soumettre} className="flex flex-col gap-3">
        <ChampTexte
          id={`${prefixe}-nom`}
          label="Nom"
          placeholder="Sauce graine"
          maxLength={80}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          required
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${prefixe}-categorie`} className="font-sans text-sm text-text-muted px-1">
            Catégorie
          </label>
          <select
            id={`${prefixe}-categorie`}
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            className="font-sans w-full px-4 py-3 rounded-2xl border border-separator bg-bg-base text-text-primary focus:outline-none focus:border-accent"
          >
            {CATEGORIES_PLATS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-3 font-sans text-sm text-text-primary px-1">
          <input
            type="checkbox"
            checked={rapide}
            onChange={(e) => setRapide(e.target.checked)}
            className="w-4 h-4 accent-accent"
          />
          ⚡ Rapide (prêt en 30 min environ)
        </label>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${prefixe}-ingredients`} className="font-sans text-sm text-text-muted px-1">
            Ingrédients (séparés par des virgules)
          </label>
          <textarea
            id={`${prefixe}-ingredients`}
            rows={3}
            placeholder="Crème de palme, Viande de bœuf, Poisson fumé, Riz"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            className="font-sans w-full px-4 py-3 rounded-2xl border border-separator bg-bg-base text-text-primary focus:outline-none focus:border-accent"
          />
          <p className="font-sans text-xs text-text-muted px-1">
            Utilise les mêmes noms que dans le stock des courses pour qu'ils soient reconnus.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Bouton type="submit" disabled={!nom.trim()}>
            Enregistrer
          </Bouton>
          <Bouton type="button" variante="discret" onClick={onAnnuler}>
            Annuler
          </Bouton>
          {onSupprimer && (
            <Bouton type="button" variante="discret" onClick={onSupprimer} className="ml-auto">
              Supprimer
            </Bouton>
          )}
        </div>
      </form>
    </Carte>
  )
}
