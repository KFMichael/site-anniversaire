import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/contexte'
import { useEspace } from './contexte'
import { useMembres } from './useMembres'
import Apparence from './Apparence'
import { Bouton, Carte, ChampTexte, Page } from '../../components/ui'

export default function ReglagesEspace() {
  const location = useLocation()
  const { espace } = useEspace()
  const nouvelEspace = location.state?.nouvelEspace

  return (
    <Page titre={espace.nom} sousTitre="Réglages de l'espace">
      {nouvelEspace && (
        <Carte>
          <p className="font-sans text-text-secondary">
            🎉 Espace créé ! Invite ton ou ta partenaire (ou tes amis) avec un lien
            ci-dessous.
          </p>
        </Carte>
      )}
      <Membres />
      <Profil />
      <Apparence />
      <Espaces />
    </Page>
  )
}

function Membres() {
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
    <Carte titre="Membres">
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

function Profil() {
  const { utilisateur, deconnexion } = useAuth()
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
    <Carte titre="Mon profil">
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
          <Bouton type="button" variante="discret" onClick={deconnexion}>
            Se déconnecter
          </Bouton>
        </div>
      </form>
    </Carte>
  )
}

function Espaces() {
  const navigate = useNavigate()
  const { utilisateur } = useAuth()
  const { espaces, espace, choisirEspace, recharger } = useEspace()

  async function quitter() {
    const confirme = window.confirm(
      `Quitter « ${espace.nom} » ? Tu n'auras plus accès à ses données.`
    )
    if (!confirme) return
    const { error } = await supabase
      .from('membres_espace')
      .delete()
      .eq('espace_id', espace.id)
      .eq('user_id', utilisateur.id)
    if (!error) {
      await recharger()
      navigate('/', { replace: true })
    }
  }

  return (
    <Carte titre="Mes espaces">
      {espaces.length > 1 && (
        <ul className="flex flex-col gap-2">
          {espaces.map((e) => (
            <li key={e.id}>
              <button
                onClick={() => choisirEspace(e.id)}
                aria-pressed={e.id === espace.id}
                className={`font-sans w-full text-left px-4 py-3 rounded-2xl border transition-all duration-200 ease-spring active:scale-[0.98] ${
                  e.id === espace.id
                    ? 'border-accent text-text-primary font-medium'
                    : 'border-separator text-text-secondary'
                }`}
              >
                {e.nom}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-3 flex-wrap">
        <Bouton variante="secondaire" onClick={() => navigate('/bienvenue')}>
          Créer ou rejoindre un espace
        </Bouton>
        <Bouton variante="discret" onClick={quitter}>
          Quitter cet espace
        </Bouton>
      </div>
    </Carte>
  )
}
