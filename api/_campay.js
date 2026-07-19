// api/_campay.js — utilitaires CamPay partagés (le préfixe _ = pas une route)
const BASE = process.env.CAMPAY_BASE || 'https://www.campay.net'

// Récupère le statut réel d'une transaction directement chez CamPay
export async function campayStatus(reference) {
  const r = await fetch(`${BASE}/api/transaction/${reference}/`, {
    headers: { Authorization: 'Token ' + process.env.CAMPAY_TOKEN }
  })
  return r.json()
}

// Active l'abonnement dans Supabase (via la fonction activer_abonnement, clé service_role).
// Idempotent : la contrainte unique (source, reference) empêche toute double activation.
export async function activerAbonnement(t) {
  const url = process.env.SUPABASE_URL + '/rest/v1/rpc/activer_abonnement'
  await fetch(url, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE,
      Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_user_id: t.external_reference,
      p_source: 'campay',
      p_montant: Number(t.amount) || 0,
      p_devise: t.currency || 'XAF',
      p_reference: t.reference,
      p_mois: 1
    })
  })
}
