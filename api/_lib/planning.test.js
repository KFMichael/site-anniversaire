import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dateLocale, envoisDuJour, periodeCouverte } from './planning.js'

test('date locale selon le fuseau du foyer', () => {
  // Dimanche 27 septembre 2026, 23h30 UTC : déjà lundi à Paris, encore dimanche à Abidjan
  const instant = new Date('2026-09-27T23:30:00Z')
  assert.deepEqual(dateLocale(instant, 'Europe/Paris'), { iso: '2026-09-28', jourSemaine: 1 })
  assert.deepEqual(dateLocale(instant, 'Africa/Abidjan'), { iso: '2026-09-27', jourSemaine: 0 })
})

test('dimanche : récap de la semaine suivante', () => {
  assert.deepEqual(envoisDuJour({ iso: '2026-09-27', jourSemaine: 0 }), [
    { type: 'hebdo', periode: '2026-09-28' },
  ])
})

test('le 1er : rappel mensuel ; un 1er qui tombe un dimanche : les deux', () => {
  assert.deepEqual(envoisDuJour({ iso: '2026-10-01', jourSemaine: 4 }), [
    { type: 'mensuel', periode: '2026-10' },
  ])
  assert.deepEqual(envoisDuJour({ iso: '2026-11-01', jourSemaine: 0 }), [
    { type: 'hebdo', periode: '2026-11-02' },
    { type: 'mensuel', periode: '2026-11' },
  ])
  assert.deepEqual(envoisDuJour({ iso: '2026-09-29', jourSemaine: 2 }), [])
})

test('période couverte : la semaine à venir et le mois de son lundi', () => {
  // Dimanche 31 mai : la semaine commence le lundi 1er juin → charges de juin
  const envois = envoisDuJour({ iso: '2026-05-31', jourSemaine: 0 })
  const periode = periodeCouverte('2026-05-31', envois)
  assert.equal(periode.jours[0], '2026-06-01')
  assert.equal(periode.jours.length, 7)
  assert.equal(periode.mois, '2026-06-01')
})
