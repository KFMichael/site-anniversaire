import { useState } from 'react'
import { Bouton, Carte, ChampTexte, Page } from '../../components/ui'
import { ChoixPoids } from './Poids'

// Liste des charges de l'espace : ajout, renommage, poids, archivage.
// Archiver plutôt que supprimer : l'historique des mois passés reste juste.
export default function GestionCharges({ donnees, onFermer }) {
  const { charges, ajouterCharge, modifierCharge } = donnees
  const [message, setMessage] = useState('')
  const actives = charges.filter((c) => !c.archivee)
  const archivees = charges.filter((c) => c.archivee)

  async function action(promesse) {
    setMessage('')
    const erreur = await promesse
    if (erreur) setMessage(erreur)
  }

  return (
    <Page titre="Gérer les charges" sousTitre="Communes à tout l'espace">
      <Bouton variante="secondaire" onClick={onFermer} className="self-start">
        ‹ Retour
      </Bouton>

      <NouvelleCharge onAjouter={(c) => action(ajouterCharge(c))} />
      {message && <p className="font-sans text-sm text-text-muted italic px-1">{message}</p>}

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
                  className="font-sans text-xs text-text-muted hover:text-text-primary underline"
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
            className="font-sans text-xs text-text-muted hover:text-text-primary underline"
          >
            Renommer
          </button>
          <button
            onClick={() => onModifier({ archivee: true })}
            className="font-sans text-xs text-text-muted hover:text-text-primary underline"
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
    <Carte titre="Nouvelle charge">
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
