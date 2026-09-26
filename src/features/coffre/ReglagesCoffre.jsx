import { useEffect, useState } from 'react'
import { useCoffre } from './contexte'
import { biometrieDisponible, nomBiometrie } from './biometrie'
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
      {ouvert && <Biometrie />}
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
      setMessage(
        `Phrase changée. Préviens les autres membres ! L'ouverture avec ${nomBiometrie()} fonctionne toujours.`
      )
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
          {enCours ? 'Changement…' : 'Changer'}
        </Bouton>
        <Bouton type="button" variante="discret" onClick={() => setOuvert(false)}>
          Annuler
        </Bouton>
      </div>
      {message && <p className="font-sans text-sm text-text-muted italic">{message}</p>}
    </form>
  )
}

function Biometrie() {
  const { appareils, biometrieIci, activerBiometrie, retirerAppareil } = useCoffre()
  const [disponible, setDisponible] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [message, setMessage] = useState('')
  const nom = nomBiometrie()

  useEffect(() => {
    biometrieDisponible().then(setDisponible)
  }, [])

  async function activer() {
    setEnCours(true)
    setMessage('')
    const erreur = await activerBiometrie()
    setEnCours(false)
    setMessage(erreur ?? `C'est activé : le coffre s'ouvrira avec ${nom} sur cet appareil ✓`)
  }

  async function retirer(appareil) {
    const question = appareil.ici
      ? `Désactiver ${nom} sur cet appareil ?`
      : `Retirer « ${appareil.libelle} » ? Le coffre ne pourra plus y être ouvert avec ${nom}.`
    if (window.confirm(question)) await retirerAppareil(appareil)
  }

  if (!disponible && appareils.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <p className="font-sans text-sm text-text-secondary">
        Ouvre le coffre avec {nom}, sans taper la phrase. La clé reste protégée par la
        puce sécurisée de l'appareil, et le coffre se reverrouille après 1 minute
        d'inactivité.
      </p>

      {appareils.length > 0 && (
        <ul className="flex flex-col divide-y divide-separator">
          {appareils.map((a) => (
            <li key={a.id} className="py-2 flex items-center justify-between gap-3">
              <span className="font-sans text-sm text-text-primary">
                {a.libelle}
                {a.ici && <span className="text-text-muted"> (cet appareil)</span>}
                <span className="block text-xs text-text-muted">
                  activé le {new Date(a.created_at).toLocaleDateString('fr-FR')}
                </span>
              </span>
              <button
                onClick={() => retirer(a)}
                className="font-sans text-xs text-text-muted hover:text-text-primary underline shrink-0"
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}

      {disponible && !biometrieIci && (
        <Bouton variante="secondaire" onClick={activer} disabled={enCours}>
          {enCours ? 'Activation…' : `Activer ${nom} sur cet appareil`}
        </Bouton>
      )}
      {message && <p className="font-sans text-sm text-text-muted italic">{message}</p>}
    </div>
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
