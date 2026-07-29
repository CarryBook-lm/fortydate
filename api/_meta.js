// api/_meta.js — envoi d'événements vers l'API Conversions de Meta.
//
// Pourquoi côté serveur et pas seulement dans le navigateur : le pixel seul
// perd beaucoup de conversions (bloqueurs de publicité, protections iPhone,
// et surtout l'application fermée juste après le paiement — cas très
// fréquent en Mobile Money). Le serveur, lui, voit toujours passer la vente.
//
// Meta exige que les données personnelles soient HACHÉES en SHA-256 avant
// l'envoi : ni l'e-mail ni le numéro ne quittent le serveur en clair.
//
// Variables d'environnement : META_PIXEL_ID, META_CAPI_TOKEN.
// Si l'une manque, la fonction ne fait rien et le dit dans les logs — elle
// ne doit JAMAIS faire échouer l'appelant.
import { createHash } from 'crypto'

const PIXEL = process.env.META_PIXEL_ID
const TOKEN = process.env.META_CAPI_TOKEN
const TEST = process.env.META_TEST_CODE || null   // à ne définir QUE pendant un test

function hacher(valeur) {
  if (!valeur) return undefined
  const propre = String(valeur).trim().toLowerCase()
  if (!propre) return undefined
  return createHash('sha256').update(propre).digest('hex')
}

// Meta veut un numéro au format international, chiffres seuls, sans + ni 00.
// FortyDate est multi-pays : on ne force donc AUCUN indicatif. On se contente
// de nettoyer, et d'ajouter celui du profil quand le numéro est manifestement
// local (moins de 10 chiffres) et qu'on connaît son pays.
const INDICATIF_PAYS = {
  CM: '237', CI: '225', SN: '221', BJ: '229', BF: '226', ML: '223', TG: '228',
  NE: '227', GA: '241', CG: '242', CD: '243', GN: '224', TD: '235', CF: '236',
  MA: '212', DZ: '213', TN: '216', FR: '33', BE: '32', CH: '41', CA: '1',
  US: '1', GB: '44', DE: '49', IT: '39', ES: '34', PT: '351',
}

function normaliserTelephone(brut, pays) {
  if (!brut) return undefined
  let n = String(brut).replace(/[^0-9]/g, '')
  if (n.startsWith('00')) n = n.slice(2)
  if (!n) return undefined
  const ind = INDICATIF_PAYS[String(pays || '').toUpperCase()]
  if (ind && n.length < 10 && !n.startsWith(ind)) n = ind + n
  return n
}

/**
 * Envoie un événement à Meta.
 *
 * @param {string} nom      Nom de l'événement (Subscribe, Purchase…)
 * @param {string} eventId  Identifiant STABLE. Si le navigateur envoie le même,
 *                          Meta reconnaît le doublon et ne compte qu'une fois.
 * @param {string} userId   Identifiant interne du membre (external_id)
 * @param {string} email    E-mail en clair — il sera haché ici
 * @param {string} telephone Numéro en clair — il sera normalisé puis haché
 * @param {string} pays     Code pays ISO du membre, pour l'indicatif
 * @param {number} valeur   Montant
 * @param {string} devise   Devise (XAF…)
 * @param {string} url      Page d'origine
 * @param {object} extra    Données libres ajoutées à custom_data
 */
export async function envoyerMeta({
  nom, eventId, userId, email, telephone, pays,
  valeur, devise, url, extra
} = {}) {
  if (!PIXEL || !TOKEN) {
    console.warn('Meta : META_PIXEL_ID ou META_CAPI_TOKEN absente, envoi ignore')
    return { ok: false, raison: 'configuration absente' }
  }

  const user_data = {}
  const em = hacher(email);                                if (em) user_data.em = [em]
  const ph = hacher(normaliserTelephone(telephone, pays)); if (ph) user_data.ph = [ph]
  const ex = hacher(userId);                               if (ex) user_data.external_id = [ex]

  const evenement = {
    event_name: nom,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: 'website',
    event_source_url: url || 'https://fortydate.com/',
    user_data,
    custom_data: {
      ...(valeur != null ? { value: Number(valeur) || 0 } : {}),
      ...(devise ? { currency: devise } : {}),
      ...(extra || {})
    }
  }

  const corps = { data: [evenement] }
  // Tant que META_TEST_CODE est définie, les envois n'alimentent PAS les vraies
  // statistiques : ils n'apparaissent que dans « Évènements de test ».
  // À retirer de Vercel dès la validation faite, sinon aucune conversion réelle
  // n'est comptée et les campagnes tournent à l'aveugle.
  if (TEST) corps.test_event_code = TEST

  const r = await fetch(
    `https://graph.facebook.com/v21.0/${PIXEL}/events?access_token=${encodeURIComponent(TOKEN)}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) }
  )
  const texte = await r.text()
  if (!r.ok) {
    console.error('Meta ' + nom + ' refuse', r.status, texte.slice(0, 400))
    return { ok: false, statut: r.status, reponse: texte.slice(0, 400) }
  }
  return { ok: true, reponse: texte.slice(0, 200) }
}
