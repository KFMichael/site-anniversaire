import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { GroupeListe, LigneListe, Page, Segmente } from '../../components/ui'

// Ex-site anniversaire, conservé comme « boîte à idées » de l'espace :
// quiz pour trouver une activité, carnet des activités faites, carte des
// voyages et mur de messages. Même gabarit que les autres écrans : grand
// titre, retour vers « Plus », contrôle segmenté pour les rubriques.
const RUBRIQUES = [
  { id: 'idees', label: 'Idées' },
  { id: 'carnet', label: 'Carnet' },
  { id: 'voyages', label: 'Voyages' },
  { id: 'messages', label: 'Messages' },
]

export default function Activites() {
  const location = useLocation()
  const navigate = useNavigate()
  const rubrique = location.pathname.split('/')[2] ?? 'idees'

  // Réglages du mode surprise : sous-écran, retour vers les activités
  if (rubrique === 'surprise') {
    return (
      <Page titre="Mode surprise" retour={{ vers: '/activites/idees', label: 'Activités' }}>
        <Outlet />
      </Page>
    )
  }

  return (
    <Page titre="Activités" sousTitre="Idées de sorties, carnet, voyages, messages" retour={{ vers: '/plus', label: 'Plus' }}>
      <Segmente label="Rubriques" options={RUBRIQUES} valeur={rubrique} onChange={(id) => navigate(`/activites/${id}`)} />
      {/* key : rejoue le quiz depuis le début quand on revient du mode surprise */}
      <Outlet key={location.key} />
      <GroupeListe titre="Surprise">
        <LigneListe vers="/surprise" emoji="🎁" titre="Mode surprise" detail="Mot de passe, salutation, puis le quiz" />
        <LigneListe vers="/activites/surprise" emoji="⚙️" titre="Réglages de la surprise" />
      </GroupeListe>
    </Page>
  )
}
