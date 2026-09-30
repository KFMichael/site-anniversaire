import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Page, Segmente } from '../../components/ui'
import Chargement from '../../components/Chargement'
import { useCourses } from './useCourses'
import { compterListe, construireListe } from './liste'
import ListeCourses from './ListeCourses'
import Stock from './Stock'

export default function Courses() {
  const courses = useCourses()
  const [onglet, setOnglet] = useState('liste')
  const location = useLocation()
  const navigate = useNavigate()
  // Message laissé par l'écran précédent (ex. « Commande notée ✓ » au drive),
  // retiré de l'historique pour ne pas réapparaître au rechargement
  const [message, setMessage] = useState(location.state?.message ?? '')
  useEffect(() => {
    if (location.state?.message) navigate('.', { replace: true, state: null })
  }, [location.state, navigate])
  const compte = useMemo(
    () => compterListe(construireListe(courses.produits, courses.articles)),
    [courses.produits, courses.articles],
  )

  if (courses.chargement) return <Chargement plein />

  return (
    <Page titre="Courses">
      {courses.erreur && <p className="font-sans text-sm text-text-muted italic px-1">{courses.erreur}</p>}

      <Segmente
        label="Courses"
        options={[
          { id: 'liste', label: `Liste (${compte.total})` },
          { id: 'stock', label: 'Stock de la maison' },
        ]}
        valeur={onglet}
        onChange={(id) => {
          setOnglet(id)
          setMessage('')
        }}
      />

      {message && (
        <p role="status" className="font-sans text-sm text-text-muted italic px-1">
          {message}
        </p>
      )}

      {onglet === 'liste' ? (
        <ListeCourses courses={courses} onMessage={setMessage} />
      ) : (
        <Stock courses={courses} onMessage={setMessage} />
      )}
    </Page>
  )
}
