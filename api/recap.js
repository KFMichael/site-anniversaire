// Fonction Vercel : récap par email.
//
// - GET par la tâche planifiée Vercel (vercel.json, tous les jours) :
//   envoie ce qui est prévu ce jour-là (récap du dimanche, rappel du 1er).
//   Vercel ajoute « Authorization: Bearer $CRON_SECRET ».
// - POST depuis l'appli par un membre connecté (jeton Supabase) : aperçu
//   envoyé à lui seul, corps { espace_id }.
//
// Variables d'environnement (Vercel > Settings > Environment Variables) :
//   SUPABASE_SERVICE_ROLE_KEY  clé service_role (Supabase > Settings > API)
//   RESEND_API_KEY             clé d'API Resend
//   CRON_SECRET                chaîne aléatoire, protège la tâche planifiée
//   RECAP_EXPEDITEUR           ex. « Nido <recap@nido.4sept.com> »
//   APP_URL                    ex. « https://nido.4sept.com »
//   RECAP_FUSEAU               fuseau du foyer (défaut Europe/Paris)
//   VITE_SUPABASE_URL          déjà défini pour l'appli
import { createClient } from '@supabase/supabase-js'
import { envoyerApercu, executerRecapQuotidien } from './_lib/recap.js'
import { creerEnvoiResend } from './_lib/resend.js'

const NOM_APP = 'Nido'

function configuration() {
  const manquantes = ['SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'CRON_SECRET'].filter(
    (nom) => !process.env[nom]
  )
  if (!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)) manquantes.push('VITE_SUPABASE_URL')
  return {
    manquantes,
    admin: () =>
      createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    envoyer: () =>
      creerEnvoiResend({
        cleApi: process.env.RESEND_API_KEY,
        expediteur: process.env.RECAP_EXPEDITEUR || `${NOM_APP} <onboarding@resend.dev>`,
      }),
    recap: {
      nomApp: NOM_APP,
      lienApp:
        process.env.APP_URL ||
        (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : ''),
      fuseau: process.env.RECAP_FUSEAU || 'Europe/Paris',
    },
  }
}

export default async function handler(req, res) {
  const config = configuration()
  if (config.manquantes.length) {
    return res.status(503).json({ erreur: `Configuration incomplète : ${config.manquantes.join(', ')}` })
  }
  const jeton = (req.headers.authorization || '').replace(/^Bearer /, '')

  // Tâche planifiée
  if (req.method === 'GET') {
    if (jeton !== process.env.CRON_SECRET) return res.status(401).json({ erreur: 'Non autorisé' })
    const bilan = await executerRecapQuotidien({
      admin: config.admin(),
      envoyer: config.envoyer(),
      maintenant: new Date(),
      config: config.recap,
    })
    return res.status(bilan.erreurs.length ? 500 : 200).json(bilan)
  }

  // Aperçu demandé par un membre
  if (req.method === 'POST') {
    const admin = config.admin()
    const { data, error } = await admin.auth.getUser(jeton)
    if (error || !data?.user) return res.status(401).json({ erreur: 'Connexion requise' })
    const espaceId = req.body?.espace_id
    if (typeof espaceId !== 'string') return res.status(400).json({ erreur: 'espace_id manquant' })

    const erreur = await envoyerApercu({
      admin,
      envoyer: config.envoyer(),
      maintenant: new Date(),
      config: config.recap,
      utilisateurId: data.user.id,
      espaceId,
    })
    return erreur ? res.status(400).json({ erreur }) : res.status(200).json({ envoye: true })
  }

  return res.status(405).json({ erreur: 'Méthode non autorisée' })
}
