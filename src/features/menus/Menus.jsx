import { useState } from 'react'
import { Page, Segmente } from '../../components/ui'
import Chargement from '../../components/Chargement'
import { useMenus } from './useMenus'
import { lundiDe } from './tirage'
import Semaine from './Semaine'
import BibliothequePlats from './BibliothequePlats'

export default function Menus() {
  const [lundi, setLundi] = useState(() => lundiDe())
  const [onglet, setOnglet] = useState('semaine')
  const menus = useMenus(lundi)

  if (menus.chargement) return <Chargement plein />

  return (
    <Page titre="Menus" sousTitre="Les dîners de la semaine">
      {menus.erreur && <p className="font-sans text-sm text-text-muted italic px-1">{menus.erreur}</p>}

      <Segmente
        label="Menus"
        options={[
          { id: 'semaine', label: 'Semaine' },
          { id: 'plats', label: `Plats (${menus.plats.length})` },
        ]}
        valeur={onglet}
        onChange={setOnglet}
      />

      {onglet === 'semaine' ? (
        <Semaine menus={menus} lundi={lundi} onChangerSemaine={setLundi} />
      ) : (
        <BibliothequePlats menus={menus} />
      )}
    </Page>
  )
}
