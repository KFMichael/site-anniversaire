import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { NOM_APP } from '../../config'
import { extraireCodeInvitation, useEspace } from './contexte'
import { useAuth } from '../auth/contexte'
import { Bouton, Carte, ChampTexte, Page } from '../../components/ui'

// Premier passage (ou création d'un espace supplémentaire) : créer un
// espace ou en rejoindre un avec un code d'invitation.
export default function Bienvenue() {
  const navigate = useNavigate()
  const { deconnexion } = useAuth()
  const { espaces, profil, recharger, choisirEspace } = useEspace()
  const [nom, setNom] = useState('')
  const [code, setCode] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  async function creer(e) {
    e.preventDefault()
    setErreur('')
    setEnCours(true)
    const { data, error } = await supabase.rpc('creer_espace', { p_nom: nom.trim() })
    setEnCours(false)
    if (error) {
      setErreur("La création de l'espace a échoué.")
      return
    }
    choisirEspace(data)
    await recharger()
    navigate('/espace', { state: { nouvelEspace: true } })
  }

  function rejoindre(e) {
    e.preventDefault()
    const codeNettoye = extraireCodeInvitation(code)
    if (codeNettoye) navigate(`/rejoindre/${codeNettoye}`)
  }

  return (
    <Page
      titre={`Bienvenue${profil?.prenom ? `, ${profil.prenom}` : ''} 👋`}
      sousTitre={`Un espace ${NOM_APP} se partage : en couple, en coloc ou entre amis.`}
    >
      <Carte titre="Créer un espace">
        <form onSubmit={creer} className="flex flex-col gap-3">
          <ChampTexte
            id="nom-espace"
            label="Nom de l'espace"
            placeholder="Notre foyer"
            maxLength={60}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
          />
          <Bouton type="submit" disabled={enCours || !nom.trim()}>
            {enCours ? 'Création…' : "Créer l'espace"}
          </Bouton>
        </form>
      </Carte>

      <Carte titre="Rejoindre un espace">
        <form onSubmit={rejoindre} className="flex flex-col gap-3">
          <ChampTexte
            id="code-invitation"
            label="Lien ou code d'invitation reçu"
            placeholder="https://…/rejoindre/…"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <Bouton type="submit" variante="secondaire" disabled={!code.trim()}>
            Continuer
          </Bouton>
        </form>
      </Carte>

      {erreur && <p className="font-sans text-sm text-text-muted italic px-1">{erreur}</p>}

      <div className="flex justify-center gap-4">
        {espaces.length > 0 && (
          <Bouton variante="discret" onClick={() => navigate('/')}>
            Retour à mon espace
          </Bouton>
        )}
        <Bouton variante="discret" onClick={deconnexion}>
          Se déconnecter
        </Bouton>
      </div>
    </Page>
  )
}
