import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function formatDateActivite(iso) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function estAVenir(a) {
  if (!a.date_activite) return false
  return new Date(a.date_activite) > new Date()
}

export default function CarnetActivites() {
  const [activites, setActivites] = useState([])
  const [chargement, setChargement] = useState(true)
  const [formOuvert, setFormOuvert] = useState(false)
  const [nom, setNom] = useState('')
  const [note, setNote] = useState(5)
  const [commentaire, setCommentaire] = useState('')
  const [photo, setPhoto] = useState(null)
  const [envoiEnCours, setEnvoiEnCours] = useState(false)

  useEffect(() => {
    charger()
  }, [])

  async function charger() {
    setChargement(true)
    const { data, error } = await supabase
      .from('activites_carnet')
      .select('*')
      .order('date', { ascending: false })

    if (!error && data) setActivites(data)
    setChargement(false)
  }

  async function ajouterActivite(e) {
    e.preventDefault()
    setEnvoiEnCours(true)

    let photoUrl = null

    if (photo) {
      const nomFichier = `${Date.now()}-${photo.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos-carnet')
        .upload(nomFichier, photo)

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('photos-carnet')
          .getPublicUrl(uploadData.path)
        photoUrl = urlData.publicUrl
      }
    }

    const maintenant = new Date().toISOString()
    const { error } = await supabase.from('activites_carnet').insert({
      nom_activite: nom,
      note,
      commentaire,
      photo_url: photoUrl,
      date: maintenant,
      date_activite: maintenant,
    })

    if (!error) {
      setNom('')
      setNote(5)
      setCommentaire('')
      setPhoto(null)
      setFormOuvert(false)
      charger()
    }
    setEnvoiEnCours(false)
  }

  const aVenir = activites
    .filter(estAVenir)
    .sort((a, b) => new Date(a.date_activite) - new Date(b.date_activite))

  const historique = activites
    .filter((a) => !estAVenir(a))
    .sort(
      (a, b) =>
        new Date(b.date_activite || b.date) - new Date(a.date_activite || a.date)
    )

  return (
    <section className="min-h-screen px-6 py-16 bg-bg-base">
      <h2 className="font-display text-3xl font-semibold text-center text-text-primary mb-8">
        Notre carnet d'activités
      </h2>

      <div className="max-w-2xl mx-auto mb-8 text-center">
        <button
          onClick={() => setFormOuvert(!formOuvert)}
          className="font-sans px-6 py-3 rounded-full gradient-sunset text-white font-medium hover:opacity-90 transition-opacity"
        >
          {formOuvert ? 'Annuler' : '📝 Ajouter une activité'}
        </button>
      </div>

      {formOuvert && (
        <form
          onSubmit={ajouterActivite}
          className="max-w-md mx-auto mb-12 space-y-4 p-6 rounded-xl border border-white/10 bg-bg-elevated"
        >
          <input
            type="text"
            placeholder="Nom de l'activité"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
            className="font-sans w-full px-4 py-2 rounded-lg border border-white/20 bg-bg-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-white/40"
          />
          <div>
            <label className="font-sans text-sm text-text-muted">Note : {note}/10</label>
            <input
              type="range"
              min="0"
              max="10"
              value={note}
              onChange={(e) => setNote(Number(e.target.value))}
              className="w-full accent-gradient-rose"
            />
          </div>
          <textarea
            placeholder="Un souvenir de cette activité..."
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            className="font-sans w-full px-4 py-2 rounded-lg border border-white/20 bg-bg-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-white/40"
            rows={3}
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files[0])}
            className="font-sans w-full text-sm text-text-muted file:mr-3 file:px-4 file:py-1.5 file:rounded-full file:border file:border-white/20 file:bg-transparent file:text-text-secondary file:cursor-pointer"
          />
          <button
            type="submit"
            disabled={envoiEnCours}
            className="font-sans w-full px-6 py-3 rounded-full gradient-sunset text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {envoiEnCours ? 'Envoi…' : '💌 Enregistrer'}
          </button>
        </form>
      )}

      {chargement && (
        <p className="font-sans text-center text-text-muted text-sm">Chargement…</p>
      )}

      {!chargement && activites.length === 0 && (
        <p className="font-sans text-center text-text-muted text-sm">
          Aucune activité enregistrée pour le moment. (Table
          `activites_carnet` et bucket `photos-carnet` à créer dans
          Supabase.)
        </p>
      )}

      {!chargement && aVenir.length > 0 && (
        <div className="max-w-3xl mx-auto mb-10">
          <h3 className="font-display text-xl font-semibold text-text-primary mb-4">
            À venir
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aVenir.map((a) => (
              <CarteAVenir key={a.id} activite={a} />
            ))}
          </div>
        </div>
      )}

      {!chargement && historique.length > 0 && (
        <div className="max-w-3xl mx-auto">
          {aVenir.length > 0 && (
            <h3 className="font-display text-xl font-semibold text-text-primary mb-4">
              Historique
            </h3>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {historique.map((a) => (
              <CarteHistorique key={a.id} activite={a} onEnregistre={charger} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function CarteAVenir({ activite }) {
  return (
    <div className="p-5 rounded-xl border border-white/10 bg-bg-elevated">
      <span className="inline-block mb-3 px-3 py-1 rounded-full text-xs font-sans font-medium gradient-sunset text-white">
        À venir 🗓️
      </span>
      <h3 className="font-display text-lg text-text-primary">{activite.nom_activite}</h3>
      {activite.date_activite && (
        <p className="font-sans text-sm text-text-muted mt-1">
          {formatDateActivite(activite.date_activite)}
        </p>
      )}
    </div>
  )
}

function CarteHistorique({ activite, onEnregistre }) {
  const [ouvert, setOuvert] = useState(false)
  const [note, setNote] = useState(5)
  const [commentaire, setCommentaire] = useState('')
  const [photo, setPhoto] = useState(null)
  const [envoiEnCours, setEnvoiEnCours] = useState(false)

  const aUneNote = activite.note !== null && activite.note !== undefined

  async function enregistrerNote(e) {
    e.preventDefault()
    setEnvoiEnCours(true)

    let photoUrl = null
    if (photo) {
      const nomFichier = `${Date.now()}-${photo.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos-carnet')
        .upload(nomFichier, photo)

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('photos-carnet')
          .getPublicUrl(uploadData.path)
        photoUrl = urlData.publicUrl
      }
    }

    const { error } = await supabase
      .from('activites_carnet')
      .update({ note, commentaire, photo_url: photoUrl })
      .eq('id', activite.id)

    if (!error) {
      setOuvert(false)
      onEnregistre()
    }
    setEnvoiEnCours(false)
  }

  return (
    <div className="p-5 rounded-xl border border-white/10 bg-bg-elevated">
      {activite.photo_url && (
        <img
          src={activite.photo_url}
          alt=""
          className="w-full h-40 object-cover rounded-lg mb-3"
        />
      )}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-text-primary">{activite.nom_activite}</h3>
        {aUneNote && (
          <span className="font-sans text-sm text-text-muted">{activite.note}/10</span>
        )}
      </div>
      {activite.date_activite && (
        <p className="font-sans text-xs text-text-muted mt-1">
          {formatDateActivite(activite.date_activite)}
        </p>
      )}
      {activite.commentaire && (
        <p className="font-sans text-text-secondary mt-2">{activite.commentaire}</p>
      )}

      {!aUneNote && !ouvert && (
        <button
          onClick={() => setOuvert(true)}
          className="font-sans text-sm text-text-muted hover:text-text-secondary underline transition-colors mt-3"
        >
          📝 Ajouter une note
        </button>
      )}

      {!aUneNote && ouvert && (
        <form onSubmit={enregistrerNote} className="mt-4 space-y-3">
          <div>
            <label className="font-sans text-sm text-text-muted">Note : {note}/10</label>
            <input
              type="range"
              min="0"
              max="10"
              value={note}
              onChange={(e) => setNote(Number(e.target.value))}
              className="w-full accent-gradient-rose"
            />
          </div>
          <textarea
            placeholder="Un souvenir de cette activité..."
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            className="font-sans w-full px-4 py-2 rounded-lg border border-white/20 bg-bg-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-white/40"
            rows={2}
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files[0])}
            className="font-sans w-full text-sm text-text-muted file:mr-3 file:px-4 file:py-1.5 file:rounded-full file:border file:border-white/20 file:bg-transparent file:text-text-secondary file:cursor-pointer"
          />
          <button
            type="submit"
            disabled={envoiEnCours}
            className="font-sans w-full px-4 py-2 rounded-full gradient-sunset text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {envoiEnCours ? 'Envoi…' : '💌 Enregistrer'}
          </button>
        </form>
      )}
    </div>
  )
}
