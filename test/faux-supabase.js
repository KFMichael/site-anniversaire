// Faux PostgREST en mémoire pour les tests de api/ : un vrai client
// supabase-js dont le `fetch` lit et écrit dans des tableaux JavaScript.
// Couvre ce que le code utilise : select (avec jointure simple), filtres
// eq/neq/gte/lte/lt/ilike/in, insert (clé primaire → erreur 23505), upsert, update
// et delete avec renvoi des lignes touchées.
import { createClient } from '@supabase/supabase-js'

const CLES = {
  envois_recap: ['user_id', 'espace_id', 'type', 'periode'],
  attributions: ['charge_id', 'mois'],
  diners: ['espace_id', 'jour'],
}

export function fauxSupabase(tables) {
  const jointures = {
    plats: (l) => tables.plats?.find((p) => p.id === l.plat_id) ?? null,
    profils: (l) => tables.profils?.find((p) => p.id === l.user_id) ?? null,
  }
  const avecJointures = (select) => (l) => {
    const r = { ...l }
    for (const [nom, joindre] of Object.entries(jointures)) if (select.includes(`${nom}(`)) r[nom] = joindre(l)
    return r
  }

  async function fetch(url, options = {}) {
    const u = new URL(url)
    const table = u.pathname.split('/').pop()
    tables[table] ??= []
    const select = (u.searchParams.get('select') ?? '').replace(/\s/g, '')
    const filtres = [...u.searchParams].filter(([k]) => !['select', 'on_conflict', 'columns'].includes(k))
    const garde = (l) =>
      filtres.every(([k, v]) => {
        const [op, ...reste] = v.split('.')
        const val = reste.join('.')
        const x = String(l[k])
        if (op === 'ilike') {
          const motif = new RegExp(`^${val.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/[%*]/g, '.*')}$`, 'i')
          return motif.test(x)
        }
        if (op === 'in') return val.slice(1, -1).split(',').map((v) => v.replace(/^"|"$/g, '')).includes(x)
        return { eq: x === val, neq: x !== val, gte: x >= val, lte: x <= val, lt: x < val }[op]
      })
    const json = (corps, status = 200) =>
      new Response(corps === null ? null : JSON.stringify(corps), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    const methode = options.method ?? 'GET'
    const prefer = new Headers(options.headers).get('Prefer') ?? ''
    const renvoyer = (lignes, status = 200) =>
      prefer.includes('return=representation') ? json(lignes.map(avecJointures(select)), status) : json(null, 204)

    if (methode === 'GET') return json(tables[table].filter(garde).map(avecJointures(select)))

    if (methode === 'POST') {
      const lignes = [].concat(JSON.parse(options.body))
      const cle = CLES[table]
      const fusion = prefer.includes('resolution=merge-duplicates')
      for (const ligne of lignes) {
        const existant = cle && tables[table].find((l) => cle.every((c) => l[c] === ligne[c]))
        if (existant && fusion) Object.assign(existant, ligne)
        else if (existant) return json({ code: '23505', message: 'duplicate key' }, 409)
        else tables[table].push({ ...ligne })
      }
      return renvoyer(lignes, 201)
    }
    if (methode === 'PATCH') {
      const touchees = tables[table].filter(garde)
      touchees.forEach((l) => Object.assign(l, JSON.parse(options.body)))
      return renvoyer(touchees)
    }
    if (methode === 'DELETE') {
      const touchees = tables[table].filter(garde)
      tables[table] = tables[table].filter((l) => !garde(l))
      return renvoyer(touchees)
    }
    return json({ message: 'non géré' }, 400)
  }

  return createClient('http://faux.supabase', 'cle', { global: { fetch }, auth: { persistSession: false } })
}
