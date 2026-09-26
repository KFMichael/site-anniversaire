// Envoi d'un email via l'API Resend (https://resend.com/docs/api-reference)
export function creerEnvoiResend({ cleApi, expediteur }) {
  // pieces : [{ nom, contenu (texte), type }] — ex. invitation .ics
  return async function envoyer({ a, sujet, html, texte, pieces = [] }) {
    const reponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cleApi}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: expediteur,
        to: [a],
        subject: sujet,
        html,
        text: texte,
        attachments: pieces.map((p) => ({
          filename: p.nom,
          content: Buffer.from(p.contenu).toString('base64'),
          content_type: p.type,
        })),
      }),
    })
    if (!reponse.ok) throw new Error(`Resend ${reponse.status} : ${await reponse.text()}`)
  }
}
