import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useEspace } from '../espace/contexte'
import { Carte } from '../../components/ui'

// Encadré du tableau de bord : combien d'articles attendent sur la liste
export default function ResumeCourses() {
  const { espace } = useEspace()
  const [compte, setCompte] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('produits').select('etat').eq('espace_id', espace.id).neq('etat', 'ok'),
      supabase.from('articles_courses').select('id').eq('espace_id', espace.id),
    ]).then(([p, a]) => {
      if (p.error || a.error) return
      setCompte({
        total: p.data.length + a.data.length,
        bientot: p.data.filter((x) => x.etat === 'bientot').length,
      })
    })
  }, [espace.id])

  if (!compte) return null

  return (
    <Link to="/courses" className="block transition-transform duration-200 ease-spring active:scale-[0.98]">
      <Carte>
        {compte.total === 0 ? (
          <p className="font-sans text-text-secondary">🛒 Rien à acheter pour l'instant 🎉</p>
        ) : (
          <p className="font-sans text-text-primary">
            🛒 <strong>{compte.total}</strong> article{compte.total > 1 ? 's' : ''} sur la liste de courses
            {compte.bientot > 0 && (
              <span className="text-text-muted"> · dont {compte.bientot} presque fini{compte.bientot > 1 ? 's' : ''}</span>
            )}
          </p>
        )}
      </Carte>
    </Link>
  )
}
