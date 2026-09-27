import { useCallback, useEffect, useMemo, useState } from 'react'
import { signalerActivite } from '../../lib/activite'
import { supabase } from '../../lib/supabase'
import { useTempsReel } from '../../lib/useTempsReel'
import { useEspace } from '../espace/contexte'
import { normaliser } from '../courses/liste'
import { decalerJours, ingredientsDe, joursDeLaSemaine, tirerDiners } from './tirage'

const REGLAGES_PAR_DEFAUT = {
  pas_semaine_precedente: true,
  max_par_categorie: 2,
  rapide_en_semaine: true,
}

// Plats de l'espace, dîners de la semaine du `lundi` donné, et règles du
// tirage. Les actions renvoient null si tout va bien, sinon un message.
export function useMenus(lundi) {
  const { espace } = useEspace()
  const [plats, setPlats] = useState([])
  const [diners, setDiners] = useState([])
  const [semainePrecedente, setSemainePrecedente] = useState([])
  const [reglages, setReglages] = useState(REGLAGES_PAR_DEFAUT)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  const jours = useMemo(() => joursDeLaSemaine(lundi), [lundi])
  const dimanche = jours[6]

  const chargerPlats = useCallback(async () => {
    const { data, error } = await supabase.from('plats').select('*').eq('espace_id', espace.id)
    if (error) setErreur('Impossible de charger les menus. La migration 0006 a-t-elle été exécutée ?')
    else setPlats(data.sort((a, b) => a.nom.localeCompare(b.nom, 'fr')))
  }, [espace.id])

  const chargerDiners = useCallback(async () => {
    const [semaine, precedente] = await Promise.all([
      supabase
        .from('diners')
        .select('*')
        .eq('espace_id', espace.id)
        .gte('jour', lundi)
        .lte('jour', dimanche),
      supabase
        .from('diners')
        .select('plat_id')
        .eq('espace_id', espace.id)
        .gte('jour', decalerJours(lundi, -7))
        .lt('jour', lundi),
    ])
    if (!semaine.error) setDiners(semaine.data)
    if (!precedente.error) setSemainePrecedente(precedente.data.map((d) => d.plat_id).filter(Boolean))
  }, [espace.id, lundi, dimanche])

  const chargerReglages = useCallback(async () => {
    const { data } = await supabase
      .from('reglages_menus')
      .select('*')
      .eq('espace_id', espace.id)
      .maybeSingle()
    if (data) setReglages(data)
  }, [espace.id])

  useEffect(() => {
    Promise.all([chargerPlats(), chargerDiners(), chargerReglages()]).then(() => setChargement(false))
  }, [chargerPlats, chargerDiners, chargerReglages])

  useTempsReel(['diners'], espace.id, chargerDiners)

  // { [jour]: { jour, plat, texte, verrouille } } pour les 7 jours
  const semaine = useMemo(() => {
    const platsParId = new Map(plats.map((p) => [p.id, p]))
    const parJour = new Map(diners.map((d) => [d.jour, d]))
    return Object.fromEntries(
      jours.map((jour) => {
        const d = parJour.get(jour)
        return [
          jour,
          {
            jour,
            plat: d?.plat_id ? platsParId.get(d.plat_id) ?? null : null,
            texte: d?.texte ?? null,
            verrouille: d?.verrouille ?? false,
          },
        ]
      })
    )
  }, [jours, diners, plats])

  const enregistrerJours = useCallback(
    async (lignes) => {
      const { error } = await supabase.from('diners').upsert(
        lignes.map((l) => ({ espace_id: espace.id, updated_at: new Date().toISOString(), ...l })),
        { onConflict: 'espace_id,jour' }
      )
      if (!error) signalerActivite(espace.id)
      await chargerDiners()
      return error ? "Le menu n'a pas pu être enregistré." : null
    },
    [espace.id, chargerDiners]
  )

  // Un choix fait à la main verrouille le soir (le tirage n'y touche plus) ;
  // vider le soir le déverrouille
  const choisir = useCallback(
    (jour, { platId = null, texte = null }) =>
      enregistrerJours([{ jour, plat_id: platId, texte, verrouille: Boolean(platId || texte) }]),
    [enregistrerJours]
  )

  const basculerVerrou = useCallback(
    (jour) => {
      const j = semaine[jour]
      return enregistrerJours([
        { jour, plat_id: j.plat?.id ?? null, texte: j.texte, verrouille: !j.verrouille },
      ])
    },
    [enregistrerJours, semaine]
  )

  // Tire au sort les jours donnés (les jours verrouillés sont toujours
  // ignorés). Renvoie { message, assouplies }.
  const tirer = useCallback(
    async (joursDemandes) => {
      const aTirer = joursDemandes.filter((j) => !semaine[j].verrouille)
      if (aTirer.length === 0) return { message: 'Rien à tirer : ces jours sont verrouillés.' }
      if (plats.length === 0) return { message: 'Ajoute des plats dans la bibliothèque.' }

      const fixes = jours
        .filter((j) => !aTirer.includes(j) && semaine[j].plat)
        .map((j) => semaine[j].plat)
      const { choix, assouplies } = tirerDiners({
        plats,
        joursATirer: aTirer,
        fixes,
        semainePrecedente,
        reglages: {
          pasSemainePrecedente: reglages.pas_semaine_precedente,
          rapideEnSemaine: reglages.rapide_en_semaine,
          maxParCategorie: reglages.max_par_categorie,
        },
      })
      const message = await enregistrerJours(
        Object.entries(choix).map(([jour, plat]) => ({
          jour,
          plat_id: plat.id,
          texte: null,
          verrouille: false,
        }))
      )
      return { message, assouplies }
    },
    [jours, semaine, plats, semainePrecedente, reglages, enregistrerJours]
  )

  const modifierReglages = useCallback(
    async (modifications) => {
      setReglages((r) => ({ ...r, ...modifications }))
      const { error } = await supabase
        .from('reglages_menus')
        .update(modifications)
        .eq('espace_id', espace.id)
      if (error) await chargerReglages()
      return error ? "Les réglages n'ont pas pu être enregistrés." : null
    },
    [espace.id, chargerReglages]
  )

  const enregistrerPlat = useCallback(
    async (id, plat) => {
      const requete = id
        ? supabase.from('plats').update(plat).eq('id', id)
        : supabase.from('plats').insert({ espace_id: espace.id, ...plat })
      const { error } = await requete
      await chargerPlats()
      return error ? "Le plat n'a pas pu être enregistré." : null
    },
    [espace.id, chargerPlats]
  )

  const supprimerPlat = useCallback(
    async (id) => {
      const { error } = await supabase.from('plats').delete().eq('id', id)
      await Promise.all([chargerPlats(), chargerDiners()])
      return error ? "Le plat n'a pas pu être supprimé." : null
    },
    [chargerPlats, chargerDiners]
  )

  // Ingrédients des dîners de la semaine, comparés au stock et à la liste :
  // [{ nom, statut: 'manquant' | 'en-stock' | 'sur-la-liste' }]
  const analyserIngredients = useCallback(async () => {
    const platsSemaine = jours.map((j) => semaine[j].plat).filter(Boolean)
    const noms = ingredientsDe(platsSemaine, normaliser)
    const [produits, articles] = await Promise.all([
      supabase.from('produits').select('nom, etat').eq('espace_id', espace.id),
      supabase.from('articles_courses').select('nom').eq('espace_id', espace.id),
    ])
    const etatProduit = new Map((produits.data ?? []).map((p) => [normaliser(p.nom), p.etat]))
    const surLaListe = new Set((articles.data ?? []).map((a) => normaliser(a.nom)))
    return noms.map((nom) => {
      const cle = normaliser(nom)
      const etat = etatProduit.get(cle)
      if (surLaListe.has(cle) || etat === 'fini' || etat === 'bientot') return { nom, statut: 'sur-la-liste' }
      if (etat === 'ok') return { nom, statut: 'en-stock' }
      return { nom, statut: 'manquant' }
    })
  }, [jours, semaine, espace.id])

  // Met les ingrédients choisis sur la liste de courses : un produit du stock
  // passe à « fini », les autres deviennent des articles ponctuels
  const ajouterAuxCourses = useCallback(
    async (noms) => {
      const { data: produits } = await supabase
        .from('produits')
        .select('id, nom')
        .eq('espace_id', espace.id)
      const parNom = new Map((produits ?? []).map((p) => [normaliser(p.nom), p.id]))
      const ids = noms.map((n) => parNom.get(normaliser(n))).filter(Boolean)
      const ponctuels = noms.filter((n) => !parNom.has(normaliser(n)))

      const resultats = await Promise.all([
        ids.length
          ? supabase
              .from('produits')
              .update({ etat: 'fini', updated_at: new Date().toISOString() })
              .in('id', ids)
          : { error: null },
        ponctuels.length
          ? supabase
              .from('articles_courses')
              .insert(ponctuels.map((nom) => ({ espace_id: espace.id, nom })))
          : { error: null },
      ])
      signalerActivite(espace.id)
      return resultats.some((r) => r.error) ? "Une partie des ingrédients n'a pas été ajoutée." : null
    },
    [espace.id]
  )

  return {
    plats,
    jours,
    semaine,
    reglages,
    chargement,
    erreur,
    choisir,
    basculerVerrou,
    tirer,
    modifierReglages,
    enregistrerPlat,
    supprimerPlat,
    analyserIngredients,
    ajouterAuxCourses,
  }
}
