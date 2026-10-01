import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/contexte'
import { useEspace } from './contexte'
import { Bouton, Carte, Interrupteur } from '../../components/ui'

// Préférences du récap par email (sans ligne en base : tout est activé)
// et envoi d'un aperçu à soi-même
export default function Emails({ titre = 'Emails' }) {
  const { session, utilisateur } = useAuth()
  const { espace } = useEspace()
  const [preferences, setPreferences] = useState({ recap_hebdo: true, rappel_mensuel: true })
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase
      .from('preferences_notifications')
      .select('recap_hebdo, rappel_mensuel')
      .eq('user_id', utilisateur.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPreferences(data)
      })
  }, [utilisateur.id])

  async function changer(champ, valeur) {
    const suivantes = { ...preferences, [champ]: valeur }
    setPreferences(suivantes)
    const { error } = await supabase
      .from('preferences_notifications')
      .upsert({ user_id: utilisateur.id, ...suivantes, updated_at: new Date().toISOString() })
    setMessage(error ? "La préférence n'a pas pu être enregistrée." : '')
  }

  async function apercu() {
    setEnvoiEnCours(true)
    setMessage('')
    try {
      const reponse = await fetch('/api/recap', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ espace_id: espace.id }),
      })
      const corps = await reponse.json().catch(() => ({}))
      setMessage(
        reponse.ok
          ? `Aperçu envoyé à ${utilisateur.email} ✓`
          : corps.erreur ?? "L'envoi n'est pas disponible pour le moment."
      )
    } catch {
      setMessage("L'envoi n'est pas disponible pour le moment.")
    }
    setEnvoiEnCours(false)
  }

  return (
    <Carte titre={titre}>
      <Interrupteur
        label="Récap du dimanche soir"
        detail="Tes charges du mois, les dîners et la liste de courses de la semaine à venir"
        actif={preferences.recap_hebdo}
        onChange={(v) => changer('recap_hebdo', v)}
      />
      <Interrupteur
        label="Rappel du 1er du mois"
        detail="Choisir sa charge mentale, avec les charges encore libres"
        actif={preferences.rappel_mensuel}
        onChange={(v) => changer('rappel_mensuel', v)}
      />
      <Bouton variante="secondaire" onClick={apercu} disabled={envoiEnCours}>
        {envoiEnCours ? 'Envoi…' : "M'envoyer un aperçu"}
      </Bouton>
      {message && <p className="font-sans text-sm text-text-muted italic">{message}</p>}
    </Carte>
  )
}
