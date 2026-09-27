import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  dateSuivante,
  joursRestants,
  libelleDate,
  libelleDelai,
  marquerFaite,
  prochainJourAnnuel,
  rappelsDuJour,
  regrouper,
} from './echeances.js'

test('jours restants et libellés', () => {
  assert.equal(joursRestants('2026-10-15', '2026-09-27'), 18)
  assert.equal(joursRestants('2026-03-30', '2026-03-28'), 2) // passage à l'heure d'été sans décalage
  assert.equal(joursRestants('2026-09-20', '2026-09-27'), -7)
  assert.deepEqual([0, 1, 5, -1, -3].map(libelleDelai), ["aujourd'hui", 'demain', 'dans 5 jours', 'hier', 'en retard de 3 jours'])
  assert.equal(libelleDate('2027-05-21'), 'vendredi 21 mai 2027')
})

test('date suivante : fin de mois et 29 février', () => {
  assert.equal(dateSuivante('2026-01-31', 'mensuelle'), '2026-02-28')
  assert.equal(dateSuivante('2026-12-05', 'mensuelle'), '2027-01-05')
  assert.equal(dateSuivante('2028-02-29', 'annuelle'), '2029-02-28')
  assert.equal(prochainJourAnnuel('05-21', '2026-09-27'), '2027-05-21')
  assert.equal(prochainJourAnnuel('10-15', '2026-09-27'), '2026-10-15')
  assert.equal(prochainJourAnnuel('09-27', '2026-09-27'), '2026-09-27')
})

test('marquer fait : récurrente avancée (même très en retard), ponctuelle terminée', () => {
  assert.deepEqual(marquerFaite({ date: '2026-09-01', recurrence: 'mensuelle' }, '2026-09-27'), { date: '2026-10-01', faite_le: null })
  assert.deepEqual(marquerFaite({ date: '2026-05-05', recurrence: 'mensuelle' }, '2026-09-27'), { date: '2026-10-05', faite_le: null })
  assert.deepEqual(marquerFaite({ date: '2026-05-21', recurrence: 'annuelle' }, '2026-09-27'), { date: '2027-05-21', faite_le: null })
  const maintenant = new Date('2026-09-27T10:00:00Z')
  assert.deepEqual(marquerFaite({ date: '2026-10-01', recurrence: 'aucune' }, '2026-09-27', maintenant), { faite_le: '2026-09-27T10:00:00.000Z' })
})

test('regroupement et rappels du jour', () => {
  const echeances = [
    { id: 'retard', date: '2026-09-20', rappels: [0] },
    { id: 'demain', date: '2026-09-28', rappels: [7, 1] },
    { id: 'j7', date: '2026-10-04', rappels: [7, 1] },
    { id: 'loin', date: '2027-05-21', rappels: [30] },
    { id: 'faite', date: '2026-09-28', rappels: [1], faite_le: '2026-09-26T08:00:00Z' },
  ]
  const g = regrouper(echeances, '2026-09-27')
  assert.deepEqual(
    Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.map((e) => e.id)])),
    { enRetard: ['retard'], bientot: ['demain', 'j7'], plusTard: ['loin'], faites: ['faite'] }
  )
  assert.deepEqual(
    rappelsDuJour(echeances, '2026-09-27').map((r) => [r.echeance.id, r.jours]),
    [['demain', 1], ['j7', 7]]
  )
})
