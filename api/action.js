// Fonction Vercel : boutons d'action du récap par email.
//
// GET  /api/action?t=<jeton>  → page qui renvoie aussitôt le jeton en POST
//      (par script). Les antivirus de messagerie qui « ouvrent » les liens
//      pour les analyser n'exécutent pas le script : ils ne déclenchent rien.
// POST /api/action (t=<jeton>) → exécute l'action, affiche le résultat.
//
// Variables : CRON_SECRET (la clé des jetons en dérive),
// SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL, APP_URL.
import { createClient } from '@supabase/supabase-js'
import { cleActions, lireJeton } from './_lib/jetons.js'
import { executerAction } from './_lib/actions.js'
import { echapper } from './_lib/email.js'

const LIBELLES = { prendre: 'Je prends cette charge', achete: 'Marquer comme acheté', autre: 'Tirer un autre plat' }

function page({ titre, message, ok = true, formulaire = '' }) {
  const lienApp = process.env.APP_URL || '/'
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>${echapper(titre)} · Nido</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
  :root { color-scheme: light dark; --fond:#F2F2F7; --carte:#FFFFFF; --texte:#000; --doux:#48484A; }
  @media (prefers-color-scheme: dark) { :root { --fond:#000; --carte:#1C1C1E; --texte:#FFF; --doux:#C7C7CC; } }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--fond);
         font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:var(--texte); padding:16px; box-sizing:border-box; }
  .carte { max-width:420px; width:100%; background:var(--carte); border-radius:24px; padding:28px; text-align:center; }
  .icone { font-size:44px; } h1 { font-size:22px; margin:12px 0 8px; } p { color:var(--doux); line-height:1.5; margin:0 0 20px; }
  a, button { display:inline-block; padding:12px 24px; border-radius:999px; background:#0071EB; color:#fff; font-weight:600;
              text-decoration:none; border:0; font-size:16px; cursor:pointer; }
</style></head>
<body><div class="carte"><div class="icone">${ok ? '🪺' : '⚠️'}</div><h1>${echapper(titre)}</h1><p>${echapper(message)}</p>
${formulaire || `<a href="${echapper(lienApp)}">Ouvrir Nido</a>`}</div></body></html>`
}

function repondre(res, statut, html) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Referrer-Policy', 'no-referrer')
  return res.status(statut).send(html)
}

export default async function handler(req, res) {
  if (!process.env.CRON_SECRET || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return repondre(res, 503, page({ ok: false, titre: 'Indisponible', message: 'Nido n’est pas encore configuré pour les actions par email.' }))
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    return repondre(res, 405, page({ ok: false, titre: 'Méthode non autorisée', message: '' }))
  }
  const cle = cleActions(process.env.CRON_SECRET)
  const jeton = req.method === 'POST' ? req.body?.t : req.query?.t
  const contenu = lireJeton(cle, jeton)
  if (!contenu) {
    return repondre(res, 400, page({ ok: false, titre: 'Lien expiré', message: 'Ce bouton n’est plus valable. Fais-le directement dans Nido.' }))
  }

  if (req.method === 'GET') {
    const libelle = LIBELLES[contenu.a] ?? 'Confirmer'
    return repondre(
      res,
      200,
      page({
        titre: libelle,
        message: contenu.n ? `« ${contenu.n} »` : 'Un instant…',
        formulaire: `<form id="action" method="post" action="/api/action">
<input type="hidden" name="t" value="${echapper(jeton)}"><button type="submit">${echapper(libelle)}</button></form>
<script>document.getElementById('action').requestSubmit()</script>`,
      })
    )
  }

  const admin = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  try {
    const resultat = await executerAction(admin, contenu)
    return repondre(res, resultat.ok ? 200 : 409, page(resultat))
  } catch {
    return repondre(res, 500, page({ ok: false, titre: 'Oups', message: 'L’action n’a pas pu être faite. Réessaie depuis Nido.' }))
  }
}
