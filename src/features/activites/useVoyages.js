import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useTempsReel } from '../../lib/useTempsReel'
import { useEspace } from '../espace/contexte'

// Voyages de l'espace. Les actions renvoient null si tout va bien, sinon un
// message d'erreur.
export function useVoyages() {
  const { espace } = useEspace()
  const [voyages, setVoyages] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from('voyages').select('*').eq('espace_id', espace.id)
    if (error) setErreur("Les voyages ne sont pas encore disponibles : la base de données doit être mise à jour (migration 0018 dans Supabase).")
    else {
      setErreur('')
      setVoyages(data)
    }
    setChargement(false)
  }, [espace.id])

  useEffect(() => {
    charger()
  }, [charger])

  useTempsReel(['voyages'], espace.id, charger)

  const enregistrer = useCallback(
    async (voyage, champs) => {
      const { error } = voyage
        ? await supabase.from('voyages').update(champs).eq('id', voyage.id)
        : await supabase.from('voyages').insert({ espace_id: espace.id, ...champs })
      await charger()
      return error ? "Le voyage n'a pas pu être enregistré." : null
    },
    [espace.id, charger]
  )

  const supprimer = useCallback(
    async (voyage) => {
      setVoyages((x) => x.filter((v) => v.id !== voyage.id))
      const { error } = await supabase.from('voyages').delete().eq('id', voyage.id)
      if (error) await charger()
      return error ? "Le voyage n'a pas pu être supprimé." : null
    },
    [charger]
  )

  // « Annuler » après une suppression : le voyage revient tel quel
  const restaurer = useCallback(
    async (voyage) => {
      const { error } = await supabase.from('voyages').insert(voyage)
      await charger()
      return error ? "Le voyage n'a pas pu être restauré." : null
    },
    [charger]
  )

  return { voyages, chargement, erreur, enregistrer, supprimer, restaurer }
}
