import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/contexte'
import { useEspace } from '../espace/contexte'
import { Carte } from '../../components/ui'
import { moisDe } from './calculs'

// Encadré du tableau de bord : mes charges du mois et celles sans responsable
export default function ResumeCharge() {
  const { utilisateur } = useAuth()
  const { espace } = useEspace()
  const [resume, setResume] = useState(null)
  const mois = moisDe()

  useEffect(() => {
    Promise.all([
      supabase.from('charges').select('id, nom, emoji, archivee').eq('espace_id', espace.id),
      supabase.from('attributions').select('charge_id, user_id').eq('espace_id', espace.id).eq('mois', mois),
    ]).then(([charges, attributions]) => {
      if (charges.error || attributions.error) return
      const owners = new Map(attributions.data.map((a) => [a.charge_id, a.user_id]))
      setResume({
        miennes: charges.data.filter((c) => owners.get(c.id) === utilisateur.id),
        libres: charges.data.filter((c) => !c.archivee && !owners.has(c.id)).length,
      })
    })
  }, [espace.id, mois, utilisateur.id])

  if (!resume) return null

  return (
    <Link to={resume.miennes.length ? '/charge?vue=mes' : '/charge?vue=choisir'} className="block transition-transform duration-200 ease-spring active:scale-[0.98]">
      <Carte titre="Ce mois-ci, tu gères">
        {resume.miennes.length === 0 ? (
          <p className="font-sans text-sm text-text-secondary">
            Rien pour l'instant. Choisis ta charge mentale du mois ›
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {resume.miennes.map((c) => (
              <li
                key={c.id}
                className="font-sans text-sm px-3 py-1.5 rounded-full bg-bg-base text-text-primary"
              >
                {c.emoji} {c.nom}
              </li>
            ))}
          </ul>
        )}
        {resume.libres > 0 && (
          <p className="font-sans text-sm text-text-muted">
            ⚠️ {resume.libres} charge{resume.libres > 1 ? 's' : ''} sans responsable
          </p>
        )}
      </Carte>
    </Link>
  )
}
