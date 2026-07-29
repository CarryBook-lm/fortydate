// api/supprimer-compte.js — le membre supprime lui-même son compte.
//
// Action IRRÉVERSIBLE, donc trois précautions :
//  1. Le jeton de connexion est vérifié auprès de Supabase, et on ne
//     supprime QUE le compte de ce jeton. Personne ne peut supprimer
//     celui d'un autre, même en modifiant la requête.
//  2. Les photos partent aussi : le membre a le droit qu'il ne reste
//     rien de lui, pas seulement sa fiche.
//  3. Le compte d'authentification est supprimé en DERNIER. S'il
//     partait en premier et que la suite échouait, il resterait un
//     profil orphelin que plus personne ne pourrait effacer.
//
// Vérifié le 29/07 : toutes les tables liées sont en ON DELETE CASCADE
// (likes, messages, visites, affinites, signalements, paiements, annonces,
// annonces_vues, push_subscriptions). Seule `evenements.user_id` est en
// SET NULL — volontaire : les mesures survivent, mais anonymes.
const SUPA = process.env.SUPABASE_URL
const SR = process.env.SUPABASE_SERVICE_ROLE

async function viderDossier(bucket, prefixe) {
  try {
    // Lister puis supprimer : l'API de stockage n'efface pas un dossier.
    const r = await fetch(`${SUPA}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: { apikey: SR, Authorization: 'Bearer ' + SR, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: prefixe, limit: 100 })
    })
    if (!r.ok) return
    const fichiers = await r.json()
    if (!Array.isArray(fichiers) || fichiers.length === 0) return
    const chemins = fichiers.map(f => `${prefixe}/${f.name}`)
    await fetch(`${SUPA}/storage/v1/object/${bucket}`, {
      method: 'DELETE',
      headers: { apikey: SR, Authorization: 'Bearer ' + SR, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: chemins })
    })
  } catch (e) {
    // Une photo qui reste ne doit pas empêcher la suppression du compte.
    console.warn('vidage ' + bucket + ' :', String(e && e.message ? e.message : e))
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  try {
    if (!SUPA || !SR) {
      return res.status(500).json({ ok: false, erreur: 'configuration serveur incomplete' })
    }

    // 1) Qui demande, réellement ? On ne fait AUCUNE confiance à ce que le
    //    navigateur annonce : seule l'identité portée par le jeton compte.
    const jeton = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!jeton) return res.status(401).json({ ok: false, erreur: 'non connecte' })

    const ru = await fetch(SUPA + '/auth/v1/user', {
      headers: { apikey: SR, Authorization: 'Bearer ' + jeton }
    })
    if (!ru.ok) return res.status(401).json({ ok: false, erreur: 'session expiree' })
    const membre = await ru.json()
    const userId = membre && membre.id
    if (!userId) return res.status(401).json({ ok: false, erreur: 'session expiree' })

    // 2) Les photos de profil et le selfie de vérification.
    //    Sur FortyDate le bucket privé s'appelle `verifications`.
    await viderDossier('avatars', userId)
    await viderDossier('verifications', userId)

    // 3) Le profil — emporte le reste en cascade
    const rp = await fetch(`${SUPA}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'DELETE',
      headers: { apikey: SR, Authorization: 'Bearer ' + SR, Prefer: 'return=minimal' }
    })
    if (!rp.ok) {
      const texte = await rp.text()
      console.error('suppression profil refusee', rp.status, texte)
      return res.status(500).json({ ok: false, erreur: 'suppression impossible' })
    }

    // 4) Le compte d'authentification, en dernier
    const ra = await fetch(`${SUPA}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { apikey: SR, Authorization: 'Bearer ' + SR }
    })
    if (!ra.ok) {
      console.error('suppression auth refusee', ra.status, await ra.text())
      // Le profil est parti, donc le membre a disparu de l'application.
      // On ne renvoie pas d'erreur : il ne doit pas rester bloqué sur un
      // écran d'échec pour un résidu invisible côté authentification.
      return res.status(200).json({ ok: true, partiel: true })
    }

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('supprimer-compte', String(e && e.message ? e.message : e))
    return res.status(500).json({ ok: false, erreur: 'erreur serveur' })
  }
}
