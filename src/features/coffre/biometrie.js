// Face ID / Touch ID pour le coffre, via une passkey WebAuthn et son
// extension PRF : à chaque vérification biométrique, l'appareil renvoie un
// secret de 32 octets, toujours le même pour une passkey et un « sel » donnés,
// calculé dans la puce sécurisée. Ce secret enveloppe la clé du coffre.
//
// Pas de vérification côté serveur de la signature WebAuthn : elle n'apporte
// rien ici, la sécurité repose sur le secret PRF (sans lui, l'enveloppe
// stockée en base est indéchiffrable).
//
// Compatibilité : iOS/iPadOS 18+, macOS Safari 18+, Chrome/Android récents.

import { NOM_APP } from '../../config'
import { depuisBase64Url, octetsAleatoires, versBase64Url } from './crypto'

export class ErreurBiometrie extends Error {}

// Nom affiché sur les boutons selon l'appareil
export function nomBiometrie() {
  const ua = navigator.userAgent
  if (/iPhone|iPad/.test(ua)) return 'Face ID'
  if (/Macintosh/.test(ua)) return navigator.maxTouchPoints > 1 ? 'Face ID' : 'Touch ID'
  return 'la biométrie'
}

export function libelleAppareil() {
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Android/.test(ua)) return 'Android'
  if (/Windows/.test(ua)) return 'Windows'
  return 'Appareil'
}

// Un appareil capable d'une vérification biométrique intégrée. Le support de
// PRF n'est connu avec certitude qu'à la création de la passkey, sauf sur les
// navigateurs récents qui exposent getClientCapabilities().
export async function biometrieDisponible() {
  if (!window.PublicKeyCredential || !window.isSecureContext) return false
  try {
    if (PublicKeyCredential.getClientCapabilities) {
      const capacites = await PublicKeyCredential.getClientCapabilities()
      if (capacites['extension:prf'] === false) return false
    }
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

// Identifiant utilisateur WebAuthn distinct par espace : une passkey
// iCloud remplace toute passkey existante du même site avec le même user.id,
// on ne veut pas que l'activation dans un espace casse celle d'un autre.
async function identifiantPasskey(utilisateurId, espaceId) {
  const empreinte = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${utilisateurId}:${espaceId}`)
  )
  return new Uint8Array(empreinte).slice(0, 32)
}

function traduireErreur(e) {
  if (e instanceof ErreurBiometrie) return e
  if (e?.name === 'NotAllowedError') {
    return new ErreurBiometrie(
      'Opération annulée, ou la passkey du coffre a été supprimée de cet appareil. Utilise la phrase secrète.'
    )
  }
  if (e?.name === 'InvalidStateError') {
    return new ErreurBiometrie('Une passkey existe déjà pour cet appareil.')
  }
  return new ErreurBiometrie(`Impossible d'utiliser ${nomBiometrie()} sur cet appareil.`)
}

async function evaluerPrf(credentialIdB64, prfSel) {
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: octetsAleatoires(32),
      allowCredentials: [{ type: 'public-key', id: depuisBase64Url(credentialIdB64) }],
      userVerification: 'required',
      extensions: { prf: { eval: { first: prfSel } } },
    },
  })
  const secret = assertion.getClientExtensionResults().prf?.results?.first
  if (!secret) {
    throw new ErreurBiometrie(`Cet appareil ne permet pas d'utiliser ${nomBiometrie()} pour le coffre (iOS 18 minimum).`)
  }
  return new Uint8Array(secret)
}

// Crée une passkey pour cet appareil et renvoie son secret PRF.
// { credentialId, prfSel (base64url), secret (Uint8Array) }
export async function creerPasskey({ utilisateur, profil, espace }) {
  const prfSel = octetsAleatoires(32)
  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        rp: { name: NOM_APP },
        user: {
          id: await identifiantPasskey(utilisateur.id, espace.id),
          name: `${utilisateur.email} · ${espace.nom}`,
          displayName: `${profil?.prenom || utilisateur.email} · coffre ${espace.nom}`,
        },
        challenge: octetsAleatoires(32),
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'required',
          userVerification: 'required',
        },
        extensions: { prf: { eval: { first: prfSel } } },
      },
    })

    const credentialId = versBase64Url(new Uint8Array(credential.rawId))
    const prf = credential.getClientExtensionResults().prf
    if (!prf?.enabled && !prf?.results) {
      throw new ErreurBiometrie(
        `Cet appareil ne permet pas d'utiliser ${nomBiometrie()} pour le coffre (iOS 18 minimum).`
      )
    }

    // Certains navigateurs renvoient le secret dès la création, d'autres
    // seulement lors d'une authentification : on en fait alors une tout de suite
    const secret = prf.results?.first
      ? new Uint8Array(prf.results.first)
      : await evaluerPrf(credentialId, prfSel)

    return { credentialId, prfSel: versBase64Url(prfSel), secret }
  } catch (e) {
    throw traduireErreur(e)
  }
}

// Demande Face ID pour l'un des appareils enregistrés de l'utilisateur
// (celui dont la passkey est présente sur cet appareil).
// Renvoie { appareil, secret }.
export async function authentifier(appareils) {
  const parCredential = Object.fromEntries(appareils.map((a) => [a.credential_id, a]))
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: octetsAleatoires(32),
        allowCredentials: appareils.map((a) => ({
          type: 'public-key',
          id: depuisBase64Url(a.credential_id),
        })),
        userVerification: 'required',
        extensions: {
          prf: {
            evalByCredential: Object.fromEntries(
              appareils.map((a) => [a.credential_id, { first: depuisBase64Url(a.prf_sel) }])
            ),
          },
        },
      },
    })

    const appareil = parCredential[versBase64Url(new Uint8Array(assertion.rawId))]
    const secret = assertion.getClientExtensionResults().prf?.results?.first
    if (!appareil || !secret) {
      throw new ErreurBiometrie(
        `Impossible d'ouvrir le coffre avec ${nomBiometrie()} : utilise la phrase secrète.`
      )
    }
    return { appareil, secret: new Uint8Array(secret) }
  } catch (e) {
    throw traduireErreur(e)
  }
}

// Passkeys créées sur CET appareil, par espace. La base connaît tous les
// appareils de l'utilisateur, mais on ne propose Face ID que là où il a été
// activé (sinon le navigateur ouvre l'assistant « utiliser un téléphone »).
const cleLocale = (espaceId) => `coffre-passkeys:${espaceId}`

export function passkeysLocales(espaceId) {
  try {
    return JSON.parse(localStorage.getItem(cleLocale(espaceId)) ?? '[]')
  } catch {
    return []
  }
}

export function memoriserPasskeyLocale(espaceId, credentialId) {
  try {
    const liste = passkeysLocales(espaceId).filter((id) => id !== credentialId)
    localStorage.setItem(cleLocale(espaceId), JSON.stringify([...liste, credentialId]))
  } catch {
    // stockage indisponible : Face ID ne sera simplement pas proposé ici
  }
}

export function oublierPasskeyLocale(espaceId, credentialId) {
  try {
    const liste = passkeysLocales(espaceId).filter((id) => id !== credentialId)
    localStorage.setItem(cleLocale(espaceId), JSON.stringify(liste))
  } catch {
    // rien à faire
  }
}
