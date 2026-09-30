import { useState } from 'react'
import { useMembres } from '../espace/useMembres'
import { Bouton, BoutonAjouter, ChampTexte, EtatErreur, Feuille, Page } from '../../components/ui'
import { useMessages } from '../../components/messages-contexte'
import Chargement from '../../components/Chargement'
import { versIso } from '../menus/tirage'
import {
  CATEGORIES_ECHEANCES,
  categorieEcheance,
  joursRestants,
  libelleDate,
  libelleDelai,
  prochainJourAnnuel,
  RAPPELS,
  RECURRENCES,
  regrouper,
  SUGGESTIONS,
} from './echeances'
import { useEcheances } from './useEcheances'

const CLASSE_CHAMP =
  'font-sans w-full min-h-11 px-4 py-2.5 rounded-2xl border border-separator bg-bg-base text-text-primary focus:outline-none focus:border-accent'

export default function Echeances() {
  const e = useEcheances()
  const { membres } = useMembres()
  const [edition, setEdition] = useState(null) // null | 'nouvelle' | échéance
  const { annoncer } = useMessages()
  const aujourdhui = versIso(new Date())
  const groupes = regrouper(e.echeances, aujourdhui)
  const prenom = (id) => membres.find((m) => m.user_id === id)?.prenom

  // Résultat d'une action en message temporaire ; `annuler` propose de revenir en arrière
  async function action(promesse, succes = '', annuler) {
    const erreur = await promesse
    annoncer(erreur ?? succes, erreur ? {} : { annuler })
  }

  async function rappeler(echeance) {
    annoncer('Envoi du rappel…')
    annoncer((await e.rappeler(echeance)).message)
  }

  if (e.chargement) return <Chargement plein />
  if (e.erreur) {
    return (
      <Page retour={{ vers: '/plus', label: 'Plus' }} titre="Échéances" sousTitre="Impôts, assurances, rendez-vous… avec des rappels">
        <EtatErreur message={e.erreur} />
      </Page>
    )
  }

  const liste = (titre, elements, id) =>
    elements.length > 0 && (
      <section aria-labelledby={id} className="flex flex-col gap-2">
        <h2 id={id} className="font-sans text-xs uppercase tracking-wide text-text-muted px-1">
          {titre} ({elements.length})
        </h2>
        <ul className="flex flex-col gap-3">
          {elements.map((x) => (
            <CarteEcheance
              key={x.id}
              echeance={x}
              aujourdhui={aujourdhui}
              responsable={prenom(x.responsable)}
              onFaite={() =>
                action(
                  e.faite(x),
                  x.recurrence === 'aucune' ? `« ${x.titre} » est marquée faite ✓` : `« ${x.titre} » : prochaine échéance enregistrée ✓`,
                  () => action(e.annulerFaite(x), 'Échéance remise comme avant')
                )
              }
              onRappeler={() => rappeler(x)}
              onModifier={() => setEdition(x)}
              onSupprimer={() => action(e.supprimer(x), `« ${x.titre} » supprimée`, () => action(e.restaurer(x), `« ${x.titre} » restaurée ✓`))}
            />
          ))}
        </ul>
      </section>
    )

  return (
    <Page
      retour={{ vers: '/plus', label: 'Plus' }}
      titre="Échéances"
      sousTitre="Impôts, assurances, rendez-vous… avec des rappels"
      action={<BoutonAjouter label="Nouvelle échéance" onClick={() => setEdition('nouvelle')} />}
    >
      <Feuille
        ouverte={Boolean(edition)}
        titre={edition && edition !== 'nouvelle' ? 'Modifier l’échéance' : 'Nouvelle échéance'}
        onFermer={() => setEdition(null)}
      >
        <FormulaireEcheance
          echeance={edition === 'nouvelle' ? null : edition}
          membres={membres}
          aujourdhui={aujourdhui}
          onAnnuler={() => setEdition(null)}
          onEnregistrer={async (champs) => {
            const erreur = await e.enregistrer(edition === 'nouvelle' ? null : edition.id, champs)
            if (!erreur) {
              annoncer(edition === 'nouvelle' ? 'Échéance ajoutée ✓' : 'Échéance modifiée ✓')
              setEdition(null)
            }
            return erreur
          }}
        />
      </Feuille>

      {e.echeances.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="font-sans text-sm text-text-muted">
            Aucune échéance. Commence par la déclaration des impôts ou l'assurance habitation.
          </p>
          <Bouton onClick={() => setEdition('nouvelle')}>Ajouter une échéance</Bouton>
        </div>
      )}

      {liste('⚠️ En retard', groupes.enRetard, 'titre-retard')}
      {liste('Dans les 30 jours', groupes.bientot, 'titre-bientot')}
      {liste('Plus tard', groupes.plusTard, 'titre-plus-tard')}

      {groupes.faites.length > 0 && (
        <details className="font-sans">
          <summary className="min-h-11 flex items-center cursor-pointer text-sm text-text-muted px-1">
            Faites ({groupes.faites.length})
          </summary>
          <ul className="flex flex-col gap-2 mt-2">
            {groupes.faites.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 p-4 rounded-3xl bg-bg-elevated">
                <span className="text-sm text-text-secondary min-w-0">
                  <span aria-hidden="true">{categorieEcheance(x.categorie).emoji} </span>
                  <span className="line-through">{x.titre}</span> · {libelleDate(x.date)}
                </span>
                <button onClick={() => action(e.rouvrir(x))} className="cible-44 text-sm text-accent-text shrink-0">
                  Rouvrir
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Page>
  )
}

function CarteEcheance({ echeance, aujourdhui, responsable, onFaite, onRappeler, onModifier, onSupprimer }) {
  const cat = categorieEcheance(echeance.categorie)
  const jours = joursRestants(echeance.date, aujourdhui)
  const urgent = jours <= 7
  const recurrence = RECURRENCES.find((r) => r.valeur === echeance.recurrence)
  return (
    <li className="p-5 rounded-3xl bg-bg-elevated shadow-soft flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden="true">
          {cat.emoji}
        </span>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <h3 className="font-sans font-semibold text-text-primary break-words">{echeance.titre}</h3>
          <p className="font-sans text-sm text-text-secondary">
            {libelleDate(echeance.date)} ·{' '}
            <span className={urgent ? 'font-semibold text-text-primary' : ''}>
              {jours < 0 && '⚠️ '}
              {libelleDelai(jours)}
            </span>
          </p>
          <p className="font-sans text-xs text-text-muted">
            {recurrence?.label} · {responsable ? `Pour ${responsable}` : 'Pour tout le monde'}
          </p>
          {echeance.note && <p className="font-sans text-sm text-text-secondary mt-1 whitespace-pre-line">{echeance.note}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Bouton onClick={onFaite} className="!px-3">
          ✓ Fait
        </Bouton>
        <Bouton variante="secondaire" onClick={onRappeler} className="!px-3">
          🔔 Rappeler
        </Bouton>
        <Bouton variante="discret" onClick={onModifier} className="!px-3 !py-2 min-h-11">
          Modifier
        </Bouton>
        <Bouton variante="danger" onClick={onSupprimer} className="!px-3 !py-2 min-h-11">
          Supprimer
        </Bouton>
      </div>
    </li>
  )
}

function FormulaireEcheance({ echeance, membres, aujourdhui, onAnnuler, onEnregistrer }) {
  const [v, setV] = useState(() => ({
    titre: echeance?.titre ?? '',
    categorie: echeance?.categorie ?? 'impots',
    date: echeance?.date ?? '',
    recurrence: echeance?.recurrence ?? 'annuelle',
    rappels: echeance?.rappels ?? [7, 1],
    responsable: echeance?.responsable ?? '',
    note: echeance?.note ?? '',
  }))
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  const prefixe = echeance ? `echeance-${echeance.id}` : 'echeance-nouvelle'
  const changer = (champ) => (ev) => setV((x) => ({ ...x, [champ]: ev.target.value }))

  function suggerer(s) {
    setV((x) => ({
      ...x,
      titre: s.titre,
      categorie: s.categorie,
      recurrence: s.recurrence,
      rappels: s.rappels,
      date: s.jourAnnuel ? prochainJourAnnuel(s.jourAnnuel, aujourdhui) : x.date,
      note: s.note ?? x.note,
    }))
  }

  function basculerRappel(jours) {
    setV((x) => ({
      ...x,
      rappels: x.rappels.includes(jours) ? x.rappels.filter((r) => r !== jours) : [...x.rappels, jours].sort((a, b) => b - a),
    }))
  }

  async function soumettre(ev) {
    ev.preventDefault()
    setEnCours(true)
    setErreur('')
    const message = await onEnregistrer({
      titre: v.titre.trim(),
      categorie: v.categorie,
      date: v.date,
      recurrence: v.recurrence,
      rappels: v.rappels,
      responsable: v.responsable || null,
      note: v.note.trim() || null,
      ...(echeance ? {} : { faite_le: null }),
    })
    setEnCours(false)
    if (message) setErreur(message)
  }

  return (
    <>
      {!echeance && (
        <div className="flex flex-col gap-2">
          <p className="font-sans text-sm text-text-muted px-1">Idées :</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.titre}
                type="button"
                onClick={() => suggerer(s)}
                aria-pressed={v.titre === s.titre}
                className={`font-sans text-sm min-h-11 px-3.5 rounded-full transition-all duration-200 ease-spring active:scale-95 ${
                  v.titre === s.titre ? 'bg-accent text-white' : 'bg-bg-base text-text-primary border border-separator'
                }`}
              >
                <span aria-hidden="true">{categorieEcheance(s.categorie).emoji} </span>
                {s.titre}
              </button>
            ))}
          </div>
        </div>
      )}
      <form onSubmit={soumettre} className="flex flex-col gap-3">
        <ChampTexte id={`${prefixe}-titre`} label="Titre" maxLength={80} value={v.titre} onChange={changer('titre')} required />
        <div className="grid grid-cols-1 min-[430px]:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${prefixe}-date`} className="font-sans text-sm text-text-muted px-1">
              Date
            </label>
            <input id={`${prefixe}-date`} type="date" value={v.date} onChange={changer('date')} required className={CLASSE_CHAMP} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${prefixe}-categorie`} className="font-sans text-sm text-text-muted px-1">
              Catégorie
            </label>
            <select id={`${prefixe}-categorie`} value={v.categorie} onChange={changer('categorie')} className={CLASSE_CHAMP}>
              {CATEGORIES_ECHEANCES.map((c) => (
                <option key={c.valeur} value={c.valeur}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${prefixe}-recurrence`} className="font-sans text-sm text-text-muted px-1">
              Répétition
            </label>
            <select id={`${prefixe}-recurrence`} value={v.recurrence} onChange={changer('recurrence')} className={CLASSE_CHAMP}>
              {RECURRENCES.map((r) => (
                <option key={r.valeur} value={r.valeur}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${prefixe}-responsable`} className="font-sans text-sm text-text-muted px-1">
              Pour qui
            </label>
            <select id={`${prefixe}-responsable`} value={v.responsable} onChange={changer('responsable')} className={CLASSE_CHAMP}>
              <option value="">Tout le monde</option>
              {membres.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.prenom}
                </option>
              ))}
            </select>
          </div>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="font-sans text-sm text-text-muted px-1 mb-1.5">Rappels (notification)</legend>
          <div className="grid grid-cols-2 gap-2">
            {RAPPELS.map((r) => (
              <button
                key={r.jours}
                type="button"
                onClick={() => basculerRappel(r.jours)}
                aria-pressed={v.rappels.includes(r.jours)}
                className={`font-sans text-sm min-h-11 px-3 rounded-full transition-all duration-200 ease-spring active:scale-95 ${
                  v.rappels.includes(r.jours) ? 'bg-accent text-white' : 'bg-bg-base text-text-primary border border-separator'
                }`}
              >
                {v.rappels.includes(r.jours) ? '✓ ' : ''}
                {r.label}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${prefixe}-note`} className="font-sans text-sm text-text-muted px-1">
            Note (facultatif)
          </label>
          <textarea
            id={`${prefixe}-note`}
            rows={2}
            maxLength={500}
            value={v.note}
            onChange={changer('note')}
            className={`${CLASSE_CHAMP} resize-none`}
          />
        </div>
        {erreur && (
          <p role="status" className="font-sans text-sm text-text-primary">
            {erreur}
          </p>
        )}
        <Bouton type="submit" disabled={enCours || !v.titre.trim() || !v.date}>
          {enCours ? 'Enregistrement…' : 'Enregistrer'}
        </Bouton>
        <Bouton type="button" variante="discret" onClick={onAnnuler}>
          Annuler
        </Bouton>
      </form>
    </>
  )
}
