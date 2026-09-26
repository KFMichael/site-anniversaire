import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/contexte'
import { useEspace } from './contexte'
import { Bouton, Carte } from '../../components/ui'

// Préférences du récap par email (sans ligne en base : tout est activé)
// et envoi d'un aperçu à soi-même
export default function Emails() {
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
    <Carte titre="Emails">
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

function Interrupteur({ label, detail, actif, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col">
        <span className="font-sans text-sm text-text-primary">{label}</span>
        <span className="font-sans text-xs text-text-muted">{detail}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={actif}
        aria-label={label}
        onClick={() => onChange(!actif)}
        className={`cible-44 w-12 h-7 shrink-0 rounded-full transition-colors duration-200 ease-spring ${
          actif ? 'bg-accent' : 'bg-separator'
        }`}
      >
        <span
          className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-soft transition-all duration-200 ease-spring ${
            actif ? 'left-5.5' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}
