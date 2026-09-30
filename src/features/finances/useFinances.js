import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useTempsReel } from '../../lib/useTempsReel'
import { useEspace } from '../espace/contexte'
import { decalerMois } from '../charge/calculs'

// Dépenses du mois affiché et du mois précédent (pour la comparaison).
// Les actions renvoient null si tout va bien, sinon un message d'erreur.
export function useFinances(mois) {
  const { espace } = useEspace()
  const [depenses, setDepenses] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    const { data, error } = await supabase
      .from('depenses')
      .select('*')
      .eq('espace_id', espace.id)
      .gte('jour', decalerMois(mois, -1))
      .lt('jour', decalerMois(mois, 1))
    if (error) setErreur("Les finances ne sont pas encore disponibles : la base de données doit être mise à jour (migration 0016 dans Supabase).")
    else {
      setErreur('')
      setDepenses(data)
    }
    setChargement(false)
  }, [espace.id, mois])

  useEffect(() => {
    charger()
  }, [charger])

  useTempsReel(['depenses'], espace.id, charger)

  const enregistrer = useCallback(
    async (depense, champs) => {
      const { error } = depense
        ? await supabase.from('depenses').update(champs).eq('id', depense.id)
        : await supabase.from('depenses').insert({ espace_id: espace.id, ...champs })
      await charger()
      return error ? "La dépense n'a pas pu être enregistrée." : null
    },
    [espace.id, charger]
  )

  const supprimer = useCallback(
    async (depense) => {
      setDepenses((x) => x.filter((d) => d.id !== depense.id))
      const { error } = await supabase.from('depenses').delete().eq('id', depense.id)
      if (error) await charger()
      return error ? "La dépense n'a pas pu être supprimée." : null
    },
    [charger]
  )

  return { depenses, chargement, erreur, enregistrer, supprimer }
}
