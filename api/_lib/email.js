// Contenu du récap par email (logique pure, testée par email.test.js) :
// sujet, version HTML et version texte, à partir des données d'un membre.
import { libelleMois } from '../../src/features/charge/calculs.js'
import { libelleJour, libelleSemaine } from '../../src/features/menus/tirage.js'

export function echapper(texte) {
  return String(texte ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

const STYLES = {
  corps: 'margin:0;padding:24px 12px;background:#F2F2F7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#000000;',
  carte: 'max-width:560px;margin:0 auto 16px;padding:20px;background:#FFFFFF;border-radius:20px;',
  titre: 'margin:0 0 12px;font-size:18px;',
  texte: 'margin:0 0 8px;font-size:15px;line-height:1.5;color:#48484A;',
  liste: 'margin:0;padding-left:20px;font-size:15px;line-height:1.7;',
  bouton: 'display:inline-block;padding:12px 24px;background:#0071EB;color:#FFFFFF;border-radius:999px;text-decoration:none;font-weight:600;',
}

function section(titre, contenuHtml) {
  return `<div style="${STYLES.carte}"><h2 style="${STYLES.titre}">${titre}</h2>${contenuHtml}</div>`
}

function listeHtml(elements) {
  return `<ul style="${STYLES.liste}">${elements.map((e) => `<li>${e}</li>`).join('')}</ul>`
}

// donnees : {
//   nomApp, lienApp, prenom, espaceNom,
//   types: ['hebdo' | 'mensuel'], jours: [iso], mois: 'AAAA-MM-01',
//   mesCharges: [{ emoji, nom }], chargesLibres: [{ emoji, nom }],
//   diners: { [iso]: nom | null },
//   courses: { aAcheter: [nom], bientot: [nom] }
// }
export function construireEmail(d) {
  const hebdo = d.types.includes('hebdo')
  const mensuel = d.types.includes('mensuel')
  const moisLibelle = libelleMois(d.mois)
  const html = []
  const texte = [`Bonjour ${d.prenom},`, '']

  let sujet
  if (hebdo && mensuel) sujet = `Ta semaine et ta charge de ${moisLibelle.toLowerCase()}`
  else if (hebdo) sujet = `Ta semaine : ${libelleSemaine(d.jours[0]).toLowerCase()}`
  else sujet = `${moisLibelle} : choisis ta charge mentale`
  sujet = `${sujet} · ${d.nomApp}`

  html.push(
    `<p style="${STYLES.texte};max-width:560px;margin:0 auto 16px;">Bonjour ${echapper(d.prenom)}, voici le point pour <strong>${echapper(d.espaceNom)}</strong>.</p>`
  )

  if (mensuel) {
    const libres = d.chargesLibres.map((c) => `${echapper(c.emoji)} ${echapper(c.nom)}`)
    html.push(
      section(
        `🧠 ${echapper(moisLibelle)} : choisis ta charge mentale`,
        (d.mesCharges.length
          ? `<p style="${STYLES.texte}">Tu as déjà pris : ${d.mesCharges.map((c) => echapper(c.nom)).join(', ')}.</p>`
          : `<p style="${STYLES.texte}">Tu n'as encore pris aucune charge ce mois-ci.</p>`) +
          (libres.length
            ? `<p style="${STYLES.texte}">Encore sans responsable :</p>${listeHtml(libres)}`
            : `<p style="${STYLES.texte}">✅ Toutes les charges ont un responsable.</p>`)
      )
    )
    texte.push(`${moisLibelle} : choisis ta charge mentale`)
    texte.push(
      d.mesCharges.length
        ? `Tu as déjà pris : ${d.mesCharges.map((c) => c.nom).join(', ')}.`
        : "Tu n'as encore pris aucune charge ce mois-ci."
    )
    if (d.chargesLibres.length) {
      texte.push('Encore sans responsable :', ...d.chargesLibres.map((c) => `- ${c.nom}`))
    }
    texte.push('')
  }

  if (hebdo) {
    if (!mensuel) {
      html.push(
        section(
          `🧠 Tes charges de ${echapper(moisLibelle.toLowerCase())}`,
          d.mesCharges.length
            ? listeHtml(d.mesCharges.map((c) => `${echapper(c.emoji)} ${echapper(c.nom)}`))
            : `<p style="${STYLES.texte}">Aucune pour l'instant.</p>`
        ) +
          (d.chargesLibres.length
            ? `<p style="${STYLES.texte};max-width:560px;margin:-8px auto 16px;">⚠️ ${d.chargesLibres.length} charge${d.chargesLibres.length > 1 ? 's' : ''} sans responsable.</p>`
            : '')
      )
      texte.push(`Tes charges de ${moisLibelle.toLowerCase()} :`)
      texte.push(...(d.mesCharges.length ? d.mesCharges.map((c) => `- ${c.nom}`) : ['Aucune pour l’instant.']))
      texte.push('')
    }

    const lignes = d.jours.map((j) => `<strong>${echapper(libelleJour(j))}</strong> : ${d.diners[j] ? echapper(d.diners[j]) : '<span style="color:#6B6B70;">rien de prévu</span>'}`)
    html.push(section(`🍽️ Les dîners, ${echapper(libelleSemaine(d.jours[0]).toLowerCase())}`, listeHtml(lignes)))
    texte.push(`Les dîners, ${libelleSemaine(d.jours[0]).toLowerCase()} :`)
    texte.push(...d.jours.map((j) => `- ${libelleJour(j)} : ${d.diners[j] ?? 'rien de prévu'}`))
    texte.push('')

    const { aAcheter, bientot } = d.courses
    const total = aAcheter.length + bientot.length
    html.push(
      section(
        `🛒 Liste de courses (${total})`,
        total
          ? listeHtml([
              ...aAcheter.map(echapper),
              ...bientot.map((n) => `${echapper(n)} <span style="color:#6B6B70;">(presque fini)</span>`),
            ])
          : `<p style="${STYLES.texte}">Rien à acheter pour l'instant 🎉</p>`
      )
    )
    texte.push(`Liste de courses (${total}) :`)
    texte.push(...aAcheter.map((n) => `- ${n}`), ...bientot.map((n) => `- ${n} (presque fini)`))
    texte.push('')
  }

  html.push(
    `<div style="max-width:560px;margin:0 auto;text-align:center;"><a href="${echapper(d.lienApp)}" style="${STYLES.bouton}">Ouvrir ${echapper(d.nomApp)}</a>` +
      `<p style="font-size:12px;color:#6B6B70;margin-top:16px;">Tu reçois cet email car tu fais partie de l'espace ${echapper(d.espaceNom)}. Pour ne plus le recevoir : ${echapper(d.nomApp)} › Espace › Emails.</p></div>`
  )
  texte.push(`Ouvrir ${d.nomApp} : ${d.lienApp}`)
  texte.push(`Pour ne plus recevoir cet email : ${d.nomApp} › Espace › Emails.`)

  return {
    sujet,
    html: `<!doctype html><html lang="fr"><body style="${STYLES.corps}">${html.join('')}</body></html>`,
    texte: texte.join('\n'),
  }
}
