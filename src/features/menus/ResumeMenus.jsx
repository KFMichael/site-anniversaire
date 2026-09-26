import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useEspace } from '../espace/contexte'
import { Carte } from '../../components/ui'
import { versIso } from './tirage'

// Encadré du tableau de bord : le dîner de ce soir
export default function ResumeMenus() {
  const { espace } = useEspace()
  const [diner, setDiner] = useState(undefined)

  useEffect(() => {
    supabase
      .from('diners')
      .select('texte, plats (nom)')
      .eq('espace_id', espace.id)
      .eq('jour', versIso(new Date()))
      .maybeSingle()
      .then(({ data, error }) => setDiner(error ? undefined : data))
  }, [espace.id])

  if (diner === undefined) return null
  const nom = diner?.plats?.nom ?? diner?.texte

  return (
    <Link to="/menus" className="block transition-transform duration-200 ease-spring active:scale-[0.98]">
      <Carte>
        <p className="font-sans text-text-primary">
          🍽️ Ce soir : {nom ? <strong>{nom}</strong> : <span className="text-text-muted">rien de prévu ›</span>}
        </p>
      </Carte>
    </Link>
  )
}
