// Invitation d'agenda à partir d'un élément d'une liste partagée (« Dune »
// dans « Films à voir » → « Film samedi 20h30 »), demandée depuis l'appli
// (api/invitation.js). Email à chaque membre avec fichier .ics (organisateur
// compris, pour l'avoir dans son agenda), notification aux autres.
// Testé par invitation.test.js.
import { echapper } from './email.js'
import { invitationIcs } from './ics.js'
import { envoyerAuMembre } from './notifications.js'
import { membresDe } from './recap.js'
import { libelleSeance, lienGoogleAgenda } from './sport.js'

function emailInvitation({ methode, titre, quand, organisateur, liste, lien, config }) {
  const annulation = methode === 'CANCEL'
  const sujet = annulation ? `Annulé : ${titre} (${quand})` : `${titre} · ${quand}`
  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:24px 12px;background:#F2F2F7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:24px;background:#FFFFFF;border-radius:20px;">
<h1 style="font-size:20px;margin:0 0 8px;color:#000000;">${annulation ? '❌ ' : ''}${echapper(titre)}</h1>
<p style="font-size:16px;line-height:1.5;color:#48484A;margin:0 0 16px;"><strong>${echapper(quand)}</strong><br>
${annulation ? `${echapper(organisateur)} a annulé. L'événement disparaît de ton agenda.` : `Proposé par ${echapper(organisateur)} (liste « ${echapper(liste)} »). Accepte l'invitation pour l'ajouter à ton agenda.`}</p>
${annulation ? '' : `<p style="margin:0 0 16px;"><a href="${echapper(lien)}" style="display:inline-block;padding:10px 20px;background:#0071EB;color:#FFFFFF;border-radius:999px;text-decoration:none;font-weight:600;">Ajouter à Google Agenda</a></p>`}
<p style="font-size:12px;color:#6B6B70;margin:0;">Invitation jointe (fichier .ics) : Apple Calendrier, Outlook et Google Agenda la reconnaissent. <a href="${echapper(config.lienApp)}/listes" style="color:#0062CC;">Voir dans Nido</a></p>
</div></body></html>`
  const texte = `${titre} : ${quand}\n${
    annulation ? `${organisateur} a annulé.` : `Proposé par ${organisateur} (liste « ${liste} »). Invitation jointe.\nGoogle Agenda : ${lien}`
  }\n${config.lienApp}/listes`
  return { sujet, html, texte }
}

// action : 'envoyer' (création ou mise à jour) ou 'annuler'.
// Renvoie { envoyee: true } / { annulee: true } ou { erreur }.
export async function envoyerInvitationElement({ admin, envoyer, envoyerPush, utilisateurId, elementId, action, config, maintenant = new Date() }) {
  const { data: trouves } = await admin.from('elements_liste').select('*').eq('id', elementId)
  const element = trouves?.[0]
  if (!element) return { erreur: 'Élément introuvable.' }
  const membres = await membresDe(admin, element.espace_id)
  const auteur = membres.find((m) => m.user_id === utilisateurId)
  if (!auteur) return { erreur: 'Tu ne fais pas partie de cet espace.' }
  const { data: listes } = await admin.from('listes').select('nom, emoji').eq('id', element.liste_id)
  const liste = listes?.[0] ?? { nom: 'Liste', emoji: '📝' }

  const annuler = action === 'annuler'
  if (annuler && !element.invitation_envoyee_le) return { erreur: "Cette invitation n'a pas encore été envoyée." }
  if (!annuler && !element.invitation_debut) return { erreur: 'Choisis d’abord une date et une heure.' }
  if (!annuler && new Date(element.invitation_debut) < maintenant) return { erreur: 'Cette date est déjà passée.' }

  const methode = annuler ? 'CANCEL' : 'REQUEST'
  const evenement = {
    id: element.id,
    debut: element.invitation_debut,
    duree_minutes: element.invitation_duree ?? 120,
    sequence: element.invitation_envoyee_le ? element.invitation_sequence + 1 : element.invitation_sequence,
  }
  const titre = `${liste.emoji} ${element.texte}`
  const organisateur = { nom: auteur.prenom || auteur.email, email: auteur.email }
  const quand = libelleSeance(evenement, config.fuseau)
  const ics = invitationIcs({
    methode,
    seance: evenement,
    organisateur,
    participants: membres.map((m) => ({ nom: m.prenom || m.email, email: m.email })),
    domaine: config.domaine,
    titre,
    description: `Proposé par ${organisateur.nom} dans Nido (liste « ${liste.nom} »)${element.note ? `\n${element.note}` : ''}`,
    maintenant,
  })
  const contenu = emailInvitation({
    methode,
    titre,
    quand,
    organisateur: organisateur.nom,
    liste: liste.nom,
    lien: lienGoogleAgenda(evenement, titre, `Proposé par ${organisateur.nom} dans Nido`),
    config,
  })
  const piece = { nom: annuler ? 'annulation.ics' : 'invitation.ics', contenu: ics, type: `text/calendar; charset=utf-8; method=${methode}` }
  for (const m of membres) await envoyer({ a: m.email, ...contenu, pieces: [piece] })

  const horodatage = maintenant.toISOString()
  if (annuler) {
    await admin
      .from('elements_liste')
      .update({ invitation_debut: null, invitation_duree: null, invitation_envoyee_le: null, invitation_sequence: evenement.sequence, updated_at: horodatage })
      .eq('id', element.id)
  } else {
    await admin
      .from('elements_liste')
      .update({ invitation_sequence: evenement.sequence, invitation_envoyee_le: horodatage, updated_at: horodatage })
      .eq('id', element.id)
  }

  // Notification aux autres membres, si configurée (l'email est déjà parti)
  const autres = membres.filter((m) => m.user_id !== utilisateurId)
  if (envoyerPush && autres.length) {
    const { data: abonnements } = await admin.from('abonnements_push').select('*').in('user_id', autres.map((m) => m.user_id))
    const notification = {
      titre,
      corps: annuler ? `${organisateur.nom} a annulé (${quand})` : `${organisateur.nom} propose : ${quand}`,
      url: '/listes',
      tag: `invitation-${element.id}`,
    }
    for (const m of autres) {
      const appareils = (abonnements ?? []).filter((a) => a.user_id === m.user_id)
      try {
        if (appareils.length) await envoyerAuMembre(admin, envoyerPush, appareils, notification)
      } catch {
        // complément de l'email, pas bloquant
      }
    }
  }
  return annuler ? { annulee: true } : { envoyee: true }
}
