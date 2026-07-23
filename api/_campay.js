// api/_campay.js — utilitaires CamPay partagés (le préfixe _ = pas une route)
const BASE = process.env.CAMPAY_BASE || 'https://www.campay.net'

// Statut réel d'une transaction chez CamPay
export async function campayStatus(reference) {
  const r = await fetch(`${BASE}/api/transaction/${reference}/`, {
    headers: { Authorization: 'Token ' + process.env.CAMPAY_TOKEN }
  })
  return r.json()
}

// Lit l'identifiant du membre et la durée depuis la référence externe.
// Nouveau format = "FD_<user_id>_<jours>_<timestamp>"   ancien = "user_id:jours"
export function lireReference(externalReference) {
  const ref = String(externalReference || '')
  let userId, joursStr
  if (ref.startsWith('FD_')) {
    const parts = ref.split('_')
    userId = parts[1]
    joursStr = parts[2]
  } else {
    ;[userId, joursStr] = ref.split(':')
  }
  return { userId: userId || null, jours: parseInt(joursStr, 10) || 30 }
}

// Écrit une ligne dans campay_journal (pour pouvoir diagnostiquer après coup)
export async function journaliser(ligne) {
  try {
    await fetch(process.env.SUPABASE_URL + '/rest/v1/campay_journal', {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE,
        Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(ligne)
    })
  } catch (_) { /* le journal ne doit jamais bloquer l'activation */ }
}

// Active l'abonnement dans Supabase.
// Idempotent : la contrainte unique (source, reference) empêche toute double activation.
// Renvoie { ok, erreur } au lieu d'échouer en silence.
export async function activerAbonnement(t) {
  const { userId, jours } = lireReference(t.external_reference)
  if (!userId) return { ok: false, erreur: 'reference illisible : ' + t.external_reference, userId: null, jours }

  try {
    const r = await fetch(process.env.SUPABASE_URL + '/rest/v1/rpc/activer_abonnement', {
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

    if (!r.ok) {
      const texte = await r.text()
      // Un doublon n'est pas une erreur : le paiement était déjà activé.
      if (/duplicate key|unique/i.test(texte)) return { ok: true, erreur: null, userId, jours, doublon: true }
      return { ok: false, erreur: `RPC ${r.status} : ${texte.slice(0, 300)}`, userId, jours }
    }
    return { ok: true, erreur: null, userId, jours }
  } catch (e) {
    return { ok: false, erreur: 'appel Supabase impossible : ' + (e && e.message), userId, jours }
  }
}
