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
  const [budgets, setBudgets] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    const [{ data, error }, b] = await Promise.all([
      supabase
        .from('depenses')
        .select('*')
        .eq('espace_id', espace.id)
        .gte('jour', decalerMois(mois, -1))
        .lt('jour', decalerMois(mois, 1)),
      supabase.from('budgets').select('categorie, montant_centimes').eq('espace_id', espace.id),
    ])
    // Budgets absents (migration 0017 pas encore passée) : l'écran marche sans
    setBudgets(b.error ? [] : b.data)
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

  useTempsReel(['depenses', 'budgets'], espace.id, charger)

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

  // « Annuler » après une suppression : la dépense revient telle quelle
  const restaurer = useCallback(
    async (depense) => {
      const { error } = await supabase.from('depenses').insert(depense)
      await charger()
      return error ? "La dépense n'a pas pu être restaurée." : null
    },
    [charger]
  )

  // Budgets mensuels : { categorie: centimes | null } ; null retire le budget
  const enregistrerBudgets = useCallback(
    async (valeurs) => {
      const aGarder = Object.entries(valeurs).filter(([, c]) => c)
      const aRetirer = Object.entries(valeurs).filter(([, c]) => !c).map(([categorie]) => categorie)
      const resultats = await Promise.all([
        aGarder.length
          ? supabase.from('budgets').upsert(
              aGarder.map(([categorie, montant_centimes]) => ({ espace_id: espace.id, categorie, montant_centimes, updated_at: new Date().toISOString() })),
              { onConflict: 'espace_id,categorie' }
            )
          : { error: null },
        aRetirer.length ? supabase.from('budgets').delete().eq('espace_id', espace.id).in('categorie', aRetirer) : { error: null },
      ])
      await charger()
      return resultats.some((r) => r.error) ? "Les budgets n'ont pas pu être enregistrés." : null
    },
    [espace.id, charger]
  )

  return { depenses, budgets, chargement, erreur, enregistrer, supprimer, restaurer, enregistrerBudgets }
}
