import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useEspace } from './contexte'
import { Bouton, Carte, Page } from '../../components/ui'
import Chargement from '../../components/Chargement'

export default function Rejoindre() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { recharger, choisirEspace } = useEspace()
  const [apercu, setApercu] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    supabase.rpc('apercu_invitation', { p_code: code }).then(({ data, error }) => {
      setApercu(!error && data?.length ? data[0] : null)
      setChargement(false)
    })
  }, [code])

  async function accepter() {
    setEnCours(true)
    setErreur('')
    const { data, error } = await supabase.rpc('rejoindre_espace', { p_code: code })
    if (error) {
      setEnCours(false)
      setErreur("Impossible de rejoindre l'espace. Le lien a peut-être expiré.")
      return
    }
    choisirEspace(data)
    await recharger()
    navigate('/', { replace: true })
  }

  function allerALEspace() {
    choisirEspace(apercu.espace_id)
    navigate('/', { replace: true })
  }

  if (chargement) return <Chargement plein />

  return (
    <Page titre="Invitation">
      {!apercu ? (
        <Carte>
          <p className="font-sans text-text-secondary">
            Ce lien d'invitation n'est pas valide ou a expiré. Demande un nouveau lien à la
            personne qui t'a invité·e.
          </p>
          <Bouton variante="secondaire" onClick={() => navigate('/bienvenue')}>
            Retour
          </Bouton>
        </Carte>
      ) : apercu.deja_membre ? (
        <Carte>
          <p className="font-sans text-text-secondary">
            Tu fais déjà partie de <strong>{apercu.nom}</strong>.
          </p>
          <Bouton onClick={allerALEspace}>Ouvrir l'espace</Bouton>
        </Carte>
      ) : (
        <Carte>
          <p className="font-sans text-text-secondary">
            Tu es invité·e à rejoindre l'espace <strong>{apercu.nom}</strong>.
          </p>
          <Bouton onClick={accepter} disabled={enCours}>
            {enCours ? 'Un instant…' : "Rejoindre l'espace"}
          </Bouton>
          {erreur && <p className="font-sans text-sm text-text-muted italic">{erreur}</p>}
        </Carte>
      )}
    </Page>
  )
}
