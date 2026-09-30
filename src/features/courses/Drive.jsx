import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bouton, Carte, ChampTexte, EtatErreur, Page } from '../../components/ui'
import Chargement from '../../components/Chargement'
import { useCourses } from './useCourses'
import { useDrive } from './useDrive'
import { afficherQuantite, compterListe, construireListe, grouperParRayon } from './liste'
import {
  ENSEIGNES,
  cleProduit,
  estimerPanier,
  formaterPrix,
  lienProduitValide,
  lienRecherche,
  lireMagasinLeclerc,
  lirePrix,
} from './drive'

// Commander au drive : pour chaque produit manquant, on ouvre le site de
// l'enseigne (fiche mémorisée ou recherche), on l'ajoute au panier là-bas
// puis on le coche ici. « Commande passée » prévient les autres membres.
export default function Drive() {
  const courses = useCourses()
  const drive = useDrive()
  const [changement, setChangement] = useState(false)
  const [message, setMessage] = useState('')

  if (courses.chargement || drive.chargement) return <Chargement plein />

  const retour = { vers: '/courses', label: 'Courses' }
  const erreur = drive.erreur || courses.erreur
  if (erreur) {
    return (
      <Page titre="Commander au drive" retour={retour}>
        <EtatErreur message={erreur} />
      </Page>
    )
  }

  if (!drive.enseigne || changement) {
    return (
      <Page titre="Commander au drive" sousTitre="Choisis le drive de l'espace" retour={retour}>
        <ChoixEnseigne
          reglage={drive.reglage}
          onAnnuler={drive.enseigne ? () => setChangement(false) : null}
          onChoisir={async (enseigne, magasin) => {
            const echec = await drive.choisirEnseigne(enseigne, magasin)
            if (echec) return echec
            setChangement(false)
            setMessage('')
            return null
          }}
        />
      </Page>
    )
  }

  return (
    <Page titre="Commander au drive" sousTitre={ENSEIGNES[drive.enseigne].nom} retour={retour}>
      <Commande courses={courses} drive={drive} message={message} onMessage={setMessage} onChanger={() => setChangement(true)} />
    </Page>
  )
}

function Commande({ courses, drive, message, onMessage, onChanger }) {
  const navigate = useNavigate()
  const [confirmation, setConfirmation] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const liste = useMemo(() => construireListe(courses.produits, courses.articles), [courses.produits, courses.articles])
  const groupes = useMemo(() => grouperParRayon(liste), [liste])
  const compte = compterListe(liste)
  const estimation = estimerPanier(liste, drive.references)
  const panier = liste.filter((e) => e.dans_panier)
  const estimationPanier = estimerPanier(panier, drive.references)
  const enseigne = ENSEIGNES[drive.enseigne]

  // Commande notée (les autres sont prévenus), puis les produits commandés
  // sortent de la liste comme des courses faites ; retour à la liste de ce
  // qui manque encore
  async function commandePassee() {
    setEnvoi(true)
    const echec = (await drive.noterCommande(panier.length, estimationPanier.total)) ?? (await courses.terminerCourses())
    setEnvoi(false)
    setConfirmation(false)
    if (echec) {
      onMessage(echec)
      return
    }
    const reste = liste.length - panier.length
    navigate('/courses', {
      state: {
        message: `Commande notée ✓ ${panier.length} produit${panier.length > 1 ? 's' : ''} commandé${panier.length > 1 ? 's' : ''}, ${
          reste ? `il reste ${reste} produit${reste > 1 ? 's' : ''} à acheter.` : 'plus rien à acheter 🎉'
        }`,
      },
    })
  }

  return (
    <>
      <Carte>
        <div className="flex items-center justify-between gap-3">
          <p className="font-sans text-text-primary font-medium">
            <span aria-hidden="true">{enseigne.emoji} </span>
            {enseigne.nom}
          </p>
          <Bouton variante="discret" className="!px-3 !py-2 text-sm" onClick={onChanger}>
            Changer
          </Bouton>
        </div>
        <p className="font-sans text-sm text-text-secondary">
          Ouvre chaque produit sur le site du drive, ajoute-le à ton panier, puis coche-le ici. Mémorise « ton »
          produit et son prix : la prochaine fois, le lien ouvre directement la bonne fiche.
        </p>
        {liste.length > 0 && (
          <dl className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-bg-base">
              <dt className="font-sans text-xs text-text-muted">Dans le panier</dt>
              <dd className="font-sans text-lg font-semibold text-text-primary">
                {compte.dansPanier} / {compte.total}
              </dd>
            </div>
            <div className="p-3 rounded-2xl bg-bg-base">
              <dt className="font-sans text-xs text-text-muted">Estimation</dt>
              <dd className="font-sans text-lg font-semibold text-text-primary">
                {estimation.total ? `≈ ${formaterPrix(estimation.total)}` : '—'}
              </dd>
              {estimation.sansPrix > 0 && (
                <dd className="font-sans text-xs text-text-muted">
                  {estimation.sansPrix} produit{estimation.sansPrix > 1 ? 's' : ''} sans prix
                </dd>
              )}
            </div>
          </dl>
        )}
      </Carte>

      {message && (
        <p role="status" className="font-sans text-sm text-text-secondary px-1">
          {message}
        </p>
      )}

      {liste.length === 0 && (
        <p className="font-sans text-center text-text-muted py-8">
          Rien à commander 🎉
          <br />
          <Link to="/courses" className="min-h-11 inline-flex items-center text-sm text-accent-text underline">
            Retour aux courses
          </Link>
        </p>
      )}

      {groupes.map(({ rayon, elements }) => (
        <section key={rayon.id} className="flex flex-col gap-1.5">
          <h2 className="font-sans text-xs uppercase tracking-wide text-text-muted px-1">
            {rayon.emoji} {rayon.label}
          </h2>
          <ul className="rounded-3xl bg-bg-elevated shadow-soft divide-y divide-separator overflow-hidden">
            {elements.map((e) => (
              <LigneDrive
                key={`${e.origine}-${e.id}`}
                element={e}
                drive={drive}
                onCocher={async () => onMessage(await courses.basculerPanier(e))}
                onMessage={onMessage}
              />
            ))}
          </ul>
        </section>
      ))}

      {panier.length > 0 &&
        (confirmation ? (
          <div className="sticky bottom-24 p-4 rounded-3xl bg-bg-elevated shadow-elevated flex flex-col gap-3">
            <p className="font-sans text-sm text-text-secondary">
              Commande de {panier.length} article{panier.length > 1 ? 's' : ''}
              {estimationPanier.total ? ` (≈ ${formaterPrix(estimationPanier.total)})` : ''} validée sur le site ? Les
              produits commandés sortent de la liste, le stock est mis à jour et les autres membres sont prévenus.
            </p>
            <div className="flex gap-3">
              <Bouton onClick={commandePassee} disabled={envoi}>
                {envoi ? 'Envoi…' : 'Confirmer'}
              </Bouton>
              <Bouton variante="discret" onClick={() => setConfirmation(false)} disabled={envoi}>
                Annuler
              </Bouton>
            </div>
          </div>
        ) : (
          <Bouton onClick={() => setConfirmation(true)} className="sticky bottom-24 shadow-elevated">
            Commande passée ({panier.length}/{liste.length})
          </Bouton>
        ))}
    </>
  )
}

function LigneDrive({ element, drive, onCocher, onMessage }) {
  const [edition, setEdition] = useState(false)
  const reference = drive.references.get(cleProduit(element.nom))
  const enseigne = ENSEIGNES[drive.enseigne]
  const lien = reference?.url ?? lienRecherche(drive.enseigne, element.nom, drive.reglage?.magasin_url)
  const details = [
    element.quantite && afficherQuantite(element.quantite),
    reference?.prix_centimes != null && formaterPrix(reference.prix_centimes),
  ].filter(Boolean)

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <button
        role="checkbox"
        aria-checked={element.dans_panier}
        aria-label={`${element.nom} ajouté au panier du drive`}
        onClick={onCocher}
        className={`cible-44 mt-0.5 w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center text-xs text-white transition-all duration-200 ease-spring active:scale-90 ${
          element.dans_panier ? 'bg-accent border-accent' : 'border-separator'
        }`}
      >
        {element.dans_panier && '✓'}
      </button>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <span className={`font-sans ${element.dans_panier ? 'line-through text-text-muted' : 'text-text-primary'}`}>
          {element.nom}
        </span>
        {details.length > 0 && <span className="font-sans text-sm text-text-muted">{details.join(' · ')}</span>}
        <div className="flex flex-wrap gap-x-4">
          {lien && (
            <a
              href={lien}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${reference?.url ? 'Ouvrir' : 'Chercher'} ${element.nom} sur ${enseigne.nom} (nouvel onglet)`}
              className="min-h-11 inline-flex items-center font-sans text-sm text-accent-text font-medium"
            >
              {reference?.url ? 'Mon produit' : 'Chercher'}
              <span aria-hidden="true">&nbsp;↗</span>
            </a>
          )}
          <button
            type="button"
            aria-expanded={edition}
            onClick={() => setEdition((x) => !x)}
            className="min-h-11 inline-flex items-center font-sans text-sm text-text-secondary"
          >
            {reference ? 'Modifier lien et prix' : 'Mémoriser lien et prix'}
          </button>
        </div>
        {edition && (
          <Memorisation
            element={element}
            reference={reference}
            enseigne={drive.enseigne}
            onFermer={() => setEdition(false)}
            onEnregistrer={async (valeurs) => {
              const echec = await drive.memoriser(element.nom, valeurs)
              onMessage(echec ?? `« ${element.nom} » mémorisé ✓`)
              if (!echec) setEdition(false)
            }}
          />
        )}
      </div>
    </li>
  )
}

function Memorisation({ element, reference, enseigne, onFermer, onEnregistrer }) {
  const [url, setUrl] = useState(reference?.url ?? '')
  const [prix, setPrix] = useState(
    reference?.prix_centimes != null ? (reference.prix_centimes / 100).toFixed(2).replace('.', ',') : ''
  )
  const [erreur, setErreur] = useState('')
  const id = `drive-${element.origine}-${element.id}`

  function soumettre(e) {
    e.preventDefault()
    const lienValide = url.trim() ? lienProduitValide(enseigne, url) : null
    if (url.trim() && !lienValide) {
      setErreur(`Colle l'adresse d'une page du site ${ENSEIGNES[enseigne].nom} (elle commence par https://).`)
      return
    }
    const centimes = lirePrix(prix)
    if (Number.isNaN(centimes)) {
      setErreur('Prix à écrire en euros, par exemple 2,49.')
      return
    }
    setErreur('')
    onEnregistrer({ url: lienValide, prix_centimes: centimes })
  }

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-3 pt-2">
      <ChampTexte
        id={`${id}-lien`}
        label="Lien de la fiche produit"
        type="url"
        inputMode="url"
        autoComplete="off"
        placeholder="https://…"
        value={url}
        maxLength={500}
        onChange={(e) => setUrl(e.target.value)}
      />
      <ChampTexte
        id={`${id}-prix`}
        label="Prix constaté (€)"
        inputMode="decimal"
        autoComplete="off"
        placeholder="2,49"
        value={prix}
        maxLength={10}
        onChange={(e) => setPrix(e.target.value)}
      />
      {erreur && (
        <p role="alert" className="font-sans text-sm text-text-primary">
          {erreur}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Bouton type="submit" className="!px-5 !py-2.5">
          Enregistrer
        </Bouton>
        {reference && (
          <Bouton type="button" variante="secondaire" className="!px-5 !py-2.5" onClick={() => onEnregistrer({ url: null, prix_centimes: null })}>
            Oublier
          </Bouton>
        )}
        <Bouton type="button" variante="discret" className="!px-4 !py-2.5" onClick={onFermer}>
          Annuler
        </Bouton>
      </div>
    </form>
  )
}

function ChoixEnseigne({ reglage, onChoisir, onAnnuler }) {
  const [enseigne, setEnseigne] = useState(reglage?.enseigne ?? null)
  const [magasin, setMagasin] = useState(reglage?.magasin_url ?? '')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  async function enregistrer(e) {
    e.preventDefault()
    let magasinUrl = null
    if (enseigne === 'leclerc') {
      magasinUrl = lireMagasinLeclerc(magasin)
      if (!magasinUrl) {
        setErreur("Cette adresse n'est pas celle d'un drive Leclerc. Elle ressemble à https://fd9-courses.leclercdrive.fr/magasin-…")
        return
      }
    }
    setErreur('')
    setEnvoi(true)
    const echec = await onChoisir(enseigne, magasinUrl)
    setEnvoi(false)
    if (echec) setErreur(echec)
  }

  return (
    <Carte titre="Ton drive">
      <form onSubmit={enregistrer} className="flex flex-col gap-4">
        <p className="font-sans text-sm text-text-secondary">
          Une enseigne pour tout l'espace. Nido ouvre le site du drive sur chaque produit qui manque ; ton panier et
          ton compte restent sur le site de l'enseigne.
        </p>
        <div role="group" aria-label="Enseigne" className="grid grid-cols-2 gap-3">
          {Object.values(ENSEIGNES).map((x) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={enseigne === x.id}
              onClick={() => setEnseigne(x.id)}
              className={`font-sans min-h-11 px-3 py-3 rounded-2xl border-2 text-text-primary transition-all duration-200 ease-spring active:scale-95 ${
                enseigne === x.id ? 'border-accent font-semibold' : 'border-separator'
              }`}
            >
              <span aria-hidden="true">{x.emoji} </span>
              {x.nom}
              {enseigne === x.id && <span aria-hidden="true"> ✓</span>}
            </button>
          ))}
        </div>

        {enseigne === 'carrefour' && (
          <div className="flex flex-col gap-1">
            <p className="font-sans text-sm text-text-secondary px-1">
              Sur carrefour.fr, choisis une fois ton drive (« Choisir un magasin ») : les recherches ouvertes depuis
              Nido afficheront ses produits, ses prix et ses disponibilités.
            </p>
            <a
              href="https://www.carrefour.fr/"
              target="_blank"
              rel="noopener noreferrer"
              className="self-start min-h-11 inline-flex items-center px-1 font-sans text-sm text-accent-text font-medium"
            >
              Ouvrir carrefour.fr<span aria-hidden="true">&nbsp;↗</span>
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          </div>
        )}

        {enseigne === 'leclerc' && (
          <div className="flex flex-col gap-2">
            <ChampTexte
              id="drive-magasin"
              label="Adresse de ton drive Leclerc"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://fd9-courses.leclercdrive.fr/magasin-…"
              value={magasin}
              maxLength={300}
              onChange={(e) => setMagasin(e.target.value)}
              required
            />
            <p className="font-sans text-xs text-text-muted px-1">
              Sur leclercdrive.fr, choisis ton magasin puis copie ici l'adresse de la page qui s'ouvre.
            </p>
            <a
              href="https://www.leclercdrive.fr/"
              target="_blank"
              rel="noopener noreferrer"
              className="self-start min-h-11 inline-flex items-center px-1 font-sans text-sm text-accent-text font-medium"
            >
              Ouvrir leclercdrive.fr<span aria-hidden="true">&nbsp;↗</span>
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          </div>
        )}

        {erreur && (
          <p role="alert" className="font-sans text-sm text-text-primary">
            {erreur}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Bouton type="submit" disabled={!enseigne || envoi}>
            {envoi ? 'Enregistrement…' : 'Enregistrer'}
          </Bouton>
          {onAnnuler && (
            <Bouton type="button" variante="discret" onClick={onAnnuler}>
              Annuler
            </Bouton>
          )}
        </div>
      </form>
    </Carte>
  )
}
