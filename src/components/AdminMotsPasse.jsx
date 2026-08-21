import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminMotsPasse() {
  const [lignes, setLignes] = useState([])
  const [chargement, setChargement] = useState(true)
  const [motDePasse, setMotDePasse] = useState('')
  const [salutation, setSalutation] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  // Page non indexable : balise robots ajoutée/retirée avec le montage
  // du composant, sans toucher au reste du site.
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => document.head.removeChild(meta)
  }, [])

  useEffect(() => {
    charger()
  }, [])

  async function charger() {
    setChargement(true)
    const { data, error } = await supabase
      .from('mots_passe_accueil')
      .select('*')
      .order('id', { ascending: true })

    if (!error && data) setLignes(data)
    setChargement(false)
  }

  async function ajouter(e) {
    e.preventDefault()
    setErreur('')
    if (!motDePasse.trim() || !salutation.trim()) return

    setEnvoiEnCours(true)
    const { error } = await supabase.from('mots_passe_accueil').insert({
      mot_de_passe: motDePasse.trim(),
      salutation: salutation.trim(),
    })

    if (error) {
      setErreur("Erreur à l'ajout.")
    } else {
      setMotDePasse('')
      setSalutation('')
      charger()
    }
    setEnvoiEnCours(false)
  }

  async function supprimer(id) {
    const { error } = await supabase.from('mots_passe_accueil').delete().eq('id', id)
    if (!error) charger()
  }

  return (
    <section className="min-h-screen px-6 py-16 bg-bg-base">
      <div className="max-w-lg mx-auto">
        <h1 className="font-sans text-2xl font-semibold text-text-primary mb-8">
          Mots de passe &amp; salutations
        </h1>

        <form
          onSubmit={ajouter}
          className="space-y-3 p-5 rounded-3xl bg-bg-elevated-glass backdrop-blur-xl shadow-soft mb-8"
        >
          <input
            type="text"
            placeholder="Mot de passe"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="font-sans w-full px-4 py-2 rounded-2xl border border-separator bg-bg-elevated text-text-primary placeholder:text-text-muted transition-colors duration-200 ease-spring focus:outline-none focus:border-accent"
          />
          <input
            type="text"
            placeholder="Salutation associée (ex: mon amour)"
            value={salutation}
            onChange={(e) => setSalutation(e.target.value)}
            className="font-sans w-full px-4 py-2 rounded-2xl border border-separator bg-bg-elevated text-text-primary placeholder:text-text-muted transition-colors duration-200 ease-spring focus:outline-none focus:border-accent"
          />
          {erreur && <p className="font-sans text-sm text-text-muted">{erreur}</p>}
          <button
            type="submit"
            disabled={envoiEnCours}
            className="font-sans w-full px-6 py-2 rounded-full bg-accent text-white transition-all duration-200 ease-spring hover:opacity-90 active:scale-95 disabled:opacity-50"
          >
            {envoiEnCours ? 'Ajout…' : 'Ajouter'}
          </button>
        </form>

        {chargement && (
          <p className="font-sans text-text-muted text-sm">Chargement…</p>
        )}

        {!chargement && lignes.length === 0 && (
          <p className="font-sans text-text-muted text-sm">
            Aucun mot de passe enregistré.
          </p>
        )}

        <ul className="space-y-2">
          {lignes.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-bg-elevated-glass backdrop-blur-xl shadow-soft"
            >
              <div className="font-sans text-sm text-text-primary truncate">
                <span className="text-text-secondary">{l.mot_de_passe}</span>
                <span className="text-text-muted"> → </span>
                {l.salutation}
              </div>
              <button
                onClick={() => supprimer(l.id)}
                className="font-sans text-xs text-text-muted hover:text-text-secondary underline transition-colors duration-200 ease-spring active:scale-95 shrink-0"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
