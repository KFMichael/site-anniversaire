import { useState } from 'react'
import { useCoffre } from './contexte'
import { LONGUEUR_MIN_PHRASE } from './crypto'
import { Bouton, Carte, ChampTexte, Page } from '../../components/ui'

export default function CreationCoffre() {
  const { creer } = useCoffre()
  const [phrase, setPhrase] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [compris, setCompris] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  const tropCourte = phrase.length < LONGUEUR_MIN_PHRASE
  const differente = confirmation.length > 0 && confirmation !== phrase
  const valide = !tropCourte && confirmation === phrase && compris

  async function soumettre(e) {
    e.preventDefault()
    if (!valide) return
    setEnCours(true)
    setErreur('')
    const ok = await creer(phrase)
    setEnCours(false)
    if (!ok) setErreur('Un coffre vient d’être créé par un autre membre : utilise sa phrase.')
  }

  return (
    <Page titre="Mots de passe" sousTitre="Le coffre-fort partagé de l'espace">
      <Carte titre="🔐 Créer le coffre">
        <p className="font-sans text-sm text-text-secondary">
          Choisis une <strong>phrase secrète</strong> que tu partageras de vive voix avec
          les autres membres. Elle chiffre tous les mots de passe directement sur ton
          appareil : personne d'autre, pas même le serveur, ne peut les lire.
        </p>
        <p className="font-sans text-sm text-text-secondary">
          Astuce : 4 ou 5 mots sans rapport, par exemple{' '}
          <em>girafe tartine orage vélo</em>.
        </p>

        <form onSubmit={soumettre} className="flex flex-col gap-3">
          <ChampTexte
            id="phrase"
            type="password"
            label={`Phrase secrète (${LONGUEUR_MIN_PHRASE} caractères minimum)`}
            autoComplete="new-password"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            required
          />
          <ChampTexte
            id="phrase-confirmation"
            type="password"
            label="Confirme la phrase"
            autoComplete="new-password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            required
          />
          {differente && (
            <p className="font-sans text-sm text-text-muted italic px-1">
              Les deux phrases ne correspondent pas.
            </p>
          )}

          <label className="flex items-start gap-3 p-3 rounded-2xl bg-bg-base font-sans text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={compris}
              onChange={(e) => setCompris(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-accent"
            />
            <span>
              J'ai compris qu'une phrase oubliée <strong>ne peut pas être récupérée</strong> :
              il faudrait alors vider le coffre et tout ressaisir.
            </span>
          </label>

          <Bouton type="submit" disabled={!valide || enCours}>
            {enCours ? 'Création…' : 'Créer le coffre'}
          </Bouton>
          {erreur && <p className="font-sans text-sm text-text-muted italic">{erreur}</p>}
        </form>
      </Carte>
    </Page>
  )
}
