// Notifications des actions aux autres membres : après une action (ajout à
// la liste, charge prise, dîner prévu…), l'appli attend quelques secondes
// que la série d'actions soit finie, puis demande l'envoi à api/activite.js.
// Les événements eux-mêmes sont notés en base par des déclencheurs : cet
// appel ne fait que déclencher l'envoi, il ne transporte aucun contenu.
import { pushConfigure } from './push'
import { supabase } from './supabase'

// Regroupe « lait, pain, œufs » ajoutés à la suite en une seule notification
const DELAI_MS = 15000

let minuterie = null
let espaceEnAttente = null

async function envoyer() {
  clearTimeout(minuterie)
  minuterie = null
  const espaceId = espaceEnAttente
  espaceEnAttente = null
  if (!espaceId) return
  try {
    const { data } = await supabase.auth.getSession()
    const jeton = data.session?.access_token
    if (!jeton) return
    await fetch('/api/activite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` },
      body: JSON.stringify({ espace_id: espaceId }),
      // L'envoi aboutit même si l'appli passe en arrière-plan
      keepalive: true,
    })
  } catch {
    // Pas bloquant : la notification sera envoyée avec la prochaine action
  }
}

export function signalerActivite(espaceId) {
  if (!pushConfigure) return
  if (espaceEnAttente && espaceEnAttente !== espaceId) envoyer()
  espaceEnAttente = espaceId
  clearTimeout(minuterie)
  minuterie = setTimeout(envoyer, DELAI_MS)
}

// L'appli quitte l'écran (autre appli, écran verrouillé) : on envoie tout de suite
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && espaceEnAttente) envoyer()
  })
}
