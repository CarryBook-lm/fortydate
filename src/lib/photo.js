// ============================================================
//  FortyDate — Upload photo optimisé
//  1) Compresse / redimensionne l'image (max 1080px, JPEG ~80%)
//     -> une photo de 3 Mo tombe à ~300 Ko (stockage ET bande passante divisés par 5 à 10)
//  2) Nomme le fichier d'après une empreinte (hash) de son contenu
//     -> la MÊME image ne se ré-uploade jamais deux fois = économie
//
//  Placement : src/lib/photo.js
// ============================================================
import { supabase } from './supabase'

// Redimensionne sur le plus grand côté et ré-encode en JPEG compressé
function compresser(file, max = 1080, qualite = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const lecteur = new FileReader()
    lecteur.onload = () => { img.src = lecteur.result }
    lecteur.onerror = () => reject(new Error('lecture'))
    img.onload = () => {
      let w = img.width, h = img.height
      if (w > max || h > max) {
        if (w >= h) { h = Math.round(h * max / w); w = max }
        else { w = Math.round(w * max / h); h = max }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('compression')),
        'image/jpeg', qualite
      )
    }
    img.onerror = () => reject(new Error('image'))
    lecteur.readAsDataURL(file)
  })
}

// Empreinte SHA-256 du contenu -> chaîne hexadécimale (nom de fichier unique par image)
async function empreinte(blob) {
  const buffer = await blob.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Uploade la photo optimisée et renvoie son URL publique.
// Si une image au contenu identique existe déjà, on ne la ré-uploade pas : on réutilise.
export async function uploadPhotoOptimisee(file, userId) {
  const blob = await compresser(file)
  const hash = await empreinte(blob)
  const nom = `${userId}/${hash}.jpg`

  // upsert:false => si le fichier existe déjà (même contenu), Supabase renvoie une erreur
  // "already exists" qu'on ignore volontairement : l'image est déjà là, on la réutilise.
  const { error } = await supabase.storage.from('avatars')
    .upload(nom, blob, { upsert: false, contentType: 'image/jpeg' })

  if (error && !/exists|duplicate|already/i.test(error.message || '')) {
    throw error
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(nom)
  return data.publicUrl
}

// ------------------------------------------------------------
// Renvoie une version MINIATURE de l'image, redimensionnée à la volée
// par le CDN d'images de Supabase. Utilisée dans les listes/cartes de
// profils : on télécharge une petite image au lieu de la grande
// -> grosse économie de bande passante.
// Largeur 0 ou URL non-Supabase => on renvoie l'original tel quel.
// ------------------------------------------------------------
export function miniature(url, largeur = 400) {
  if (!url || !largeur || typeof url !== 'string') return url
  if (!url.includes('/storage/v1/object/public/')) return url
  const rendu = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
  const sep = rendu.includes('?') ? '&' : '?'
  return `${rendu}${sep}width=${largeur}&quality=62&resize=cover`
}
