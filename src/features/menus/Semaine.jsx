import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bouton, Carte } from '../../components/ui'
import { CATEGORIES_PLATS, categoriePlat } from './categories'
import { decalerJours, libelleJour, libelleSemaine, lundiDe, versIso } from './tirage'

const TEXTE_LIBRE = '__texte'

export default function Semaine({ menus, lundi, onChangerSemaine }) {
  const { jours, semaine } = menus
  const [message, setMessage] = useState('')
  const [panneau, setPanneau] = useState(null) // 'ingredients' | 'reglages'
  const aujourdhui = versIso(new Date())
  const joursVides = jours.filter((j) => !semaine[j].plat && !semaine[j].texte)

  async function tirer(joursATirer) {
    setMessage('')
    const { message: erreur, assouplies } = await menus.tirer(joursATirer)
    if (erreur) setMessage(erreur)
    else if (assouplies?.length) {
      setMessage(`Pas assez de plats pour tout respecter : règle assouplie (${assouplies.join(', ')}).`)
    }
  }

  function changerSemaine(n) {
    onChangerSemaine(decalerJours(lundi, 7 * n))
    setMessage('')
    setPanneau(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => changerSemaine(-1)}
          aria-label="Semaine précédente"
          className="cible-44 shrink-0 w-11 h-11 rounded-full bg-bg-elevated shadow-soft text-text-primary active:scale-95 transition-transform duration-200 ease-spring"
        >
          ‹
        </button>
        <div className="flex flex-col items-center">
          <span className="font-sans font-semibold text-text-primary">{libelleSemaine(lundi)}</span>
          {lundi === lundiDe() && <span className="font-sans text-xs text-text-muted">Cette semaine</span>}
        </div>
        <button
          onClick={() => changerSemaine(1)}
          aria-label="Semaine suivante"
          className="cible-44 shrink-0 w-11 h-11 rounded-full bg-bg-elevated shadow-soft text-text-primary active:scale-95 transition-transform duration-200 ease-spring"
        >
          ›
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Bouton
          className="flex-1"
          onClick={() => tirer(joursVides.length ? joursVides : jours)}
        >
          🎲 {joursVides.length ? `Remplir les ${joursVides.length} soirs vides` : 'Tout re-tirer'}
        </Bouton>
        {joursVides.length > 0 && joursVides.length < 7 && (
          <Bouton variante="secondaire" onClick={() => tirer(jours)}>
            Tout re-tirer
          </Bouton>
        )}
      </div>
      <p className="font-sans text-xs text-text-muted px-1 -mt-2">
        Les soirs verrouillés 🔒 (dont ceux choisis à la main) ne sont jamais re-tirés.
      </p>

      {message && <p className="font-sans text-sm text-text-muted italic px-1">{message}</p>}

      <ul className="flex flex-col gap-2">
        {jours.map((jour) => (
          <CarteJour
            key={jour}
            jour={semaine[jour]}
            estAujourdhui={jour === aujourdhui}
            plats={menus.plats}
            onChoisir={async (valeur) => setMessage((await menus.choisir(jour, valeur)) ?? '')}
            onVerrou={async () => setMessage((await menus.basculerVerrou(jour)) ?? '')}
            onTirer={() => tirer([jour])}
          />
        ))}
      </ul>

      <div className="flex gap-2 flex-wrap justify-center">
        <Bouton
          variante="secondaire"
          onClick={() => setPanneau(panneau === 'ingredients' ? null : 'ingredients')}
        >
          🛒 Ingrédients → courses
        </Bouton>
        <Bouton
          variante="discret"
          onClick={() => setPanneau(panneau === 'reglages' ? null : 'reglages')}
        >
          Règles du tirage
        </Bouton>
      </div>

      {panneau === 'ingredients' && <IngredientsVersCourses menus={menus} onFermer={() => setPanneau(null)} />}
      {panneau === 'reglages' && <ReglagesTirage menus={menus} />}
    </div>
  )
}

function CarteJour({ jour, estAujourdhui, plats, onChoisir, onVerrou, onTirer }) {
  const [saisieLibre, setSaisieLibre] = useState(false)
  const [texte, setTexte] = useState(jour.texte ?? '')
  const categorie = jour.plat ? categoriePlat(jour.plat.categorie) : null
  const valeurSelect = jour.plat ? jour.plat.id : jour.texte || saisieLibre ? TEXTE_LIBRE : ''

  function changer(e) {
    const valeur = e.target.value
    if (valeur === TEXTE_LIBRE) {
      setSaisieLibre(true)
      return
    }
    setSaisieLibre(false)
    onChoisir({ platId: valeur || null })
  }

  function validerTexte(e) {
    e.preventDefault()
    if (texte.trim()) onChoisir({ texte: texte.trim() })
    setSaisieLibre(false)
  }

  return (
    <li
      className={`p-4 rounded-3xl bg-bg-elevated shadow-soft flex flex-col gap-2 ${
        estAujourdhui ? 'outline-2 outline-accent' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="font-sans text-sm font-medium text-text-muted flex-1">
          {libelleJour(jour.jour)}
          {estAujourdhui && <span className="text-accent-text"> · ce soir</span>}
        </span>
        <button
          onClick={onTirer}
          disabled={jour.verrouille}
          aria-label={`Tirer au sort le ${libelleJour(jour.jour)}`}
          className="cible-44 w-9 h-9 rounded-full bg-bg-base active:scale-90 transition-transform duration-200 ease-spring disabled:opacity-30"
        >
          🎲
        </button>
        <button
          onClick={onVerrou}
          aria-pressed={jour.verrouille}
          aria-label={jour.verrouille ? 'Déverrouiller ce soir' : 'Verrouiller ce soir'}
          className={`cible-44 w-9 h-9 rounded-full active:scale-90 transition-transform duration-200 ease-spring ${
            jour.verrouille ? 'bg-accent/15' : 'bg-bg-base opacity-60'
          }`}
        >
          {jour.verrouille ? '🔒' : '🔓'}
        </button>
      </div>

      {jour.plat ? (
        <p className="font-sans text-lg font-semibold text-text-primary">
          <span aria-hidden="true">{categorie.emoji}</span> {jour.plat.nom}
          {jour.plat.rapide && (
            <span className="font-sans text-xs font-normal text-text-muted"> · ⚡ rapide</span>
          )}
        </p>
      ) : jour.texte ? (
        <p className="font-sans text-lg font-semibold text-text-primary">📝 {jour.texte}</p>
      ) : (
        <p className="font-sans text-text-muted">Rien de prévu</p>
      )}

      <label className="sr-only" htmlFor={`plat-${jour.jour}`}>
        Choisir le dîner du {libelleJour(jour.jour)}
      </label>
      <select
        id={`plat-${jour.jour}`}
        value={valeurSelect}
        onChange={changer}
        className="font-sans text-sm w-full px-3 py-2 rounded-2xl border border-separator bg-bg-base text-text-secondary focus:outline-none focus:border-accent"
      >
        <option value="">— Rien de prévu —</option>
        {CATEGORIES_PLATS.map((c) => {
          const duGroupe = plats.filter((p) => p.categorie === c.id)
          return duGroupe.length ? (
            <optgroup key={c.id} label={`${c.emoji} ${c.label}`}>
              {duGroupe.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </optgroup>
          ) : null
        })}
        <option value={TEXTE_LIBRE}>✏️ Autre (resto, restes…)</option>
      </select>

      {saisieLibre && (
        <form onSubmit={validerTexte} className="flex gap-2">
          <input
            aria-label="Dîner en texte libre"
            autoFocus
            maxLength={80}
            placeholder="Resto, restes, invités…"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            className="font-sans text-sm flex-1 min-w-0 px-3 py-2 rounded-2xl border border-separator bg-bg-base text-text-primary focus:outline-none focus:border-accent"
          />
          <Bouton type="submit" className="!px-4 !py-2 text-sm" disabled={!texte.trim()}>
            OK
          </Bouton>
        </form>
      )}
    </li>
  )
}

const LIBELLES_STATUT = {
  manquant: 'à acheter',
  'en-stock': 'en stock',
  'sur-la-liste': 'déjà sur la liste',
}

// Ingrédients des plats de la semaine : ceux qui manquent sont pré-cochés
function IngredientsVersCourses({ menus, onFermer }) {
  const { analyserIngredients, ajouterAuxCourses } = menus
  const [ingredients, setIngredients] = useState(null)
  const [coches, setCoches] = useState(new Set())
  const [message, setMessage] = useState('')
  const [ajoutReussi, setAjoutReussi] = useState(false)
  // Incrémenté après un ajout pour relancer l'analyse (statuts à jour)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let actif = true
    analyserIngredients().then((liste) => {
      if (!actif) return
      setIngredients(liste)
      setCoches(new Set(liste.filter((i) => i.statut === 'manquant').map((i) => i.nom)))
    })
    return () => {
      actif = false
    }
  }, [analyserIngredients, version])

  if (ingredients === null) {
    return (
      <Carte>
        <p className="font-sans text-sm text-text-muted">Analyse des ingrédients…</p>
      </Carte>
    )
  }

  const selectionnables = ingredients.filter((i) => i.statut !== 'sur-la-liste')

  function basculer(nom) {
    setCoches((c) => {
      const suivant = new Set(c)
      if (suivant.has(nom)) suivant.delete(nom)
      else suivant.add(nom)
      return suivant
    })
  }

  async function ajouter() {
    const erreur = await ajouterAuxCourses([...coches])
    setAjoutReussi(!erreur)
    if (erreur) setMessage(erreur)
    else {
      setMessage(`${coches.size} ingrédient${coches.size > 1 ? 's' : ''} ajouté${coches.size > 1 ? 's' : ''} à la liste ✓`)
      setVersion((v) => v + 1)
    }
  }

  return (
    <Carte titre="Ingrédients de la semaine">
      {ingredients.length === 0 ? (
        <p className="font-sans text-sm text-text-muted">
          Aucun ingrédient : choisis des plats (avec leurs ingrédients) pour la semaine.
        </p>
      ) : (
        <>
          <p className="font-sans text-sm text-text-secondary">
            Coche ce qu'il faut acheter. Ce qui est en stock est décoché par défaut.
          </p>
          <ul className="flex flex-col divide-y divide-separator">
            {ingredients.map((i) => (
              <li key={i.nom}>
                <label className="flex items-center gap-3 py-2 font-sans text-sm">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-accent"
                    disabled={i.statut === 'sur-la-liste'}
                    checked={coches.has(i.nom)}
                    onChange={() => basculer(i.nom)}
                  />
                  <span className="text-text-primary flex-1">{i.nom}</span>
                  <span className="text-xs text-text-muted">{LIBELLES_STATUT[i.statut]}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex gap-3 flex-wrap">
            <Bouton onClick={ajouter} disabled={coches.size === 0 || selectionnables.length === 0}>
              Ajouter {coches.size} à la liste
            </Bouton>
            <Bouton variante="discret" onClick={onFermer}>
              Fermer
            </Bouton>
          </div>
        </>
      )}
      {message && (
        <p className="font-sans text-sm text-text-muted italic">
          {message}{' '}
          {ajoutReussi && (
            <Link to="/courses" className="underline">
              Voir la liste
            </Link>
          )}
        </p>
      )}
    </Carte>
  )
}

function ReglagesTirage({ menus }) {
  const { reglages, modifierReglages } = menus

  return (
    <Carte titre="Règles du tirage">
      <p className="font-sans text-xs text-text-muted">
        Jamais deux fois le même plat dans la semaine. Si la bibliothèque est trop petite pour
        tout respecter, une règle est assouplie (et c'est signalé).
      </p>
      <Interrupteur
        label="Pas un plat servi la semaine précédente"
        actif={reglages.pas_semaine_precedente}
        onChange={(v) => modifierReglages({ pas_semaine_precedente: v })}
      />
      <Interrupteur
        label="Plats rapides du lundi au jeudi"
        actif={reglages.rapide_en_semaine}
        onChange={(v) => modifierReglages({ rapide_en_semaine: v })}
      />
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="max-categorie" className="font-sans text-sm text-text-primary">
          Maximum de plats d'une même catégorie par semaine
        </label>
        <select
          id="max-categorie"
          value={reglages.max_par_categorie}
          onChange={(e) => modifierReglages({ max_par_categorie: Number(e.target.value) })}
          className="font-sans text-sm px-3 py-2 rounded-xl border border-separator bg-bg-base text-text-primary"
        >
          <option value={0}>Sans limite</option>
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
    </Carte>
  )
}

function Interrupteur({ label, actif, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 font-sans text-sm text-text-primary">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={actif}
        onClick={() => onChange(!actif)}
        className={`cible-44 w-12 h-7 shrink-0 rounded-full transition-colors duration-200 ease-spring ${
          actif ? 'bg-accent' : 'bg-separator'
        }`}
      >
        <span
          className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-soft transition-all duration-200 ease-spring ${
            actif ? 'left-5.5' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  )
}
