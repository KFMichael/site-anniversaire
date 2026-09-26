import { useState } from 'react'
import { Page } from '../../components/ui'
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

      <div role="tablist" className="flex p-1 rounded-full bg-bg-elevated shadow-soft">
        {[
          { id: 'semaine', label: 'Semaine' },
          { id: 'plats', label: `Plats (${menus.plats.length})` },
        ].map((o) => (
          <button
            key={o.id}
            role="tab"
            aria-selected={onglet === o.id}
            onClick={() => setOnglet(o.id)}
            className={`font-sans flex-1 text-sm py-2 rounded-full transition-all duration-200 ease-spring ${
              onglet === o.id ? 'bg-accent text-white font-medium' : 'text-text-muted'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {onglet === 'semaine' ? (
        <Semaine menus={menus} lundi={lundi} onChangerSemaine={setLundi} />
      ) : (
        <BibliothequePlats menus={menus} />
      )}
    </Page>
  )
}
