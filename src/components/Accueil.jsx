import { useEffect, useRef, useState } from 'react'

// Étapes du parcours d'accueil :
// 'bienvenue' -> 'aimes-tu' -> 'transition' -> (fin, on passe au quiz)
export default function Accueil({ onEntrer }) {
  const [ecran, setEcran] = useState('bienvenue')

  return (
    <section className="min-h-screen relative flex flex-col items-center justify-center px-6 bg-bg-base overflow-hidden">
      {/* Halo de dégradé en fond, discret et diffus */}
      <div
        className="absolute inset-0 opacity-40 blur-3xl gradient-sunset"
        style={{ maskImage: 'radial-gradient(circle at center, black, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full flex flex-col items-center">
        {ecran === 'bienvenue' && (
          <EcranBienvenue onSuite={() => setEcran('aimes-tu')} />
        )}
        {ecran === 'aimes-tu' && (
          <EcranAimesTu onOui={() => setEcran('transition')} />
        )}
        {ecran === 'transition' && <EcranTransition onSuite={onEntrer} />}
      </div>
    </section>
  )
}

function EcranBienvenue({ onSuite }) {
  const [etape, setEtape] = useState(0)
  // 0 = rien, 1 = "Bienvenue" visible, 2 = "U" visible, 3 = bouton visible

  useEffect(() => {
    const t1 = setTimeout(() => setEtape(1), 400)
    const t2 = setTimeout(() => setEtape(2), 1600)
    const t3 = setTimeout(() => setEtape(3), 2600)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  return (
    <div className="flex flex-col items-center gap-10 text-center">
      <div className="flex flex-col items-center">
        <p
          className={`font-sans text-lg md:text-xl font-medium tracking-[0.3em] uppercase text-text-secondary transition-opacity duration-1000 ${
            etape >= 1 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Bienvenue
        </p>
        <h1
          className={`font-display text-9xl md:text-[12rem] font-bold gradient-sunset-text leading-none transition-all duration-1000 ${
            etape >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          U
        </h1>
      </div>

      <button
        onClick={onSuite}
        className={`font-sans px-8 py-3 rounded-full border border-white/20 text-text-primary hover:bg-white hover:text-bg-base transition-all duration-700 ${
          etape >= 3 ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        Entrer
      </button>
    </div>
  )
}

function EcranAimesTu({ onOui }) {
  const [visible, setVisible] = useState(false)
  const [posNon, setPosNon] = useState({ x: 0, y: 0 })
  const [aEssaye, setAEssaye] = useState(false)
  const boutonNonRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200)
    return () => clearTimeout(t)
  }, [])

  function esquiver() {
    const deltaX = (Math.random() - 0.5) * 260
    const deltaY = (Math.random() - 0.5) * 160
    setPosNon({ x: deltaX, y: deltaY })
    setAEssaye(true)
  }

  // L'esquive est un gag pensé pour la souris (survol). Un clic déclenché
  // au clavier (Entrée/Espace) a event.detail === 0 : on ne fait alors rien,
  // pour que le bouton reste normalement atteignable et activable au clavier.
  function surClicNon(e) {
    if (e.detail === 0) return
    esquiver()
  }

  return (
    <div
      className={`flex flex-col items-center gap-6 text-center transition-opacity duration-1000 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <p className="font-display text-4xl md:text-5xl font-semibold text-text-primary">
        Est-ce que tu m'aimes ? 💭
      </p>
      <p
        className={`font-sans text-sm text-text-muted italic transition-opacity duration-500 ${
          aEssaye ? 'opacity-100' : 'opacity-0'
        }`}
      >
        (attention, question piège 😏)
      </p>
      <div className="relative flex items-center justify-center gap-6 h-16 w-full max-w-xs mt-4">
        <button
          onClick={onOui}
          className="font-sans px-8 py-3 rounded-full gradient-sunset text-white font-medium hover:opacity-90 transition-opacity"
        >
          Oui 🤍
        </button>
        <button
          ref={boutonNonRef}
          onMouseEnter={esquiver}
          onClick={surClicNon}
          style={{
            transform: `translate(${posNon.x}px, ${posNon.y}px)`,
            transition: 'transform 0.25s ease-out',
          }}
          className="font-sans px-8 py-3 rounded-full border border-white/20 text-text-secondary"
        >
          Non
        </button>
      </div>
    </div>
  )
}

function EcranTransition({ onSuite }) {
  const [etape, setEtape] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setEtape(1), 300)
    const t2 = setTimeout(() => setEtape(2), 1800)
    const t3 = setTimeout(() => onSuite(), 3800)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [onSuite])

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <p
        className={`font-display text-4xl md:text-5xl font-semibold gradient-sunset-text transition-opacity duration-1000 ${
          etape >= 1 ? 'opacity-100' : 'opacity-0'
        }`}
      >
        Je le savais.
      </p>
      <p
        className={`font-sans text-xl md:text-2xl font-medium text-text-secondary transition-opacity duration-1000 ${
          etape >= 2 ? 'opacity-100' : 'opacity-0'
        }`}
      >
        Maintenant, aide-moi à te gâter. 🎁
      </p>
    </div>
  )
}