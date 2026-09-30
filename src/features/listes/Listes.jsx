import { useState } from 'react'
import { Bouton, BoutonAjouter, Carte, ChampTexte, EtatErreur, Feuille, Page } from '../../components/ui'
import { useMessages } from '../../components/messages-contexte'
import Chargement from '../../components/Chargement'
import { versIso } from '../menus/tirage'
import { useListes } from './useListes'

const SUGGESTIONS = [
  { nom: 'Films à voir', emoji: '🎬' },
  { nom: 'Choses à faire', emoji: '✅' },
  { nom: 'Restos à tester', emoji: '🍽️' },
  { nom: 'Idées cadeaux', emoji: '🎁' },
  { nom: 'Livres à lire', emoji: '📚' },
  { nom: 'Voyages à faire', emoji: '✈️' },
]

const DUREES = [
  { minutes: 60, label: '1 h' },
  { minutes: 90, label: '1 h 30' },
  { minutes: 120, label: '2 h' },
  { minutes: 150, label: '2 h 30' },
  { minutes: 180, label: '3 h' },
  { minutes: 240, label: '4 h' },
]

const CLASSE_CHAMP =
  'font-sans w-full min-h-11 px-4 py-2.5 rounded-2xl border border-separator bg-bg-base text-text-primary focus:outline-none focus:border-accent'

// « samedi 3 octobre, 20h30 »
function libelleInvitation(debut) {
  const d = new Date(debut)
  const jour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
  return `${jour}, ${d.toTimeString().slice(0, 5).replace(':', 'h')}`
}

export default function Listes() {
  const l = useListes()
  const [choisie, setChoisie] = useState(null)
  const [creation, setCreation] = useState(false)
  const { annoncer } = useMessages()
  const liste = l.listes.find((x) => x.id === choisie) ?? l.listes[0]

  const creer = async (nom, emoji) => {
    const { id, erreur } = await l.creerListe(nom, emoji)
    if (erreur) return erreur
    setChoisie(id)
    setCreation(false)
    annoncer(`Liste « ${nom.trim()} » créée ✓`)
    return null
  }

  if (l.chargement) return <Chargement plein />
  if (l.erreur) {
    return (
      <Page retour={{ vers: '/plus', label: 'Plus' }} titre="Listes" sousTitre="Films à voir, choses à faire… à plusieurs">
        <EtatErreur message={l.erreur} />
      </Page>
    )
  }

  return (
    <Page
      retour={{ vers: '/plus', label: 'Plus' }}
      titre="Listes"
      sousTitre="Films à voir, choses à faire… à plusieurs"
      action={liste && <BoutonAjouter label="Nouvelle liste" onClick={() => setCreation(true)} />}
    >
      <div className="flex flex-wrap gap-2" role="group" aria-label="Listes">
        {l.listes.map((x) => {
          const restants = l.elements.filter((e) => e.liste_id === x.id && !e.fait).length
          const active = liste?.id === x.id
          return (
            <button
              key={x.id}
              onClick={() => {
                setChoisie(x.id)
                annoncer('')
              }}
              aria-pressed={active}
              className={`font-sans text-sm min-h-11 px-4 rounded-full transition-all duration-200 ease-spring active:scale-95 ${
                active ? 'bg-accent text-white' : 'bg-bg-elevated text-text-primary shadow-soft'
              }`}
            >
              <span aria-hidden="true">{x.emoji} </span>
              {x.nom} <span className={active ? '' : 'text-text-muted'}>({restants})</span>
            </button>
          )
        })}
      </div>

      <Feuille ouverte={creation && Boolean(liste)} titre="Nouvelle liste" onFermer={() => setCreation(false)}>
        <NouvelleListe existantes={l.listes.map((x) => x.nom)} onAnnuler={() => setCreation(false)} onCreer={creer} />
      </Feuille>

      {liste ? (
        <ContenuListe
          key={liste.id}
          liste={liste}
          elements={l.elements.filter((e) => e.liste_id === liste.id)}
          actions={l}
          setMessage={annoncer}
        />
      ) : (
        <Carte titre="Crée votre première liste">
          <NouvelleListe existantes={[]} onCreer={creer} />
        </Carte>
      )}
    </Page>
  )
}

function NouvelleListe({ existantes, onAnnuler, onCreer }) {
  const [nom, setNom] = useState('')
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)
  const proposees = SUGGESTIONS.filter((s) => !existantes.includes(s.nom))

  async function creer(n, emoji) {
    setEnCours(true)
    setErreur('')
    const message = await onCreer(n, emoji)
    setEnCours(false)
    if (message) setErreur(message)
  }

  return (
    <>
      {proposees.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {proposees.map((s) => (
            <Bouton key={s.nom} variante="secondaire" disabled={enCours} onClick={() => creer(s.nom, s.emoji)} className="!px-3">
              <span aria-hidden="true">{s.emoji} </span>
              {s.nom}
            </Bouton>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          creer(nom, '📝')
        }}
        className="flex flex-col gap-3"
      >
        <ChampTexte id="nouvelle-liste" label="Ou un autre nom" maxLength={60} value={nom} onChange={(e) => setNom(e.target.value)} />
        <Bouton type="submit" disabled={enCours || !nom.trim()}>
          Créer la liste
        </Bouton>
        {onAnnuler && (
          <Bouton type="button" variante="discret" onClick={onAnnuler}>
            Annuler
          </Bouton>
        )}
      </form>
      {erreur && (
        <p role="status" className="font-sans text-sm text-text-primary">
          {erreur}
        </p>
      )}
    </>
  )
}

function ContenuListe({ liste, elements, actions, setMessage }) {
  const [texte, setTexte] = useState('')
  const [proposition, setProposition] = useState(null) // id de l'élément
  const [confirmation, setConfirmation] = useState(false)
  const aFaire = elements.filter((e) => !e.fait)
  const faits = elements.filter((e) => e.fait)

  async function ajouter(ev) {
    ev.preventDefault()
    if (!texte.trim()) return
    const valeur = texte
    setTexte('')
    const erreur = await actions.ajouter(liste.id, valeur)
    if (erreur) {
      setTexte(valeur)
      setMessage(erreur)
    }
  }

  const ligne = (el) => (
    <li key={el.id} className="flex flex-col gap-2 py-2">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-3 flex-1 min-w-0 min-h-11 cursor-pointer">
          <input type="checkbox" checked={el.fait} onChange={() => actions.basculer(el)} className="w-5 h-5 shrink-0 accent-accent" />
          <span className={`font-sans text-base break-words ${el.fait ? 'line-through text-text-muted' : 'text-text-primary'}`}>{el.texte}</span>
        </label>
        {!el.fait && (
          <button
            onClick={() => setProposition(proposition === el.id ? null : el.id)}
            aria-expanded={proposition === el.id}
            aria-label={`Proposer une date pour ${el.texte}`}
            className="cible-44 shrink-0 text-lg active:scale-95 transition-transform"
          >
            📅
          </button>
        )}
        <button
          onClick={() => actions.supprimer(el)}
          aria-label={`Supprimer ${el.texte}`}
          className="cible-44 shrink-0 text-text-muted text-lg active:scale-95 transition-transform"
        >
          ✕
        </button>
      </div>
      {el.invitation_envoyee_le && el.invitation_debut && (
        <p className="font-sans text-sm text-text-secondary pl-8">
          📅 {libelleInvitation(el.invitation_debut)} · invitation envoyée ✓
        </p>
      )}
      {proposition === el.id && (
        <Proposition
          element={el}
          onFermer={() => setProposition(null)}
          onEnvoyer={async (debut, duree) => {
            setMessage('Envoi de l’invitation…')
            const r = await actions.inviter(el, debut, duree)
            setMessage(r.message)
            if (r.ok) setProposition(null)
          }}
          onAnnulerInvitation={async () => {
            setMessage('Annulation…')
            const r = await actions.annulerInvitation(el)
            setMessage(r.message)
            if (r.ok) setProposition(null)
          }}
        />
      )}
    </li>
  )

  return (
    <Carte titre={`${liste.emoji} ${liste.nom}`}>
      <form onSubmit={ajouter} className="flex gap-2">
        <input
          type="text"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          maxLength={120}
          placeholder="Ajouter…"
          aria-label={`Ajouter à ${liste.nom}`}
          className={`${CLASSE_CHAMP} flex-1 min-w-0`}
        />
        <Bouton type="submit" className="!px-4 shrink-0" disabled={!texte.trim()} aria-label="Ajouter">
          +
        </Bouton>
      </form>

      {aFaire.length === 0 && <p className="font-sans text-sm text-text-muted">Rien pour l'instant : ajoute la première idée.</p>}
      <ul className="flex flex-col divide-y divide-separator">{aFaire.map(ligne)}</ul>

      {faits.length > 0 && (
        <details className="font-sans">
          <summary className="min-h-11 flex items-center cursor-pointer text-sm text-text-muted">Fait ({faits.length})</summary>
          <ul className="flex flex-col divide-y divide-separator">{faits.map(ligne)}</ul>
        </details>
      )}

      {confirmation ? (
        <div className="flex flex-col gap-2">
          <p className="font-sans text-sm text-text-secondary">Supprimer « {liste.nom} » et ses {elements.length} éléments ?</p>
          <div className="grid grid-cols-2 gap-2">
            <Bouton variante="secondaire" onClick={() => setConfirmation(false)} className="!px-3">
              Garder
            </Bouton>
            <Bouton
              variante="danger"
              onClick={() => actions.supprimerListe(liste).then((e) => setMessage(e ?? `Liste « ${liste.nom} » supprimée`))}
              className="!px-3 border border-separator"
            >
              Supprimer
            </Bouton>
          </div>
        </div>
      ) : (
        <Bouton variante="danger" onClick={() => setConfirmation(true)}>
          Supprimer la liste
        </Bouton>
      )}
    </Carte>
  )
}

function Proposition({ element, onFermer, onEnvoyer, onAnnulerInvitation }) {
  const existante = element.invitation_debut ? new Date(element.invitation_debut) : null
  const [jour, setJour] = useState(existante ? versIso(existante) : versIso(new Date()))
  const [heure, setHeure] = useState(existante ? existante.toTimeString().slice(0, 5) : '20:30')
  const [duree, setDuree] = useState(String(element.invitation_duree ?? 120))
  const [enCours, setEnCours] = useState(false)
  const prefixe = `invitation-${element.id}`
  const debut = new Date(`${jour}T${heure}`)
  const passee = !(debut > new Date())

  async function envoyer(ev) {
    ev.preventDefault()
    setEnCours(true)
    await onEnvoyer(debut, Number(duree))
    setEnCours(false)
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-3 p-4 rounded-2xl bg-bg-base">
      <p className="font-sans text-sm text-text-secondary">
        Proposer « {element.texte} » : chaque membre reçoit une invitation à ajouter à son agenda.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5 col-span-2 min-[430px]:col-span-1">
          <label htmlFor={`${prefixe}-jour`} className="font-sans text-sm text-text-muted px-1">
            Jour
          </label>
          <input id={`${prefixe}-jour`} type="date" min={versIso(new Date())} value={jour} onChange={(e) => setJour(e.target.value)} required className={CLASSE_CHAMP} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${prefixe}-heure`} className="font-sans text-sm text-text-muted px-1">
            Heure
          </label>
          <input id={`${prefixe}-heure`} type="time" value={heure} onChange={(e) => setHeure(e.target.value)} required className={CLASSE_CHAMP} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${prefixe}-duree`} className="font-sans text-sm text-text-muted px-1">
            Durée
          </label>
          <select id={`${prefixe}-duree`} value={duree} onChange={(e) => setDuree(e.target.value)} className={CLASSE_CHAMP}>
            {DUREES.map((d) => (
              <option key={d.minutes} value={d.minutes}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {passee && <p className="font-sans text-sm text-text-primary">Choisis un moment à venir.</p>}
      <Bouton type="submit" disabled={enCours || passee}>
        {enCours ? 'Envoi…' : element.invitation_envoyee_le ? '✉️ Envoyer la nouvelle date' : "✉️ Envoyer l'invitation"}
      </Bouton>
      {element.invitation_envoyee_le && (
        <Bouton type="button" variante="secondaire" disabled={enCours} onClick={onAnnulerInvitation}>
          Annuler l'invitation
        </Bouton>
      )}
      <Bouton type="button" variante="discret" onClick={onFermer}>
        Fermer
      </Bouton>
    </form>
  )
}
