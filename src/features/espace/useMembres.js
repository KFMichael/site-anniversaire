import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useEspace } from './contexte'

// Membres de l'espace courant, dans l'ordre d'arrivée :
// [{ user_id, role, prenom, email }]
export function useMembres() {
  const { espace } = useEspace()
  const [membres, setMembres] = useState([])
  const [chargement, setChargement] = useState(true)

  const recharger = useCallback(async () => {
    const { data, error } = await supabase
      .from('membres_espace')
      .select('user_id, role, profils (prenom, email)')
      .eq('espace_id', espace.id)
      .order('created_at', { ascending: true })
    if (!error) {
      setMembres(
        data.map((m) => ({
          user_id: m.user_id,
          role: m.role,
          prenom: m.profils?.prenom || m.profils?.email || 'Membre',
          email: m.profils?.email,
        }))
      )
    }
    setChargement(false)
  }, [espace.id])

  useEffect(() => {
    recharger()
  }, [recharger])

  return { membres, chargement, recharger }
}
