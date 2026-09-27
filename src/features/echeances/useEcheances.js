import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useTempsReel } from '../../lib/useTempsReel'
import { useAuth } from '../auth/contexte'
import { useEspace } from '../espace/contexte'
import { versIso } from '../menus/tirage'
import { marquerFaite } from './echeances'

// Échéances de l'espace. Les actions renvoient null si tout va bien, sinon
// un message d'erreur ; rappeler renvoie { message, ok }.
export function useEcheances() {
  const { session } = useAuth()
  const { espace } = useEspace()
  const [echeances, setEcheances] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from('echeances').select('*').eq('espace_id', espace.id)
    if (error) setErreur('Impossible de charger les échéances. La migration 0013 a-t-elle été exécutée ?')
    else {
      setErreur('')
      setEcheances(data)
    }
    setChargement(false)
  }, [espace.id])

  useEffect(() => {
    charger()
  }, [charger])

  useTempsReel(['echeances'], espace.id, charger)

  const persister = useCallback(
    async (requete, message) => {
      const { error } = await requete
      await charger()
      return error ? message : null
    },
    [charger]
  )

  const enregistrer = useCallback(
    (id, champs) => {
      const ligne = { ...champs, updated_at: new Date().toISOString() }
      return persister(
        id
          ? supabase.from('echeances').update(ligne).eq('id', id)
          : supabase.from('echeances').insert({ espace_id: espace.id, ...ligne }),
        "L'échéance n'a pas pu être enregistrée."
      )
    },
    [espace.id, persister]
  )

  // Mise à jour optimiste : la carte passe tout de suite à sa nouvelle date
  const faite = useCallback(
    (echeance) => {
      const champs = { ...marquerFaite(echeance, versIso(new Date())), updated_at: new Date().toISOString() }
      setEcheances((liste) => liste.map((e) => (e.id === echeance.id ? { ...e, ...champs } : e)))
      return persister(supabase.from('echeances').update(champs).eq('id', echeance.id), "L'échéance n'a pas pu être mise à jour.")
    },
    [persister]
  )

  const rouvrir = useCallback(
    (echeance) =>
      persister(
        supabase.from('echeances').update({ faite_le: null, updated_at: new Date().toISOString() }).eq('id', echeance.id),
        "L'échéance n'a pas pu être rouverte."
      ),
    [persister]
  )

  const supprimer = useCallback(
    (echeance) => {
      setEcheances((liste) => liste.filter((e) => e.id !== echeance.id))
      return persister(supabase.from('echeances').delete().eq('id', echeance.id), "L'échéance n'a pas pu être supprimée.")
    },
    [persister]
  )

  const rappeler = useCallback(
    async (echeance) => {
      try {
        const reponse = await fetch('/api/echeances', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ echeance_id: echeance.id }),
        })
        const corps = await reponse.json().catch(() => ({}))
        if (!reponse.ok) return { ok: false, message: corps.erreur ?? "Le rappel n'a pas pu être envoyé." }
        return { ok: true, message: `🔔 Rappel envoyé à ${corps.destinataires.join(', ')}` }
      } catch {
        return { ok: false, message: "L'envoi n'est pas disponible pour le moment." }
      }
    },
    [session]
  )

  return { echeances, chargement, erreur, enregistrer, faite, rouvrir, supprimer, rappeler }
}
