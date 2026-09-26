import { Navigate, Outlet } from 'react-router-dom'
import { useEspace } from './contexte'
import Chargement from '../../components/Chargement'

export default function RequiertEspace() {
  const { espace, chargement, erreur } = useEspace()

  if (chargement) return <Chargement plein />
  if (erreur) {
    return (
      <Chargement
        plein
        texte="Impossible de charger ton espace. Les tables Supabase sont-elles créées ?"
      />
    )
  }
  if (!espace) return <Navigate to="/bienvenue" replace />

  return <Outlet />
}
