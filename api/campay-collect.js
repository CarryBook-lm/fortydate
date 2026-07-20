// api/campay-collect.js — démarre le paiement Mobile Money (CamPay)
const BASE = process.env.CAMPAY_BASE || 'https://www.campay.net'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' })
  try {
    const { montant, jours, telephone, user_id, description } = req.body || {}
    if (!montant || !telephone || !user_id) return res.status(400).json({ error: 'Champs manquants' })
    const dureeJours = parseInt(jours, 10) || 30

    // Normalise le numéro : doit commencer par 237
    let tel = String(telephone).replace(/\s+/g, '')
    if (tel.startsWith('+')) tel = tel.slice(1)
    if (!tel.startsWith('237')) tel = '237' + tel.replace(/^0+/, '')

    const r = await fetch(`${BASE}/api/collect/`, {
      method: 'POST',
      headers: { Authorization: 'Token ' + process.env.CAMPAY_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: String(montant),
        currency: 'XAF',
        from: tel,
        description: description || 'Abonnement Serenite FortyDate',
        external_reference: `FD_${user_id}_${dureeJours}_${Date.now()}`   // unique à chaque tentative (comme CarryBooks) → pas de doublon
      })
    })
    const data = await r.json()
    if (!r.ok || !data.reference)
      return res.status(400).json({ error: (data.message || data.detail || 'Paiement refusé.') + '', detail: data })

    return res.status(200).json({ reference: data.reference, ussd: data.ussd_code, operator: data.operator })
  } catch (e) {
    return res.status(500).json({ error: 'Erreur serveur', detail: String(e) })
  }
}
