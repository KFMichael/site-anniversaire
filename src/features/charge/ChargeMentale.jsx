import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/contexte'
import { useMembres } from '../espace/useMembres'
import { Bouton, Carte, Page, Segmente } from '../../components/ui'
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
  // Sans aucune charge active dans l'espace, on arrive directement sur la
  // modification de la liste (catalogue ouvert), une fois par visite
  const [aucuneChargeVue, setAucuneChargeVue] = useState(false)
  const [message, setMessage] = useState('')
  const [params] = useSearchParams()
  const [vueChoisie, setVueChoisie] = useState(() => (['mes', 'choisir'].includes(params.get('vue')) ? params.get('vue') : null))
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
        ? `Aucune de tes charges ${moisPrecedent} n'est libre.`
        : `${n} charge${n > 1 ? 's' : ''} reprise${n > 1 ? 's' : ''} ✓`
    )
  }

  const miennes = chargesAffichees.filter((c) => ownerParCharge.get(c.id) === utilisateur.id)
  const libres = chargesAffichees.filter((c) => !ownerParCharge.has(c.id))
  const prises = chargesAffichees.filter((c) => ownerParCharge.has(c.id) && ownerParCharge.get(c.id) !== utilisateur.id)
  const pointsMiens = miennes.reduce((t, c) => t + c.poids, 0)
  // « de septembre », « d'août », « d'octobre »
  const nomMoisPrecedent = libelleMois(decalerMois(mois, -1)).split(' ')[0].toLowerCase()
  const moisPrecedent = /^[aeiouyâéè]/.test(nomMoisPrecedent) ? `d'${nomMoisPrecedent}` : `de ${nomMoisPrecedent}`
  // Onglet : « Mes charges » si j'en ai déjà, sinon « Choisir » ; fixé au
  // premier chargement (prendre une charge ne change pas d'onglet)
  const vue = vueChoisie ?? (miennes.length > 0 ? 'mes' : 'choisir')
  useEffect(() => {
    if (!chargement && vueChoisie === null) setVueChoisie(miennes.length > 0 ? 'mes' : 'choisir')
  }, [chargement, vueChoisie, miennes.length])
  const setVue = (v) => {
    setVueChoisie(v)
    setMessage('')
  }

  const ligne = (charge) => {
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
            <Bouton variante="secondaire" className="!px-4 !py-2 min-h-11 text-sm shrink-0" onClick={() => action(donnees.relacher(charge.id))}>
              Relâcher
            </Bouton>
          ) : !owner ? (
            <Bouton
              className="!px-4 !py-2 min-h-11 text-sm shrink-0"
              onClick={async () => {
                setMessage('')
                const erreur = await donnees.prendre(charge.id)
                setMessage(erreur ?? `✓ « ${charge.nom} » ajoutée à tes charges`)
              }}
            >
              Je prends
            </Bouton>
          ) : null)}
      </li>
    )
  }

  const sansCharges = !chargement && !erreur && charges.every((c) => c.archivee)
  useEffect(() => {
    if (sansCharges && !aucuneChargeVue) {
      setGestion(true)
      setAucuneChargeVue(true)
    }
  }, [sansCharges, aucuneChargeVue])

  if (chargement) return <Chargement plein />

  if (gestion || (sansCharges && !aucuneChargeVue)) {
    return <GestionCharges donnees={donnees} onFermer={() => setGestion(false)} />
  }

  return (
    <Page titre="Charge mentale" sousTitre="Qui gère quoi ce mois-ci">
      {erreur && <p className="font-sans text-sm text-text-muted italic px-1">{erreur}</p>}

      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => changerMois(-1)}
          aria-label="Mois précédent"
          className="cible-44 w-11 h-11 rounded-full bg-bg-elevated shadow-soft text-text-primary active:scale-95 transition-transform duration-200 ease-spring"
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
          className="cible-44 w-11 h-11 rounded-full bg-bg-elevated shadow-soft text-text-primary active:scale-95 transition-transform duration-200 ease-spring disabled:opacity-30"
        >
          ›
        </button>
      </div>

      <Segmente
        label="Charges"
        options={[
          { id: 'mes', label: `Mes charges (${miennes.length})` },
          { id: 'choisir', label: modifiable && libres.length ? `Choisir (${libres.length} libre${libres.length > 1 ? 's' : ''})` : 'Toutes' },
        ]}
        valeur={vue}
        onChange={setVue}
      />


      {message && (
        <p role="status" className="font-sans text-sm text-text-secondary px-1">
          {message}
        </p>
      )}

      {vue === 'mes' ? (
        <section aria-label="Mes charges" className="flex flex-col gap-3">
          {miennes.length === 0 ? (
            <Carte>
              <p className="font-sans text-text-primary">
                {modifiable ? "Tu n'as encore aucune charge ce mois-ci." : "Tu n'avais aucune charge ce mois-là."}
              </p>
              {modifiable && (
                <>
                  <Bouton onClick={() => setVue('choisir')}>Choisir mes charges</Bouton>
                  <Bouton variante="secondaire" onClick={reprendre}>
                    Reprendre mes charges {moisPrecedent}
                  </Bouton>
                </>
              )}
            </Carte>
          ) : (
            <>
              <p className="font-sans text-sm text-text-secondary px-1">
                {miennes.length} charge{miennes.length > 1 ? 's' : ''} · {pointsMiens} point{pointsMiens > 1 ? 's' : ''} sur{' '}
                {repartition.total}
              </p>
              <ul className="flex flex-col gap-2">{miennes.map(ligne)}</ul>
              {modifiable && (
                <Bouton variante="secondaire" onClick={() => setVue('choisir')}>
                  + Prendre une autre charge
                </Bouton>
              )}
            </>
          )}
        </section>
      ) : (
        <section aria-label="Choisir" className="flex flex-col gap-4">
          <Carte titre="Équilibre">
            <Jauge repartition={repartition} membres={membres} />
            {modifiable && repartition.libres.nombre === 0 && repartition.total > 0 && (
              <p className="font-sans text-sm text-text-secondary">✅ Toutes les charges ont un responsable.</p>
            )}
          </Carte>

          {libres.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="font-sans text-xs uppercase tracking-wide text-text-muted px-1">
                {modifiable ? `Libres (${libres.length})` : `Sans responsable (${libres.length})`}
              </h2>
              <ul className="flex flex-col gap-2">{libres.map(ligne)}</ul>
            </div>
          )}
          {prises.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="font-sans text-xs uppercase tracking-wide text-text-muted px-1">Déjà prises ({prises.length})</h2>
              <ul className="flex flex-col gap-2">{prises.map(ligne)}</ul>
            </div>
          )}
          {chargesAffichees.length === 0 && (
            <p className="font-sans text-sm text-text-muted px-1">Aucune charge dans l'espace pour l'instant.</p>
          )}

          {modifiable && (
            <Bouton variante="secondaire" onClick={reprendre}>
              Reprendre mes charges {moisPrecedent}
            </Bouton>
          )}
        </section>
      )}

      <Link
        to="/charge/equilibre"
        className="font-sans min-h-11 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-separator bg-bg-elevated text-text-primary transition-all duration-200 ease-spring active:scale-95"
      >
        <span aria-hidden="true">📊</span>
        Voir l'équilibre sur 6 mois
      </Link>
      <Bouton variante="secondaire" onClick={() => setGestion(true)}>
        ✏️ Modifier la liste des charges
      </Bouton>
    </Page>
  )
}
