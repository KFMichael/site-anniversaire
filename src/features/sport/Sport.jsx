import { useState } from 'react'
import { useAuth } from '../auth/contexte'
import { useMembres } from '../espace/useMembres'
import { Bouton, Carte, Page } from '../../components/ui'
import Chargement from '../../components/Chargement'
import { decalerJours, joursDeLaSemaine, libelleJour, libelleSemaine, lundiDe, versIso } from '../menus/tirage'
import { DUREE_SEANCE, SEANCES_PAR_SEMAINE, statutSeance, useSport } from './useSport'

const STATUTS = {
  envoyee: { texte: 'Invitation envoyée ✓', classe: 'text-text-muted' },
  'a-envoyer': { texte: 'À envoyer', classe: 'text-accent-text font-medium' },
  modifiee: { texte: 'Modifiée · à renvoyer', classe: 'text-accent-text font-medium' },
}

function heureLocale(date) {
  return date.toTimeString().slice(0, 5)
}

function plage(seance) {
  const debut = new Date(seance.debut)
  const fin = new Date(debut.getTime() + seance.duree_minutes * 60000)
  const f = (d) => heureLocale(d).replace(':', 'h')
  return `${f(debut)}–${f(fin)}`
}

export default function Sport() {
  const { utilisateur } = useAuth()
  const { membres } = useMembres()
  const [lundi, setLundi] = useState(() => lundiDe())
  const sport = useSport(lundi)
  const [message, setMessage] = useState('')
  const [enCours, setEnCours] = useState(false)
  const autres = membres.filter((m) => m.user_id !== utilisateur.id).map((m) => m.prenom)
  const nomResponsable = membres.find((m) => m.user_id === sport.responsable)?.prenom
  const annulations = sport.seances.filter((s) => s.annulee)

  async function action(promesse) {
    setMessage('')
    const erreur = await promesse
    if (erreur) setMessage(erreur)
  }

  async function envoyer() {
    setEnCours(true)
    setMessage('')
    setMessage((await sport.envoyer()).message)
    setEnCours(false)
  }

  if (sport.chargement) return <Chargement plein />

  return (
    <Page retour={{ vers: '/plus', label: 'Plus' }} titre="Sport" sousTitre={`${SEANCES_PAR_SEMAINE} séances de ${DUREE_SEANCE} min par semaine, ensemble`}>
      {sport.erreur && <p className="font-sans text-sm text-text-muted italic px-1">{sport.erreur}</p>}

      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setLundi((l) => decalerJours(l, -7))}
          aria-label="Semaine précédente"
          className="cible-44 shrink-0 w-11 h-11 rounded-full bg-bg-elevated shadow-soft text-text-primary active:scale-95 transition-transform duration-200 ease-spring"
        >
          ‹
        </button>
        <div className="flex flex-col items-center text-center">
          <span className="font-sans font-semibold text-text-primary">{libelleSemaine(lundi)}</span>
          {lundi === lundiDe() && <span className="font-sans text-xs text-text-muted">Cette semaine</span>}
        </div>
        <button
          onClick={() => setLundi((l) => decalerJours(l, 7))}
          aria-label="Semaine suivante"
          className="cible-44 shrink-0 w-11 h-11 rounded-full bg-bg-elevated shadow-soft text-text-primary active:scale-95 transition-transform duration-200 ease-spring"
        >
          ›
        </button>
      </div>

      <Carte>
        {sport.responsable === utilisateur.id ? (
          <p className="font-sans text-sm text-text-secondary">🏃 C'est toi qui prévois les séances ce mois-ci.</p>
        ) : sport.responsable ? (
          <p className="font-sans text-sm text-text-secondary">
            🏃 <strong>{nomResponsable ?? 'Un membre'}</strong> prévoit les séances ce mois-ci.
          </p>
        ) : sport.chargeSport ? (
          <div className="flex flex-col gap-3">
            <p className="font-sans text-sm text-text-secondary">
              Personne n'a pris « {sport.chargeSport.nom} » ce mois-ci.
            </p>
            <Bouton variante="secondaire" onClick={() => action(sport.prendreCharge())}>
              Je m'en occupe
            </Bouton>
          </div>
        ) : (
          <p className="font-sans text-sm text-text-secondary">🏃 Tout le monde peut prévoir les séances.</p>
        )}
      </Carte>

      {message && (
        <p role="status" className="font-sans text-sm text-text-muted italic px-1">
          {message}
        </p>
      )}

      <section aria-labelledby="titre-seances" className="flex flex-col gap-2">
        <h2 id="titre-seances" className="font-sans text-xs uppercase tracking-wide text-text-muted px-1">
          Séances ({sport.actives.length}/{SEANCES_PAR_SEMAINE})
        </h2>
        {sport.actives.length === 0 && (
          <p className="font-sans text-sm text-text-muted px-1">
            {sport.peutPlanifier ? 'Aucune séance : ajoute la première ci-dessous.' : 'Aucune séance prévue pour l’instant.'}
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {sport.actives.map((s) => (
            <CarteSeance
              key={s.id}
              seance={s}
              lundi={lundi}
              modifiable={sport.peutPlanifier}
              onModifier={(jour, heure) => action(sport.modifier(s, jour, heure))}
              onSupprimer={() => action(sport.supprimer(s))}
            />
          ))}
        </ul>
      </section>

      {annulations.length > 0 && (
        <Carte titre="Annulations à envoyer">
          <ul className="flex flex-col gap-2">
            {annulations.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 font-sans text-sm">
                <span className="text-text-secondary line-through">
                  {libelleJour(versIso(new Date(s.debut)))} · {plage(s)}
                </span>
                {sport.peutPlanifier && (
                  <button onClick={() => action(sport.retablir(s))} className="cible-44 text-text-muted underline shrink-0">
                    Rétablir
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Carte>
      )}

      {sport.peutPlanifier && sport.actives.length < SEANCES_PAR_SEMAINE && (
        <NouvelleSeance lundi={lundi} onAjouter={(jour, heure) => action(sport.ajouter(jour, heure))} />
      )}

      {sport.peutPlanifier && sport.aEnvoyer.length > 0 && (
        <Bouton onClick={envoyer} disabled={enCours} className="sticky bottom-24 shadow-elevated">
          {enCours
            ? 'Envoi…'
            : `✉️ Envoyer ${sport.aEnvoyer.length > 1 ? 'les invitations' : "l'invitation"}${autres.length ? ` à ${autres.join(', ')}` : ''}`}
        </Bouton>
      )}
      {sport.peutPlanifier && sport.aEnvoyer.length > 0 && (
        <p className="font-sans text-xs text-text-muted px-1 -mt-3">
          Chaque membre reçoit un email d'invitation par séance, à accepter dans son agenda (Google, Apple, Outlook).
        </p>
      )}
    </Page>
  )
}

// Jour de la semaine (pastilles) + heure (sélecteur natif)
function ChoixCreneau({ lundi, jour, heure, onJour, onHeure, prefixe }) {
  const aujourdhui = versIso(new Date())
  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Jour" className="grid grid-cols-4 min-[430px]:grid-cols-7 gap-2">
        {joursDeLaSemaine(lundi).map((j) => {
          const passe = j < aujourdhui
          const [nom, numero] = libelleJour(j).split(' ')
          return (
            <button
              key={j}
              type="button"
              role="radio"
              aria-checked={jour === j}
              aria-label={libelleJour(j)}
              disabled={passe}
              onClick={() => onJour(j)}
              className={`min-h-11 rounded-2xl flex flex-col items-center justify-center font-sans text-xs transition-all duration-200 ease-spring active:scale-95 disabled:opacity-40 ${
                jour === j ? 'bg-accent text-white' : 'bg-bg-base text-text-primary'
              }`}
            >
              <span aria-hidden="true">{nom.slice(0, 3)}</span>
              <span aria-hidden="true" className="font-semibold text-sm">
                {numero}
              </span>
            </button>
          )
        })}
      </div>
      <label htmlFor={`${prefixe}-heure`} className="flex items-center justify-between gap-3 font-sans text-sm text-text-primary">
        Heure de début
        <input
          id={`${prefixe}-heure`}
          type="time"
          step={900}
          value={heure}
          onChange={(e) => onHeure(e.target.value)}
          className="font-sans min-h-11 px-3 py-2 rounded-xl border border-separator bg-bg-base text-text-primary focus:outline-none focus:border-accent"
        />
      </label>
    </div>
  )
}

function NouvelleSeance({ lundi, onAjouter }) {
  const aujourdhui = versIso(new Date())
  const premierJour = joursDeLaSemaine(lundi).find((j) => j >= aujourdhui) ?? null
  const [jour, setJour] = useState(premierJour)
  const [heure, setHeure] = useState('18:30')

  return (
    <Carte titre="Ajouter une séance">
      {premierJour ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onAjouter(jour, heure)
          }}
          className="flex flex-col gap-4"
        >
          <ChoixCreneau lundi={lundi} jour={jour} heure={heure} onJour={setJour} onHeure={setHeure} prefixe="nouvelle" />
          <Bouton type="submit" disabled={!jour || !heure}>
            Ajouter ({DUREE_SEANCE} min)
          </Bouton>
        </form>
      ) : (
        <p className="font-sans text-sm text-text-muted">Cette semaine est passée : choisis une semaine à venir.</p>
      )}
    </Carte>
  )
}

function CarteSeance({ seance, lundi, modifiable, onModifier, onSupprimer }) {
  const [edition, setEdition] = useState(false)
  const debut = new Date(seance.debut)
  const [jour, setJour] = useState(versIso(debut))
  const [heure, setHeure] = useState(heureLocale(debut))
  const statut = STATUTS[statutSeance(seance)]

  return (
    <li className="p-4 rounded-3xl bg-bg-elevated shadow-soft flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden="true">
          🏃
        </span>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-sans font-semibold text-text-primary">
            {libelleJour(versIso(debut))} · {plage(seance)}
          </span>
          <span className={`font-sans text-xs ${statut.classe}`}>{statut.texte}</span>
        </div>
      </div>
      {modifiable &&
        (edition ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onModifier(jour, heure)
              setEdition(false)
            }}
            className="flex flex-col gap-3"
          >
            <ChoixCreneau lundi={lundi} jour={jour} heure={heure} onJour={setJour} onHeure={setHeure} prefixe={`seance-${seance.id}`} />
            <div className="flex gap-3">
              <Bouton type="submit" className="!py-2">
                Enregistrer
              </Bouton>
              <Bouton type="button" variante="discret" className="!py-2" onClick={() => setEdition(false)}>
                Annuler
              </Bouton>
            </div>
          </form>
        ) : (
          <div className="flex gap-4">
            <button onClick={() => setEdition(true)} className="cible-44 font-sans text-sm text-text-muted underline">
              Modifier
            </button>
            <button onClick={onSupprimer} className="cible-44 font-sans text-sm text-text-muted underline">
              Supprimer
            </button>
          </div>
        ))}
    </li>
  )
}
