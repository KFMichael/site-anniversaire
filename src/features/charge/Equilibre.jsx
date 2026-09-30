import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useEspace } from '../espace/contexte'
import { useMembres } from '../espace/useMembres'
import { Carte, EtatErreur, Page } from '../../components/ui'
import Chargement from '../../components/Chargement'
import { bilanCharge, couleurMembre, decalerMois, historiqueCharge, libelleMois, moisDe } from './calculs'
import Jauge from './Jauge'

const NB_MOIS = 6

// Équilibre de la charge mentale sur les 6 derniers mois : bilan de la
// période, puis la répartition mois par mois
export default function Equilibre() {
  const { espace } = useEspace()
  const { membres } = useMembres()
  const [charges, setCharges] = useState([])
  const [attributions, setAttributions] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const courant = moisDe()
  const moisListe = useMemo(() => Array.from({ length: NB_MOIS }, (_, i) => decalerMois(courant, -i)), [courant])

  useEffect(() => {
    let actif = true
    Promise.all([
      supabase.from('charges').select('*').eq('espace_id', espace.id),
      supabase
        .from('attributions')
        .select('charge_id, user_id, mois')
        .eq('espace_id', espace.id)
        .gte('mois', moisListe.at(-1)),
    ]).then(([c, a]) => {
      if (!actif) return
      if (c.error || a.error) setErreur("L'historique de la charge mentale n'a pas pu être chargé.")
      else {
        setCharges(c.data)
        setAttributions(a.data)
      }
      setChargement(false)
    })
    return () => {
      actif = false
    }
  }, [espace.id, moisListe])

  const historique = useMemo(
    () => historiqueCharge(charges, attributions, membres, moisListe, courant),
    [charges, attributions, membres, moisListe, courant]
  )
  const bilan = useMemo(() => bilanCharge(historique, membres), [historique, membres])

  const retour = { vers: '/charge', label: 'Charge mentale' }
  if (chargement) return <Chargement plein />
  if (erreur) {
    return (
      <Page titre="Équilibre" retour={retour}>
        <EtatErreur message={erreur} />
      </Page>
    )
  }

  const tri = bilan.parMembre
    .map((p, i) => ({ ...p, prenom: membres[i]?.prenom ?? 'Quelqu’un' }))
    .sort((a, b) => b.points - a.points)

  return (
    <Page titre="Équilibre" sousTitre={`La charge mentale sur ${NB_MOIS} mois`} retour={retour}>
      {bilan.total === 0 ? (
        <Carte>
          <p className="font-sans text-text-secondary">
            Aucune charge prise ces {NB_MOIS} derniers mois : l'équilibre apparaîtra dès que chacun aura choisi ses
            charges.
          </p>
          <Link to="/charge?vue=choisir" className="min-h-11 inline-flex items-center font-sans text-accent-text font-medium">
            Choisir mes charges
          </Link>
        </Carte>
      ) : (
        <Carte titre={`Depuis ${libelleMois(moisListe.at(-1)).toLowerCase()}`}>
          <p className="font-sans text-text-primary">{phraseBilan(tri)}</p>
          <Jauge repartition={bilan} membres={membres} />
        </Carte>
      )}

      <section className="flex flex-col gap-1.5">
        <h2 className="font-sans text-xs uppercase tracking-wide text-text-muted px-1">Mois par mois</h2>
        <ul className="rounded-3xl bg-bg-elevated shadow-soft divide-y divide-separator overflow-hidden">
          {historique.map(({ mois, repartition }) => (
            <LigneMois key={mois} mois={mois} repartition={repartition} membres={membres} courant={courant} />
          ))}
        </ul>
        <p className="font-sans text-xs text-text-muted px-1">
          Points : léger 1, moyen 2, lourd 3. Les charges sans responsable sont en gris.
        </p>
      </section>
    </Page>
  )
}

// « Équilibre parfait », ou « Michael porte 58 % de la charge, Léa 42 % »
function phraseBilan(tri) {
  const actifs = tri.filter((p) => p.points > 0)
  if (tri.length > 1 && tri[0].part - tri.at(-1).part <= 10) {
    return `Plutôt équilibré ⚖️ : ${tri.map((p) => `${p.prenom} ${p.part} %`).join(', ')}.`
  }
  if (actifs.length === 1 && tri.length > 1) return `${actifs[0].prenom} porte toute la charge prise.`
  return `${tri[0].prenom} porte ${tri[0].part} % de la charge${tri.length > 1 ? `, ${tri.slice(1).map((p) => `${p.prenom} ${p.part} %`).join(', ')}` : ''}.`
}

// Un mois : barre empilée (une couleur par membre, gris pour les charges
// libres) et les points écrits en texte
function LigneMois({ mois, repartition, membres, courant }) {
  const { parMembre, libres, total } = repartition
  const segments = [
    ...parMembre.map((p, i) => ({ cle: p.user_id, points: p.points, couleur: couleurMembre(i), nom: membres[i]?.prenom })),
    { cle: 'libres', points: libres.points, couleur: null, nom: 'sans responsable' },
  ].filter((s) => s.points > 0)
  const texte = segments.map((s) => `${s.nom} ${s.points} pt${s.points > 1 ? 's' : ''}`).join(' · ')

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-sans text-text-primary font-medium">
          {libelleMois(mois)}
          {mois === courant && <span className="text-text-muted font-normal"> · en cours</span>}
        </span>
        <span className="font-sans text-xs text-text-muted tabular-nums">{total} pts</span>
      </div>
      {total === 0 ? (
        <span className="font-sans text-sm text-text-muted">Aucune charge</span>
      ) : (
        <>
          <div className="flex h-3 w-full gap-0.5" aria-hidden="true">
            {segments.map((s) => (
              <div
                key={s.cle}
                title={`${s.nom} : ${s.points} pts`}
                className={`h-full rounded-sm first:rounded-l-full last:rounded-r-full ${s.couleur ? '' : 'bg-separator'}`}
                style={{ width: `${(s.points / total) * 100}%`, ...(s.couleur ? { backgroundColor: s.couleur } : {}) }}
              />
            ))}
          </div>
          <span className="font-sans text-sm text-text-secondary">{texte}</span>
        </>
      )}
    </li>
  )
}
