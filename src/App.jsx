import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
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

export default function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const [flow, setFlow] = useState('auto')

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
  if (checking)
    contenu = (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center',
        background: '#4A1546', color: '#fff', fontFamily: 'system-ui' }}>Chargement…</div>
    )
  else if (flow === 'inscription')
    contenu = <Inscription onComplete={() => setFlow('auto')} />
  else if (session)
    contenu = <Accueil onDeconnexion={() => supabase.auth.signOut()} />
  else
    contenu = (
      <Connexion
        onConnecte={() => {}}
        onVersInscription={() => setFlow('inscription')}
      />
    )

  return (
    <>
      <BanniereInstall />
      {contenu}
    </>
  )
}
