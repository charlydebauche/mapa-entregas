import { createClient } from '@supabase/supabase-js'

// Los valores salen de las variables de entorno (archivo .env en local, o
// "Environment Variables" en Vercel). Vite solo expone las que empiezan con VITE_.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigurado = Boolean(url && key)

export const supabase = supabaseConfigurado ? createClient(url, key) : null
