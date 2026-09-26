import { test } from 'node:test'
import assert from 'node:assert/strict'
import { echapperIcs, invitationIcs, plierLigne } from './ics.js'

const BASE = {
  seance: { id: 's1', debut: '2026-09-28T16:30:00Z', duree_minutes: 45, sequence: 2 },
  organisateur: { nom: 'Michael', email: 'michael@exemple.fr' },
  participants: [{ nom: 'Léa', email: 'lea@exemple.fr' }],
  domaine: 'nido.4sept.com',
  titre: '🏃 Sport',
  description: 'Planifiée par Michael, dans Nido',
  maintenant: new Date('2026-09-26T10:00:00Z'),
}

test('invitation : dates UTC, 45 min, UID stable, séquence, participants, rappel', () => {
  const ics = invitationIcs({ ...BASE, methode: 'REQUEST' })
  const deplie = ics.replace(/\r\n /g, '')
  assert.ok(ics.endsWith('\r\n'))
  assert.ok(!/[^\r]\n/.test(ics), 'fins de ligne CRLF uniquement')
  for (const attendu of [
    'METHOD:REQUEST',
    'UID:s1@nido.4sept.com',
    'SEQUENCE:2',
    'DTSTAMP:20260926T100000Z',
    'DTSTART:20260928T163000Z',
    'DTEND:20260928T171500Z',
    'SUMMARY:🏃 Sport',
    'DESCRIPTION:Planifiée par Michael\\, dans Nido',
    'ORGANIZER;CN="Michael":mailto:michael@exemple.fr',
    'ATTENDEE;CN="Léa";ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:lea@exemple.fr',
    'STATUS:CONFIRMED',
    'TRIGGER:-PT30M',
  ]) {
    assert.ok(deplie.includes(attendu), attendu)
  }
})

test('annulation : même UID, statut annulé, pas de rappel', () => {
  const ics = invitationIcs({ ...BASE, methode: 'CANCEL' })
  assert.match(ics, /METHOD:CANCEL/)
  assert.match(ics, /STATUS:CANCELLED/)
  assert.match(ics, /UID:s1@nido.4sept.com/)
  assert.doesNotMatch(ics, /VALARM/)
})

test('échappement et lignes pliées à 75 octets sans couper un caractère', () => {
  assert.equal(echapperIcs('a;b,c\\d\ne'), 'a\\;b\\,c\\\\d\\ne')
  const longue = 'DESCRIPTION:' + 'é'.repeat(80)
  const pliee = plierLigne(longue)
  for (const ligne of pliee.split('\r\n')) assert.ok(new TextEncoder().encode(ligne).length <= 75)
  assert.equal(pliee.replace(/\r\n /g, ''), longue)
  // Un nom avec guillemets ne casse pas le paramètre CN
  const ics = invitationIcs({ ...BASE, methode: 'REQUEST', organisateur: { nom: 'Mi"chael\n', email: 'm@x.fr' } })
  assert.match(ics.replace(/\r\n /g, ''), /ORGANIZER;CN="Michael":mailto:m@x.fr/)
})
