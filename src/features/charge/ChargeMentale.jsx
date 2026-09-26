import { useMemo, useState } from 'react'
import { useAuth } from '../auth/contexte'
import { useMembres } from '../espace/useMembres'
import { Bouton, Carte, Page } from '../../components/ui'
import Chargement from '../../components/Chargement'
import {
  calculerRepartition,
  chargesDuMois,
  couleurMembre,
  decalerMois,
  libelleMois,
  moisDe,
  moisModifiable,
} from './calculs'
import { useChargeMentale } from './useChargeMentale'
import Jauge from './Jauge'
import { PoidsPastilles } from './Poids'
import GestionCharges from './GestionCharges'

export default function ChargeMentale() {
  const { utilisateur } = useAuth()
  const [mois, setMois] = useState(() => moisDe())
  const [gestion, setGestion] = useState(false)
  const [message, setMessage] = useState('')
  const { membres } = useMembres()
  const donnees = useChargeMentale(mois)
  const { charges, attributions, chargement, erreur } = donnees

  const modifiable = moisModifiable(mois)
  const chargesAffichees = useMemo(() => {
    const duMois = chargesDuMois(charges, attributions)
    if (modifiable) return duMois
    // Historique : pas de charges créées après ce mois-là
    const finDuMois = decalerMois(mois, 1)
    return duMois.filter((c) => c.created_at < finDuMois)
  }, [charges, attributions, modifiable, mois])
  const repartition = useMemo(
    () => calculerRepartition(chargesAffichees, attributions, membres),
    [chargesAffichees, attributions, membres]
  )
  const ownerParCharge = useMemo(
    () => new Map(attributions.map((a) => [a.charge_id, a.user_id])),
    [attributions]
  )
  const indexMembre = (userId) => membres.findIndex((m) => m.user_id === userId)
  const courant = moisDe()

  function changerMois(n) {
    setMois((m) => decalerMois(m, n))
    setMessage('')
  }

  async function action(promesse) {
    setMessage('')
    const resultat = await promesse
    if (resultat) setMessage(resultat)
  }

  async function reprendre() {
    setMessage('')
    const n = await donnees.reprendreMoisPrecedent()
    setMessage(
      n === 0
        ? `Aucune de tes charges de ${libelleMois(decalerMois(mois, -1)).toLowerCase()} n'est libre.`
        : `${n} charge${n > 1 ? 's' : ''} reprise${n > 1 ? 's' : ''} ✓`
    )
  }

  if (chargement) return <Chargement plein />

  if (gestion) {
    return <GestionCharges donnees={donnees} onFermer={() => setGestion(false)} />
  }

  return (
    <Page titre="Charge mentale" sousTitre="Qui gère quoi ce mois-ci">
      {erreur && <p className="font-sans text-sm text-text-muted italic px-1">{erreur}</p>}

      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => changerMois(-1)}
          aria-label="Mois précédent"
          className="w-10 h-10 rounded-full bg-bg-elevated shadow-soft text-text-primary active:scale-95 transition-transform duration-200 ease-spring"
        >
          ‹
        </button>
        <div className="flex flex-col items-center">
          <span className="font-sans font-semibold text-text-primary">{libelleMois(mois)}</span>
          <span className="font-sans text-xs text-text-muted">
            {mois === courant ? 'Ce mois-ci' : mois > courant ? 'À venir' : 'Historique'}
          </span>
        </div>
        <button
          onClick={() => changerMois(1)}
          disabled={mois > courant}
          aria-label="Mois suivant"
          className="w-10 h-10 rounded-full bg-bg-elevated shadow-soft text-text-primary active:scale-95 transition-transform duration-200 ease-spring disabled:opacity-30"
        >
          ›
        </button>
      </div>

      <Carte titre="Équilibre">
        <Jauge repartition={repartition} membres={membres} />
        {modifiable && repartition.libres.nombre > 0 && (
          <p className="font-sans text-sm text-text-secondary">
            ⚠️ {repartition.libres.nombre} charge{repartition.libres.nombre > 1 ? 's' : ''} sans
            responsable
          </p>
        )}
        {modifiable && repartition.libres.nombre === 0 && repartition.total > 0 && (
          <p className="font-sans text-sm text-text-secondary">✅ Toutes les charges ont un responsable.</p>
        )}
      </Carte>

      {message && <p className="font-sans text-sm text-text-muted italic px-1">{message}</p>}

      <ul className="flex flex-col gap-2">
        {chargesAffichees.map((charge) => {
          const owner = ownerParCharge.get(charge.id)
          const index = indexMembre(owner)
          const membre = membres[index]
          const aMoi = owner === utilisateur.id

          return (
            <li
              key={charge.id}
              className="p-4 rounded-3xl bg-bg-elevated shadow-soft flex items-center gap-3"
              style={membre ? { boxShadow: `inset 4px 0 0 ${couleurMembre(index)}` } : undefined}
            >
              <span className="text-2xl w-10 h-10 shrink-0 rounded-xl bg-bg-base flex items-center justify-center" aria-hidden="true">
                {charge.emoji}
              </span>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-sans font-medium text-text-primary">{charge.nom}</span>
                <span className="flex items-center gap-2">
                  <PoidsPastilles poids={charge.poids} />
                  <span className="font-sans text-xs text-text-muted truncate">
                    {membre ? (aMoi ? 'Toi' : membre.prenom) : owner ? 'Ancien membre' : 'Libre'}
                  </span>
                </span>
              </div>
              {modifiable &&
                (aMoi ? (
                  <Bouton
                    variante="secondaire"
                    className="!px-4 !py-2 text-sm shrink-0"
                    onClick={() => action(donnees.relacher(charge.id))}
                  >
                    Relâcher
                  </Bouton>
                ) : !owner ? (
                  <Bouton
                    className="!px-4 !py-2 text-sm shrink-0"
                    onClick={() => action(donnees.prendre(charge.id))}
                  >
                    Je prends
                  </Bouton>
                ) : null)}
            </li>
          )
        })}
      </ul>

      {modifiable && (
        <div className="flex flex-wrap gap-3 justify-center">
          <Bouton variante="secondaire" onClick={reprendre}>
            Reprendre mes charges de {libelleMois(decalerMois(mois, -1)).split(' ')[0].toLowerCase()}
          </Bouton>
          <Bouton variante="discret" onClick={() => setGestion(true)}>
            Gérer les charges
          </Bouton>
        </div>
      )}
    </Page>
  )
}
