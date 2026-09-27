import { useRef, useState } from 'react'
import { categorie, useCoffre } from './contexte'
import { convertirCsv, MODELE_CSV, TAILLE_MAX_OCTETS } from './import-csv'
import { Bouton, Carte } from '../../components/ui'

const EXPORTS = [
  ['Trousseau iCloud (iPhone, Mac)', 'sur un Mac : app Mots de passe › Fichier › Exporter tous les mots de passe'],
  ['Chrome / Edge', 'Gestionnaire de mots de passe › Paramètres › Exporter'],
  ['Firefox', 'about:logins › ⋯ › Exporter les identifiants'],
  ['Bitwarden', 'Outils › Exporter le coffre › format .csv'],
  ['1Password, LastPass, KeePass, Dashlane', 'export au format CSV'],
]

// BOM : Excel lit le fichier en UTF-8 (accents)
const LIEN_MODELE = `data:text/csv;charset=utf-8,${encodeURIComponent(`\uFEFF${MODELE_CSV}\r\n`)}`

// Import d'un export CSV : lecture et chiffrement sur l'appareil, aperçu
// avec les doublons décochés, puis enregistrement par lots
export default function ImportCsv({ onFermer }) {
  const { entrees, importer } = useCoffre()
  const fichier = useRef(null)
  const [apercu, setApercu] = useState(null)
  const [coches, setCoches] = useState(new Set())
  const [progression, setProgression] = useState(null)
  const [resultat, setResultat] = useState(null)
  const [message, setMessage] = useState('')

  async function lire(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setMessage('')
    if (f.size > TAILLE_MAX_OCTETS) {
      setMessage('Ce fichier est trop gros (2 Mo au plus).')
      return
    }
    let texte
    try {
      texte = await f.text()
    } catch {
      setMessage("Le fichier n'a pas pu être lu.")
      return
    }
    const { entrees: trouvees, ignorees, erreur } = convertirCsv(texte, entrees)
    if (erreur) {
      setMessage(erreur)
      return
    }
    setApercu({ entrees: trouvees, ignorees, nomFichier: f.name })
    setCoches(new Set(trouvees.flatMap((x, i) => (x.doublon ? [] : [i]))))
  }

  function basculer(i) {
    setCoches((c) => {
      const suivant = new Set(c)
      if (suivant.has(i)) suivant.delete(i)
      else suivant.add(i)
      return suivant
    })
  }

  async function lancer() {
    const choisies = apercu.entrees.filter((_, i) => coches.has(i)).map(({ doublon: _doublon, ...contenu }) => contenu)
    setProgression({ faites: 0, total: choisies.length })
    const { importees, erreur } = await importer(choisies, (faites) => setProgression({ faites, total: choisies.length }))
    // Plus aucun mot de passe en clair gardé à l'écran
    setApercu(null)
    setCoches(new Set())
    setProgression(null)
    setResultat({ importees, erreur })
  }

  if (resultat) {
    return (
      <Carte titre="Import terminé">
        <p role="status" className="font-sans text-base text-text-primary">
          {resultat.erreur ??
            `✓ ${resultat.importees} mot${resultat.importees > 1 ? 's' : ''} de passe importé${resultat.importees > 1 ? 's' : ''} et chiffré${resultat.importees > 1 ? 's' : ''}.`}
        </p>
        <p className="font-sans text-sm text-text-secondary">
          ⚠️ Supprime maintenant le fichier CSV de ton appareil (et vide la corbeille) : il contient tes mots de passe en
          clair.
        </p>
        <Bouton onClick={onFermer}>Terminé</Bouton>
      </Carte>
    )
  }

  if (progression) {
    return (
      <Carte titre="Import en cours">
        <progress
          value={progression.faites}
          max={progression.total}
          aria-label="Progression de l'import"
          className="w-full h-2 accent-accent"
        />
        <p role="status" className="font-sans text-sm text-text-secondary">
          Chiffrement et enregistrement… {progression.faites} / {progression.total}
        </p>
      </Carte>
    )
  }

  if (apercu) {
    const doublons = apercu.entrees.filter((x) => x.doublon).length
    const nombre = coches.size
    return (
      <Carte titre="Importer des mots de passe">
        <p className="font-sans text-sm text-text-secondary">
          {apercu.entrees.length} trouvé{apercu.entrees.length > 1 ? 's' : ''} dans « {apercu.nomFichier} ».
          {doublons > 0 && ` ${doublons} déjà dans le coffre (ou en double), décoché${doublons > 1 ? 's' : ''}.`}
          {apercu.ignorees > 0 &&
            ` ${apercu.ignorees} ligne${apercu.ignorees > 1 ? 's' : ''} ignorée${apercu.ignorees > 1 ? 's' : ''} (cartes, identités…).`}
        </p>
        <Bouton
          variante="secondaire"
          onClick={() => setCoches(nombre === apercu.entrees.length ? new Set() : new Set(apercu.entrees.map((_, i) => i)))}
        >
          {nombre === apercu.entrees.length ? 'Tout décocher' : 'Tout cocher'}
        </Bouton>
        <ul className="flex flex-col divide-y divide-separator" aria-label="Entrées à importer">
          {apercu.entrees.map((x, i) => (
            <li key={i}>
              <label className="flex items-center gap-3 min-h-11 py-2 cursor-pointer">
                <input type="checkbox" checked={coches.has(i)} onChange={() => basculer(i)} className="w-5 h-5 shrink-0 accent-accent" />
                <span aria-hidden="true">{categorie(x.categorie).emoji}</span>
                <span className="flex-1 min-w-0 flex flex-col">
                  <span className="font-sans text-base text-text-primary truncate">{x.nom}</span>
                  {(x.identifiant || x.doublon) && (
                    <span className="font-sans text-sm text-text-muted truncate">
                      {x.doublon && 'Déjà dans le coffre · '}
                      {x.identifiant}
                    </span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <Bouton onClick={lancer} disabled={nombre === 0} className="sticky bottom-24 shadow-elevated">
          {nombre === 0 ? 'Aucune entrée cochée' : `Importer ${nombre} mot${nombre > 1 ? 's' : ''} de passe`}
        </Bouton>
        <Bouton variante="discret" onClick={onFermer}>
          Annuler
        </Bouton>
      </Carte>
    )
  }

  return (
    <Carte titre="Importer des mots de passe">
      <p className="font-sans text-sm text-text-secondary">
        Choisis l'export CSV de ton gestionnaire de mots de passe. Le fichier est lu sur cet appareil et chaque mot de
        passe est chiffré avant d'être enregistré : rien ne part en clair.
      </p>
      <details className="font-sans text-sm text-text-secondary">
        <summary className="min-h-11 flex items-center cursor-pointer text-accent-text">Comment exporter ses mots de passe ?</summary>
        <ul className="flex flex-col gap-1.5 pl-1">
          {EXPORTS.map(([outil, chemin]) => (
            <li key={outil}>
              <strong className="text-text-primary">{outil}</strong> : {chemin}
            </li>
          ))}
        </ul>
      </details>
      {/* Sur ordinateur : un modèle à remplir dans un tableur */}
      <p className="hidden md:block font-sans text-sm text-text-secondary">
        Pas de gestionnaire à exporter ?{' '}
        <a href={LIEN_MODELE} download="modele-coffre-nido.csv" className="text-accent-text underline underline-offset-2">
          Télécharger un modèle CSV
        </a>{' '}
        (nom, catégorie, identifiant, mot de passe, site, note), remplis-le dans Excel, Numbers ou Google Sheets, puis
        importe-le ici.
      </p>
      <input ref={fichier} type="file" accept=".csv,text/csv" hidden onChange={lire} />
      <Bouton onClick={() => fichier.current?.click()}>Choisir le fichier CSV</Bouton>
      {message && (
        <p role="status" className="font-sans text-sm text-text-primary">
          {message}
        </p>
      )}
      <Bouton variante="discret" onClick={onFermer}>
        Annuler
      </Bouton>
    </Carte>
  )
}
