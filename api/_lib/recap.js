// Envoi des récaps : collecte des données de chaque membre, construction de
// l'email, journal anti-doublon. Indépendant de Vercel et de Resend (le
// client Supabase et la fonction d'envoi sont passés en paramètre), ce qui
// permet de le tester (recap.test.js).
import { construireEmail } from './email.js'
import { dateLocale, envoisDuJour, periodeCouverte } from './planning.js'

const DOUBLON = '23505'

async function lire(requete) {
  const { data, error } = await requete
  if (error) throw new Error(error.message)
  return data
}

// Données d'un espace pour une période : charges et attributions du mois,
// dîners des jours, courses. Communes à tous les membres de l'espace.
async function donneesEspace(admin, espaceId, { jours, mois }) {
  const [charges, attributions, produits, articles, diners] = await Promise.all([
    lire(admin.from('charges').select('id, nom, emoji, ordre, archivee').eq('espace_id', espaceId)),
    lire(admin.from('attributions').select('charge_id, user_id').eq('espace_id', espaceId).eq('mois', mois)),
    lire(admin.from('produits').select('nom, etat').eq('espace_id', espaceId).neq('etat', 'ok')),
    lire(admin.from('articles_courses').select('nom').eq('espace_id', espaceId)),
    jours.length
      ? lire(
          admin
            .from('diners')
            .select('jour, texte, plats (nom)')
            .eq('espace_id', espaceId)
            .gte('jour', jours[0])
            .lte('jour', jours[jours.length - 1])
        )
      : [],
  ])
  const owners = new Map(attributions.map((a) => [a.charge_id, a.user_id]))
  const tri = (a, b) => a.ordre - b.ordre
  return {
    charges: charges.sort(tri),
    owners,
    chargesLibres: charges.filter((c) => !c.archivee && !owners.has(c.id)).sort(tri),
    diners: Object.fromEntries(diners.map((d) => [d.jour, d.plats?.nom ?? d.texte ?? null])),
    courses: {
      aAcheter: [
        ...produits.filter((p) => p.etat === 'fini').map((p) => p.nom),
        ...articles.map((a) => a.nom),
      ].sort((a, b) => a.localeCompare(b, 'fr')),
      bientot: produits.filter((p) => p.etat === 'bientot').map((p) => p.nom).sort((a, b) => a.localeCompare(b, 'fr')),
    },
  }
}

function emailPour(membre, espace, donnees, types, periode, config) {
  return construireEmail({
    nomApp: config.nomApp,
    lienApp: config.lienApp,
    prenom: membre.prenom || membre.email.split('@')[0],
    espaceNom: espace.nom,
    types,
    jours: periode.jours,
    mois: periode.mois,
    mesCharges: donnees.charges.filter((c) => donnees.owners.get(c.id) === membre.user_id),
    chargesLibres: donnees.chargesLibres,
    diners: donnees.diners,
    courses: donnees.courses,
  })
}

async function membresDe(admin, espaceId) {
  const membres = await lire(
    admin.from('membres_espace').select('user_id, profils (prenom, email)').eq('espace_id', espaceId)
  )
  return membres
    .filter((m) => m.profils?.email)
    .map((m) => ({ user_id: m.user_id, prenom: m.profils.prenom, email: m.profils.email }))
}

// Réserve un envoi dans le journal ; false s'il a déjà eu lieu
async function reserver(admin, ligne) {
  const { error } = await admin.from('envois_recap').insert(ligne)
  if (!error) return true
  if (error.code === DOUBLON) return false
  throw new Error(error.message)
}

async function annulerReservation(admin, { user_id, espace_id, type, periode }) {
  await admin
    .from('envois_recap')
    .delete()
    .eq('user_id', user_id)
    .eq('espace_id', espace_id)
    .eq('type', type)
    .eq('periode', periode)
}

// Tâche quotidienne. config : { nomApp, lienApp, fuseau }
// Renvoie un bilan { date, envois, envoyes, dejaEnvoyes, desinscrits, erreurs }
export async function executerRecapQuotidien({ admin, envoyer, maintenant, config }) {
  const date = dateLocale(maintenant, config.fuseau)
  const prevus = envoisDuJour(date)
  const bilan = { date: date.iso, envois: prevus.map((e) => e.type), envoyes: 0, dejaEnvoyes: 0, desinscrits: 0, erreurs: [] }
  if (prevus.length === 0) return bilan

  const periode = periodeCouverte(date.iso, prevus)
  const espaces = await lire(admin.from('espaces').select('id, nom'))
  const preferences = new Map(
    (await lire(admin.from('preferences_notifications').select('*'))).map((p) => [p.user_id, p])
  )

  for (const espace of espaces) {
    const membres = await membresDe(admin, espace.id)
    if (membres.length === 0) continue
    const donnees = await donneesEspace(admin, espace.id, periode)

    for (const membre of membres) {
      const prefs = preferences.get(membre.user_id)
      const voulus = prevus.filter((e) =>
        e.type === 'hebdo' ? prefs?.recap_hebdo !== false : prefs?.rappel_mensuel !== false
      )
      if (voulus.length === 0) {
        bilan.desinscrits += 1
        continue
      }

      const reserves = []
      for (const e of voulus) {
        const ligne = { user_id: membre.user_id, espace_id: espace.id, type: e.type, periode: e.periode }
        if (await reserver(admin, ligne)) reserves.push(ligne)
      }
      if (reserves.length === 0) {
        bilan.dejaEnvoyes += 1
        continue
      }

      const email = emailPour(membre, espace, donnees, reserves.map((r) => r.type), periode, config)
      try {
        await envoyer({ a: membre.email, ...email })
        bilan.envoyes += 1
      } catch (erreur) {
        // On libère le journal pour que la prochaine exécution réessaie
        for (const r of reserves) await annulerReservation(admin, r)
        bilan.erreurs.push(`${membre.email} : ${erreur.message}`)
      }
    }
  }
  return bilan
}

// Aperçu demandé depuis l'appli par un membre : le récap complet (semaine
// à venir + charge du mois), envoyé à lui seul. Limité à un toutes les
// 10 minutes. Renvoie null si envoyé, sinon un message d'erreur.
export async function envoyerApercu({ admin, envoyer, maintenant, config, utilisateurId, espaceId }) {
  const [espace] = await lire(admin.from('espaces').select('id, nom').eq('id', espaceId))
  const membre = (await membresDe(admin, espaceId)).find((m) => m.user_id === utilisateurId)
  if (!espace || !membre) return "Tu ne fais pas partie de cet espace."

  const periodeReservation = maintenant.toISOString().slice(0, 15) // tranche de 10 minutes
  const ligne = { user_id: membre.user_id, espace_id: espaceId, type: 'apercu', periode: periodeReservation }
  if (!(await reserver(admin, ligne))) return 'Un aperçu vient d’être envoyé : réessaie dans quelques minutes.'

  const date = dateLocale(maintenant, config.fuseau)
  // Semaine à venir si on est dimanche, sinon la semaine en cours
  const decalage = date.jourSemaine === 0 ? 1 : 1 - date.jourSemaine
  const lundi = new Date(`${date.iso}T12:00:00Z`)
  lundi.setUTCDate(lundi.getUTCDate() + decalage)
  const envois = [{ type: 'hebdo', periode: lundi.toISOString().slice(0, 10) }]
  const periode = periodeCouverte(date.iso, envois)

  const donnees = await donneesEspace(admin, espaceId, periode)
  const email = emailPour(membre, espace, donnees, ['hebdo', 'mensuel'], periode, config)
  try {
    await envoyer({ a: membre.email, ...email, sujet: `[Aperçu] ${email.sujet}` })
    return null
  } catch (erreur) {
    await annulerReservation(admin, ligne)
    return `L'envoi a échoué : ${erreur.message}`
  }
}
