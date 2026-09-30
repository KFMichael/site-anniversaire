import { useCallback, useEffect, useRef, useState } from 'react'
import { MessagesContexte } from './messages-contexte'

// Messages temporaires façon iOS, affichés juste au-dessus de la barre
// d'onglets : « Dépense ajoutée ✓ », ou « Dépense supprimée · Annuler ».
// annoncer(texte, { annuler }) ; le message disparaît seul (plus
// longtemps s'il propose « Annuler »).
export function MessagesProvider({ children }) {
  const [message, setMessage] = useState(null)
  const minuterie = useRef(null)

  const fermer = useCallback(() => {
    clearTimeout(minuterie.current)
    setMessage(null)
  }, [])

  const annoncer = useCallback((texte, options = {}) => {
    clearTimeout(minuterie.current)
    if (!texte) return setMessage(null)
    setMessage({ texte, annuler: options.annuler, cle: Date.now() })
    minuterie.current = setTimeout(() => setMessage(null), options.annuler ? 6000 : 3500)
  }, [])

  useEffect(() => () => clearTimeout(minuterie.current), [])

  return (
    <MessagesContexte.Provider value={{ annoncer }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-x-0 z-30 px-4 pointer-events-none bottom-[calc(env(safe-area-inset-bottom)+4.5rem)]"
      >
        {message && (
          <div
            key={message.cle}
            className="pointer-events-auto max-w-md mx-auto flex items-center gap-3 pl-5 pr-2 py-1.5 min-h-12 rounded-2xl bg-text-primary text-bg-elevated shadow-elevated animate-message"
          >
            <span className="font-sans text-sm flex-1 min-w-0">{message.texte}</span>
            {message.annuler && (
              <button
                type="button"
                onClick={() => {
                  const annuler = message.annuler
                  fermer()
                  annuler()
                }}
                className="min-h-11 px-3 font-sans text-sm font-semibold text-bg-elevated underline underline-offset-2"
              >
                Annuler
              </button>
            )}
          </div>
        )}
      </div>
    </MessagesContexte.Provider>
  )
}
