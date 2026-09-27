import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/contexte'
import { useEspace } from '../espace/contexte'
import { CoffreContexte } from './contexte'
import {
  chiffrerEntree,
  dechiffrerEntree,
  deriverClePrf,
  desenvelopperCle,
  envelopperAvecPhrase,
  envelopperCle,
  ouvrirCoffre,
  preparerCoffre,
} from './crypto'
import {
  authentifier,
  creerPasskey,
  ErreurBiometrie,
  libelleAppareil,
  memoriserPasskeyLocale,
  oublierPasskeyLocale,
  passkeysLocales,
} from './biometrie'

// Verrouillage automatique sans interaction. Plus court quand Face ID est
// activé : le rouvrir ne coûte qu'un regard.
const DELAI_VERROUILLAGE_MS = 5 * 60 * 1000
const DELAI_VERROUILLAGE_BIOMETRIE_MS = 60 * 1000
// Import CSV : nombre d'entrées chiffrées et envoyées à la fois
const TAILLE_LOT = 25

// Monté au niveau de l'espace (et remonté à chaque changement d'espace) :
// la clé survit à la navigation entre onglets, mais uniquement en mémoire —
// recharger la page ou rester inactif verrouille le coffre.
export default function CoffreProvider({ children }) {
  const { utilisateur } = useAuth()
  const { espace, profil } = useEspace()
  // undefined = pas encore chargé, null = pas de coffre dans cet espace
  const [coffre, setCoffre] = useState(undefined)
  const [cle, setCle] = useState(null)
  const [entrees, setEntrees] = useState([])
  // Appareils de l'utilisateur courant avec Face ID activé pour ce coffre
  const [appareils, setAppareils] = useState([])
  // Relu à chaque activation / retrait (localStorage n'est pas réactif)
  const [locales, setLocales] = useState(() => passkeysLocales(espace.id))
  const [erreur, setErreur] = useState('')
  const derniereActivite = useRef(0)

  // Appareils enregistrés, marqués `ici` s'ils ont été activés sur celui-ci
  const appareilsMarques = useMemo(
    () => appareils.map((a) => ({ ...a, ici: locales.includes(a.credential_id) })),
    [appareils, locales]
  )
  const appareilsIci = useMemo(() => appareilsMarques.filter((a) => a.ici), [appareilsMarques])

  const verrouiller = useCallback(() => {
    setCle(null)
    setEntrees([])
  }, [])

  const chargerAppareils = useCallback(async () => {
    const { data, error } = await supabase
      .from('cles_appareils')
      .select('*')
      .eq('espace_id', espace.id)
      .eq('user_id', utilisateur.id)
      .order('created_at', { ascending: true })
    if (!error) setAppareils(data)
    return error ? [] : data
  }, [espace.id, utilisateur.id])

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
    if (data) await chargerAppareils()
    else setAppareils([])
    return data
  }, [espace.id, chargerAppareils])

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

  const ouvrirAvecCle = useCallback(
    async (cleMaitresse) => {
      derniereActivite.current = Date.now()
      setCle(cleMaitresse)
      await chargerEntrees(cleMaitresse)
    },
    [chargerEntrees]
  )

  const creer = useCallback(
    async (phrase) => {
      const { cle: nouvelleCle, parametres } = await preparerCoffre(phrase, espace.id)
      const { error } = await supabase
        .from('coffres')
        .insert({ espace_id: espace.id, ...parametres })
      // En cas d'échec, un autre membre a créé le coffre entretemps
      const cree = await chargerCoffre()
      if (error || !cree) return false
      await ouvrirAvecCle(nouvelleCle)
      return true
    },
    [espace.id, chargerCoffre, ouvrirAvecCle]
  )

  const deverrouiller = useCallback(
    async (phrase) => {
      // Relit l'enveloppe : la phrase a pu être changée par un autre membre
      const courant = await chargerCoffre()
      if (!courant) return false
      const cleTrouvee = await ouvrirCoffre(phrase, espace.id, courant)
      if (!cleTrouvee) return false
      await ouvrirAvecCle(cleTrouvee)
      return true
    },
    [espace.id, chargerCoffre, ouvrirAvecCle]
  )

  // Renvoie null si le coffre est ouvert, sinon un message d'erreur
  const deverrouillerBiometrie = useCallback(async () => {
    try {
      const { appareil, secret } = await authentifier(appareilsIci)
      const cleMaitresse = await desenvelopperCle(await deriverClePrf(secret), espace.id, appareil)
      secret.fill(0)
      await ouvrirAvecCle(cleMaitresse)
      return null
    } catch (e) {
      return e instanceof ErreurBiometrie
        ? e.message
        : "L'enveloppe de cet appareil est invalide : retire-le et réactive-le."
    }
  }, [appareilsIci, espace.id, ouvrirAvecCle])

  // Crée une passkey sur cet appareil et y enveloppe la clé du coffre ouvert.
  // Renvoie null si tout va bien, sinon un message d'erreur.
  const activerBiometrie = useCallback(async () => {
    try {
      const { credentialId, prfSel, secret } = await creerPasskey({ utilisateur, profil, espace })
      const enveloppe = await envelopperCle(await deriverClePrf(secret), espace.id, cle)
      secret.fill(0)
      const { error } = await supabase.from('cles_appareils').insert({
        espace_id: espace.id,
        user_id: utilisateur.id,
        credential_id: credentialId,
        prf_sel: prfSel,
        libelle: libelleAppareil(),
        ...enveloppe,
      })
      if (error) return "L'activation n'a pas pu être enregistrée."
      memoriserPasskeyLocale(espace.id, credentialId)
      setLocales(passkeysLocales(espace.id))
      await chargerAppareils()
      return null
    } catch (e) {
      return e instanceof ErreurBiometrie ? e.message : "L'activation a échoué."
    }
  }, [utilisateur, profil, espace, cle, chargerAppareils])

  const retirerAppareil = useCallback(
    async (appareil) => {
      const { error } = await supabase.from('cles_appareils').delete().eq('id', appareil.id)
      if (error) return false
      oublierPasskeyLocale(espace.id, appareil.credential_id)
      setLocales(passkeysLocales(espace.id))
      setAppareils((liste) => liste.filter((a) => a.id !== appareil.id))
      return true
    },
    [espace.id]
  )

  // Si le coffre a été réinitialisé (puis recréé) depuis l'ouverture, notre
  // clé est périmée : écrire avec rendrait les entrées illisibles. Renvoie
  // un message d'erreur dans ce cas, sinon null.
  const verifierCleAJour = useCallback(async () => {
    const { data: actuel } = await supabase
      .from('coffres')
      .select('created_at')
      .eq('espace_id', espace.id)
      .maybeSingle()
    if (actuel && actuel.created_at === coffre?.created_at) return null
    verrouiller()
    await chargerCoffre()
    return 'Le coffre a été réinitialisé entretemps : rouvre-le.'
  }, [coffre, espace.id, verrouiller, chargerCoffre])

  // Renvoie null si tout va bien, sinon un message d'erreur
  const enregistrer = useCallback(
    async (id, contenu) => {
      const perimee = await verifierCleAJour()
      if (perimee) return perimee

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
    [cle, espace.id, verifierCleAJour, chargerEntrees]
  )

  // Import d'un fichier CSV : chaque entrée est chiffrée ici, puis envoyée
  // par lots. surProgression(nombreEnregistrees) après chaque lot.
  // Renvoie { importees, erreur }.
  const importer = useCallback(
    async (contenus, surProgression) => {
      const perimee = await verifierCleAJour()
      if (perimee) return { importees: 0, erreur: perimee }
      let importees = 0
      for (let i = 0; i < contenus.length; i += TAILLE_LOT) {
        const lignes = await Promise.all(
          contenus.slice(i, i + TAILLE_LOT).map(async (c) => ({ espace_id: espace.id, ...(await chiffrerEntree(cle, espace.id, c)) }))
        )
        const { error } = await supabase.from('entrees_coffre').insert(lignes)
        if (error) {
          await chargerEntrees(cle)
          return { importees, erreur: `L'import s'est arrêté après ${importees} entrée${importees > 1 ? 's' : ''}. Réessaie avec le même fichier : les entrées déjà importées seront repérées comme doublons.` }
        }
        importees += lignes.length
        surProgression?.(importees)
      }
      await chargerEntrees(cle)
      return { importees, erreur: null }
    },
    [cle, espace.id, verifierCleAJour, chargerEntrees]
  )

  const supprimer = useCallback(async (id) => {
    const { error } = await supabase.from('entrees_coffre').delete().eq('id', id)
    if (error) return false
    setEntrees((liste) => liste.filter((e) => e.id !== id))
    return true
  }, [])

  // Seule l'enveloppe « phrase » change : les entrées et les appareils
  // Face ID restent valides (la clé maîtresse est la même)
  const changerPhrase = useCallback(
    async (nouvellePhrase) => {
      const parametres = await envelopperAvecPhrase(cle, nouvellePhrase, espace.id)
      const { data, error } = await supabase
        .from('coffres')
        .update({ ...parametres, updated_at: new Date().toISOString() })
        .eq('espace_id', espace.id)
        .select('espace_id')
      if (error || data.length !== 1) return "Le changement a échoué, rien n'a été modifié."
      await chargerCoffre()
      return null
    },
    [cle, espace.id, chargerCoffre]
  )

  // Efface le coffre, ses entrées et les appareils activés (phrase oubliée).
  // Admin uniquement.
  const reinitialiser = useCallback(async () => {
    const { error } = await supabase.from('coffres').delete().eq('espace_id', espace.id)
    if (error) return false
    verrouiller()
    await chargerCoffre()
    return true
  }, [espace.id, verrouiller, chargerCoffre])

  // Verrouillage automatique : toute interaction repousse l'échéance ; au
  // retour sur un onglet resté caché trop longtemps, on verrouille aussitôt
  const delaiVerrouillage =
    appareilsIci.length > 0 ? DELAI_VERROUILLAGE_BIOMETRIE_MS : DELAI_VERROUILLAGE_MS
  useEffect(() => {
    if (!cle) return
    const marquer = () => {
      derniereActivite.current = Date.now()
    }
    const verifier = () => {
      if (Date.now() - derniereActivite.current > delaiVerrouillage) verrouiller()
    }
    const intervalle = setInterval(verifier, 5_000)
    window.addEventListener('pointerdown', marquer)
    window.addEventListener('keydown', marquer)
    document.addEventListener('visibilitychange', verifier)
    return () => {
      clearInterval(intervalle)
      window.removeEventListener('pointerdown', marquer)
      window.removeEventListener('keydown', marquer)
      document.removeEventListener('visibilitychange', verifier)
    }
  }, [cle, delaiVerrouillage, verrouiller])

  const valeur = useMemo(
    () => ({
      coffre,
      ouvert: Boolean(cle),
      entrees,
      appareils: appareilsMarques,
      biometrieIci: appareilsIci.length > 0,
      delaiVerrouillage,
      erreur,
      chargerCoffre,
      creer,
      deverrouiller,
      deverrouillerBiometrie,
      activerBiometrie,
      retirerAppareil,
      verrouiller,
      enregistrer,
      importer,
      supprimer,
      changerPhrase,
      reinitialiser,
    }),
    [
      coffre,
      cle,
      entrees,
      appareilsMarques,
      appareilsIci,
      delaiVerrouillage,
      erreur,
      chargerCoffre,
      creer,
      deverrouiller,
      deverrouillerBiometrie,
      activerBiometrie,
      retirerAppareil,
      verrouiller,
      enregistrer,
      importer,
      supprimer,
      changerPhrase,
      reinitialiser,
    ]
  )

  return <CoffreContexte.Provider value={valeur}>{children}</CoffreContexte.Provider>
}
