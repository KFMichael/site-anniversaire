import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Bouton, ChampTexte, EtatErreur, Feuille } from '../../components/ui'
import { useMessages } from '../../components/messages-contexte'
import Chargement from '../../components/Chargement'
import { centreCarte, libelleDateVoyage, lireResultats, trierVoyages, urlRecherche } from './voyages'
import { useVoyages } from './useVoyages'

// Repère de la carte : une épingle emoji (les images par défaut de Leaflet
// ne passent pas par le bundler)
const EPINGLE = L.divIcon({
  className: '',
  html: '<span style="font-size:28px;line-height:1;display:block;transform:translate(-50%,-100%)">📍</span>',
  iconSize: [0, 0],
})

// Voyages de l'espace sur une carte, ajoutés depuis l'appli (lieu cherché
// sur OpenStreetMap)
export default function CarteVoyages() {
  const v = useVoyages()
  const { annoncer } = useMessages()
  const [edition, setEdition] = useState(null) // null | 'nouveau' | voyage
  const [cible, setCible] = useState(null) // voyage à montrer sur la carte
  const voyages = useMemo(() => trierVoyages(v.voyages), [v.voyages])

  if (v.chargement) return <Chargement />
  if (v.erreur) return <EtatErreur message={v.erreur} />

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="font-sans text-xl font-semibold text-text-primary">Nos voyages</h2>
        {voyages.length > 0 && (
          <span className="font-sans text-sm text-text-muted">
            {voyages.length} lieu{voyages.length > 1 ? 'x' : ''}
          </span>
        )}
      </div>

      <div className="h-[360px] md:h-[480px] rounded-3xl overflow-hidden shadow-soft">
        <MapContainer center={centreCarte(voyages)} zoom={voyages.length ? 5 : 4} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {voyages.map((x) => (
            <Marker key={x.id} position={[x.latitude, x.longitude]} icon={EPINGLE} title={x.lieu}>
              <Popup>
                <strong>{x.lieu}</strong>
                {x.date_voyage && (
                  <>
                    <br />
                    {libelleDateVoyage(x.date_voyage)}
                  </>
                )}
                {x.anecdote && (
                  <>
                    <br />
                    {x.anecdote}
                  </>
                )}
              </Popup>
            </Marker>
          ))}
          <Ajuster voyages={voyages} />
          <Recentrer cible={cible} />
        </MapContainer>
      </div>

      <Bouton onClick={() => setEdition('nouveau')}>+ Ajouter un voyage</Bouton>

      {voyages.length === 0 ? (
        <p className="font-sans text-center text-sm text-text-muted">
          Aucun voyage pour l'instant : ajoute le premier, il apparaîtra sur la carte.
        </p>
      ) : (
        <ul className="rounded-3xl bg-bg-elevated shadow-soft divide-y divide-separator overflow-hidden">
          {voyages.map((x) => (
            <li key={x.id} className="flex items-center gap-1 pr-2">
              <button
                type="button"
                onClick={() => setCible({ ...x, cle: Date.now() })}
                aria-label={`Voir ${x.lieu} sur la carte`}
                className="flex-1 min-w-0 min-h-11 flex items-center gap-3 pl-4 py-3 text-left active:bg-bg-base transition-colors"
              >
                <span className="text-xl shrink-0" aria-hidden="true">
                  📍
                </span>
                <span className="flex-1 min-w-0 flex flex-col">
                  <span className="font-sans text-text-primary truncate">{x.lieu}</span>
                  {(x.date_voyage || x.anecdote) && (
                    <span className="font-sans text-xs text-text-muted truncate">
                      {[libelleDateVoyage(x.date_voyage), x.anecdote].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setEdition(x)}
                className="cible-44 font-sans text-lg text-accent-text w-8 h-8 shrink-0"
                aria-label={`Modifier ${x.lieu}`}
              >
                <span aria-hidden="true">✎</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  const echec = await v.supprimer(x)
                  annoncer(echec ?? `« ${x.lieu} » retiré de la carte`, echec ? {} : { annuler: async () => annoncer((await v.restaurer(x)) ?? 'Voyage restauré ✓') })
                }}
                aria-label={`Supprimer ${x.lieu}`}
                className="cible-44 font-sans text-text-muted hover:text-text-primary w-8 h-8 shrink-0"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <Feuille ouverte={Boolean(edition)} titre={edition && edition !== 'nouveau' ? 'Modifier le voyage' : 'Nouveau voyage'} onFermer={() => setEdition(null)}>
        <FormulaireVoyage
          voyage={edition === 'nouveau' ? null : edition}
          onAnnuler={() => setEdition(null)}
          onEnregistrer={async (champs) => {
            const echec = await v.enregistrer(edition === 'nouveau' ? null : edition, champs)
            if (echec) return echec
            annoncer(edition === 'nouveau' ? `« ${champs.lieu} » ajouté à la carte ✓` : 'Voyage modifié ✓')
            setCible({ ...champs, cle: Date.now() })
            setEdition(null)
            return null
          }}
        />
      </Feuille>
    </section>
  )
}

// Cadre tous les voyages dès qu'il y en a plusieurs (à l'ouverture et quand
// on en ajoute ou retire un)
function Ajuster({ voyages }) {
  const carte = useMap()
  const cle = voyages.map((x) => x.id).join(',')
  useEffect(() => {
    if (voyages.length > 1) {
      carte.fitBounds(
        voyages.map((x) => [x.latitude, x.longitude]),
        { padding: [40, 40], maxZoom: 8 }
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, carte])
  return null
}

// Centre la carte sur le voyage choisi dans la liste
function Recentrer({ cible }) {
  const carte = useMap()
  useEffect(() => {
    if (cible) carte.flyTo([cible.latitude, cible.longitude], 8, { duration: 0.8 })
  }, [cible, carte])
  return null
}

function FormulaireVoyage({ voyage, onAnnuler, onEnregistrer }) {
  const [recherche, setRecherche] = useState('')
  const [resultats, setResultats] = useState(null) // null : pas encore cherché
  const [enRecherche, setEnRecherche] = useState(false)
  const [lieu, setLieu] = useState(voyage ? { lieu: voyage.lieu, latitude: voyage.latitude, longitude: voyage.longitude } : null)
  const [nom, setNom] = useState(voyage?.lieu ?? '')
  const [date, setDate] = useState(voyage?.date_voyage ? voyage.date_voyage.slice(0, 7) : '')
  const [anecdote, setAnecdote] = useState(voyage?.anecdote ?? '')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  async function chercher(e) {
    e.preventDefault()
    if (!recherche.trim()) return
    setEnRecherche(true)
    setErreur('')
    try {
      const reponse = await fetch(urlRecherche(recherche), { headers: { Accept: 'application/json' } })
      setResultats(reponse.ok ? lireResultats(await reponse.json()) : [])
      if (!reponse.ok) setErreur("La recherche de lieux ne répond pas. Réessaie dans un instant.")
    } catch {
      setResultats([])
      setErreur("La recherche de lieux n'est pas disponible (connexion ?).")
    }
    setEnRecherche(false)
  }

  function choisir(r) {
    setLieu(r)
    setNom(r.lieu)
    setResultats(null)
    setRecherche('')
  }

  async function enregistrer(e) {
    e.preventDefault()
    if (!lieu) {
      setErreur('Cherche puis choisis le lieu du voyage.')
      return
    }
    if (!nom.trim()) {
      setErreur('Donne un nom au lieu.')
      return
    }
    setErreur('')
    setEnvoi(true)
    const echec = await onEnregistrer({
      lieu: nom.trim().slice(0, 120),
      latitude: lieu.latitude,
      longitude: lieu.longitude,
      date_voyage: /^\d{4}-\d{2}$/.test(date) ? `${date}-01` : null,
      anecdote: anecdote.trim() || null,
    })
    setEnvoi(false)
    if (echec) setErreur(echec)
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={chercher} className="flex flex-col gap-2" role="search">
        <label htmlFor="voyage-recherche" className="font-sans text-sm text-text-muted px-1">
          {lieu ? 'Changer de lieu' : 'Où êtes-vous allés ?'}
        </label>
        <div className="flex gap-2">
          <input
            id="voyage-recherche"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder="Ville, pays, monument…"
            value={recherche}
            maxLength={100}
            onChange={(e) => setRecherche(e.target.value)}
            className="font-sans flex-1 min-w-0 min-h-11 px-4 py-2.5 rounded-2xl border border-separator bg-bg-base text-text-primary focus:outline-none focus:border-accent"
          />
          <Bouton type="submit" variante="secondaire" className="!px-4 shrink-0" disabled={enRecherche || !recherche.trim()}>
            {enRecherche ? '…' : 'Chercher'}
          </Bouton>
        </div>
        {resultats && (
          <ul aria-label="Lieux trouvés" className="flex flex-col rounded-2xl border border-separator overflow-hidden divide-y divide-separator">
            {resultats.length === 0 ? (
              <li className="font-sans text-sm text-text-muted px-4 py-3">Aucun lieu trouvé. Essaie un autre nom.</li>
            ) : (
              resultats.map((r) => (
                <li key={`${r.latitude},${r.longitude}`}>
                  <button type="button" onClick={() => choisir(r)} className="w-full min-h-11 text-left px-4 py-2.5 flex flex-col active:bg-bg-base">
                    <span className="font-sans text-text-primary">{r.lieu}</span>
                    <span className="font-sans text-xs text-text-muted truncate">{r.detail}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </form>

      <form onSubmit={enregistrer} className="flex flex-col gap-4">
        {lieu && (
          <p className="font-sans text-sm text-text-secondary px-1">
            <span aria-hidden="true">📍 </span>
            Position : {lieu.latitude.toFixed(3)}, {lieu.longitude.toFixed(3)}
          </p>
        )}
        <ChampTexte id="voyage-nom" label="Nom affiché" placeholder="Lisbonne, Portugal" value={nom} maxLength={120} onChange={(e) => setNom(e.target.value)} />
        <ChampTexte id="voyage-date" label="Quand (facultatif)" type="month" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="voyage-anecdote" className="font-sans text-sm text-text-muted px-1">
            Un souvenir (facultatif)
          </label>
          <textarea
            id="voyage-anecdote"
            rows={3}
            maxLength={500}
            placeholder="Notre première balade en vélo sous la pluie…"
            value={anecdote}
            onChange={(e) => setAnecdote(e.target.value)}
            className="font-sans w-full px-4 py-3 rounded-2xl border border-separator bg-bg-base text-text-primary focus:outline-none focus:border-accent"
          />
        </div>
        {erreur && (
          <p role="alert" className="font-sans text-sm text-text-primary">
            {erreur}
          </p>
        )}
        <p className="font-sans text-xs text-text-muted px-1">Recherche de lieux : © contributeurs OpenStreetMap.</p>
        <div className="flex flex-wrap gap-3">
          <Bouton type="submit" disabled={envoi}>
            {envoi ? 'Enregistrement…' : 'Enregistrer'}
          </Bouton>
          <Bouton type="button" variante="discret" onClick={onAnnuler}>
            Annuler
          </Bouton>
        </div>
      </form>
    </div>
  )
}
