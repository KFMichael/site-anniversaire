// Notifications sur le téléphone (Web Push) envoyées par la tâche
// quotidienne : dîner du soir (tous les jours), récap court (dimanche),
// rappel de la charge mentale (le 1er). Indépendant de Vercel et de la
// bibliothèque web-push (l'envoi est passé en paramètre) : testé par
// notifications.test.js.
import { libelleMois } from '../../src/features/charge/calculs.js'
import { dateLocale, envoisDuJour, periodeCouverte } from './planning.js'
import { annulerReservation, donneesEspace, membresDe, reserver } from './recap.js'

function pluriel(n, mot) {
  return `${n} ${mot}${n > 1 ? 's' : ''}`
}

// Contenus : { titre, corps, url (écran à ouvrir), tag (remplace une
// notification précédente du même type au lieu de s'empiler) }
export function notificationDiner(nomDiner) {
  return { titre: '🍽️ Ce soir', corps: nomDiner, url: '/menus', tag: 'diner' }
}

export function notificationHebdo({ charges, diners, courses }) {
  return {
    titre: '📋 Ta semaine est prête',
    corps: `${pluriel(charges, 'charge')} · ${pluriel(diners, 'dîner')} prévu${diners > 1 ? 's' : ''} · ${pluriel(courses, 'article')} à acheter`,
    url: '/',
    tag: 'hebdo',
  }
}

export function notificationMensuel(mois, libres) {
  return {
    titre: `🧠 ${libelleMois(mois)}`,
    corps: libres
      ? `Choisis ta charge mentale : ${pluriel(libres, 'charge')} sans responsable.`
      : 'Toutes les charges ont un responsable ✓',
    url: '/charge',
    tag: 'mensuel',
  }
}

// Envoie une notification à tous les appareils d'un membre. Les abonnements
// expirés (appli désinstallée, permission retirée) sont supprimés.
// Renvoie le nombre d'appareils atteints.
export async function envoyerAuMembre(admin, envoyerPush, abonnements, notification) {
  let atteints = 0
  for (const abonnement of abonnements) {
    try {
      await envoyerPush(abonnement, notification)
      atteints += 1
    } catch (erreur) {
      if (erreur.statusCode === 404 || erreur.statusCode === 410) {
        await admin.from('abonnements_push').delete().eq('id', abonnement.id)
      } else {
        throw erreur
      }
    }
  }
  return atteints
}

const PREFERENCE = { diner: 'push_diner', hebdo: 'push_hebdo', mensuel: 'push_mensuel' }

// Tâche quotidienne. Renvoie { notifications, appareils, erreurs }
export async function executerPushQuotidien({ admin, envoyerPush, maintenant, config }) {
  const date = dateLocale(maintenant, config.fuseau)
  const planifies = envoisDuJour(date)
  const periode = periodeCouverte(date.iso, planifies)
  const bilan = { notifications: 0, appareils: 0, erreurs: [] }

  const { data: abonnements, error } = await admin.from('abonnements_push').select('*')
  if (error) throw new Error(error.message)
  if (abonnements.length === 0) return bilan
  const parMembre = new Map()
  for (const a of abonnements) parMembre.set(a.user_id, [...(parMembre.get(a.user_id) ?? []), a])
  const preferences = new Map(
    ((await admin.from('preferences_notifications').select('*')).data ?? []).map((p) => [p.user_id, p])
  )

  const { data: espaces } = await admin.from('espaces').select('id, nom')
  for (const espace of espaces ?? []) {
    const membres = (await membresDe(admin, espace.id)).filter((m) => parMembre.has(m.user_id))
    if (membres.length === 0) continue

    // Dîner du soir : tous les jours ; données de la semaine si dimanche
    const { data: dinerDuJour } = await admin
      .from('diners')
      .select('texte, plats (nom)')
      .eq('espace_id', espace.id)
      .eq('jour', date.iso)
    const nomDiner = dinerDuJour?.[0]?.plats?.nom ?? dinerDuJour?.[0]?.texte ?? null
    const donnees = planifies.length ? await donneesEspace(admin, espace.id, periode) : null

    for (const membre of membres) {
      const prefs = preferences.get(membre.user_id) ?? {}
      const aEnvoyer = []
      if (nomDiner) aEnvoyer.push({ type: 'diner', periode: date.iso, notification: notificationDiner(nomDiner) })
      for (const e of planifies) {
        aEnvoyer.push({
          type: e.type,
          periode: e.periode,
          notification:
            e.type === 'hebdo'
              ? notificationHebdo({
                  charges: donnees.charges.filter((c) => donnees.owners.get(c.id) === membre.user_id).length,
                  diners: periode.jours.filter((j) => donnees.diners[j]).length,
                  courses: donnees.courses.aAcheter.length + donnees.courses.bientot.length,
                })
              : notificationMensuel(periode.mois, donnees.chargesLibres.length),
        })
      }

      for (const envoi of aEnvoyer) {
        if (prefs[PREFERENCE[envoi.type]] === false) continue
        const ligne = { user_id: membre.user_id, espace_id: espace.id, type: `push-${envoi.type}`, periode: envoi.periode }
        if (!(await reserver(admin, ligne))) continue
        try {
          bilan.appareils += await envoyerAuMembre(admin, envoyerPush, parMembre.get(membre.user_id), envoi.notification)
          bilan.notifications += 1
        } catch (erreur) {
          await annulerReservation(admin, ligne)
          bilan.erreurs.push(`${membre.email} (${envoi.type}) : ${erreur.message}`)
        }
      }
    }
  }
  return bilan
}
