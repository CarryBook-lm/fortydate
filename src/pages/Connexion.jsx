// ============================================================
//  FortyDate — Connexion
//  Placement : src/pages/Connexion.jsx
// ============================================================
import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Petit œil réutilisable (afficher / masquer le mot de passe)
function ChampMotDePasse({ value, onChange, placeholder = 'Mot de passe' }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="fd-pass">
      <input
        className="fd-in"
        type={visible ? 'text' : 'password'}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
      <button type="button" className="fd-eye" onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
        {visible ? (
          // œil barré
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17.9 17.9A10.5 10.5 0 0 1 12 20C5 20 1 12 1 12a19 19 0 0 1 5.1-5.9M9.9 4.2A10.5 10.5 0 0 1 12 4c7 0 11 8 11 8a19 19 0 0 1-2.2 3.2M1 1l22 22" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          </svg>
        ) : (
          // œil ouvert
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  )
}

export default function Connexion({ onConnecte, onVersInscription }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function seConnecter() {
    setErr('')
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) return setErr('Email invalide.')
    if (!password) return setErr('Entre ton mot de passe.')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (onConnecte) onConnecte()
      else window.location.href = '/'
    } catch (e) {
      setErr(traduireErreur(e))
    } finally {
      setLoading(false)
    }
  }

  async function motDePasseOublie() {
    setErr('')
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email))
      return setErr('Entre d’abord ton email, puis reclique sur « Mot de passe oublié ».')
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      setErr('Un email de réinitialisation vient de t’être envoyé.')
    } catch (e) {
      setErr(traduireErreur(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fd-inscription">
      <Style />
      <div className="fd-card">
        <div className="fd-brand"><span className="fd-f">Forty</span><span className="fd-d">Date</span></div>
        <h2 className="fd-titre">Content de te revoir</h2>
        <p className="fd-sous">Connecte-toi pour retrouver tes rencontres.</p>

        <label className="fd-l">Email</label>
        <input className="fd-in" type="email" value={email}
          placeholder="ton@email.com" onChange={e => setEmail(e.target.value)} />

        <label className="fd-l">Mot de passe</label>
        <ChampMotDePasse value={password} onChange={setPassword} />

        <button type="button" className="fd-lien" onClick={motDePasseOublie} disabled={loading}>
          Mot de passe oublié ?
        </button>

        {err ? <div className="fd-err">{String(err)}</div> : null}

        <button className="fd-btn" onClick={seConnecter} disabled={loading} style={{ width: '100%', marginTop: '1.2rem' }}>
          {loading ? '…' : 'Se connecter'}
        </button>

        <p className="fd-bas">
          Pas encore de compte ?{' '}
          <button type="button" className="fd-lien inline"
            onClick={() => onVersInscription && onVersInscription()}>
            Créer mon compte
          </button>
        </p>
      </div>
    </div>
  )
}

function traduireErreur(e) {
  const m = (e?.message || (typeof e === 'string' ? e : '') || '').toString().toLowerCase()
  if (m.includes('invalid login credentials')) return 'Email ou mot de passe incorrect.'
  if (m.includes('email not confirmed')) return 'Ton email n’est pas encore confirmé.'
  if (m.includes('failed to fetch')) return 'Connexion à Supabase impossible. Vérifie tes clés dans .env.local.'
  return e?.message || 'Erreur inconnue. Réessaie.'
}

function Style() {
  return (
    <style>{`
      .fd-inscription{min-height:100vh;display:flex;align-items:center;justify-content:center;
        background:linear-gradient(160deg,#4A1546,#7A1E52);padding:2rem 1rem;
        font-family:system-ui,'Segoe UI',sans-serif;color:#3A0F38}
      .fd-card{width:100%;max-width:420px;background:#FBF4F5;border-radius:22px;
        padding:2rem 1.6rem;box-shadow:0 24px 60px -20px rgba(0,0,0,.5)}
      .fd-brand{text-align:center;font-size:1.5rem;font-weight:800;margin-bottom:1.4rem}
      .fd-f{color:#4A1546}.fd-d{color:#D62A5E}
      .fd-titre{font-size:1.45rem;margin:0 0 .2rem;text-align:center}
      .fd-sous{color:#7A6B74;font-size:.92rem;margin:0 0 1.4rem;text-align:center}
      .fd-l{display:block;font-size:.82rem;font-weight:700;margin:.9rem 0 .35rem;color:#4A1546}
      .fd-in{width:100%;padding:.8rem .9rem;border:1.5px solid #E4D3D8;border-radius:12px;
        font-size:1rem;background:#fff;box-sizing:border-box;color:#3A0F38}
      .fd-in:focus{outline:none;border-color:#D62A5E}
      .fd-pass{position:relative}
      .fd-pass .fd-in{padding-right:3rem}
      .fd-eye{position:absolute;right:.6rem;top:50%;transform:translateY(-50%);
        background:none;border:0;cursor:pointer;color:#7A6B74;padding:.3rem;display:grid;place-items:center}
      .fd-eye:hover{color:#D62A5E}
      .fd-eye svg{width:22px;height:22px}
      .fd-lien{background:none;border:0;color:#D62A5E;font-size:.85rem;font-weight:700;
        cursor:pointer;margin-top:.6rem;padding:0}
      .fd-lien:hover{text-decoration:underline}
      .fd-lien.inline{margin:0;font-size:.92rem}
      .fd-err{background:#fdeaea;color:#b21f4e;padding:.7rem .9rem;border-radius:10px;
        font-size:.88rem;margin-top:1rem;line-height:1.4}
      .fd-btn{padding:.9rem;border:0;border-radius:12px;background:#D62A5E;color:#fff;
        font-size:1rem;font-weight:800;cursor:pointer;transition:.2s}
      .fd-btn:hover{background:#B21F4E}
      .fd-btn:disabled{opacity:.6;cursor:default}
      .fd-bas{text-align:center;margin-top:1.4rem;font-size:.92rem;color:#7A6B74}
    `}</style>
  )
}
