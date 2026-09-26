// Chiffrement du coffre, entièrement dans le navigateur (WebCrypto).
//
// - Clé : PBKDF2-SHA256 sur la phrase secrète + un sel aléatoire propre à
//   l'espace -> clé AES-GCM 256 bits, non exportable, gardée en mémoire.
// - Chaque entrée : JSON chiffré en AES-GCM avec un IV aléatoire de 12 octets.
//   L'id de l'espace sert de données authentifiées (AAD) : un chiffré copié
//   dans un autre espace ne se déchiffre pas.
// - Vérificateur : une valeur connue chiffrée avec la clé. Si on arrive à le
//   déchiffrer, la phrase saisie est la bonne.
//
// Aucune dépendance au navigateur hors `crypto` global : testable avec Node.

// Recommandation OWASP 2023 pour PBKDF2-HMAC-SHA256
export const ITERATIONS_PAR_DEFAUT = 600_000
export const LONGUEUR_MIN_PHRASE = 12

const VALEUR_VERIFICATEUR = 'nido-coffre-v1'
const encodeur = new TextEncoder()
const decodeur = new TextDecoder()

export function versBase64(octets) {
  let binaire = ''
  for (const o of octets) binaire += String.fromCharCode(o)
  return btoa(binaire)
}

export function depuisBase64(texte) {
  return Uint8Array.from(atob(texte), (c) => c.charCodeAt(0))
}

function octetsAleatoires(n) {
  return crypto.getRandomValues(new Uint8Array(n))
}

function donneesAuthentifiees(espaceId) {
  return encodeur.encode(`nido:${espaceId}`)
}

export async function deriverCle(phrase, selBase64, iterations) {
  const materiau = await crypto.subtle.importKey(
    'raw',
    encodeur.encode(phrase.normalize('NFC')),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: depuisBase64(selBase64), iterations },
    materiau,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

async function chiffrerTexte(cle, espaceId, texte) {
  const iv = octetsAleatoires(12)
  const chiffre = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: donneesAuthentifiees(espaceId) },
    cle,
    encodeur.encode(texte)
  )
  return { iv: versBase64(iv), chiffre: versBase64(new Uint8Array(chiffre)) }
}

// Lève une exception si la clé est mauvaise ou le chiffré altéré
async function dechiffrerTexte(cle, espaceId, { iv, chiffre }) {
  const clair = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: depuisBase64(iv), additionalData: donneesAuthentifiees(espaceId) },
    cle,
    depuisBase64(chiffre)
  )
  return decodeur.decode(clair)
}

export async function chiffrerEntree(cle, espaceId, entree) {
  return chiffrerTexte(cle, espaceId, JSON.stringify(entree))
}

export async function dechiffrerEntree(cle, espaceId, ligne) {
  return JSON.parse(await dechiffrerTexte(cle, espaceId, ligne))
}

// Paramètres d'un nouveau coffre (ou d'un changement de phrase) : nouveau
// sel, clé dérivée et vérificateur, prêts à enregistrer dans `coffres`
export async function preparerCoffre(phrase, espaceId, iterations = ITERATIONS_PAR_DEFAUT) {
  const sel = versBase64(octetsAleatoires(16))
  const cle = await deriverCle(phrase, sel, iterations)
  const verif = await chiffrerTexte(cle, espaceId, VALEUR_VERIFICATEUR)
  return {
    cle,
    parametres: { sel, iterations, verificateur_iv: verif.iv, verificateur: verif.chiffre },
  }
}

// Renvoie la clé si la phrase est la bonne, null sinon
export async function ouvrirCoffre(phrase, espaceId, coffre) {
  const cle = await deriverCle(phrase, coffre.sel, coffre.iterations)
  try {
    const valeur = await dechiffrerTexte(cle, espaceId, {
      iv: coffre.verificateur_iv,
      chiffre: coffre.verificateur,
    })
    return valeur === VALEUR_VERIFICATEUR ? cle : null
  } catch {
    return null
  }
}

const ALPHABET_MDP =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*-_=+?'

// Mot de passe aléatoire sans caractères ambigus (0/O, 1/l/I). Tirage par
// rejet pour éviter le biais du modulo.
export function genererMotDePasse(longueur = 20) {
  const limite = 256 - (256 % ALPHABET_MDP.length)
  let resultat = ''
  while (resultat.length < longueur) {
    for (const o of octetsAleatoires(longueur * 2)) {
      if (o < limite && resultat.length < longueur) {
        resultat += ALPHABET_MDP[o % ALPHABET_MDP.length]
      }
    }
  }
  return resultat
}
