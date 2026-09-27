// Fonction Vercel : rappel immédiat d'une échéance, demandé par un membre
// connecté (jeton Supabase), corps { echeance_id }. Email (et notification
// si configurée) à la personne responsable ou aux autres membres.
import { createClient } from '@supabase/supabase-js'
import { envoyerRappelEcheance } from './_lib/echeances.js'
import { creerEnvoiResend } from './_lib/resend.js'
import { configurationPush } from './_lib/webpush.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erreur: 'Méthode non autorisée' })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.RESEND_API_KEY) {
    return res.status(503).json({ erreur: "L'envoi d'emails n'est pas encore configuré." })
  }
  const admin = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const jeton = (req.headers.authorization || '').replace(/^Bearer /, '')
  const { data, error } = await admin.auth.getUser(jeton)
  if (error || !data?.user) return res.status(401).json({ erreur: 'Connexion requise' })
  const echeanceId = req.body?.echeance_id
  if (typeof echeanceId !== 'string') return res.status(400).json({ erreur: 'echeance_id manquant' })

  const lienApp = process.env.APP_URL || `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? 'nido.4sept.com'}`
  try {
    const resultat = await envoyerRappelEcheance({
      admin,
      envoyer: creerEnvoiResend({
        cleApi: process.env.RESEND_API_KEY,
        expediteur: process.env.RECAP_EXPEDITEUR || 'Nido <onboarding@resend.dev>',
      }),
      envoyerPush: configurationPush(),
      utilisateurId: data.user.id,
      echeanceId,
      config: { fuseau: process.env.RECAP_FUSEAU || 'Europe/Paris', lienApp },
    })
    return resultat.erreur ? res.status(400).json(resultat) : res.status(200).json(resultat)
  } catch {
    return res.status(500).json({ erreur: "L'envoi a échoué. Réessaie dans un instant." })
  }
}
