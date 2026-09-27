// Import d'un export CSV de mots de passe (Apple Mots de passe, Chrome, Edge,
// Firefox, Bitwarden, 1Password, LastPass, KeePass, Dashlane…).
// Logique pure, exécutée dans le navigateur : le fichier n'est jamais envoyé,
// chaque entrée est chiffrée avant l'enregistrement (CoffreProvider).
// Testé par import-csv.test.js.

import { CATEGORIES } from './categories.js'

export const TAILLE_MAX_OCTETS = 2 * 1024 * 1024
export const ENTREES_MAX = 1000

// Lecture CSV (RFC 4180) : guillemets, guillemets doublés, retours à la
// ligne dans une valeur, fins de ligne CRLF, BOM ; séparateur « , » ou « ; »
// (Excel en français) détecté sur la première ligne.
export function lireCsv(texte) {
  const source = texte.replace(/^﻿/, '')
  const premiereLigne = source.split(/\r?\n/, 1)[0] ?? ''
  const separateur = (premiereLigne.match(/;/g)?.length ?? 0) > (premiereLigne.match(/,/g)?.length ?? 0) ? ';' : ','

  const lignes = []
  let ligne = []
  let valeur = ''
  let entreGuillemets = false
  for (let i = 0; i < source.length; i += 1) {
    const c = source[i]
    if (entreGuillemets) {
      if (c === '"' && source[i + 1] === '"') {
        valeur += '"'
        i += 1
      } else if (c === '"') {
        entreGuillemets = false
      } else {
        valeur += c
      }
    } else if (c === '"') {
      entreGuillemets = true
    } else if (c === separateur) {
      ligne.push(valeur)
      valeur = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && source[i + 1] === '\n') i += 1
      ligne.push(valeur)
      lignes.push(ligne)
      ligne = []
      valeur = ''
    } else {
      valeur += c
    }
  }
  if (valeur !== '' || ligne.length) {
    ligne.push(valeur)
    lignes.push(ligne)
  }
  return lignes.filter((l) => l.some((v) => v.trim() !== ''))
}

// Noms de colonnes possibles pour chaque champ, selon l'outil d'origine
const COLONNES = {
  nom: ['title', 'name', 'titre', 'nom', 'account', 'item name'],
  categorie: ['catégorie', 'categorie'],
  url: ['url', 'login_uri', 'website', 'web site', 'site', 'site web', 'uri', 'urls'],
  identifiant: ['username', 'login_username', 'login name', 'login', 'identifiant', "nom d'utilisateur", 'email'],
  motDePasse: ['password', 'login_password', 'mot de passe'],
  note: ['notes', 'note', 'extra', 'comments', 'comment', 'remarques'],
  dossier: ['folder', 'grouping', 'group', 'category', 'dossier'],
  type: ['type'],
}

// Pour chaque champ, la première colonne trouvée dans l'ordre de préférence
function indexColonnes(entetes) {
  const normalisees = entetes.map((e) => e.trim().toLowerCase())
  return Object.fromEntries(
    Object.entries(COLONNES).map(([champ, noms]) => {
      const nom = noms.find((n) => normalisees.includes(n))
      return [champ, nom ? normalisees.indexOf(nom) : -1]
    })
  )
}

// « https://www.netflix.com/login » → « netflix.com »
export function domaine(url) {
  if (!url) return ''
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

// Catégorie devinée à partir du nom, de l'adresse et du dossier d'origine
const MOTS_CLES = [
  ['wifi', ['wifi', 'wi-fi', 'box', 'livebox', 'freebox', 'bbox', 'sfr box', 'routeur']],
  ['banque', ['banque', 'bank', 'crédit', 'credit agricole', 'bnp', 'societegenerale', 'société générale', 'lcl', 'boursorama', 'revolut', 'n26', 'paypal', 'caisse', 'fortuneo', 'hellobank', 'ecobank', 'orange money', 'wave']],
  ['streaming', ['netflix', 'disney', 'prime video', 'primevideo', 'spotify', 'deezer', 'canal', 'youtube', 'apple tv', 'mycanal', 'molotov', 'max.com', 'crunchyroll']],
  ['sante', ['ameli', 'doctolib', 'mutuelle', 'santé', 'sante', 'pharmacie', 'hopital', 'hôpital', 'alan']],
  ['admin', ['impots', 'impôts', 'caf', 'urssaf', 'ants', 'service-public', 'franceconnect', 'pole-emploi', 'france travail', 'francetravail', 'edf', 'engie', 'assurance', 'la poste', 'laposte']],
  ['courses', ['amazon', 'carrefour', 'leclerc', 'auchan', 'intermarche', 'monoprix', 'uber eats', 'ubereats', 'deliveroo', 'jumia', 'glovo', 'picard', 'drive']],
  ['voyage', ['airbnb', 'booking', 'sncf', 'air france', 'airfrance', 'easyjet', 'ryanair', 'corsair', 'air cote', 'expedia', 'blablacar', 'trainline', 'ouigo']],
  ['maison', ['alarme', 'digicode', 'portail', 'syndic', 'nest', 'netatmo', 'maison']],
]

// Mot entier uniquement (« caf » ne correspond pas à « café »)
function contientMot(texte, mot) {
  const echappe = mot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^\\p{L}\\p{N}])${echappe}($|[^\\p{L}\\p{N}])`, 'u').test(texte)
}

export function devinerCategorie(...textes) {
  const texte = textes.filter(Boolean).join(' ').toLowerCase()
  const trouvee = MOTS_CLES.find(([, mots]) => mots.some((m) => contientMot(texte, m)))
  return trouvee ? trouvee[0] : 'autre'
}

// Catégorie écrite telle quelle (modèle Nido) : « Banque », « wifi », « Wi-Fi & box »…
function categorieEcrite(texte) {
  const t = texte.trim().toLowerCase()
  if (!t) return null
  return CATEGORIES.find((c) => c.valeur === t || c.label.toLowerCase() === t)?.valeur ?? null
}

// Modèle proposé au téléchargement : colonnes en français, séparateur « ; »
// (ouvert directement par Excel en français, Numbers, Google Sheets)
export const MODELE_CSV = [
  'nom;catégorie;identifiant;mot de passe;site;note',
  'Wi-Fi maison;Wi-Fi & box;Livebox-1234;exemple-à-remplacer;;Code WPS au dos de la box',
  'Netflix;Streaming;prenom@exemple.fr;exemple-à-remplacer;https://www.netflix.com;',
  'Code du portail;Maison;;1234;;',
  'Ameli;Santé;1 23 45 67 890 123;exemple-à-remplacer;https://www.ameli.fr;',
].join('\r\n')

function couper(texte, max) {
  return (texte ?? '').trim().slice(0, max)
}

// Clé de comparaison pour repérer un doublon (même nom et même identifiant)
export function cleDoublon({ nom, identifiant }) {
  const norm = (t) =>
    (t ?? '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim()
      .toLowerCase()
  return `${norm(nom)}|${norm(identifiant)}`
}

// Convertit le texte du fichier en entrées du coffre.
// Renvoie { entrees, ignorees, erreur } :
// - entrees : [{ nom, categorie, identifiant, motDePasse, url, note, doublon }]
// - ignorees : lignes sans mot de passe ni note (cartes bancaires,
//   identités… d'un autre gestionnaire)
// - erreur : message si le fichier n'est pas reconnu
export function convertirCsv(texte, existantes = []) {
  const lignes = lireCsv(texte)
  if (lignes.length < 2) return { entrees: [], ignorees: 0, erreur: 'Le fichier est vide.' }
  const col = indexColonnes(lignes[0])
  if (col.motDePasse < 0) {
    return {
      entrees: [],
      ignorees: 0,
      erreur: "Ce fichier ne ressemble pas à un export de mots de passe (pas de colonne « password »).",
    }
  }

  const connues = new Set(existantes.map(cleDoublon))
  const vues = new Set()
  const entrees = []
  let ignorees = 0
  for (const ligne of lignes.slice(1)) {
    const lire = (champ) => (col[champ] >= 0 ? (ligne[col[champ]] ?? '') : '')
    const type = lire('type').trim().toLowerCase()
    const motDePasse = lire('motDePasse').slice(0, 500)
    const note = couper(lire('note'), 2000)
    // Bitwarden : seuls les identifiants et les notes sécurisées
    if ((type && !['login', 'note', 'securenote'].includes(type)) || (!motDePasse && !note)) {
      ignorees += 1
      continue
    }
    const url = couper(lire('url'), 500)
    const identifiant = couper(lire('identifiant'), 200)
    const nom = couper(lire('nom'), 80) || domaine(url).slice(0, 80) || identifiant.slice(0, 80) || 'Sans nom'
    const entree = {
      nom,
      categorie: categorieEcrite(lire('categorie')) ?? devinerCategorie(nom, url, lire('dossier'), lire('categorie')),
      identifiant,
      motDePasse,
      url,
      note,
    }
    const cle = cleDoublon(entree)
    // Déjà dans le coffre, ou répété dans le fichier : décoché par défaut
    entree.doublon = connues.has(cle) || vues.has(cle)
    vues.add(cle)
    entrees.push(entree)
  }
  if (entrees.length > ENTREES_MAX) {
    return { entrees: [], ignorees, erreur: `Le fichier contient plus de ${ENTREES_MAX} entrées : importe-le en plusieurs fois.` }
  }
  return { entrees, ignorees, erreur: entrees.length ? null : 'Aucun mot de passe trouvé dans ce fichier.' }
}
