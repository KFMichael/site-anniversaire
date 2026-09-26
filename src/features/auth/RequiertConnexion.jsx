import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './contexte'
import Chargement from '../../components/Chargement'

export default function RequiertConnexion() {
  const { utilisateur, chargement } = useAuth()
  const location = useLocation()

  if (chargement) return <Chargement plein />

  if (!utilisateur) {
    const retour = location.pathname + location.search
    return <Navigate to={`/connexion?redirection=${encodeURIComponent(retour)}`} replace />
  }

  return <Outlet />
}
