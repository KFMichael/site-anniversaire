import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useEspace } from '../espace/contexte'
import { CoffreContexte } from './contexte'
import {
  chiffrerEntree,
  dechiffrerEntree,
  ouvrirCoffre,
  preparerCoffre,
} from './crypto'

// Verrouillage automatique après 5 min sans interaction
const DELAI_VERROUILLAGE_MS = 5 * 60 * 1000

// Monté au niveau de l'espace (et remonté à chaque changement d'espace) :
// la clé survit à la navigation entre onglets, mais uniquement en mémoire —
// recharger la page ou attendre 5 min verrouille le coffre.
export default function CoffreProvider({ children }) {
  const { espace } = useEspace()
  // undefined = pas encore chargé, null = pas de coffre dans cet espace
  const [coffre, setCoffre] = useState(undefined)
  const [cle, setCle] = useState(null)
  const [entrees, setEntrees] = useState([])
  const [erreur, setErreur] = useState('')
  const derniereActivite = useRef(0)

  const verrouiller = useCallback(() => {
    setCle(null)
    setEntrees([])
  }, [])

  const chargerCoffre = useCallback(async () => {
    const { data, error } = await supabase
      .from('coffres')
      .select('*')
      .eq('espace_id', espace.id)
      .maybeSingle()
    if (error) {
      setErreur('Impossible de charger le coffre.')
      return null
    }
    setErreur('')
    setCoffre(data)
    return data
  }, [espace.id])

  const chargerEntrees = useCallback(
    async (cleCourante) => {
      const { data, error } = await supabase
        .from('entrees_coffre')
        .select('id, iv, chiffre, updated_at')
        .eq('espace_id', espace.id)
      if (error) {
        setErreur('Impossible de charger les entrées.')
        return
      }
      const dechiffrees = await Promise.all(
        data.map(async (ligne) => {
          try {
            const contenu = await dechiffrerEntree(cleCourante, espace.id, ligne)
            return { ...contenu, id: ligne.id, updated_at: ligne.updated_at }
          } catch {
            return { id: ligne.id, illisible: true, nom: 'Entrée illisible' }
          }
        })
      )
      dechiffrees.sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }))
      setEntrees(dechiffrees)
    },
    [espace.id]
  )

  const creer = useCallback(
    async (phrase) => {
      const { cle: nouvelleCle, parametres } = await preparerCoffre(phrase, espace.id)
      const { error } = await supabase
        .from('coffres')
        .insert({ espace_id: espace.id, ...parametres })
      if (error) {
        // Un autre membre a créé le coffre entretemps : on recharge
        await chargerCoffre()
        return false
      }
      await chargerCoffre()
      setCle(nouvelleCle)
      setEntrees([])
      return true
    },
    [espace.id, chargerCoffre]
  )

  const deverrouiller = useCallback(
    async (phrase) => {
      // Relit les paramètres : la phrase a pu être changée par l'autre membre
      const courant = await chargerCoffre()
      if (!courant) return false
      const cleTrouvee = await ouvrirCoffre(phrase, espace.id, courant)
      if (!cleTrouvee) return false
      derniereActivite.current = Date.now()
      setCle(cleTrouvee)
      await chargerEntrees(cleTrouvee)
      return true
    },
    [espace.id, chargerCoffre, chargerEntrees]
  )

  // Renvoie null si tout va bien, sinon un message d'erreur
  const enregistrer = useCallback(
    async (id, contenu) => {
      // Si la phrase a été changée par un autre membre depuis l'ouverture,
      // notre clé est périmée : écrire avec rendrait l'entrée illisible
      const { data: actuel } = await supabase
        .from('coffres')
        .select('updated_at')
        .eq('espace_id', espace.id)
        .maybeSingle()
      if (!actuel || actuel.updated_at !== coffre?.updated_at) {
        verrouiller()
        await chargerCoffre()
        return 'La phrase secrète a changé : déverrouille à nouveau le coffre.'
      }

      const ligne = await chiffrerEntree(cle, espace.id, contenu)
      const requete = id
        ? supabase
            .from('entrees_coffre')
            .update({ ...ligne, updated_at: new Date().toISOString() })
            .eq('id', id)
        : supabase.from('entrees_coffre').insert({ espace_id: espace.id, ...ligne })
      const { error } = await requete
      if (error) return "L'enregistrement a échoué."
      await chargerEntrees(cle)
      return null
    },
    [cle, coffre, espace.id, verrouiller, chargerCoffre, chargerEntrees]
  )

  const supprimer = useCallback(
    async (id) => {
      const { error } = await supabase.from('entrees_coffre').delete().eq('id', id)
      if (error) return false
      setEntrees((liste) => liste.filter((e) => e.id !== id))
      return true
    },
    []
  )

  // Rechiffre toutes les entrées avec une clé dérivée de la nouvelle phrase,
  // puis remplace tout en une transaction (RPC changer_phrase_coffre)
  const changerPhrase = useCallback(
    async (nouvellePhrase) => {
      const { data, error } = await supabase
        .from('entrees_coffre')
        .select('id, iv, chiffre')
        .eq('espace_id', espace.id)
      if (error) return "Impossible de lire le coffre."

      const { cle: nouvelleCle, parametres } = await preparerCoffre(nouvellePhrase, espace.id)
      let rechiffrees
      try {
        rechiffrees = await Promise.all(
          data.map(async (ligne) => {
            const contenu = await dechiffrerEntree(cle, espace.id, ligne)
            return { id: ligne.id, ...(await chiffrerEntree(nouvelleCle, espace.id, contenu)) }
          })
        )
      } catch {
        return 'Une entrée illisible empêche le changement : supprime-la avant.'
      }

      const { error: erreurRpc } = await supabase.rpc('changer_phrase_coffre', {
        p_espace_id: espace.id,
        p_sel: parametres.sel,
        p_iterations: parametres.iterations,
        p_verificateur_iv: parametres.verificateur_iv,
        p_verificateur: parametres.verificateur,
        p_entrees: rechiffrees,
      })
      if (erreurRpc) return "Le changement a échoué, rien n'a été modifié. Réessaie."

      await chargerCoffre()
      setCle(nouvelleCle)
      await chargerEntrees(nouvelleCle)
      return null
    },
    [cle, espace.id, chargerCoffre, chargerEntrees]
  )

  // Efface le coffre et toutes ses entrées (phrase oubliée). Admin uniquement.
  const reinitialiser = useCallback(async () => {
    const { error } = await supabase.from('coffres').delete().eq('espace_id', espace.id)
    if (error) return false
    verrouiller()
    await chargerCoffre()
    return true
  }, [espace.id, verrouiller, chargerCoffre])

  // Verrouillage automatique : toute interaction repousse l'échéance ; au
  // retour sur un onglet resté caché trop longtemps, on verrouille aussitôt
  useEffect(() => {
    if (!cle) return
    const marquer = () => {
      derniereActivite.current = Date.now()
    }
    const verifier = () => {
      if (Date.now() - derniereActivite.current > DELAI_VERROUILLAGE_MS) verrouiller()
    }
    const intervalle = setInterval(verifier, 15_000)
    window.addEventListener('pointerdown', marquer)
    window.addEventListener('keydown', marquer)
    document.addEventListener('visibilitychange', verifier)
    return () => {
      clearInterval(intervalle)
      window.removeEventListener('pointerdown', marquer)
      window.removeEventListener('keydown', marquer)
      document.removeEventListener('visibilitychange', verifier)
    }
  }, [cle, verrouiller])

  const valeur = useMemo(
    () => ({
      coffre,
      ouvert: Boolean(cle),
      entrees,
      erreur,
      chargerCoffre,
      creer,
      deverrouiller,
      verrouiller,
      enregistrer,
      supprimer,
      changerPhrase,
      reinitialiser,
    }),
    [coffre, cle, entrees, erreur, chargerCoffre, creer, deverrouiller, verrouiller, enregistrer, supprimer, changerPhrase, reinitialiser]
  )

  return <CoffreContexte.Provider value={valeur}>{children}</CoffreContexte.Provider>
}
