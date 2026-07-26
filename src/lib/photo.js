// ============================================================
//  FortyDate — Envoi de photo
//
//  Objectif : qu'une photo passe AUSSI sur un téléphone modeste.
//  1) Décodage économe : createImageBitmap au lieu de readAsDataURL
//     (plus de chaîne base64, plus de bitmap plein format en mémoire)
//  2) Si la mémoire manque, on RÉESSAIE plus petit : 1080 -> 720 -> 480
//  3) Chaque échec porte un `code` que l'écran traduit en conseil concret
//  4) Nom de fichier = empreinte du contenu : la même image ne part jamais deux fois
//
//  Placement : src/lib/photo.js
// ============================================================
import { supabase } from './supabase'

// Tailles tentées dans l'ordre. On n'abandonne qu'après la dernière.
const TAILLES = [1080, 720, 480]
const QUALITE = 0.8

// Erreur portant un code exploitable par l'interface
function erreurPhoto(code, message) {
  const e = new Error(message || code)
  e.code = code
  return e
}

// Conseil à afficher au membre. À utiliser depuis les écrans qui appellent
// uploadPhotoOptimisee, à la place d'un « Réessaie dans un instant » —
// sur la plupart de ces causes, le second essai échoue à l'identique.
export function conseilPhoto(err) {
  switch (err?.code) {
    case 'FORMAT_HEIC':
      return "Cette photo est au format iPhone (HEIC), que le navigateur ne sait pas ouvrir. Le plus simple : fais une capture d'écran de ta photo, puis envoie la capture."
    case 'MEMOIRE':
      return "Ton téléphone manque de mémoire pour une photo de cette taille. Le plus simple : fais une capture d'écran de ta photo, puis envoie la capture."
    case 'IMAGE_ILLISIBLE':
      return "Ce fichier n'a pas pu être ouvert comme une image. Choisis une photo depuis ta galerie, ou fais-en une capture d'écran."
    case 'RESEAU':
      return "L'envoi n'a pas abouti. Vérifie ta connexion, puis réessaie."
    default:
      return "L'envoi de la photo a échoué. Fais une capture d'écran de ta photo et envoie la capture."
  }
}

// Le fichier ressemble-t-il à une photo iPhone ? (le type MIME est souvent vide)
function estHeic(file) {
  const t = (file?.type || '').toLowerCase()
  const n = (file?.name || '').toLowerCase()
  return t.includes('heic') || t.includes('heif') || /\.(heic|heif)$/.test(n)
}

// Décode sans jamais passer par une chaîne base64.
// Renvoie un ImageBitmap, ou une Image en secours sur les navigateurs anciens.
async function decoder(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch (_) {
      // On retombe sur le chemin ci-dessous : certains navigateurs refusent
      // createImageBitmap sur un Blob sans pour autant être incapables du reste.
    }
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')) }
    img.src = url
  })
}

// Dessine à la taille demandée et ré-encode en JPEG.
// Renvoie null si la mémoire manque — c'est le signal pour réessayer plus petit.
async function versJpeg(source, max) {
  let w = source.width, h = source.height
  if (!w || !h) return null
  if (w > max || h > max) {
    if (w >= h) { h = Math.round(h * max / w); w = max }
    else { w = Math.round(w * max / h); h = max }
  }
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) { canvas.width = 0; canvas.height = 0; return null }
  try {
    ctx.drawImage(source, 0, 0, w, h)
  } catch (_) {
    canvas.width = 0; canvas.height = 0
    return null
  }
  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', QUALITE))
  // Libérer tout de suite : sans ça, le canvas du premier essai occupe
  // encore la mémoire pendant le second, et le second échoue aussi.
  canvas.width = 0; canvas.height = 0
  return blob || null
}

// Décode puis compresse, en réduisant la cible tant que la mémoire manque.
async function compresser(file) {
  let source
  try {
    source = await decoder(file)
  } catch (_) {
    throw estHeic(file)
      ? erreurPhoto('FORMAT_HEIC', 'format HEIC non décodable')
      : erreurPhoto('IMAGE_ILLISIBLE', 'fichier non décodable')
  }
  try {
    for (const max of TAILLES) {
      const blob = await versJpeg(source, max)
      if (blob) return blob
    }
  } finally {
    if (typeof source.close === 'function') source.close() // ImageBitmap
  }
  throw erreurPhoto('MEMOIRE', 'mémoire insuffisante même en 480 px')
}

// Empreinte SHA-256 du contenu -> nom de fichier unique par image.
// crypto.subtle n'existe pas hors HTTPS : on retombe alors sur un nom horodaté.
async function empreinte(blob) {
  try {
    const buffer = await blob.arrayBuffer()
    const digest = await crypto.subtle.digest('SHA-256', buffer)
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
  } catch (_) {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  }
}

// Uploade la photo optimisée et renvoie son URL publique.
// Si une image au contenu identique existe déjà, on la réutilise sans la renvoyer.
export async function uploadPhotoOptimisee(file, userId) {
  const blob = await compresser(file)
  const hash = await empreinte(blob)
  const nom = `${userId}/${hash}.jpg`

  // upsert:false => un fichier déjà présent (même contenu) renvoie une erreur
  // « already exists » qu'on ignore volontairement : l'image est déjà là.
  const { error } = await supabase.storage.from('avatars')
    .upload(nom, blob, { upsert: false, contentType: 'image/jpeg' })

  if (error && !/exists|duplicate|already/i.test(error.message || '')) {
    throw erreurPhoto('RESEAU', error.message || 'envoi refusé')
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(nom)
  return data.publicUrl
}
