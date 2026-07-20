// api/admin-data.js — données + actions admin. Réservé à l'admin (vérif email).
import { createClient } from '@supabase/supabase-js'

const SUPA_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_EMAIL = (process.env.VITE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase()

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' })
  if (!SUPA_URL || !ANON || !SERVICE) return res.status(500).json({ error: 'Config serveur manquante' })

  try {
    const token = (req.headers.authorization || '').replace(/^Bearer /, '')
    if (!token) return res.status(401).json({ error: 'Non connecté' })
    const userClient = createClient(SUPA_URL, ANON, {
      global: { headers: { Authorization: 'Bearer ' + token } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: { user } } = await userClient.auth.getUser()
    const email = (user?.email || '').trim().toLowerCase()
    if (!ADMIN_EMAIL || email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Accès réservé à l’administrateur.' })
    }

    const admin = createClient(SUPA_URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } })
    const { action, id, valeur } = req.body || {}

    // ===== ACTIONS =====
    if (action === 'bloquer') {
      const { error } = await admin.from('profiles').update({ bloque: !!valeur }).eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true })
    }
    if (action === 'supprimer') {
      const { error } = await admin.from('profiles').delete().eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true })
    }

    // ===== DONNÉES (par défaut) =====
    const { data: paiements } = await admin.from('paiements').select('*')
      .order('cree_at', { ascending: false }).limit(500)

    const { data: sigs } = await admin.from('signalements').select('*')
      .order('cree_at', { ascending: false }).limit(500)

    const tousSigs = sigs || []
    const ids = new Set()
    tousSigs.forEach(s => { if (s.signaleur_id) ids.add(s.signaleur_id); if (s.signale_id) ids.add(s.signale_id) })
    let noms = {}
    if (ids.size > 0) {
      const { data: profs } = await admin.from('profiles').select('id, prenom, bloque').in('id', Array.from(ids))
      ;(profs || []).forEach(p => { noms[p.id] = { prenom: p.prenom, bloque: p.bloque } })
    }
    const nbFait = {}, nbRecu = {}
    tousSigs.forEach(s => {
      if (s.signaleur_id) nbFait[s.signaleur_id] = (nbFait[s.signaleur_id] || 0) + 1
      if (s.signale_id) nbRecu[s.signale_id] = (nbRecu[s.signale_id] || 0) + 1
    })
    const signalements = tousSigs.map(s => ({
      id: s.id, objet: s.objet, cree_at: s.cree_at,
      signale_id: s.signale_id, signaleur_id: s.signaleur_id,
      signale_nom: noms[s.signale_id]?.prenom || '?',
      signale_bloque: !!noms[s.signale_id]?.bloque,
      signaleur_nom: noms[s.signaleur_id]?.prenom || '?',
      signaleur_nb_faits: nbFait[s.signaleur_id] || 0,
      signale_nb_recus: nbRecu[s.signale_id] || 0,
    }))

    return res.status(200).json({ paiements: paiements || [], signalements })
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
}
