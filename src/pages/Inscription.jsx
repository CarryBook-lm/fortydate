// ============================================================
//  FortyDate — Inscription (6 écrans)
//  Écrans 1-3 = obligatoires → créent le compte + le profil.
//  Écrans 4-6 = enrichissement (l'utilisateur peut "Passer").
//
//  Prérequis Supabase :
//   • Authentication → Email → DÉSACTIVER "Confirm email"
//     (sinon pas de session immédiate = insertion profil bloquée par RLS)
//   • Storage → créer un bucket PUBLIC nommé "avatars" (pour les photos)
//
//  Placement : src/pages/Inscription.jsx
//  Import supabase depuis src/lib/supabase.js
// ============================================================
import { useState } from 'react'
import { supabase } from '../lib/supabase'

// ---------- Données de référence ----------
const PAYS = [
  { c: 'CM', n: 'Cameroun' }, { c: 'CI', n: "Côte d'Ivoire" }, { c: 'SN', n: 'Sénégal' },
  { c: 'BJ', n: 'Bénin' }, { c: 'BF', n: 'Burkina Faso' }, { c: 'ML', n: 'Mali' },
  { c: 'TG', n: 'Togo' }, { c: 'NE', n: 'Niger' }, { c: 'GA', n: 'Gabon' },
  { c: 'CG', n: 'Congo' }, { c: 'CD', n: 'RD Congo' }, { c: 'GN', n: 'Guinée' },
  { c: 'TD', n: 'Tchad' }, { c: 'CF', n: 'Centrafrique' }, { c: 'MA', n: 'Maroc' },
  { c: 'DZ', n: 'Algérie' }, { c: 'TN', n: 'Tunisie' }, { c: 'FR', n: 'France' },
  { c: 'BE', n: 'Belgique' }, { c: 'CH', n: 'Suisse' }, { c: 'CA', n: 'Canada' },
  { c: 'US', n: 'États-Unis' }, { c: 'GB', n: 'Royaume-Uni' }, { c: 'DE', n: 'Allemagne' },
  { c: 'IT', n: 'Italie' }, { c: 'ES', n: 'Espagne' }, { c: 'PT', n: 'Portugal' },
  { c: 'XX', n: 'Autre pays' },
]

// Indicatif téléphonique par pays (rempli automatiquement)
const INDICATIFS = {
  CM: '+237', CI: '+225', SN: '+221', BJ: '+229', BF: '+226', ML: '+223',
  TG: '+228', NE: '+227', GA: '+241', CG: '+242', CD: '+243', GN: '+224',
  TD: '+235', CF: '+236', MA: '+212', DZ: '+213', TN: '+216', FR: '+33',
  BE: '+32', CH: '+41', CA: '+1', US: '+1', GB: '+44', DE: '+49',
  IT: '+39', ES: '+34', PT: '+351', XX: '',
}

const VALEURS = ['Honnêteté', 'Foi / spiritualité', 'Famille', 'Ambition', 'Tendresse', 'Communication', 'Stabilité', 'Humour']
const INTERETS = ['Voyages', 'Cuisine', 'Foi', 'Musique', 'Sport', 'Lecture', 'Cinéma', 'Nature', 'Danse', 'Art']
const LANGUES = ['Français', 'Anglais', 'Arabe', 'Espagnol', 'Portugais', 'Langue locale']

function devisePourPays(c) {
  if (['CM', 'GA', 'TD', 'CF', 'CG', 'GQ'].includes(c)) return 'XAF'
  if (['CI', 'SN', 'BJ', 'BF', 'ML', 'NE', 'TG', 'GW'].includes(c)) return 'XOF'
  if (['FR', 'BE', 'DE', 'ES', 'IT', 'PT'].includes(c)) return 'EUR'
  if (c === 'CA') return 'CAD'
  if (c === 'US') return 'USD'
  if (c === 'CH') return 'CHF'
  if (c === 'GB') return 'GBP'
  return 'XOF'
}

function ageDepuis(dateStr) {
  if (!dateStr) return 0
  const d = new Date(dateStr), t = new Date()
  let a = t.getFullYear() - d.getFullYear()
  const m = t.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--
  return a
}

// ============================================================
export default function Inscription({ onComplete }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [f, setF] = useState({
    email: '', password: '', telephone: '', indicatif: '', prenom: '', date_naissance: '',
    genre: '', recherche_genre: '',
    pays_residence: '', ville: '', recherche_mode: 'mon_pays', recherche_pays: [],
    situation: '', enfants: '', profession: '',
    type_relation: '', valeurs: [],
    photo_principale: '', bio: '', interets: [], langues: [], religion: '',
  })

  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  // Choisir le pays remplit aussi l'indicatif automatiquement
  const choisirPays = (c) => setF(p => ({ ...p, pays_residence: c, indicatif: INDICATIFS[c] || '' }))
  const toggle = (k, v, max) => setF(p => {
    const arr = p[k].includes(v) ? p[k].filter(x => x !== v) : [...p[k], v]
    if (max && arr.length > max) return p
    return { ...p, [k]: arr }
  })

  // ---------- Validation par écran ----------
  function valider(n) {
    setErr('')
    if (n === 1) {
      if (!f.prenom.trim()) return 'Ton prénom est requis.'
      if (!/^[^@]+@[^@]+\.[^@]+$/.test(f.email)) return 'Email invalide.'
      if (f.password.length < 6) return 'Mot de passe : 6 caractères minimum.'
      if (!f.pays_residence) return 'Choisis ton pays de résidence.'
      if (!f.indicatif) return "Ce pays n'a pas d'indicatif configuré. Choisis un autre pays."
      if (!f.telephone.trim()) return 'Ton numéro de téléphone est requis.'
      if (!f.ville.trim()) return 'Ta ville est requise.'
      if (!f.date_naissance) return 'Ta date de naissance est requise.'
      if (ageDepuis(f.date_naissance) < 40) return 'FortyDate est réservé aux personnes de 40 ans et plus.'
      if (!f.genre) return 'Indique si tu es un homme ou une femme.'
      if (!f.recherche_genre) return 'Indique qui tu recherches.'
    }
    if (n === 2) {
      if (f.recherche_mode === 'pays_choisis' && f.recherche_pays.length === 0)
        return 'Choisis au moins un pays.'
    }
    if (n === 3) {
      if (!f.situation) return 'Indique ta situation actuelle.'
    }
    return ''
  }

  // ---------- Création du compte (fin écran 3) ----------
  async function creerCompte() {
    setLoading(true); setErr('')
    try {
      const { data, error } = await supabase.auth.signUp({
        email: f.email, password: f.password,
      })
      if (error) throw error
      if (!data.user) throw new Error("Compte non créé.")
      // Pas de session = email non confirmé = insertion profil impossible (RLS)
      if (!data.session) throw new Error('CONFIRM_EMAIL')

      const { error: e2 } = await supabase.from('profiles').insert({
        id: data.user.id,
        prenom: f.prenom.trim(),
        date_naissance: f.date_naissance,
        genre: f.genre,
        recherche_genre: f.recherche_genre,
        telephone: (f.indicatif + f.telephone.replace(/\s/g, '')) || null,
        pays_residence: f.pays_residence,
        ville: f.ville || null,
        recherche_mode: f.recherche_mode,
        recherche_pays: f.recherche_mode === 'pays_choisis' ? f.recherche_pays : [],
        devise: devisePourPays(f.pays_residence),
        situation: f.situation,
        enfants: f.enfants || null,
        profession: f.profession || null,
      })
      if (e2) throw e2
      setStep(4) // passe à l'enrichissement
    } catch (e) {
      setErr(traduireErreur(e))
    } finally {
      setLoading(false)
    }
  }

  // ---------- Mise à jour du profil (écrans 4-6) ----------
  async function majProfil(champs, suivant) {
    setLoading(true); setErr('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('profiles').update(champs).eq('id', user.id)
      if (error) throw error
      suivant()
    } catch (e) {
      setErr(traduireErreur(e))
    } finally {
      setLoading(false)
    }
  }

  async function uploadPhoto(file) {
    setLoading(true); setErr('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const nom = `${user.id}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('avatars').upload(nom, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(nom)
      set('photo_principale', data.publicUrl)
    } catch (e) {
      setErr("Photo : crée d'abord un bucket public 'avatars' dans Supabase Storage.")
    } finally {
      setLoading(false)
    }
  }

  function terminer() {
    if (onComplete) onComplete()
    else window.location.href = '/'
  }

  const suivant = () => { const e = valider(step); if (e) return setErr(e); setStep(step + 1) }
  const precedent = () => { setErr(''); setStep(step - 1) }

  // ============================================================
  return (
    <div className="fd-inscription">
      <Style />
      <div className="fd-card">
        <div className="fd-brand"><span className="fd-f">Forty</span><span className="fd-d">Date</span></div>
        <Progress step={step} />

        {/* ---------- ÉCRAN 1 ---------- */}
        {step === 1 && (
          <Ecran titre="Créons ton compte" sous="Réservé aux 40 ans et plus.">
            <Input label="Prénom" value={f.prenom} onChange={v => set('prenom', v)} />
            <Input label="Email" type="email" value={f.email} onChange={v => set('email', v)} />
            <label className="fd-l">Mot de passe</label>
            <ChampMotDePasse value={f.password} onChange={v => set('password', v)} />

            <label className="fd-l">Pays de résidence</label>
            <select className="fd-in" value={f.pays_residence} onChange={e => choisirPays(e.target.value)}>
              <option value="">Choisir…</option>
              {PAYS.map(p => <option key={p.c} value={p.c}>{p.n}</option>)}
            </select>

            <label className="fd-l">Téléphone (WhatsApp)</label>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <div style={{
                flex: '0 0 auto', minWidth: '66px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '.8rem .6rem', border: '1.5px solid #E4D3D8', borderRadius: '12px',
                background: '#F3E7EA', color: '#4A1546', fontWeight: 800, whiteSpace: 'nowrap'
              }}>{f.indicatif || '—'}</div>
              <input className="fd-in" type="tel" value={f.telephone} placeholder=""
                onChange={e => set('telephone', e.target.value)} style={{ flex: 1 }} />
            </div>

            <Input label="Ville" value={f.ville} onChange={v => set('ville', v)} />

            <Input label="Date de naissance" type="date" value={f.date_naissance} onChange={v => set('date_naissance', v)} />
            <Choix label="Je suis" value={f.genre} onChange={v => set('genre', v)}
              options={[['homme', 'Un homme'], ['femme', 'Une femme']]} />
            <Choix label="Je recherche" value={f.recherche_genre} onChange={v => set('recherche_genre', v)}
              options={[['homme', 'Un homme'], ['femme', 'Une femme'], ['les_deux', 'Les deux']]} />
          </Ecran>
        )}

        {/* ---------- ÉCRAN 2 ---------- */}
        {step === 2 && (
          <Ecran titre="Où veux-tu rencontrer ?" sous="Local par défaut, mondial si tu le choisis.">
            <Choix label="Je veux rencontrer" value={f.recherche_mode} onChange={v => set('recherche_mode', v)}
              options={[['mon_pays', 'Dans mon pays'], ['pays_choisis', 'Dans des pays précis'], ['partout', 'Partout dans le monde']]} />
            {f.recherche_mode === 'pays_choisis' && (
              <div className="fd-pays-grid">
                {PAYS.filter(p => p.c !== 'XX').map(p => (
                  <button key={p.c} type="button"
                    className={'fd-chip' + (f.recherche_pays.includes(p.c) ? ' on' : '')}
                    onClick={() => toggle('recherche_pays', p.c)}>{p.n}</button>
                ))}
              </div>
            )}
          </Ecran>
        )}

        {/* ---------- ÉCRAN 3 ---------- */}
        {step === 3 && (
          <Ecran titre="Ta situation" sous="Ça nous aide à te présenter les bonnes personnes.">
            <Choix label="Situation actuelle" value={f.situation} onChange={v => set('situation', v)}
              options={[['celibataire', 'Célibataire'], ['divorce', 'Divorcé(e)'], ['veuf', 'Veuf(ve)'], ['separe', 'Séparé(e)']]} />
            <Choix label="Enfants" value={f.enfants} onChange={v => set('enfants', v)}
              options={[['avec_moi', 'Oui, avec moi'], ['independants', 'Oui, indépendants'], ['non', 'Non'], ['non_precise', 'Je préfère ne pas dire']]} />
            <Input label="Profession (optionnel)" value={f.profession} onChange={v => set('profession', v)} />
          </Ecran>
        )}

        {/* ---------- ÉCRAN 4 ---------- */}
        {step === 4 && (
          <Ecran titre="Ce que tu cherches" sous="Enrichis ton profil (tu peux passer).">
            <Choix label="Type de relation" value={f.type_relation} onChange={v => set('type_relation', v)}
              options={[['serieuse', 'Relation sérieuse et durable'], ['mariage', 'En vue du mariage'], ['compagnon', 'Un compagnon / une compagne de vie'], ['selon_personne', 'Je verrai selon la personne']]} />
            <label className="fd-l">Ce qui compte le plus (3 max)</label>
            <div className="fd-pays-grid">
              {VALEURS.map(v => (
                <button key={v} type="button"
                  className={'fd-chip' + (f.valeurs.includes(v) ? ' on' : '')}
                  onClick={() => toggle('valeurs', v, 3)}>{v}</button>
              ))}
            </div>
          </Ecran>
        )}

        {/* ---------- ÉCRAN 5 ---------- */}
        {step === 5 && (
          <Ecran titre="Qui es-tu ?" sous="Une photo et quelques mots vrais.">
            <label className="fd-l">Photo de profil</label>
            {f.photo_principale && <img src={f.photo_principale} alt="" className="fd-avatar" />}
            <input className="fd-in" type="file" accept="image/*"
              onChange={e => e.target.files[0] && uploadPhoto(e.target.files[0])} />
            <label className="fd-l">Une phrase sur toi</label>
            <textarea className="fd-in" rows={3} value={f.bio}
              onChange={e => set('bio', e.target.value)} placeholder="Ce que je recherche, en une phrase…" />
            <label className="fd-l">Centres d'intérêt</label>
            <div className="fd-pays-grid">
              {INTERETS.map(v => (
                <button key={v} type="button"
                  className={'fd-chip' + (f.interets.includes(v) ? ' on' : '')}
                  onClick={() => toggle('interets', v)}>{v}</button>
              ))}
            </div>
            <label className="fd-l">Langues parlées</label>
            <div className="fd-pays-grid">
              {LANGUES.map(v => (
                <button key={v} type="button"
                  className={'fd-chip' + (f.langues.includes(v) ? ' on' : '')}
                  onClick={() => toggle('langues', v)}>{v}</button>
              ))}
            </div>
            <Input label="Religion / pratique (optionnel)" value={f.religion} onChange={v => set('religion', v)} />
          </Ecran>
        )}

        {/* ---------- ÉCRAN 6 ---------- */}
        {step === 6 && (
          <Ecran titre="Obtiens ton badge vérifié" sous="Un profil vérifié inspire confiance et reçoit plus de messages.">
            <p className="fd-info">Prends un selfie pour confirmer que c'est bien toi. Notre équipe le compare à ta photo de profil. Tu peux aussi le faire plus tard depuis ton espace.</p>
            <input className="fd-in" type="file" accept="image/*" capture="user"
              onChange={e => e.target.files[0] && uploadPhoto(e.target.files[0])} />
          </Ecran>
        )}

        {err ? <div className="fd-err">{String(err)}</div> : null}

        {/* ---------- NAVIGATION ---------- */}
        <div className="fd-nav">
          {step > 1 && step < 4 && <button className="fd-btn ghost" onClick={precedent} disabled={loading}>Retour</button>}
          {step >= 4 && <button className="fd-btn ghost" onClick={step < 6 ? () => setStep(step + 1) : terminer} disabled={loading}>Passer</button>}

          {step < 3 && <button className="fd-btn" onClick={suivant} disabled={loading}>Continuer</button>}
          {step === 3 && <button className="fd-btn" onClick={() => { const e = valider(3); if (e) return setErr(e); creerCompte() }} disabled={loading}>{loading ? '…' : 'Créer mon compte'}</button>}
          {step === 4 && <button className="fd-btn" onClick={() => majProfil({ type_relation: f.type_relation || null, valeurs: f.valeurs }, () => setStep(5))} disabled={loading}>{loading ? '…' : 'Continuer'}</button>}
          {step === 5 && <button className="fd-btn" onClick={() => majProfil({ photo_principale: f.photo_principale || null, bio: f.bio || null, interets: f.interets, langues: f.langues, religion: f.religion || null }, () => setStep(6))} disabled={loading}>{loading ? '…' : 'Continuer'}</button>}
          {step === 6 && <button className="fd-btn" onClick={terminer} disabled={loading}>Terminer</button>}
        </div>
      </div>
    </div>
  )
}

// ---------- Erreurs Supabase → français lisible ----------
function traduireErreur(e) {
  const m = (e?.message || e?.error_description || e?.hint || e?.details || (typeof e === 'string' ? e : '') || '').toString()
  if (m === 'CONFIRM_EMAIL')
    return "Ton compte est créé mais Supabase attend une confirmation par email. Va dans Supabase → Authentication → Providers → Email et DÉSACTIVE « Confirm email », puis réessaie."
  if (m.toLowerCase().includes('row-level security') || m.toLowerCase().includes('violates'))
    return "Insertion bloquée par la sécurité. Désactive « Confirm email » dans Supabase (Authentication → Providers → Email), puis réessaie."
  if (m.toLowerCase().includes('already registered') || m.toLowerCase().includes('already been registered'))
    return "Cet email a déjà un compte. Utilise un autre email pour tester."
  if (m.toLowerCase().includes('duplicate key'))
    return "Un profil existe déjà pour ce compte."
  if (m.toLowerCase().includes('40 ans'))
    return "FortyDate est réservé aux personnes de 40 ans et plus."
  if (m.toLowerCase().includes('password'))
    return "Mot de passe trop court (6 caractères minimum)."
  if (m.toLowerCase().includes('failed to fetch') || m.toLowerCase().includes('networkerror'))
    return "Connexion à Supabase impossible. Vérifie tes clés dans .env.local (URL et anon key)."
  return m || "Erreur inconnue. Réessaie."
}

// ---------- Sous-composants ----------
function ChampMotDePasse({ value, onChange, placeholder = 'Mot de passe' }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="fd-pass">
      <input className="fd-in" type={visible ? 'text' : 'password'} value={value}
        placeholder={placeholder} onChange={e => onChange(e.target.value)} />
      <button type="button" className="fd-eye" onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
        {visible ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17.9 17.9A10.5 10.5 0 0 1 12 20C5 20 1 12 1 12a19 19 0 0 1 5.1-5.9M9.9 4.2A10.5 10.5 0 0 1 12 4c7 0 11 8 11 8a19 19 0 0 1-2.2 3.2M1 1l22 22" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  )
}
function Ecran({ titre, sous, children }) {
  return (
    <div className="fd-ecran">
      <h2 className="fd-titre">{titre}</h2>
      <p className="fd-sous">{sous}</p>
      {children}
    </div>
  )
}
function Input({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <>
      <label className="fd-l">{label}</label>
      <input className="fd-in" type={type} value={value} placeholder={placeholder || ''}
        onChange={e => onChange(e.target.value)} />
    </>
  )
}
function Choix({ label, value, onChange, options }) {
  return (
    <>
      <label className="fd-l">{label}</label>
      <div className="fd-choix">
        {options.map(([v, t]) => (
          <button key={v} type="button" className={'fd-opt' + (value === v ? ' on' : '')}
            onClick={() => onChange(v)}>{t}</button>
        ))}
      </div>
    </>
  )
}
function Progress({ step }) {
  return (
    <div className="fd-prog">
      {[1, 2, 3, 4, 5, 6].map(n => (
        <span key={n} className={'fd-dot' + (n <= step ? ' on' : '') + (n === 3 ? ' key' : '')} />
      ))}
    </div>
  )
}

// ---------- Styles (FortyDate) ----------
function Style() {
  return (
    <style>{`
      .fd-inscription{min-height:100vh;display:flex;align-items:flex-start;justify-content:center;
        background:linear-gradient(160deg,#4A1546,#7A1E52);padding:2rem 1rem;
        font-family:system-ui,'Segoe UI',sans-serif;color:#3A0F38}
      .fd-card{width:100%;max-width:460px;background:#FBF4F5;border-radius:22px;
        padding:1.8rem 1.6rem;box-shadow:0 24px 60px -20px rgba(0,0,0,.5)}
      .fd-brand{text-align:center;font-size:1.5rem;font-weight:800;margin-bottom:1rem}
      .fd-f{color:#4A1546}.fd-d{color:#D62A5E}
      .fd-prog{display:flex;gap:6px;justify-content:center;margin-bottom:1.4rem}
      .fd-dot{width:26px;height:5px;border-radius:99px;background:#E4D3D8}
      .fd-dot.on{background:#D62A5E}
      .fd-dot.key.on{background:#C69A4E}
      .fd-titre{font-size:1.45rem;margin:0 0 .2rem}
      .fd-sous{color:#7A6B74;font-size:.92rem;margin:0 0 1.2rem}
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
      textarea.fd-in{resize:vertical}
      .fd-choix{display:flex;flex-wrap:wrap;gap:.5rem}
      .fd-opt{padding:.6rem 1rem;border:1.5px solid #E4D3D8;background:#fff;border-radius:99px;
        font-size:.92rem;cursor:pointer;color:#4A1546;transition:.15s}
      .fd-opt.on{background:#D62A5E;color:#fff;border-color:#D62A5E}
      .fd-pays-grid{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.2rem}
      .fd-chip{padding:.5rem .8rem;border:1.5px solid #E4D3D8;background:#fff;border-radius:99px;
        font-size:.85rem;cursor:pointer;color:#4A1546;transition:.15s}
      .fd-chip.on{background:#4A1546;color:#fff;border-color:#4A1546}
      .fd-avatar{width:90px;height:90px;object-fit:cover;border-radius:50%;margin:.4rem 0;display:block}
      .fd-info{font-size:.92rem;color:#5c4f57;line-height:1.5;background:#F3E7EA;padding:1rem;border-radius:12px}
      .fd-err{background:#fdeaea;color:#b21f4e;padding:.7rem .9rem;border-radius:10px;
        font-size:.88rem;margin-top:1rem}
      .fd-nav{display:flex;gap:.7rem;margin-top:1.6rem}
      .fd-btn{flex:1;padding:.9rem;border:0;border-radius:12px;background:#D62A5E;color:#fff;
        font-size:1rem;font-weight:800;cursor:pointer;transition:.2s}
      .fd-btn:hover{background:#B21F4E}
      .fd-btn:disabled{opacity:.6;cursor:default}
      .fd-btn.ghost{flex:0 0 auto;background:transparent;color:#4A1546;border:1.5px solid #E4D3D8}
    `}</style>
  )
}
