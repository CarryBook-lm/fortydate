// api/campay-status.js — vérifie le statut d'un paiement, et active l'abonnement si réussi
import { campayStatus, activerAbonnement } from './_campay.js'

export default async function handler(req, res) {
  try {
    const reference = req.query.reference || (req.body && req.body.reference)
    if (!reference) return res.status(400).json({ error: 'reference manquante' })

    const t = await campayStatus(reference)   // statut réel chez CamPay
    if (t.status === 'SUCCESSFUL') {
      await activerAbonnement(t)               // idempotent
    }
    return res.status(200).json({ status: t.status, amount: t.amount })
  } catch (e) {
    return res.status(500).json({ error: 'Erreur serveur', detail: String(e) })
  }
}
