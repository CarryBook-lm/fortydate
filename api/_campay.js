// api/_campay.js — utilitaires CamPay partagés (le préfixe _ = pas une route)
const BASE = process.env.CAMPAY_BASE || 'https://www.campay.net'

// Statut réel d'une transaction chez CamPay
export async function campayStatus(reference) {
  const r = await fetch(`${BASE}/api/transaction/${reference}/`, {
    headers: { Authorization: 'Token ' + process.env.CAMPAY_TOKEN }
  })
  return r.json()
}

// Active l'abonnement dans Supabase.
// external_reference nouveau format = "FD_<user_id>_<jours>"  (ancien = "user_id:jours")
// Idempotent : la contrainte unique (source, reference) empêche toute double activation.
export async function activerAbonnement(t) {
  const ref = String(t.external_reference || '')
  let userId, joursStr
  if (ref.startsWith('FD_')) {
    const parts = ref.split('_')      // ['FD', user_id, jours, timestamp]
    userId = parts[1]
    joursStr = parts[2]
  } else {
    ;[userId, joursStr] = ref.split(':')   // ancien format, au cas où
  }
  const jours = parseInt(joursStr, 10) || 30
  const url = process.env.SUPABASE_URL + '/rest/v1/rpc/activer_abonnement'
  await fetch(url, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE,
      Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_user_id: userId,
      p_source: 'campay',
      p_montant: Number(t.amount) || 0,
      p_devise: t.currency || 'XAF',
      p_reference: t.reference,
      p_jours: jours
    })
  })
}
