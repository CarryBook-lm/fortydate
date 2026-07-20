// api/admin-data.js — renvoie les données admin (tous les paiements) UNIQUEMENT à l'admin.
// Sécurité : on vérifie le jeton Supabase de l'appelant et on compare son email à VITE_ADMIN_EMAIL.
import { createClient } from '@supabase/supabase-js'

const SUPA_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_EMAIL = (process.env.VITE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase()

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' })
  if (!SUPA_URL || !ANON || !SERVICE) return res.status(500).json({ error: 'Config serveur manquante' })

  try {
    // 1) Identifier l'appelant via son jeton Supabase
    const token = (req.headers.authorization || '').replace(/^Bearer /, '')
    if (!token) return res.status(401).json({ error: 'Non connecté' })
    const userClient = createClient(SUPA_URL, ANON, {
      global: { headers: { Authorization: 'Bearer ' + token } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: { user } } = await userClient.auth.getUser()
    const email = (user?.email || '').trim().toLowerCase()

    // 2) Vérifier que c'est bien l'admin
    if (!ADMIN_EMAIL || email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Accès réservé à l’administrateur.' })
    }

    // 3) Lire TOUS les paiements avec la clé service (contourne la RLS)
    const admin = createClient(SUPA_URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: paiements, error } = await admin
      .from('paiements')
      .select('*')
      .order('cree_at', { ascending: false })
      .limit(500)
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({ paiements: paiements || [] })
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
}
