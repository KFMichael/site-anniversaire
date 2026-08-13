import { createClient } from '@supabase/supabase-js'

// Les clés viennent du fichier .env.local (jamais commité sur Git)
// À remplir avec les vraies valeurs depuis Supabase > Project Settings > API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Clés Supabase manquantes. Copie .env.local.example vers .env.local et renseigne tes clés.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
