import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/contexte'
import { useEspace } from './contexte'
import { useMembres } from './useMembres'
import Apparence from './Apparence'
import Emails from './Emails'
import Notifications from './Notifications'
import { Bouton, Carte, ChampTexte, GroupeListe, LigneListe, Page } from '../../components/ui'
import { PageIntrouvable } from '../../components/Erreurs'
import { lireTheme, THEMES } from '../../lib/theme'

// Réglages façon Réglages d'iOS : la page principale liste les sections en
// groupes, chacune s'ouvre sur sa propre page (/espace/<section>). La
// provenance (Aujourd'hui ou Plus) suit la navigation pour l'onglet allumé
// et le bouton retour.
export default function ReglagesEspace() {
  const location = useLocation()
  const { espace, espaces, profil } = useEspace()
  const { utilisateur, deconnexion } = useAuth()
  const { membres } = useMembres()
  const nouvelEspace = location.state?.nouvelEspace
  const depuis = location.state?.depuis
  const etat = { depuis }
  const theme = THEMES.find((t) => t.id === lireTheme())?.label
  const nom = profil?.prenom || utilisateur.email

  return (
    <Page
      titre="Réglages"
      sousTitre={espace.nom}
      retour={depuis === 'plus' ? { vers: '/plus', label: 'Plus' } : { vers: '/', label: "Aujourd'hui" }}
    >
      {nouvelEspace && (
        <Carte>
          <p className="font-sans text-text-secondary">
            🎉 Espace créé ! Invite ton ou ta partenaire (ou tes amis) depuis « Membres ».
          </p>
        </Carte>
      )}

      <GroupeListe>
        <LigneListe
          vers="/espace/profil"
          etat={etat}
          pastille={
            <span className="w-9 h-9 rounded-full bg-accent text-white font-semibold flex items-center justify-center" aria-hidden="true">
              {nom.trim().charAt(0).toUpperCase()}
            </span>
          }
          titre={profil?.prenom || 'Mon profil'}
          detail={utilisateur.email}
        />
      </GroupeListe>

      <GroupeListe titre="Espace">
        <LigneListe vers="/espace/membres" etat={etat} emoji="👥" titre="Membres" detail="Inviter quelqu’un" valeur={membres.length || undefined} />
        <LigneListe
          vers="/espace/espaces"
          etat={etat}
          emoji="🏠"
          titre="Mes espaces"
          valeur={espaces.length > 1 ? String(espaces.length) : undefined}
          detail={espaces.length > 1 ? undefined : 'Créer ou rejoindre un espace'}
        />
      </GroupeListe>

      <GroupeListe titre="Préférences">
        <LigneListe vers="/espace/notifications" etat={etat} emoji="🔔" titre="Notifications" />
        <LigneListe vers="/espace/emails" etat={etat} emoji="✉️" titre="Emails" detail="Récap du dimanche, rappel du 1er" />
        <LigneListe vers="/espace/apparence" etat={etat} emoji="🌗" titre="Apparence" valeur={theme} />
      </GroupeListe>

      <GroupeListe>
        <LigneListe danger titre="Se déconnecter" onClick={deconnexion} />
        <QuitterEspace />
      </GroupeListe>
    </Page>
  )
}

const SECTIONS = {
  profil: { titre: 'Mon profil', Contenu: Profil },
  membres: { titre: 'Membres', Contenu: Membres },
  espaces: { titre: 'Mes espaces', Contenu: Espaces },
  notifications: { titre: 'Notifications', Contenu: Notifications },
  emails: { titre: 'Emails', Contenu: Emails },
  apparence: { titre: 'Apparence', Contenu: Apparence },
}

// Une section des réglages, sur sa propre page
export function SectionReglages() {
  const { section } = useParams()
  const location = useLocation()
  const s = SECTIONS[section]
  if (!s) return <PageIntrouvable />
  const { Contenu } = s
  return (
    <Page titre={s.titre} retour={{ vers: '/espace', label: 'Réglages', etat: { depuis: location.state?.depuis } }}>
      <Contenu titre={null} />
    </Page>
  )
}

function QuitterEspace() {
  const navigate = useNavigate()
  const { utilisateur } = useAuth()
  const { espace, recharger } = useEspace()

  async function quitter() {
    const confirme = window.confirm(`Quitter « ${espace.nom} » ? Tu n'auras plus accès à ses données.`)
    if (!confirme) return
    const { error } = await supabase.from('membres_espace').delete().eq('espace_id', espace.id).eq('user_id', utilisateur.id)
    if (!error) {
      await recharger()
      navigate('/', { replace: true })
    }
  }

  return <LigneListe danger titre="Quitter cet espace" onClick={quitter} />
}

function Membres({ titre = 'Membres' }) {
  const { utilisateur } = useAuth()
  const { espace } = useEspace()
  const { membres } = useMembres()
  const [lien, setLien] = useState('')
  const [copie, setCopie] = useState(false)
  const [erreur, setErreur] = useState('')

  // Un lien d'invitation affiché ne vaut que pour l'espace où il a été créé
  useEffect(() => {
    setLien('')
  }, [espace.id])

  async function creerLien() {
    setErreur('')
    const { data, error } = await supabase
      .from('invitations')
      .insert({ espace_id: espace.id, cree_par: utilisateur.id })
      .select('code')
      .single()
    if (error) {
      setErreur("Impossible de créer le lien d'invitation.")
      return
    }
    setLien(`${window.location.origin}/rejoindre/${data.code}`)
    setCopie(false)
  }

  async function partager() {
    // Feuille de partage native sur mobile, copie dans le presse-papier sinon
    if (navigator.share) {
      try {
        await navigator.share({ title: `Rejoins « ${espace.nom} »`, url: lien })
        return
      } catch {
        // partage annulé : on retombe sur la copie
      }
    }
    try {
      await navigator.clipboard.writeText(lien)
      setCopie(true)
    } catch {
      setErreur('Copie impossible : sélectionne le lien à la main.')
    }
  }

  return (
    <Carte titre={titre}>
      <ul className="flex flex-col divide-y divide-separator">
        {membres.map((m) => (
          <li key={m.user_id} className="py-2.5 flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="font-sans text-text-primary">
                {m.prenom}
                {m.user_id === utilisateur.id && (
                  <span className="text-text-muted"> (toi)</span>
                )}
              </span>
              <span className="font-sans text-xs text-text-muted">{m.email}</span>
            </div>
            {m.role === 'admin' && (
              <span className="font-sans text-xs px-2.5 py-1 rounded-full bg-bg-base text-text-muted">
                admin
              </span>
            )}
          </li>
        ))}
      </ul>

      {lien ? (
        <div className="flex flex-col gap-2">
          <p className="font-sans text-sm text-text-muted">
            Lien valable 7 jours, utilisable par plusieurs personnes :
          </p>
          <p className="font-sans text-sm text-text-primary break-all p-3 rounded-2xl bg-bg-base select-all">
            {lien}
          </p>
          <Bouton onClick={partager}>{copie ? 'Lien copié ✓' : 'Partager le lien'}</Bouton>
        </div>
      ) : (
        <Bouton variante="secondaire" onClick={creerLien}>
          Inviter quelqu'un
        </Bouton>
      )}
      {erreur && <p className="font-sans text-sm text-text-muted italic">{erreur}</p>}
    </Carte>
  )
}

function Profil({ titre = 'Mon profil' }) {
  const { utilisateur } = useAuth()
  const { profil, recharger } = useEspace()
  const [prenom, setPrenom] = useState(profil?.prenom ?? '')
  const [enregistre, setEnregistre] = useState(false)

  async function enregistrer(e) {
    e.preventDefault()
    const { error } = await supabase
      .from('profils')
      .update({ prenom: prenom.trim() })
      .eq('id', utilisateur.id)
    if (!error) {
      setEnregistre(true)
      recharger()
    }
  }

  return (
    <Carte titre={titre}>
      <form onSubmit={enregistrer} className="flex flex-col gap-3">
        <ChampTexte
          id="prenom"
          label="Prénom affiché aux autres membres"
          value={prenom}
          maxLength={40}
          onChange={(e) => {
            setPrenom(e.target.value)
            setEnregistre(false)
          }}
          required
        />
        <p className="font-sans text-xs text-text-muted px-1">
          Connecté·e avec {utilisateur.email}
        </p>
        <div className="flex gap-3 flex-wrap">
          <Bouton type="submit" variante="secondaire" disabled={!prenom.trim()}>
            {enregistre ? 'Enregistré ✓' : 'Enregistrer'}
          </Bouton>
        </div>
      </form>
    </Carte>
  )
}

function Espaces({ titre = 'Mes espaces' }) {
  const navigate = useNavigate()
  const { espaces, espace, choisirEspace } = useEspace()

  return (
    <Carte titre={titre}>
      {espaces.length > 1 && (
        <ul className="flex flex-col gap-2">
          {espaces.map((e) => (
            <li key={e.id}>
              <button
                onClick={() => choisirEspace(e.id)}
                aria-pressed={e.id === espace.id}
                className={`font-sans w-full min-h-11 text-left px-4 py-3 rounded-2xl border transition-all duration-200 ease-spring active:scale-[0.98] ${
                  e.id === espace.id ? 'border-accent text-text-primary font-medium' : 'border-separator text-text-secondary'
                }`}
              >
                {e.nom}
                {e.id === espace.id && <span className="text-accent-text"> ✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Bouton variante="secondaire" onClick={() => navigate('/bienvenue')}>
        Créer ou rejoindre un espace
      </Bouton>
    </Carte>
  )
}
