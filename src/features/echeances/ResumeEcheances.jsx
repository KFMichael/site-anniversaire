import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useEspace } from '../espace/contexte'
import { Carte } from '../../components/ui'
import { versIso } from '../menus/tirage'
import { categorieEcheance, joursRestants, libelleDelai } from './echeances'

// Encadré du tableau de bord : la prochaine échéance (en retard ou à 14 jours)
export default function ResumeEcheances() {
  const { espace } = useEspace()
  const [prochaine, setProchaine] = useState(null)

  useEffect(() => {
    const aujourdhui = versIso(new Date())
    supabase
      .from('echeances')
      .select('titre, categorie, date, faite_le')
      .eq('espace_id', espace.id)
      .then(({ data, error }) => {
        if (error) return
        const suivante = (data ?? [])
          .filter((e) => !e.faite_le && joursRestants(e.date, aujourdhui) <= 14)
          .sort((a, b) => a.date.localeCompare(b.date))[0]
        setProchaine(suivante ? { ...suivante, jours: joursRestants(suivante.date, aujourdhui) } : null)
      })
  }, [espace.id])

  if (!prochaine) return null

  return (
    <Link to="/echeances" className="block transition-transform duration-200 ease-spring active:scale-[0.98]">
      <Carte>
        <p className="font-sans text-text-primary">
          <span aria-hidden="true">{categorieEcheance(prochaine.categorie).emoji} </span>
          <strong>{prochaine.titre}</strong> : {prochaine.jours < 0 ? '⚠️ ' : ''}
          {libelleDelai(prochaine.jours)} ›
        </p>
      </Carte>
    </Link>
  )
}
