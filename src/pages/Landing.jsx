// FortyDate — Page d'accueil (landing) pour les visiteurs non connectés
// Affichée uniquement si aucune session. CTA -> inscription, lien -> connexion.
import { LOGO } from '../lib/logo'

const PAYS = [
  ['🇨🇲', 'Cameroun'], ['🇧🇯', 'Bénin'], ['🇨🇮', "Côte d'Ivoire"],
  ['🇸🇳', 'Sénégal'], ['🇹🇬', 'Togo'], ['🇬🇦', 'Gabon'], ['🇨🇩', 'RDC'],
  ['🇲🇱', 'Mali'], ['🇧🇫', 'Burkina Faso'], ['🇳🇪', 'Niger'], ['🇬🇳', 'Guinée'],
  ['🇨🇬', 'Congo'], ['🇹🇩', 'Tchad'], ['➕', 'et plus'],
]

function Coeur({ c = '#D62A5E', t = 26 }) {
  return (
    <svg width={t} height={t} viewBox="0 0 24 24" fill={c} aria-hidden="true">
      <path d="M12 21s-7.5-4.9-10-9.2C.3 8.6 1.7 5 5.2 5c2 0 3.4 1.2 4.3 2.5C10.4 6.2 11.8 5 13.8 5c3.5 0 4.9 3.6 3.2 6.8C19.5 16.1 12 21 12 21z" />
    </svg>
  )
}
function Cadenas({ c = '#4A1546', t = 26 }) {
  return (
    <svg width={t} height={t} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" fill={c} />
      <path d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5" stroke={c} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1.7" fill="#fff" />
    </svg>
  )
}
function Bague({ c = '#D62A5E', t = 26 }) {
  return (
    <svg width={t} height={t} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 6l1.5-2.5h5L16 6l-4 2z" fill="#C69A4E" />
      <circle cx="12" cy="15" r="6.2" stroke={c} strokeWidth="2.4" fill="none" />
    </svg>
  )
}

export default function Landing({ onInscription, onConnexion }) {
  return (
    <div className="fdl">
      <Style />

      <header className="fdl-head">
        <img className="fdl-logo" src={LOGO} alt="FortyDate — Rencontres sérieuses pour les 40 ans et plus" />
      </header>

      <main className="fdl-main">
        <div className="fdl-badge40">
          <span className="fdl-badge40-num">40+</span>
          <span>La rencontre sérieuse à partir de 40 ans</span>
        </div>

        <div className="fdl-photo">
          <img
            src="/hero.png"
            alt="L'amour n'a pas d'âge, la sincérité fait la différence"
            onError={(e) => { e.currentTarget.classList.add('vide') }}
          />
          <div className="fdl-photo-txt">
            <span className="fdl-photo-40">40+</span>
            <span>Célibataires, divorcés et veufs<br />de 40 ans et plus</span>
          </div>
        </div>

        <p className="fdl-sous">
          Des rencontres vraies pour construire<br />une histoire qui dure.
        </p>

        <button className="fdl-cta" onClick={onInscription}>
          <span className="fdl-cta-ic"><Coeur c="#fff" t={22} /></span>
          Je m'inscris gratuitement
          <span className="fdl-cta-fl">→</span>
        </button>

        <button className="fdl-connexion" onClick={onConnexion}>
          Déjà membre ? <b>Se connecter</b>
        </button>

        <div className="fdl-atouts">
          <div className="fdl-atout">
            <Coeur t={30} />
            <span>Rencontres<br />sérieuses</span>
          </div>
          <div className="fdl-sep" />
          <div className="fdl-atout">
            <Cadenas t={30} />
            <span>Confidentialité<br />et sécurité</span>
          </div>
          <div className="fdl-sep" />
          <div className="fdl-atout">
            <Bague t={30} />
            <span>Relations<br />durables</span>
          </div>
        </div>

        <p className="fdl-ouvert">Ouvert aux célibataires, divorcés et veufs</p>
        <p className="fdl-quevous">Que vous soyez en :</p>

        <div className="fdl-pays">
          {PAYS.map(([f, n]) => (
            <div className="fdl-pays-it" key={n}>
              <span className={'fdl-flag' + (f === '➕' ? ' plus' : '')}>{f}</span>
              <span className="fdl-pays-nom">{n}</span>
            </div>
          ))}
        </div>
      </main>

      <footer className="fdl-foot">
        <div className="fdl-foot-coeur"><Coeur c="#D62A5E" t={26} /></div>
        <p className="fdl-foot-t">Votre plus belle histoire commence ici.</p>
        <p className="fdl-foot-u">www.fortydate.com</p>
      </footer>
    </div>
  )
}

function Style() {
  return (
    <style>{`
      html,body{margin:0;padding:0}
      .fdl{width:100%;max-width:480px;margin:0 auto;background:#fff;
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
        color:#4A1546;overflow-x:hidden}
      .fdl-head{padding:1.1rem 1.2rem .4rem;display:flex;justify-content:center}
      .fdl-logo{height:52px;width:auto;max-width:92%;object-fit:contain;display:block}

      .fdl-main{padding:.4rem 1.4rem 0}

      .fdl-badge40{display:inline-flex;align-items:center;gap:.5rem;
        background:#f6e9f0;color:#4A1546;border:1px solid #e7cede;
        border-radius:99px;padding:.4rem .8rem .4rem .45rem;
        font-size:.82rem;font-weight:700;margin:.7rem 0 .2rem}
      .fdl-badge40-num{background:#D62A5E;color:#fff;font-weight:800;
        border-radius:99px;padding:.15rem .55rem;font-size:.86rem;letter-spacing:-.5px}

      .fdl-titre{font-size:2.15rem;line-height:1.12;font-weight:800;
        color:#3a1230;letter-spacing:-.5px;margin:.5rem 0 .2rem}
      .fdl-rose{color:#D62A5E}
      .fdl-coeur-deco{margin:.1rem 0 .3rem}

      .fdl-photo{position:relative;margin:.7rem 0 1.1rem;border-radius:20px;overflow:hidden;
        background:linear-gradient(135deg,#4A1546 0%,#D62A5E 55%,#C69A4E 100%);
        aspect-ratio:16/11;display:flex;align-items:center;justify-content:center}
      .fdl-photo img{position:relative;z-index:2;width:100%;height:100%;object-fit:cover;display:block}
      .fdl-photo img.vide{display:none}
      .fdl-photo-txt{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:.5rem;text-align:center;
        color:#fff;padding:1rem;line-height:1.35;font-weight:600;
        text-shadow:0 2px 12px rgba(0,0,0,.28)}
      .fdl-photo-40{font-size:3.2rem;font-weight:800;letter-spacing:-2px;line-height:1}

      .fdl-sous{border-left:3px solid #C69A4E;padding-left:.8rem;
        font-size:1.02rem;line-height:1.4;color:#5a3652;font-weight:500;margin:.4rem 0 1.3rem}

      .fdl-cta{width:100%;border:none;cursor:pointer;
        background:linear-gradient(90deg,#D62A5E,#b81f4d);color:#fff;
        border-radius:40px;padding:1.05rem 1.2rem;font-size:1.12rem;font-weight:700;
        display:flex;align-items:center;justify-content:center;gap:.55rem;
        box-shadow:0 10px 26px rgba(214,42,94,.32)}
      .fdl-cta:active{transform:translateY(1px)}
      .fdl-cta-ic{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.22);
        display:flex;align-items:center;justify-content:center;flex:0 0 auto}
      .fdl-cta-fl{font-size:1.25rem;font-weight:400}

      .fdl-connexion{display:block;width:100%;background:none;border:none;cursor:pointer;
        margin:.85rem 0 .3rem;font-size:.96rem;color:#5a3652}
      .fdl-connexion b{color:#D62A5E}

      .fdl-atouts{display:flex;align-items:stretch;justify-content:center;
        gap:.2rem;margin:1.7rem 0 1.3rem;text-align:center}
      .fdl-atout{flex:1;display:flex;flex-direction:column;align-items:center;gap:.55rem;
        font-size:.86rem;font-weight:700;line-height:1.25;color:#3a1230}
      .fdl-sep{width:1px;background:#e7dbe4;margin:.2rem 0}

      .fdl-ouvert{text-align:center;font-size:1.05rem;font-weight:800;color:#3a1230;margin:1.4rem 0 .1rem}
      .fdl-quevous{text-align:center;font-size:.9rem;font-weight:700;color:#D62A5E;margin:.3rem 0 1rem}

      .fdl-pays{display:grid;grid-template-columns:repeat(7,1fr);gap:.5rem .2rem;margin-bottom:.4rem}
      .fdl-pays-it{display:flex;flex-direction:column;align-items:center;gap:.28rem;min-width:0}
      .fdl-flag{width:40px;height:40px;border-radius:50%;font-size:26px;line-height:40px;
        text-align:center;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.12);background:#f3eef1}
      .fdl-flag.plus{background:#efe6ed;color:#8a6c84;font-size:20px}
      .fdl-pays-nom{font-size:.6rem;text-align:center;color:#5a3652;line-height:1.1;font-weight:600}

      .fdl-foot{margin-top:1.6rem;background:#3a1230;color:#fff;
        padding:1.5rem 1.2rem 1.8rem;text-align:center;border-radius:22px 22px 0 0}
      .fdl-foot-coeur{margin-bottom:.5rem}
      .fdl-foot-t{font-size:1.05rem;font-weight:700;margin:.2rem 0 .5rem;color:#fff}
      .fdl-foot-u{font-size:.95rem;font-weight:700;color:#e58aa8;margin:0}

      @media (max-width:360px){
        .fdl-titre{font-size:1.85rem}
        .fdl-pays{grid-template-columns:repeat(4,1fr)}
      }
    `}</style>
  )
}
