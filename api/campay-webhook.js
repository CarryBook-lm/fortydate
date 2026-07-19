// api/campay-webhook.js — CamPay appelle cette URL quand un paiement est terminé.
// On re-vérifie le statut chez CamPay (anti-fraude) avant d'activer.
import { campayStatus, activerAbonnement } from './_campay.js'

export default async function handler(req, res) {
  try {
    const p = req.method === 'GET' ? req.query : (req.body || {})
    const reference = p.reference
    if (reference) {
      const t = await campayStatus(reference)
      if (t.status === 'SUCCESSFUL') await activerAbonnement(t)
    }
  } catch (e) {
    // on ne renvoie jamais d'erreur à CamPay pour éviter les renvois en boucle
  }
  return res.status(200).json({ ok: true })
}
