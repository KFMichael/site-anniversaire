import { Link } from 'react-router-dom'
import { MODULES } from '../../config'
import { useEspace } from '../espace/contexte'
import { Page } from '../../components/ui'

// Onglet « Plus » : les modules qui ne sont pas dans la barre d'onglets,
// en listes groupées façon Réglages d'iOS, puis les réglages de l'espace
export default function Plus() {
  const { espace } = useEspace()
  const groupes = [...new Set(MODULES.map((m) => m.groupe))].map((groupe) => ({
    groupe,
    modules: MODULES.filter((m) => m.groupe === groupe && m.route),
  }))

  return (
    <Page titre="Plus" sousTitre={espace.nom}>
      {groupes.map(({ groupe, modules }) => (
        <Groupe key={groupe} titre={groupe}>
          {modules.map((m) => (
            <Ligne key={m.id} vers={m.route} emoji={m.emoji} titre={m.titre} detail={m.description} />
          ))}
        </Groupe>
      ))}
      <Groupe titre="Espace">
        <Ligne vers="/espace" etat={{ depuis: 'plus' }} emoji="⚙️" titre="Réglages" detail="Membres, profil, notifications, apparence" />
      </Groupe>
    </Page>
  )
}

function Groupe({ titre, children }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="font-sans text-xs uppercase tracking-wide text-text-muted px-4">{titre}</h2>
      <ul className="rounded-3xl bg-bg-elevated shadow-soft overflow-hidden">{children}</ul>
    </section>
  )
}

// Ligne de liste iOS : pastille emoji, titre et détail, chevron ; le
// séparateur commence après la pastille
function Ligne({ vers, etat, emoji, titre, detail }) {
  return (
    <li className="group">
      <Link
        to={vers}
        state={etat}
        className="flex items-center gap-3 pl-4 min-h-14 active:bg-bg-base transition-colors duration-200"
      >
        <span className="w-9 h-9 shrink-0 rounded-xl bg-bg-base flex items-center justify-center text-xl" aria-hidden="true">
          {emoji}
        </span>
        <span className="flex-1 min-w-0 flex items-center gap-2 pr-4 py-3 border-b border-separator group-last:border-b-0">
          <span className="flex-1 min-w-0 flex flex-col">
            <span className="font-sans text-text-primary">{titre}</span>
            <span className="font-sans text-sm text-text-muted truncate">{detail}</span>
          </span>
          <span className="font-sans text-xl text-text-muted" aria-hidden="true">
            ›
          </span>
        </span>
      </Link>
    </li>
  )
}
