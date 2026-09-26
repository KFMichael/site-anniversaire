// Chiffrement du coffre, entièrement dans le navigateur (WebCrypto).
//
// - Clé maîtresse : AES-GCM 256 bits aléatoire, créée avec le coffre. Elle
//   chiffre chaque entrée (JSON, IV aléatoire de 12 octets).
// - Elle n'est jamais stockée en clair, seulement « enveloppée » (chiffrée) :
//   - par une clé dérivée de la phrase secrète (PBKDF2-SHA256 + sel) ;
//   - par une clé dérivée du secret PRF d'une passkey (Face ID / Touch ID),
//     une enveloppe par appareil activé (HKDF-SHA256).
//   AES-GCM authentifie : une mauvaise phrase fait échouer le déchiffrement.
// - L'id de l'espace sert de données authentifiées (AAD) partout : un chiffré
//   recopié dans un autre espace ne se déchiffre pas.
//
// Aucune dépendance au navigateur hors `crypto` global : testable avec Node.

// Recommandation OWASP 2023 pour PBKDF2-HMAC-SHA256
export const ITERATIONS_PAR_DEFAUT = 600_000
export const LONGUEUR_MIN_PHRASE = 12

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

// Variante URL (identifiants de passkeys, clés de evalByCredential)
export function versBase64Url(octets) {
  return versBase64(octets).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function depuisBase64Url(texte) {
  const base64 = texte.replace(/-/g, '+').replace(/_/g, '/')
  return depuisBase64(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
}

export function octetsAleatoires(n) {
  return crypto.getRandomValues(new Uint8Array(n))
}

function donneesAuthentifiees(espaceId) {
  return encodeur.encode(`nido:${espaceId}`)
}

async function chiffrerOctets(cle, espaceId, octets) {
  const iv = octetsAleatoires(12)
  const chiffre = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: donneesAuthentifiees(espaceId) },
    cle,
    octets
  )
  return { iv: versBase64(iv), chiffre: versBase64(new Uint8Array(chiffre)) }
}

// Lève une exception si la clé est mauvaise ou le chiffré altéré
async function dechiffrerOctets(cle, espaceId, { iv, chiffre }) {
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: depuisBase64(iv), additionalData: donneesAuthentifiees(espaceId) },
    cle,
    depuisBase64(chiffre)
  )
}

// ---------------------------------------------------------------------------
// Clés d'enveloppe
// ---------------------------------------------------------------------------

export async function deriverClePhrase(phrase, selBase64, iterations) {
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

// Le secret PRF (32 octets) est déjà uniformément aléatoire : HKDF sert à
// le séparer de tout autre usage possible de la même passkey
export async function deriverClePrf(secretPrf) {
  const materiau = await crypto.subtle.importKey('raw', secretPrf, 'HKDF', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32),
      info: encodeur.encode('nido-coffre-prf-v1'),
    },
    materiau,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// ---------------------------------------------------------------------------
// Clé maîtresse
// ---------------------------------------------------------------------------

// Exportable : elle doit pouvoir être ré-enveloppée (changement de phrase,
// activation de Face ID). Elle ne vit qu'en mémoire, jamais en clair ailleurs.
export async function genererCleMaitresse() {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ])
}

export async function envelopperCle(cleEnveloppe, espaceId, cleMaitresse) {
  const brute = new Uint8Array(await crypto.subtle.exportKey('raw', cleMaitresse))
  try {
    const { iv, chiffre } = await chiffrerOctets(cleEnveloppe, espaceId, brute)
    return { cle_iv: iv, cle_enveloppee: chiffre }
  } finally {
    brute.fill(0)
  }
}

// Lève une exception si la clé d'enveloppe n'est pas la bonne
export async function desenvelopperCle(cleEnveloppe, espaceId, { cle_iv, cle_enveloppee }) {
  const brute = new Uint8Array(
    await dechiffrerOctets(cleEnveloppe, espaceId, { iv: cle_iv, chiffre: cle_enveloppee })
  )
  try {
    return await crypto.subtle.importKey('raw', brute, 'AES-GCM', true, ['encrypt', 'decrypt'])
  } finally {
    brute.fill(0)
  }
}

// Paramètres à enregistrer dans `coffres` pour une phrase donnée (création
// du coffre ou changement de phrase) : nouveau sel à chaque fois
export async function envelopperAvecPhrase(
  cleMaitresse,
  phrase,
  espaceId,
  iterations = ITERATIONS_PAR_DEFAUT
) {
  const sel = versBase64(octetsAleatoires(16))
  const cleEnveloppe = await deriverClePhrase(phrase, sel, iterations)
  return { sel, iterations, ...(await envelopperCle(cleEnveloppe, espaceId, cleMaitresse)) }
}

export async function preparerCoffre(phrase, espaceId, iterations = ITERATIONS_PAR_DEFAUT) {
  const cle = await genererCleMaitresse()
  return { cle, parametres: await envelopperAvecPhrase(cle, phrase, espaceId, iterations) }
}

// Renvoie la clé maîtresse si la phrase est la bonne, null sinon
export async function ouvrirCoffre(phrase, espaceId, coffre) {
  const cleEnveloppe = await deriverClePhrase(phrase, coffre.sel, coffre.iterations)
  try {
    return await desenvelopperCle(cleEnveloppe, espaceId, coffre)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Entrées
// ---------------------------------------------------------------------------

export async function chiffrerEntree(cle, espaceId, entree) {
  return chiffrerOctets(cle, espaceId, encodeur.encode(JSON.stringify(entree)))
}

export async function dechiffrerEntree(cle, espaceId, ligne) {
  return JSON.parse(decodeur.decode(await dechiffrerOctets(cle, espaceId, ligne)))
}

// ---------------------------------------------------------------------------
// Générateur
// ---------------------------------------------------------------------------

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
