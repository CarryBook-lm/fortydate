// api/chariow-checkout.js — crée une session de paiement Chariow et renvoie l'URL
const PRODUITS = {
  bienvenue: process.env.CHARIOW_PRD_BIENVENUE,
  hebdo: process.env.CHARIOW_PRD_HEBDO,
  mensuel: process.env.CHARIOW_PRD_MENSUEL,
}
const JOURS = { bienvenue: 30, hebdo: 7, mensuel: 30 }

// Indicatif à retirer du numéro selon le pays (Chariow reçoit le pays à part)
const DIAL = {
  CM: '237', CI: '225', SN: '221', BJ: '229', BF: '226', ML: '223', TG: '228',
  NE: '227', GA: '241', CG: '242', CD: '243', GN: '224', TD: '235', CF: '236',
  MA: '212', DZ: '213', TN: '216', FR: '33', BE: '32', CH: '41', CA: '1',
  US: '1', GB: '44', DE: '49', IT: '39', ES: '34', PT: '351',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' })
  try {
    const { plan, user_id, email, first_name, phone, pays } = req.body || {}
    const product_id = PRODUITS[plan]
    if (!product_id || !user_id || !email) return res.status(400).json({ error: 'Champs manquants' })

    const country = String(pays || 'CM').toUpperCase()
    // Numéro : chiffres seuls, on retire l'indicatif du pays s'il est en tête
    let num = String(phone || '').replace(/[^0-9]/g, '')
    const dial = DIAL[country]
    if (dial && num.startsWith(dial)) num = num.slice(dial.length)
    if (num.length < 6) num = '000000000'

    const r = await fetch('https://api.chariow.com/v1/checkout', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.CHARIOW_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id,
        email,
        first_name: first_name || 'Membre',
        last_name: 'FortyDate',
        phone: { number: num, country_code: country },
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
