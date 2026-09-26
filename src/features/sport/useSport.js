import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useTempsReel } from '../../lib/useTempsReel'
import { useAuth } from '../auth/contexte'
import { useEspace } from '../espace/contexte'
import { moisDe } from '../charge/calculs'
import { decalerJours } from '../menus/tirage'

export const SEANCES_PAR_SEMAINE = 3
export const DUREE_SEANCE = 45

// État d'une séance vis-à-vis de l'invitation
export function statutSeance(s) {
  if (s.annulee) return 'annulation'
  if (!s.envoyee_le) return 'a-envoyer'
  return new Date(s.updated_at) > new Date(s.envoyee_le) ? 'modifiee' : 'envoyee'
}

// Séances de la semaine du `lundi`, et qui en est responsable.
// Les actions renvoient null si tout va bien, sinon un message d'erreur.
export function useSport(lundi) {
  const { utilisateur, session } = useAuth()
  const { espace } = useEspace()
  const [seances, setSeances] = useState([])
  const [responsable, setResponsable] = useState(undefined) // undefined = chargement, null = personne
  const [chargeSport, setChargeSport] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const mois = moisDe(new Date(`${lundi}T12:00:00`))

  const charger = useCallback(async () => {
    const debut = new Date(`${lundi}T00:00:00`).toISOString()
    const fin = new Date(`${decalerJours(lundi, 7)}T00:00:00`).toISOString()
    const [s, c] = await Promise.all([
      supabase.from('seances_sport').select('*').eq('espace_id', espace.id).gte('debut', debut).lt('debut', fin),
      supabase.from('charges').select('id, nom').eq('espace_id', espace.id).eq('archivee', false).ilike('nom', '%sport%'),
    ])
    if (s.error) {
      setErreur('Impossible de charger les séances. La migration 0010 a-t-elle été exécutée ?')
      setChargement(false)
      return
    }
    setErreur('')
    setSeances(s.data.sort((a, b) => a.debut.localeCompare(b.debut)))
    const charge = c.data?.[0] ?? null
    setChargeSport(charge)
    if (charge) {
      const { data } = await supabase
        .from('attributions')
        .select('user_id')
        .eq('charge_id', charge.id)
        .eq('mois', mois)
      setResponsable(data?.[0]?.user_id ?? null)
    } else {
      setResponsable(null)
    }
    setChargement(false)
  }, [espace.id, lundi, mois])

  useEffect(() => {
    charger()
  }, [charger])

  useTempsReel(['seances_sport', 'attributions'], espace.id, charger)

  // Personne de responsable, ou pas de charge « sport » : tout le monde peut planifier
  const peutPlanifier = responsable === null || responsable === utilisateur.id
  const actives = useMemo(() => seances.filter((s) => !s.annulee), [seances])
  const aEnvoyer = useMemo(() => seances.filter((s) => statutSeance(s) !== 'envoyee'), [seances])

  const ajouter = useCallback(
    async (jour, heure) => {
      const { error } = await supabase.from('seances_sport').insert({
        espace_id: espace.id,
        debut: new Date(`${jour}T${heure}`).toISOString(),
        duree_minutes: DUREE_SEANCE,
      })
      await charger()
      return error ? "La séance n'a pas pu être ajoutée." : null
    },
    [espace.id, charger]
  )

  const modifier = useCallback(
    async (seance, jour, heure) => {
      const { error } = await supabase
        .from('seances_sport')
        .update({ debut: new Date(`${jour}T${heure}`).toISOString(), updated_at: new Date().toISOString() })
        .eq('id', seance.id)
      await charger()
      return error ? "La séance n'a pas pu être modifiée." : null
    },
    [charger]
  )

  // Déjà envoyée : on garde la ligne pour envoyer l'annulation aux agendas
  const supprimer = useCallback(
    async (seance) => {
      const requete = seance.envoyee_le
        ? supabase.from('seances_sport').update({ annulee: true, updated_at: new Date().toISOString() }).eq('id', seance.id)
        : supabase.from('seances_sport').delete().eq('id', seance.id)
      const { error } = await requete
      await charger()
      return error ? "La séance n'a pas pu être supprimée." : null
    },
    [charger]
  )

  // Renoncer à annuler une séance déjà envoyée
  const retablir = useCallback(
    async (seance) => {
      const { error } = await supabase.from('seances_sport').update({ annulee: false }).eq('id', seance.id)
      await charger()
      return error ? "La séance n'a pas pu être rétablie." : null
    },
    [charger]
  )

  const prendreCharge = useCallback(async () => {
    const { error } = await supabase
      .from('attributions')
      .insert({ charge_id: chargeSport.id, mois, espace_id: espace.id, user_id: utilisateur.id })
    await charger()
    return error ? "Quelqu'un vient de prendre cette charge." : null
  }, [chargeSport, mois, espace.id, utilisateur.id, charger])

  // Renvoie { message, ok }
  const envoyer = useCallback(async () => {
    try {
      const reponse = await fetch('/api/sport', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ espace_id: espace.id }),
      })
      const corps = await reponse.json().catch(() => ({}))
      await charger()
      if (!reponse.ok) return { ok: false, message: corps.erreur ?? "L'envoi a échoué." }
      const morceaux = []
      if (corps.envoyees) morceaux.push(`${corps.envoyees} invitation${corps.envoyees > 1 ? 's' : ''} envoyée${corps.envoyees > 1 ? 's' : ''}`)
      if (corps.annulees) morceaux.push(`${corps.annulees} annulation${corps.annulees > 1 ? 's' : ''}`)
      return { ok: true, message: `${morceaux.join(' et ')} ✓` }
    } catch {
      return { ok: false, message: "L'envoi n'est pas disponible pour le moment." }
    }
  }, [session, espace.id, charger])

  return {
    seances,
    actives,
    aEnvoyer,
    responsable,
    chargeSport,
    peutPlanifier,
    chargement,
    erreur,
    ajouter,
    modifier,
    supprimer,
    retablir,
    prendreCharge,
    envoyer,
  }
}
