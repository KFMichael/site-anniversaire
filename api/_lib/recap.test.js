import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { envoyerApercu, executerRecapQuotidien } from './recap.js'

// Faux PostgREST en mémoire : juste ce que recap.js utilise (select avec
// jointure simple, filtres eq/neq/gte/lte, insert avec clé primaire, delete)
function fauxSupabase(tables) {
  const cles = { envois_recap: ['user_id', 'espace_id', 'type', 'periode'] }
  const jointures = {
    plats: (ligne) => tables.plats.find((p) => p.id === ligne.plat_id) ?? null,
    profils: (ligne) => tables.profils.find((p) => p.id === ligne.user_id) ?? null,
  }
  async function fetch(url, options = {}) {
    const u = new URL(url)
    const table = u.pathname.split('/').pop()
    const filtres = [...u.searchParams].filter(([k]) => k !== 'select')
    const garde = (l) =>
      filtres.every(([k, v]) => {
        const [op, ...reste] = v.split('.')
        const val = reste.join('.')
        return { eq: String(l[k]) === val, neq: String(l[k]) !== val, gte: String(l[k]) >= val, lte: String(l[k]) <= val }[op]
      })
    const json = (corps, status = 200) =>
      new Response(JSON.stringify(corps), { status, headers: { 'Content-Type': 'application/json' } })
    const methode = options.method ?? 'GET'
    if (methode === 'GET') {
      const select = (u.searchParams.get('select') ?? '').replace(/\s/g, '')
      return json(
        (tables[table] ?? []).filter(garde).map((l) => {
          const r = { ...l }
          for (const [nom, joindre] of Object.entries(jointures)) if (select.includes(`${nom}(`)) r[nom] = joindre(l)
          return r
        })
      )
    }
    if (methode === 'POST') {
      const ligne = JSON.parse(options.body)
      const cle = cles[table]
      if (cle && tables[table].some((l) => cle.every((c) => l[c] === ligne[c]))) {
        return json({ code: '23505', message: 'duplicate key' }, 409)
      }
      tables[table].push(ligne)
      return json(null, 201)
    }
    if (methode === 'DELETE') {
      tables[table] = tables[table].filter((l) => !garde(l))
      return json(null, 204)
    }
    return json({ message: 'non géré' }, 400)
  }
  return createClient('http://faux.supabase', 'cle', { global: { fetch }, auth: { persistSession: false } })
}

function jeuDeDonnees() {
  return {
    espaces: [{ id: 'e1', nom: 'Notre foyer' }],
    profils: [
      { id: 'u1', prenom: 'Michael', email: 'michael@exemple.fr' },
      { id: 'u2', prenom: 'Léa', email: 'lea@exemple.fr' },
    ],
    membres_espace: [
      { espace_id: 'e1', user_id: 'u1' },
      { espace_id: 'e1', user_id: 'u2' },
    ],
    preferences_notifications: [],
    envois_recap: [],
    charges: [
      { id: 'c1', espace_id: 'e1', nom: 'Faire la lessive', emoji: '🧺', ordre: 1, archivee: false },
      { id: 'c2', espace_id: 'e1', nom: 'Gérer les finances', emoji: '💶', ordre: 2, archivee: false },
    ],
    attributions: [{ espace_id: 'e1', charge_id: 'c1', user_id: 'u2', mois: '2026-09-01' }],
    produits: [
      { espace_id: 'e1', nom: 'Attiéké', etat: 'fini', quantite: '2' },
      { espace_id: 'e1', nom: 'Huile de palme', etat: 'bientot' },
      { espace_id: 'e1', nom: 'Riz', etat: 'ok' },
    ],
    articles_courses: [{ espace_id: 'e1', nom: 'Bougies', quantite: '1 paquet' }],
    plats: [{ id: 'p1', nom: 'Garba' }],
    diners: [
      { espace_id: 'e1', jour: '2026-09-28', plat_id: 'p1', texte: null },
      { espace_id: 'e1', jour: '2026-09-29', plat_id: null, texte: 'Resto' },
      { espace_id: 'e1', jour: '2026-09-21', plat_id: 'p1', texte: null }, // semaine passée
    ],
  }
}

const CONFIG = { nomApp: 'Nido', lienApp: 'https://nido.4sept.com', fuseau: 'Europe/Paris' }
const DIMANCHE = new Date('2026-09-27T17:00:00Z')

test('dimanche : un récap par membre, avec les données de la semaine à venir', async () => {
  const tables = jeuDeDonnees()
  const envoyes = []
  const bilan = await executerRecapQuotidien({
    admin: fauxSupabase(tables),
    envoyer: async (e) => envoyes.push(e),
    maintenant: DIMANCHE,
    config: CONFIG,
  })
  assert.equal(bilan.envoyes, 2)
  assert.deepEqual(envoyes.map((e) => e.a).sort(), ['lea@exemple.fr', 'michael@exemple.fr'])

  const lea = envoyes.find((e) => e.a === 'lea@exemple.fr')
  assert.match(lea.texte, /Bonjour Léa/)
  assert.match(lea.texte, /- Faire la lessive/) // sa charge
  assert.match(lea.texte, /- Lundi 28 : Garba/)
  assert.match(lea.texte, /- Mardi 29 : Resto/)
  assert.doesNotMatch(lea.texte, /21/) // pas la semaine passée
  assert.match(lea.texte, /- Attiéké \(× 2\)\n- Bougies \(1 paquet\)\n- Huile de palme \(presque fini\)/)
  assert.doesNotMatch(lea.texte, /Riz/)

  const michael = envoyes.find((e) => e.a === 'michael@exemple.fr')
  assert.match(michael.texte, /Aucune pour l’instant/)
  assert.equal(tables.envois_recap.length, 2)
})

test('relancer la tâche le même jour n’envoie rien deux fois', async () => {
  const tables = jeuDeDonnees()
  const admin = fauxSupabase(tables)
  const envoyes = []
  const envoyer = async (e) => envoyes.push(e)
  await executerRecapQuotidien({ admin, envoyer, maintenant: DIMANCHE, config: CONFIG })
  const bilan = await executerRecapQuotidien({ admin, envoyer, maintenant: DIMANCHE, config: CONFIG })
  assert.equal(envoyes.length, 2)
  assert.equal(bilan.dejaEnvoyes, 2)
})

test('un membre désinscrit ne reçoit rien', async () => {
  const tables = jeuDeDonnees()
  tables.preferences_notifications.push({ user_id: 'u1', recap_hebdo: false, rappel_mensuel: true })
  const envoyes = []
  const bilan = await executerRecapQuotidien({
    admin: fauxSupabase(tables),
    envoyer: async (e) => envoyes.push(e),
    maintenant: DIMANCHE,
    config: CONFIG,
  })
  assert.deepEqual(envoyes.map((e) => e.a), ['lea@exemple.fr'])
  assert.equal(bilan.desinscrits, 1)
})

test('un envoi en échec est retenté à la prochaine exécution', async () => {
  const tables = jeuDeDonnees()
  const admin = fauxSupabase(tables)
  const bilan = await executerRecapQuotidien({
    admin,
    envoyer: async () => {
      throw new Error('Resend indisponible')
    },
    maintenant: DIMANCHE,
    config: CONFIG,
  })
  assert.equal(bilan.erreurs.length, 2)
  assert.equal(tables.envois_recap.length, 0)

  const envoyes = []
  await executerRecapQuotidien({ admin, envoyer: async (e) => envoyes.push(e), maintenant: DIMANCHE, config: CONFIG })
  assert.equal(envoyes.length, 2)
})

test('un mardi ordinaire : rien à envoyer', async () => {
  const envoyes = []
  const bilan = await executerRecapQuotidien({
    admin: fauxSupabase(jeuDeDonnees()),
    envoyer: async (e) => envoyes.push(e),
    maintenant: new Date('2026-09-29T17:00:00Z'),
    config: CONFIG,
  })
  assert.deepEqual(bilan.envois, [])
  assert.equal(envoyes.length, 0)
})

test('aperçu : envoyé au seul demandeur, limité dans le temps, refusé hors espace', async () => {
  const tables = jeuDeDonnees()
  const admin = fauxSupabase(tables)
  const envoyes = []
  const params = { admin, envoyer: async (e) => envoyes.push(e), maintenant: new Date('2026-09-26T10:00:00Z'), config: CONFIG }

  assert.equal(await envoyerApercu({ ...params, utilisateurId: 'u2', espaceId: 'e1' }), null)
  assert.deepEqual(envoyes.map((e) => e.a), ['lea@exemple.fr'])
  assert.match(envoyes[0].sujet, /^\[Aperçu\]/)
  // Samedi : semaine en cours (lundi 21 → dimanche 27)
  assert.match(envoyes[0].texte, /- Lundi 21 : Garba/)

  assert.match(await envoyerApercu({ ...params, utilisateurId: 'u2', espaceId: 'e1' }), /quelques minutes/)
  assert.match(await envoyerApercu({ ...params, utilisateurId: 'intrus', espaceId: 'e1' }), /pas partie/)
  assert.equal(envoyes.length, 1)
})
