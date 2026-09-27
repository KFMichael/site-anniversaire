import { useCallback, useEffect, useState } from 'react'
import { signalerActivite } from '../../lib/activite'
import { supabase } from '../../lib/supabase'
import { useTempsReel } from '../../lib/useTempsReel'
import { useAuth } from '../auth/contexte'
import { useEspace } from '../espace/contexte'

// Listes partagées de l'espace et leurs éléments. Les actions renvoient null
// si tout va bien, sinon un message d'erreur (inviter renvoie { ok, message }).
export function useListes() {
  const { session } = useAuth()
  const { espace } = useEspace()
  const [listes, setListes] = useState([])
  const [elements, setElements] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    const [l, el] = await Promise.all([
      supabase.from('listes').select('*').eq('espace_id', espace.id),
      supabase.from('elements_liste').select('*').eq('espace_id', espace.id),
    ])
    if (l.error || el.error) setErreur('Impossible de charger les listes. La migration 0013 a-t-elle été exécutée ?')
    else {
      setErreur('')
      setListes(l.data.sort((a, b) => a.ordre - b.ordre || a.created_at.localeCompare(b.created_at)))
      setElements(el.data.sort((a, b) => a.created_at.localeCompare(b.created_at)))
    }
    setChargement(false)
  }, [espace.id])

  useEffect(() => {
    charger()
  }, [charger])

  useTempsReel(['listes', 'elements_liste'], espace.id, charger)

  const persister = useCallback(
    async (requete, message) => {
      const { error } = await requete
      await charger()
      return error ? message : null
    },
    [charger]
  )

  // Renvoie { id } de la nouvelle liste, ou { erreur }
  const creerListe = useCallback(
    async (nom, emoji) => {
      const { data, error } = await supabase
        .from('listes')
        .insert({ espace_id: espace.id, nom: nom.trim(), emoji, ordre: listes.length })
        .select('id')
        .single()
      await charger()
      return error ? { erreur: "La liste n'a pas pu être créée." } : { id: data.id }
    },
    [espace.id, listes.length, charger]
  )

  const supprimerListe = useCallback(
    (liste) => {
      setListes((x) => x.filter((l) => l.id !== liste.id))
      return persister(supabase.from('listes').delete().eq('id', liste.id), "La liste n'a pas pu être supprimée.")
    },
    [persister]
  )

  const ajouter = useCallback(
    async (listeId, texte) => {
      const { error } = await supabase.from('elements_liste').insert({ liste_id: listeId, espace_id: espace.id, texte: texte.trim() })
      if (!error) signalerActivite(espace.id)
      await charger()
      return error ? "L'élément n'a pas pu être ajouté." : null
    },
    [espace.id, charger]
  )

  const basculer = useCallback(
    (element) => {
      const fait = !element.fait
      setElements((x) => x.map((e) => (e.id === element.id ? { ...e, fait } : e)))
      return persister(
        supabase.from('elements_liste').update({ fait, updated_at: new Date().toISOString() }).eq('id', element.id),
        "L'élément n'a pas pu être mis à jour."
      )
    },
    [persister]
  )

  const supprimer = useCallback(
    (element) => {
      setElements((x) => x.filter((e) => e.id !== element.id))
      return persister(supabase.from('elements_liste').delete().eq('id', element.id), "L'élément n'a pas pu être supprimé.")
    },
    [persister]
  )

  const appelerInvitation = useCallback(
    async (element, action) => {
      try {
        const reponse = await fetch('/api/invitation', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ element_id: element.id, action }),
        })
        const corps = await reponse.json().catch(() => ({}))
        await charger()
        if (!reponse.ok) return { ok: false, message: corps.erreur ?? "L'invitation n'a pas pu être envoyée." }
        return { ok: true, message: action === 'annuler' ? 'Invitation annulée ✓' : 'Invitation envoyée à tout le monde ✓' }
      } catch {
        return { ok: false, message: "L'envoi n'est pas disponible pour le moment." }
      }
    },
    [session, charger]
  )

  // Enregistre la date proposée puis envoie l'invitation d'agenda
  const inviter = useCallback(
    async (element, debut, duree) => {
      const { error } = await supabase
        .from('elements_liste')
        .update({ invitation_debut: debut.toISOString(), invitation_duree: duree, updated_at: new Date().toISOString() })
        .eq('id', element.id)
      if (error) return { ok: false, message: "La date n'a pas pu être enregistrée." }
      return appelerInvitation(element, 'envoyer')
    },
    [appelerInvitation]
  )

  const annulerInvitation = useCallback((element) => appelerInvitation(element, 'annuler'), [appelerInvitation])

  return { listes, elements, chargement, erreur, creerListe, supprimerListe, ajouter, basculer, supprimer, inviter, annulerInvitation }
}
