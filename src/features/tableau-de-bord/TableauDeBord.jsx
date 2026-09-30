import { Link } from 'react-router-dom'
import { useEspace } from '../espace/contexte'
import { Page } from '../../components/ui'
import ResumeCharge from '../charge/ResumeCharge'
import ResumeCourses from '../courses/ResumeCourses'
import ResumeMenus from '../menus/ResumeMenus'
import ResumeEcheances from '../echeances/ResumeEcheances'
import ResumeFinances from '../finances/ResumeFinances'

// « Aujourd'hui » : ce qui compte aujourd'hui, en un coup d'œil ; chaque
// carte ouvre son module. Les autres modules sont dans l'onglet « Plus ».
export default function TableauDeBord() {
  const { espace, profil } = useEspace()
  const date = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  const initiale = (profil?.prenom || profil?.email || '?').trim().charAt(0).toUpperCase()

  return (
    <Page
      titre="Aujourd'hui"
      sousTitre={`${profil?.prenom ? `Bonjour ${profil.prenom} · ` : ''}${date}`}
      action={
        <Link
          to="/espace"
          aria-label={`Réglages de l'espace ${espace.nom} et profil`}
          className="w-11 h-11 shrink-0 mt-0.5 rounded-full bg-accent text-white font-sans text-lg font-semibold flex items-center justify-center transition-transform duration-200 ease-spring active:scale-95"
        >
          {initiale}
        </Link>
      }
    >
      <ResumeMenus />
      <ResumeEcheances />
      <ResumeCharge />
      <ResumeCourses />
      <ResumeFinances />
    </Page>
  )
}
