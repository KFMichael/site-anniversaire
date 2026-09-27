import { useState } from 'react'
import { Bouton, Carte, ChampTexte, Page } from '../../components/ui'
import { ChoixPoids, PoidsPastilles } from './Poids'
import { catalogueAvecEtat } from './catalogue'

// Liste des charges de l'espace : ajout, renommage, poids, archivage.
// Archiver plutôt que supprimer : l'historique des mois passés reste juste.
export default function GestionCharges({ donnees, onFermer }) {
  const { charges, ajouterCharge, ajouterDepuisCatalogue, modifierCharge } = donnees
  const [message, setMessage] = useState('')
  const actives = charges.filter((c) => !c.archivee)
  const archivees = charges.filter((c) => c.archivee)

  async function action(promesse) {
    setMessage('')
    const erreur = await promesse
    if (erreur) setMessage(erreur)
  }

  return (
    <Page titre="Gérer les charges" sousTitre="Communes à tout l'espace" retour={{ onClick: onFermer, label: 'Charge mentale' }}>

      <Catalogue
        charges={charges}
        onAjouter={async (nouvelles, ids) => {
          setMessage('')
          const erreur = await ajouterDepuisCatalogue(nouvelles, ids)
          const n = nouvelles.length + ids.length
          setMessage(erreur ?? `${n} charge${n > 1 ? 's ajoutées' : ' ajoutée'} ✓`)
        }}
      />
      {message && (
        <p role="status" className="font-sans text-sm text-text-secondary px-1">
          {message}
        </p>
      )}
      <NouvelleCharge onAjouter={(c) => action(ajouterCharge(c))} />

      <Carte titre={`Charges actives (${actives.length})`}>
        <ul className="flex flex-col divide-y divide-separator">
          {actives.map((c) => (
            <LigneCharge key={c.id} charge={c} onModifier={(m) => action(modifierCharge(c.id, m))} />
          ))}
        </ul>
      </Carte>

      {archivees.length > 0 && (
        <Carte titre="Archivées">
          <ul className="flex flex-col divide-y divide-separator">
            {archivees.map((c) => (
              <li key={c.id} className="py-2.5 flex items-center gap-3">
                <span aria-hidden="true">{c.emoji}</span>
                <span className="font-sans text-text-muted flex-1">{c.nom}</span>
                <button
                  onClick={() => action(modifierCharge(c.id, { archivee: false }))}
                  className="cible-44 font-sans text-xs text-text-muted hover:text-text-primary underline"
                >
                  Réactiver
                </button>
              </li>
            ))}
          </ul>
        </Carte>
      )}
    </Page>
  )
}

function LigneCharge({ charge, onModifier }) {
  const [edition, setEdition] = useState(false)
  const [nom, setNom] = useState(charge.nom)
  const [emoji, setEmoji] = useState(charge.emoji)

  function enregistrer(e) {
    e.preventDefault()
    onModifier({ nom: nom.trim(), emoji: emoji.trim() || '📌' })
    setEdition(false)
  }

  return (
    <li className="py-3 flex flex-col gap-2">
      {edition ? (
        <form onSubmit={enregistrer} className="flex gap-2">
          <input
            aria-label="Emoji"
            value={emoji}
            maxLength={4}
            onChange={(e) => setEmoji(e.target.value)}
            className="font-sans w-14 text-center px-2 py-2 rounded-2xl border border-separator bg-bg-base text-text-primary focus:outline-none focus:border-accent"
          />
          <input
            aria-label="Nom de la charge"
            value={nom}
            maxLength={80}
            onChange={(e) => setNom(e.target.value)}
            className="font-sans flex-1 min-w-0 px-3 py-2 rounded-2xl border border-separator bg-bg-base text-text-primary focus:outline-none focus:border-accent"
          />
          <Bouton type="submit" className="!px-4 !py-2 text-sm" disabled={!nom.trim()}>
            OK
          </Bouton>
        </form>
      ) : (
        <div className="flex items-center gap-3">
          <span aria-hidden="true">{charge.emoji}</span>
          <span className="font-sans text-text-primary flex-1">{charge.nom}</span>
          <button
            onClick={() => setEdition(true)}
            className="cible-44 font-sans text-xs text-text-muted hover:text-text-primary underline"
          >
            Renommer
          </button>
          <button
            onClick={() => onModifier({ archivee: true })}
            className="cible-44 font-sans text-xs text-text-muted hover:text-text-primary underline"
          >
            Archiver
          </button>
        </div>
      )}
      <ChoixPoids valeur={charge.poids} onChange={(poids) => onModifier({ poids })} />
    </li>
  )
}

function NouvelleCharge({ onAjouter }) {
  const [nom, setNom] = useState('')
  const [emoji, setEmoji] = useState('')
  const [poids, setPoids] = useState(1)

  function soumettre(e) {
    e.preventDefault()
    onAjouter({ nom, emoji: emoji.trim(), poids })
    setNom('')
    setEmoji('')
    setPoids(1)
  }

  return (
    <Carte titre="Autre charge">
      <form onSubmit={soumettre} className="flex flex-col gap-3">
        <div className="flex gap-2 items-end">
          <div className="w-16">
            <ChampTexte
              id="nouvelle-charge-emoji"
              label="Emoji"
              placeholder="📌"
              maxLength={4}
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <ChampTexte
              id="nouvelle-charge-nom"
              label="Nom"
              placeholder="Arroser les plantes"
              maxLength={80}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
            />
          </div>
        </div>
        <ChoixPoids valeur={poids} onChange={setPoids} />
        <Bouton type="submit" disabled={!nom.trim()}>
          Ajouter
        </Bouton>
      </form>
    </Carte>
  )
}

// Charges courantes à ajouter d'un tap, par thème ; celles déjà dans
// l'espace sont marquées, les archivées peuvent être réactivées
function Catalogue({ charges, onAjouter }) {
  const [ouvert, setOuvert] = useState(charges.filter((c) => !c.archivee).length === 0)
  const [choisies, setChoisies] = useState(new Set())
  const [enCours, setEnCours] = useState(false)
  const themes = catalogueAvecEtat(charges)
  const toutes = themes.flatMap((t) => t.charges)

  function basculer(nom) {
    setChoisies((x) => {
      const suivant = new Set(x)
      if (suivant.has(nom)) suivant.delete(nom)
      else suivant.add(nom)
      return suivant
    })
  }

  async function ajouter() {
    setEnCours(true)
    const selection = toutes.filter((c) => choisies.has(c.nom))
    await onAjouter(
      selection.filter((c) => c.etat === 'libre').map(({ nom, emoji, poids }) => ({ nom, emoji, poids })),
      selection.filter((c) => c.etat === 'archivee').map((c) => c.id)
    )
    setChoisies(new Set())
    setEnCours(false)
  }

  if (!ouvert) {
    return (
      <Bouton variante="secondaire" onClick={() => setOuvert(true)} aria-expanded={false}>
        📋 Choisir dans la liste des charges
      </Bouton>
    )
  }

  return (
    <Carte titre="Choisir dans la liste">
      <p className="font-sans text-sm text-text-secondary -mt-2">
        Touche les charges qui vous concernent, puis ajoute-les. Le poids se change ensuite.
      </p>
      {themes.map((t) => (
        <section key={t.theme} aria-labelledby={`theme-${t.theme}`} className="flex flex-col gap-2">
          <h3 id={`theme-${t.theme}`} className="font-sans text-xs uppercase tracking-wide text-text-muted px-1">
            {t.theme}
          </h3>
          <div className="flex flex-wrap gap-2">
            {t.charges.map((c) => {
              const active = c.etat === 'active'
              const choisie = choisies.has(c.nom)
              return (
                <button
                  key={c.nom}
                  type="button"
                  disabled={active}
                  aria-pressed={active ? undefined : choisie}
                  onClick={() => basculer(c.nom)}
                  className={`font-sans text-sm min-h-11 px-3.5 rounded-full flex items-center gap-1.5 text-left transition-all duration-200 ease-spring active:scale-95 ${
                    choisie
                      ? 'bg-accent text-white'
                      : active
                        ? 'bg-bg-base text-text-muted'
                        : 'bg-bg-base text-text-primary border border-separator'
                  }`}
                >
                  <span aria-hidden="true">{active || choisie ? '✓' : c.emoji}</span>
                  <span>{c.nom}</span>
                  {active && <span className="text-xs">(déjà là)</span>}
                  {c.etat === 'archivee' && <span className={`text-xs ${choisie ? '' : 'text-text-muted'}`}>(archivée)</span>}
                  {!active && <PoidsPastilles poids={c.poids} couleur={choisie ? 'text-white' : 'text-text-muted'} />}
                </button>
              )
            })}
          </div>
        </section>
      ))}
      <Bouton onClick={ajouter} disabled={enCours || choisies.size === 0} className="sticky bottom-24 shadow-elevated">
        {enCours
          ? 'Ajout…'
          : choisies.size === 0
            ? 'Choisis une ou plusieurs charges'
            : `Ajouter ${choisies.size} charge${choisies.size > 1 ? 's' : ''}`}
      </Bouton>
      <Bouton variante="discret" onClick={() => setOuvert(false)}>
        Fermer la liste
      </Bouton>
    </Carte>
  )
}
