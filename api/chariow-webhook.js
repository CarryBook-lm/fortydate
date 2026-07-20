// api/chariow-webhook.js — Pulse Chariow « Vente réussie » : active l'abonnement.
// Lecture TOLÉRANTE (comme MaBoutik) : on ne filtre pas par nom d'événement,
// on active dès que le statut n'est pas un échec, et on lit custom_metadata où qu'il soit.
const SR = process.env.SUPABASE_SERVICE_ROLE
const SUPA = process.env.SUPABASE_URL

// Lecture tolérante d'un champ imbriqué
function pick(obj, ...chemins) {
  for (const ch of chemins) {
    let v = obj
    for (const p of ch.split('.')) { v = v?.[p]; if (v == null) break }
    if (v != null) return v
  }
  return undefined
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true, ignored: 'non-POST' })
  try {
    const body = req.body || {}
    // Chariow range la vente sous "sale", ou "data", ou à la racine
    const sale = body.sale || body.data || body

    // On n'écarte QUE les vrais échecs / remboursements / en attente
    const statut = String(pick(sale, 'status', 'payment.status') || '').toLowerCase()
    if (['failed', 'refunded', 'refund', 'pending', 'cancel', 'abandon', 'chargeback'].some(s => statut.includes(s))) {
      return res.status(200).json({ ignore: true, raison: 'statut ' + statut })
    }

    // Les métadonnées reviennent dans sale.custom_metadata (ou à la racine)
    const meta = pick(sale, 'custom_metadata') || pick(body, 'custom_metadata') || {}
    const user_id = meta.user_id
    const jours = parseInt(meta.jours, 10) || 30
    if (!user_id) return res.status(200).json({ ignore: true, raison: 'sans user_id' })

    const saleId = pick(sale, 'id') || pick(sale, 'transaction_id') || Date.now()
    const montant = Number(pick(sale, 'amount.value') ?? pick(sale, 'amount') ?? 0) || 0
    const devise = pick(sale, 'amount.currency') || pick(sale, 'currency') || 'XAF'

    await fetch(SUPA + '/rest/v1/rpc/activer_abonnement', {
      method: 'POST',
      headers: { apikey: SR, Authorization: 'Bearer ' + SR, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_user_id: user_id,
        p_source: 'chariow',
        p_montant: montant,
        p_devise: devise,
        p_reference: 'chariow_' + saleId,
        p_jours: jours
      })
    })

    return res.status(200).json({ ok: true, active: true })
  } catch (e) {
    return res.status(200).json({ ok: false, erreur: e.message })
  }
}
