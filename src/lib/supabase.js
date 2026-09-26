import { createClient } from '@supabase/supabase-js'

// Les clés viennent du fichier .env.local (jamais commité sur Git)
// À remplir avec les vraies valeurs depuis Supabase > Project Settings > API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigure = Boolean(supabaseUrl && supabaseAnonKey)

if (!supabaseConfigure) {
  console.warn(
    'Clés Supabase manquantes. Copie .env.local.example vers .env.local et renseigne tes clés.'
  )
}

// Sans clés, createClient lève une exception : on passe une URL factice pour
// que l'application affiche un message explicite au lieu d'une page blanche.
export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'cle-manquante'
)
