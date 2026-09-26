// Petites briques d'interface partagées par toutes les pages, pour garder
// le même rendu iOS partout (cartes, titres, boutons).

export function Page({ titre, sousTitre, children }) {
  return (
    <main className="min-h-screen bg-bg-base px-4 pt-8 pb-28 md:pt-12">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        {titre && (
          <header className="flex flex-col gap-1 px-1">
            <h1 className="font-sans text-3xl font-bold text-text-primary">{titre}</h1>
            {sousTitre && <p className="font-sans text-text-muted">{sousTitre}</p>}
          </header>
        )}
        {children}
      </div>
    </main>
  )
}

export function Carte({ titre, children, className = '' }) {
  return (
    <section className={`p-5 rounded-3xl bg-bg-elevated shadow-soft flex flex-col gap-4 ${className}`}>
      {titre && <h2 className="font-sans text-lg font-semibold text-text-primary">{titre}</h2>}
      {children}
    </section>
  )
}

const STYLES_BOUTON = {
  principal: 'bg-accent text-white font-medium hover:opacity-90',
  secondaire: 'border border-separator bg-bg-elevated text-text-primary',
  discret: 'text-text-muted hover:text-text-primary',
}

export function Bouton({ variante = 'principal', className = '', ...props }) {
  return (
    <button
      {...props}
      className={`font-sans px-6 py-3 rounded-full transition-all duration-200 ease-spring active:scale-95 disabled:opacity-40 ${STYLES_BOUTON[variante]} ${className}`}
    />
  )
}

export function ChampTexte({ label, id, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="font-sans text-sm text-text-muted px-1">
          {label}
        </label>
      )}
      <input
        id={id}
        {...props}
        className="font-sans w-full px-4 py-3 rounded-2xl border border-separator bg-bg-base text-text-primary transition-colors duration-200 ease-spring focus:outline-none focus:border-accent"
      />
    </div>
  )
}
