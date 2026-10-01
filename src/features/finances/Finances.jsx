import { useMemo, useState } from 'react'
import { Bouton, BoutonAjouter, Carte, ChampTexte, EtatErreur, Feuille, Page } from '../../components/ui'
import { useMessages } from '../../components/messages-contexte'
import Chargement from '../../components/Chargement'
import { decalerMois, libelleMois, moisDe } from '../charge/calculs'
import { formaterPrix } from '../courses/drive'
import {
  POSTES,
  alertesBudget,
  depensesDuMois,
  devinerPoste,
  evolution,
  lignesAvecBudget,
  lireMontant,
  poste,
  texteAlerte,
  total,
} from './finances'
import { useFinances } from './useFinances'

function aujourdhui() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// « 3 sept. »
function libelleJour(jour) {
  const [a, m, j] = jour.split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(a, m - 1, j))
}

// Finances : où part l'argent du compte commun, poste par poste et mois par mois
export default function Finances() {
  const [mois, setMois] = useState(() => moisDe())
  const [edition, setEdition] = useState(null) // null | 'nouvelle' | dépense
  const [budgetsOuverts, setBudgetsOuverts] = useState(false)
  const { annoncer } = useMessages()
  const f = useFinances(mois)
  const courant = moisDe()

  const duMois = useMemo(() => depensesDuMois(f.depenses, mois), [f.depenses, mois])
  const precedent = useMemo(() => depensesDuMois(f.depenses, decalerMois(mois, -1)), [f.depenses, mois])
  const lignes = useMemo(() => lignesAvecBudget(duMois, f.budgets), [duMois, f.budgets])
  const alertes = alertesBudget(lignes)
  const totalMois = total(duMois)
  const variation = evolution(totalMois, total(precedent))
  const nomMoisPrecedent = libelleMois(decalerMois(mois, -1)).split(' ')[0].toLowerCase()

  function changerMois(n) {
    setMois((m) => decalerMois(m, n))
    setEdition(null)
  }

  const retour = { vers: '/plus', label: 'Plus' }
  if (f.chargement) return <Chargement plein />
  if (f.erreur) {
    return (
      <Page titre="Finances" retour={retour}>
        <EtatErreur message={f.erreur} />
      </Page>
    )
  }

  return (
    <Page
      titre="Finances"
      sousTitre="Où part l'argent du compte commun"
      retour={retour}
      action={<BoutonAjouter label="Ajouter une dépense" onClick={() => setEdition('nouvelle')} />}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => changerMois(-1)}
          aria-label="Mois précédent"
          className="cible-44 w-11 h-11 rounded-full bg-bg-elevated shadow-soft text-text-primary active:scale-95 transition-transform duration-200 ease-spring"
        >
          ‹
        </button>
        <span className="font-sans font-semibold text-text-primary">{libelleMois(mois)}</span>
        <button
          onClick={() => changerMois(1)}
          disabled={mois >= courant}
          aria-label="Mois suivant"
          className="cible-44 w-11 h-11 rounded-full bg-bg-elevated shadow-soft text-text-primary active:scale-95 transition-transform duration-200 ease-spring disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {alertes.length > 0 && <AlertesBudget alertes={alertes} />}

      <Carte>
        <div className="flex flex-col gap-1">
          <h2 className="font-sans text-sm text-text-muted">Dépensé en {libelleMois(mois).split(' ')[0].toLowerCase()}</h2>
          <p className="font-sans text-5xl font-bold text-text-primary tabular-nums">{formaterPrix(totalMois)}</p>
          {variation !== null && (
            <p className="font-sans text-sm text-text-secondary">
              <span aria-hidden="true">{variation > 0 ? '↗' : variation < 0 ? '↘' : '→'} </span>
              {variation === 0
                ? `Autant qu'en ${nomMoisPrecedent}`
                : `${variation > 0 ? '+' : '−'}${Math.abs(variation)} % par rapport à ${nomMoisPrecedent} (${formaterPrix(total(precedent))})`}
            </p>
          )}
        </div>
        {lignes.length > 0 ? (
          <Repartition lignes={lignes} onBudgets={() => setBudgetsOuverts(true)} />
        ) : (
          <Bouton variante="secondaire" onClick={() => setBudgetsOuverts(true)}>
            🎯 Définir des budgets
          </Bouton>
        )}
      </Carte>

      <Feuille ouverte={budgetsOuverts} titre="Budgets par mois" onFermer={() => setBudgetsOuverts(false)}>
        <FormulaireBudgets
          budgets={f.budgets}
          onAnnuler={() => setBudgetsOuverts(false)}
          onEnregistrer={async (valeurs) => {
            const echec = await f.enregistrerBudgets(valeurs)
            if (echec) return echec
            annoncer('Budgets enregistrés ✓')
            setBudgetsOuverts(false)
            return null
          }}
        />
      </Feuille>

      <Feuille
        ouverte={Boolean(edition)}
        titre={edition && edition !== 'nouvelle' ? 'Modifier la dépense' : 'Nouvelle dépense'}
        onFermer={() => setEdition(null)}
      >
        <FormulaireDepense
          depense={edition === 'nouvelle' ? null : edition}
          jourParDefaut={mois === courant ? aujourdhui() : `${mois.slice(0, 7)}-01`}
          onAnnuler={() => setEdition(null)}
          onEnregistrer={async (champs) => {
            const echec = await f.enregistrer(edition === 'nouvelle' ? null : edition, champs)
            if (echec) return echec
            annoncer(edition === 'nouvelle' ? 'Dépense ajoutée ✓' : 'Dépense modifiée ✓')
            setEdition(null)
            return null
          }}
        />
      </Feuille>

      {duMois.length === 0 ? (
        <p className="font-sans text-center text-text-muted py-6">
          Aucune dépense en {libelleMois(mois).split(' ')[0].toLowerCase()}.
          <br />
          <span className="text-sm">Ajoute tes courses, restos, sorties… pour voir où part l'argent.</span>
          <br />
          <Bouton className="mt-4" onClick={() => setEdition('nouvelle')}>
            Ajouter une dépense
          </Bouton>
        </p>
      ) : (
        <section className="flex flex-col gap-1.5">
          <h2 className="font-sans text-xs uppercase tracking-wide text-text-muted px-1">
            {duMois.length} dépense{duMois.length > 1 ? 's' : ''}
          </h2>
          <ul className="rounded-3xl bg-bg-elevated shadow-soft divide-y divide-separator overflow-hidden">
            {duMois.map((d) => {
              const p = poste(d.categorie)
              return (
                <li key={d.id} className="flex items-center gap-1 pr-2">
                  <button
                    type="button"
                    onClick={() => setEdition(d)}
                    aria-label={`Modifier ${d.libelle || p.label}, ${formaterPrix(d.montant_centimes)}, le ${libelleJour(d.jour)}`}
                    className="flex-1 min-w-0 min-h-11 flex items-center gap-3 pl-4 py-3 text-left active:bg-bg-base transition-colors"
                  >
                    <span className="text-xl shrink-0" aria-hidden="true">
                      {p.emoji}
                    </span>
                    <span className="flex-1 min-w-0 flex flex-col">
                      <span className="font-sans text-text-primary truncate">{d.libelle || p.label}</span>
                      <span className="font-sans text-xs text-text-muted">
                        {libelleJour(d.jour)} · {p.label}
                        {d.source === 'drive' ? ' · estimation du drive' : ''}
                      </span>
                    </span>
                    <span className="font-sans font-medium text-text-primary tabular-nums shrink-0">
                      {formaterPrix(d.montant_centimes)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const echec = await f.supprimer(d)
                      annoncer(
                        echec ?? `« ${d.libelle || p.label} » supprimée`,
                        echec ? {} : { annuler: async () => annoncer((await f.restaurer(d)) ?? 'Dépense restaurée ✓') }
                      )
                    }}
                    aria-label={`Supprimer ${d.libelle || p.label}`}
                    className="cible-44 font-sans text-text-muted hover:text-text-primary w-8 h-8 shrink-0"
                  >
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </Page>
  )
}

// Barres horizontales, une seule couleur (la longueur porte la valeur) ;
// montant et part toujours écrits en texte
function AlertesBudget({ alertes }) {
  return (
    <section aria-labelledby="titre-alertes" className="p-4 rounded-3xl bg-bg-elevated shadow-soft border-l-4 border-danger flex flex-col gap-2">
      <h2 id="titre-alertes" className="font-sans text-sm font-semibold text-text-primary">
        <span aria-hidden="true">⚠️ </span>À surveiller
      </h2>
      <ul className="flex flex-col gap-1">
        {alertes.map((l) => (
          <li key={l.poste.id} className={`font-sans text-sm ${l.niveau === 'depasse' ? 'text-danger font-medium' : 'text-text-secondary'}`}>
            <span aria-hidden="true">{l.poste.emoji} </span>
            {texteAlerte(l)}
          </li>
        ))}
      </ul>
    </section>
  )
}

// Barres horizontales d'une seule couleur, montants toujours écrits en
// texte. Avec un budget, la barre mesure la part du budget consommée
// (rouge et « dépassé » écrit au-delà) ; sans budget, la part des dépenses.
function Repartition({ lignes, onBudgets }) {
  const max = Math.max(...lignes.map((l) => l.montant), 1)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-sans text-sm font-semibold text-text-primary">Par poste</h3>
        <button type="button" onClick={onBudgets} className="min-h-11 px-1 font-sans text-sm text-accent-text font-medium">
          🎯 Budgets
        </button>
      </div>
      <ul className="flex flex-col gap-3">
        {lignes.map((l) => {
          const largeur = l.budget ? Math.min(l.ratio, 100) : (l.montant / max) * 100
          return (
            <li key={l.poste.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline gap-2 font-sans text-sm">
                <span aria-hidden="true">{l.poste.emoji}</span>
                <span className="flex-1 min-w-0 text-text-primary truncate">{l.poste.label}</span>
                <span className="text-text-primary font-medium tabular-nums">
                  {formaterPrix(l.montant)}
                  {l.budget && <span className="text-text-muted font-normal"> / {formaterPrix(l.budget)}</span>}
                </span>
                {!l.budget && <span className="w-10 text-right text-text-muted tabular-nums">{l.part} %</span>}
              </div>
              <div className="h-2 rounded-full bg-separator" aria-hidden="true">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-spring ${l.niveau === 'depasse' ? 'bg-danger' : 'bg-accent'}`}
                  style={{ width: `${l.montant ? Math.max(largeur, 2) : 0}%` }}
                />
              </div>
              {(l.niveau === 'depasse' || l.niveau === 'proche') && (
                <p className={`font-sans text-xs ${l.niveau === 'depasse' ? 'text-danger font-medium' : 'text-text-secondary'}`}>
                  <span aria-hidden="true">⚠️ </span>
                  {l.niveau === 'depasse' ? `Dépassé de ${formaterPrix(l.montant - l.budget)}` : `${l.ratio} % du budget`}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Budget mensuel de chaque poste (vide = pas de budget)
function FormulaireBudgets({ budgets, onAnnuler, onEnregistrer }) {
  const [valeurs, setValeurs] = useState(() =>
    Object.fromEntries(
      POSTES.map((p) => {
        const b = budgets.find((x) => x.categorie === p.id)
        return [p.id, b ? String(b.montant_centimes / 100).replace('.', ',') : '']
      })
    )
  )
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  async function soumettre(e) {
    e.preventDefault()
    const resultat = {}
    for (const p of POSTES) {
      const centimes = lireMontant(valeurs[p.id])
      if (Number.isNaN(centimes)) {
        setErreur(`Budget « ${p.label} » : écris un montant en euros, par exemple 300.`)
        return
      }
      resultat[p.id] = centimes
    }
    setErreur('')
    setEnvoi(true)
    const echec = await onEnregistrer(resultat)
    setEnvoi(false)
    if (echec) setErreur(echec)
  }

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-4">
      <p className="font-sans text-sm text-text-secondary">
        Montant à ne pas dépasser chaque mois. Une alerte s'affiche à 80 % et les autres membres sont prévenus. Laisse vide
        pour ne pas suivre un poste.
      </p>
      <ul className="flex flex-col divide-y divide-separator">
        {POSTES.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-2">
            <label htmlFor={`budget-${p.id}`} className="flex-1 min-w-0 font-sans text-text-primary">
              <span aria-hidden="true">{p.emoji} </span>
              {p.label}
            </label>
            <input
              id={`budget-${p.id}`}
              inputMode="decimal"
              autoComplete="off"
              placeholder="—"
              aria-describedby="budget-unite"
              value={valeurs[p.id]}
              maxLength={10}
              onChange={(e) => setValeurs((v) => ({ ...v, [p.id]: e.target.value }))}
              className="font-sans w-28 min-h-11 px-3 py-2 rounded-2xl border border-separator bg-bg-base text-text-primary text-right focus:outline-none focus:border-accent"
            />
          </li>
        ))}
      </ul>
      <p id="budget-unite" className="font-sans text-xs text-text-muted px-1">
        Montants en euros par mois.
      </p>
      {erreur && (
        <p role="alert" className="font-sans text-sm text-text-primary">
          {erreur}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Bouton type="submit" disabled={envoi}>
          {envoi ? 'Enregistrement…' : 'Enregistrer'}
        </Bouton>
        <Bouton type="button" variante="discret" onClick={onAnnuler}>
          Annuler
        </Bouton>
      </div>
    </form>
  )
}

function FormulaireDepense({ depense, jourParDefaut, onAnnuler, onEnregistrer }) {
  const [montant, setMontant] = useState(depense ? (depense.montant_centimes / 100).toFixed(2).replace('.', ',') : '')
  const [libelle, setLibelle] = useState(depense?.libelle ?? '')
  const [categorie, setCategorie] = useState(depense?.categorie ?? null)
  const [jour, setJour] = useState(depense?.jour ?? jourParDefaut)
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  // Tant qu'aucun poste n'est choisi à la main, le libellé le devine
  const posteChoisi = categorie ?? devinerPoste(libelle)

  async function soumettre(e) {
    e.preventDefault()
    const centimes = lireMontant(montant)
    if (centimes === null || Number.isNaN(centimes)) {
      setErreur('Écris un montant en euros, par exemple 42,50.')
      return
    }
    if (!posteChoisi) {
      setErreur('Choisis un poste.')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(jour)) {
      setErreur('Choisis une date.')
      return
    }
    setErreur('')
    setEnvoi(true)
    const echec = await onEnregistrer({ montant_centimes: centimes, categorie: posteChoisi, libelle: libelle.trim() || null, jour })
    setEnvoi(false)
    if (echec) setErreur(echec)
  }

  return (
    <>
      <form onSubmit={soumettre} className="flex flex-col gap-4">
        <ChampTexte
          id="depense-montant"
          label="Montant (€)"
          inputMode="decimal"
          autoComplete="off"
          placeholder="42,50"
          value={montant}
          maxLength={12}
          onChange={(e) => setMontant(e.target.value)}
          autoFocus
          required
        />
        <ChampTexte
          id="depense-libelle"
          label="Libellé (facultatif)"
          autoComplete="off"
          placeholder="Resto japonais, cinéma…"
          value={libelle}
          maxLength={80}
          onChange={(e) => setLibelle(e.target.value)}
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="font-sans text-sm text-text-muted px-1 mb-1.5">Poste</legend>
          <div className="flex flex-wrap gap-2">
            {POSTES.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={posteChoisi === p.id}
                onClick={() => setCategorie(p.id)}
                className={`font-sans min-h-11 px-3 py-2 rounded-full border text-sm transition-all duration-200 ease-spring active:scale-95 ${
                  posteChoisi === p.id ? 'bg-accent border-accent text-white font-medium' : 'border-separator text-text-primary'
                }`}
              >
                <span aria-hidden="true">{p.emoji} </span>
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>
        <ChampTexte id="depense-jour" label="Date" type="date" value={jour} onChange={(e) => setJour(e.target.value)} required />
        {erreur && (
          <p role="alert" className="font-sans text-sm text-text-primary">
            {erreur}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Bouton type="submit" disabled={envoi}>
            {envoi ? 'Enregistrement…' : 'Enregistrer'}
          </Bouton>
          <Bouton type="button" variante="discret" onClick={onAnnuler}>
            Annuler
          </Bouton>
        </div>
      </form>
    </>
  )
}
