import { useState } from 'react'
import { useCoffre } from './contexte'
import { Bouton, Carte, ChampTexte, Page } from '../../components/ui'
import ReglagesCoffre from './ReglagesCoffre'

export default function Deverrouillage() {
  const { deverrouiller } = useCoffre()
  const [phrase, setPhrase] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  async function soumettre(e) {
    e.preventDefault()
    setEnCours(true)
    setErreur('')
    const ok = await deverrouiller(phrase)
    setEnCours(false)
    if (!ok) {
      setErreur('Phrase incorrecte.')
      setPhrase('')
    }
  }

  return (
    <Page titre="Mots de passe" sousTitre="Le coffre-fort partagé de l'espace">
      <Carte titre="🔒 Coffre verrouillé">
        <form onSubmit={soumettre} className="flex flex-col gap-3">
          <ChampTexte
            id="phrase"
            type="password"
            label="Phrase secrète"
            autoComplete="current-password"
            autoFocus
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            required
          />
          <Bouton type="submit" disabled={enCours || !phrase}>
            {enCours ? 'Déverrouillage…' : 'Déverrouiller'}
          </Bouton>
          {erreur && <p className="font-sans text-sm text-text-muted italic">{erreur}</p>}
        </form>
        <p className="font-sans text-xs text-text-muted">
          Le coffre se reverrouille après 5 minutes d'inactivité ou au rechargement de la page.
        </p>
      </Carte>
      <ReglagesCoffre />
    </Page>
  )
}
