import { useEffect, useRef } from 'react'
import { supabase } from './supabase'

// Appelle `surChangement` quand une ligne de l'une des `tables` change dans
// l'espace (insertion, modification, suppression par n'importe quel membre).
// Les tables doivent être dans la publication supabase_realtime (migrations).
export function useTempsReel(tables, espaceId, surChangement) {
  // Toujours la dernière version du callback, sans se réabonner à chaque rendu
  const rappel = useRef(surChangement)
  useEffect(() => {
    rappel.current = surChangement
  })

  const cle = tables.join(',')
  useEffect(() => {
    let canal = supabase.channel(`${cle}-${espaceId}`)
    for (const table of cle.split(',')) {
      canal = canal.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `espace_id=eq.${espaceId}` },
        () => rappel.current()
      )
    }
    canal.subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
  }, [cle, espaceId])
}
