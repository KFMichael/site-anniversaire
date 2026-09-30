import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useEspace } from '../espace/contexte'
import { Carte } from '../../components/ui'
import { decalerMois, moisDe } from '../charge/calculs'
import { formaterPrix } from '../courses/drive'
import { repartitionParPoste, total } from './finances'

// Encadré d'« Aujourd'hui » : dépensé ce mois-ci et le premier poste
export default function ResumeFinances() {
  const { espace } = useEspace()
  const [depenses, setDepenses] = useState(null)
  const mois = moisDe()

  useEffect(() => {
    supabase
      .from('depenses')
      .select('categorie, montant_centimes')
      .eq('espace_id', espace.id)
      .gte('jour', mois)
      .lt('jour', decalerMois(mois, 1))
      .then(({ data, error }) => setDepenses(error ? null : data))
  }, [espace.id, mois])

  if (!depenses) return null
  const premier = repartitionParPoste(depenses)[0]

  return (
    <Link to="/finances" className="block transition-transform duration-200 ease-spring active:scale-[0.98]">
      <Carte>
        <p className="font-sans text-text-primary">
          <span aria-hidden="true">💶 </span>
          {depenses.length === 0 ? (
            <span className="text-text-secondary">Aucune dépense notée ce mois-ci ›</span>
          ) : (
            <>
              <strong>{formaterPrix(total(depenses))}</strong> dépensés ce mois-ci
              <span className="text-text-muted">
                {' '}
                · surtout {premier.poste.label.toLowerCase()} ({premier.part} %) ›
              </span>
            </>
          )}
        </p>
      </Carte>
    </Link>
  )
}
