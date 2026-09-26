// Fichier d'agenda iCalendar (RFC 5545) pour une invitation : METHOD REQUEST
// (création ou mise à jour, même UID et SEQUENCE croissante) ou CANCEL.
// Compris par Gmail / Google Agenda, Apple Calendrier et Outlook.

function horodatageUtc(date) {
  return new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

// Échappement des valeurs texte (RFC 5545 §3.3.11)
export function echapperIcs(texte) {
  return String(texte ?? '')
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replace(/\r?\n/g, '\\n')
}

// Paramètre entre guillemets (CN="…") : pas de guillemets ni de retours
function parametre(texte) {
  return `"${String(texte ?? '').replace(/["\r\n]/g, '')}"`
}

// Lignes de 75 octets au plus, continuées par une espace (§3.1), sans
// couper un caractère UTF-8
export function plierLigne(ligne) {
  const octets = new TextEncoder()
  const morceaux = []
  let courant = ''
  for (const caractere of ligne) {
    const limite = morceaux.length === 0 ? 75 : 74
    if (octets.encode(courant + caractere).length > limite) {
      morceaux.push(courant)
      courant = caractere
    } else {
      courant += caractere
    }
  }
  morceaux.push(courant)
  return morceaux.join('\r\n ')
}

// seance : { id, debut, duree_minutes, sequence }
// organisateur / participants : { nom, email }
export function invitationIcs({ methode, seance, organisateur, participants, domaine, titre, description, maintenant = new Date() }) {
  const debut = new Date(seance.debut)
  const fin = new Date(debut.getTime() + seance.duree_minutes * 60000)
  const lignes = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nido//Sport//FR',
    'CALSCALE:GREGORIAN',
    `METHOD:${methode}`,
    'BEGIN:VEVENT',
    `UID:${seance.id}@${domaine}`,
    `SEQUENCE:${seance.sequence}`,
    `DTSTAMP:${horodatageUtc(maintenant)}`,
    `DTSTART:${horodatageUtc(debut)}`,
    `DTEND:${horodatageUtc(fin)}`,
    `SUMMARY:${echapperIcs(titre)}`,
    `DESCRIPTION:${echapperIcs(description)}`,
    `ORGANIZER;CN=${parametre(organisateur.nom)}:mailto:${organisateur.email}`,
    ...participants.map(
      (p) => `ATTENDEE;CN=${parametre(p.nom)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${p.email}`
    ),
    `STATUS:${methode === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED'}`,
    'TRANSP:OPAQUE',
    ...(methode === 'CANCEL'
      ? []
      : ['BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Séance de sport', 'TRIGGER:-PT30M', 'END:VALARM']),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lignes.map(plierLigne).join('\r\n') + '\r\n'
}
