// Envoi d'un email via l'API Resend (https://resend.com/docs/api-reference)
export function creerEnvoiResend({ cleApi, expediteur }) {
  return async function envoyer({ a, sujet, html, texte }) {
    const reponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cleApi}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: expediteur, to: [a], subject: sujet, html, text: texte }),
    })
    if (!reponse.ok) throw new Error(`Resend ${reponse.status} : ${await reponse.text()}`)
  }
}
