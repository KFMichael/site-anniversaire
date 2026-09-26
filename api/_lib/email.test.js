import { test } from 'node:test'
import assert from 'node:assert/strict'
import { construireEmail, echapper } from './email.js'

const base = {
  nomApp: 'Nido',
  lienApp: 'https://nido.example',
  prenom: 'Léa',
  espaceNom: 'Notre foyer',
  jours: ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'],
  mois: '2026-09-01',
  mesCharges: [{ emoji: '🧺', nom: 'Faire la lessive' }],
  chargesLibres: [{ emoji: '💶', nom: 'Gérer les finances', lien: 'https://nido.example/api/action?t=prendre' }],
  diners: {
    '2026-09-28': { nom: 'Garba', lien: 'https://nido.example/api/action?t=autre' },
    '2026-09-30': { nom: 'Sauce graine et riz' },
  },
  courses: {
    aAcheter: [{ texte: 'Attiéké', lien: 'https://nido.example/api/action?t=achete' }, { texte: 'Piment' }],
    bientot: [{ texte: 'Huile de palme' }],
  },
}

test('récap hebdo : charges, dîners, courses', () => {
  const { sujet, html, texte } = construireEmail({ ...base, types: ['hebdo'] })
  assert.equal(sujet, 'Ta semaine : du 28 septembre au 4 octobre · Nido')
  assert.match(texte, /- Faire la lessive/)
  assert.match(texte, /- Lundi 28 : Garba/)
  assert.match(texte, /- Mardi 29 : rien de prévu/)
  assert.match(texte, /Liste de courses \(3\)/)
  assert.match(texte, /- Huile de palme \(presque fini\)/)
  assert.match(html, /1 charge sans responsable/)
  assert.match(html, /href="https:\/\/nido.example"/)
  // Boutons d'action en un clic, seulement là où un lien est fourni
  assert.match(html, /Gérer les finances <a href="https:\/\/nido.example\/api\/action\?t=prendre"[^>]*>Je prends<\/a>/)
  assert.match(html, /Garba <a href="https:\/\/nido.example\/api\/action\?t=autre"[^>]*>🎲 Autre<\/a>/)
  assert.match(html, /Attiéké <a href="https:\/\/nido.example\/api\/action\?t=achete"[^>]*>✓ Acheté<\/a>/)
  assert.equal((html.match(/api\/action/g) ?? []).length, 3)
})

test('rappel mensuel seul : pas de dîners ni de courses', () => {
  const { sujet, texte } = construireEmail({ ...base, types: ['mensuel'], jours: [], mois: '2026-10-01' })
  assert.equal(sujet, 'Octobre 2026 : choisis ta charge mentale · Nido')
  assert.match(texte, /Encore sans responsable :\n- Gérer les finances/)
  assert.doesNotMatch(texte, /dîners/)
})

test('les deux le même jour : un seul email', () => {
  const { sujet } = construireEmail({ ...base, types: ['hebdo', 'mensuel'] })
  assert.equal(sujet, 'Ta semaine et ta charge de septembre 2026 · Nido')
})

test('le contenu saisi par les membres est échappé dans le HTML', () => {
  const { html } = construireEmail({
    ...base,
    types: ['hebdo'],
    prenom: '<script>alert(1)</script>',
    diners: { '2026-09-28': { nom: '<img src=x onerror=alert(1)>', lien: 'https://x/"><script>' } },
  })
  assert.doesNotMatch(html, /<script>|<img/)
  assert.equal(echapper(`<a href="x">'&`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;')
})
