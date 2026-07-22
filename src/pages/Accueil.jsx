// ============================================================
//  FortyDate — Accueil (coquille de l'app)
//  Bas : Proximité · Rencontres · J'aime · Messages · Match
//  Menu ☰ (en-tête) : Mon profil · Questionnaire d'affinités · Déconnexion
//  Placement : src/pages/Accueil.jsx
// ============================================================
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { uploadPhotoOptimisee } from '../lib/photo'
import { subscribeToPush } from '../lib/push'

/* ---------------- Questionnaire d'affinités (30 questions) ---------------- */
// nominal:true  -> il faut la même réponse (0 ou 1)
// sinon options ordonnées -> crédit partiel selon la proximité
const QUESTIONS = [
  { id: 'q1', poids: 3, texte: "Quel engagement recherches-tu ?", options: [
    { v: 'mariage', label: 'Le mariage' }, { v: 'vie_commune', label: 'Une vie commune' },
    { v: 'stable', label: 'Une relation stable' }, { v: 'on_verra', label: 'On verra où ça mène' } ] },
  { id: 'q2', poids: 3, nominal: true, texte: "Souhaites-tu (d'autres) enfants ?", options: [
    { v: 'oui', label: 'Oui' }, { v: 'non', label: 'Non' },
    { v: 'peut_etre', label: 'Peut-être' }, { v: 'plus', label: "J'en ai déjà, ça suffit" } ] },
  { id: 'q3', poids: 2, texte: "Vivre ensemble à terme ?", options: [
    { v: 'oui_vite', label: 'Oui, assez vite' }, { v: 'oui_temps', label: 'Oui, avec le temps' },
    { v: 'chacun', label: 'Chacun chez soi' } ] },
  { id: 'q4', poids: 2, texte: "La famille élargie compte pour toi ?", options: [
    { v: 'beaucoup', label: 'Beaucoup' }, { v: 'moyen', label: 'Moyennement' }, { v: 'peu', label: 'Peu' } ] },
  { id: 'q5', poids: 2, nominal: true, texte: "L'argent dans le couple ?", options: [
    { v: 'commun', label: 'Tout en commun' }, { v: 'partage', label: 'Partage équitable' },
    { v: 'separe', label: 'Chacun le sien' } ] },
  { id: 'q6', poids: 1, texte: "Ton rythme de vie ?", options: [
    { v: 'casanier', label: 'Casanier' }, { v: 'equilibre', label: 'Équilibré' },
    { v: 'sorties', label: 'Sorties fréquentes' } ] },
  { id: 'q7', poids: 1, texte: "Plutôt…", options: [
    { v: 'reserve', label: 'Réservé(e)' }, { v: 'entre', label: 'Entre les deux' },
    { v: 'sociable', label: 'Très sociable' } ] },
  { id: 'q8', poids: 1, texte: "Sport et santé ?", options: [
    { v: 'actif', label: 'Très actif(ve)' }, { v: 'parfois', label: 'De temps en temps' },
    { v: 'peu', label: 'Peu actif(ve)' } ] },
  { id: 'q9', poids: 1, texte: "Les voyages ?", options: [
    { v: 'adore', label: "J'adore" }, { v: 'occasion', label: 'À l\u2019occasion' },
    { v: 'casanier', label: 'Je préfère rester' } ] },
  { id: 'q10', poids: 2, texte: "Tabac / alcool ?", options: [
    { v: 'non', label: 'Pas du tout' }, { v: 'occasion', label: 'Occasionnel' },
    { v: 'regulier', label: 'Régulier' } ] },
  { id: 'q11', poids: 2, texte: "En cas de conflit, tu…", options: [
    { v: 'parler', label: 'En parles tout de suite' }, { v: 'temps', label: "As besoin d'un temps" },
    { v: 'evite', label: 'Préfères éviter' } ] },
  { id: 'q12', poids: 1, texte: "La foi dans ta vie ?", options: [
    { v: 'centrale', label: 'Centrale' }, { v: 'presente', label: 'Présente' },
    { v: 'peu', label: 'Peu importante' }, { v: 'non', label: 'Pas religieux(se)' } ] },
  { id: 'q13', poids: 1, texte: "Le rôle idéal dans le couple ?", options: [
    { v: 'traditionnel', label: 'Plutôt traditionnel' }, { v: 'egalitaire', label: 'Moderne et égalitaire' },
    { v: 'flexible', label: 'Flexible' } ] },
  { id: 'q14', poids: 2, texte: "Dans 5 ans, tu te vois…", options: [
    { v: 'famille', label: 'Marié(e), en famille' }, { v: 'couple', label: 'En couple stable' },
    { v: 'epanoui', label: 'Épanoui(e), peu importe le statut' } ] },
  { id: 'q15', poids: 2, nominal: true, texte: "Ce que tu attends d'abord ?", options: [
    { v: 'tendresse', label: 'De la tendresse' }, { v: 'securite', label: 'De la sécurité' },
    { v: 'complicite', label: 'De la complicité' }, { v: 'passion', label: 'De la passion' } ] },
  { id: 'q16', poids: 2, nominal: true, texte: "Crois-tu en Dieu ?", options: [
    { v: 'oui', label: 'Oui' }, { v: 'non', label: 'Non' },
    { v: 'incertain', label: 'Je ne sais pas' } ] },
  { id: 'q17', poids: 2, texte: "Es-tu croyant(e) pratiquant(e) ?", options: [
    { v: 'tres', label: 'Très pratiquant(e)' }, { v: 'occasion', label: 'De temps en temps' },
    { v: 'non_pratiquant', label: 'Croyant(e) non pratiquant(e)' }, { v: 'non', label: 'Non concerné(e)' } ] },
  { id: 'q18', poids: 3, nominal: true, texte: "La fidélité, pour toi ?", options: [
    { v: 'sacree', label: 'Absolument sacrée' }, { v: 'importante', label: 'Importante' },
    { v: 'souple', label: 'Je suis plus souple' } ] },
  { id: 'q19', poids: 2, texte: "Es-tu jaloux(se) ?", options: [
    { v: 'peu', label: 'Pas vraiment' }, { v: 'un_peu', label: 'Un peu' },
    { v: 'beaucoup', label: 'Assez jaloux(se)' } ] },
  { id: 'q20', poids: 1, texte: "Comment montres-tu ton affection ?", options: [
    { v: 'mots', label: 'Par les mots' }, { v: 'gestes', label: 'Par les gestes tendres' },
    { v: 'actes', label: 'Par les actes' }, { v: 'cadeaux', label: 'Par les attentions' } ] },
  { id: 'q21', poids: 2, texte: "Besoin de temps chacun de son côté ?", options: [
    { v: 'beaucoup', label: 'Oui, beaucoup' }, { v: 'un_peu', label: 'Un peu' },
    { v: 'toujours_ensemble', label: 'Je préfère tout partager' } ] },
  { id: 'q22', poids: 1, texte: "Ta vie sociale ?", options: [
    { v: 'riche', label: 'Beaucoup d\u2019amis, souvent' }, { v: 'restreinte', label: 'Un cercle restreint' },
    { v: 'discrete', label: 'Plutôt discrète' } ] },
  { id: 'q23', poids: 1, texte: "Comment gères-tu le stress ?", options: [
    { v: 'calme', label: 'Je reste calme' }, { v: 'exprime', label: "J'exprime vite" },
    { v: 'garde', label: 'Je garde pour moi' } ] },
  { id: 'q24', poids: 2, texte: "Le rôle de la belle-famille ?", options: [
    { v: 'proche', label: 'Très présente, c\u2019est normal' }, { v: 'equilibre', label: 'Présente mais avec limites' },
    { v: 'distance', label: 'Chacun sa distance' } ] },
  { id: 'q25', poids: 1, texte: "Vivre en ville ou au calme ?", options: [
    { v: 'ville', label: 'En ville' }, { v: 'peu_importe', label: 'Peu importe' },
    { v: 'campagne', label: 'Au calme / campagne' } ] },
  { id: 'q26', poids: 1, texte: "Les animaux de compagnie ?", options: [
    { v: 'adore', label: "J'adore" }, { v: 'ok', label: 'Ça me va' }, { v: 'non', label: 'Plutôt non' } ] },
  { id: 'q27', poids: 2, texte: "Ton ambition professionnelle ?", options: [
    { v: 'forte', label: 'Très ambitieux(se)' }, { v: 'equilibre', label: 'Équilibre vie/travail' },
    { v: 'tranquille', label: 'Je vise la tranquillité' } ] },
  { id: 'q28', poids: 1, texte: "Une soirée idéale, c'est…", options: [
    { v: 'maison', label: 'À la maison, au calme' }, { v: 'sortie', label: 'Un dîner dehors' },
    { v: 'entre_amis', label: 'Entre amis' } ] },
  { id: 'q29', poids: 2, texte: "Ton rapport à l'argent ?", options: [
    { v: 'econome', label: 'Économe / prudent(e)' }, { v: 'equilibre', label: 'Équilibré(e)' },
    { v: 'depensier', label: 'Je profite de la vie' } ] },
  { id: 'q30', poids: 2, texte: "Es-tu prêt(e) à déménager pour l'amour ?", options: [
    { v: 'oui', label: 'Oui, sans souci' }, { v: 'peut_etre', label: 'Peut-être, à discuter' },
    { v: 'non', label: 'Difficilement' } ] },
]

// Calcule le % de compatibilité entre deux jeux de réponses
function calculerCompat(a, b) {
  if (!a || !b) return null
  let poidsTot = 0, score = 0
  for (const q of QUESTIONS) {
    const ra = a[q.id], rb = b[q.id]
    if (ra == null || rb == null) continue
    const iA = q.options.findIndex(o => o.v === ra)
    const iB = q.options.findIndex(o => o.v === rb)
    if (iA < 0 || iB < 0) continue
    const s = q.nominal ? (ra === rb ? 1 : 0) : 1 - Math.abs(iA - iB) / (q.options.length - 1)
    score += s * q.poids
    poidsTot += q.poids
  }
  if (poidsTot === 0) return null
  return Math.round((score / poidsTot) * 100)
}

/* ---------------- Utilitaires ---------------- */
function ageDepuis(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr), t = new Date()
  let a = t.getFullYear() - d.getFullYear()
  const m = t.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--
  return a
}
const NOM_PAYS = {
  CM: 'Cameroun', CI: "Côte d'Ivoire", SN: 'Sénégal', BJ: 'Bénin', BF: 'Burkina Faso',
  ML: 'Mali', TG: 'Togo', NE: 'Niger', GA: 'Gabon', CG: 'Congo', CD: 'RD Congo',
  GN: 'Guinée', TD: 'Tchad', CF: 'Centrafrique', MA: 'Maroc', DZ: 'Algérie', TN: 'Tunisie',
  FR: 'France', BE: 'Belgique', CH: 'Suisse', CA: 'Canada', US: 'États-Unis',
  GB: 'Royaume-Uni', DE: 'Allemagne', IT: 'Italie', ES: 'Espagne', PT: 'Portugal',
}
function couleurCompat(p) { return p >= 80 ? '#1c8a3e' : p >= 60 ? '#C69A4E' : '#9a8b92' }

// Un profil est-il membre VIP (badge visible) ?
function estAbonneP(p) {
  return p?.abo_statut === 'actif' && p?.abo_expire_at && new Date(p.abo_expire_at) > new Date()
}

// Badges à afficher à côté du prénom
// ✓ bleu = identité vérifiée (confiance) ; ⭐ or = membre VIP (statut)
function BadgeVerifie({ p, size = 18 }) {
  if (!p?.verifie) return null
  return (
    <svg className="fdh-badge" width={size} height={size} viewBox="0 0 24 24" aria-label="Profil vérifié"
      style={{ verticalAlign: 'middle', marginLeft: 4, flexShrink: 0, minWidth: size, display: 'inline-block' }}>
      <path fill="#1D9BF0" d="M12 1.5l2.3 1.7 2.85-.15 1 2.68 2.5 1.37-.62 2.79 1.72 2.28-1.72 2.28.62 2.79-2.5 1.37-1 2.68-2.85-.15L12 22.5l-2.3-1.7-2.85.15-1-2.68-2.5-1.37.62-2.79L2.25 12l1.72-2.28-.62-2.79 2.5-1.37 1-2.68 2.85.15L12 1.5z"/>
      <path fill="#fff" d="M10.6 15.2l-3-3 1.4-1.4 1.6 1.6 3.9-3.9 1.4 1.4-5.3 5.3z"/>
    </svg>
  )
}

function BadgeVip({ p, size = 18 }) {
  if (!estAbonneP(p)) return null
  return (
    <svg className="fdh-badge" width={size} height={size} viewBox="0 0 24 24" aria-label="Membre VIP"
      style={{ verticalAlign: 'middle', marginLeft: 4, flexShrink: 0, minWidth: size, display: 'inline-block' }}>
      <path fill="#C69A4E" d="M12 2.1l2.7 5.6 6.1.9-4.4 4.3 1.05 6.1L12 16.1l-5.45 2.9L7.6 12.9 3.2 8.6l6.1-.9L12 2.1z"/>
    </svg>
  )
}

// Les deux badges, vérifié en premier (la confiance prime sur le statut)
function Badge({ p, size = 18 }) {
  return <><BadgeVerifie p={p} size={size} /><BadgeVip p={p} size={size} /></>
}

// Listes pour l'édition du profil
const INDICATIFS = [
  { c: 'CM', d: '+237', f: '🇨🇲' }, { c: 'CI', d: '+225', f: '🇨🇮' }, { c: 'SN', d: '+221', f: '🇸🇳' },
  { c: 'BJ', d: '+229', f: '🇧🇯' }, { c: 'BF', d: '+226', f: '🇧🇫' }, { c: 'ML', d: '+223', f: '🇲🇱' },
  { c: 'TG', d: '+228', f: '🇹🇬' }, { c: 'NE', d: '+227', f: '🇳🇪' }, { c: 'GA', d: '+241', f: '🇬🇦' },
  { c: 'CG', d: '+242', f: '🇨🇬' }, { c: 'CD', d: '+243', f: '🇨🇩' }, { c: 'GN', d: '+224', f: '🇬🇳' },
  { c: 'TD', d: '+235', f: '🇹🇩' }, { c: 'CF', d: '+236', f: '🇨🇫' }, { c: 'MA', d: '+212', f: '🇲🇦' },
  { c: 'DZ', d: '+213', f: '🇩🇿' }, { c: 'TN', d: '+216', f: '🇹🇳' }, { c: 'FR', d: '+33', f: '🇫🇷' },
  { c: 'BE', d: '+32', f: '🇧🇪' }, { c: 'CH', d: '+41', f: '🇨🇭' }, { c: 'CA', d: '+1', f: '🇨🇦' },
  { c: 'US', d: '+1', f: '🇺🇸' }, { c: 'GB', d: '+44', f: '🇬🇧' }, { c: 'DE', d: '+49', f: '🇩🇪' },
  { c: 'IT', d: '+39', f: '🇮🇹' }, { c: 'ES', d: '+34', f: '🇪🇸' }, { c: 'PT', d: '+351', f: '🇵🇹' },
]
const LISTE_PAYS = Object.keys(NOM_PAYS).map(c => ({ c, n: NOM_PAYS[c] }))
const VALEURS = ['Honnêteté', 'Foi / spiritualité', 'Famille', 'Ambition', 'Tendresse', 'Communication', 'Stabilité', 'Humour']
const INTERETS = ['Voyages', 'Cuisine', 'Foi', 'Musique', 'Sport', 'Lecture', 'Cinéma', 'Nature', 'Danse', 'Art']
const LANGUES = ['Français', 'Anglais', 'Arabe', 'Espagnol', 'Portugais', 'Langue locale']

// Sépare un numéro international (+2250700...) en indicatif + numéro local
function sepIndicatif(tel) {
  const t = String(tel || '')
  const trouve = [...INDICATIFS].sort((a, b) => b.d.length - a.d.length).find(i => t.startsWith(i.d))
  if (trouve) return { indicatif: trouve.d, local: t.slice(trouve.d.length).replace(/\D/g, '') }
  return { indicatif: '+237', local: t.replace(/\D/g, '') }
}

// ---- Statut de présence, calculé depuis profiles.derniere_activite ----
function presence(d) {
  if (!d) return null
  const min = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (min < 0) return { enLigne: true, texte: 'En ligne' }
  if (min < 5) return { enLigne: true, texte: 'En ligne' }
  if (min < 60) return { enLigne: false, texte: `Vu il y a ${min} min` }
  const h = Math.floor(min / 60)
  if (h < 24) return { enLigne: false, texte: `Vu il y a ${h} h` }
  const j = Math.floor(h / 24)
  if (j === 1) return { enLigne: false, texte: 'Vu hier' }
  if (j < 30) return { enLigne: false, texte: `Vu il y a ${j} j` }
  return null
}

function Presence({ p, avecTexte = false }) {
  const s = presence(p?.derniere_activite)
  if (!s) return null
  if (!avecTexte) return <span className={'fdh-point' + (s.enLigne ? ' on' : '')} title={s.texte} />
  return (
    <span className={'fdh-presence' + (s.enLigne ? ' on' : '')}>
      <span className={'fdh-point' + (s.enLigne ? ' on' : '')} />{s.texte}
    </span>
  )
}

// Complete une liste de profils (issue d'une fonction SQL) avec leur presence
async function ajouterPresence(liste) {
  const ids = (liste || []).map(x => x.id).filter(Boolean)
  if (ids.length === 0) return liste || []
  const { data } = await supabase.from('profiles').select('id, derniere_activite, verifie').in('id', ids)
  const map = {}
  for (const r of (data || [])) map[r.id] = r
  return (liste || []).map(x => ({
    ...x,
    derniere_activite: map[x.id]?.derniere_activite || null,
    verifie: map[x.id]?.verifie ?? x.verifie,
  }))
}

function Avatar({ url, prenom, taille = '100%' }) {
  if (url) return <img className="fdh-photo" src={url} alt={prenom} style={{ height: taille }} />
  const lettre = (prenom || '?').charAt(0).toUpperCase()
  return <div className="fdh-photo fdh-vide" style={{ height: taille }}>{lettre}</div>
}

// Requête commune de profils compatibles (genre + pays)
function requeteCandidats(moi, colonnes) {
  let q = supabase.from('profiles').select(colonnes).neq('id', moi.id)
  if (moi.recherche_genre && moi.recherche_genre !== 'les_deux') q = q.eq('genre', moi.recherche_genre)
  q = q.or(`recherche_genre.eq.${moi.genre},recherche_genre.eq.les_deux`)
  if (moi.recherche_mode === 'mon_pays') q = q.eq('pays_residence', moi.pays_residence)
  else if (moi.recherche_mode === 'pays_choisis' && moi.recherche_pays?.length) q = q.in('pays_residence', moi.recherche_pays)
  return q.limit(80)
}

const L_SITUATION = { celibataire: 'Célibataire', divorce: 'Divorcé(e)', veuf: 'Veuf(ve)', separe: 'Séparé(e)' }
const L_ENFANTS = { avec_moi: 'Enfants avec moi', independants: 'Enfants indépendants', non: 'Sans enfant', non_precise: '' }
const L_TYPEREL = { serieuse: 'Relation sérieuse et durable', mariage: 'En vue du mariage', compagnon: 'Compagnon / compagne de vie', selon_personne: 'Selon la personne' }

/* ---------------- Fiche profil détaillée (album + infos) ---------------- */
function FicheProfil({ profil, moi, onFermer }) {
  const principale = profil.photo_principale || null
  const autres = (Array.isArray(profil.photos) ? profil.photos : []).filter(u => u && u !== principale)
  const album = principale ? [principale, ...autres] : autres
  const [actuelle, setActuelle] = useState(album[0] || null)
  const age = ageDepuis(profil.date_naissance)
  const chips = [
    L_SITUATION[profil.situation], L_ENFANTS[profil.enfants], profil.profession, L_TYPEREL[profil.type_relation],
  ].filter(Boolean)

  // Signalement
  const RAISONS = ['Comportement déplacé', 'Faux profil / arnaque', 'Photos choquantes', 'Propos irrespectueux', 'Autre']
  const [signalerOuvert, setSignalerOuvert] = useState(false)
  const [raison, setRaison] = useState('')
  const [detail, setDetail] = useState('')
  const [envoiSig, setEnvoiSig] = useState(false)
  const [sigMsg, setSigMsg] = useState('')
  const estMoi = moi && profil.id === moi.id

  // J'aime depuis la fiche
  const [aimeEtat, setAimeEtat] = useState('') // '' | 'envoi' | 'fait'
  const [matchFait, setMatchFait] = useState(false)
  async function aimer() {
    if (aimeEtat) return
    setAimeEtat('envoi')
    try {
      const { error } = await supabase.from('likes').insert({ auteur_id: moi.id, cible_id: profil.id, aime: true })
      if (error && !/duplicate|unique/i.test(error.message || '')) throw error
      const { data } = await supabase.rpc('est_un_match', { p_cible: profil.id })
      if (data === true) setMatchFait(true)
      setAimeEtat('fait')
    } catch (e) { setAimeEtat('') }
  }

  async function envoyerSignalement() {
    const objet = [raison, detail.trim()].filter(Boolean).join(' — ')
    if (!objet) { setSigMsg('Indique la raison du signalement.'); return }
    setEnvoiSig(true); setSigMsg('')
    try {
      const { error } = await supabase.from('signalements').insert({
        signaleur_id: moi.id, signale_id: profil.id, objet
      })
      if (error) throw error
      setSigMsg('ok')
    } catch (e) { setSigMsg('Échec de l\'envoi. Réessaie.') } finally { setEnvoiSig(false) }
  }

  return (
    <div className="fdh-fiche">
      <div className="fdh-fiche-head">
        <button className="fdh-retour" onClick={onFermer}>‹</button>
        <span className="fdh-chat-nom">Profil de {profil.prenom}</span>
      </div>
      <div className="fdh-fiche-scroll">
        <div className="fdh-fiche-photo">
          {actuelle
            ? <img src={actuelle} alt={profil.prenom} />
            : <div className="fdh-photo fdh-vide" style={{ height: '320px' }}>{(profil.prenom || '?').charAt(0).toUpperCase()}</div>}
        </div>
        {album.length > 1 && (
          <div className="fdh-fiche-vignettes">
            {album.map(u => (
              <img key={u} src={u} alt="" className={u === actuelle ? 'on' : ''} onClick={() => setActuelle(u)} />
            ))}
          </div>
        )}
        <div className="fdh-fiche-corps">
          <h2 className="fdh-fiche-nom">{profil.prenom}{age ? `, ${age}` : ''}<Badge p={profil} size={22} /></h2>
          <p className="fdh-fiche-lieu">📍 {profil.ville ? profil.ville + ' · ' : ''}{NOM_PAYS[profil.pays_residence] || profil.pays_residence}</p>
          <p className="fdh-fiche-presence"><Presence p={profil} avecTexte /></p>
          {(profil.verifie || estAbonneP(profil)) && (
            <div className="fdh-etiquettes">
              {profil.verifie && <span className="fdh-etiq verif"><BadgeVerifie p={profil} size={15} /> Profil vérifié</span>}
              {estAbonneP(profil) && <span className="fdh-etiq vip"><BadgeVip p={profil} size={15} /> Membre VIP</span>}
            </div>
          )}
          {profil.bio && <p className="fdh-fiche-bio">« {profil.bio} »</p>}

          {chips.length > 0 && (
            <div className="fdh-profil-infos" style={{ justifyContent: 'flex-start' }}>
              {chips.map((c, k) => <span key={k} className="fdh-tag">{c}</span>)}
            </div>
          )}

          {profil.valeurs?.length > 0 && (
            <div className="fdh-fiche-bloc"><h4>Ce qui compte pour {profil.prenom}</h4>
              <div className="fdh-chips">{profil.valeurs.map(v => <span key={v}>{v}</span>)}</div></div>)}

          {profil.interets?.length > 0 && (
            <div className="fdh-fiche-bloc"><h4>Centres d'intérêt</h4>
              <div className="fdh-chips">{profil.interets.map(v => <span key={v}>{v}</span>)}</div></div>)}

          {profil.langues?.length > 0 && (
            <div className="fdh-fiche-bloc"><h4>Langues parlées</h4>
              <div className="fdh-chips">{profil.langues.map(v => <span key={v}>{v}</span>)}</div></div>)}

          {!estMoi && (
            <button className="fdh-signaler" onClick={() => { setSignalerOuvert(true); setSigMsg('') }}>🚩 Signaler ce profil</button>
          )}
        </div>
      </div>

      {!estMoi && (
        <div className="fdh-fiche-pied">
          <button className={'fdh-fiche-aime' + (aimeEtat === 'fait' ? ' fait' : '')}
            disabled={aimeEtat !== ''} onClick={aimer}>
            {aimeEtat === 'envoi' ? '…'
              : aimeEtat === 'fait' ? (matchFait ? "🎉 C'est un match !" : "❤ J'aime envoyé")
              : `❤ J'aime ${profil.prenom}`}
          </button>
        </div>
      )}

      {signalerOuvert && (
        <div className="fdh-modal-fond" onClick={() => setSignalerOuvert(false)}>
          <div className="fdh-modal" onClick={e => e.stopPropagation()}>
            <button className="fdh-modal-x" onClick={() => setSignalerOuvert(false)} aria-label="Fermer">✕</button>
            {sigMsg === 'ok' ? (
              <div className="fdh-modal-fin">
                <div className="fdh-modal-emoji">✅</div>
                <h2>Signalement envoyé</h2>
                <p>Merci, notre équipe va examiner ce profil. Tu contribues à garder FortyDate sûr.</p>
                <button className="fdh-btn-rose" style={{ width: '100%' }} onClick={() => setSignalerOuvert(false)}>Fermer</button>
              </div>
            ) : (
              <>
                <h2 className="fdh-methode-titre">🚩 Signaler {profil.prenom}</h2>
                <p className="fdh-modal-sous">Pourquoi signales-tu ce profil ?</p>
                <div className="fdh-echips">
                  {RAISONS.map(r => (
                    <button key={r} type="button" className={'fdh-echip' + (raison === r ? ' on' : '')} onClick={() => setRaison(r)}>{r}</button>
                  ))}
                </div>
                <label className="fdh-el">Détails (facultatif)</label>
                <textarea className="fdh-ein fdh-etext" rows={3} maxLength={300} value={detail}
                  placeholder="Décris ce qui s'est passé…" onChange={e => setDetail(e.target.value)} />
                {sigMsg && sigMsg !== 'ok' && <div className="fdh-abo-msg err">{sigMsg}</div>}
                <button className="fdh-btn-rose" style={{ width: '100%', marginTop: '1rem' }} disabled={envoiSig} onClick={envoyerSignalement}>
                  {envoiSig ? 'Envoi…' : 'Envoyer le signalement'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------------- Onglet : Proximité ---------------- */
const SITUATIONS = [
  ['', 'Peu importe'], ['celibataire', 'Célibataire'], ['divorce', 'Divorcé(e)'],
  ['veuf', 'Veuf(ve)'], ['separe', 'Séparé(e)'],
]

function Proximite({ moi, onVoir }) {
  const [profils, setProfils] = useState(null)
  const [err, setErr] = useState('')
  const [zone, setZone] = useState('pays')        // pays | monde
  const [ouvert, setOuvert] = useState(false)
  const [paysPrecis, setPaysPrecis] = useState('')
  const [ageMin, setAgeMin] = useState('')
  const [ageMax, setAgeMax] = useState('')
  const [situation, setSituation] = useState('')
  const [religion, setReligion] = useState('')
  const [religionSaisie, setReligionSaisie] = useState('')

  const nbFiltres = [paysPrecis, ageMin, ageMax, situation, religion].filter(Boolean).length

  function reinitialiser() {
    setPaysPrecis(''); setAgeMin(''); setAgeMax(''); setSituation('')
    setReligion(''); setReligionSaisie('')
  }

  useEffect(() => {
    if (!moi) return
    let annule = false
    ;(async () => {
      try {
        setProfils(null)
        let q = supabase.from('profiles')
          .select('id, prenom, date_naissance, photo_principale, pays_residence, situation, religion, derniere_activite, verifie, abo_statut, abo_expire_at')
          .neq('id', moi.id)

        if (paysPrecis) q = q.eq('pays_residence', paysPrecis)
        else if (zone === 'pays' && moi.pays_residence) q = q.eq('pays_residence', moi.pays_residence)

        const auj = new Date()
        if (ageMin) {
          const d = new Date(auj); d.setFullYear(d.getFullYear() - Number(ageMin))
          q = q.lte('date_naissance', d.toISOString().slice(0, 10))
        }
        if (ageMax) {
          const d = new Date(auj); d.setFullYear(d.getFullYear() - Number(ageMax) - 1)
          q = q.gte('date_naissance', d.toISOString().slice(0, 10))
        }
        if (situation) q = q.eq('situation', situation)
        if (religion) q = q.ilike('religion', '%' + religion + '%')

        const { data, error } = await q.limit(100)
        if (error) throw error
        if (!annule) setProfils(data || [])
      } catch (e) { if (!annule) setErr(e.message || 'Erreur.') }
    })()
    return () => { annule = true }
  }, [moi, zone, paysPrecis, ageMin, ageMax, situation, religion])

  const ages = []
  for (let x = 40; x <= 90; x++) ages.push(x)

  const barre = (
    <div>
      <div className="fdh-zone">
        <button className={'fdh-zone-b' + (zone === 'pays' && !paysPrecis ? ' on' : '')}
          onClick={() => { setZone('pays'); setPaysPrecis('') }}>🏠 Mon pays</button>
        <button className={'fdh-zone-b' + (zone === 'monde' && !paysPrecis ? ' on' : '')}
          onClick={() => { setZone('monde'); setPaysPrecis('') }}>🌍 Tous les pays</button>
        <button className={'fdh-zone-b fdh-zone-f' + (ouvert || nbFiltres ? ' on' : '')}
          onClick={() => setOuvert(v => !v)}>
          ⚙️ Filtre{nbFiltres > 0 && <span className="fdh-sous-pastille">{nbFiltres}</span>}
        </button>
      </div>

      {ouvert && (
        <div className="fdh-panneau">
          <label className="fdh-f-l">Pays précis</label>
          <select className="fdh-f-in" value={paysPrecis} onChange={e => setPaysPrecis(e.target.value)}>
            <option value="">— Selon le choix ci-dessus —</option>
            {Object.entries(NOM_PAYS).map(([code, nom]) => <option key={code} value={code}>{nom}</option>)}
          </select>

          <label className="fdh-f-l">Âge</label>
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
            <select className="fdh-f-in" value={ageMin} onChange={e => setAgeMin(e.target.value)}>
              <option value="">De…</option>
              {ages.map(x => <option key={x} value={x}>{x} ans</option>)}
            </select>
            <span style={{ color: '#9a8b92' }}>→</span>
            <select className="fdh-f-in" value={ageMax} onChange={e => setAgeMax(e.target.value)}>
              <option value="">À…</option>
              {ages.map(x => <option key={x} value={x}>{x} ans</option>)}
            </select>
          </div>

          <label className="fdh-f-l">Situation</label>
          <select className="fdh-f-in" value={situation} onChange={e => setSituation(e.target.value)}>
            {SITUATIONS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>

          <label className="fdh-f-l">Pratique religieuse</label>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <input className="fdh-f-in" value={religionSaisie} placeholder="ex. chrétienne, musulmane…"
              onChange={e => setReligionSaisie(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setReligion(religionSaisie.trim())} />
            <button className="fdh-f-ok" onClick={() => setReligion(religionSaisie.trim())}>OK</button>
          </div>

          {nbFiltres > 0 && <button className="fdh-f-reset" onClick={reinitialiser}>Effacer les filtres</button>}
        </div>
      )}
    </div>
  )

  if (err) return <div>{barre}<div className="fdh-msg">{err}</div></div>
  if (profils === null) return <div>{barre}<div className="fdh-msg">Chargement…</div></div>
  if (profils.length === 0)
    return <div>{barre}<div className="fdh-vide-etat"><div className="fdh-vide-emoji">🕊️</div>
      <p>Aucun profil ne correspond{nbFiltres > 0 ? ' à ta recherche' : ''}.</p>
      <p className="fdh-vide-sous">{nbFiltres > 0
        ? "Essaie d'élargir tes filtres."
        : (zone === 'pays' ? 'Essaie « Tous les pays » pour élargir ta recherche.' : "Invite d'autres personnes à s'inscrire — ils apparaîtront ici.")}</p></div></div>

  return (
    <div>
      {barre}
      {nbFiltres > 0 && <p className="fdh-f-nb">{profils.length} profil{profils.length > 1 ? 's' : ''} trouvé{profils.length > 1 ? 's' : ''}</p>}
      <div className="fdh-grid">
        {profils.map(p => (
          <button key={p.id} className="fdh-carte" onClick={() => onVoir(p.id)}>
            <div className="fdh-carte-photo"><Avatar url={p.photo_principale} prenom={p.prenom} taille="100%" /></div>
            <div className="fdh-nom"><Presence p={p} />
              <span className="fdh-nom-txt">{p.prenom}{ageDepuis(p.date_naissance) ? `, ${ageDepuis(p.date_naissance)}` : ''}<Badge p={p} /></span></div>
            <div className="fdh-vu"><Presence p={p} avecTexte /></div>
          </button>
        ))}
      </div>
    </div>
  )
}

function Rencontres({ moi }) {
  const [profils, setProfils] = useState(null)
  const [i, setI] = useState(0)
  const [err, setErr] = useState('')
  const [match, setMatch] = useState(null)
  const [anim, setAnim] = useState('')
  const [drag, setDrag] = useState(0)
  const depart = useRef(null)

  // --- Balayage : feuillette seulement. Le profil revient plus tard tant qu'on n'a pas
  //     appuye sur ❤ ou ✕. La liste tourne en boucle.
  function naviguer(sens) { // 1 = suivant, -1 = precedent
    if (profils.length < 2) return
    const cible = (i + sens + profils.length) % profils.length
    setAnim(sens > 0 ? 'sort-d' : 'sort-g')
    setTimeout(() => { setI(cible); setAnim('') }, 200)
  }

  function debutGeste(x, y) { if (!anim) depart.current = { x, y } }
  function bougeGeste(x, y) {
    if (!depart.current) return
    const dx = x - depart.current.x
    const dy = y - depart.current.y
    if (Math.abs(dy) > Math.abs(dx) * 1.4) return // l'utilisateur scrolle verticalement
    setDrag(dx)
  }
  function finGeste() {
    if (!depart.current) return
    const dx = drag
    depart.current = null
    setDrag(0)
    if (dx > 90) naviguer(1)        // balayage vers la DROITE  -> profil suivant
    else if (dx < -90) naviguer(-1) // balayage vers la GAUCHE -> profil precedent
  }

  useEffect(() => {
    if (!moi) return
    let annule = false
    ;(async () => {
      try {
        const { data: vus } = await supabase.from('likes').select('cible_id').eq('auteur_id', moi.id)
        const exclus = new Set((vus || []).map(x => x.cible_id)); exclus.add(moi.id)
        const { data, error } = await requeteCandidats(moi, 'id, prenom, date_naissance, pays_residence, ville, photo_principale, bio, interets, derniere_activite, verifie, abo_statut, abo_expire_at')
        if (error) throw error
        if (!annule) setProfils((data || []).filter(p => !exclus.has(p.id)))
      } catch (e) { if (!annule) setErr(e.message || 'Erreur.') }
    })()
    return () => { annule = true }
  }, [moi])

  async function agir(aime) {
    const cible = profils[i]; if (!cible) return
    setAnim(aime ? 'like' : 'pass')
    try {
      await supabase.from('likes').insert({ auteur_id: moi.id, cible_id: cible.id, aime })
      if (aime) { const { data } = await supabase.rpc('est_un_match', { p_cible: cible.id }); if (data === true) setMatch(cible) }
    } catch (e) {}
    setTimeout(() => {
      // ❤ ou ✕ = decision : le profil sort definitivement du paquet
      const reste = profils.filter(x => x.id !== cible.id)
      setProfils(reste)
      setI(n => (reste.length === 0 || n >= reste.length ? 0 : n))
      setAnim('')
    }, 260)
  }

  if (err) return <div className="fdh-msg">{err}</div>
  if (profils === null) return <div className="fdh-msg">Chargement…</div>
  const p = profils[i]
  if (!p) return <div className="fdh-vide-etat"><div className="fdh-vide-emoji">✨</div>
    <p>Tu as vu tout le monde pour l'instant !</p>
    <p className="fdh-vide-sous">Reviens plus tard, de nouveaux profils arrivent chaque jour.</p></div>

  const age = ageDepuis(p.date_naissance)
  return (
    <div className="fdh-renc">
      <div
        className={'fdh-swipe' + (anim ? ' ' + anim : '')}
        style={drag ? { transform: `translateX(${drag}px) rotate(${drag / 22}deg)`, transition: 'none' } : undefined}
        onTouchStart={e => debutGeste(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={e => bougeGeste(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={finGeste}
        onMouseDown={e => debutGeste(e.clientX, e.clientY)}
        onMouseMove={e => { if (depart.current) bougeGeste(e.clientX, e.clientY) }}
        onMouseUp={finGeste}
        onMouseLeave={finGeste}
      >
        <div className="fdh-swipe-photo">
          {drag > 40 && <span className="fdh-tag-geste suiv">SUIVANT →</span>}
          {drag < -40 && <span className="fdh-tag-geste prec">← PRÉCÉDENT</span>}
          <Avatar url={p.photo_principale} prenom={p.prenom} taille="100%" />
          <div className="fdh-swipe-info">
            <h2>{p.prenom}{age ? `, ${age}` : ''}<Badge p={p} size={20} /></h2>
            <p className="fdh-swipe-lieu">{p.ville ? p.ville + ' · ' : ''}{NOM_PAYS[p.pays_residence] || p.pays_residence}</p>
            {p.bio && <p className="fdh-swipe-bio">{p.bio}</p>}
            {p.interets?.length > 0 && <div className="fdh-swipe-tags">{p.interets.slice(0, 4).map(t => <span key={t}>{t}</span>)}</div>}
          </div>
        </div>
      </div>
      <div className="fdh-actions">
        <button className="fdh-rond pass" onClick={() => agir(false)}>✕</button>
        <button className="fdh-rond like" onClick={() => agir(true)}>❤</button>
      </div>
      <p className="fdh-astuce-geste">Balaie pour voir plus tard · ❤ ou ✕ pour décider · {i + 1} / {profils.length}</p>
      {match && (
        <div className="fdh-match"><div className="fdh-match-box">
          <div className="fdh-match-emoji">🎉</div><h2>C'est un match !</h2>
          <p>Toi et {match.prenom} vous êtes aimés.</p>
          <button className="fdh-btn-rose" onClick={() => setMatch(null)}>Continuer</button>
        </div></div>
      )}
    </div>
  )
}

/* ---------------- Onglet : J'aime ---------------- */
function Jaime({ moi, onVoir, onDiscuter, onFaireAbo }) {
  const [matchs, setMatchs] = useState(null)
  const [recus, setRecus] = useState(null)
  const [err, setErr] = useState('')
  const [plein, setPlein] = useState(null) // null | 'recus' | 'matchs'
  const [aimeEnCours, setAimeEnCours] = useState(null)
  const [nouveauMatch, setNouveauMatch] = useState(null)

  // Aimer en retour quelqu'un qui nous a déjà aimé(e) => c'est forcément un match
  async function aimerEnRetour(p) {
    if (aimeEnCours) return
    setAimeEnCours(p.id)
    try {
      const { error } = await supabase.from('likes').insert({ auteur_id: moi.id, cible_id: p.id, aime: true })
      if (error) throw error
      setRecus(l => (l || []).filter(x => x.id !== p.id))
      setMatchs(l => ((l || []).some(x => x.id === p.id) ? l : [p, ...(l || [])]))
      setNouveauMatch(p)
    } catch (e) {
      setErr("Impossible d'enregistrer ton j'aime. Réessaie.")
    } finally { setAimeEnCours(null) }
  }
  useEffect(() => {
    if (!moi) return
    let annule = false
    ;(async () => {
      try {
        const [m, r] = await Promise.all([supabase.rpc('mes_matchs'), supabase.rpc('qui_m_a_aime')])
        if (m.error) throw m.error; if (r.error) throw r.error
        const [mp, rp] = await Promise.all([ajouterPresence(m.data), ajouterPresence(r.data)])
        if (!annule) { setMatchs(mp); setRecus(rp) }
      } catch (e) { if (!annule) setErr(e.message || 'Erreur.') }
    })()
    return () => { annule = true }
  }, [moi])

  if (err) return <div className="fdh-msg">{err}</div>
  if (matchs === null) return <div className="fdh-msg">Chargement…</div>

  const carte = (p, type) => {
    const floute = type === 'recus' && !estAbonne(moi)
    return (
    <div key={p.id} className="fdh-carte fdh-carte-b">
      <button className="fdh-carte-photo" onClick={() => floute ? onFaireAbo && onFaireAbo() : onVoir(p.id)}>
        <Avatar url={p.photo_principale} prenom={p.prenom} taille="100%" />
        {floute && <span className="fdh-floute"><span className="fdh-floute-ic">🔒</span></span>}
      </button>
      <div className="fdh-nom">{floute ? '••••••' : <><Presence p={p} />{p.prenom}{ageDepuis(p.date_naissance) ? `, ${ageDepuis(p.date_naissance)}` : ''}<Badge p={p} size={16} /></>}</div>
      <div className="fdh-2btn">
        {floute
          ? <button className="b-disc" onClick={() => onFaireAbo && onFaireAbo()}>Découvrir</button>
          : <>
              <button className="b-profil" onClick={() => onVoir(p.id)}>Profil</button>
              {type === 'recus'
                ? <button className="b-coeur" disabled={aimeEnCours === p.id} onClick={() => aimerEnRetour(p)} aria-label="Aimer en retour">{aimeEnCours === p.id ? '…' : '❤'}</button>
                : <button className="b-disc" onClick={() => onDiscuter(p)}>Discuter</button>}
            </>}
      </div>
    </div>
    )
  }

  const popupMatch = nouveauMatch && (
    <div className="fdh-match"><div className="fdh-match-box">
      <div className="fdh-match-emoji">🎉</div><h2>C'est un match !</h2>
      <p>Toi et {nouveauMatch.prenom} vous êtes aimés.</p>
      <div className="fdh-2btn" style={{ marginTop: '.9rem', padding: 0 }}>
        <button className="b-profil" onClick={() => setNouveauMatch(null)}>Plus tard</button>
        <button className="b-disc" onClick={() => { const q = nouveauMatch; setNouveauMatch(null); onDiscuter(q) }}>Discuter</button>
      </div>
    </div></div>
  )

  // Vue "tout" d'une catégorie (au clic sur un titre)
  if (plein) {
    const liste = plein === 'recus' ? recus : matchs
    const titre = plein === 'recus' ? "Ils t'ont aimée · Aime-les en retour" : 'Tes matchs · Vous vous êtes aimés'
    return (
      <div className="fdh-jaime">
        <button className="fdh-retour-lien" onClick={() => setPlein(null)}>‹ Retour</button>
        <div className="fdh-rayon-titre" style={{ cursor: 'default' }}>{titre}{liste.length > 0 && <span className="fdh-rayon-num">{liste.length}</span>}</div>
        {liste.length === 0
          ? <p className="fdh-rayon-vide">Rien pour l'instant.</p>
          : <div className="fdh-grid2">{liste.map(p => carte(p, plein))}</div>}
        {popupMatch}
      </div>
    )
  }

  const rayon = (cle, titre, liste, emoji, vide) => (
    <div className="fdh-rayon-bloc">
      <button className="fdh-rayon-titre" onClick={() => liste.length > 0 && setPlein(cle)}>
        {titre}{liste.length > 0 && <span className="fdh-rayon-num">{liste.length}</span>}
      </button>
      {liste.length === 0
        ? <p className="fdh-rayon-vide">{emoji} {vide}</p>
        : <div className="fdh-rayon">{liste.map(p => carte(p, cle))}</div>}
    </div>
  )

  return (
    <div className="fdh-jaime">
      {!estAbonne(moi) && recus.length > 0 && (
        <button className="fdh-teaser" onClick={() => onFaireAbo && onFaireAbo()}>
          🔒 <b>{recus.length}</b> {recus.length > 1 ? 'personnes t\'ont aimée' : "personne t'a aimée"} — débloque pour voir qui ›
        </button>
      )}
      {rayon('recus', "Ils t'ont aimée · Aime-les en retour", recus, '💗', "Personne ne t'a encore aimée.")}
      {rayon('matchs', 'Tes matchs · Vous vous êtes aimés', matchs, '💘', 'Pas encore de match.')}
      {popupMatch}
    </div>
  )
}

/* ---------------- Onglet : Match (affinités %) ---------------- */
function MatchAffinites({ moi, mesReponses, onFaireQuestionnaire, onVoir, onDiscuter, onFaireAbo }) {
  const [liste, setListe] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!moi || !mesReponses) return
    let annule = false
    ;(async () => {
      try {
        const { data: cands, error } = await requeteCandidats(moi, 'id, prenom, date_naissance, pays_residence, ville, photo_principale, derniere_activite, verifie, abo_statut, abo_expire_at')
        if (error) throw error
        const ids = (cands || []).map(c => c.id)
        let affMap = {}
        if (ids.length) {
          const { data: affs } = await supabase.from('affinites').select('profile_id, reponses').in('profile_id', ids)
          for (const a of (affs || [])) affMap[a.profile_id] = a.reponses
        }
        const res = (cands || [])
          .map(p => ({ ...p, compat: calculerCompat(mesReponses, affMap[p.id]) }))
          .filter(p => p.compat != null)
          .sort((a, b) => b.compat - a.compat)
        if (!annule) setListe(res)
      } catch (e) { if (!annule) setErr(e.message || 'Erreur.') }
    })()
    return () => { annule = true }
  }, [moi, mesReponses])

  if (!mesReponses || Object.keys(mesReponses).length === 0)
    return <div className="fdh-vide-etat"><div className="fdh-vide-emoji">✨</div>
      <p>Découvre tes meilleures affinités</p>
      <p className="fdh-vide-sous">Réponds à 30 questions et découvre ton pourcentage de compatibilité avec chaque profil.</p>
      <button className="fdh-btn-rose" style={{ marginTop: '1rem' }} onClick={onFaireQuestionnaire}>Répondre au questionnaire</button></div>

  if (err) return <div className="fdh-msg">{err}</div>
  if (liste === null) return <div className="fdh-msg">Calcul des affinités…</div>
  if (liste.length === 0)
    return <div className="fdh-vide-etat"><div className="fdh-vide-emoji">🔍</div>
      <p>Aucun profil n'a encore rempli le questionnaire.</p>
      <p className="fdh-vide-sous">Les compatibilités apparaîtront dès que d'autres membres y répondront.</p></div>

  return (
    <div className="fdh-affs">
      {!estAbonne(moi) && (
        <button className="fdh-teaser" onClick={() => onFaireAbo && onFaireAbo()}>
          🔒 Tes pourcentages d'affinité sont masqués — débloque-les ›
        </button>
      )}
      <p className="fdh-affs-info">Classés par affinité avec toi ✨</p>
      <div className="fdh-grid2">
        {liste.map(p => (
          <div key={p.id} className="fdh-carte fdh-carte-b">
            <button className="fdh-carte-photo" onClick={() => onVoir(p.id)}>
              <Avatar url={p.photo_principale} prenom={p.prenom} taille="100%" />
              <span className="fdh-pct-badge" style={{ background: estAbonne(moi) ? couleurCompat(p.compat) : '#9b8b93' }}>{estAbonne(moi) ? p.compat + '%' : '🔒 ?%'}</span>
            </button>
            <div className="fdh-nom">
              {p.prenom}{ageDepuis(p.date_naissance) ? `, ${ageDepuis(p.date_naissance)}` : ''}
            </div>
            <div className="fdh-2btn">
              <button className="b-profil" onClick={() => onVoir(p.id)}>Profil</button>
              <button className="b-disc" onClick={() => onDiscuter(p)}>Discuter</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------------- Questionnaire d'affinités ---------------- */
function Questionnaire({ moi, reponsesInit, onFini }) {
  const [rep, setRep] = useState(reponsesInit || {})
  const [envoi, setEnvoi] = useState(false)
  const [msg, setMsg] = useState('')
  const repondu = Object.keys(rep).length

  async function enregistrer() {
    setEnvoi(true); setMsg('')
    try {
      const { error } = await supabase.from('affinites')
        .upsert({ profile_id: moi.id, reponses: rep, complete_at: new Date().toISOString() })
      if (error) throw error
      onFini(rep)
    } catch (e) { setMsg("Échec de l'enregistrement. Réessaie.") } finally { setEnvoi(false) }
  }

  return (
    <div className="fdh-quest">
      <h2 className="fdh-quest-titre">Questionnaire d'affinités</h2>
      <p className="fdh-quest-sous">{repondu}/{QUESTIONS.length} questions · réponds à un maximum pour de meilleurs résultats.</p>
      {QUESTIONS.map((q, n) => (
        <div key={q.id} className="fdh-q">
          <div className="fdh-q-texte"><b>{n + 1}.</b> {q.texte}</div>
          <div className="fdh-q-opts">
            {q.options.map(o => (
              <button key={o.v} type="button"
                className={'fdh-q-opt' + (rep[q.id] === o.v ? ' on' : '')}
                onClick={() => setRep(r => ({ ...r, [q.id]: o.v }))}>{o.label}</button>
            ))}
          </div>
        </div>
      ))}
      {msg && <div className="fdh-err">{msg}</div>}
      <button className="fdh-btn-rose fdh-quest-save" onClick={enregistrer} disabled={envoi || repondu === 0}>
        {envoi ? 'Enregistrement…' : 'Enregistrer mes réponses'}
      </button>
    </div>
  )
}

/* ---------------- Mon profil (avec album 9 photos) ---------------- */
function EditerProfil({ moi, onFerme, onMaj }) {
  const sep = sepIndicatif(moi.telephone)
  const [f, setF] = useState({
    indicatif: sep.indicatif,
    telephone: sep.local,
    bio: moi.bio || '',
    ville: moi.ville || '',
    pays_residence: moi.pays_residence || '',
    situation: moi.situation || '',
    enfants: moi.enfants || '',
    profession: moi.profession || '',
    type_relation: moi.type_relation || '',
    recherche_genre: moi.recherche_genre || '',
    recherche_mode: moi.recherche_mode || 'mon_pays',
    recherche_pays: Array.isArray(moi.recherche_pays) ? moi.recherche_pays : [],
    valeurs: Array.isArray(moi.valeurs) ? moi.valeurs : [],
    interets: Array.isArray(moi.interets) ? moi.interets : [],
    langues: Array.isArray(moi.langues) ? moi.langues : [],
  })
  const [envoi, setEnvoi] = useState(false)
  const [msg, setMsg] = useState('')

  const set = (k, v) => setF(o => ({ ...o, [k]: v }))
  const toggle = (k, v) => setF(o => ({ ...o, [k]: o[k].includes(v) ? o[k].filter(x => x !== v) : [...o[k], v] }))

  async function enregistrer() {
    if (String(f.telephone).replace(/\D/g, '').length < 6) { setMsg('Numéro de téléphone invalide.'); return }
    setEnvoi(true); setMsg('')
    const maj = {
      telephone: f.indicatif + f.telephone.replace(/\D/g, ''),
      bio: f.bio.trim(),
      ville: f.ville.trim(),
      pays_residence: f.pays_residence,
      situation: f.situation || null,
      enfants: f.enfants || null,
      profession: f.profession.trim() || null,
      type_relation: f.type_relation || null,
      recherche_genre: f.recherche_genre || null,
      recherche_mode: f.recherche_mode,
      recherche_pays: f.recherche_mode === 'pays_choisis' ? f.recherche_pays : [],
      valeurs: f.valeurs, interets: f.interets, langues: f.langues,
    }
    try {
      const { error } = await supabase.from('profiles').update(maj).eq('id', moi.id)
      if (error) throw error
      onMaj({ ...moi, ...maj })
      onFerme()
    } catch (e) { setMsg('Échec de l\'enregistrement. Réessaie.') } finally { setEnvoi(false) }
  }

  return (
    <div className="fdh-edit">
      <div className="fdh-fiche-head">
        <button className="fdh-retour" onClick={onFerme}>‹</button>
        <span className="fdh-chat-nom">Modifier mon profil</span>
      </div>
      <div className="fdh-edit-scroll">
        <label className="fdh-el">Téléphone</label>
        <div className="fdh-telrow">
          <select className="fdh-ein fdh-eindic" value={f.indicatif} onChange={e => set('indicatif', e.target.value)}>
            {INDICATIFS.map(p => <option key={p.c} value={p.d}>{p.f} {p.d}</option>)}
          </select>
          <input className="fdh-ein" value={f.telephone} inputMode="numeric" placeholder="Numéro" onChange={e => set('telephone', e.target.value)} />
        </div>

        <label className="fdh-el">À propos de moi</label>
        <textarea className="fdh-ein fdh-etext" value={f.bio} rows={3} maxLength={300} placeholder="Décris-toi en quelques mots…" onChange={e => set('bio', e.target.value)} />

        <label className="fdh-el">Ville</label>
        <input className="fdh-ein" value={f.ville} placeholder="Ta ville" onChange={e => set('ville', e.target.value)} />

        <label className="fdh-el">Pays de résidence</label>
        <select className="fdh-ein" value={f.pays_residence} onChange={e => set('pays_residence', e.target.value)}>
          <option value="">Choisir…</option>
          {LISTE_PAYS.map(p => <option key={p.c} value={p.c}>{p.n}</option>)}
        </select>

        <label className="fdh-el">Profession</label>
        <input className="fdh-ein" value={f.profession} placeholder="Ta profession" onChange={e => set('profession', e.target.value)} />

        <label className="fdh-el">Situation</label>
        <select className="fdh-ein" value={f.situation} onChange={e => set('situation', e.target.value)}>
          <option value="">Choisir…</option>
          {Object.keys(L_SITUATION).map(k => <option key={k} value={k}>{L_SITUATION[k]}</option>)}
        </select>

        <label className="fdh-el">Enfants</label>
        <select className="fdh-ein" value={f.enfants} onChange={e => set('enfants', e.target.value)}>
          <option value="">Choisir…</option>
          {Object.keys(L_ENFANTS).filter(k => L_ENFANTS[k]).map(k => <option key={k} value={k}>{L_ENFANTS[k]}</option>)}
        </select>

        <label className="fdh-el">Type de relation recherchée</label>
        <select className="fdh-ein" value={f.type_relation} onChange={e => set('type_relation', e.target.value)}>
          <option value="">Choisir…</option>
          {Object.keys(L_TYPEREL).map(k => <option key={k} value={k}>{L_TYPEREL[k]}</option>)}
        </select>

        <label className="fdh-el">Je recherche</label>
        <select className="fdh-ein" value={f.recherche_genre} onChange={e => set('recherche_genre', e.target.value)}>
          <option value="">Choisir…</option>
          <option value="homme">Un homme</option>
          <option value="femme">Une femme</option>
          <option value="les_deux">Tout le monde</option>
        </select>

        <label className="fdh-el">Où chercher</label>
        <select className="fdh-ein" value={f.recherche_mode} onChange={e => set('recherche_mode', e.target.value)}>
          <option value="mon_pays">Dans mon pays</option>
          <option value="tous">Tous les pays</option>
          <option value="pays_choisis">Des pays précis</option>
        </select>
        {f.recherche_mode === 'pays_choisis' && (
          <div className="fdh-echips">
            {LISTE_PAYS.map(p => (
              <button key={p.c} type="button" className={'fdh-echip' + (f.recherche_pays.includes(p.c) ? ' on' : '')} onClick={() => toggle('recherche_pays', p.c)}>{p.n}</button>
            ))}
          </div>
        )}

        <label className="fdh-el">Ce qui compte pour moi</label>
        <div className="fdh-echips">
          {VALEURS.map(v => <button key={v} type="button" className={'fdh-echip' + (f.valeurs.includes(v) ? ' on' : '')} onClick={() => toggle('valeurs', v)}>{v}</button>)}
        </div>

        <label className="fdh-el">Centres d'intérêt</label>
        <div className="fdh-echips">
          {INTERETS.map(v => <button key={v} type="button" className={'fdh-echip' + (f.interets.includes(v) ? ' on' : '')} onClick={() => toggle('interets', v)}>{v}</button>)}
        </div>

        <label className="fdh-el">Langues parlées</label>
        <div className="fdh-echips">
          {LANGUES.map(v => <button key={v} type="button" className={'fdh-echip' + (f.langues.includes(v) ? ' on' : '')} onClick={() => toggle('langues', v)}>{v}</button>)}
        </div>

        {msg && <div className="fdh-abo-msg err">{msg}</div>}
        <button className="fdh-btn-rose" style={{ width: '100%', marginTop: '1rem' }} disabled={envoi} onClick={enregistrer}>
          {envoi ? 'Enregistrement…' : '✅ Enregistrer'}
        </button>
        <button className="fdh-btn-texte" onClick={onFerme}>Annuler</button>
      </div>
    </div>
  )
}

function MonProfil({ moi, onDeconnexion, onMaj }) {
  const [envoi, setEnvoi] = useState(false)
  const [msg, setMsg] = useState('')
  const [menuPhoto, setMenuPhoto] = useState(null) // url de la photo sélectionnée
  const [editer, setEditer] = useState(false)
  const album = Array.isArray(moi?.photos) ? moi.photos : []

  async function ajouterPhoto(file) {
    if (!file) return
    if (album.length >= 5) { setMsg('Album complet (5 photos maximum).'); return }
    setEnvoi(true); setMsg('')
    try {
      const url = await uploadPhotoOptimisee(file, moi.id)
      if (album.includes(url)) { setMsg('Cette photo est déjà dans ton album 👍'); return }
      const nouvelAlbum = [...album, url]
      const maj = { photos: nouvelAlbum }
      if (!moi.photo_principale) maj.photo_principale = url // 1re photo = photo de profil
      const { error: e2 } = await supabase.from('profiles').update(maj).eq('id', moi.id)
      if (e2) throw e2
      onMaj({ ...moi, ...maj })
    } catch (e) { setMsg("Échec de l'envoi. Réessaie avec une autre image.") } finally { setEnvoi(false) }
  }

  async function definirPrincipale(url) {
    setMenuPhoto(null); setEnvoi(true); setMsg('')
    try {
      const { error } = await supabase.from('profiles').update({ photo_principale: url }).eq('id', moi.id)
      if (error) throw error
      onMaj({ ...moi, photo_principale: url }); setMsg('Photo de profil mise à jour ✅')
    } catch (e) { setMsg("Échec. Réessaie.") } finally { setEnvoi(false) }
  }

  async function supprimerPhoto(url) {
    setMenuPhoto(null); setEnvoi(true); setMsg('')
    try {
      const nouvelAlbum = album.filter(u => u !== url)
      const maj = { photos: nouvelAlbum }
      if (moi.photo_principale === url) maj.photo_principale = nouvelAlbum[0] || null
      const { error } = await supabase.from('profiles').update(maj).eq('id', moi.id)
      if (error) throw error
      // supprime aussi du stockage (best effort)
      const chemin = url.split('/avatars/')[1]
      if (chemin) supabase.storage.from('avatars').remove([chemin])
      onMaj({ ...moi, ...maj })
    } catch (e) { setMsg("Échec de la suppression.") } finally { setEnvoi(false) }
  }

  if (!moi) return <div className="fdh-msg">Chargement…</div>
  if (editer) return <EditerProfil moi={moi} onFerme={() => setEditer(false)} onMaj={onMaj} />
  const age = ageDepuis(moi.date_naissance)
  return (
    <div className="fdh-profil">
      <Avatar url={moi.photo_principale} prenom={moi.prenom} taille="120px" />
      <h2 className="fdh-profil-nom">{moi.prenom}{age ? `, ${age}` : ''}<Badge p={moi} size={22} /></h2>
      <p className="fdh-profil-lieu">{moi.ville ? moi.ville + ' · ' : ''}{NOM_PAYS[moi.pays_residence] || moi.pays_residence}</p>
      {moi.bio && <p className="fdh-profil-bio">« {moi.bio} »</p>}

      {/* Album */}
      <h3 className="fdh-album-titre">Mes photos <span>{album.length}/5</span></h3>
      <div className="fdh-album">
        {album.map(url => (
          <button key={url} className={'fdh-album-photo' + (url === moi.photo_principale ? ' principale' : '')}
            onClick={() => setMenuPhoto(url)}>
            <img src={url} alt="" />
            {url === moi.photo_principale && <span className="fdh-album-badge">Profil</span>}
          </button>
        ))}
        {album.length < 5 && (
          <label className="fdh-album-ajout">
            {envoi ? '…' : '＋'}
            <input type="file" accept="image/*" hidden disabled={envoi}
              onChange={e => e.target.files[0] && ajouterPhoto(e.target.files[0])} />
          </label>
        )}
      </div>
      {msg && <p className="fdh-photo-msg">{msg}</p>}

      <div className="fdh-profil-infos">
        <span className="fdh-tag">{moi.situation || '—'}</span>
        <span className="fdh-tag">Recherche : {moi.recherche_genre === 'les_deux' ? 'tout le monde' : moi.recherche_genre}</span>
        <span className="fdh-tag">{moi.abo_statut === 'actif' ? '⭐ Membre VIP' : 'Découverte (gratuit)'}</span>
      </div>
      <button className="fdh-btn-rose" style={{ marginTop: '.4rem' }} onClick={() => setEditer(true)}>✏️ Modifier mon profil</button>
      <button className="fdh-btn-deco" onClick={onDeconnexion}>Se déconnecter</button>

      {/* Menu au clic sur une photo */}
      {menuPhoto && (
        <div className="fdh-pmenu-fond" onClick={() => setMenuPhoto(null)}>
          <div className="fdh-pmenu" onClick={e => e.stopPropagation()}>
            <img src={menuPhoto} alt="" className="fdh-pmenu-apercu" />
            {menuPhoto !== moi.photo_principale &&
              <button className="fdh-pmenu-btn" onClick={() => definirPrincipale(menuPhoto)}>⭐ Définir comme photo de profil</button>}
            <button className="fdh-pmenu-btn danger" onClick={() => supprimerPhoto(menuPhoto)}>🗑️ Supprimer cette photo</button>
            <button className="fdh-pmenu-btn annuler" onClick={() => setMenuPhoto(null)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------------- Messages ---------------- */
const EMOJIS = ['😊','😄','😍','🥰','😘','😉','😎','🤗','👍','🙏','❤️','💕','🔥','✨','😅','😂','🤔','😢','😮','🎉','🌹','☕','🍷','😴','🤩','😇','💪','👋']

function Bulle({ m, moi, msgs, onRepondre }) {
  const [dx, setDx] = useState(0)
  const start = useRef(null)
  const engaged = useRef(false)
  function down(e) { start.current = { x: e.clientX, y: e.clientY }; engaged.current = false; try { e.currentTarget.setPointerCapture(e.pointerId) } catch (_) {} }
  function move(e) {
    if (!start.current) return
    const ddx = e.clientX - start.current.x, ddy = e.clientY - start.current.y
    if (!engaged.current) {
      if (ddx > 8 && ddx > Math.abs(ddy)) engaged.current = true
      else if (Math.abs(ddy) > 10) { start.current = null; return }
    }
    if (engaged.current) setDx(Math.min(Math.max(ddx, 0), 90))
  }
  function up() { if (dx > 45) onRepondre(m); setDx(0); start.current = null; engaged.current = false }
  const cite = m.repond_a ? msgs.find(x => x.id === m.repond_a) : null
  const cote = m.expediteur === moi.id ? 'moi' : 'lui'
  return (
    <div className={'fdh-bulle-wrap ' + cote} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      style={{ transform: `translateX(${dx}px)`, transition: dx === 0 ? 'transform .2s' : 'none' }}>
      {dx > 12 && <span className="fdh-reply-ic">↩</span>}
      <div className={'fdh-bulle ' + cote}>
        {cite && <div className="fdh-cite">{cite.contenu}</div>}
        {m.contenu}
      </div>
    </div>
  )
}

function Chat({ moi, contact, onRetour, onLu, onFaireAbo }) {
  const [msgs, setMsgs] = useState([])
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [repondA, setRepondA] = useState(null)
  const [emoOuvert, setEmoOuvert] = useState(false)
  const [envoyesJour, setEnvoyesJour] = useState(null) // messages envoyés aujourd'hui
  const bas = useRef(null)
  const abonne = estAbonne(moi)
  const restants = abonne ? Infinity : Math.max(0, LIMITE_MSG_JOUR - (envoyesJour ?? 0))

  // Compte les messages envoyés aujourd'hui (toutes conversations confondues)
  useEffect(() => {
    if (abonne) return
    let annule = false
    ;(async () => {
      const d = new Date(); d.setHours(0, 0, 0, 0)
      const { count } = await supabase.from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('expediteur', moi.id).gte('cree_at', d.toISOString())
      if (!annule) setEnvoyesJour(count || 0)
    })()
    return () => { annule = true }
  }, [moi.id, abonne])

  useEffect(() => {
    let annule = false
    ;(async () => {
      const { data } = await supabase.from('messages').select('*')
        .or(`and(expediteur.eq.${moi.id},destinataire.eq.${contact.id}),and(expediteur.eq.${contact.id},destinataire.eq.${moi.id})`)
        .order('cree_at', { ascending: true })
      if (!annule) setMsgs(data || [])
      // Marquer comme lus les messages reçus de ce contact
      try {
        await supabase.from('messages').update({ lu: true })
          .eq('destinataire', moi.id).eq('expediteur', contact.id).eq('lu', false)
        if (onLu) onLu()
      } catch (_) {}
    })()
    const canal = supabase.channel('chat-' + contact.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `expediteur=eq.${contact.id}` },
        payload => { if (payload.new.destinataire === moi.id) {
          setMsgs(m => [...m, payload.new])
          supabase.from('messages').update({ lu: true }).eq('id', payload.new.id).then(() => onLu && onLu())
        } })
      .subscribe()
    return () => { annule = true; supabase.removeChannel(canal) }
  }, [moi.id, contact.id])

  useEffect(() => { bas.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  async function envoyer() {
    const t = texte.trim(); if (!t || envoi) return
    if (!abonne && restants <= 0) return
    setEnvoi(true); setEmoOuvert(false)
    const { data, error } = await supabase.from('messages')
      .insert({ expediteur: moi.id, destinataire: contact.id, contenu: t, repond_a: repondA?.id || null })
      .select().single()
    if (!error && data) {
      setMsgs(m => [...m, data]); setTexte(''); setRepondA(null)
      if (!abonne) setEnvoyesJour(n => (n ?? 0) + 1)
    }
    setEnvoi(false)
  }

  return (
    <div className="fdh-chat">
      <div className="fdh-chat-head">
        <button className="fdh-retour" onClick={onRetour}>‹</button>
        <Avatar url={contact.photo_principale} prenom={contact.prenom} taille="38px" />
        <span className="fdh-chat-nom">{contact.prenom}<Badge p={contact} />
          <Presence p={contact} avecTexte /></span>
      </div>

      <div className="fdh-chat-fil">
        {msgs.length === 0 && <p className="fdh-chat-vide">Dis bonjour à {contact.prenom} 👋</p>}
        {msgs.map(m => <Bulle key={m.id} m={m} moi={moi} msgs={msgs} onRepondre={setRepondA} />)}
        <div ref={bas} />
      </div>

      {repondA && (
        <div className="fdh-repondprev">
          <div className="fdh-repondprev-txt">↩ {repondA.contenu}</div>
          <button onClick={() => setRepondA(null)}>✕</button>
        </div>
      )}

      {emoOuvert && (
        <div className="fdh-emojis">
          {EMOJIS.map(e => <button key={e} onClick={() => setTexte(t => t + e)}>{e}</button>)}
        </div>
      )}

      {!abonne && envoyesJour !== null && (
        restants > 0
          ? <div className="fdh-msg-reste">Il te reste <b>{restants}</b> message{restants > 1 ? 's' : ''} aujourd'hui · <span onClick={() => onFaireAbo && onFaireAbo()}>Passer VIP ›</span></div>
          : <button className="fdh-teaser" style={{ margin: '0 .5rem .4rem' }} onClick={() => onFaireAbo && onFaireAbo()}>
              🔒 Limite du jour atteinte — passe VIP pour des messages illimités ›
            </button>
      )}

      <div className="fdh-chat-saisie">
        <button className="fdh-emo-btn" onClick={() => setEmoOuvert(v => !v)} aria-label="Emojis">😊</button>
        <input value={texte} placeholder={!abonne && restants <= 0 ? 'Limite du jour atteinte' : 'Écris un message…'}
          disabled={!abonne && restants <= 0}
          onChange={e => setTexte(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && envoyer()} onFocus={() => setEmoOuvert(false)} />
        <button className="fdh-envoi" onClick={envoyer} disabled={envoi || (!abonne && restants <= 0)}>➤</button>
      </div>
    </div>
  )
}
function Messages({ moi, ouvrir, setOuvrir, onLu, onFaireAbo }) {
  const [matchs, setMatchs] = useState(null)
  const [err, setErr] = useState('')
  const [nonLus, setNonLus] = useState({})
  useEffect(() => {
    if (!moi || ouvrir) return
    let annule = false
    ;(async () => {
      const { data, error } = await supabase.rpc('mes_matchs')
      if (annule) return
      if (error) { setErr(error.message); return }
      setMatchs(data || [])
      // Compter les messages non lus reçus, par expéditeur
      const { data: msgs } = await supabase.from('messages')
        .select('expediteur').eq('destinataire', moi.id).eq('lu', false)
      if (annule) return
      const compte = {}
      ;(msgs || []).forEach(m => { compte[m.expediteur] = (compte[m.expediteur] || 0) + 1 })
      setNonLus(compte)
    })()
    // Temps réel : un nouveau message met à jour la pastille de la bonne conversation
    const canal = supabase.channel('convs-' + moi.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `destinataire=eq.${moi.id}` },
        payload => setNonLus(c => ({ ...c, [payload.new.expediteur]: (c[payload.new.expediteur] || 0) + 1 })))
      .subscribe()
    return () => { annule = true; supabase.removeChannel(canal) }
  }, [moi, ouvrir])
  if (ouvrir) return <Chat moi={moi} contact={ouvrir} onRetour={() => setOuvrir(null)} onLu={onLu} onFaireAbo={onFaireAbo} />
  if (err) return <div className="fdh-msg">{err}</div>
  if (matchs === null) return <div className="fdh-msg">Chargement…</div>
  if (matchs.length === 0)
    return <div className="fdh-vide-etat"><div className="fdh-vide-emoji">💬</div>
      <p>Aucune conversation pour l'instant.</p>
      <p className="fdh-vide-sous">Tes matchs apparaîtront ici. Fais un match pour discuter !</p></div>
  return (
    <div className="fdh-convs">
      {matchs.map(p => (
        <button key={p.id} className="fdh-conv" onClick={() => setOuvrir(p)}>
          <Avatar url={p.photo_principale} prenom={p.prenom} taille="52px" />
          <div className="fdh-conv-txt"><div className="fdh-conv-nom">{p.prenom}<Badge p={p} size={16} /></div>
            <div className={'fdh-conv-apercu' + (nonLus[p.id] ? ' fort' : '')}>
              {nonLus[p.id] ? `${nonLus[p.id]} nouveau${nonLus[p.id] > 1 ? 'x' : ''} message${nonLus[p.id] > 1 ? 's' : ''}` : 'Appuie pour discuter'}</div></div>
          {nonLus[p.id] > 0 && <span className="fdh-conv-badge">{nonLus[p.id] > 9 ? '9+' : nonLus[p.id]}</span>}
          <span className="fdh-conv-fleche">›</span>
        </button>
      ))}
    </div>
  )
}

/* ---------------- Onglet : Visites (réservé VIP) ---------------- */
// Messages par jour pour un membre non abonné
const LIMITE_MSG_JOUR = 5

function estAbonne(moi) {
  return moi?.abo_statut === 'actif' && moi?.abo_expire_at && new Date(moi.abo_expire_at) > new Date()
}
function Visites({ moi, onVoir, onFaireAbo, onDiscuter }) {
  const [liste, setListe] = useState(null)
  const [err, setErr] = useState('')
  const [aimeEnCours, setAimeEnCours] = useState(null)
  const [aimes, setAimes] = useState({})
  const [nouveauMatch, setNouveauMatch] = useState(null)
  const abonne = estAbonne(moi)

  // Aimer un visiteur depuis sa carte
  async function aimer(p) {
    if (aimeEnCours || aimes[p.id]) return
    setAimeEnCours(p.id)
    try {
      const { error } = await supabase.from('likes').insert({ auteur_id: moi.id, cible_id: p.id, aime: true })
      if (error && !/duplicate|unique/i.test(error.message || '')) throw error
      setAimes(a => ({ ...a, [p.id]: true }))
      const { data } = await supabase.rpc('est_un_match', { p_cible: p.id })
      if (data === true) setNouveauMatch(p)
    } catch (e) {
      setErr("Impossible d'enregistrer ton j'aime. Réessaie.")
    } finally { setAimeEnCours(null) }
  }

  useEffect(() => {
    if (!moi || !abonne) return
    let annule = false
    ;(async () => {
      const { data, error } = await supabase.rpc('qui_a_vu_mon_profil')
      if (annule) return
      if (error) { setErr(error.message); return }
      const avec = await ajouterPresence(data)
      if (!annule) setListe(avec)
    })()
    return () => { annule = true }
  }, [moi, abonne])

  if (!abonne)
    return (
      <div className="fdh-vide-etat">
        <div className="fdh-vide-emoji">🔒</div>
        <p>Qui a vu ton profil ?</p>
        <p className="fdh-vide-sous">Réservé aux membres <b>VIP</b>. Découvre qui s'intéresse à toi et prends l'avantage.</p>
        <button className="fdh-btn-rose" style={{ marginTop: '1rem' }} onClick={onFaireAbo}>Devenir membre VIP</button>
      </div>
    )

  if (err) return <div className="fdh-msg">{err}</div>
  if (liste === null) return <div className="fdh-msg">Chargement…</div>
  if (liste.length === 0)
    return <div className="fdh-vide-etat"><div className="fdh-vide-emoji">👀</div>
      <p>Personne n'a encore vu ton profil.</p>
      <p className="fdh-vide-sous">Complète ton profil et tes photos pour attirer plus de visites.</p></div>

  return (
    <div>
      <p className="fdh-affs-info">Ils ont consulté ton profil 👀</p>
      <div className="fdh-grid2">
        {liste.map(p => (
          <div key={p.id} className="fdh-carte fdh-carte-b">
            <button className="fdh-carte-photo" onClick={() => onVoir(p.id)}><Avatar url={p.photo_principale} prenom={p.prenom} taille="100%" /></button>
            <div className="fdh-nom"><Presence p={p} />{p.prenom}{ageDepuis(p.date_naissance) ? `, ${ageDepuis(p.date_naissance)}` : ''}<Badge p={p} size={16} /></div>
            <div className="fdh-2btn">
              <button className="b-profil" onClick={() => onVoir(p.id)}>Profil</button>
              <button className="b-coeur" disabled={aimeEnCours === p.id || !!aimes[p.id]}
                onClick={() => aimer(p)} aria-label="Aimer">
                {aimeEnCours === p.id ? '…' : (aimes[p.id] ? '✓' : '❤')}
              </button>
            </div>
          </div>
        ))}
      </div>
      {nouveauMatch && (
        <div className="fdh-match"><div className="fdh-match-box">
          <div className="fdh-match-emoji">🎉</div><h2>C'est un match !</h2>
          <p>Toi et {nouveauMatch.prenom} vous êtes aimés.</p>
          <div className="fdh-2btn" style={{ marginTop: '.9rem', padding: 0 }}>
            <button className="b-profil" onClick={() => setNouveauMatch(null)}>Plus tard</button>
            <button className="b-disc" onClick={() => { const q = nouveauMatch; setNouveauMatch(null); onDiscuter && onDiscuter(q) }}>Discuter</button>
          </div>
        </div></div>
      )}
    </div>
  )
}

/* ---------------- Abonnement VIP (modal, 3 formules) ---------------- */
const MSG_ATTENTE = [
  '📲 Une demande de paiement vient d\'être envoyée sur votre téléphone.',
  '🔐 Composez votre code PIN Mobile Money pour valider.',
  '⏳ Ne quittez pas cet écran, le paiement est en cours…',
  '🔎 Vérification de la transaction en cours…',
  '💜 Encore quelques instants, on y est presque…',
]
// Affichage du prix dans la devise du membre.
// Le taux euro est FIXE (parité FCFA), les autres sont approximatifs : d'où le « ≈ ».
const TAUX_FCFA = { XAF: 1, XOF: 1, EUR: 655.957, CHF: 700, USD: 600, CAD: 440, GBP: 780 }
const SYMBOLE_DEVISE = { XAF: 'FCFA', XOF: 'FCFA', EUR: '€', CHF: 'CHF', USD: '$', CAD: 'C$', GBP: '£' }

function prixDansDevise(prixFcfa, devise) {
  const d = devise || 'XAF'
  const taux = TAUX_FCFA[d]
  if (!taux || d === 'XAF' || d === 'XOF') return { principal: prixFcfa.toLocaleString('fr-FR') + ' F', secondaire: null }
  const v = prixFcfa / taux
  const arrondi = v < 10 ? Math.round(v * 10) / 10 : Math.round(v)
  return {
    principal: '≈ ' + arrondi.toLocaleString('fr-FR') + ' ' + (SYMBOLE_DEVISE[d] || d),
    secondaire: prixFcfa.toLocaleString('fr-FR') + ' FCFA',
  }
}

const PLANS = [
  { id: 'bienvenue', nom: 'Bienvenue', prix: 1000, jours: 30, note: '1ᵉʳ mois découverte' },
  { id: 'hebdo', nom: 'Hebdo', prix: 1500, jours: 7, note: '1 semaine' },
  { id: 'mensuel', nom: 'Mensuel', prix: 5000, jours: 30, note: 'le plus complet' },
]

function Abonnement({ moi, onFini, onClose }) {
  const dejaAbonne = !!moi?.abo_debut_at   // a déjà souscrit au moins une fois
  // 1er achat : on n'affiche que « Bienvenue » en actif, les deux autres sont grisés
  // (ils font paraître l'offre de lancement plus intéressante). Après le 1er paiement,
  // « Bienvenue » disparaît et les deux formules standard deviennent disponibles.
  const plansDispo = dejaAbonne ? PLANS.filter(p => p.id !== 'bienvenue') : PLANS
  const planDispo = (x) => dejaAbonne ? x.id !== 'bienvenue' : x.id === 'bienvenue'
  const [tel, setTel] = useState('')
  const [plan, setPlan] = useState(plansDispo.find(planDispo) || plansDispo[0])
  const [etape, setEtape] = useState('plans') // plans | methode | numero | attente | ok | echec
  const [operateur, setOperateur] = useState('')
  const [msg, setMsg] = useState('')
  const [idx, setIdx] = useState(0)

  const estCameroun = (moi?.pays_residence || 'CM') === 'CM'

  useEffect(() => {
    if (etape !== 'attente') return
    const t = setInterval(() => setIdx(i => (i + 1) % MSG_ATTENTE.length), 3500)
    return () => clearInterval(t)
  }, [etape])

  async function payer() {
    const num = tel.replace(/\s+/g, '')
    if (!/^(\+?237)?6\d{8}$/.test(num)) { setMsg('Numéro MTN/Orange invalide (ex : 6XXXXXXXX).'); return }
    setEtape('attente'); setIdx(0); setMsg('')
    try {
      const r = await fetch('/api/campay-collect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ montant: plan.prix, jours: plan.jours, telephone: num, user_id: moi.id })
      })
      const d = await r.json()
      if (!r.ok || !d.reference) { setEtape('echec'); setMsg(d.error || 'Paiement refusé. Réessaie.'); return }
      const ref = d.reference
      let n = 0
      const timer = setInterval(async () => {
        n++
        try {
          const s = await fetch('/api/campay-status?reference=' + ref)
          const sd = await s.json()
          if (sd.status === 'SUCCESSFUL') { clearInterval(timer); setEtape('ok'); onFini && onFini() }
          else if (sd.status === 'FAILED') { clearInterval(timer); setEtape('echec'); setMsg('Paiement échoué' + (sd.reason ? ' : ' + sd.reason : ' ou annulé.')) }
        } catch (_) {}
        if (n > 30) { clearInterval(timer); setEtape(e => e === 'ok' ? e : 'echec'); setMsg("Délai dépassé. Si tu as bien payé, ton abonnement s'activera sous peu.") }
      }, 4000)
    } catch (e) { setEtape('echec'); setMsg('Connexion au paiement impossible (teste sur le site en ligne).') }
  }

  async function payerChariow() {
    setMsg(''); setEtape('redir')   // retour visuel IMMÉDIAT
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const r = await fetch('/api/chariow-checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.id, user_id: moi.id, email: user?.email, first_name: moi.prenom, phone: tel || moi.telephone, pays: moi.pays_residence })
      })
      const d = await r.json()
      if (d.checkout_url) { window.location.href = d.checkout_url; return }
      setEtape('methode'); setMsg(d.error || 'Paiement carte indisponible pour le moment.')
    } catch (e) { setEtape('methode'); setMsg('Connexion impossible (teste sur le site en ligne).') }
  }

  const enAttente = etape === 'attente' || etape === 'redir'

  return (
    <div className="fdh-modal-fond" onClick={enAttente ? undefined : onClose}>
      <div className="fdh-modal" onClick={e => e.stopPropagation()}>
        {!enAttente && etape !== 'ok' && <button className="fdh-modal-x" onClick={onClose} aria-label="Fermer">✕</button>}

        {etape === 'ok' ? (
          <div className="fdh-modal-fin">
            <div className="fdh-modal-emoji">🎉</div>
            <h2>Bienvenue chez les VIP !</h2>
            <p>Ton abonnement est activé. Tu as accès à toutes les fonctionnalités premium.</p>
            <button className="fdh-btn-rose" style={{ width: '100%' }} onClick={onClose}>Continuer</button>
          </div>

        ) : etape === 'redir' ? (
          <div className="fdh-modal-attente">
            <div className="fdh-spinner" />
            <h3 style={{ marginTop: '1rem' }}>Redirection vers le paiement sécurisé…</h3>
            <p className="fdh-attente-note">Merci de patienter quelques secondes, la page de paiement va s'ouvrir.</p>
          </div>

        ) : etape === 'attente' ? (
          <div className="fdh-modal-attente">
            <div className="fdh-attente-emoji">⏳</div>
            <h3>Finalisation du paiement…</h3>
            <div className="fdh-attente-alerte">⚠️ NE QUITTE PAS CET ÉCRAN jusqu'à la fin du paiement</div>
            <p className="fdh-attente-note">🔔 Un message va apparaître sur ton téléphone. Compose ton code PIN. Cela peut prendre jusqu'à 30 secondes.</p>
            <div className="fdh-spinner" />
            <p className="fdh-attente-msg">{MSG_ATTENTE[idx]}</p>
          </div>

        ) : etape === 'echec' ? (
          <div className="fdh-modal-fin">
            <div className="fdh-modal-emoji">😕</div>
            <h2>Paiement non abouti</h2>
            <p>{msg || "Le paiement n'a pas pu être finalisé."}</p>
            <button className="fdh-btn-rose" style={{ width: '100%' }} onClick={() => { setMsg(''); setEtape('methode') }}>Réessayer</button>
            <button className="fdh-btn-texte" onClick={onClose}>Fermer</button>
          </div>

        ) : etape === 'methode' ? (
          <>
            <div className="fdh-modal-badge">{plan.nom} · {plan.prix.toLocaleString('fr-FR')} F</div>
            <h2 className="fdh-methode-titre">Choisis ta méthode</h2>
            <p className="fdh-modal-sous">Avec quel moyen veux-tu payer ?</p>
            {estCameroun ? (
              <>
                <button className="fdh-btn-mtn" onClick={() => { setMsg(''); setOperateur('MTN'); setEtape('numero') }}>📱 MTN Mobile Money</button>
                <button className="fdh-btn-orange" onClick={() => { setMsg(''); setOperateur('ORANGE'); setEtape('numero') }}>📱 Orange Money</button>
              </>
            ) : (
              <button className="fdh-btn-rose" style={{ width: '100%', marginTop: '.6rem' }} onClick={payerChariow}>💳 Payer par carte / Mobile Money</button>
            )}
            {msg && <div className="fdh-abo-msg err">{msg}</div>}
            <button className="fdh-btn-texte" onClick={() => setEtape('plans')}>← Retour</button>
          </>

        ) : etape === 'numero' ? (
          <div className="fdh-numero">
            <h2 className="fdh-numero-titre">Entre ton numéro {operateur}</h2>
            <p className="fdh-numero-sous">9 chiffres, sans +237</p>
            <input className="fdh-numero-in" value={tel} placeholder="6XXXXXXXX" inputMode="numeric"
              onChange={e => setTel(e.target.value)} />
            {msg && <div className="fdh-abo-msg err">{msg}</div>}
            <button className="fdh-btn-rose" style={{ width: '100%', marginTop: '1rem' }} onClick={payer}>
              💎 Payer {plan.prix.toLocaleString('fr-FR')} FCFA
            </button>
            <button className="fdh-btn-texte" onClick={() => { setMsg(''); setEtape('methode') }}>← Retour</button>
          </div>

        ) : (
          <>
            <div className="fdh-modal-badge">Membre VIP</div>
            <p className="fdh-modal-sous">Débloque : qui t'a vue, qui t'a aimée, tes % d'affinité et les messages illimités.</p>
            <div className="fdh-plans">
              {plansDispo.map(p => {
                const px = prixDansDevise(p.prix, moi?.devise)
                return (
                <button key={p.id} type="button" disabled={!planDispo(p)}
                  className={'fdh-plan' + (plan.id === p.id ? ' on' : '') + (planDispo(p) ? '' : ' bloque')}
                  onClick={() => planDispo(p) && setPlan(p)}>
                  <div className="fdh-plan-nom">{p.nom}</div>
                  <div className="fdh-plan-prix">{px.principal}</div>
                  {px.secondaire && <div className="fdh-av-eq">{px.secondaire}</div>}
                  <div className="fdh-plan-note">{planDispo(p) ? p.note : '🔒 après ton 1ᵉʳ abonnement'}</div>
                </button>
                )
              })}
            </div>
            <button className="fdh-btn-rose" style={{ width: '100%', marginTop: '1.2rem' }}
              onClick={() => { setMsg(''); estCameroun ? setEtape('methode') : payerChariow() }}>
              Payer {prixDansDevise(plan.prix, moi?.devise).principal}
            </button>
            <p className="fdh-abo-note">Paiement sécurisé · {estCameroun ? 'Mobile Money (MTN & Orange)' : 'Carte / Mobile Money'}</p>
          </>
        )}
      </div>
    </div>
  )
}

/* ---------------- Changer mon mot de passe ---------------- */
function MotDePasse({ onClose }) {
  const [mdp, setMdp] = useState('')
  const [mdp2, setMdp2] = useState('')
  const [voir, setVoir] = useState(false)
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)
  const [envoi, setEnvoi] = useState(false)

  async function changer() {
    setMsg('')
    if (mdp.length < 6) return setMsg('6 caractères minimum.')
    if (mdp !== mdp2) return setMsg('Les deux mots de passe ne correspondent pas.')
    setEnvoi(true)
    const { error } = await supabase.auth.updateUser({ password: mdp })
    setEnvoi(false)
    if (error) setMsg(error.message || 'Erreur. Réessaie.')
    else { setOk(true) }
  }

  return (
    <div className="fdh-modal-fond" onClick={onClose}>
      <div className="fdh-modal" onClick={e => e.stopPropagation()}>
        <button className="fdh-modal-x" onClick={onClose}>✕</button>
        {ok ? (
          <div className="fdh-modal-fin">
            <div className="fdh-modal-emoji">🔒</div>
            <h2>Mot de passe modifié</h2>
            <p>Ton nouveau mot de passe est enregistré.</p>
            <button className="fdh-btn-rose" style={{ width: '100%' }} onClick={onClose}>Terminé</button>
          </div>
        ) : (
          <>
            <h2 className="fdh-quest-titre">Changer mon mot de passe</h2>
            <label className="fdh-l">Nouveau mot de passe</label>
            <div className="fdh-pass">
              <input className="fdh-in" type={voir ? 'text' : 'password'} value={mdp}
                onChange={e => setMdp(e.target.value)} placeholder="6 caractères min." />
              <button type="button" className="fdh-eye" onClick={() => setVoir(v => !v)}>{voir ? '🙈' : '👁️'}</button>
            </div>
            <label className="fdh-l">Confirme le mot de passe</label>
            <input className="fdh-in" type={voir ? 'text' : 'password'} value={mdp2}
              onChange={e => setMdp2(e.target.value)} placeholder="Retape le même" />
            {msg && <div className="fdh-abo-msg err">{msg}</div>}
            <button className="fdh-btn-rose" style={{ width: '100%', marginTop: '1rem' }}
              onClick={changer} disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
          </>
        )}
      </div>
    </div>
  )
}

/* ============================================================ */
/* ---------------- Annonces (recherche de l'âme sœur) ---------------- */
function Annonces({ moi, onVoir, onDiscuter }) {
  const [liste, setListe] = useState(null)
  const [err, setErr] = useState('')
  const [edition, setEdition] = useState(false)
  const [texte, setTexte] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const mienne = (liste || []).find(a => a.auteur_id === moi.id) || null

  async function charger() {
    setErr('')
    const { data, error } = await supabase.from('annonces')
      .select('id, auteur_id, contenu, cree_at, modifie_at').order('cree_at', { ascending: false }).limit(100)
    if (error) { setErr(error.message); setListe([]); return }
    const ids = (data || []).map(a => a.auteur_id)
    let profils = {}
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles')
        .select('id, prenom, date_naissance, ville, pays_residence, photo_principale, derniere_activite, verifie, abo_statut, abo_expire_at')
        .in('id', ids)
      for (const p of (ps || [])) profils[p.id] = p
    }
    setListe((data || []).map(a => ({ ...a, p: profils[a.auteur_id] })).filter(a => a.p))
  }
  useEffect(() => { if (moi) charger() }, [moi]) // eslint-disable-line

  function messageErreur(m) {
    const t = (m || '').toUpperCase()
    if (t.includes('NUMERO') || t.includes('EMAIL') || t.includes('LIEN'))
      return "Pour ta sécurité, les numéros de téléphone, e-mails et liens ne sont pas autorisés dans les annonces. Une fois que quelqu'un te plaît, tu pourras lui écrire en privé."
    return "Enregistrement impossible. Réessaie."
  }

  async function publier() {
    const t = texte.trim()
    if (t.length < 20) { setErr("Écris au moins quelques phrases (20 caractères minimum)."); return }
    setEnvoi(true); setErr('')
    try {
      if (mienne) {
        const { error } = await supabase.from('annonces').update({ contenu: t }).eq('id', mienne.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('annonces').insert({ auteur_id: moi.id, contenu: t })
        if (error) throw error
      }
      setEdition(false); setTexte(''); await charger()
    } catch (e) { setErr(messageErreur(e.message)) } finally { setEnvoi(false) }
  }

  async function supprimer() {
    if (!mienne) return
    if (!window.confirm('Supprimer ton annonce ?')) return
    await supabase.from('annonces').delete().eq('id', mienne.id)
    await charger()
  }

  if (liste === null) return <div className="fdh-msg">Chargement…</div>

  return (
    <div>
      {!edition && (
        <div className="fdh-annonce-intro">
          <p className="fdh-annonce-accroche">Publie une annonce et trouve ton âme sœur</p>
          <button className="fdh-annonce-cta" onClick={() => { setTexte(mienne ? mienne.contenu : ''); setEdition(true); setErr('') }}>
            {mienne ? '✏️ Modifier mon annonce' : '📢 Publier mon annonce'}
          </button>
        </div>
      )}

      {edition && (
        <div className="fdh-panneau">
          <label className="fdh-f-l">Ton annonce</label>
          <textarea className="fdh-f-in" rows={6} value={texte} maxLength={1000}
            placeholder="Ex. Veuve depuis 4 ans, je cherche un homme croyant, calme et attentionné, pour construire une vie à deux…"
            onChange={e => setTexte(e.target.value)} />
          <p className="fdh-f-nb" style={{ textAlign: 'left', margin: '.3rem 0 0' }}>
            🔒 Pas de numéro de téléphone, d'e-mail ni de lien — {1000 - texte.length} caractères restants
          </p>
          {err && <div className="fdh-abo-msg err">{err}</div>}
          <div className="fdh-2btn" style={{ padding: '.8rem 0 0' }}>
            <button className="b-profil" onClick={() => { setEdition(false); setErr('') }}>Annuler</button>
            <button className="b-disc" disabled={envoi} onClick={publier}>{envoi ? '…' : 'Publier'}</button>
          </div>
        </div>
      )}

      {!edition && err && <div className="fdh-abo-msg err">{err}</div>}

      {liste.length === 0
        ? <div className="fdh-vide-etat"><div className="fdh-vide-emoji">📢</div>
            <p>Aucune annonce pour l'instant.</p>
            <p className="fdh-vide-sous">Sois la première personne à dire ce que tu recherches.</p></div>
        : liste.map(a => {
            const p = a.p, moi_meme = a.auteur_id === moi.id
            return (
              <div key={a.id} className={'fdh-annonce' + (moi_meme ? ' mienne' : '')}>
                <div className="fdh-annonce-tete">
                  <button className="fdh-annonce-av" onClick={() => onVoir(p.id)}>
                    <Avatar url={p.photo_principale} prenom={p.prenom} taille="100%" />
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="fdh-annonce-nom">
                      {moi_meme ? 'Ton annonce' : <>{p.prenom}{ageDepuis(p.date_naissance) ? `, ${ageDepuis(p.date_naissance)}` : ''}<Badge p={p} size={15} /></>}
                    </div>
                    <div className="fdh-annonce-lieu">
                      📍 {p.ville ? p.ville + ' · ' : ''}{NOM_PAYS[p.pays_residence] || p.pays_residence}
                    </div>
                    <Presence p={p} avecTexte />
                  </div>
                  {moi_meme && (
                    <>
                      <button className="fdh-annonce-ic" onClick={() => { setTexte(a.contenu); setEdition(true) }} aria-label="Modifier">✏️</button>
                      <button className="fdh-annonce-ic sup" onClick={supprimer} aria-label="Supprimer">🗑️</button>
                    </>
                  )}
                </div>
                <p className="fdh-annonce-txt">{a.contenu}</p>
                {!moi_meme && (
                  <button className="fdh-annonce-disc" onClick={() => onDiscuter(p)}>💬 Discute avec moi</button>
                )}
              </div>
            )
          })}
    </div>
  )
}

/* ---------------- Page S.Admin (réservée à l'admin) ---------------- */
// [cle, emoji, libelle, champ renvoye par admin_actions, description]
const ONGLETS_ACTION = [
  ['pwa', '📲', 'PWA', 'pwa', "Membres qui ont installé l'application"],
  ['ecrit', '✍️', 'Écrit', 'ecrit', 'Membres qui ont écrit un message'],
  ['affin', '✨', 'Affinité', 'affinites', 'Membres qui ont répondu au questionnaire'],
  ['match', '💞', 'Match', 'matchs', 'Matchs créés'],
  ['enligne', '🟢', 'En ligne', 'en_ligne', 'Membres actifs sur la période'],
  ['annonce', '📢', 'Annonces', 'annonces', 'Annonces publiées'],
  ['abo', '⭐', 'Abonnés', 'abonnes', 'Membres avec un abonnement en cours'],
]

function Admin({ onVoir }) {
  const [vue, setVue] = useState('bord') // bord | membres | pays | paiements | signal
  const [membres, setMembres] = useState(null)
  const [paiements, setPaiements] = useState(null)
  const [signalements, setSignalements] = useState([])
  const [vuSignal, setVuSignal] = useState(() => {
    try { return localStorage.getItem('fd_signal_vu') || '' } catch (_) { return '' }
  })
  // Pastille = uniquement les signalements arrivés depuis la dernière consultation
  const nouveauxSignal = signalements.filter(s => !vuSignal || (s.cree_at && s.cree_at > vuSignal)).length
  const [recherche, setRecherche] = useState('')
  const [msg, setMsg] = useState('')
  // Une seule période, partagée par toutes les vues
  const [periode, setPeriode] = useState('jour')
  const [aVerifier, setAVerifier] = useState(null)
  const [actions, setActions] = useState(null)
  const [chargeAct, setChargeAct] = useState(false)
  const [errAct, setErrAct] = useState('')

  // Bornes de la période choisie (début inclus, fin exclue)
  function bornes(p) {
    const d = new Date(); d.setHours(0, 0, 0, 0)
    const demain = new Date(d); demain.setDate(demain.getDate() + 1)
    if (p === 'jour') return { debut: d, fin: demain }
    if (p === 'hier') { const h = new Date(d); h.setDate(h.getDate() - 1); return { debut: h, fin: d } }
    if (p === 'semaine') { const s = new Date(d); s.setDate(s.getDate() - ((d.getDay() + 6) % 7)); return { debut: s, fin: demain } }
    if (p === 'mois') { const m = new Date(d); m.setDate(1); return { debut: m, fin: demain } }
    if (p === 'annee') { const a = new Date(d); a.setMonth(0, 1); return { debut: a, fin: demain } }
    return { debut: null, fin: null } // tout
  }
  const dansPeriode = (dateStr, p) => {
    const { debut, fin } = bornes(p)
    if (!debut) return true
    if (!dateStr) return false
    const t = new Date(dateStr)
    return t >= debut && t < fin
  }
  const PERIODES = [['jour', "Aujourd'hui"], ['hier', 'Hier'], ['semaine', 'Cette semaine'], ['mois', 'Ce mois'], ['annee', 'Cette année'], ['tout', 'Tout']]
  const FiltrePeriode = () => (
    <select className="fdh-per-sel" value={periode} onChange={e => setPeriode(e.target.value)}>
      {PERIODES.map(([k, lbl]) => <option key={k} value={k}>{lbl}</option>)}
    </select>
  )

  useEffect(() => {
    ;(async () => {
      const { data: m } = await supabase.from('profiles')
        .select('id, prenom, date_naissance, genre, pays_residence, ville, photo_principale, telephone, abo_statut, abo_expire_at, bloque, cree_at')
        .order('cree_at', { ascending: false }).limit(500)
      setMembres(m || [])
      // Paiements : via l'API admin (contourne la RLS, réservé à l'admin)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const r = await fetch('/api/admin-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session?.access_token || '') },
        })
        const d = await r.json()
        setPaiements(r.ok ? (d.paiements || []) : [])
        setSignalements(r.ok ? (d.signalements || []) : [])
      } catch (_) { setPaiements([]) }
    })()
  }, [])

  const abonneActif = (x) => x?.abo_statut === 'actif' && x?.abo_expire_at && new Date(x.abo_expire_at) > new Date()

  // Chargement des chiffres « Actions des membres » (fonction SQL admin_actions)
  useEffect(() => {
    if (vue !== 'bord') return
    let annule = false
    ;(async () => {
      setChargeAct(true); setErrAct('')
      const { debut, fin } = bornes(periode)
      const { data, error } = await supabase.rpc('admin_actions', {
        p_debut: debut ? debut.toISOString() : null,
        p_fin: fin ? fin.toISOString() : null,
      })
      if (annule) return
      if (error) { setErrAct("Lance d'abord le SQL admin_actions dans Supabase."); setActions(null) }
      else setActions(data)
      setChargeAct(false)
    })()
    return () => { annule = true }
  }, [vue, periode]) // eslint-disable-line

  // File d'attente des vérifications (selfie envoyé, pas encore validé)
  useEffect(() => {
    if (vue !== 'verif') return
    let annule = false
    ;(async () => {
      setAVerifier(null)
      const { data } = await supabase.from('profiles')
        .select('id, prenom, date_naissance, photo_principale, selfie_url, verifie, pays_residence')
        .not('selfie_url', 'is', null).eq('verifie', false).limit(50)
      if (!annule) setAVerifier(data || [])
    })()
    return () => { annule = true }
  }, [vue])

  async function validerProfil(id, ok) {
    setMsg('')
    const { error } = await supabase.rpc('valider_profil', { p_id: id, p_ok: ok })
    if (error) { setMsg("Validation refusée : vérifie l'email admin dans la fonction SQL."); return }
    setAVerifier(l => (l || []).filter(x => x.id !== id))
  }

  // Ouvrir l'onglet Signalé marque les signalements comme vus (la pastille s'éteint)
  useEffect(() => {
    if (vue !== 'signal' || signalements.length === 0) return
    const plusRecent = signalements.reduce((max, s) => (s.cree_at && s.cree_at > max ? s.cree_at : max), '')
    if (plusRecent && plusRecent !== vuSignal) {
      setVuSignal(plusRecent)
      try { localStorage.setItem('fd_signal_vu', plusRecent) } catch (_) {}
    }
  }, [vue, signalements]) // eslint-disable-line

  // Statistiques sur la période choisie
  const stats = (() => {
    const ms = (membres || []).filter(x => dansPeriode(x.cree_at, periode))
    const ps = (paiements || []).filter(x => dansPeriode(x.cree_at || x.created_at, periode))
    const total = ms.length
    const hommes = ms.filter(x => x.genre === 'homme').length
    const femmes = ms.filter(x => x.genre === 'femme').length
    const bloques = ms.filter(x => x.bloque).length
    const revenus = ps.reduce((s, p) => s + (Number(p.montant) || 0), 0)
    return { total, hommes, femmes, bloques, revenus }
  })()

  // Répartition par pays (sur la période choisie)
  const parPays = (() => {
    const ms = (membres || []).filter(x => dansPeriode(x.cree_at, periode))
    const cpt = {}
    for (const m of ms) { const c = m.pays_residence || '??'; cpt[c] = (cpt[c] || 0) + 1 }
    return Object.entries(cpt).sort((a, b) => b[1] - a[1])
  })()

  async function appelAdmin(payload) {
    const { data: { session } } = await supabase.auth.getSession()
    const r = await fetch('/api/admin-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session?.access_token || '') },
      body: JSON.stringify(payload),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d.error || 'Action refusée')
    return d
  }

  async function basculerBlocage(m) {
    setMsg('')
    const nouv = !m.bloque
    try { await appelAdmin({ action: 'bloquer', id: m.id, valeur: nouv }) }
    catch (e) { setMsg('Échec : ' + e.message); return }
    setMembres(list => list.map(x => x.id === m.id ? { ...x, bloque: nouv } : x))
    setSignalements(list => list.map(s => s.signale_id === m.id ? { ...s, signale_bloque: nouv } : s))
  }

  async function basculerBlocageId(id, nouv) {
    setMsg('')
    try { await appelAdmin({ action: 'bloquer', id, valeur: nouv }) }
    catch (e) { setMsg('Échec : ' + e.message); return }
    setMembres(list => list.map(x => x.id === id ? { ...x, bloque: nouv } : x))
    setSignalements(list => list.map(s => s.signale_id === id ? { ...s, signale_bloque: nouv } : s))
  }

  async function supprimerMembre(m) {
    if (!window.confirm(`Supprimer définitivement le profil de ${m.prenom} ? Cette action est irréversible.`)) return
    setMsg('')
    try { await appelAdmin({ action: 'supprimer', id: m.id }) }
    catch (e) { setMsg('Échec : ' + e.message); return }
    setMembres(list => list.filter(x => x.id !== m.id))
  }

  const membresFiltres = (membres || []).filter(m => {
    if (!dansPeriode(m.cree_at, periode)) return false
    if (!recherche.trim()) return true
    const q = recherche.toLowerCase()
    return (m.prenom || '').toLowerCase().includes(q)
      || (m.ville || '').toLowerCase().includes(q)
      || (m.telephone || '').includes(q)
  })
  const paiementsFiltres = (paiements || []).filter(p => dansPeriode(p.cree_at || p.created_at, periode))

  if (membres === null) return <div className="fdh-msg">Chargement…</div>

  return (
    <div className="fdh-admin">
      <div className="fdh-adm-tete">
        <h2 className="fdh-admin-titre">🛡️ Espace Admin</h2>
        <FiltrePeriode />
      </div>
      <div className="fdh-sousongl">
        <button className={'fdh-sous' + (vue === 'bord' ? ' on' : '')} onClick={() => setVue('bord')}>Bord</button>
        <button className={'fdh-sous' + (vue === 'membres' ? ' on' : '')} onClick={() => setVue('membres')}>Users</button>
        <button className={'fdh-sous' + (vue === 'pays' ? ' on' : '')} onClick={() => setVue('pays')}>Pays</button>
        <button className={'fdh-sous' + (vue === 'verif' ? ' on' : '')} onClick={() => setVue('verif')}>Vérif</button>
        <button className={'fdh-sous' + (vue === 'paiements' ? ' on' : '')} onClick={() => setVue('paiements')}>Payé</button>
        <button className={'fdh-sous' + (vue === 'signal' ? ' on' : '')} onClick={() => setVue('signal')}>
          Signalé{nouveauxSignal > 0 && <span className="fdh-sous-pastille">{nouveauxSignal}</span>}
        </button>
      </div>
      {msg && <div className="fdh-abo-msg err">{msg}</div>}

      {vue === 'bord' && (
        <div>
          {/* Chiffres à l'instant, indépendants de la période */}
          <div className="fdh-live">
            <div className="fdh-live-item"><b>{actions?.abonnes ?? '—'}</b> abonnés actifs</div>
            <div className="fdh-live-item"><b>{actions?.maintenant ?? '—'}</b> en ligne maintenant</div>
          </div>

          <div className="fdh-stats">
            <div className="fdh-stat"><div className="fdh-stat-n">{stats.total}</div><div className="fdh-stat-l">Nouveaux membres</div></div>
            <div className="fdh-stat or"><div className="fdh-stat-n">{stats.revenus.toLocaleString('fr-FR')} F</div><div className="fdh-stat-l">Revenus encaissés</div></div>
            <div className="fdh-stat"><div className="fdh-stat-n">{stats.hommes}</div><div className="fdh-stat-l">Hommes</div></div>
            <div className="fdh-stat"><div className="fdh-stat-n">{stats.femmes}</div><div className="fdh-stat-l">Femmes</div></div>
            <div className="fdh-stat"><div className="fdh-stat-n">{stats.bloques}</div><div className="fdh-stat-l">Bloqués</div></div>
            <div className="fdh-stat"><div className="fdh-stat-n">{parPays.length}</div><div className="fdh-stat-l">Pays représentés</div></div>
          </div>

          <div className="fdh-adm-soustitre">Activité des membres</div>
          {errAct && <div className="fdh-abo-msg err">{errAct}</div>}
          {chargeAct && <p className="fdh-msg">Chargement…</p>}
          {!chargeAct && actions && (
            <div className="fdh-stats">
              {ONGLETS_ACTION.filter(o => o[0] !== 'abo').map(([k, emo, lbl, champ]) => (
                <div key={k} className="fdh-stat"><div className="fdh-stat-n">{actions[champ] ?? 0}</div><div className="fdh-stat-l">{emo} {lbl}</div></div>
              ))}
            </div>
          )}
        </div>
      )}

      {vue === 'pays' && (
        <div>
          {parPays.length === 0
            ? <p className="fdh-msg">Aucun membre sur cette période.</p>
            : <div className="fdh-adm-liste">
                {parPays.map(([code, n]) => (
                  <div key={code} className="fdh-pays-ligne">
                    <span className="fdh-pays-nom">{NOM_PAYS[code] || code}</span>
                    <span className="fdh-pays-barre"><i style={{ width: Math.round((n / parPays[0][1]) * 100) + '%' }} /></span>
                    <b className="fdh-pays-n">{n}</b>
                  </div>
                ))}
              </div>}
        </div>
      )}

      {vue === 'membres' && (
        <div>
          <input className="fdh-ein" style={{ marginBottom: '.8rem' }} value={recherche} placeholder="🔎 Chercher (prénom, ville, téléphone)…" onChange={e => setRecherche(e.target.value)} />
          <div className="fdh-adm-liste">
            {membresFiltres.map(m => (
              <div key={m.id} className={'fdh-adm-membre' + (m.bloque ? ' bloque' : '')}>
                <Avatar url={m.photo_principale} prenom={m.prenom} taille="44px" />
                <div className="fdh-adm-info" onClick={() => onVoir(m.id)}>
                  <div className="fdh-adm-nom">{m.prenom}{ageDepuis(m.date_naissance) ? `, ${ageDepuis(m.date_naissance)}` : ''}{abonneActif(m) ? ' ⭐' : ''}{m.bloque ? ' 🚫' : ''}</div>
                  <div className="fdh-adm-sous">{m.genre || '—'} · {NOM_PAYS[m.pays_residence] || m.pays_residence || '?'}{m.ville ? ' · ' + m.ville : ''}</div>
                </div>
                <div className="fdh-adm-actions">
                  <button className="fdh-adm-btn" onClick={() => basculerBlocage(m)}>{m.bloque ? 'Débloquer' : 'Bloquer'}</button>
                  <button className="fdh-adm-btn danger" onClick={() => supprimerMembre(m)}>🗑️</button>
                </div>
              </div>
            ))}
            {membresFiltres.length === 0 && <p className="fdh-msg">Aucun membre.</p>}
          </div>
        </div>
      )}

      {vue === 'verif' && (
        <div>
          {aVerifier === null && <p className="fdh-msg">Chargement…</p>}
          {aVerifier && aVerifier.length === 0 && <p className="fdh-msg">Aucune demande en attente. 🕊️</p>}
          <div className="fdh-adm-liste">
            {(aVerifier || []).map(v => (
              <div key={v.id} className="fdh-verif">
                <div className="fdh-verif-photos">
                  <figure><img src={v.photo_principale} alt="" /><figcaption>Photo de profil</figcaption></figure>
                  <figure><img src={v.selfie_url} alt="" /><figcaption>Selfie privé</figcaption></figure>
                </div>
                <div className="fdh-verif-bas">
                  <div className="fdh-adm-nom" onClick={() => onVoir(v.id)}>
                    {v.prenom}{ageDepuis(v.date_naissance) ? `, ${ageDepuis(v.date_naissance)}` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: '.4rem' }}>
                    <button className="fdh-adm-btn" onClick={() => validerProfil(v.id, false)}>Refuser</button>
                    <button className="fdh-adm-btn ok" onClick={() => validerProfil(v.id, true)}>Valider ✓</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {vue === 'paiements' && (
        <div>
          <div className="fdh-adm-liste">
            {paiementsFiltres.map((p, k) => (
              <div key={p.id || k} className="fdh-adm-paie">
                <div>
                  <div className="fdh-adm-nom">{(Number(p.montant) || 0).toLocaleString('fr-FR')} {p.devise || 'F'}</div>
                  <div className="fdh-adm-sous">{p.source || '—'} · {p.reference || ''}</div>
                </div>
                <div className="fdh-adm-date">{(p.cree_at || p.created_at) ? new Date(p.cree_at || p.created_at).toLocaleDateString('fr-FR') : ''}</div>
              </div>
            ))}
            {paiementsFiltres.length === 0 && <p className="fdh-msg">Aucun paiement sur cette période.</p>}
          </div>
        </div>
      )}

      {vue === 'signal' && (
        <div className="fdh-adm-liste">
          {signalements.map(s => (
            <div key={s.id} className={'fdh-adm-signal' + (s.signale_bloque ? ' bloque' : '')}>
              <div className="fdh-sig-haut">
                <div className="fdh-sig-cible" onClick={() => onVoir(s.signale_id)}>
                  <div className="fdh-adm-nom">🚩 {s.signale_nom}{s.signale_bloque ? ' 🚫' : ''}</div>
                  <div className="fdh-adm-sous">Signalé {s.signale_nb_recus} fois</div>
                </div>
                <button className={'fdh-adm-btn' + (s.signale_bloque ? '' : ' danger')}
                  onClick={() => basculerBlocageId(s.signale_id, !s.signale_bloque)}>
                  {s.signale_bloque ? 'Débloquer' : 'Bloquer'}
                </button>
              </div>
              <div className="fdh-sig-objet">« {s.objet} »</div>
              <div className="fdh-sig-bas">
                Par <b>{s.signaleur_nom}</b> · a signalé {s.signaleur_nb_faits} fois
                {s.cree_at ? ' · ' + new Date(s.cree_at).toLocaleDateString('fr-FR') : ''}
              </div>
            </div>
          ))}
          {signalements.length === 0 && <p className="fdh-msg">Aucun signalement. 🕊️</p>}
        </div>
      )}
    </div>
  )
}

/* ============================================================ */
function Regles({ onClose }) {
  const regles = [
    ['🤝', 'Respect avant tout', "Courtoisie et bienveillance avec chacun. Insultes, harcèlement, propos haineux ou discriminatoires sont interdits."],
    ['🪪', 'Profils authentiques', "Utilise tes vraies photos et de vraies informations. Les faux profils et les usurpations d'identité sont supprimés."],
    ['🔞', 'Réservé aux adultes 40+', "FortyDate est réservé aux personnes de 40 ans et plus. Aucun contenu impliquant des mineurs n'est toléré."],
    ['🚫', 'Pas de contenu choquant', "Interdit : nudité, contenu sexuel explicite, violence, ou tout contenu illégal."],
    ['💰', "Jamais d'argent", "Ne demande jamais d'argent et n'en envoie jamais. Méfie-toi de toute personne qui te réclame de l'argent ou tes coordonnées bancaires : c'est une arnaque."],
    ['📵', 'Pas de spam ni pub', "Interdit d'utiliser FortyDate pour de la publicité, du démarchage ou envoyer des messages en masse."],
    ['🔒', 'Protège ta vie privée', "Ne partage pas trop vite tes informations personnelles. Ta sécurité passe avant tout."],
    ['🛡️', 'Signale les abus', "Un comportement déplacé ? Signale ou bloque le profil depuis sa fiche. Nos équipes examinent chaque signalement."],
    ['⚖️', 'En cas de non-respect', "Le non-respect de ces règles peut entraîner un avertissement, une suspension ou la suppression définitive du compte."],
  ]
  return (
    <div className="fdh-modal-fond" onClick={onClose}>
      <div className="fdh-modal" onClick={e => e.stopPropagation()}>
        <button className="fdh-modal-x" onClick={onClose}>✕</button>
        <h2 className="fdh-quest-titre">Règles du site</h2>
        <p className="fdh-manuel-intro">Pour que FortyDate reste un espace sûr et agréable, chaque membre s'engage à respecter ces règles.</p>
        {regles.map(([emoji, titre, texte]) => (
          <div key={titre} className="fdh-manuel-bloc">
            <div className="fdh-manuel-titre"><span>{emoji}</span>{titre}</div>
            <p className="fdh-manuel-txt">{texte}</p>
          </div>
        ))}
        <button className="fdh-btn-rose" style={{ width: '100%', marginTop: '.8rem' }} onClick={onClose}>J'accepte ces règles</button>
      </div>
    </div>
  )
}

function Avantages({ moi, onClose, onFaireAbo }) {
  const dejaAbonne = !!moi?.abo_debut_at
  const plansDispo = dejaAbonne ? PLANS.filter(p => p.id !== 'bienvenue') : PLANS
  const planDispo = (x) => dejaAbonne ? x.id !== 'bienvenue' : x.id === 'bienvenue'
  const GRATUIT = [
    "Voir tous les membres à proximité, dans ton pays ou partout",
    "Ouvrir les profils en entier : photos, bio, centres d'intérêt",
    "Feuilleter les profils dans Rencontres, sans limite",
    "Aimer ❤ ou passer ✕ autant que tu veux",
    "Voir tes matchs et discuter avec eux",
    `Envoyer ${LIMITE_MSG_JOUR} messages par jour`,
  ]
  const SERENITE = [
    "👀 Voir qui a consulté ton profil",
    "🔓 Voir qui t'a aimée (photos et prénoms dévoilés)",
    "✨ Voir ton pourcentage d'affinité avec chaque membre",
    "💬 Envoyer des messages illimités",
  ]
  return (
    <div className="fdh-modal-fond" onClick={onClose}>
      <div className="fdh-modal" onClick={e => e.stopPropagation()}>
        <button className="fdh-modal-x" onClick={onClose}>✕</button>
        <h2 className="fdh-quest-titre">⭐ Membre VIP — ce que ça change</h2>
        <p className="fdh-manuel-intro">L'abonnement VIP débloque <b>tout</b> FortyDate pendant toute sa durée.</p>

        <div className="fdh-manuel-bloc">
          <div className="fdh-manuel-titre"><span>✅</span>Gratuit pour tous les membres</div>
          <ul className="fdh-av-liste">{GRATUIT.map(t => <li key={t}>{t}</li>)}</ul>
        </div>

        <div className="fdh-manuel-bloc">
          <div className="fdh-manuel-titre"><span>⭐</span>Réservé aux membres VIP</div>
          <ul className="fdh-av-liste or">{SERENITE.map(t => <li key={t}>{t}</li>)}</ul>
        </div>

        <div className="fdh-manuel-titre" style={{ marginTop: '1rem' }}><span>💳</span>Les formules</div>
        <div className="fdh-av-plans">
          {plansDispo.map(p => {
            const px = prixDansDevise(p.prix, moi?.devise)
            return (
              <div key={p.id} className={'fdh-av-plan' + (p.id === 'bienvenue' ? ' top' : '') + (planDispo(p) ? '' : ' bloque')}>
                <div className="fdh-av-nom">{p.nom}{p.id === 'bienvenue' && <span className="fdh-av-tag">Offre 1ᵉʳ achat</span>}</div>
                <div className="fdh-av-prix">{px.principal}</div>
                {px.secondaire && <div className="fdh-av-eq">{px.secondaire}</div>}
                <div className="fdh-av-duree">{planDispo(p) ? p.jours + " jours d'accès complet" : '🔒 après ton 1ᵉʳ abonnement'}</div>
              </div>
            )
          })}
        </div>
        {!dejaAbonne && <p className="fdh-av-note">Pour ton premier abonnement, c'est l'offre « Bienvenue ». Les deux autres formules se débloqueront ensuite.</p>}
        <p className="fdh-manuel-txt" style={{ marginTop: '.6rem' }}>
          Paiement par Mobile Money ou carte bancaire. L'accès est activé aussitôt et dure jusqu'à la fin de la période choisie, sans reconduction automatique.
        </p>

        <button className="fdh-btn-rose" style={{ width: '100%', marginTop: '.9rem' }}
          onClick={() => { onClose(); onFaireAbo && onFaireAbo() }}>Devenir membre VIP</button>
      </div>
    </div>
  )
}

function Verification({ moi, onClose }) {
  const [etat, setEtat] = useState(
    moi?.verifie ? 'verifie' : (moi?.selfie_url ? 'attente' : 'vide')
  )
  const [envoi, setEnvoi] = useState(false)
  const [err, setErr] = useState('')

  async function envoyer(file) {
    setEnvoi(true); setErr('')
    try {
      const url = await uploadPhotoOptimisee(file, moi.id + '-verif')
      const { error } = await supabase.from('profiles').update({ selfie_url: url }).eq('id', moi.id)
      if (error) throw error
      setEtat('attente')
    } catch (e) {
      setErr("Envoi impossible. Réessaie dans un instant.")
    } finally { setEnvoi(false) }
  }

  return (
    <div className="fdh-modal-fond" onClick={onClose}>
      <div className="fdh-modal" onClick={e => e.stopPropagation()}>
        <button className="fdh-modal-x" onClick={onClose}>✕</button>
        <h2 className="fdh-quest-titre">✓ Faire vérifier mon profil</h2>

        {etat === 'verifie' && (
          <div className="fdh-modal-fin">
            <div className="fdh-modal-emoji">✅</div>
            <h2>Ton profil est vérifié</h2>
            <p>Le badge ✓ bleu s'affiche à côté de ton prénom. Les autres membres savent que c'est bien toi.</p>
          </div>
        )}

        {etat === 'attente' && (
          <div className="fdh-modal-fin">
            <div className="fdh-modal-emoji">⏳</div>
            <h2>Selfie bien reçu</h2>
            <p>Notre équipe l'examine. Le badge ✓ apparaîtra sur ton profil dès la validation.</p>
            <button className="fdh-btn-rose" style={{ width: '100%', marginTop: '.8rem' }}
              onClick={() => setEtat('vide')}>Envoyer un autre selfie</button>
          </div>
        )}

        {etat === 'vide' && (
          <>
            <p className="fdh-manuel-intro">
              Le badge ✓ bleu montre aux autres membres que tu es bien la personne sur tes photos.
              Un profil vérifié inspire confiance et reçoit nettement plus de messages.
            </p>
            <div className="fdh-manuel-bloc">
              <div className="fdh-manuel-titre"><span>🔒</span>Ta photo reste privée</div>
              <p className="fdh-manuel-txt">
                Ce selfie ne s'affichera <b>jamais</b> sur le site. Aucun autre membre ne le verra,
                et il ne remplacera pas ta photo de profil. Il sert uniquement à notre équipe
                pour confirmer que c'est bien toi.
              </p>
            </div>
            <div className="fdh-manuel-bloc">
              <div className="fdh-manuel-titre"><span>📸</span>Comment faire</div>
              <p className="fdh-manuel-txt">
                Prends un selfie simple, visage bien visible, sans lunettes de soleil ni chapeau.
                Il doit ressembler à ta photo de profil.
              </p>
            </div>
            {err && <div className="fdh-abo-msg err">{err}</div>}
            <label className="fdh-f-l">Ton selfie</label>
            <input className="fdh-f-in" type="file" accept="image/*" capture="user" disabled={envoi}
              onChange={e => e.target.files[0] && envoyer(e.target.files[0])} />
            {envoi && <p className="fdh-msg">Envoi en cours…</p>}
          </>
        )}
      </div>
    </div>
  )
}

function Contact({ onClose }) {
  const EMAIL = 'fortydate.com@gmail.com'
  const [copie, setCopie] = useState(false)
  const cas = [
    ['💳', "Le paiement ne passe pas", "Mobile Money ou carte refusée, page bloquée, code non reçu : écris-nous en précisant le moyen utilisé et l'heure de la tentative."],
    ['⭐', "Tu as payé mais pas d'accès", "Si ton abonnement VIP n'est pas activé après ton paiement, envoie-nous la référence de la transaction (ou une capture du reçu) : on l'active manuellement."],
    ['👤', 'Problème de compte', "Mot de passe, photo qui ne se charge pas, profil bloqué par erreur, suppression de ton compte : on s'en occupe."],
    ['🛡️', 'Signaler un abus', "Comportement déplacé, arnaque, faux profil : signale-le depuis la fiche du membre, et écris-nous si c'est urgent."],
    ['💡', 'Suggestion', "Une idée pour améliorer FortyDate ? On lit tous les messages avec plaisir."],
  ]
  async function copier() {
    try { await navigator.clipboard.writeText(EMAIL); setCopie(true); setTimeout(() => setCopie(false), 2000) } catch (_) {}
  }
  return (
    <div className="fdh-modal-fond" onClick={onClose}>
      <div className="fdh-modal" onClick={e => e.stopPropagation()}>
        <button className="fdh-modal-x" onClick={onClose}>✕</button>
        <h2 className="fdh-quest-titre">Nous contacter</h2>
        <p className="fdh-manuel-intro">Un souci, une question ? Écris-nous, nous répondons à chaque message.</p>
        <div className="fdh-contact-mail">
          <div className="fdh-contact-lbl">Notre adresse e-mail</div>
          <a className="fdh-contact-adr" href={'mailto:' + EMAIL}>{EMAIL}</a>
          <div className="fdh-2btn" style={{ padding: '.7rem 0 0' }}>
            <button className="b-profil" onClick={copier}>{copie ? '✓ Copié' : 'Copier'}</button>
            <button className="b-disc" onClick={() => { window.location.href = 'mailto:' + EMAIL }}>Écrire</button>
          </div>
        </div>
        <p className="fdh-manuel-intro" style={{ marginTop: '1rem' }}>Pour aller plus vite, indique le prénom de ton compte et l'e-mail avec lequel tu t'es inscrit(e).</p>
        {cas.map(([emoji, titre, texte]) => (
          <div key={titre} className="fdh-manuel-bloc">
            <div className="fdh-manuel-titre"><span>{emoji}</span>{titre}</div>
            <p className="fdh-manuel-txt">{texte}</p>
          </div>
        ))}
        <button className="fdh-btn-rose" style={{ width: '100%', marginTop: '.8rem' }} onClick={onClose}>Fermer</button>
      </div>
    </div>
  )
}

function Manuel({ onClose }) {
  const sections = [
    ['👤', 'Complète ton profil', "Ajoute une belle photo et quelques mots sur toi via le menu ☰ → Mon profil. Un profil complet et sincère inspire confiance et attire les bonnes personnes."],
    ['📲', "Installe l'application", "Mets FortyDate sur ton écran d'accueil : elle s'ouvre alors comme une vraie application, plus vite et sans passer par le navigateur. Si un bouton « Installer » apparaît en haut de l'écran, appuie simplement dessus. S'il ne s'affiche pas : sur Android, ouvre le menu ⋮ de Chrome puis « Ajouter à l'écran d'accueil ». Sur iPhone, appuie sur le bouton Partager ⬆️ de Safari puis « Sur l'écran d'accueil »."],
    ['🔔', 'Active les notifications', "Menu ☰ → « Activer les notifications », puis accepte la demande de ton téléphone. Tu seras prévenu(e) d'un nouveau message ou d'un nouveau j'aime, même quand l'appli est fermée. Sur iPhone, installe d'abord l'application sur ton écran d'accueil : c'est indispensable pour recevoir les notifications."],
    ['📢', 'Annonces', "L'espace où chacun dit, à cœur ouvert, quelle personne il recherche. Publie la tienne depuis le bouton 📢 en haut de l'écran ou depuis le menu ☰ : décris qui tu es et ce que tu attends d'une relation. Sur l'annonce de quelqu'un qui te plaît, appuie sur « Discute avec moi » pour lui écrire directement. Tu peux modifier ou supprimer ton annonce à tout moment. Par sécurité, les numéros de téléphone, e-mails et liens n'y sont pas autorisés — tu échangeras tes coordonnées en privé, avec les personnes en qui tu as confiance."],
    ['📍', 'À proximité', "Découvre les membres proches de chez toi. Appuie sur une carte pour ouvrir un profil et en savoir plus."],
    ['💑', 'Rencontres', "Les profils se présentent un par un. Balaie vers la droite ou la gauche pour simplement en voir un autre : rien n'est enregistré, la personne reviendra plus tard. Quand tu veux décider, appuie sur ❤ pour aimer ou ✕ pour passer."],
    ['❤️', "J'aime", "« Ils t'ont aimée » regroupe les personnes qui ont flashé sur toi : appuie sur le ❤ de leur carte pour les aimer en retour, et c'est aussitôt un match. « Tes matchs », ce sont celles avec qui c'est réciproque : tu peux alors leur écrire."],
    ['💬', 'Messages', "Discute avec tes matchs. La pastille rouge t'indique les messages non lus, conversation par conversation."],
    ['✨', 'Affinités', "Réponds au petit questionnaire : l'appli calcule ensuite votre pourcentage de compatibilité avec les autres membres."],
    ['⭐', 'Membre VIP', "L'abonnement débloque le meilleur : voir qui t'a aimée, les visites de ton profil, le pourcentage d'affinité et les messages illimités."],
    ['🏅', 'Les badges', "Deux badges peuvent apparaître à côté d'un prénom. Le ✓ bleu signifie « profil vérifié » : la personne nous a envoyé un selfie privé et notre équipe a confirmé que c'est bien elle. L'étoile dorée signifie « Membre VIP », c'est-à-dire un membre abonné. Pour obtenir le ✓ bleu, envoie ton selfie de vérification — il reste privé et ne s'affiche jamais sur le site."],
    ['🛡️', 'Sécurité', "Un profil te met mal à l'aise ? Tu peux le signaler ou le bloquer depuis sa fiche. Ne partage jamais tes coordonnées bancaires ni d'argent avec un inconnu."],
  ]
  return (
    <div className="fdh-modal-fond" onClick={onClose}>
      <div className="fdh-modal" onClick={e => e.stopPropagation()}>
        <button className="fdh-modal-x" onClick={onClose}>✕</button>
        <h2 className="fdh-quest-titre">Comment utiliser FortyDate</h2>
        <p className="fdh-manuel-intro">Bienvenue ! Voici l'essentiel pour faire de belles rencontres, en toute sérénité.</p>
        {sections.map(([emoji, titre, texte]) => (
          <div key={titre} className="fdh-manuel-bloc">
            <div className="fdh-manuel-titre"><span>{emoji}</span>{titre}</div>
            <p className="fdh-manuel-txt">{texte}</p>
          </div>
        ))}
        <button className="fdh-btn-rose" style={{ width: '100%', marginTop: '.8rem' }} onClick={onClose}>J'ai compris</button>
      </div>
    </div>
  )
}

export default function Accueil({ onDeconnexion }) {
  const [onglet, setOnglet] = useState(() => {
    try { return localStorage.getItem('fd_onglet') || 'rencontres' } catch (_) { return 'rencontres' }
  })
  useEffect(() => { try { localStorage.setItem('fd_onglet', onglet) } catch (_) {} }, [onglet])
  const [moi, setMoi] = useState(null)
  const [estAdmin, setEstAdmin] = useState(false)
  const [mesReponses, setMesReponses] = useState(null) // réponses affinités
  const [conversationAvec, setConversationAvec] = useState(null)
  const [overlay, setOverlay] = useState(null)  // 'profil' | 'questionnaire' | null
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [modalMdp, setModalMdp] = useState(false)
  const [manuelOuvert, setManuelOuvert] = useState(false)
  const [reglesOuvert, setReglesOuvert] = useState(false)
  const [contactOuvert, setContactOuvert] = useState(false)
  const [avantagesOuvert, setAvantagesOuvert] = useState(false)
  const [verifOuvert, setVerifOuvert] = useState(false)
  const [fiche, setFiche] = useState(null)  // profil consulté
  const [nbMsgNonLus, setNbMsgNonLus] = useState(0)
  const [nbNouvJaime, setNbNouvJaime] = useState(0)

  async function voirProfil(id, compter = true) {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single()
    if (data) setFiche(data)
    if (compter && moi && id !== moi.id) {
      const { error } = await supabase.from('visites')
        .upsert({ visiteur_id: moi.id, profil_id: id, vu_at: new Date().toISOString() },
          { onConflict: 'visiteur_id,profil_id' })
      if (error) console.warn('Visite non enregistrée :', error.message)
    }
  }
  const ouvrirDiscussion = (p) => { setConversationAvec(p); setOnglet('messages') }

  // ---- Badges de notification (messages non lus + nouveaux j'aime) ----
  async function rafraichirBadges() {
    if (!moi?.id) return
    try {
      const { count } = await supabase.from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('destinataire', moi.id).eq('lu', false)
      setNbMsgNonLus(count || 0)
    } catch (_) {}
    try {
      const { data } = await supabase.rpc('qui_m_a_aime')
      const total = Array.isArray(data) ? data.length : 0
      const vus = parseInt(localStorage.getItem('fd_jaime_vus') || '0', 10)
      setNbNouvJaime(Math.max(0, total - vus))
    } catch (_) {}
  }

  useEffect(() => {
    if (!moi?.id) return
    rafraichirBadges()
    const canal = supabase.channel('badges-' + moi.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `destinataire=eq.${moi.id}` },
        () => setNbMsgNonLus(n => n + 1))
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [moi?.id]) // eslint-disable-line

  async function rechargerProfil() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setMoi(data)
  }

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase()
      if (adminEmail && (user.email || '').trim().toLowerCase() === adminEmail) setEstAdmin(true)
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setMoi(prof)
      const { data: aff } = await supabase.from('affinites').select('reponses').eq('profile_id', user.id).maybeSingle()
      setMesReponses(aff?.reponses || {})
    })()
  }, [])

  // Battement d'activité : alimente les stats « En ligne » et « PWA installée »
  useEffect(() => {
    if (!moi?.id) return
    const installee = typeof window !== 'undefined' &&
      ((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true)
    const battre = async () => {
      const champs = { derniere_activite: new Date().toISOString() }
      if (installee && !moi.pwa_installe_at) champs.pwa_installe_at = new Date().toISOString()
      try { await supabase.from('profiles').update(champs).eq('id', moi.id) } catch (_) {}
    }
    battre()
    const t = setInterval(battre, 120000) // toutes les 2 minutes
    return () => clearInterval(t)
  }, [moi?.id]) // eslint-disable-line

  // Retour d'un paiement Chariow : l'activation arrive par webhook, on rafraîchit le profil quelques fois
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!/[?&]abo=ok/.test(window.location.search)) return
    let n = 0
    const t = setInterval(() => { n++; rechargerProfil(); if (n >= 6) clearInterval(t) }, 4000)
    // nettoie l'URL
    window.history.replaceState({}, '', window.location.pathname)
    return () => clearInterval(t)
  }, [])

  const titres = { proximite: 'Proximité', rencontres: 'Rencontre', jaime: "J'aime", messages: 'Messages', match: 'Affinités', visites: 'Visites' }
  const titreOverlay = { profil: 'Mon profil', questionnaire: 'Affinités', abonnement: 'VIP', annonces: 'Annonces' }
  const abonne = estAbonne(moi)
  const allerOnglet = (id) => {
    setOverlay(null); setMenuOuvert(false); setOnglet(id)
    if (id === 'jaime') {
      setNbNouvJaime(0)
      supabase.rpc('qui_m_a_aime').then(({ data }) => {
        localStorage.setItem('fd_jaime_vus', String(Array.isArray(data) ? data.length : 0))
      }).catch(() => {})
    }
  }
  const ouvrirOverlay = (v) => { setOverlay(v); setMenuOuvert(false) }

  return (
    <div className="fdh-app">
      <Style />
      <header className="fdh-header">
        <button className="fdh-burger" onClick={() => setMenuOuvert(true)} aria-label="Menu">☰</button>
        <img className="fdh-logo-img" src="data:image/png;base64,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" alt="FortyDate" />
        <button className="fdh-annonce-btn" onClick={() => ouvrirOverlay('annonces')} aria-label="Annonces" title="Annonces">📢</button>
        <span className="fdh-titre-page">{overlay ? titreOverlay[overlay] : titres[onglet]}</span>
      </header>

      {menuOuvert && (
        <div className="fdh-drawer-fond" onClick={() => setMenuOuvert(false)}>
          <div className="fdh-drawer" onClick={e => e.stopPropagation()}>
            <div className="fdh-drawer-tete">
              <Avatar url={moi?.photo_principale} prenom={moi?.prenom} taille="54px" />
              <div><div className="fdh-drawer-nom">{moi?.prenom || ''}</div>
                <div className="fdh-drawer-mail">{NOM_PAYS[moi?.pays_residence] || ''}</div></div>
            </div>
            <button className="fdh-drawer-item" onClick={() => ouvrirOverlay('profil')}>👤 Mon profil</button>
            <button className="fdh-drawer-item" onClick={() => ouvrirOverlay('annonces')}>📢 Annonces</button>
            <button className="fdh-drawer-item" onClick={() => ouvrirOverlay('questionnaire')}>📝 Questionnaire d'affinités</button>
            <button className="fdh-drawer-item" onClick={() => ouvrirOverlay('abonnement')}>⭐ Devenir membre VIP</button>
            {estAdmin && <button className="fdh-drawer-item" onClick={() => allerOnglet('visites')}>👀 Mes visites</button>}
            <button className="fdh-drawer-item" onClick={() => { setMenuOuvert(false); setManuelOuvert(true) }}>📖 Comment utiliser FortyDate</button>
            <button className="fdh-drawer-item" onClick={() => { setMenuOuvert(false); setReglesOuvert(true) }}>📜 Règles du site</button>
            <button className="fdh-drawer-item" onClick={() => { setMenuOuvert(false); setVerifOuvert(true) }}>{moi?.verifie ? '✅ Profil vérifié' : '✓ Faire vérifier mon profil'}</button>
            <button className="fdh-drawer-item" onClick={() => { setMenuOuvert(false); setAvantagesOuvert(true) }}>⭐ Gratuit ou VIP ?</button>
            <button className="fdh-drawer-item" onClick={() => { setMenuOuvert(false); setContactOuvert(true) }}>✉️ Nous contacter</button>
            <button className="fdh-drawer-item" onClick={() => { setMenuOuvert(false); setModalMdp(true) }}>🔑 Changer mon mot de passe</button>
            <button className="fdh-drawer-item" onClick={async () => {
              const res = await subscribeToPush(moi?.id)
              alert(res.ok ? 'Notifications activees !' : 'Echec : ' + res.reason)
            }}>🔔 Activer les notifications</button>
            <button className="fdh-drawer-item deco" onClick={onDeconnexion}>🚪 Se déconnecter</button>
            <div style={{ fontSize: '.72rem', color: '#b7a7ae', textAlign: 'center', marginTop: '.8rem' }}>FortyDate · version 22/07 · #AJ</div>
          </div>
        </div>
      )}

      <main className={'fdh-main' + (!overlay && moi && !abonne ? ' avec-cta' : '')}>
        {overlay === 'profil' && <MonProfil moi={moi} onDeconnexion={onDeconnexion} onMaj={setMoi} />}
        {overlay === 'questionnaire' && <Questionnaire moi={moi} reponsesInit={mesReponses}
          onFini={(r) => { setMesReponses(r); setOverlay(null); setOnglet('match') }} />}
        {overlay === 'annonces' && <Annonces moi={moi} onVoir={voirProfil} onDiscuter={(p) => { setOverlay(null); ouvrirDiscussion(p) }} />}
        {overlay === 'abonnement' && <Abonnement moi={moi} onFini={rechargerProfil} onClose={() => setOverlay(null)} />}
        {!overlay && onglet === 'proximite' && <Proximite moi={moi} onVoir={voirProfil} />}
        {!overlay && onglet === 'rencontres' && <Rencontres moi={moi} />}
        {!overlay && onglet === 'jaime' && <Jaime moi={moi} onVoir={voirProfil} onDiscuter={ouvrirDiscussion} onFaireAbo={() => ouvrirOverlay('abonnement')} />}
        {!overlay && onglet === 'messages' && <Messages moi={moi} ouvrir={conversationAvec} setOuvrir={setConversationAvec} onLu={rafraichirBadges} onFaireAbo={() => ouvrirOverlay('abonnement')} />}
        {!overlay && onglet === 'match' && <MatchAffinites moi={moi} mesReponses={mesReponses} onFaireQuestionnaire={() => ouvrirOverlay('questionnaire')} onVoir={voirProfil} onDiscuter={ouvrirDiscussion} onFaireAbo={() => ouvrirOverlay('abonnement')} />}
        {!overlay && onglet === 'visites' && <Visites moi={moi} onVoir={voirProfil} onFaireAbo={() => ouvrirOverlay('abonnement')} onDiscuter={ouvrirDiscussion} />}
        {!overlay && onglet === 'admin' && estAdmin && <Admin onVoir={(id) => voirProfil(id, false)} />}
      </main>

      {!overlay && moi && !abonne && (
        <button className="fdh-cta-abo" onClick={() => ouvrirOverlay('abonnement')}>
          <span className="fdh-cta-txt">✨ Profite à fond de FortyDate · 1000F · Mobile Money / carte</span>
          <span className="fdh-cta-action">Abonne-toi maintenant →</span>
        </button>
      )}

      <nav className="fdh-nav">
        {[['proximite', '📍', 'Proximité'], ['jaime', '❤️', "J'aime"], ['rencontres', '💑', 'Rencontre'],
          ['messages', '💬', 'Messages'], ['match', '✨', 'Affinités'],
          estAdmin ? ['admin', '🛡️', 'S.Admin'] : ['visites', '👀', 'Visites']].map(([id, emoji, label]) => (
          <button key={id} className={'fdh-tab' + (!overlay && onglet === id ? ' on' : '')} onClick={() => allerOnglet(id)}>
            <span className="fdh-tab-emoji">{emoji}
              {id === 'messages' && nbMsgNonLus > 0 && <span className="fdh-badge">{nbMsgNonLus > 9 ? '9+' : nbMsgNonLus}</span>}
              {id === 'jaime' && nbNouvJaime > 0 && <span className="fdh-badge">{nbNouvJaime > 9 ? '9+' : nbNouvJaime}</span>}
            </span>
            <span className="fdh-tab-label">{label}</span>
          </button>
        ))}
      </nav>

      {fiche && <FicheProfil profil={fiche} moi={moi} onFermer={() => setFiche(null)} />}
      {modalMdp && <MotDePasse onClose={() => setModalMdp(false)} />}
      {manuelOuvert && <Manuel onClose={() => setManuelOuvert(false)} />}
      {reglesOuvert && <Regles onClose={() => setReglesOuvert(false)} />}
      {contactOuvert && <Contact onClose={() => setContactOuvert(false)} />}
      {verifOuvert && <Verification moi={moi} onClose={() => setVerifOuvert(false)} />}
      {avantagesOuvert && <Avantages moi={moi} onClose={() => setAvantagesOuvert(false)} onFaireAbo={() => ouvrirOverlay('abonnement')} />}
    </div>
  )
}

function Style() {
  return (
    <style>{`
      html,body{margin:0;padding:0}
      #root{width:100%;max-width:480px;margin:0 auto}
      .fdh-app{min-height:100vh;background:#FBF4F5;font-family:system-ui,'Segoe UI',sans-serif;
        color:#3A0F38;display:flex;flex-direction:column;width:100%;max-width:480px;margin:0 auto;position:relative;overflow-x:clip}
      .fdh-main{flex:1;width:100%;max-width:480px;margin:0 auto;box-sizing:border-box;padding:1rem 1rem calc(72px + 1rem + env(safe-area-inset-bottom));overflow-y:auto}
      .fdh-main.avec-cta{padding-bottom:calc(140px + env(safe-area-inset-bottom))}
      .fdh-cta-abo{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(52px + env(safe-area-inset-bottom));
        z-index:19;width:100%;max-width:520px;border:0;cursor:pointer;
        background:linear-gradient(90deg,#D62A5E,#4A1546);color:#fff;
        padding:.6rem 1rem;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.4rem;
        box-shadow:0 -8px 20px -10px rgba(74,21,70,.45)}
      .fdh-cta-txt{font-weight:800;font-size:.82rem;text-align:center;line-height:1.2}
      .fdh-cta-action{font-weight:800;font-size:.82rem;background:#fff;color:#4A1546;
        padding:.32rem 1rem;border-radius:99px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.18);
        animation:ctaPulse 1.8s ease-in-out infinite}
      @keyframes ctaPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
      .fdh-header{position:sticky;top:0;z-index:10;background:#fff;border-bottom:1px solid #EEE0E4;
        padding:.7rem .8rem;padding-top:calc(.7rem + env(safe-area-inset-top));display:flex;align-items:center;
        gap:.45rem;flex-wrap:nowrap;overflow:hidden}
      .fdh-burger{background:none;border:0;font-size:1.3rem;cursor:pointer;color:#4A1546;line-height:1;padding:0;flex:0 0 auto}
      .fdh-logo{font-weight:800;font-size:1.2rem}
      .fdh-logo .f{color:#4A1546}.fdh-logo .d{color:#D62A5E}
      .fdh-logo-img{height:48px;width:auto;max-width:58%;display:block;object-fit:contain;flex:0 1 auto;min-width:0}
      .fdh-annonce-btn{background:none;border:0;font-size:1.2rem;cursor:pointer;line-height:1;padding:0;flex:0 0 auto;margin-left:.7rem}
      .fdh-annonce-intro{text-align:center;margin:0 0 1.1rem}
      .fdh-annonce-accroche{font-size:1rem;font-weight:800;color:#4A1546;margin:0 0 .7rem;line-height:1.35}
      .fdh-annonce-cta{width:100%;background:#D62A5E;color:#fff;border:0;border-radius:14px;
        padding:.95rem 1rem;font-size:1rem;font-weight:800;cursor:pointer;white-space:nowrap;
        box-shadow:0 6px 16px -8px rgba(214,42,94,.9);transition:.15s}
      .fdh-annonce-cta:hover{background:#B21F4E}
      .fdh-annonce-cta:active{transform:scale(.98)}
      .fdh-annonce{background:#fff;border:1.5px solid #EEE0E4;border-radius:14px;padding:.9rem;margin-bottom:.7rem}
      .fdh-annonce.mienne{border-color:#C69A4E;background:#FFFCF6}
      .fdh-annonce-tete{display:flex;align-items:flex-start;gap:.6rem}
      .fdh-annonce-av{flex:0 0 46px;width:46px;height:46px;border-radius:50%;overflow:hidden;border:0;padding:0;background:#EDE0E4;cursor:pointer;position:relative}
      .fdh-annonce-av .fdh-photo,.fdh-annonce-av .fdh-vide{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;font-size:1.1rem}
      .fdh-annonce-nom{font-weight:800;color:#3A0F38;font-size:.95rem}
      .fdh-annonce-lieu{font-size:.75rem;color:#7A6B74;margin:.1rem 0}
      .fdh-annonce-ic{background:none;border:0;font-size:1.05rem;cursor:pointer;padding:.1rem .2rem;line-height:1}
      .fdh-annonce-txt{margin:.7rem 0 0;font-size:.92rem;color:#3A0F38;line-height:1.6;white-space:pre-wrap}
      .fdh-annonce-disc{width:100%;margin-top:.8rem;background:#D62A5E;color:#fff;border:0;border-radius:12px;
        padding:.7rem;font-weight:800;font-size:.92rem;cursor:pointer}
      .fdh-annonce-disc:hover{background:#B21F4E}
      .fdh-titre-page{font-size:.82rem;color:#7A6B74;font-weight:700;margin-left:auto;white-space:nowrap;flex:0 0 auto}

      /* Drawer */
      .fdh-drawer-fond{position:fixed;inset:0;background:rgba(36,10,42,.5);z-index:60}
      .fdh-drawer{position:absolute;top:0;left:0;bottom:0;width:78%;max-width:300px;background:#fff;
        box-shadow:6px 0 30px -10px rgba(0,0,0,.4);padding:1.4rem 1rem;display:flex;flex-direction:column;gap:.4rem}
      .fdh-drawer-tete{display:flex;align-items:center;gap:.8rem;padding-bottom:1rem;margin-bottom:.6rem;border-bottom:1px solid #EEE0E4}
      .fdh-drawer-tete .fdh-photo{width:54px;height:54px;border-radius:50%;object-fit:cover}
      .fdh-drawer-tete .fdh-vide{width:54px;height:54px;border-radius:50%;font-size:1.4rem}
      .fdh-drawer-nom{font-weight:800;color:#3A0F38}
      .fdh-drawer-mail{font-size:.82rem;color:#9a8b92}
      .fdh-drawer-item{text-align:left;background:none;border:0;padding:.9rem .7rem;border-radius:10px;
        font-size:1rem;color:#3A0F38;cursor:pointer;font-weight:600}
      .fdh-drawer-item:hover{background:#F3E7EA}
      .fdh-drawer-item.deco{color:#b21f4e;margin-top:auto}

      .fdh-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.55rem}
      .fdh-carte{border:0;padding:0;text-align:left;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 6px 18px -12px rgba(58,15,56,.4);cursor:pointer}
      .fdh-carte-photo{width:100%;aspect-ratio:1 / 1.414;background:#EDE0E4;position:relative;overflow:hidden}
      .fdh-carte-photo .fdh-photo,
      .fdh-carte-photo .fdh-vide{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover}
      .fdh-pct-badge{position:absolute;top:.5rem;right:.5rem;color:#fff;font-weight:800;font-size:.85rem;padding:.2rem .55rem;border-radius:99px;box-shadow:0 4px 10px -4px rgba(0,0,0,.4)}
      .fdh-grid2{display:flex;flex-wrap:wrap;gap:.7rem;align-items:stretch;justify-content:flex-start}
      .fdh-grid2 > *{flex:1 1 calc(50% - .35rem);max-width:calc(50% - .35rem);min-width:0}
      .fdh-rayon-bloc{margin-bottom:1.1rem}
      .fdh-rayon-titre{width:100%;background:none;border:0;padding:.2rem .1rem .55rem;display:flex;align-items:center;gap:.45rem;flex-wrap:wrap;cursor:pointer;color:#3A0F38;font-weight:800;font-size:.94rem;text-align:left;line-height:1.25}
      .fdh-rayon-num{background:#F3E7EA;color:#B21F4E;font-size:.72rem;font-weight:800;padding:.05rem .45rem;border-radius:99px}
      .fdh-rayon-tout{margin-left:auto;color:#D62A5E;font-size:.78rem;font-weight:700}
      .fdh-rayon{display:flex;gap:.6rem;align-items:stretch;overflow-x:auto;padding:.1rem .1rem .5rem;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch}
      .fdh-rayon>.fdh-carte{flex:0 0 40%;max-width:40%;scroll-snap-align:start}
      .fdh-jaime .fdh-carte-b .fdh-carte-photo{aspect-ratio:1 / 1.414}
      .fdh-rayon-vide{color:#9a8b92;font-size:.85rem;padding:.1rem .1rem 1rem}
      .fdh-retour-lien{background:none;border:0;color:#D62A5E;font-weight:700;font-size:.9rem;cursor:pointer;padding:.1rem 0 .6rem}
      .fdh-carte-b{display:flex;flex-direction:column;height:100%}
      .fdh-carte-b .fdh-carte-photo{border:0;padding:0;cursor:pointer;width:100%;aspect-ratio:1 / 1;flex:0 0 auto}
      .fdh-carte-b .fdh-2btn{margin-top:auto}
      .fdh-2btn{display:flex;gap:.4rem;padding:.15rem .5rem .5rem}
      .fdh-2btn button{flex:1;border-radius:9px;font-size:.8rem;font-weight:800;padding:.4rem 0;cursor:pointer;border:1.5px solid #E4D3D8}
      .fdh-2btn .b-profil{background:#fff;color:#4A1546}
      .fdh-2btn .b-profil:hover{background:#F3E7EA}
      .fdh-2btn .b-disc{background:#D62A5E;color:#fff;border-color:#D62A5E}
      .fdh-2btn .b-coeur{flex:0 0 46px;background:#fff;color:#D62A5E;border-color:#D62A5E;font-size:1rem;line-height:1}
      .fdh-2btn .b-coeur:hover{background:#D62A5E;color:#fff}
      .fdh-2btn .b-coeur:disabled{opacity:.6;cursor:default}
      .fdh-2btn .b-disc:hover{background:#B21F4E}
      .fdh-carte-photo .fdh-photo{width:100%;height:100%;object-fit:cover}
      .fdh-carte-photo .fdh-vide{width:100%;height:100%;font-size:3rem}
      .fdh-photo{width:100%;object-fit:cover;display:block;background:#EDE0E4}
      .fdh-vide{display:grid;place-items:center;font-size:2.4rem;font-weight:800;color:#fff;background:linear-gradient(150deg,#7A2233,#D62A5E)}
      .fdh-nom{padding:.5rem .6rem;font-size:.82rem;font-weight:700;display:flex;align-items:center;gap:.3rem;white-space:nowrap;overflow:hidden;min-height:2.3rem}
      .fdh-point{width:8px;height:8px;border-radius:50%;background:#c9bcc2;flex:0 0 auto}
      .fdh-point.on{background:#3ecf6b;box-shadow:0 0 0 2px rgba(62,207,107,.25)}
      .fdh-presence{display:inline-flex;align-items:center;gap:.3rem;font-size:.72rem;color:#9a8b92;font-weight:600}
      .fdh-presence.on{color:#1a9e52}
      .fdh-vu{padding:0 .5rem .35rem;font-size:.72rem;line-height:1}
      .fdh-fiche-presence{margin:-.5rem 0 .5rem}
      .fdh-verif{background:#fff;border:1.5px solid #E4D3D8;border-radius:14px;padding:.7rem;margin-bottom:.6rem}
      .fdh-verif-photos{display:flex;gap:.5rem}
      .fdh-verif-photos figure{flex:1;margin:0;text-align:center}
      .fdh-verif-photos img{width:100%;aspect-ratio:1/1.2;object-fit:cover;border-radius:10px;background:#EDE0E4}
      .fdh-verif-photos figcaption{font-size:.68rem;color:#9a8b92;margin-top:.2rem}
      .fdh-verif-bas{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-top:.6rem;flex-wrap:wrap}
      .fdh-adm-btn.ok{background:#1a9e52;color:#fff;border-color:#1a9e52}
      .fdh-etiquettes{display:flex;gap:.4rem;flex-wrap:wrap;margin:0 0 .9rem}
      .fdh-etiq{display:inline-flex;align-items:center;gap:.2rem;font-size:.76rem;font-weight:800;
        padding:.3rem .6rem;border-radius:99px}
      .fdh-etiq.verif{background:#E8F4FD;color:#0f6ba8}
      .fdh-etiq.vip{background:#FBF1DF;color:#8a6a26}
      .fdh-nom-txt{display:inline-flex;align-items:center;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

      .fdh-msg{text-align:center;color:#7A6B74;padding:2rem}
      .fdh-vide-etat{text-align:center;padding:3rem 1.5rem;color:#7A6B74}
      .fdh-vide-emoji{font-size:2.6rem;margin-bottom:.6rem}
      .fdh-vide-etat p{margin:.3rem 0}
      .fdh-vide-sous{font-size:.88rem;opacity:.8}
      .fdh-err{background:#fdeaea;color:#b21f4e;padding:.7rem .9rem;border-radius:10px;font-size:.88rem;margin:1rem 0}

      .fdh-profil{text-align:center;padding:1.5rem 1rem}
      .fdh-profil .fdh-photo{width:120px;height:120px;border-radius:50%;margin:0 auto .6rem;border:3px solid #D62A5E}
      .fdh-profil .fdh-vide{width:120px;height:120px;border-radius:50%;margin:0 auto .6rem}
      .fdh-photo-btn{display:inline-block;background:#4A1546;color:#fff;padding:.5rem 1.2rem;border-radius:99px;font-size:.85rem;font-weight:700;cursor:pointer;margin:.2rem 0 .4rem}
      .fdh-photo-btn:hover{background:#5E2159}
      .fdh-photo-msg{font-size:.82rem;color:#7A6B74;margin:0 0 .6rem}
      .fdh-profil-nom{font-size:1.5rem;margin:.2rem 0}
      .fdh-profil-lieu{color:#7A6B74;font-size:.95rem;margin-bottom:.8rem}
      .fdh-profil-bio{font-style:italic;color:#5c4f57;margin:.8rem auto;max-width:34ch}
      .fdh-profil-infos{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin:1rem 0 1.6rem}
      .fdh-tag{background:#F3E7EA;color:#4A1546;padding:.4rem .8rem;border-radius:99px;font-size:.82rem;font-weight:700}
      .fdh-btn-deco{background:none;border:1.5px solid #E4D3D8;color:#b21f4e;padding:.7rem 1.6rem;border-radius:12px;font-weight:800;cursor:pointer}
      .fdh-btn-deco:hover{background:#fdeaea}

      /* Album photos */
      .fdh-album-titre{font-size:1rem;font-weight:800;color:#4A1546;margin:1.2rem 0 .7rem;display:flex;align-items:center;justify-content:center;gap:.5rem}
      .fdh-album-titre span{background:#F3E7EA;color:#4A1546;font-size:.75rem;padding:.15rem .55rem;border-radius:99px}
      .fdh-album{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;max-width:340px;margin:0 auto}
      .fdh-album-photo{position:relative;padding:0;border:0;border-radius:12px;overflow:hidden;cursor:pointer;aspect-ratio:1;background:#EDE0E4}
      .fdh-album-photo img{width:100%;height:100%;object-fit:cover;display:block}
      .fdh-album-photo.principale{outline:3px solid #D62A5E;outline-offset:-3px}
      .fdh-album-badge{position:absolute;bottom:0;left:0;right:0;background:rgba(214,42,94,.92);color:#fff;font-size:.7rem;font-weight:700;padding:.15rem}
      .fdh-album-ajout{aspect-ratio:1;border:2px dashed #D6a9bb;border-radius:12px;display:grid;place-items:center;
        font-size:1.8rem;color:#D62A5E;cursor:pointer;background:#fff}
      .fdh-album-ajout:hover{background:#fdeef3}

      .fdh-pmenu-fond{position:fixed;inset:0;background:rgba(36,10,42,.7);display:grid;place-items:center;z-index:60;padding:1.5rem}
      .fdh-pmenu{background:#fff;border-radius:20px;padding:1.4rem;max-width:320px;width:100%;text-align:center}
      .fdh-pmenu-apercu{width:100%;max-height:220px;object-fit:cover;border-radius:14px;margin-bottom:1rem}
      .fdh-pmenu-btn{display:block;width:100%;padding:.85rem;border:0;border-radius:12px;background:#F3E7EA;color:#4A1546;
        font-weight:700;cursor:pointer;margin-bottom:.5rem;font-size:.95rem}
      .fdh-pmenu-btn:hover{background:#ecd9de}
      .fdh-pmenu-btn.danger{background:#fdeaea;color:#b21f4e}
      .fdh-pmenu-btn.annuler{background:none;color:#7A6B74}

      /* Rencontres */
      .fdh-renc{display:flex;flex-direction:column;align-items:center}
      .fdh-swipe{width:100%;max-width:420px;transition:transform .26s ease, opacity .26s ease;
        touch-action:pan-y;user-select:none;-webkit-user-select:none;cursor:grab}
      .fdh-swipe:active{cursor:grabbing}
      .fdh-tag-geste{position:absolute;top:1rem;z-index:3;font-weight:900;font-size:1rem;letter-spacing:.05em;
        padding:.4rem .9rem;border-radius:10px;border:3px solid;background:rgba(255,255,255,.92)}
      .fdh-tag-geste.suiv{left:1rem;color:#4A1546;border-color:#4A1546}
      .fdh-tag-geste.prec{right:1rem;color:#4A1546;border-color:#4A1546}
      .fdh-astuce-geste{text-align:center;font-size:.78rem;color:#9b8b93;margin:.5rem 0 0}
      .fdh-swipe.like{transform:translateX(120%) rotate(12deg);opacity:0}
      .fdh-swipe.pass{transform:translateX(-120%) rotate(-12deg);opacity:0}
      .fdh-swipe.sort-d{transform:translateX(110%);opacity:0}
      .fdh-swipe.sort-g{transform:translateX(-110%);opacity:0}
      .fdh-swipe-photo{position:relative;border-radius:20px;overflow:hidden;box-shadow:0 20px 50px -20px rgba(58,15,56,.55);aspect-ratio:1 / 1.414;background:#EDE0E4}
      .fdh-swipe-photo .fdh-photo{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover}
      .fdh-swipe-photo .fdh-vide{position:absolute;top:0;left:0;width:100%;height:100%;font-size:5rem}
      .fdh-swipe-info{position:absolute;left:0;right:0;bottom:0;padding:1.4rem 1.2rem 1.1rem;color:#fff;background:linear-gradient(to top, rgba(36,10,42,.92), rgba(36,10,42,.55) 55%, transparent)}
      .fdh-swipe-info h2{font-size:1.7rem;margin:0}
      .fdh-swipe-lieu{opacity:.9;font-size:.95rem;margin:.2rem 0 .5rem}
      .fdh-swipe-bio{font-size:.95rem;opacity:.95;margin:.2rem 0 .6rem;line-height:1.4}
      .fdh-swipe-tags{display:flex;flex-wrap:wrap;gap:.4rem}
      .fdh-swipe-tags span{background:rgba(255,255,255,.22);padding:.25rem .65rem;border-radius:99px;font-size:.78rem;font-weight:600}
      .fdh-actions{display:flex;gap:2.5rem;margin-top:1.4rem}
      .fdh-rond{width:66px;height:66px;border-radius:50%;border:0;cursor:pointer;font-size:1.6rem;display:grid;place-items:center;box-shadow:0 10px 24px -10px rgba(0,0,0,.35);transition:transform .15s}
      .fdh-rond:hover{transform:scale(1.08)}
      .fdh-rond.pass{background:#fff;color:#7A6B74;border:1.5px solid #E4D3D8}
      .fdh-rond.like{background:linear-gradient(150deg,#D62A5E,#B21F4E);color:#fff}
      .fdh-match{position:fixed;inset:0;background:rgba(36,10,42,.75);display:grid;place-items:center;z-index:50;padding:1.5rem}
      .fdh-match-box{background:#fff;border-radius:22px;padding:2.2rem 1.8rem;text-align:center;max-width:340px}
      .fdh-match-emoji{font-size:3rem}
      .fdh-match-box h2{color:#D62A5E;font-size:1.8rem;margin:.4rem 0}
      .fdh-match-box p{color:#5c4f57;margin-bottom:1.4rem}
      .fdh-btn-rose{background:#D62A5E;color:#fff;border:0;border-radius:12px;padding:.8rem 1.8rem;font-weight:800;cursor:pointer}
      .fdh-btn-rose:hover{background:#B21F4E}
      .fdh-btn-rose:disabled{opacity:.5}
      .fdh-btn-outline{background:#fff;color:#4A1546;border:1.5px solid #D62A5E;border-radius:12px;padding:.8rem 1.8rem;font-weight:800;cursor:pointer}
      .fdh-btn-mtn{width:100%;margin-top:.8rem;background:#FFCC00;color:#1a1208;border:0;border-radius:12px;padding:1rem;font-size:1.05rem;font-weight:800;cursor:pointer}
      .fdh-btn-mtn:hover{background:#f0be00}
      .fdh-btn-orange{width:100%;margin-top:.6rem;background:#FF6A00;color:#fff;border:0;border-radius:12px;padding:1rem;font-size:1.05rem;font-weight:800;cursor:pointer}
      .fdh-btn-orange:hover{background:#e85f00}
      .fdh-btn-texte{display:block;width:100%;margin-top:1rem;background:none;border:0;color:#7A6B74;font-weight:700;cursor:pointer;padding:.4rem}
      .fdh-signaler{display:block;width:100%;margin-top:1.5rem;background:#fff;border:1.5px solid #f0c9c9;color:#B21F4E;border-radius:12px;padding:.8rem;font-weight:800;font-size:.92rem;cursor:pointer}
      .fdh-signaler:hover{background:#fdeef2}
      .fdh-methode-titre{font-size:1.35rem;margin:.4rem 0 .2rem;text-align:center;color:#4A1546}
      .fdh-edit{position:fixed;inset:0;max-width:520px;margin:0 auto;background:#FBF4F5;z-index:30;display:flex;flex-direction:column}
      .fdh-edit-scroll{flex:1;overflow-y:auto;padding:1rem 1.1rem calc(2rem + env(safe-area-inset-bottom))}
      .fdh-el{display:block;font-weight:700;color:#4A1546;margin:1rem 0 .35rem;font-size:.95rem}
      .fdh-ein{width:100%;box-sizing:border-box;padding:.8rem;border:1.5px solid #E4D3D8;border-radius:12px;background:#fff;color:#3A0F38;font-size:1rem}
      .fdh-ein:focus{outline:none;border-color:#D62A5E}
      .fdh-etext{resize:vertical;font-family:inherit}
      .fdh-eindic{flex:0 0 auto;width:auto;min-width:112px}
      .fdh-echips{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.3rem}
      .fdh-echip{background:#fff;border:1.5px solid #E4D3D8;border-radius:999px;padding:.5rem .9rem;font-size:.9rem;color:#4A1546;cursor:pointer}
      .fdh-echip.on{background:#D62A5E;border-color:#D62A5E;color:#fff}
      .fdh-numero{text-align:center;padding:.5rem 0}
      .fdh-numero-titre{font-size:1.5rem;margin:.6rem 0 .3rem;color:#4A1546}
      .fdh-numero-sous{color:#7A6B74;font-size:.95rem;margin:0 0 1.3rem}
      .fdh-numero-in{width:100%;box-sizing:border-box;padding:1.1rem;border:1.5px solid #E4D3D8;border-radius:14px;
        font-size:1.3rem;text-align:left;letter-spacing:1px;background:#faf6f7;color:#3A0F38}
      .fdh-numero-in:focus{outline:none;border-color:#D62A5E;background:#fff}
      .fdh-attente-emoji{font-size:3rem;text-align:center;margin-bottom:.4rem}
      .fdh-attente-alerte{background:#fdeef2;color:#B21F4E;border:1.5px solid #f5c2d3;border-radius:12px;padding:.9rem;text-align:center;font-weight:800;margin:.6rem 0}
      .fdh-attente-note{text-align:center;color:#5c4f57;font-size:.92rem;line-height:1.5;margin:.4rem 0}
      .fdh-btn-outline:hover{background:#fdeef3}

      /* J'aime */
      .fdh-section-titre{font-size:1.05rem;font-weight:800;color:#4A1546;margin:.2rem 0 .8rem;display:flex;align-items:center;gap:.5rem}
      .fdh-sousongl{display:flex;gap:.4rem;margin:.4rem 0 1rem;padding-right:3px}
      .fdh-sousongl.mini{overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:.2rem}
      .fdh-sous.mini{flex:0 0 auto;font-size:.76rem;padding:.5rem .7rem}
      .fdh-act-bloc{background:#fff;border:1.5px solid #E4D3D8;border-radius:16px;padding:1.4rem 1rem;text-align:center}
      .fdh-act-n{font-size:3rem;font-weight:900;color:#4A1546;line-height:1}
      .fdh-act-l{color:#7A6B74;font-size:.9rem;margin-top:.35rem}
      .fdh-act-live{margin-top:.8rem;display:inline-block;background:#eafaf0;color:#1a7f45;font-weight:800;
        font-size:.82rem;padding:.35rem .8rem;border-radius:99px}
      .fdh-av-liste{margin:.4rem 0 0;padding-left:1.1rem;color:#5c4f57;font-size:.9rem;line-height:1.55}
      .fdh-av-liste li{margin-bottom:.2rem}
      .fdh-av-liste.or li{color:#4A1546;font-weight:600}
      .fdh-av-plans{display:flex;gap:.5rem;margin-top:.5rem}
      .fdh-av-plan{flex:1;background:#fff;border:1.5px solid #E4D3D8;border-radius:12px;padding:.7rem .4rem;text-align:center}
      .fdh-av-plan.top{border-color:#D62A5E;background:#FFF5F8}
      .fdh-av-plan.bloque,.fdh-plan.bloque{opacity:.45;filter:grayscale(1);cursor:not-allowed}
      .fdh-plan.bloque .fdh-plan-note{color:#9a8b92}
      .fdh-av-nom{font-size:.78rem;font-weight:800;color:#4A1546}
      .fdh-av-tag{display:block;font-size:.62rem;color:#D62A5E;font-weight:800;margin-top:.1rem}
      .fdh-av-prix{font-size:1.15rem;font-weight:900;color:#D62A5E;margin:.25rem 0 .1rem}
      .fdh-av-eq{font-size:.66rem;color:#9b8b93;margin-bottom:.1rem}
      .fdh-av-note{font-size:.74rem;color:#9b8b93;font-style:italic;margin:.5rem 0 0;text-align:center}
      .fdh-av-duree{font-size:.68rem;color:#7A6B74;line-height:1.25}
      .fdh-contact-mail{background:#F7EDF0;border:1.5px solid #E4D3D8;border-radius:14px;padding:.9rem;text-align:center;margin-bottom:.4rem}
      .fdh-contact-lbl{font-size:.75rem;color:#7A6B74;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
      .fdh-contact-adr{display:block;margin-top:.3rem;font-size:1rem;font-weight:800;color:#4A1546;word-break:break-all;text-decoration:none}
      .fdh-floute{position:absolute;inset:0;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
        background:rgba(74,21,70,.35);display:grid;place-items:center}
      .fdh-floute-ic{font-size:1.6rem}
      .fdh-teaser{width:100%;border:0;border-radius:12px;padding:.7rem .9rem;margin-bottom:.8rem;cursor:pointer;
        background:linear-gradient(90deg,#D62A5E,#4A1546);color:#fff;font-size:.85rem;font-weight:700;text-align:left}
      .fdh-teaser b{font-size:1rem}
      .fdh-msg-reste{font-size:.76rem;color:#7A6B74;text-align:center;padding:.2rem .5rem .4rem}
      .fdh-msg-reste b{color:#4A1546}
      .fdh-msg-reste span{color:#D62A5E;font-weight:800;cursor:pointer}
      .fdh-zone{display:flex;gap:.5rem;margin-bottom:.9rem}
      .fdh-zone-f{flex:0 0 auto;position:relative;padding:.6rem .75rem}
      .fdh-panneau{background:#fff;border:1.5px solid #E4D3D8;border-radius:14px;padding:.9rem;margin:-.3rem 0 .9rem}
      .fdh-f-l{display:block;font-size:.75rem;font-weight:800;color:#4A1546;margin:.7rem 0 .3rem}
      .fdh-f-l:first-child{margin-top:0}
      .fdh-f-in{width:100%;flex:1;min-width:0;padding:.6rem .7rem;border:1.5px solid #E4D3D8;border-radius:10px;
        font-size:.9rem;background:#fff;color:#3A0F38;box-sizing:border-box;outline:none}
      .fdh-f-in:focus{border-color:#D62A5E}
      .fdh-f-ok{flex:0 0 auto;background:#4A1546;color:#fff;border:0;border-radius:10px;padding:0 1rem;
        font-weight:800;font-size:.85rem;cursor:pointer}
      .fdh-f-reset{width:100%;margin-top:.9rem;background:none;border:1.5px solid #E4D3D8;border-radius:10px;
        padding:.55rem;color:#7A6B74;font-weight:800;font-size:.82rem;cursor:pointer}
      .fdh-f-nb{font-size:.78rem;color:#7A6B74;margin:0 0 .6rem;text-align:center}
      .fdh-zone-b{flex:1;background:#fff;border:1.5px solid #E4D3D8;border-radius:12px;padding:.6rem .4rem;
        font-weight:800;font-size:.86rem;color:#7A6B74;cursor:pointer;white-space:nowrap}
      .fdh-zone-b.on{background:#4A1546;color:#fff;border-color:#4A1546}
      .fdh-fiche-aime{width:100%;margin:0;padding:.85rem;border:0;border-radius:12px;
        background:#D62A5E;color:#fff;font-weight:800;font-size:1rem;cursor:pointer}
      .fdh-fiche-aime:hover{background:#B21F4E}
      .fdh-fiche-aime.fait{background:#fff;color:#D62A5E;border:1.5px solid #D62A5E}
      .fdh-fiche-aime:disabled{cursor:default;opacity:.95}
      .fdh-adm-tete{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:.8rem}
      .fdh-adm-tete .fdh-admin-titre{margin:0}
      .fdh-per-sel{margin-left:auto;background:#fff;border:1.5px solid #E4D3D8;border-radius:10px;
        padding:.45rem .6rem;font-size:.85rem;font-weight:800;color:#4A1546;cursor:pointer}
      .fdh-live{display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem}
      .fdh-live-item{flex:1 1 auto;background:#F7EDF0;border-radius:10px;padding:.5rem .7rem;
        font-size:.8rem;color:#5c4f57;white-space:nowrap}
      .fdh-live-item b{color:#4A1546;font-size:1rem;margin-right:.25rem}
      .fdh-adm-soustitre{font-weight:800;color:#4A1546;font-size:.9rem;margin:1.1rem 0 .5rem}
      .fdh-pays-ligne{display:flex;align-items:center;gap:.6rem;padding:.55rem .7rem;background:#fff;
        border:1.5px solid #F1E4E8;border-radius:10px}
      .fdh-pays-nom{flex:0 0 38%;font-size:.85rem;font-weight:700;color:#3A0F38;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .fdh-pays-barre{flex:1;height:8px;background:#F3E7EA;border-radius:99px;overflow:hidden}
      .fdh-pays-barre i{display:block;height:100%;background:linear-gradient(90deg,#D62A5E,#4A1546);border-radius:99px}
      .fdh-pays-n{color:#4A1546;font-size:.95rem;min-width:1.6rem;text-align:right}
      .fdh-act-note{margin-top:.6rem;font-size:.75rem;color:#9b8b93;font-style:italic}
      .fdh-act-tous{margin-top:1.2rem;border-top:1px solid #F1E4E8;padding-top:.8rem;display:flex;flex-direction:column;gap:.15rem}
      .fdh-act-mini{display:flex;justify-content:space-between;align-items:center;padding:.5rem .6rem;
        border-radius:10px;font-size:.85rem;color:#5c4f57;cursor:pointer}
      .fdh-act-mini.on{background:#F7EDF0;color:#4A1546;font-weight:800}
      .fdh-act-mini b{color:#4A1546;font-size:1rem}
      .fdh-sous{flex:1;min-width:0;position:relative;background:#fff;border:1.5px solid #E4D3D8;border-radius:12px;padding:.6rem .3rem;font-weight:800;font-size:.82rem;color:#7A6B74;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:.3rem;white-space:nowrap}
      .fdh-sous-pastille{position:absolute;top:-7px;right:0;min-width:19px;height:19px;padding:0 5px;
        border-radius:99px;background:#D62A5E;color:#fff;font-size:.68rem;font-weight:800;
        display:grid;place-items:center;line-height:1;box-shadow:0 0 0 2px #FBF4F5}
      .fdh-sous.on{background:#D62A5E;border-color:#D62A5E;color:#fff}
      .fdh-sous span{background:rgba(255,255,255,.3);color:inherit;font-size:.75rem;padding:.05rem .45rem;border-radius:99px}
      .fdh-sous:not(.on) span{background:#D62A5E;color:#fff}
      .fdh-admin-titre{font-size:1.3rem;color:#4A1546;margin:.2rem 0 1rem}
      .fdh-periode{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:1rem}
      .fdh-per{background:#fff;border:1.5px solid #E4D3D8;border-radius:99px;padding:.4rem .8rem;font-size:.82rem;font-weight:700;color:#7A6B74;cursor:pointer}
      .fdh-per.on{background:#4A1546;border-color:#4A1546;color:#fff}
      .fdh-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}
      .fdh-stat{background:#fff;border:1.5px solid #EEE0E4;border-radius:14px;padding:1rem;text-align:center}
      .fdh-stat.on{background:#FBE9EF;border-color:#F5C2D3}
      .fdh-stat.or{background:#FBF3E4;border-color:#EBD6A8;grid-column:1 / -1}
      .fdh-stat-n{font-size:1.6rem;font-weight:800;color:#4A1546}
      .fdh-stat-l{font-size:.82rem;color:#7A6B74;margin-top:.2rem}
      .fdh-adm-liste{display:flex;flex-direction:column;gap:.5rem}
      .fdh-adm-membre{display:flex;align-items:center;gap:.7rem;background:#fff;border:1.5px solid #EEE0E4;border-radius:12px;padding:.6rem .7rem}
      .fdh-adm-membre.bloque{background:#fbeaea;border-color:#f3c0c0}
      .fdh-adm-membre .fdh-photo{width:44px;height:44px;border-radius:50%;object-fit:cover;flex:0 0 auto}
      .fdh-adm-membre .fdh-vide{width:44px;height:44px;border-radius:50%;font-size:1.1rem}
      .fdh-adm-info{flex:1;min-width:0;cursor:pointer}
      .fdh-adm-nom{font-weight:800;color:#3A0F38;font-size:.95rem}
      .fdh-adm-sous{font-size:.78rem;color:#8a7b82}
      .fdh-adm-actions{display:flex;flex-direction:column;gap:.3rem;flex:0 0 auto}
      .fdh-adm-btn{background:#fff;border:1.5px solid #E4D3D8;border-radius:8px;padding:.35rem .6rem;font-size:.78rem;font-weight:700;color:#4A1546;cursor:pointer}
      .fdh-adm-btn.danger{background:#fdeef2;border-color:#f3c0c0;color:#B21F4E}
      .fdh-adm-paie{display:flex;align-items:center;justify-content:space-between;background:#fff;border:1.5px solid #EEE0E4;border-radius:12px;padding:.7rem .8rem}
      .fdh-adm-date{font-size:.78rem;color:#8a7b82}
      .fdh-adm-signal{background:#fff;border:1.5px solid #EEE0E4;border-radius:12px;padding:.8rem}
      .fdh-adm-signal.bloque{background:#fbeaea;border-color:#f3c0c0}
      .fdh-sig-haut{display:flex;align-items:center;justify-content:space-between;gap:.6rem}
      .fdh-sig-cible{flex:1;min-width:0;cursor:pointer}
      .fdh-sig-objet{margin:.5rem 0;font-style:italic;color:#5c4f57;font-size:.9rem}
      .fdh-sig-bas{font-size:.78rem;color:#8a7b82}
      .fdh-section-titre span{background:#D62A5E;color:#fff;font-size:.72rem;padding:.1rem .5rem;border-radius:99px}
      .fdh-jgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:.7rem}
      .fdh-jcarte{background:#fff;border:0;border-radius:16px;overflow:hidden;cursor:pointer;box-shadow:0 8px 22px -14px rgba(58,15,56,.4);text-align:center;padding-bottom:.7rem}
      .fdh-jnom{font-weight:800;font-size:.95rem;margin:.5rem 0 .35rem;color:#3A0F38}
      .fdh-jbadge{display:inline-block;background:#F3E7EA;color:#4A1546;font-size:.78rem;font-weight:700;padding:.25rem .7rem;border-radius:99px}
      .fdh-jbadge.rose{background:#fde3ec;color:#D62A5E}

      /* Affinités / Match */
      .fdh-affs-info{text-align:center;color:#7A6B74;font-size:.9rem;margin:0 0 1rem}
      .fdh-aff{display:flex;align-items:center;gap:.8rem;background:#fff;border-radius:14px;padding:.7rem .9rem;margin-bottom:.6rem;box-shadow:0 6px 18px -14px rgba(58,15,56,.35)}
      .fdh-aff .fdh-photo{width:60px;height:60px;border-radius:50%;object-fit:cover;flex:0 0 auto}
      .fdh-aff .fdh-vide{width:60px;height:60px;border-radius:50%;font-size:1.5rem;flex:0 0 auto}
      .fdh-aff-txt{flex:1;min-width:0}
      .fdh-aff-nom{font-weight:800;color:#3A0F38}
      .fdh-aff-lieu{font-size:.82rem;color:#9a8b92;margin-bottom:.4rem}
      .fdh-jauge{height:7px;background:#EEE0E4;border-radius:99px;overflow:hidden}
      .fdh-jauge span{display:block;height:100%;border-radius:99px}
      .fdh-aff-pct{font-weight:800;font-size:1.25rem;flex:0 0 auto}

      /* Questionnaire */
      .fdh-quest-titre{font-size:1.4rem;margin:0 0 .2rem}
      .fdh-quest-sous{color:#7A6B74;font-size:.9rem;margin:0 0 1.2rem}
      .fdh-q{background:#fff;border-radius:14px;padding:1rem;margin-bottom:.8rem;box-shadow:0 6px 18px -16px rgba(58,15,56,.4)}
      .fdh-q-texte{font-weight:700;margin-bottom:.7rem;color:#3A0F38}
      .fdh-q-opts{display:flex;flex-wrap:wrap;gap:.45rem}
      .fdh-q-opt{padding:.5rem .9rem;border:1.5px solid #E4D3D8;background:#fff;border-radius:99px;font-size:.88rem;cursor:pointer;color:#4A1546}
      .fdh-q-opt.on{background:#D62A5E;color:#fff;border-color:#D62A5E}
      .fdh-quest-save{width:100%;margin-top:.6rem}

      /* Messages */
      .fdh-convs{display:flex;flex-direction:column;gap:.5rem}
      .fdh-conv{display:flex;align-items:center;gap:.8rem;background:#fff;border:0;border-radius:14px;padding:.7rem .9rem;cursor:pointer;box-shadow:0 6px 18px -14px rgba(58,15,56,.35);text-align:left;width:100%}
      .fdh-conv .fdh-photo{width:52px;height:52px;border-radius:50%;object-fit:cover;flex:0 0 auto}
      .fdh-conv .fdh-vide{width:52px;height:52px;border-radius:50%;font-size:1.4rem;flex:0 0 auto}
      .fdh-conv-txt{flex:1}
      .fdh-conv-nom{font-weight:800;color:#3A0F38}
      .fdh-conv-apercu{font-size:.82rem;color:#9a8b92}
      .fdh-conv-apercu.fort{color:#D62A5E;font-weight:700}
      .fdh-conv-badge{min-width:20px;height:20px;padding:0 5px;background:#D62A5E;color:#fff;
        font-size:.72rem;font-weight:800;line-height:20px;text-align:center;border-radius:99px;flex:0 0 auto}
      .fdh-conv-fleche{color:#c9b9c0;font-size:1.4rem}
      .fdh-chat{position:fixed;inset:0;max-width:520px;margin:0 auto;background:#FBF4F5;z-index:40;
        display:flex;flex-direction:column;overflow:hidden}
      .fdh-chat-head{flex:0 0 auto;display:flex;align-items:center;gap:.6rem;background:#fff;
        padding:.7rem 1rem;padding-top:calc(.7rem + env(safe-area-inset-top));border-bottom:1px solid #EEE0E4}
      .fdh-chat-head .fdh-photo{width:38px;height:38px;border-radius:50%;object-fit:cover}
      .fdh-chat-head .fdh-vide{width:38px;height:38px;border-radius:50%;font-size:1.1rem}
      .fdh-retour{background:none;border:0;font-size:1.8rem;color:#D62A5E;cursor:pointer;line-height:1;padding:0 .3rem 0 0}
      .fdh-chat-nom{font-weight:800;color:#3A0F38}
      .fdh-chat-fil{flex:1;min-height:0;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:.4rem;-webkit-overflow-scrolling:touch}
      .fdh-chat-vide{text-align:center;color:#9a8b92;margin-top:1.5rem}
      .fdh-bulle-wrap{position:relative;max-width:78%;display:flex;touch-action:pan-y}
      .fdh-bulle-wrap.moi{align-self:flex-end;justify-content:flex-end}
      .fdh-bulle-wrap.lui{align-self:flex-start}
      .fdh-reply-ic{position:absolute;left:-26px;top:50%;transform:translateY(-50%);color:#D62A5E;font-size:1.1rem}
      .fdh-bulle{padding:.6rem .9rem;border-radius:16px;font-size:.95rem;line-height:1.4;word-wrap:break-word;user-select:none}
      .fdh-bulle.moi{background:#4A1546;color:#fff;border-bottom-right-radius:5px}
      .fdh-bulle.lui{background:#fff;color:#3A0F38;border-bottom-left-radius:5px;box-shadow:0 2px 8px -4px rgba(58,15,56,.3)}
      .fdh-cite{border-left:3px solid rgba(255,255,255,.6);padding:.2rem .5rem;margin-bottom:.35rem;font-size:.82rem;opacity:.85;
        background:rgba(255,255,255,.15);border-radius:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .fdh-bulle.lui .fdh-cite{border-left-color:#D62A5E;background:#F3E7EA;color:#7A6B74}
      .fdh-repondprev{display:flex;align-items:center;gap:.5rem;background:#F3E7EA;border-left:3px solid #D62A5E;padding:.5rem .7rem;border-radius:8px;margin-bottom:.4rem}
      .fdh-repondprev-txt{flex:1;font-size:.85rem;color:#5c4f57;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .fdh-repondprev button{background:none;border:0;color:#b21f4e;font-size:.9rem;cursor:pointer}
      .fdh-emojis{display:flex;flex-wrap:wrap;gap:.2rem;background:#fff;border:1px solid #EEE0E4;border-radius:12px;padding:.5rem;margin-bottom:.4rem;max-height:140px;overflow-y:auto}
      .fdh-emojis button{background:none;border:0;font-size:1.4rem;cursor:pointer;padding:.15rem;border-radius:8px}
      .fdh-emojis button:hover{background:#F3E7EA}
      .fdh-chat-saisie{flex:0 0 auto;display:flex;gap:.5rem;background:#FBF4F5;
        padding:.6rem 1rem;padding-bottom:calc(.6rem + env(safe-area-inset-bottom));
        border-top:1px solid #EEE0E4;align-items:center}
      .fdh-emo-btn{background:none;border:0;font-size:1.4rem;cursor:pointer;flex:0 0 auto}
      .fdh-chat-saisie input{flex:1;min-width:0;padding:.75rem 1rem;border:1.5px solid #E4D3D8;border-radius:99px;font-size:1rem;outline:none}
      .fdh-chat-saisie input:focus{border-color:#D62A5E}
      .fdh-envoi{width:46px;height:46px;border:0;border-radius:50%;background:#4A1546;color:#fff;font-size:1.1rem;cursor:pointer;flex:0 0 auto}
      .fdh-envoi:disabled{opacity:.5}

      /* Fiche profil */
      .fdh-fiche{position:fixed;inset:0;max-width:520px;margin:0 auto;
        background:#FBF4F5;z-index:70;display:flex;flex-direction:column;overflow:hidden}
      .fdh-fiche-pied{flex:0 0 auto;background:#FBF4F5;border-top:1px solid #EEE0E4;
        padding:.6rem 1rem;padding-bottom:calc(.6rem + env(safe-area-inset-bottom))}
      .fdh-fiche-head{flex:0 0 auto;display:flex;align-items:center;gap:.5rem;padding:.7rem 1rem;padding-top:calc(.7rem + env(safe-area-inset-top));background:#fff;border-bottom:1px solid #EEE0E4}
      .fdh-badge{flex:0 0 auto;aspect-ratio:1/1}
      .fdh-fiche-scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}
      .fdh-fiche-pied .fdh-fiche-aime{margin-top:0}
      .fdh-fiche-photo{width:100%;background:#EDE0E4}
      .fdh-fiche-photo img{width:100%;max-height:420px;object-fit:cover;display:block}
      .fdh-fiche-photo .fdh-vide{width:100%}
      .fdh-fiche-vignettes{display:flex;gap:.4rem;padding:.6rem 1rem;overflow-x:auto}
      .fdh-fiche-vignettes img{width:56px;height:56px;border-radius:10px;object-fit:cover;cursor:pointer;flex:0 0 auto;opacity:.65;border:2px solid transparent}
      .fdh-fiche-vignettes img.on{opacity:1;border-color:#D62A5E}
      .fdh-fiche-corps{padding:.4rem 1.2rem 2rem}
      .fdh-fiche-nom{font-size:1.7rem;margin:.4rem 0 .1rem;color:#3A0F38}
      .fdh-fiche-lieu{color:#7A6B74;margin:0 0 .8rem}
      .fdh-fiche-bio{font-style:italic;color:#5c4f57;background:#fff;padding:.9rem 1rem;border-radius:12px;margin:.4rem 0 1rem}
      .fdh-fiche-bloc{margin-top:1.1rem}
      .fdh-fiche-bloc h4{font-size:.8rem;text-transform:uppercase;letter-spacing:.08em;color:#D62A5E;margin:0 0 .5rem}
      .fdh-chips{display:flex;flex-wrap:wrap;gap:.45rem}
      .fdh-chips span{background:#F3E7EA;color:#4A1546;padding:.4rem .8rem;border-radius:99px;font-size:.85rem;font-weight:600}

      /* Abonnement (modal) */
      .fdh-modal-fond{position:fixed;inset:0;background:rgba(36,10,42,.75);display:grid;place-items:center;z-index:80;padding:1.2rem}
      .fdh-modal{background:#fff;border-radius:22px;padding:1.6rem 1.4rem;max-width:420px;width:100%;position:relative;max-height:92vh;overflow-y:auto}
      .fdh-modal-x{position:absolute;top:.7rem;right:.9rem;background:none;border:0;font-size:1.2rem;color:#9a8b92;cursor:pointer}
      .fdh-manuel-intro{color:#7A6B74;font-size:.9rem;margin:.1rem 0 1rem;line-height:1.45}
      .fdh-manuel-bloc{padding:.65rem 0;border-bottom:1px solid #F1E7EA}
      .fdh-manuel-titre{display:flex;align-items:center;gap:.5rem;font-weight:800;color:#3A0F38;font-size:.98rem}
      .fdh-manuel-titre span{font-size:1.15rem}
      .fdh-manuel-txt{margin:.28rem 0 0;color:#6b5c64;font-size:.85rem;line-height:1.48}
      .fdh-modal-badge{display:inline-block;background:#C69A4E;color:#3A0F38;font-weight:800;font-size:.78rem;padding:.25rem .9rem;border-radius:99px;text-transform:uppercase;letter-spacing:.05em}
      .fdh-modal-sous{color:#7A6B74;font-size:.9rem;margin:.6rem 0 1rem;line-height:1.4}
      .fdh-plans{display:flex;gap:.5rem;margin-bottom:1rem}
      .fdh-plan{flex:1;border:2px solid #E4D3D8;background:#fff;border-radius:14px;padding:.8rem .4rem;cursor:pointer;text-align:center;transition:.15s}
      .fdh-plan.on{border-color:#D62A5E;background:#fdeef3}
      .fdh-plan-nom{font-weight:800;font-size:.85rem;color:#4A1546}
      .fdh-plan-prix{font-weight:800;font-size:1.1rem;color:#D62A5E;margin:.2rem 0}
      .fdh-plan-note{font-size:.68rem;color:#9a8b92;line-height:1.2}
      .fdh-abo-msg{background:#F3E7EA;color:#5c4f57;padding:.7rem .9rem;border-radius:10px;font-size:.88rem;margin-top:.8rem;line-height:1.4}
      .fdh-abo-msg.err{background:#fdeaea;color:#b21f4e}
      .fdh-abo-note{text-align:center;font-size:.78rem;color:#9a8b92;margin-top:.7rem}
      .fdh-momo{display:flex;justify-content:center;gap:1rem;margin-top:1rem}
      .fdh-momo img{height:38px;width:auto;border-radius:8px}
      .fdh-modal-fin{text-align:center}
      .fdh-modal-emoji{font-size:3rem}
      .fdh-modal-fin h2{color:#D62A5E;font-size:1.5rem;margin:.3rem 0}
      .fdh-modal-fin p{color:#5c4f57;margin-bottom:1.4rem}
      .fdh-modal-attente{text-align:center;padding:1.5rem .5rem}
      .fdh-modal-attente h3{color:#4A1546;margin:1rem 0 .6rem}
      .fdh-attente-msg{color:#3A0F38;font-size:1rem;min-height:2.6em;line-height:1.35}
      .fdh-attente-note{color:#9a8b92;font-size:.82rem;margin-top:.6rem}
      .fdh-spinner{width:52px;height:52px;border-radius:50%;margin:0 auto;border:5px solid #F3E7EA;border-top-color:#D62A5E;animation:fdspin 1s linear infinite}
      @keyframes fdspin{to{transform:rotate(360deg)}}

      /* Nav */
      .fdh-nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:520px;background:#fff;border-top:1px solid #EEE0E4;display:flex;z-index:20;padding-bottom:env(safe-area-inset-bottom)}
      .fdh-tab{flex:1;border:0;background:none;cursor:pointer;padding:.5rem .1rem .6rem;display:flex;flex-direction:column;align-items:center;gap:.15rem;color:#9a8b92}
      .fdh-tab-emoji{font-size:1.2rem;filter:grayscale(.4);opacity:.7;transition:.15s;position:relative}
      .fdh-badge{position:absolute;top:-6px;right:-10px;min-width:16px;height:16px;padding:0 4px;
        background:#D62A5E;color:#fff;font-size:.62rem;font-weight:800;line-height:16px;text-align:center;
        border-radius:99px;box-shadow:0 0 0 2px #fff;filter:none;opacity:1}
      .fdh-tab-label{font-size:.6rem;font-weight:700}
      .fdh-tab.on{color:#D62A5E}
      .fdh-tab.on .fdh-tab-emoji{filter:none;opacity:1;transform:translateY(-1px)}
    `}</style>
  )
}
