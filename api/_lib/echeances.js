// Échéances : contenu des rappels (notification et email) et rappel
// immédiat demandé depuis l'appli (api/echeances.js). Les rappels
// automatiques partent de la tâche quotidienne (notifications.js).
// Testé par echeances.test.js.
import { categorieEcheance, joursRestants, libelleDate, libelleDelai } from '../../src/features/echeances/echeances.js'
import { echapper } from './email.js'
import { envoyerAuMembre, notificationEcheance } from './notifications.js'
import { dateLocale } from './planning.js'
import { annulerReservation, membresDe, reserver } from './recap.js'

function majuscule(texte) {
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}

function emailRappel({ echeance, jours, auteur, config }) {
  const cat = categorieEcheance(echeance.categorie)
  const quand = `${majuscule(libelleDelai(jours))} : ${libelleDate(echeance.date)}`
  const sujet = `${cat.emoji} Rappel : ${echeance.titre} (${libelleDelai(jours)})`
  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:24px 12px;background:#F2F2F7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:24px;background:#FFFFFF;border-radius:20px;">
<p style="font-size:40px;margin:0 0 8px;">${cat.emoji}</p>
<h1 style="font-size:20px;margin:0 0 8px;color:#000000;">${echapper(echeance.titre)}</h1>
<p style="font-size:16px;line-height:1.5;color:#48484A;margin:0 0 16px;"><strong>${echapper(quand)}</strong><br>${echapper(auteur)} te le rappelle.</p>
${echeance.note ? `<p style="font-size:15px;line-height:1.5;color:#48484A;margin:0 0 16px;">${echapper(echeance.note)}</p>` : ''}
<p style="margin:0;"><a href="${echapper(config.lienApp)}/echeances" style="display:inline-block;padding:10px 20px;background:#0071EB;color:#FFFFFF;border-radius:999px;text-decoration:none;font-weight:600;">Voir les échéances</a></p>
</div></body></html>`
  const texte = `${echeance.titre}\n${quand}\n${auteur} te le rappelle.${echeance.note ? `\n\n${echeance.note}` : ''}\n\n${config.lienApp}/echeances`
  return { sujet, html, texte }
}

// Rappel immédiat : à la personne responsable, ou à tous les autres membres.
// Limité à un par échéance et par membre toutes les 10 minutes.
// Renvoie { destinataires: [prénoms] } ou { erreur }.
export async function envoyerRappelEcheance({ admin, envoyer, envoyerPush, utilisateurId, echeanceId, config, maintenant = new Date() }) {
  const { data: trouvees } = await admin.from('echeances').select('*').eq('id', echeanceId)
  const echeance = trouvees?.[0]
  if (!echeance) return { erreur: 'Échéance introuvable.' }
  const membres = await membresDe(admin, echeance.espace_id)
  const auteur = membres.find((m) => m.user_id === utilisateurId)
  if (!auteur) return { erreur: 'Tu ne fais pas partie de cet espace.' }

  const autres = membres.filter((m) => m.user_id !== utilisateurId)
  const destinataires =
    echeance.responsable && echeance.responsable !== utilisateurId
      ? autres.filter((m) => m.user_id === echeance.responsable)
      : autres
  if (destinataires.length === 0) return { erreur: "Il n'y a personne d'autre dans l'espace à qui l'envoyer." }

  const ligne = {
    user_id: utilisateurId,
    espace_id: echeance.espace_id,
    type: 'rappel-echeance',
    periode: `${echeance.id}:${maintenant.toISOString().slice(0, 15)}`,
  }
  if (!(await reserver(admin, ligne))) return { erreur: 'Un rappel vient d’être envoyé : réessaie dans quelques minutes.' }

  const jours = joursRestants(echeance.date, dateLocale(maintenant, config.fuseau).iso)
  const nomAuteur = auteur.prenom || auteur.email
  const contenu = emailRappel({ echeance, jours, auteur: nomAuteur, config })
  try {
    for (const d of destinataires) await envoyer({ a: d.email, ...contenu })
  } catch (erreur) {
    await annulerReservation(admin, ligne)
    throw erreur
  }

  // Notification en plus de l'email, si configurée (sans bloquer l'envoi)
  if (envoyerPush) {
    const { data: abonnements } = await admin
      .from('abonnements_push')
      .select('*')
      .in('user_id', destinataires.map((d) => d.user_id))
    const notification = { ...notificationEcheance(echeance, jours), corps: `${nomAuteur} te le rappelle · ${libelleDelai(jours)}` }
    for (const d of destinataires) {
      const appareils = (abonnements ?? []).filter((a) => a.user_id === d.user_id)
      try {
        if (appareils.length) await envoyerAuMembre(admin, envoyerPush, appareils, notification)
      } catch {
        // l'email est parti : la notification n'est qu'un complément
      }
    }
  }
  return { destinataires: destinataires.map((d) => d.prenom || d.email) }
}
