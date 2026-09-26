// Actions déclenchées depuis les boutons du récap par email (api/action.js).
// Le jeton (jetons.js) a déjà été vérifié : il dit qui (u), dans quel
// espace (e), quoi (a) et sur quoi (c). On revérifie ici que la personne est
// toujours membre, et chaque requête est bornée à l'espace du jeton.
// Renvoie { ok, titre, message }.
import {
  decalerJours,
  joursDeLaSemaine,
  libelleJour,
  lundiDe,
  tirerDiners,
} from '../../src/features/menus/tirage.js'
import { libelleMois } from '../../src/features/charge/calculs.js'

const DOUBLON = '23505'

async function estMembre(admin, espaceId, userId) {
  const { data, error } = await admin
    .from('membres_espace')
    .select('user_id')
    .eq('espace_id', espaceId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  return data.length > 0
}

async function prendreCharge(admin, { u, e, c, m }) {
  const { data: charges } = await admin.from('charges').select('nom').eq('id', c).eq('espace_id', e)
  if (!charges?.length) return { ok: false, titre: 'Charge introuvable', message: 'Elle a peut-être été supprimée.' }
  const nom = charges[0].nom

  const { error } = await admin
    .from('attributions')
    .insert({ charge_id: c, mois: m, espace_id: e, user_id: u })
  if (!error) {
    return { ok: true, titre: 'C’est noté ✓', message: `Tu gères « ${nom} » en ${libelleMois(m).toLowerCase()}.` }
  }
  if (error.code !== DOUBLON) throw new Error(error.message)

  const { data: attribution } = await admin
    .from('attributions')
    .select('user_id, profils (prenom)')
    .eq('charge_id', c)
    .eq('mois', m)
  const owner = attribution?.[0]
  if (owner?.user_id === u) return { ok: true, titre: 'Déjà à toi ✓', message: `Tu gères déjà « ${nom} ».` }
  return {
    ok: false,
    titre: 'Trop tard',
    message: `« ${nom} » a déjà été prise${owner?.profils?.prenom ? ` par ${owner.profils.prenom}` : ''}.`,
  }
}

async function marquerAchete(admin, { e, c, t }) {
  if (t === 'p') {
    const { data, error } = await admin
      .from('produits')
      .update({ etat: 'ok', dans_panier: false, quantite: null, updated_at: new Date().toISOString() })
      .eq('id', c)
      .eq('espace_id', e)
      .neq('etat', 'ok')
      .select('nom')
    if (error) throw new Error(error.message)
    return data.length
      ? { ok: true, titre: 'Acheté ✓', message: `« ${data[0].nom} » est de nouveau en stock.` }
      : { ok: true, titre: 'Déjà fait ✓', message: 'Ce produit n’est plus sur la liste.' }
  }
  const { data, error } = await admin
    .from('articles_courses')
    .delete()
    .eq('id', c)
    .eq('espace_id', e)
    .select('nom')
  if (error) throw new Error(error.message)
  return data.length
    ? { ok: true, titre: 'Acheté ✓', message: `« ${data[0].nom} » est retiré de la liste.` }
    : { ok: true, titre: 'Déjà fait ✓', message: 'Cet article n’est plus sur la liste.' }
}

async function autrePlat(admin, { e, c: jour }) {
  const lundi = lundiDe(new Date(`${jour}T12:00:00`))
  const jours = joursDeLaSemaine(lundi)
  const [{ data: plats }, { data: diners }, { data: precedents }, { data: reglages }] = await Promise.all([
    admin.from('plats').select('id, nom, categorie, rapide').eq('espace_id', e),
    admin.from('diners').select('jour, plat_id, verrouille').eq('espace_id', e).gte('jour', jours[0]).lte('jour', jours[6]),
    admin.from('diners').select('plat_id').eq('espace_id', e).gte('jour', decalerJours(lundi, -7)).lt('jour', lundi),
    admin.from('reglages_menus').select('*').eq('espace_id', e),
  ])
  const actuel = diners.find((d) => d.jour === jour)
  if (actuel?.verrouille) {
    return { ok: false, titre: 'Soir verrouillé 🔒', message: `${libelleJour(jour)} a été choisi à la main : déverrouille-le dans Nido pour le changer.` }
  }

  const parId = new Map(plats.map((p) => [p.id, p]))
  const ancien = parId.get(actuel?.plat_id)
  const r = reglages[0] ?? {}
  const { choix } = tirerDiners({
    plats: plats.filter((p) => p.id !== actuel?.plat_id),
    joursATirer: [jour],
    fixes: diners.filter((d) => d.jour !== jour && parId.has(d.plat_id)).map((d) => parId.get(d.plat_id)),
    semainePrecedente: precedents.map((d) => d.plat_id).filter(Boolean),
    reglages: {
      pasSemainePrecedente: r.pas_semaine_precedente ?? true,
      rapideEnSemaine: r.rapide_en_semaine ?? true,
      maxParCategorie: r.max_par_categorie ?? 2,
    },
  })
  const nouveau = choix[jour]
  if (!nouveau) return { ok: false, titre: 'Pas d’autre plat', message: 'Ajoute des plats dans la bibliothèque de Nido.' }

  const { error } = await admin.from('diners').upsert(
    { espace_id: e, jour, plat_id: nouveau.id, texte: null, verrouille: false, updated_at: new Date().toISOString() },
    { onConflict: 'espace_id,jour' }
  )
  if (error) throw new Error(error.message)
  return {
    ok: true,
    titre: 'Nouveau plat 🎲',
    message: `${libelleJour(jour)} : ${nouveau.nom}${ancien ? ` (au lieu de ${ancien.nom})` : ''}.`,
  }
}

const ACTIONS = { prendre: prendreCharge, achete: marquerAchete, autre: autrePlat }

export async function executerAction(admin, contenu) {
  const action = ACTIONS[contenu.a]
  if (!action) return { ok: false, titre: 'Action inconnue', message: 'Ce lien n’est pas valide.' }
  if (!(await estMembre(admin, contenu.e, contenu.u))) {
    return { ok: false, titre: 'Accès refusé', message: 'Tu ne fais plus partie de cet espace.' }
  }
  return action(admin, contenu)
}
