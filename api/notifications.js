// Fonction Vercel : notification de test, envoyée par un membre connecté
// (jeton Supabase) à tous ses appareils depuis Espace > Notifications.
import { createClient } from '@supabase/supabase-js'
import { envoyerAuMembre } from './_lib/notifications.js'
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

  const { data: abonnements } = await admin.from('abonnements_push').select('*').eq('user_id', data.user.id)
  if (!abonnements?.length) return res.status(400).json({ erreur: 'Aucun appareil avec les notifications activées.' })
  try {
    const atteints = await envoyerAuMembre(admin, envoyerPush, abonnements, {
      titre: '🪺 Nido',
      corps: 'Les notifications fonctionnent sur cet appareil ✓',
      url: '/espace',
      tag: 'test',
    })
    return res.status(200).json({ appareils: atteints })
  } catch {
    return res.status(502).json({ erreur: "L'envoi a échoué. Réessaie dans un instant." })
  }
}
