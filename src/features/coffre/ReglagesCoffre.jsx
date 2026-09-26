import { useState } from 'react'
import { useCoffre } from './contexte'
import { useEspace } from '../espace/contexte'
import { LONGUEUR_MIN_PHRASE } from './crypto'
import { Bouton, Carte, ChampTexte } from '../../components/ui'

export default function ReglagesCoffre() {
  const { ouvert } = useCoffre()
  const { espace } = useEspace()
  const estAdmin = espace.role === 'admin'

  if (!ouvert && !estAdmin) return null

  return (
    <Carte titre="Réglages du coffre">
      {ouvert && <ChangementPhrase />}
      {estAdmin && <Reinitialisation />}
    </Carte>
  )
}

function ChangementPhrase() {
  const { changerPhrase } = useCoffre()
  const [ouvert, setOuvert] = useState(false)
  const [phrase, setPhrase] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [message, setMessage] = useState('')

  const valide = phrase.length >= LONGUEUR_MIN_PHRASE && phrase === confirmation

  async function soumettre(e) {
    e.preventDefault()
    setEnCours(true)
    setMessage('')
    const erreur = await changerPhrase(phrase)
    setEnCours(false)
    if (erreur) {
      setMessage(erreur)
    } else {
      setMessage('Phrase changée. Préviens les autres membres !')
      setPhrase('')
      setConfirmation('')
      setOuvert(false)
    }
  }

  if (!ouvert) {
    return (
      <div className="flex flex-col gap-2">
        <Bouton variante="secondaire" onClick={() => setOuvert(true)}>
          Changer la phrase secrète
        </Bouton>
        {message && <p className="font-sans text-sm text-text-muted italic">{message}</p>}
      </div>
    )
  }

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-3">
      <ChampTexte
        id="nouvelle-phrase"
        type="password"
        label={`Nouvelle phrase (${LONGUEUR_MIN_PHRASE} caractères minimum)`}
        autoComplete="new-password"
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
      />
      <ChampTexte
        id="nouvelle-phrase-confirmation"
        type="password"
        label="Confirme la nouvelle phrase"
        autoComplete="new-password"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
      />
      <div className="flex gap-3 flex-wrap">
        <Bouton type="submit" disabled={!valide || enCours}>
          {enCours ? 'Rechiffrement…' : 'Changer'}
        </Bouton>
        <Bouton type="button" variante="discret" onClick={() => setOuvert(false)}>
          Annuler
        </Bouton>
      </div>
      {message && <p className="font-sans text-sm text-text-muted italic">{message}</p>}
    </form>
  )
}

function Reinitialisation() {
  const { reinitialiser } = useCoffre()
  const [erreur, setErreur] = useState('')

  async function confirmer() {
    const saisie = window.prompt(
      'Tous les mots de passe du coffre seront définitivement effacés, pour tous les membres.\n\nTape EFFACER pour confirmer.'
    )
    if (saisie?.trim().toUpperCase() !== 'EFFACER') return
    const ok = await reinitialiser()
    if (!ok) setErreur('La réinitialisation a échoué.')
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="font-sans text-xs text-text-muted">
        Phrase oubliée ? Seule solution : vider le coffre et en créer un nouveau.
      </p>
      <Bouton variante="discret" onClick={confirmer} className="self-start !px-0">
        Réinitialiser le coffre…
      </Bouton>
      {erreur && <p className="font-sans text-sm text-text-muted italic">{erreur}</p>}
    </div>
  )
}
