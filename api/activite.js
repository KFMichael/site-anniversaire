// Fonction Vercel : notifications des actions des autres membres, appelée
// par l'appli quelques secondes après une action (jeton Supabase), corps
// { espace_id }. Envoie les événements pas encore notifiés de l'espace.
import { createClient } from '@supabase/supabase-js'
import { envoyerActivite } from './_lib/activite.js'
import { configurationPush } from './_lib/webpush.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erreur: 'Méthode non autorisée' })
  const envoyerPush = configurationPush()
  if (!envoyerPush || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ erreur: 'Les notifications ne sont pas encore configurées sur le serveur.' })
  }
  const admin = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const jeton = (req.headers.authorization || '').replace(/^Bearer /, '')
  const { data, error } = await admin.auth.getUser(jeton)
  if (error || !data?.user) return res.status(401).json({ erreur: 'Connexion requise' })
  const espaceId = req.body?.espace_id
  if (typeof espaceId !== 'string') return res.status(400).json({ erreur: 'espace_id manquant' })

  try {
    const resultat = await envoyerActivite({ admin, envoyerPush, utilisateurId: data.user.id, espaceId })
    return resultat.erreur ? res.status(403).json(resultat) : res.status(200).json(resultat)
  } catch {
    return res.status(500).json({ erreur: "L'envoi a échoué. Réessaie dans un instant." })
  }
}
