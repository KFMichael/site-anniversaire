import { useMemo, useState } from 'react'
import { CATEGORIES, useCoffre } from './contexte'
import { Bouton, Page } from '../../components/ui'
import EntreeCoffre from './EntreeCoffre'
import FormulaireEntree from './FormulaireEntree'
import ImportCsv from './ImportCsv'
import ReglagesCoffre from './ReglagesCoffre'

function normaliser(texte) {
  return (texte ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

export default function ContenuCoffre() {
  const { entrees, verrouiller } = useCoffre()
  const [recherche, setRecherche] = useState('')
  const [filtre, setFiltre] = useState(null)
  const [ajout, setAjout] = useState(false)
  const [importation, setImportation] = useState(false)

  // Catégories réellement utilisées, pour ne pas afficher de filtres vides
  const categoriesPresentes = useMemo(
    () => CATEGORIES.filter((c) => entrees.some((e) => e.categorie === c.valeur)),
    [entrees]
  )

  const visibles = useMemo(() => {
    const terme = normaliser(recherche.trim())
    return entrees.filter(
      (e) =>
        (!filtre || e.categorie === filtre) &&
        (!terme ||
          normaliser(e.nom).includes(terme) ||
          normaliser(e.identifiant).includes(terme) ||
          normaliser(e.url).includes(terme))
    )
  }, [entrees, recherche, filtre])

  return (
    <Page titre="Mots de passe" sousTitre={`${entrees.length} dans le coffre`}>
      <div className="flex gap-2">
        <input
          type="search"
          placeholder="Rechercher"
          aria-label="Rechercher dans le coffre"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="font-sans flex-1 min-w-0 px-4 py-2.5 rounded-2xl border border-separator bg-bg-elevated text-text-primary focus:outline-none focus:border-accent"
        />
        <Bouton variante="secondaire" onClick={verrouiller} className="!px-4 shrink-0">
          🔒 Verrouiller
        </Bouton>
      </div>

      {categoriesPresentes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 py-1.5 -my-1.5">
          <Filtre actif={!filtre} onClick={() => setFiltre(null)}>
            Tout
          </Filtre>
          {categoriesPresentes.map((c) => (
            <Filtre
              key={c.valeur}
              actif={filtre === c.valeur}
              onClick={() => setFiltre(filtre === c.valeur ? null : c.valeur)}
            >
              {c.emoji} {c.label}
            </Filtre>
          ))}
        </div>
      )}

      {ajout && <FormulaireEntree onFermer={() => setAjout(false)} />}
      {importation && <ImportCsv onFermer={() => setImportation(false)} />}
      {!ajout && !importation && (
        <div className="flex flex-col gap-2">
          <Bouton onClick={() => setAjout(true)}>+ Ajouter un mot de passe</Bouton>
          <Bouton variante="secondaire" onClick={() => setImportation(true)}>
            Importer depuis un fichier CSV
          </Bouton>
        </div>
      )}

      {entrees.length === 0 && !ajout && !importation && (
        <p className="font-sans text-center text-sm text-text-muted">
          Le coffre est vide. Commence par le Wi-Fi de la maison, ou importe les mots de passe de ton navigateur.
        </p>
      )}
      {entrees.length > 0 && visibles.length === 0 && (
        <p className="font-sans text-center text-sm text-text-muted">Aucun résultat.</p>
      )}

      <ul className="flex flex-col gap-3">
        {visibles.map((e) => (
          <li key={e.id}>
            <EntreeCoffre entree={e} />
          </li>
        ))}
      </ul>

      <ReglagesCoffre />
    </Page>
  )
}

function Filtre({ actif, children, ...props }) {
  return (
    <button
      {...props}
      aria-pressed={actif}
      className={`cible-44 font-sans text-sm whitespace-nowrap px-3.5 py-1.5 rounded-full transition-all duration-200 ease-spring active:scale-95 ${
        actif ? 'bg-accent text-white' : 'bg-bg-elevated text-text-muted'
      }`}
    >
      {children}
    </button>
  )
}
