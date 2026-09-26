import { Link } from 'react-router-dom'
import { MODULES } from '../../config'
import { useEspace } from '../espace/contexte'
import { Page } from '../../components/ui'
import ResumeCharge from '../charge/ResumeCharge'
import ResumeCourses from '../courses/ResumeCourses'
import ResumeMenus from '../menus/ResumeMenus'

export default function TableauDeBord() {
  const { espace, profil } = useEspace()

  return (
    <Page titre={`Bonjour${profil?.prenom ? ` ${profil.prenom}` : ''} 👋`} sousTitre={espace.nom}>
      <ResumeMenus />
      <ResumeCharge />
      <ResumeCourses />
      <div className="grid grid-cols-2 gap-3">
        {MODULES.map((m) => {
          const contenu = (
            <>
              <span className="text-3xl" aria-hidden="true">
                {m.emoji}
              </span>
              <span className="font-sans font-semibold text-text-primary">{m.titre}</span>
              <span className="font-sans text-sm text-text-muted">{m.description}</span>
              {!m.route && (
                <span className="font-sans text-xs text-text-muted mt-auto pt-1">Bientôt</span>
              )}
            </>
          )
          const classes =
            'p-4 rounded-3xl bg-bg-elevated shadow-soft flex flex-col gap-1.5 min-h-36'

          return m.route ? (
            <Link
              key={m.id}
              to={m.route}
              className={`${classes} transition-transform duration-200 ease-spring active:scale-[0.97]`}
            >
              {contenu}
            </Link>
          ) : (
            <div key={m.id} className={`${classes} !bg-transparent !shadow-none border border-dashed border-separator`}>
              {contenu}
            </div>
          )
        })}
      </div>
    </Page>
  )
}
