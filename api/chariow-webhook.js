// api/chariow-webhook.js — Pulse Chariow : active l'abonnement quand la vente est finalisée
export default async function handler(req, res) {
  try {
    const { event, data } = req.body || {}
    if ((event === 'sale.completed' || event === 'sale.paid') && data) {
      const meta = data.custom_metadata || {}
      const user_id = meta.user_id
      const jours = parseInt(meta.jours, 10) || 30
      const reference = 'chariow_' + (data.id || data.transaction_id || Date.now())
      const montant = Number(data.amount?.value ?? data.amount ?? 0) || 0
      const devise = data.amount?.currency || data.currency || 'XAF'

      if (user_id) {
        await fetch(process.env.SUPABASE_URL + '/rest/v1/rpc/activer_abonnement', {
          method: 'POST',
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE,
            Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            p_user_id: user_id,
            p_source: 'chariow',
            p_montant: montant,
            p_devise: devise,
            p_reference: reference,
            p_jours: jours
          })
        })
      }
    }
  } catch (e) {
    // jamais d'erreur renvoyée à Chariow (évite les renvois en boucle)
  }
  return res.status(200).json({ ok: true })
}
