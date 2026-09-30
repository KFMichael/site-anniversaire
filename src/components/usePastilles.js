import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTempsReel } from '../lib/useTempsReel'
import { useEspace } from '../features/espace/contexte'
import { moisDe } from '../features/charge/calculs'

// Pastilles de la barre d'onglets : articles à acheter, charges du mois
// sans responsable. Rafraîchies à chaque écran et en temps réel.
export function usePastilles(pathname) {
  const { espace } = useEspace()
  const [pastilles, setPastilles] = useState({ courses: 0, charge: 0 })

  const charger = useCallback(async () => {
    const [produits, articles, charges, attributions] = await Promise.all([
      supabase.from('produits').select('id').eq('espace_id', espace.id).neq('etat', 'ok'),
      supabase.from('articles_courses').select('id').eq('espace_id', espace.id),
      supabase.from('charges').select('id').eq('espace_id', espace.id).eq('archivee', false),
      supabase.from('attributions').select('charge_id').eq('espace_id', espace.id).eq('mois', moisDe()),
    ])
    const prises = new Set((attributions.data ?? []).map((a) => a.charge_id))
    setPastilles({
      courses: produits.error || articles.error ? 0 : produits.data.length + articles.data.length,
      charge: charges.error || attributions.error ? 0 : charges.data.filter((c) => !prises.has(c.id)).length,
    })
  }, [espace.id])

  useEffect(() => {
    charger()
  }, [charger, pathname])

  useTempsReel(['produits', 'articles_courses', 'charges', 'attributions'], espace.id, charger)

  return pastilles
}
