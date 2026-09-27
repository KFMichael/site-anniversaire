import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  activerNotifications,
  desactiverNotifications,
  estIOS,
  etatNotifications,
  pushConfigure,
} from '../../lib/push'
import { useAuth } from '../auth/contexte'
import { Bouton, Carte, Interrupteur } from '../../components/ui'

const TYPES = [
  { champ: 'push_diner', label: 'Dîner du soir', detail: '« Ce soir : Garba », en fin d’après-midi' },
  { champ: 'push_sport', label: 'Sport du lendemain', detail: '« Demain : sport », la veille au soir' },
  { champ: 'push_hebdo', label: 'Récap du dimanche', detail: 'Charges, dîners et courses de la semaine' },
  { champ: 'push_mensuel', label: 'Rappel du 1er du mois', detail: 'Choisir sa charge mentale' },
  { champ: 'push_activite', label: 'Actions des autres', detail: '« Léa a ajouté lait à la liste », charges prises, dîners prévus' },
]

export default function Notifications() {
  const { session, utilisateur } = useAuth()
  const [etat, setEtat] = useState(null)
  const [preferences, setPreferences] = useState({ push_diner: true, push_hebdo: true, push_mensuel: true, push_activite: true, push_sport: true })
  const [enCours, setEnCours] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!pushConfigure) return
    etatNotifications().then(setEtat)
    supabase
      .from('preferences_notifications')
      .select('push_diner, push_hebdo, push_mensuel, push_activite, push_sport')
      .eq('user_id', utilisateur.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPreferences(data)
      })
  }, [utilisateur.id])

  // Serveur sans clés VAPID : rien à proposer
  if (!pushConfigure || etat === null) return null

  async function basculer(activer) {
    setEnCours(true)
    setMessage('')
    const erreur = activer ? await activerNotifications() : await desactiverNotifications()
    setMessage(erreur ?? (activer ? 'Notifications activées sur cet appareil ✓' : ''))
    setEtat(await etatNotifications())
    setEnCours(false)
  }

  async function changer(champ, valeur) {
    const suivantes = { ...preferences, [champ]: valeur }
    setPreferences(suivantes)
    const { error } = await supabase
      .from('preferences_notifications')
      .upsert({ user_id: utilisateur.id, [champ]: valeur, updated_at: new Date().toISOString() })
    if (error) setMessage("La préférence n'a pas pu être enregistrée.")
  }

  async function tester() {
    setEnCours(true)
    setMessage('')
    try {
      const reponse = await fetch('/api/notifications', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const corps = await reponse.json().catch(() => ({}))
      setMessage(reponse.ok ? 'Notification envoyée : elle arrive dans quelques secondes.' : corps.erreur ?? "L'envoi a échoué.")
    } catch {
      setMessage("L'envoi n'est pas disponible pour le moment.")
    }
    setEnCours(false)
  }

  return (
    <Carte titre="Notifications">
      {etat === 'a-installer' && (
        <div className="flex flex-col gap-2 font-sans text-sm text-text-secondary">
          <p>Sur iPhone, les notifications demandent d'installer Nido sur l'écran d'accueil :</p>
          <ol className="list-decimal pl-5 flex flex-col gap-1">
            <li>
              Dans Safari, touche le bouton <strong>Partager</strong> (carré avec une flèche).
            </li>
            <li>
              Choisis <strong>Sur l'écran d'accueil</strong>, puis <strong>Ajouter</strong>.
            </li>
            <li>Ouvre Nido depuis sa nouvelle icône et reviens ici.</li>
          </ol>
        </div>
      )}

      {etat === 'non-supporte' && (
        <p className="font-sans text-sm text-text-secondary">
          Ce navigateur ne permet pas les notifications.
          {estIOS() && ' Il faut iOS 16.4 ou plus récent.'}
        </p>
      )}

      {etat === 'refuse' && (
        <p className="font-sans text-sm text-text-secondary">
          Les notifications ont été refusées pour Nido. Pour les réactiver :{' '}
          {estIOS() ? 'Réglages › Notifications › Nido.' : 'réglages du site dans le navigateur.'}
        </p>
      )}

      {(etat === 'inactif' || etat === 'actif') && (
        <>
          <Interrupteur
            label="Notifications sur cet appareil"
            detail={etat === 'actif' ? 'Activées' : 'Désactivées'}
            actif={etat === 'actif'}
            onChange={(v) => !enCours && basculer(v)}
          />
          {etat === 'actif' && (
            <>
              {TYPES.map((t) => (
                <Interrupteur
                  key={t.champ}
                  label={t.label}
                  detail={t.detail}
                  actif={preferences[t.champ] !== false}
                  onChange={(v) => changer(t.champ, v)}
                />
              ))}
              <Bouton variante="secondaire" onClick={tester} disabled={enCours}>
                Envoyer une notification de test
              </Bouton>
            </>
          )}
        </>
      )}

      {message && (
        <p role="status" className="font-sans text-sm text-text-muted italic">
          {message}
        </p>
      )}
    </Carte>
  )
}
