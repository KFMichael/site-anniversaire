import { useState } from 'react'
import { categorie, useCoffre } from './contexte'
import { copierTemporairement, urlSure } from './presse-papier'
import FormulaireEntree from './FormulaireEntree'

export default function EntreeCoffre({ entree }) {
  const { supprimer } = useCoffre()
  const [deplie, setDeplie] = useState(false)
  const [edition, setEdition] = useState(false)
  const [visible, setVisible] = useState(false)
  const [copie, setCopie] = useState(null)

  if (edition) return <FormulaireEntree entree={entree} onFermer={() => setEdition(false)} />

  const cat = categorie(entree.categorie)
  const lien = urlSure(entree.url)

  async function copier(champ, valeur) {
    try {
      await copierTemporairement(valeur)
      setCopie(champ)
      setTimeout(() => setCopie((c) => (c === champ ? null : c)), 2000)
    } catch {
      setCopie('erreur')
    }
  }

  async function confirmerSuppression() {
    if (window.confirm(`Supprimer « ${entree.nom} » du coffre ?`)) await supprimer(entree.id)
  }

  return (
    <article className="rounded-3xl bg-bg-elevated shadow-soft overflow-hidden">
      <button
        onClick={() => {
          setDeplie((d) => !d)
          setVisible(false)
        }}
        aria-expanded={deplie}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <span className="text-2xl w-10 h-10 shrink-0 rounded-xl bg-bg-base flex items-center justify-center" aria-hidden="true">
          {entree.illisible ? '⚠️' : cat.emoji}
        </span>
        <span className="flex flex-col min-w-0">
          <span className="font-sans font-medium text-text-primary truncate">{entree.nom}</span>
          {entree.identifiant && (
            <span className="font-sans text-sm text-text-muted truncate">{entree.identifiant}</span>
          )}
        </span>
      </button>

      {deplie && (
        <div className="px-4 pb-4 flex flex-col gap-2 border-t border-separator pt-3">
          {entree.illisible ? (
            <p className="font-sans text-sm text-text-muted">
              Cette entrée ne peut pas être déchiffrée avec la phrase actuelle.
            </p>
          ) : (
            <>
              {entree.identifiant && (
                <Ligne label="Identifiant">
                  <span className="font-sans text-text-primary break-all">{entree.identifiant}</span>
                  <BoutonMini onClick={() => copier('identifiant', entree.identifiant)}>
                    {copie === 'identifiant' ? '✓' : 'Copier'}
                  </BoutonMini>
                </Ligne>
              )}
              {entree.motDePasse && (
                <Ligne label="Mot de passe">
                  <span className="font-mono text-sm text-text-primary break-all">
                    {visible ? entree.motDePasse : '••••••••••'}
                  </span>
                  <BoutonMini
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? 'Masquer' : 'Afficher'}
                  >
                    {visible ? '🙈' : '👁'}
                  </BoutonMini>
                  <BoutonMini onClick={() => copier('mdp', entree.motDePasse)}>
                    {copie === 'mdp' ? '✓' : 'Copier'}
                  </BoutonMini>
                </Ligne>
              )}
              {lien && (
                <Ligne label="Site">
                  <a
                    href={lien}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-sans text-text-primary underline break-all"
                  >
                    {entree.url}
                  </a>
                </Ligne>
              )}
              {entree.note && (
                <Ligne label="Note">
                  <span className="font-sans text-sm text-text-secondary whitespace-pre-wrap">
                    {entree.note}
                  </span>
                </Ligne>
              )}
              {copie === 'erreur' && (
                <p className="font-sans text-xs text-text-muted italic">Copie impossible.</p>
              )}
              {copie && copie !== 'erreur' && (
                <p className="font-sans text-xs text-text-muted">
                  Copié — effacé du presse-papier dans 30 s.
                </p>
              )}
            </>
          )}

          <div className="flex gap-4 pt-1">
            {!entree.illisible && (
              <button
                onClick={() => setEdition(true)}
                className="font-sans text-sm text-text-muted hover:text-text-primary underline"
              >
                Modifier
              </button>
            )}
            <button
              onClick={confirmerSuppression}
              className="font-sans text-sm text-text-muted hover:text-text-primary underline"
            >
              Supprimer
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

function Ligne({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-sans text-xs text-text-muted">{label}</span>
      <div className="flex items-center gap-2 [&>*:first-child]:flex-1 [&>*:first-child]:min-w-0">
        {children}
      </div>
    </div>
  )
}

function BoutonMini(props) {
  return (
    <button
      {...props}
      className="font-sans text-xs shrink-0 px-3 py-1.5 rounded-full bg-bg-base text-text-secondary active:scale-95 transition-transform duration-200 ease-spring"
    />
  )
}
