import { useEffect } from 'react'
import { useCoffre } from './contexte'
import { Page } from '../../components/ui'
import Chargement from '../../components/Chargement'
import CreationCoffre from './CreationCoffre'
import Deverrouillage from './Deverrouillage'
import ContenuCoffre from './ContenuCoffre'

export default function Coffre() {
  const { coffre, ouvert, erreur, chargerCoffre } = useCoffre()

  useEffect(() => {
    if (coffre === undefined) chargerCoffre()
  }, [coffre, chargerCoffre])

  if (coffre === undefined) {
    return erreur ? (
      <Page titre="Mots de passe" retour={{ vers: '/plus', label: 'Plus' }}>
        <p className="font-sans text-text-muted px-1">
          {erreur} La migration <code>0003_coffre.sql</code> a-t-elle été exécutée ?
        </p>
      </Page>
    ) : (
      <Chargement plein />
    )
  }
  if (!coffre) return <CreationCoffre />
  if (!ouvert) return <Deverrouillage />
  return <ContenuCoffre />
}
