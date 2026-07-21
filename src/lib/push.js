import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

const TIMEOUT = Symbol('timeout')
function withTimeout(promise, ms) {
  return Promise.race([
    Promise.resolve(promise),
    new Promise((resolve) => setTimeout(() => resolve(TIMEOUT), ms))
  ])
}

export async function subscribeToPush(userId) {
  // 1) Support navigateur
  if (!('serviceWorker' in navigator)) return { ok: false, reason: '1/ pas de serviceWorker (navigateur non compatible)' }
  if (!('PushManager' in window)) return { ok: false, reason: '1/ pas de PushManager (navigateur non compatible)' }
  if (!('Notification' in window)) return { ok: false, reason: '1/ pas de Notification (navigateur non compatible)' }

  // 2) Utilisateur connecte
  if (!userId) return { ok: false, reason: '2/ pas connecte (id utilisateur manquant)' }

  // 3) Cle VAPID presente dans le build
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: '3/ cle VAPID absente du build (VITE_VAPID_PUBLIC_KEY)' }

  // 4) Permission notifications
  let permission
  try {
    permission = await Notification.requestPermission()
  } catch (e) {
    return { ok: false, reason: '4/ erreur permission: ' + (e && e.message) }
  }
  if (permission !== 'granted') return { ok: false, reason: '4/ permission = ' + permission + ' (non accordee)' }

  // 5) Service worker : on l'enregistre nous-memes (idempotent) puis on attend qu'il soit actif
  try {
    await navigator.serviceWorker.register('/sw.js')
  } catch (e) {
    return { ok: false, reason: '5a/ echec enregistrement du service worker: ' + (e && e.message) }
  }
  const reg = await withTimeout(navigator.serviceWorker.ready, 20000)
  if (reg === TIMEOUT) return { ok: false, reason: '5/ service worker toujours pas pret (timeout 20s) — recharge la page et reessaie' }

  // 6) Abonnement push (delai max 20s)
  let sub
  try {
    sub = await reg.pushManager.getSubscription()
    if (!sub) {
      const created = await withTimeout(
        reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        }),
        20000
      )
      if (created === TIMEOUT) return { ok: false, reason: '6/ abonnement push bloque (timeout 20s) — service de push injoignable' }
      sub = created
    }
  } catch (e) {
    return { ok: false, reason: '6/ echec abonnement push: ' + (e && (e.name + ' - ' + e.message)) }
  }

  // 7) Enregistrement en base
  try {
    const json = sub.toJSON()
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent
      },
      { onConflict: 'endpoint', ignoreDuplicates: true }
    )
    if (error) return { ok: false, reason: '7/ echec enregistrement base: ' + error.message }
  } catch (e) {
    return { ok: false, reason: '7/ erreur base: ' + (e && e.message) }
  }

  return { ok: true }
}