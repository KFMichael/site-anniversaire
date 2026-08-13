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
    <section className="min-h-screen px-6 py-16">
      <h2 className="text-2xl font-light text-center text-neutral-900 mb-8">
        Ils pensent à toi
      </h2>

      {chargement && (
        <p className="text-center text-neutral-400 text-sm">Chargement…</p>
      )}

      {!chargement && messages.length === 0 && (
        <p className="text-center text-neutral-400 text-sm">
          Aucun message pour le moment. (Table `messages_proches` à créer dans
          Supabase.)
        </p>
      )}

      <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className="p-5 rounded-xl border border-neutral-200 bg-neutral-50"
          >
            {m.photo_url && (
              <img
                src={m.photo_url}
                alt=""
                className="w-full h-40 object-cover rounded-lg mb-3"
              />
            )}
            <p className="text-neutral-700">{m.message}</p>
            <p className="text-sm text-neutral-400 mt-2">— {m.auteur}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
