// api/chariow-webhook.js — Pulse Chariow « Vente réussie » : active l'abonnement.
//
// Lecture TOLÉRANTE : on ne filtre pas par nom d'événement, on active dès que
// le statut n'est pas un échec, et on lit custom_metadata où qu'il soit.
//
// Durci le 29/07/2026. Avant, la réponse de Supabase n'était NI LUE NI TESTÉE :
// le webhook répondait « ok » même quand l'activation échouait, Chariow
// considérait la livraison réussie et ne réessayait jamais. Un membre pouvait
// payer sans être activé, et rien nulle part ne disait pourquoi.
//
// Trois règles suivies ici :
//   1. Toute réponse de Supabase est lue et testée.
//   2. On ne répond 500 (= « réessaie ») QUE sur un échec réellement
//      réessayable. C'est sans danger parce que la contrainte
//      UNIQUE (source, reference) sur `paiements` rend l'activation
//      idempotente : une seconde livraison ne prolonge pas deux fois.
//   3. La boutique Chariow est PARTAGÉE avec MaBoutik, KamerLove et
//      IvoireLove. Une vente qui ne concerne pas FortyDate doit repartir
//      en 200 — sinon Chariow réessaierait en boucle et pour toujours
//      sur une vente d'une autre application.
const SR = process.env.SUPABASE_SERVICE_ROLE
const SUPA = process.env.SUPABASE_URL

// Lecture tolérante d'un champ imbriqué
function pick(obj, ...chemins) {
  for (const ch of chemins) {
    let v = obj
    for (const p of ch.split('.')) { v = v?.[p]; if (v == null) break }
    if (v != null) return v
  }
  return undefined
}

// Journal des passages. Table `campay_journal`, réutilisée telle quelle :
// elle a déjà les bonnes colonnes. Attention, elle nomme sa colonne `user_id`
// alors que `paiements` utilise `profile_id`. Pas de colonne `etape` ici,
// donc l'étape est encodée dans `statut` (CHARIOW_*).
async function journal(ligne) {
  try {
    const r = await fetch(SUPA + '/rest/v1/campay_journal', {
      method: 'POST',
      headers: {
        apikey: SR, Authorization: 'Bearer ' + SR,
        'Content-Type': 'application/json', Prefer: 'return=minimal'
      },
      body: JSON.stringify(ligne)
    })
    if (!r.ok) console.error('journal refuse', r.status, await r.text())
  } catch (e) {
    // Un journal qui échoue ne doit jamais empêcher l'activation d'un paiement.
    console.error('journal', String(e && e.message ? e.message : e))
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true, ignored: 'non-POST' })

  let reference = null
  try {
    const body = req.body || {}
    // Chariow range la vente sous "sale", ou "data", ou à la racine
    const sale = body.sale || body.data || body

    // On n'écarte QUE les vrais échecs / remboursements / en attente
    const statut = String(pick(sale, 'status', 'payment.status') || '').toLowerCase()
    if (['failed', 'refunded', 'refund', 'pending', 'cancel', 'abandon', 'chargeback'].some(s => statut.includes(s))) {
      return res.status(200).json({ ignore: true, raison: 'statut ' + statut })
    }

    // Les métadonnées reviennent dans sale.custom_metadata (ou à la racine)
    const meta = pick(sale, 'custom_metadata') || pick(body, 'custom_metadata') || {}
    const user_id = meta.user_id
    const jours = parseInt(meta.jours, 10) || 30

    const saleId = pick(sale, 'id') || pick(sale, 'transaction_id') || Date.now()
    reference = 'chariow_' + saleId
    const montant = Number(pick(sale, 'amount.value') ?? pick(sale, 'amount') ?? 0) || 0
    const devise = pick(sale, 'amount.currency') || pick(sale, 'currency') || 'XAF'

    // Sans identifiant de membre, il n'y a rien à activer. Ce n'est pas une
    // erreur : c'est très probablement une vente d'une autre application.
    if (!user_id) {
      return res.status(200).json({ ignore: true, raison: 'sans user_id' })
    }

    // ---- Garde-fou boutique partagée -------------------------------------
    // Ce membre existe-t-il dans FortyDate ? Si non, la vente appartient à
    // une autre application : on l'ignore proprement, en 200. Sans ce
    // contrôle, l'activation lèverait une violation de clé étrangère, on
    // répondrait 500, et Chariow réessaierait indéfiniment.
    const rp = await fetch(
      `${SUPA}/rest/v1/profiles?id=eq.${encodeURIComponent(user_id)}&select=id`,
      { headers: { apikey: SR, Authorization: 'Bearer ' + SR } }
    )
    const profils = rp.ok ? await rp.json().catch(() => []) : []
    if (!rp.ok) {
      await journal({
        reference, statut: 'CHARIOW_LECTURE_PROFIL', user_id, montant, jours,
        ok: false, erreur: 'lecture profils ' + rp.status, brut: body
      })
      return res.status(500).json({ ok: false, erreur: 'base injoignable' })
    }
    if (!Array.isArray(profils) || profils.length === 0) {
      // 200 volontairement : réessayer ne changerait rien, et la trace
      // permettra de retrouver la vente si elle nous concernait vraiment.
      await journal({
        reference, statut: 'CHARIOW_AUTRE_APP', user_id, montant, jours,
        ok: false, erreur: 'membre absent de FortyDate (vente d\'une autre application ?)', brut: body
      })
      return res.status(200).json({ ignore: true, raison: 'membre introuvable' })
    }

    // ---- Activation -------------------------------------------------------
    const r = await fetch(SUPA + '/rest/v1/rpc/activer_abonnement', {
      method: 'POST',
      headers: { apikey: SR, Authorization: 'Bearer ' + SR, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_user_id: user_id,
        p_source: 'chariow',
        p_montant: montant,
        p_devise: devise,
        p_reference: reference,
        p_jours: jours
      })
    })
    const texte = await r.text()

    if (!r.ok) {
      // Un doublon n'est PAS un échec : la contrainte unique fait son travail,
      // la vente était déjà activée. Y répondre 500 ferait boucler Chariow.
      const doublon = /duplicate key|already exists|23505/i.test(texte)
      await journal({
        reference, statut: doublon ? 'CHARIOW_DEJA_ACTIVE' : 'CHARIOW_REFUS',
        user_id, montant, jours, ok: doublon,
        erreur: doublon ? null : 'activer_abonnement ' + r.status + ' : ' + texte.slice(0, 400),
        brut: body
      })
      if (doublon) return res.status(200).json({ ok: true, doublon: true })
      console.error('activer_abonnement refuse', r.status, texte)
      return res.status(500).json({ ok: false, erreur: 'activation refusee' })
    }

    await journal({
      reference, statut: 'CHARIOW_OK', user_id, montant, jours, ok: true, brut: body
    })
    return res.status(200).json({ ok: true, active: true })

  } catch (e) {
    const message = String(e && e.message ? e.message : e)
    await journal({ reference, statut: 'CHARIOW_ERREUR', ok: false, erreur: message.slice(0, 400) })
    console.error('chariow-webhook', message)
    // 500 : une panne passagère mérite une nouvelle tentative de Chariow.
    return res.status(500).json({ ok: false, erreur: message })
  }
}
