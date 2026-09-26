import { useMemo, useState } from 'react'
import { Bouton } from '../../components/ui'
import { compterListe, construireListe, grouperParRayon } from './liste'
import { COULEURS_ETAT, RAYONS } from './rayons'

export default function ListeCourses({ courses, onMessage }) {
  const { produits, articles } = courses
  const [nom, setNom] = useState('')
  const [rayonChoisi, setRayonChoisi] = useState('autre')
  const [confirmation, setConfirmation] = useState(false)

  const liste = useMemo(() => construireListe(produits, articles), [produits, articles])
  const groupes = useMemo(() => grouperParRayon(liste), [liste])
  const compte = compterListe(liste)

  async function ajouter(e) {
    e.preventDefault()
    if (!nom.trim()) return
    onMessage(await courses.ajouterALaListe(nom, rayonChoisi))
    setNom('')
  }

  async function terminer() {
    setConfirmation(false)
    onMessage((await courses.terminerCourses()) ?? 'Courses terminées ✓ Le stock est à jour.')
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={ajouter} className="flex gap-2">
        <label htmlFor="article" className="sr-only">
          Ajouter à la liste
        </label>
        <input
          id="article"
          placeholder="Ajouter à la liste…"
          value={nom}
          maxLength={80}
          onChange={(e) => setNom(e.target.value)}
          className="font-sans flex-1 min-w-0 px-4 py-2.5 rounded-2xl border border-separator bg-bg-elevated text-text-primary focus:outline-none focus:border-accent"
        />
        <label htmlFor="article-rayon" className="sr-only">
          Rayon
        </label>
        <select
          id="article-rayon"
          value={rayonChoisi}
          onChange={(e) => setRayonChoisi(e.target.value)}
          className="font-sans w-14 px-2 rounded-2xl border border-separator bg-bg-elevated text-text-primary focus:outline-none focus:border-accent"
        >
          {RAYONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.emoji} {r.label}
            </option>
          ))}
        </select>
        <Bouton type="submit" className="!px-4 shrink-0" disabled={!nom.trim()} aria-label="Ajouter">
          +
        </Bouton>
      </form>

      {liste.length === 0 && (
        <p className="font-sans text-center text-text-muted py-8">
          Rien à acheter 🎉
          <br />
          <span className="text-sm">Marque les produits « Fini » dans le stock pour les voir ici.</span>
        </p>
      )}

      {groupes.map(({ rayon, elements }) => (
        <section key={rayon.id} className="flex flex-col gap-1.5">
          <h3 className="font-sans text-xs uppercase tracking-wide text-text-muted px-1">
            {rayon.emoji} {rayon.label}
          </h3>
          <ul className="rounded-3xl bg-bg-elevated shadow-soft divide-y divide-separator overflow-hidden">
            {elements.map((e) => (
              <li key={`${e.origine}-${e.id}`} className="flex items-center gap-3 px-4 py-3">
                <button
                  role="checkbox"
                  aria-checked={e.dans_panier}
                  aria-label={`${e.nom} dans le panier`}
                  onClick={async () => onMessage(await courses.basculerPanier(e))}
                  className={`w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center text-xs text-white transition-all duration-200 ease-spring active:scale-90 ${
                    e.dans_panier ? 'bg-accent border-accent' : 'border-separator'
                  }`}
                >
                  {e.dans_panier && '✓'}
                </button>
                <span
                  className={`font-sans flex-1 min-w-0 ${
                    e.dans_panier ? 'line-through text-text-muted' : 'text-text-primary'
                  }`}
                >
                  {e.nom}
                </span>
                {e.origine === 'stock' && e.etat === 'bientot' && (
                  <span
                    className="font-sans text-xs px-2 py-0.5 rounded-full text-text-primary shrink-0"
                    style={{ backgroundColor: `${COULEURS_ETAT.bientot}33` }}
                  >
                    Presque fini
                  </span>
                )}
                <button
                  onClick={async () => onMessage(await courses.retirerDeLaListe(e))}
                  aria-label={`Retirer ${e.nom} de la liste`}
                  title="Finalement pas besoin"
                  className="font-sans text-text-muted hover:text-text-primary w-8 h-8 shrink-0"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {compte.dansPanier > 0 &&
        (confirmation ? (
          <div className="sticky bottom-24 p-4 rounded-3xl bg-bg-elevated shadow-elevated flex flex-col gap-3">
            <p className="font-sans text-sm text-text-secondary">
              {compte.dansPanier} article{compte.dansPanier > 1 ? 's' : ''} acheté
              {compte.dansPanier > 1 ? 's' : ''} : les produits repassent à « il en reste »,
              les articles ponctuels sont retirés.
            </p>
            <div className="flex gap-3">
              <Bouton onClick={terminer}>Confirmer</Bouton>
              <Bouton variante="discret" onClick={() => setConfirmation(false)}>
                Annuler
              </Bouton>
            </div>
          </div>
        ) : (
          <Bouton onClick={() => setConfirmation(true)} className="sticky bottom-24 shadow-elevated">
            Terminer les courses ({compte.dansPanier}/{compte.total})
          </Bouton>
        ))}
    </div>
  )
}
