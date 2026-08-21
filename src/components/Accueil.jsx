import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { HUMEURS } from '../data/humeurs'

const MESSAGES_ERREUR = [
  'Pas tout à fait... 😏',
  'Essaie encore.',
  'Presque. Ou pas du tout.',
]

// Étapes du parcours d'accueil :
// 'mot-de-passe' -> 'bienvenue' -> 'aimes-tu' -> 'transition' -> (fin, on passe au quiz)
export default function Accueil({ onEntrer }) {
  const [ecran, setEcran] = useState('mot-de-passe')
  const [salutation, setSalutation] = useState('U')
  const [mood, setMood] = useState(null)

  return (
    <section className="min-h-screen relative flex flex-col items-center justify-center px-6 bg-bg-base overflow-hidden">
      <div className="relative z-10 w-full flex flex-col items-center">
        {ecran === 'mot-de-passe' && (
          <EcranMotDePasse
            mood={mood}
            onMoodChange={setMood}
            onValide={(salutationTrouvee) => {
              setSalutation(salutationTrouvee || 'U')
              setEcran('bienvenue')
            }}
          />
        )}
        {ecran === 'bienvenue' && (
          <EcranBienvenue salutation={salutation} onSuite={() => setEcran('aimes-tu')} />
        )}
        {ecran === 'aimes-tu' && (
          <EcranAimesTu onOui={() => setEcran('transition')} />
        )}
        {ecran === 'transition' && (
          <EcranTransition onSuite={() => onEntrer(mood)} />
        )}
      </div>
    </section>
  )
}

function EcranMotDePasse({ mood, onMoodChange, onValide }) {
  const [motSaisi, setMotSaisi] = useState('')
  const [erreur, setErreur] = useState('')
  const [verification, setVerification] = useState(false)

  async function valider(e) {
    e.preventDefault()
    setErreur('')

    if (!mood) {
      setErreur('Choisis aussi ton humeur du jour.')
      return
    }

    setVerification(true)
    const { data, error } = await supabase
      .from('mots_passe_accueil')
      .select('salutation')
      // ilike sans wildcard = comparaison insensible à la casse ; on
      // échappe % et _ pour éviter tout effet de motif involontaire
      .ilike('mot_de_passe', motSaisi.trim().replace(/[%_]/g, '\\$&'))
      .maybeSingle()
    setVerification(false)

    if (error || !data) {
      setErreur(MESSAGES_ERREUR[Math.floor(Math.random() * MESSAGES_ERREUR.length)])
      return
    }

    onValide(data.salutation)
  }

  return (
    <form
      onSubmit={valider}
      className="flex flex-col items-center gap-8 text-center max-w-sm w-full"
    >
      <div className="w-full flex flex-col items-center gap-2">
        <label htmlFor="mot-de-passe" className="font-sans text-sm text-text-muted">
          Le mot de passe du jour ?
        </label>
        <input
          id="mot-de-passe"
          type="text"
          value={motSaisi}
          onChange={(e) => setMotSaisi(e.target.value)}
          autoComplete="off"
          autoFocus
          className="font-sans w-full px-4 py-2.5 rounded-2xl border border-separator bg-bg-elevated text-text-primary text-center transition-colors duration-200 ease-spring focus:outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="font-sans text-sm text-text-muted">Comment vas-tu aujourd'hui ?</p>
        <div className="flex gap-3">
          {HUMEURS.map((h) => (
            <button
              key={h.valeur}
              type="button"
              onClick={() => onMoodChange(h.valeur)}
              aria-label={h.label}
              aria-pressed={mood === h.valeur}
              className={`text-2xl w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-200 ease-spring active:scale-95 ${
                mood === h.valeur
                  ? 'bg-accent border-transparent scale-110'
                  : 'border-separator hover:border-accent'
              }`}
            >
              {h.emoji}
            </button>
          ))}
        </div>
      </div>

      {erreur && (
        <p className="font-sans text-sm text-text-muted italic">{erreur}</p>
      )}

      <button
        type="submit"
        disabled={verification || motSaisi.trim().length === 0}
        className="font-sans px-8 py-3 rounded-full bg-accent text-white font-medium transition-all duration-200 ease-spring hover:opacity-90 active:scale-95 disabled:opacity-40"
      >
        {verification ? 'Vérification…' : 'Valider'}
      </button>
    </form>
  )
}

function EcranBienvenue({ salutation, onSuite }) {
  const [etape, setEtape] = useState(0)
  // 0 = rien, 1 = "Bienvenue" visible, 2 = salutation visible, 3 = bouton visible

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
          className={`font-sans text-lg md:text-xl font-medium tracking-[0.3em] uppercase text-text-secondary transition-opacity duration-1000 ease-spring ${
            etape >= 1 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Bienvenue
        </p>
        <h1
          className={`font-sans text-9xl md:text-[12rem] font-bold text-accent leading-none transition-all duration-1000 ease-spring ${
            etape >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {salutation}
        </h1>
      </div>

      <button
        onClick={onSuite}
        className={`font-sans px-8 py-3 rounded-full border border-separator text-text-primary transition-all duration-300 ease-spring active:scale-95 hover:bg-accent hover:text-white hover:border-accent ${
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
      className={`flex flex-col items-center gap-6 text-center transition-opacity duration-1000 ease-spring ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <p className="font-sans text-4xl md:text-5xl font-semibold text-text-primary">
        Est-ce que tu m'aimes ? 💭
      </p>
      <p
        className={`font-sans text-sm text-text-muted italic transition-opacity duration-500 ease-spring ${
          aEssaye ? 'opacity-100' : 'opacity-0'
        }`}
      >
        (attention, question piège 😏)
      </p>
      <div className="relative flex items-center justify-center gap-6 h-16 w-full max-w-xs mt-4">
        <button
          onClick={onOui}
          className="font-sans px-8 py-3 rounded-full bg-accent text-white font-medium transition-all duration-200 ease-spring hover:opacity-90 active:scale-95"
        >
          Oui 🤍
        </button>
        <button
          ref={boutonNonRef}
          onMouseEnter={esquiver}
          onClick={surClicNon}
          style={{
            transform: `translate(${posNon.x}px, ${posNon.y}px)`,
            transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          className="font-sans px-8 py-3 rounded-full border border-separator text-text-secondary"
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
        className={`font-sans text-4xl md:text-5xl font-semibold text-accent transition-opacity duration-1000 ease-spring ${
          etape >= 1 ? 'opacity-100' : 'opacity-0'
        }`}
      >
        Je le savais.
      </p>
      <p
        className={`font-sans text-xl md:text-2xl font-medium text-text-secondary transition-opacity duration-1000 ease-spring ${
          etape >= 2 ? 'opacity-100' : 'opacity-0'
        }`}
      >
        Maintenant, aide-moi à te gâter. 🎁
      </p>
    </div>
  )
}
