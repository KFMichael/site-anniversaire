import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useEspace } from '../espace/contexte'
import { EtatErreur } from '../../components/ui'

// Mots de passe acceptés par le mode surprise, et la salutation affichée en
// grand pour chacun (ex. « chaton » -> « Mon amour »). Propres à l'espace.
export default function ReglagesSurprise() {
  const { espace } = useEspace()
  const [lignes, setLignes] = useState([])
  const [chargement, setChargement] = useState(true)
  const [motDePasse, setMotDePasse] = useState('')
  const [salutation, setSalutation] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  const [erreurChargement, setErreurChargement] = useState(false)

  // Rechargé aussi quand on change d'espace
  const charger = useCallback(async () => {
    setChargement(true)
    const { data, error } = await supabase
      .from('mots_passe_accueil')
      .select('*')
      .eq('espace_id', espace.id)
      .order('id', { ascending: true })

    setErreurChargement(Boolean(error))
    if (!error && data) setLignes(data)
    setChargement(false)
  }, [espace.id])

  useEffect(() => {
    charger()
  }, [charger])

  async function ajouter(e) {
    e.preventDefault()
    setErreur('')
    if (!motDePasse.trim() || !salutation.trim()) return

    setEnvoiEnCours(true)
    const { error } = await supabase.from('mots_passe_accueil').insert({
      espace_id: espace.id,
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
    if (error) setErreur("Le mot de passe n'a pas pu être supprimé.")
    else charger()
  }

  return (
    <section>
      <div>
        <p className="font-sans text-sm text-text-muted mb-6 px-1">
          Le mode surprise demande un mot de passe avant d'afficher la salutation
          associée, puis enchaîne sur le quiz d'activités.
        </p>

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

        {!chargement && erreurChargement && <EtatErreur message="Les mots de passe n'ont pas pu être chargés. Vérifie ta connexion." />}

        {!chargement && !erreurChargement && lignes.length === 0 && (
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
                aria-label={`Supprimer le mot de passe ${l.mot_de_passe}`}
                className="cible-44 font-sans text-sm text-danger underline transition-colors duration-200 ease-spring active:scale-95 shrink-0"
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
