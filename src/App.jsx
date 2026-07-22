import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Landing from './pages/Landing'
import Inscription from './pages/Inscription'
import Connexion from './pages/Connexion'
import Accueil from './pages/Accueil'

/* ---------- Bannière d'installation PWA ---------- */
function BanniereInstall() {
  const [prompt, setPrompt] = useState(null)   // événement d'install Chrome/Android
  const [visible, setVisible] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    // déjà installée ? on ne montre rien
    const installee = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    if (installee) return

    // iPhone / iPad : pas d'événement auto -> on affiche une aide manuelle
    const estIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    if (estIos) { setIos(true); setVisible(true) }

    // Chrome / Android : on capte l'événement et on l'affiche
    const onPrompt = (e) => { e.preventDefault(); setPrompt(e); setVisible(true) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    const onInstalled = () => setVisible(false)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function installer() {
    if (!prompt) return
    prompt.prompt()
    const res = await prompt.userChoice
    if (res.outcome === 'accepted') setVisible(false)
  }

  if (!visible) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      background: 'linear-gradient(135deg,#4A1546,#7A1E52)', color: '#fff',
      display: 'flex', alignItems: 'center', gap: '.7rem', padding: '.6rem .9rem',
      fontFamily: "system-ui, 'Segoe UI', sans-serif", boxShadow: '0 4px 16px -6px rgba(0,0,0,.4)'
    }}>
      <span style={{ fontSize: '1.4rem' }}>💜</span>
      <div style={{ flex: 1, lineHeight: 1.25 }}>
        <div style={{ fontWeight: 800, fontSize: '.92rem' }}>Installe FortyDate</div>
        <div style={{ fontSize: '.78rem', opacity: .85 }}>
          {ios ? "Appuie sur Partager puis « Sur l'écran d'accueil »" : "Accède à l'appli en un tap, sur ton écran d'accueil."}
        </div>
      </div>
      {!ios && (
        <button onClick={installer} style={{
          background: '#D62A5E', color: '#fff', border: 0, borderRadius: '99px',
          padding: '.5rem 1.1rem', fontWeight: 800, cursor: 'pointer', flex: '0 0 auto'
        }}>Installer</button>
      )}
      <button onClick={() => setVisible(false)} aria-label="Fermer" style={{
        background: 'none', border: 0, color: 'rgba(255,255,255,.7)', fontSize: '1.1rem', cursor: 'pointer', flex: '0 0 auto'
      }}>✕</button>
    </div>
  )
}

/* ---------- Capture de l'événement d'installation Android ----------
   Chrome ne le déclenche qu'UNE FOIS, très tôt au chargement. On l'attrape
   ici, au niveau du module, pour qu'il ne soit jamais manqué par un
   composant monté plus tard. */
let promptInstall = null
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); promptInstall = e })
  window.addEventListener('appinstalled', () => { promptInstall = null })
}

/* ---------- Rappel d'installation (pop-up au centre de l'écran) ----------
   Réglages : change ces 3 valeurs pour ajuster la fréquence.            */
const DELAI_1RE_FOIS = 2 * 60 * 1000        // 1re apparition après 2 minutes d'utilisation
const PAUSE_APRES_REFUS = 24 * 60 * 60 * 1000 // on repropose 24 h après une fermeture
const MAX_REFUS = 3                          // au-delà, on n'insiste plus (le menu ☰ reste dispo)

function PopupInstall() {
  const [prompt, setPrompt] = useState(null)
  const [visible, setVisible] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Déjà installée -> jamais de rappel
    const installee = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    if (installee) return
    let lu = {}
    try { lu = JSON.parse(localStorage.getItem('fd_install') || '{}') } catch (_) { lu = {} }
    if (lu.installe) return
    if ((lu.refus || 0) >= MAX_REFUS) return

    setIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent))

    const onPrompt = (e) => { e.preventDefault(); promptInstall = e; setPrompt(e) }
    const onInstalled = () => {
      try { localStorage.setItem('fd_install', JSON.stringify({ installe: true })) } catch (_) {}
      setVisible(false)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)

    // Délai avant affichage : 2 min la 1re fois, sinon 24 h après le dernier refus
    const attente = lu.dernier ? Math.max(0, lu.dernier + PAUSE_APRES_REFUS - Date.now()) : DELAI_1RE_FOIS
    const t = setTimeout(() => { setPrompt(promptInstall); setVisible(true) }, attente)

    return () => {
      clearTimeout(t)
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function fermer() {
    let lu = {}
    try { lu = JSON.parse(localStorage.getItem('fd_install') || '{}') } catch (_) {}
    try {
      localStorage.setItem('fd_install', JSON.stringify({
        ...lu, refus: (lu.refus || 0) + 1, dernier: Date.now(),
      }))
    } catch (_) {}
    setVisible(false)
  }

  async function installer() {
    if (!prompt) return
    prompt.prompt()
    const res = await prompt.userChoice
    promptInstall = null   // un événement ne peut servir qu'une fois
    setPrompt(null)
    if (res.outcome === 'accepted') {
      try { localStorage.setItem('fd_install', JSON.stringify({ installe: true })) } catch (_) {}
      setVisible(false)
    } else { fermer() }
  }

  if (!visible) return null

  // Android avec l'événement -> installation directe. Sinon (iPhone, ou événement
  // indisponible) -> on explique la manipulation.
  const directe = !ios && !!prompt

  return (
    <div onClick={fermer} style={{
      position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(36,10,42,.6)',
      display: 'grid', placeItems: 'center', padding: '1.2rem',
      fontFamily: "system-ui, 'Segoe UI', sans-serif",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 360, background: '#FBF4F5', borderRadius: 20,
        padding: '1.6rem 1.3rem 1.3rem', position: 'relative', textAlign: 'center',
        boxShadow: '0 24px 60px -20px rgba(0,0,0,.6)', color: '#3A0F38',
      }}>
        <button onClick={fermer} aria-label="Fermer" style={{
          position: 'absolute', top: 8, right: 10, background: 'none', border: 0,
          fontSize: '1.3rem', color: '#9a8b92', cursor: 'pointer', lineHeight: 1,
        }}>✕</button>

        <div style={{ fontSize: '2.6rem', lineHeight: 1 }}>📲</div>
        <h2 style={{ fontSize: '1.25rem', margin: '.6rem 0 .3rem' }}>Installe FortyDate</h2>
        <p style={{ fontSize: '.9rem', color: '#7A6B74', margin: '0 0 1rem', lineHeight: 1.45 }}>
          {directe
            ? "Ouvre l'appli en un tap depuis ton écran d'accueil, et reçois tes notifications même appli fermée."
            : ios
              ? "Sur iPhone, l'installation est indispensable pour recevoir les notifications."
              : "Ajoute FortyDate à ton écran d'accueil pour l'ouvrir comme une vraie application."}
        </p>

        {!directe && (
          <div style={{
            background: '#F3E7EA', borderRadius: 12, padding: '.85rem .9rem',
            fontSize: '.86rem', textAlign: 'left', lineHeight: 1.6, marginBottom: '1rem',
          }}>
            {ios ? (
              <>1. Appuie sur <b>Partager ⬆️</b> en bas de Safari<br />
                 2. Choisis <b>« Sur l'écran d'accueil »</b><br />
                 3. Appuie sur <b>Ajouter</b></>
            ) : (
              <>1. Ouvre le menu <b>⋮</b> de Chrome (en haut à droite)<br />
                 2. Choisis <b>« Ajouter à l'écran d'accueil »</b><br />
                 3. Confirme avec <b>Installer</b></>
            )}
          </div>
        )}

        {directe && (
          <button onClick={installer} style={{
            width: '100%', background: '#D62A5E', color: '#fff', border: 0, borderRadius: 12,
            padding: '.85rem', fontSize: '1rem', fontWeight: 800, cursor: 'pointer',
          }}>Installer maintenant</button>
        )}

        <button onClick={fermer} style={{
          width: '100%', background: 'none', border: 0, color: '#7A6B74',
          fontSize: '.85rem', fontWeight: 700, cursor: 'pointer', padding: '.7rem 0 0',
        }}>Plus tard</button>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  // Page publique affichée quand personne n'est connecté : 'landing' | 'connexion' | 'inscription'
  const [page, setPage] = useState('landing')

  useEffect(() => {
    // enregistre le service worker (nécessaire pour l'installation)
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {})
      })
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  let contenu
  if (checking) {
    contenu = (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center',
        background: '#4A1546', color: '#fff', fontFamily: 'system-ui' }}>Chargement…</div>
    )
  }
  // Pendant l'inscription, on reste sur l'inscription même si le compte vient
  // d'être créé (écrans 4-6), jusqu'à « Terminer ». (Vérifié AVANT session.)
  else if (page === 'inscription') {
    contenu = <Inscription onComplete={() => setPage('accueil')} />
  }
  // Connecté -> l'application
  else if (session) {
    contenu = (
      <Accueil onDeconnexion={async () => {
        await supabase.auth.signOut()   // -> session repasse à null (listener)
        setPage('landing')              // -> retour à la page d'accueil publique
      }} />
    )
  }
  // Non connecté -> connexion
  else if (page === 'connexion') {
    contenu = (
      <Connexion
        onConnecte={() => { /* la session est gérée par le listener -> Accueil */ }}
        onVersInscription={() => setPage('inscription')}
      />
    )
  }
  // Non connecté -> page d'accueil publique (landing)
  else {
    contenu = (
      <Landing
        onInscription={() => setPage('inscription')}
        onConnexion={() => setPage('connexion')}
      />
    )
  }

  return (
    <>
      <BanniereInstall />
      {session && page !== 'inscription' && <PopupInstall />}
      {contenu}
    </>
  )
}
