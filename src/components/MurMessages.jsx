import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function MurMessages() {
  const [messages, setMessages] = useState([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    async function charger() {
      const { data, error } = await supabase
        .from('messages_proches')
        .select('*')
        .order('date', { ascending: false })

      if (!error && data) setMessages(data)
      setChargement(false)
    }
    charger()
  }, [])

  return (
    <section className="min-h-screen px-6 py-16 bg-bg-base">
      <h2 className="font-display text-3xl font-semibold text-center text-text-primary mb-8">
        Ils pensent à toi
      </h2>

      {chargement && (
        <p className="font-sans text-center text-text-muted text-sm">Chargement…</p>
      )}

      {!chargement && messages.length === 0 && (
        <p className="font-sans text-center text-text-muted text-sm">
          Aucun message pour le moment. (Table `messages_proches` à créer dans
          Supabase.)
        </p>
      )}

      <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className="p-5 rounded-xl border border-white/10 bg-bg-elevated"
          >
            {m.photo_url && (
              <img
                src={m.photo_url}
                alt=""
                className="w-full h-40 object-cover rounded-lg mb-3"
              />
            )}
            <p className="font-sans text-text-secondary">{m.message}</p>
            <p className="font-sans text-sm text-text-muted mt-2">— {m.auteur}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
