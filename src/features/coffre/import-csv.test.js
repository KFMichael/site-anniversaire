import { test } from 'node:test'
import assert from 'node:assert/strict'
import { convertirCsv, devinerCategorie, domaine, lireCsv, MODELE_CSV } from './import-csv.js'

test('lecture CSV : guillemets, virgules et retours à la ligne dans une valeur, CRLF, BOM', () => {
  const texte = '﻿name,password,note\r\n"Box, maison","a""b",\r\nBanque,x,"ligne 1\nligne 2"\r\n\r\n'
  assert.deepEqual(lireCsv(texte), [
    ['name', 'password', 'note'],
    ['Box, maison', 'a"b', ''],
    ['Banque', 'x', 'ligne 1\nligne 2'],
  ])
  // Excel en français : point-virgule
  assert.deepEqual(lireCsv('Title;Password\nWifi;abc'), [['Title', 'Password'], ['Wifi', 'abc']])
})

test('Apple Mots de passe / Safari', () => {
  const { entrees, erreur } = convertirCsv(
    'Title,URL,Username,Password,Notes,OTPAuth\nnetflix.com (lea@x.fr),https://www.netflix.com/,lea@x.fr,S3cret!,,\n'
  )
  assert.equal(erreur, null)
  assert.deepEqual(entrees, [
    { nom: 'netflix.com (lea@x.fr)', categorie: 'streaming', identifiant: 'lea@x.fr', motDePasse: 'S3cret!', url: 'https://www.netflix.com/', note: '', doublon: false },
  ])
})

test('Chrome / Edge, Firefox (sans nom : domaine), LastPass, KeePass', () => {
  assert.equal(convertirCsv('name,url,username,password,note\nAmeli,https://ameli.fr,123,pw,\n').entrees[0].categorie, 'sante')
  const firefox = convertirCsv(
    '"url","username","password","httpRealm","formActionOrigin","guid","timeCreated"\n"https://www.impots.gouv.fr","moi","pw","","","{1}","1"\n'
  ).entrees[0]
  assert.equal(firefox.nom, 'impots.gouv.fr')
  assert.equal(firefox.categorie, 'admin')
  const lastpass = convertirCsv('url,username,password,totp,extra,name,grouping,fav\nhttps://x.fr,a,b,,note,Freebox,Maison,0\n').entrees[0]
  assert.deepEqual([lastpass.nom, lastpass.note, lastpass.categorie], ['Freebox', 'note', 'wifi'])
  const keepass = convertirCsv('"Account","Login Name","Password","Web Site","Comments"\n"Portail","","1234","","Code du portail"\n').entrees[0]
  assert.deepEqual([keepass.nom, keepass.motDePasse, keepass.note, keepass.categorie], ['Portail', '1234', 'Code du portail', 'maison'])
})

test('Bitwarden : identifiants et notes sécurisées, cartes ignorées', () => {
  const { entrees, ignorees } = convertirCsv(
    'folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp\n' +
      'Banque,,login,Boursorama,,,0,https://boursorama.com,moi,pw,\n' +
      ',,note,Code alarme,1234,,0,,,,\n' +
      ',,card,Visa,,,0,,,,\n'
  )
  assert.deepEqual(entrees.map((e) => [e.nom, e.categorie, e.motDePasse, e.note]), [
    ['Boursorama', 'banque', 'pw', ''],
    ['Code alarme', 'maison', '', '1234'],
  ])
  assert.equal(ignorees, 1)
})

test('doublons : déjà dans le coffre ou répétés dans le fichier', () => {
  const { entrees } = convertirCsv('name,username,password\nNetflix,Léa,a\nnetflix,lea,b\nSpotify,lea,c\n', [
    { nom: 'Spotify', identifiant: 'LEA' },
  ])
  assert.deepEqual(entrees.map((e) => e.doublon), [false, true, true])
})

test('fichiers non reconnus ou vides, limites de taille des champs', () => {
  assert.match(convertirCsv('nom,prenom\nA,B\n').erreur, /pas de colonne/)
  assert.match(convertirCsv('').erreur, /vide/)
  assert.match(convertirCsv('name,password\nA,\n').erreur, /Aucun mot de passe/)
  const long = convertirCsv(`name,password\n${'x'.repeat(200)},pw\n`).entrees[0]
  assert.equal(long.nom.length, 80)
})

test('catégorie par mot entier, domaine d’une adresse', () => {
  assert.equal(devinerCategorie('Café du coin'), 'autre') // pas « caf »
  assert.equal(devinerCategorie('caf.fr'), 'admin')
  assert.equal(devinerCategorie('Dropbox'), 'autre') // pas « box »
  assert.equal(devinerCategorie('Wi-Fi maison'), 'wifi')
  assert.equal(domaine('www.sncf-connect.com/login'), 'sncf-connect.com')
  assert.equal(domaine('pas une adresse'), '')
})

test('le modèle à télécharger est relu tel quel, catégories comprises', () => {
  const { entrees, erreur } = convertirCsv(MODELE_CSV)
  assert.equal(erreur, null)
  assert.deepEqual(entrees.map((e) => [e.nom, e.categorie, e.identifiant, e.motDePasse, e.url, e.note]), [
    ['Wi-Fi maison', 'wifi', 'Livebox-1234', 'exemple-à-remplacer', '', 'Code WPS au dos de la box'],
    ['Netflix', 'streaming', 'prenom@exemple.fr', 'exemple-à-remplacer', 'https://www.netflix.com', ''],
    ['Code du portail', 'maison', '', '1234', '', ''],
    ['Ameli', 'sante', '1 23 45 67 890 123', 'exemple-à-remplacer', 'https://www.ameli.fr', ''],
  ])
  // Catégorie inconnue : devinée à partir du nom
  assert.equal(convertirCsv('nom;catégorie;mot de passe\nBoursorama;Divers;x').entrees[0].categorie, 'banque')
})
