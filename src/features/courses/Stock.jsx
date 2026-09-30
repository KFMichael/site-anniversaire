import { useMemo, useState } from 'react'
import { Bouton, Carte, ChampTexte } from '../../components/ui'
import { grouperParRayon, normaliser } from './liste'
import { RAYONS, devinerRayon } from './rayons'
import ChoixEtat from './ChoixEtat'

export default function Stock({ courses, onMessage }) {
  const { produits } = courses
  const [recherche, setRecherche] = useState('')
  const [aRacheter, setARacheter] = useState(false)
  const [edition, setEdition] = useState(false)

  const groupes = useMemo(() => {
    const terme = normaliser(recherche)
    return grouperParRayon(
      produits.filter(
        (p) => (!terme || normaliser(p.nom).includes(terme)) && (!aRacheter || p.etat !== 'ok')
      )
    )
  }, [produits, recherche, aRacheter])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          type="search"
          placeholder="Rechercher un produit"
          aria-label="Rechercher un produit"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="font-sans flex-1 min-w-0 px-4 py-2.5 rounded-2xl border border-separator bg-bg-elevated text-text-primary focus:outline-none focus:border-accent"
        />
        <Bouton
          variante="secondaire"
          className="!px-4 shrink-0 text-sm"
          aria-pressed={edition}
          onClick={() => setEdition((e) => !e)}
        >
          {edition ? 'Terminé' : 'Modifier'}
        </Bouton>
      </div>

      <label className="min-h-11 flex items-center gap-2 font-sans text-sm text-text-secondary px-1">
        <input
          type="checkbox"
          checked={aRacheter}
          onChange={(e) => setARacheter(e.target.checked)}
          className="w-4 h-4 accent-accent"
        />
        Seulement ce qui manque
      </label>

      {edition && <NouveauProduit onAjouter={async (n, r) => onMessage(await courses.ajouterProduit(n, r))} />}

      {groupes.length === 0 && (
        <p className="font-sans text-center text-sm text-text-muted py-6">Aucun produit.</p>
      )}

      {groupes.map(({ rayon, elements }) => (
        <section key={rayon.id} className="flex flex-col gap-1.5">
          <h2 className="font-sans text-xs uppercase tracking-wide text-text-muted px-1">
            {rayon.emoji} {rayon.label}
          </h2>
          <ul className="rounded-3xl bg-bg-elevated shadow-soft divide-y divide-separator overflow-hidden">
            {elements.map((p) =>
              edition ? (
                <LigneEdition key={p.id} produit={p} courses={courses} onMessage={onMessage} />
              ) : (
                <li key={p.id} className="flex items-center gap-2 pl-4 pr-2 py-2.5">
                  <span className="font-sans text-text-primary flex-1 min-w-0 truncate">{p.nom}</span>
                  <ChoixEtat
                    etat={p.etat}
                    nomProduit={p.nom}
                    onChange={async (etat) => onMessage(await courses.changerEtat(p.id, etat))}
                  />
                </li>
              )
            )}
          </ul>
        </section>
      ))}
    </div>
  )
}

function LigneEdition({ produit, courses, onMessage }) {
  const [nom, setNom] = useState(produit.nom)

  async function renommer() {
    if (nom.trim() && nom.trim() !== produit.nom) {
      onMessage(await courses.modifierProduit(produit.id, { nom: nom.trim() }))
    }
  }

  async function supprimer() {
    if (window.confirm(`Retirer « ${produit.nom} » du stock ?`)) {
      onMessage(await courses.supprimerProduit(produit.id))
    }
  }

  return (
    <li className="flex items-center gap-2 px-3 py-2">
      <input
        aria-label="Nom du produit"
        value={nom}
        maxLength={80}
        onChange={(e) => setNom(e.target.value)}
        onBlur={renommer}
        className="font-sans flex-1 min-w-0 px-3 py-1.5 rounded-xl border border-separator bg-bg-base text-text-primary focus:outline-none focus:border-accent"
      />
      <select
        aria-label="Rayon"
        value={produit.rayon}
        onChange={async (e) => onMessage(await courses.modifierProduit(produit.id, { rayon: e.target.value }))}
        className="font-sans w-12 px-1 py-1.5 rounded-xl border border-separator bg-bg-base text-text-primary"
      >
        {RAYONS.map((r) => (
          <option key={r.id} value={r.id}>
            {r.emoji} {r.label}
          </option>
        ))}
      </select>
      <button
        onClick={supprimer}
        aria-label={`Supprimer ${produit.nom}`}
        className="font-sans text-text-muted hover:text-text-primary w-8 h-8 shrink-0"
      >
        🗑
      </button>
    </li>
  )
}

function NouveauProduit({ onAjouter }) {
  const [nom, setNom] = useState('')
  const [rayonChoisi, setRayonChoisi] = useState(null)
  const rayonEffectif = rayonChoisi ?? (nom.trim() ? devinerRayon(nom) : 'epicerie')

  async function soumettre(e) {
    e.preventDefault()
    await onAjouter(nom, rayonEffectif)
    setNom('')
    setRayonChoisi(null)
  }

  return (
    <Carte titre="Nouveau produit habituel">
      <form onSubmit={soumettre} className="flex flex-col gap-3">
        <ChampTexte
          id="nouveau-produit"
          label="Nom"
          placeholder="Lait d'avoine"
          maxLength={80}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          required
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nouveau-produit-rayon" className="font-sans text-sm text-text-muted px-1">
            Rayon
          </label>
          <select
            id="nouveau-produit-rayon"
            value={rayonEffectif}
            onChange={(e) => setRayonChoisi(e.target.value)}
            className="font-sans w-full px-4 py-3 rounded-2xl border border-separator bg-bg-base text-text-primary focus:outline-none focus:border-accent"
          >
            {RAYONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.emoji} {r.label}
              </option>
            ))}
          </select>
        </div>
        <Bouton type="submit" disabled={!nom.trim()}>
          Ajouter au stock
        </Bouton>
      </form>
    </Carte>
  )
}
