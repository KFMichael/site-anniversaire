import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/contexte'
import { EspaceContexte } from './contexte'

const CLE_ESPACE_COURANT = 'espace-courant'

function lireEspaceMemorise() {
  try {
    return localStorage.getItem(CLE_ESPACE_COURANT)
  } catch {
    return null
  }
}

function memoriserEspace(id) {
  try {
    localStorage.setItem(CLE_ESPACE_COURANT, id)
  } catch {
    // navigation privée : on garde juste l'état en mémoire
  }
}

export default function EspaceProvider({ children }) {
  const { utilisateur } = useAuth()
  const [espaces, setEspaces] = useState([])
  const [profil, setProfil] = useState(null)
  const [espaceId, setEspaceId] = useState(lireEspaceMemorise)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(false)

  const recharger = useCallback(async () => {
    if (!utilisateur) return
    const [membres, profilReponse] = await Promise.all([
      supabase
        .from('membres_espace')
        .select('role, espaces (id, nom)')
        .eq('user_id', utilisateur.id)
        .order('created_at', { ascending: true }),
      supabase.from('profils').select('id, prenom, email').eq('id', utilisateur.id).maybeSingle(),
    ])

    if (membres.error) {
      setErreur(true)
    } else {
      setErreur(false)
      setEspaces(membres.data.map((m) => ({ ...m.espaces, role: m.role })))
    }
    if (!profilReponse.error) setProfil(profilReponse.data)
    setChargement(false)
  }, [utilisateur])

  useEffect(() => {
    recharger()
  }, [recharger])

  const choisirEspace = useCallback((id) => {
    setEspaceId(id)
    memoriserEspace(id)
  }, [])

  // Espace mémorisé s'il fait toujours partie des espaces de l'utilisateur,
  // sinon le premier rejoint
  const espace = espaces.find((e) => e.id === espaceId) ?? espaces[0] ?? null

  const valeur = useMemo(
    () => ({ espaces, espace, profil, chargement, erreur, choisirEspace, recharger }),
    [espaces, espace, profil, chargement, erreur, choisirEspace, recharger]
  )

  return <EspaceContexte.Provider value={valeur}>{children}</EspaceContexte.Provider>
}
