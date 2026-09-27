// Notifications des actions des autres membres (« Léa a ajouté lait à la
// liste »). Les événements sont notés par des déclencheurs SQL (migration
// 0011) ; cette fonction, appelée par l'appli juste après une action, les
// regroupe par auteur et par type et les envoie aux autres membres.
// Indépendant de Vercel et de web-push (l'envoi est passé en paramètre) :
// testé par activite.test.js.
import { normaliser } from '../../src/features/courses/liste.js'
import { envoyerAuMembre } from './notifications.js'

// Au-delà, un événement n'est plus « en temps réel » : il est écarté
const FRAICHEUR_MS = 2 * 3600 * 1000
// Journal gardé 30 jours (pour une future page d'activité)
const CONSERVATION_MS = 30 * 24 * 3600 * 1000

// « lait », « lait et pain », « lait, pain et œufs », « lait, pain, œufs et 2 autres »
export function enumerer(noms, max = 3) {
  if (noms.length <= 1) return noms.join('')
  if (noms.length <= max) return `${noms.slice(0, -1).join(', ')} et ${noms.at(-1)}`
  const reste = noms.length - max
  return `${noms.slice(0, max).join(', ')} et ${reste} autre${reste > 1 ? 's' : ''}`
}

// Noms sans doublon, dans l'ordre des événements
function libelles(evenements) {
  const vus = new Map()
  for (const e of evenements) if (!vus.has(normaliser(e.libelle))) vus.set(normaliser(e.libelle), e.libelle)
  return [...vus.values()]
}

const TEXTES = {
  ajout_liste: (prenom, noms) => ({
    titre: '🛒 Liste de courses',
    corps: `${prenom} a ajouté ${enumerer(noms)}`,
    url: '/courses',
  }),
  courses_faites: (prenom, noms) => ({
    titre: '✅ Courses faites',
    corps: `${prenom} a acheté ${enumerer(noms)}`,
    url: '/courses',
  }),
  charge_prise: (prenom, noms) => ({
    titre: '🧠 Charge mentale',
    corps: noms.length === 1 ? `${prenom} prend « ${noms[0]} »` : `${prenom} prend ${noms.length} charges : ${enumerer(noms)}`,
    url: '/charge',
  }),
  // libellés « Films à voir › Dune »
  ajout_liste_partagee: (prenom, libelles) => {
    const elements = libelles.map((l) => {
      const [liste, ...texte] = l.split(' › ')
      return { liste, texte: texte.join(' › ') || liste }
    })
    const listes = [...new Set(elements.map((e) => e.liste))]
    return listes.length === 1
      ? { titre: `📝 ${listes[0]}`, corps: `${prenom} a ajouté ${enumerer(elements.map((e) => e.texte))}`, url: '/listes' }
      : { titre: '📝 Listes', corps: `${prenom} a ajouté ${enumerer(elements.map((e) => `${e.texte} (${e.liste})`))}`, url: '/listes' }
  },
  diner: (prenom, noms) => ({
    titre: '🍽️ Menus',
    corps: `${prenom} a prévu ${enumerer(noms)}`,
    url: '/menus',
  }),
}

// Une notification par auteur et par type, dans l'ordre des événements
export function resumerActivite(evenements, prenoms) {
  const groupes = new Map()
  for (const e of evenements) {
    const cle = `${e.auteur}|${e.type}`
    if (!groupes.has(cle)) groupes.set(cle, { auteur: e.auteur, type: e.type, evenements: [] })
    groupes.get(cle).evenements.push(e)
  }
  return [...groupes.values()]
    .filter((g) => TEXTES[g.type])
    .map((g) => ({
      auteur: g.auteur,
      notification: TEXTES[g.type](prenoms.get(g.auteur) || 'Quelqu’un', libelles(g.evenements)),
    }))
}

// Un article ajouté puis retiré (ou déjà acheté) avant l'envoi n'est pas
// annoncé : on ne garde que ce qui est encore sur la liste
async function encoreSurLaListe(admin, espaceId, evenements) {
  if (!evenements.some((e) => e.type === 'ajout_liste')) return evenements
  const [produits, articles] = await Promise.all([
    admin.from('produits').select('nom, etat').eq('espace_id', espaceId),
    admin.from('articles_courses').select('nom').eq('espace_id', espaceId),
  ])
  const surLaListe = new Set([
    ...(produits.data ?? []).filter((p) => p.etat !== 'ok').map((p) => normaliser(p.nom)),
    ...(articles.data ?? []).map((a) => normaliser(a.nom)),
  ])
  return evenements.filter((e) => e.type !== 'ajout_liste' || surLaListe.has(normaliser(e.libelle)))
}

// Envoie les événements pas encore notifiés de l'espace. Renvoie
// { notifications, appareils } ou { erreur } si le demandeur n'est pas membre.
export async function envoyerActivite({ admin, envoyerPush, utilisateurId, espaceId, maintenant = new Date() }) {
  const { data: membres } = await admin
    .from('membres_espace')
    .select('user_id, profils (prenom)')
    .eq('espace_id', espaceId)
  if (!membres?.some((m) => m.user_id === utilisateurId)) return { erreur: "Tu ne fais pas partie de cet espace." }

  // Prise en charge atomique : si deux appareils appellent en même temps,
  // chaque événement n'est réclamé (et notifié) qu'une fois
  const { data: reclames, error } = await admin
    .from('evenements')
    .update({ notifie_le: maintenant.toISOString() })
    .eq('espace_id', espaceId)
    .is('notifie_le', null)
    .select('id, auteur, type, libelle, created_at')
  if (error) throw new Error(error.message)
  await admin
    .from('evenements')
    .delete()
    .eq('espace_id', espaceId)
    .lt('created_at', new Date(maintenant.getTime() - CONSERVATION_MS).toISOString())

  const limite = maintenant.getTime() - FRAICHEUR_MS
  const recents = (reclames ?? [])
    .filter((e) => new Date(e.created_at).getTime() >= limite)
    .sort((a, b) => a.id - b.id)
  const bilan = { notifications: 0, appareils: 0 }
  if (recents.length === 0) return bilan

  const resumes = resumerActivite(
    await encoreSurLaListe(admin, espaceId, recents),
    new Map(membres.map((m) => [m.user_id, m.profils?.prenom]))
  )
  if (resumes.length === 0) return bilan

  const autres = membres.map((m) => m.user_id)
  const [{ data: abonnements }, { data: preferences }] = await Promise.all([
    admin.from('abonnements_push').select('*').in('user_id', autres),
    admin.from('preferences_notifications').select('user_id, push_activite').in('user_id', autres),
  ])
  const coupees = new Set((preferences ?? []).filter((p) => p.push_activite === false).map((p) => p.user_id))

  for (const destinataire of autres) {
    if (coupees.has(destinataire)) continue
    const appareils = (abonnements ?? []).filter((a) => a.user_id === destinataire)
    if (appareils.length === 0) continue
    // Chacun ne reçoit que les actions des autres
    for (const { auteur, notification } of resumes) {
      if (auteur === destinataire) continue
      try {
        const atteints = await envoyerAuMembre(admin, envoyerPush, appareils, notification)
        bilan.appareils += atteints
        if (atteints) bilan.notifications += 1
      } catch {
        // Service de notification indisponible pour cet appareil : on
        // continue avec les autres (pas de nouvel essai, l'info serait périmée)
      }
    }
  }
  return bilan
}
