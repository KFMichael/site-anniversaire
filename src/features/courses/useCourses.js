import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useTempsReel } from '../../lib/useTempsReel'
import { useEspace } from '../espace/contexte'
import { normaliser } from './liste'

// Stock des produits et articles ponctuels de l'espace.
// Les modifications sont appliquées tout de suite à l'écran (optimistes),
// puis enregistrées ; en cas d'échec on recharge l'état réel.
// Les actions renvoient null si tout va bien, sinon un message d'erreur.
export function useCourses() {
  const { espace } = useEspace()
  const [produits, setProduits] = useState([])
  const [articles, setArticles] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  const recharger = useCallback(async () => {
    const [p, a] = await Promise.all([
      supabase.from('produits').select('*').eq('espace_id', espace.id),
      supabase.from('articles_courses').select('*').eq('espace_id', espace.id),
    ])
    if (p.error || a.error) {
      setErreur('Impossible de charger les courses. La migration 0005 a-t-elle été exécutée ?')
    } else {
      setErreur('')
      setProduits(p.data)
      setArticles(a.data)
    }
    setChargement(false)
  }, [espace.id])

  useEffect(() => {
    recharger()
  }, [recharger])

  // L'autre membre coche ou ajoute quelque chose : on se resynchronise
  useTempsReel(['produits', 'articles_courses'], espace.id, recharger)

  const persister = useCallback(
    async (requete, message) => {
      const { error } = await requete
      if (error) {
        await recharger()
        return message
      }
      return null
    },
    [recharger]
  )

  const changerEtat = useCallback(
    (id, etat) => {
      // Repasser à « il en reste » sort aussi le produit du panier
      const modifications = { etat, updated_at: new Date().toISOString() }
      if (etat === 'ok') modifications.dans_panier = false
      setProduits((liste) => liste.map((p) => (p.id === id ? { ...p, ...modifications } : p)))
      return persister(
        supabase.from('produits').update(modifications).eq('id', id),
        "L'état n'a pas pu être enregistré."
      )
    },
    [persister]
  )

  const basculerPanier = useCallback(
    (element) => {
      const dans_panier = !element.dans_panier
      const table = element.origine === 'stock' ? 'produits' : 'articles_courses'
      const miseAJour = (liste) =>
        liste.map((e) => (e.id === element.id ? { ...e, dans_panier } : e))
      if (element.origine === 'stock') setProduits(miseAJour)
      else setArticles(miseAJour)
      return persister(
        supabase.from(table).update({ dans_panier }).eq('id', element.id),
        "Le panier n'a pas pu être mis à jour."
      )
    },
    [persister]
  )

  // Si l'article correspond à un produit du stock, on marque le produit
  // « fini » plutôt que de créer un doublon sur la liste
  const ajouterALaListe = useCallback(
    async (nom, rayonChoisi) => {
      const existant = produits.find((p) => normaliser(p.nom) === normaliser(nom))
      if (existant) {
        if (existant.etat === 'fini') return null
        return changerEtat(existant.id, 'fini')
      }
      const { error } = await supabase
        .from('articles_courses')
        .insert({ espace_id: espace.id, nom: nom.trim(), rayon: rayonChoisi })
      await recharger()
      return error ? "L'article n'a pas pu être ajouté." : null
    },
    [produits, espace.id, changerEtat, recharger]
  )

  // « Finalement pas besoin » : le produit repasse à « il en reste »,
  // l'article ponctuel est supprimé
  const retirerDeLaListe = useCallback(
    (element) => {
      if (element.origine === 'stock') return changerEtat(element.id, 'ok')
      setArticles((liste) => liste.filter((a) => a.id !== element.id))
      return persister(
        supabase.from('articles_courses').delete().eq('id', element.id),
        "L'article n'a pas pu être retiré."
      )
    },
    [changerEtat, persister]
  )

  // Fin des courses : ce qui est dans le panier est acheté
  const terminerCourses = useCallback(async () => {
    const produitsAchetes = produits.filter((p) => p.dans_panier && p.etat !== 'ok').map((p) => p.id)
    const articlesAchetes = articles.filter((a) => a.dans_panier).map((a) => a.id)
    const resultats = await Promise.all([
      produitsAchetes.length
        ? supabase
            .from('produits')
            .update({ etat: 'ok', dans_panier: false, updated_at: new Date().toISOString() })
            .in('id', produitsAchetes)
        : { error: null },
      articlesAchetes.length
        ? supabase.from('articles_courses').delete().in('id', articlesAchetes)
        : { error: null },
    ])
    await recharger()
    return resultats.some((r) => r.error) ? 'Une partie des achats n’a pas été enregistrée.' : null
  }, [produits, articles, recharger])

  const ajouterProduit = useCallback(
    async (nom, rayonChoisi) => {
      if (produits.some((p) => normaliser(p.nom) === normaliser(nom))) {
        return `« ${nom.trim()} » est déjà dans le stock.`
      }
      const { error } = await supabase
        .from('produits')
        .insert({ espace_id: espace.id, nom: nom.trim(), rayon: rayonChoisi })
      await recharger()
      return error ? "Le produit n'a pas pu être ajouté." : null
    },
    [produits, espace.id, recharger]
  )

  const modifierProduit = useCallback(
    async (id, modifications) => {
      const { error } = await supabase.from('produits').update(modifications).eq('id', id)
      await recharger()
      return error ? "Le produit n'a pas pu être modifié." : null
    },
    [recharger]
  )

  const supprimerProduit = useCallback(
    async (id) => {
      const { error } = await supabase.from('produits').delete().eq('id', id)
      await recharger()
      return error ? "Le produit n'a pas pu être supprimé." : null
    },
    [recharger]
  )

  return {
    produits,
    articles,
    chargement,
    erreur,
    changerEtat,
    basculerPanier,
    ajouterALaListe,
    retirerDeLaListe,
    terminerCourses,
    ajouterProduit,
    modifierProduit,
    supprimerProduit,
  }
}
