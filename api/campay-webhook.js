// api/campay-webhook.js — CamPay appelle cette URL quand un paiement est terminé.
// On re-vérifie le statut chez CamPay (anti-fraude) avant d'activer,
// et on écrit chaque passage dans campay_journal pour pouvoir diagnostiquer.
import { campayStatus, activerAbonnement, journaliser } from './_campay.js'

export default async function handler(req, res) {
  let reference = null
  try {
    const p = req.method === 'GET' ? req.query : (req.body || {})
    // CamPay envoie « reference » ; on accepte quelques variantes par sécurité
    reference = p.reference || p.transaction_reference || p.trx_reference || null

    if (!reference) {
      await journaliser({ statut: 'SANS_REFERENCE', ok: false, erreur: 'aucune reference recue', brut: p })
      return res.status(200).json({ ok: true })
    }

    const t = await campayStatus(reference)

    if (t.status !== 'SUCCESSFUL') {
      await journaliser({
        reference, statut: t.status || 'INCONNU', ok: false,
        erreur: t.reason || null, brut: t
      })
      return res.status(200).json({ ok: true })
    }

    const r = await activerAbonnement(t)
    await journaliser({
      reference,
      statut: r.doublon ? 'DEJA_ACTIVE' : 'SUCCESSFUL',
      user_id: r.userId,
      montant: Number(t.amount) || 0,
      jours: r.jours,
      ok: r.ok,
      erreur: r.erreur,
      brut: t
    })
  } catch (e) {
    await journaliser({ reference, statut: 'ERREUR', ok: false, erreur: String(e && e.message).slice(0, 300) })
  }
  // On répond toujours 200 : sinon CamPay renvoie la notification en boucle.
  return res.status(200).json({ ok: true })
}
