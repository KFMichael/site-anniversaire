import { useState } from 'react'
import { useCoffre } from './contexte'
import { nomBiometrie } from './biometrie'
import { Bouton, Carte, ChampTexte, Page } from '../../components/ui'
import ReglagesCoffre from './ReglagesCoffre'

export default function Deverrouillage() {
  const { deverrouiller, deverrouillerBiometrie, biometrieIci, delaiVerrouillage } = useCoffre()
  const [phrase, setPhrase] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  // Avec Face ID, la phrase n'est qu'un recours : on la replie par défaut
  const [phraseVisible, setPhraseVisible] = useState(!biometrieIci)

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

  async function biometrie() {
    setEnCours(true)
    setErreur('')
    const message = await deverrouillerBiometrie()
    setEnCours(false)
    if (message) {
      setErreur(message)
      setPhraseVisible(true)
    }
  }

  const minutes = Math.round(delaiVerrouillage / 60000)

  return (
    <Page titre="Mots de passe" retour={{ vers: '/plus', label: 'Plus' }} sousTitre="Le coffre-fort partagé de l'espace">
      <Carte titre="🔒 Coffre verrouillé">
        {biometrieIci && (
          <Bouton onClick={biometrie} disabled={enCours}>
            {enCours && !phraseVisible ? 'Vérification…' : `Déverrouiller avec ${nomBiometrie()}`}
          </Bouton>
        )}

        {phraseVisible ? (
          <form onSubmit={soumettre} className="flex flex-col gap-3">
            <ChampTexte
              id="phrase"
              type="password"
              label="Phrase secrète"
              autoComplete="current-password"
              autoFocus={!biometrieIci}
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              required
            />
            <Bouton
              type="submit"
              variante={biometrieIci ? 'secondaire' : 'principal'}
              disabled={enCours || !phrase}
            >
              {enCours ? 'Déverrouillage…' : 'Déverrouiller avec la phrase'}
            </Bouton>
          </form>
        ) : (
          <Bouton variante="discret" onClick={() => setPhraseVisible(true)}>
            Utiliser la phrase secrète
          </Bouton>
        )}

        {erreur && <p className="font-sans text-sm text-text-muted italic">{erreur}</p>}
        <p className="font-sans text-xs text-text-muted">
          Le coffre se reverrouille après {minutes} minute{minutes > 1 ? 's' : ''} d'inactivité ou
          au rechargement de la page.
        </p>
      </Carte>
      <ReglagesCoffre />
    </Page>
  )
}
