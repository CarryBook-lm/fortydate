// api/chariow-checkout.js — crée une session de paiement Chariow et renvoie l'URL
const PRODUITS = {
  bienvenue: process.env.CHARIOW_PRD_BIENVENUE,
  hebdo: process.env.CHARIOW_PRD_HEBDO,
  mensuel: process.env.CHARIOW_PRD_MENSUEL,
}
const JOURS = { bienvenue: 30, hebdo: 7, mensuel: 30 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' })
  try {
    const { plan, user_id, email, first_name, phone } = req.body || {}
    const product_id = PRODUITS[plan]
    if (!product_id || !user_id || !email) return res.status(400).json({ error: 'Champs manquants' })

    let num = String(phone || '').replace(/\D/g, '').replace(/^237/, '')
    if (num.length < 8) num = '600000000'

    const r = await fetch('https://api.chariow.com/v1/checkout', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.CHARIOW_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id,
        email,
        first_name: first_name || 'Membre',
        last_name: 'FortyDate',
        phone: { number: num, country_code: 'CM' },
        redirect_url: 'https://fortydate.com/?abo=ok',
        custom_metadata: { user_id, jours: String(JOURS[plan] || 30) }
      })
    })
    const d = await r.json()
    if (d?.data?.step === 'payment' && d.data.payment?.checkout_url)
      return res.status(200).json({ checkout_url: d.data.payment.checkout_url })
    return res.status(400).json({ error: d.message || 'Paiement Chariow indisponible.', detail: d })
  } catch (e) {
    return res.status(500).json({ error: 'Erreur serveur', detail: String(e) })
  }
}
