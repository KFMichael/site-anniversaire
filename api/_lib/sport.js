// Invitations des séances de sport (api/sport.js). Indépendant de Vercel et
// de Resend : testé par sport.test.js.
import { echapper } from './email.js'
import { invitationIcs } from './ics.js'
import { membresDe } from './recap.js'

const DUREE_OUBLI_MS = 24 * 3600 * 1000

// « lundi 28 septembre, 18h30–19h15 » dans le fuseau du foyer
export function libelleSeance(seance, fuseau) {
  const debut = new Date(seance.debut)
  const fin = new Date(debut.getTime() + seance.duree_minutes * 60000)
  const jour = new Intl.DateTimeFormat('fr-FR', { timeZone: fuseau, weekday: 'long', day: 'numeric', month: 'long' }).format(debut)
  const heure = (d) =>
    new Intl.DateTimeFormat('fr-FR', { timeZone: fuseau, hour: '2-digit', minute: '2-digit' }).format(d).replace(':', 'h')
  return `${jour}, ${heure(debut)}–${heure(fin)}`
}

// Lien « Ajouter à Google Agenda » (événement prérempli)
export function lienGoogleAgenda(seance, titre, details) {
  const format = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const fin = new Date(new Date(seance.debut).getTime() + seance.duree_minutes * 60000)
  const params = new URLSearchParams({ action: 'TEMPLATE', text: titre, dates: `${format(seance.debut)}/${format(fin)}`, details })
  return `https://calendar.google.com/calendar/render?${params}`
}

// À envoyer : jamais envoyée, modifiée depuis l'envoi, ou annulée après envoi
export function seancesAEnvoyer(seances, maintenant = new Date()) {
  return seances.filter(
    (s) =>
      new Date(s.debut).getTime() > maintenant.getTime() - DUREE_OUBLI_MS &&
      (s.annulee ? Boolean(s.envoyee_le) : !s.envoyee_le || new Date(s.updated_at) > new Date(s.envoyee_le))
  )
}

// Peut planifier : la personne qui a la charge « sport » du mois (en cours ou
// suivant), ou n'importe quel membre si personne ne l'a prise
async function peutPlanifier(admin, espaceId, utilisateurId, mois) {
  const { data: charges } = await admin
    .from('charges')
    .select('id')
    .eq('espace_id', espaceId)
    .eq('archivee', false)
    .ilike('nom', '%sport%')
  if (!charges?.length) return true
  const { data: attributions } = await admin
    .from('attributions')
    .select('user_id, mois')
    .eq('espace_id', espaceId)
    .in('charge_id', charges.map((c) => c.id))
    .in('mois', mois)
  if (!attributions?.length) return true
  return attributions.some((a) => a.user_id === utilisateurId)
}

function emailSeance({ methode, seance, organisateur, config }) {
  const quand = libelleSeance(seance, config.fuseau)
  const annulation = methode === 'CANCEL'
  const sujet = annulation ? `Annulé : 🏃 sport ${quand}` : `🏃 Sport ${quand}`
  const lien = lienGoogleAgenda(seance, '🏃 Sport', `Planifiée par ${organisateur.nom} dans Nido`)
  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:24px 12px;background:#F2F2F7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:24px;background:#FFFFFF;border-radius:20px;">
<p style="font-size:40px;margin:0 0 8px;">${annulation ? '❌' : '🏃'}</p>
<h1 style="font-size:20px;margin:0 0 8px;">${annulation ? 'Séance annulée' : 'Séance de sport'}</h1>
<p style="font-size:16px;line-height:1.5;color:#48484A;margin:0 0 16px;"><strong>${echapper(quand)}</strong><br>
${annulation ? `${echapper(organisateur.nom)} a annulé cette séance. Elle disparaît de ton agenda.` : `Proposée par ${echapper(organisateur.nom)}. Accepte l'invitation pour l'ajouter à ton agenda.`}</p>
${annulation ? '' : `<p style="margin:0 0 16px;"><a href="${echapper(lien)}" style="display:inline-block;padding:10px 20px;background:#0071EB;color:#FFFFFF;border-radius:999px;text-decoration:none;font-weight:600;">Ajouter à Google Agenda</a></p>`}
<p style="font-size:12px;color:#6B6B70;margin:0;">Invitation jointe (fichier .ics) : Apple Calendrier, Outlook et Google Agenda la reconnaissent. <a href="${echapper(config.lienApp)}/sport" style="color:#0062CC;">Voir dans Nido</a></p>
</div></body></html>`
  const texte = `${annulation ? 'Séance annulée' : 'Séance de sport'} : ${quand}\n${
    annulation ? `${organisateur.nom} a annulé cette séance.` : `Proposée par ${organisateur.nom}. Invitation jointe.\nGoogle Agenda : ${lien}`
  }\n${config.lienApp}/sport`
  return { sujet, html, texte }
}

// Envoie les invitations en attente de l'espace à tous ses membres.
// config : { fuseau, lienApp, domaine }. Renvoie { envoyees, annulees } ou
// { erreur } (message affichable).
export async function envoyerInvitationsSport({ admin, envoyer, utilisateurId, espaceId, config, maintenant = new Date() }) {
  const membres = await membresDe(admin, espaceId)
  const organisateurMembre = membres.find((m) => m.user_id === utilisateurId)
  if (!organisateurMembre) return { erreur: 'Tu ne fais pas partie de cet espace.' }

  const moisCourant = `${maintenant.toISOString().slice(0, 7)}-01`
  const suivant = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() + 1, 1)).toISOString().slice(0, 10)
  if (!(await peutPlanifier(admin, espaceId, utilisateurId, [moisCourant, suivant]))) {
    return { erreur: 'Seule la personne responsable des séances de sport ce mois-ci peut envoyer les invitations.' }
  }

  const { data: seances, error } = await admin.from('seances_sport').select('*').eq('espace_id', espaceId)
  if (error) throw new Error(error.message)
  const aEnvoyer = seancesAEnvoyer(seances, maintenant)
  if (aEnvoyer.length === 0) return { erreur: 'Rien de nouveau à envoyer.' }

  const organisateur = { nom: organisateurMembre.prenom || organisateurMembre.email, email: organisateurMembre.email }
  const participants = membres.map((m) => ({ nom: m.prenom || m.email, email: m.email }))
  const bilan = { envoyees: 0, annulees: 0 }

  for (const seance of aEnvoyer) {
    const methode = seance.annulee ? 'CANCEL' : 'REQUEST'
    const version = { ...seance, sequence: seance.envoyee_le ? seance.sequence + 1 : seance.sequence }
    const ics = invitationIcs({
      methode,
      seance: version,
      organisateur,
      participants,
      domaine: config.domaine,
      titre: '🏃 Sport',
      description: `Planifiée par ${organisateur.nom} dans Nido`,
      maintenant,
    })
    const contenu = emailSeance({ methode, seance: version, organisateur, config })
    const piece = { nom: methode === 'CANCEL' ? 'annulation.ics' : 'invitation.ics', contenu: ics, type: `text/calendar; charset=utf-8; method=${methode}` }
    for (const membre of membres) {
      await envoyer({ a: membre.email, ...contenu, pieces: [piece] })
    }

    if (seance.annulee) {
      await admin.from('seances_sport').delete().eq('id', seance.id)
      bilan.annulees += 1
    } else {
      const horodatage = maintenant.toISOString()
      await admin
        .from('seances_sport')
        .update({ sequence: version.sequence, envoyee_le: horodatage, updated_at: horodatage })
        .eq('id', seance.id)
      bilan.envoyees += 1
    }
  }
  return bilan
}
