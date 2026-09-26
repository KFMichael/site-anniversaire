import { useState } from 'react'
import { CATEGORIES, useCoffre } from './contexte'
import { genererMotDePasse } from './crypto'
import { Bouton, Carte, ChampTexte } from '../../components/ui'

const VIDE = { nom: '', categorie: 'maison', identifiant: '', motDePasse: '', url: '', note: '' }

// Ajout (entree absente) ou modification d'une entrée
export default function FormulaireEntree({ entree, onFermer }) {
  const { enregistrer } = useCoffre()
  const [valeurs, setValeurs] = useState(() => ({ ...VIDE, ...entree }))
  const [visible, setVisible] = useState(!entree)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  function changer(champ) {
    return (e) => setValeurs((v) => ({ ...v, [champ]: e.target.value }))
  }

  async function soumettre(e) {
    e.preventDefault()
    setEnCours(true)
    setErreur('')
    const { nom, categorie, identifiant, motDePasse, url, note } = valeurs
    const message = await enregistrer(entree?.id ?? null, {
      nom: nom.trim(),
      categorie,
      identifiant: identifiant.trim(),
      motDePasse,
      url: url.trim(),
      note: note.trim(),
    })
    setEnCours(false)
    if (message) setErreur(message)
    else onFermer()
  }

  const prefixe = entree ? `modif-${entree.id}` : 'nouvelle'

  return (
    <Carte titre={entree ? 'Modifier' : 'Nouvelle entrée'}>
      <form onSubmit={soumettre} className="flex flex-col gap-3">
        <ChampTexte
          id={`${prefixe}-nom`}
          label="Nom"
          placeholder="Wi-Fi maison, Netflix, Ameli…"
          maxLength={80}
          value={valeurs.nom}
          onChange={changer('nom')}
          required
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${prefixe}-categorie`} className="font-sans text-sm text-text-muted px-1">
            Catégorie
          </label>
          <select
            id={`${prefixe}-categorie`}
            value={valeurs.categorie}
            onChange={changer('categorie')}
            className="font-sans w-full px-4 py-3 rounded-2xl border border-separator bg-bg-base text-text-primary focus:outline-none focus:border-accent"
          >
            {CATEGORIES.map((c) => (
              <option key={c.valeur} value={c.valeur}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
        </div>

        <ChampTexte
          id={`${prefixe}-identifiant`}
          label="Identifiant"
          autoComplete="off"
          value={valeurs.identifiant}
          onChange={changer('identifiant')}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${prefixe}-mdp`} className="font-sans text-sm text-text-muted px-1">
            Mot de passe
          </label>
          <div className="flex gap-2">
            <input
              id={`${prefixe}-mdp`}
              type={visible ? 'text' : 'password'}
              autoComplete="off"
              spellCheck={false}
              value={valeurs.motDePasse}
              onChange={changer('motDePasse')}
              className="font-mono text-sm flex-1 min-w-0 px-4 py-3 rounded-2xl border border-separator bg-bg-base text-text-primary focus:outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              className="shrink-0 w-12 rounded-2xl border border-separator text-text-muted"
            >
              {visible ? '🙈' : '👁'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setValeurs((v) => ({ ...v, motDePasse: genererMotDePasse() }))
              setVisible(true)
            }}
            className="font-sans text-sm text-text-muted hover:text-text-primary self-start px-1 underline"
          >
            Générer un mot de passe solide
          </button>
        </div>

        <ChampTexte
          id={`${prefixe}-url`}
          label="Site web (optionnel)"
          type="text"
          inputMode="url"
          placeholder="netflix.com"
          value={valeurs.url}
          onChange={changer('url')}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${prefixe}-note`} className="font-sans text-sm text-text-muted px-1">
            Note (optionnel)
          </label>
          <textarea
            id={`${prefixe}-note`}
            rows={3}
            placeholder="Code PIN, questions secrètes, numéro client…"
            value={valeurs.note}
            onChange={changer('note')}
            className="font-sans w-full px-4 py-3 rounded-2xl border border-separator bg-bg-base text-text-primary focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex gap-3 flex-wrap">
          <Bouton type="submit" disabled={enCours || !valeurs.nom.trim()}>
            {enCours ? 'Chiffrement…' : 'Enregistrer'}
          </Bouton>
          <Bouton type="button" variante="discret" onClick={onFermer}>
            Annuler
          </Bouton>
        </div>
        {erreur && <p className="font-sans text-sm text-text-muted italic">{erreur}</p>}
      </form>
    </Carte>
  )
}
