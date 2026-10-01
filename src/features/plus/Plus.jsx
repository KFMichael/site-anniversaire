import { MODULES } from '../../config'
import { useEspace } from '../espace/contexte'
import { GroupeListe, LigneListe, Page } from '../../components/ui'

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
        <GroupeListe key={groupe} titre={groupe}>
          {modules.map((m) => (
            <LigneListe key={m.id} vers={m.route} emoji={m.emoji} titre={m.titre} detail={m.description} />
          ))}
        </GroupeListe>
      ))}
      <GroupeListe titre="Espace">
        <LigneListe vers="/espace" etat={{ depuis: 'plus' }} emoji="⚙️" titre="Réglages" detail="Membres, profil, notifications, apparence" />
      </GroupeListe>
    </Page>
  )
}
