import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

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

    const { error } = await supabase.from('activites_carnet').insert({
      nom_activite: nom,
      note,
      commentaire,
      photo_url: photoUrl,
      date: new Date().toISOString(),
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

  return (
    <section className="min-h-screen px-6 py-16">
      <h2 className="text-2xl font-light text-center text-neutral-900 mb-8">
        Notre carnet d'activités
      </h2>

      <div className="max-w-2xl mx-auto mb-8 text-center">
        <button
          onClick={() => setFormOuvert(!formOuvert)}
          className="px-6 py-3 rounded-full border border-neutral-300 text-neutral-700 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors"
        >
          {formOuvert ? 'Annuler' : '+ Ajouter une activité'}
        </button>
      </div>

      {formOuvert && (
        <form
          onSubmit={ajouterActivite}
          className="max-w-md mx-auto mb-12 space-y-4 p-6 rounded-xl border border-neutral-200"
        >
          <input
            type="text"
            placeholder="Nom de l'activité"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg border border-neutral-300"
          />
          <div>
            <label className="text-sm text-neutral-500">Note : {note}/10</label>
            <input
              type="range"
              min="0"
              max="10"
              value={note}
              onChange={(e) => setNote(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <textarea
            placeholder="Un souvenir de cette activité..."
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-neutral-300"
            rows={3}
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files[0])}
            className="w-full text-sm"
          />
          <button
            type="submit"
            disabled={envoiEnCours}
            className="w-full px-6 py-3 rounded-full bg-neutral-900 text-white hover:bg-neutral-700 transition-colors disabled:opacity-50"
          >
            {envoiEnCours ? 'Envoi…' : 'Enregistrer'}
          </button>
        </form>
      )}

      {chargement && (
        <p className="text-center text-neutral-400 text-sm">Chargement…</p>
      )}

      {!chargement && activites.length === 0 && (
        <p className="text-center text-neutral-400 text-sm">
          Aucune activité enregistrée pour le moment. (Table
          `activites_carnet` et bucket `photos-carnet` à créer dans
          Supabase.)
        </p>
      )}

      <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {activites.map((a) => (
          <div
            key={a.id}
            className="p-5 rounded-xl border border-neutral-200 bg-neutral-50"
          >
            {a.photo_url && (
              <img
                src={a.photo_url}
                alt=""
                className="w-full h-40 object-cover rounded-lg mb-3"
              />
            )}
            <div className="flex items-center justify-between">
              <h3 className="text-lg text-neutral-900">{a.nom_activite}</h3>
              <span className="text-sm text-neutral-400">{a.note}/10</span>
            </div>
            {a.commentaire && (
              <p className="text-neutral-600 mt-2">{a.commentaire}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
