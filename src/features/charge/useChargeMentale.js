import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useTempsReel } from '../../lib/useTempsReel'
import { useAuth } from '../auth/contexte'
import { useEspace } from '../espace/contexte'
import { decalerMois } from './calculs'

// Code Postgres d'une violation d'unicité : la charge a été prise entretemps
const DOUBLON = '23505'

// Charges de l'espace (archivées comprises) et attributions du mois affiché.
// Les actions renvoient null si tout va bien, sinon un message d'erreur.
export function useChargeMentale(mois) {
  const { utilisateur } = useAuth()
  const { espace } = useEspace()
  const [charges, setCharges] = useState([])
  const [attributions, setAttributions] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  const chargerCharges = useCallback(async () => {
    const { data, error } = await supabase
      .from('charges')
      .select('*')
      .eq('espace_id', espace.id)
      .order('ordre', { ascending: true })
    if (error) setErreur('Impossible de charger les charges. La migration 0004 a-t-elle été exécutée ?')
    else setCharges(data)
  }, [espace.id])

  const chargerAttributions = useCallback(async () => {
    const { data, error } = await supabase
      .from('attributions')
      .select('charge_id, user_id')
      .eq('espace_id', espace.id)
      .eq('mois', mois)
    if (!error) setAttributions(data)
  }, [espace.id, mois])

  useEffect(() => {
    Promise.all([chargerCharges(), chargerAttributions()]).then(() => setChargement(false))
  }, [chargerCharges, chargerAttributions])

  // Temps réel : quand un autre membre prend ou relâche une charge
  useTempsReel(['attributions'], espace.id, chargerAttributions)

  const prendre = useCallback(
    async (chargeId) => {
      const { error } = await supabase
        .from('attributions')
        .insert({ charge_id: chargeId, mois, espace_id: espace.id, user_id: utilisateur.id })
      await chargerAttributions()
      if (!error) return null
      return error.code === DOUBLON
        ? "Trop tard : quelqu'un vient de la prendre."
        : 'Impossible de prendre cette charge.'
    },
    [mois, espace.id, utilisateur.id, chargerAttributions]
  )

  const relacher = useCallback(
    async (chargeId) => {
      const { error } = await supabase
        .from('attributions')
        .delete()
        .eq('charge_id', chargeId)
        .eq('mois', mois)
      await chargerAttributions()
      return error ? 'Impossible de relâcher cette charge.' : null
    },
    [mois, chargerAttributions]
  )

  // Reprend ses charges du mois précédent qui sont encore libres et actives.
  // Renvoie le nombre de charges reprises.
  const reprendreMoisPrecedent = useCallback(async () => {
    const { data } = await supabase
      .from('attributions')
      .select('charge_id')
      .eq('espace_id', espace.id)
      .eq('mois', decalerMois(mois, -1))
      .eq('user_id', utilisateur.id)
    const prises = new Set(attributions.map((a) => a.charge_id))
    const actives = new Set(charges.filter((c) => !c.archivee).map((c) => c.id))
    const aReprendre = (data ?? [])
      .map((a) => a.charge_id)
      .filter((id) => actives.has(id) && !prises.has(id))

    let reprises = 0
    for (const chargeId of aReprendre) {
      const { error } = await supabase
        .from('attributions')
        .insert({ charge_id: chargeId, mois, espace_id: espace.id, user_id: utilisateur.id })
      if (!error) reprises += 1
    }
    await chargerAttributions()
    return reprises
  }, [mois, espace.id, utilisateur.id, attributions, charges, chargerAttributions])

  const ajouterCharge = useCallback(
    async ({ nom, emoji, poids }) => {
      const ordre = Math.max(0, ...charges.map((c) => c.ordre)) + 1
      const { error } = await supabase
        .from('charges')
        .insert({ espace_id: espace.id, nom: nom.trim(), emoji: emoji || '📌', poids, ordre })
      await chargerCharges()
      return error ? "Impossible d'ajouter la charge." : null
    },
    [charges, espace.id, chargerCharges]
  )

  const modifierCharge = useCallback(
    async (id, modifications) => {
      const { error } = await supabase.from('charges').update(modifications).eq('id', id)
      await chargerCharges()
      return error ? 'Impossible de modifier la charge.' : null
    },
    [chargerCharges]
  )

  return {
    charges,
    attributions,
    chargement,
    erreur,
    prendre,
    relacher,
    reprendreMoisPrecedent,
    ajouterCharge,
    modifierCharge,
  }
}
