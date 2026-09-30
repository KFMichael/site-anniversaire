import { useCallback, useEffect, useMemo, useState } from 'react'
import { signalerActivite } from '../../lib/activite'
import { supabase } from '../../lib/supabase'
import { useTempsReel } from '../../lib/useTempsReel'
import { useEspace } from '../espace/contexte'
import { cleProduit } from './drive'

// Enseigne du drive de l'espace et produits mémorisés (lien + prix) pour
// cette enseigne. Les actions renvoient null si tout va bien, sinon un
// message d'erreur.
export function useDrive() {
  const { espace } = useEspace()
  const [reglage, setReglage] = useState(null)
  const [toutesReferences, setToutesReferences] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    const [r, refs] = await Promise.all([
      supabase.from('drive_espace').select('*').eq('espace_id', espace.id).maybeSingle(),
      supabase.from('references_drive').select('*').eq('espace_id', espace.id),
    ])
    if (r.error || refs.error) {
      setErreur("La commande au drive n'est pas encore disponible : la base de données doit être mise à jour (migration 0015 dans Supabase).")
    } else {
      setErreur('')
      setReglage(r.data)
      setToutesReferences(refs.data)
    }
    setChargement(false)
  }, [espace.id])

  useEffect(() => {
    charger()
  }, [charger])

  useTempsReel(['drive_espace', 'references_drive'], espace.id, charger)

  const enseigne = reglage?.enseigne ?? null

  // cleProduit → référence, pour l'enseigne choisie
  const references = useMemo(
    () => new Map(toutesReferences.filter((r) => r.enseigne === enseigne).map((r) => [r.cle, r])),
    [toutesReferences, enseigne]
  )

  const choisirEnseigne = useCallback(
    async (nouvelle, magasinUrl) => {
      const { error } = await supabase
        .from('drive_espace')
        .upsert({ espace_id: espace.id, enseigne: nouvelle, magasin_url: magasinUrl ?? null, updated_at: new Date().toISOString() })
      await charger()
      return error ? "L'enseigne n'a pas pu être enregistrée." : null
    },
    [espace.id, charger]
  )

  // Lien et prix de « mon produit » (url et prix_centimes peuvent être null)
  const memoriser = useCallback(
    async (nom, { url, prix_centimes }) => {
      const cle = cleProduit(nom)
      const { error } =
        url || prix_centimes != null
          ? await supabase.from('references_drive').upsert(
              { espace_id: espace.id, enseigne, cle, url, prix_centimes, updated_at: new Date().toISOString() },
              { onConflict: 'espace_id,enseigne,cle' }
            )
          : await supabase.from('references_drive').delete().eq('espace_id', espace.id).eq('enseigne', enseigne).eq('cle', cle)
      await charger()
      return error ? "Le produit n'a pas pu être enregistré." : null
    },
    [espace.id, enseigne, charger]
  )

  const noterCommande = useCallback(
    async (nbArticles, montantCentimes) => {
      const { error } = await supabase
        .from('commandes_drive')
        .insert({ espace_id: espace.id, enseigne, nb_articles: nbArticles, montant_centimes: montantCentimes || null })
      if (error) return "La commande n'a pas pu être notée."
      signalerActivite(espace.id)
      // Montant estimé reporté dans les finances (sans bloquer la commande
      // si la migration 0016 n'est pas encore passée)
      if (montantCentimes > 0) {
        await supabase.from('depenses').insert({
          espace_id: espace.id,
          categorie: 'courses',
          montant_centimes: montantCentimes,
          libelle: `Commande ${enseigne === 'carrefour' ? 'Carrefour' : 'Leclerc'} Drive`,
          source: 'drive',
        })
      }
      return null
    },
    [espace.id, enseigne]
  )

  return { reglage, enseigne, references, chargement, erreur, choisirEnseigne, memoriser, noterCommande }
}
