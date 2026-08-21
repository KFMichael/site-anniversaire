import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { HUMEURS, emojiHumeur } from '../data/humeurs'

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
  const [photoOuverte, setPhotoOuverte] = useState(null)

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
      <h2 className="font-sans text-3xl font-semibold text-center text-text-primary mb-8">
        Notre carnet d'activités
      </h2>

      <div className="max-w-2xl mx-auto mb-8 text-center">
        <button
          onClick={() => setFormOuvert(!formOuvert)}
          className="font-sans px-6 py-3 rounded-full bg-accent text-white font-medium transition-all duration-200 ease-spring hover:opacity-90 active:scale-95"
        >
          {formOuvert ? 'Annuler' : '📝 Ajouter une activité'}
        </button>
      </div>

      {formOuvert && (
        <form
          onSubmit={ajouterActivite}
          className="max-w-md mx-auto mb-12 space-y-4 p-6 rounded-3xl bg-bg-elevated-glass backdrop-blur-xl shadow-soft"
        >
          <input
            type="text"
            placeholder="Nom de l'activité"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
            className="font-sans w-full px-4 py-2 rounded-2xl border border-separator bg-bg-elevated text-text-primary placeholder:text-text-muted transition-colors duration-200 ease-spring focus:outline-none focus:border-accent"
          />
          <div>
            <label className="font-sans text-sm text-text-muted">Note : {note}/10</label>
            <input
              type="range"
              min="0"
              max="10"
              value={note}
              onChange={(e) => setNote(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>
          <textarea
            placeholder="Un souvenir de cette activité..."
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            className="font-sans w-full px-4 py-2 rounded-2xl border border-separator bg-bg-elevated text-text-primary placeholder:text-text-muted transition-colors duration-200 ease-spring focus:outline-none focus:border-accent"
            rows={3}
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files[0])}
            className="font-sans w-full text-sm text-text-muted file:mr-3 file:px-4 file:py-1.5 file:rounded-full file:border file:border-separator file:bg-transparent file:text-text-secondary file:cursor-pointer"
          />
          <button
            type="submit"
            disabled={envoiEnCours}
            className="font-sans w-full px-6 py-3 rounded-full bg-accent text-white transition-all duration-200 ease-spring hover:opacity-90 active:scale-95 disabled:opacity-50"
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
          <h3 className="font-sans text-xl font-semibold text-text-primary mb-4">
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
            <h3 className="font-sans text-xl font-semibold text-text-primary mb-4">
              Historique
            </h3>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {historique.map((a) => (
              <CarteHistorique
                key={a.id}
                activite={a}
                onEnregistre={charger}
                onOuvrirPhoto={setPhotoOuverte}
              />
            ))}
          </div>
        </div>
      )}

      {photoOuverte && (
        <Lightbox src={photoOuverte} onClose={() => setPhotoOuverte(null)} />
      )}
    </section>
  )
}

function Lightbox({ src, onClose }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  function fermer() {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  useEffect(() => {
    function surTouche(e) {
      if (e.key === 'Escape') fermer()
    }
    document.addEventListener('keydown', surTouche)
    return () => document.removeEventListener('keydown', surTouche)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      onClick={fermer}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6 transition-opacity duration-200 ease-spring ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <button
        onClick={fermer}
        aria-label="Fermer"
        className="absolute top-4 right-4 text-2xl leading-none text-white/80 hover:text-white transition-all duration-200 ease-spring active:scale-90 rounded-full w-10 h-10 flex items-center justify-center"
      >
        ✕
      </button>
      <img
        src={src}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[90vh] max-w-[90vw] rounded-3xl object-contain shadow-elevated transition-transform duration-200 ease-spring ${
          visible ? 'scale-100' : 'scale-95'
        }`}
      />
    </div>
  )
}

function CarteAVenir({ activite }) {
  return (
    <div className="p-5 rounded-3xl bg-bg-elevated-glass backdrop-blur-xl shadow-soft">
      <span className="inline-block mb-3 px-3 py-1 rounded-full text-xs font-sans font-medium bg-accent text-white">
        À venir 🗓️
      </span>
      <h3 className="font-sans text-lg font-medium text-text-primary">{activite.nom_activite}</h3>
      {activite.date_activite && (
        <p className="font-sans text-sm text-text-muted mt-1">
          {formatDateActivite(activite.date_activite)}
        </p>
      )}
    </div>
  )
}

function CarteHistorique({ activite, onEnregistre, onOuvrirPhoto }) {
  const [ouvert, setOuvert] = useState(false)
  const [note, setNote] = useState(5)
  const [commentaire, setCommentaire] = useState('')
  const [photo, setPhoto] = useState(null)
  const [moodFin, setMoodFin] = useState(null)
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
      .update({ note, commentaire, photo_url: photoUrl, mood_fin: moodFin })
      .eq('id', activite.id)

    if (!error) {
      setOuvert(false)
      onEnregistre()
    }
    setEnvoiEnCours(false)
  }

  return (
    <div className="p-5 rounded-3xl bg-bg-elevated-glass backdrop-blur-xl shadow-soft">
      {activite.photo_url ? (
        <button
          type="button"
          onClick={() => onOuvrirPhoto(activite.photo_url)}
          className="block w-full mb-3 rounded-2xl overflow-hidden transition-all duration-200 ease-spring active:scale-95"
        >
          <img
            src={activite.photo_url}
            alt=""
            className="w-full h-40 object-cover hover:opacity-90 transition-opacity duration-200 ease-spring"
          />
        </button>
      ) : (
        <div className="w-full h-40 mb-3 rounded-2xl border border-dashed border-separator flex flex-col items-center justify-center gap-1">
          <span className="text-2xl">📸</span>
          <span className="font-sans text-xs text-text-muted">Toujours pas de photo</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-sans text-lg font-medium text-text-primary">{activite.nom_activite}</h3>
        <div className="flex items-center gap-2 shrink-0">
          {activite.mood_debut && (
            <span title="Humeur au moment de valider">{emojiHumeur(activite.mood_debut)}</span>
          )}
          {activite.mood_fin && (
            <span title="Humeur après l'activité">{emojiHumeur(activite.mood_fin)}</span>
          )}
          {aUneNote && (
            <span className="font-sans text-sm text-text-muted">{activite.note}/10</span>
          )}
        </div>
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
          className="font-sans text-sm text-text-muted hover:text-text-secondary underline transition-colors duration-200 ease-spring active:scale-95 mt-3"
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
              className="w-full accent-accent"
            />
          </div>
          <textarea
            placeholder="Un souvenir de cette activité..."
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            className="font-sans w-full px-4 py-2 rounded-2xl border border-separator bg-bg-elevated text-text-primary placeholder:text-text-muted transition-colors duration-200 ease-spring focus:outline-none focus:border-accent"
            rows={2}
          />
          <div>
            <label className="font-sans text-sm text-text-muted block mb-2">
              Et maintenant, comment tu te sens ?
            </label>
            <div className="flex gap-2">
              {HUMEURS.map((h) => (
                <button
                  key={h.valeur}
                  type="button"
                  onClick={() => setMoodFin(h.valeur)}
                  aria-label={h.label}
                  aria-pressed={moodFin === h.valeur}
                  className={`text-xl w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 ease-spring active:scale-95 ${
                    moodFin === h.valeur
                      ? 'bg-accent border-transparent scale-110'
                      : 'border-separator hover:border-accent'
                  }`}
                >
                  {h.emoji}
                </button>
              ))}
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files[0])}
            className="font-sans w-full text-sm text-text-muted file:mr-3 file:px-4 file:py-1.5 file:rounded-full file:border file:border-separator file:bg-transparent file:text-text-secondary file:cursor-pointer"
          />
          <button
            type="submit"
            disabled={envoiEnCours}
            className="font-sans w-full px-4 py-2 rounded-full bg-accent text-white transition-all duration-200 ease-spring hover:opacity-90 active:scale-95 disabled:opacity-50"
          >
            {envoiEnCours ? 'Envoi…' : '💌 Enregistrer'}
          </button>
        </form>
      )}
    </div>
  )
}
