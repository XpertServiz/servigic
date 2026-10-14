import { LogoMark3D } from "./LogoMark3D";

// First-visit splash. Server-rendered + two tiny inline scripts, so it paints
// before hydration and never waits on React:
//  1) before paint: mark the page as JS-enabled; if this browser session already
//     saw the splash, hide it instantly
//  2) on window load: fade out (minimum ~1.6s so the wordmark finishes, hard cap 3.2s, tap to skip)
// Visibility is driven by a class on <html> (suppressHydrationWarning there),
// never by removing React-owned DOM.
const BEFORE = `try{var d=document.documentElement;d.classList.add('js');if(sessionStorage.getItem('sv_splash')){d.classList.add('sv-splash-off')}else{sessionStorage.setItem('sv_splash','1');d.classList.add('sv-splash-on')}}catch(e){document.documentElement.classList.add('sv-splash-off')}`;
const AFTER = `(function(){var d=document.documentElement;if(!d.classList.contains('sv-splash-on'))return;var done=false;function hide(){if(done)return;done=true;d.classList.add('sv-splash-out');setTimeout(function(){d.classList.remove('sv-splash-on');d.classList.add('sv-splash-off')},700)}function soon(){setTimeout(hide,Math.max(0,1700-performance.now()))}if(document.readyState==='complete')soon();else addEventListener('load',soon);setTimeout(hide,3200);var el=document.getElementById('sv-splash');if(el)el.addEventListener('click',hide)})()`;

const WORD = "Servigic";

export function Splash({ tagline, label }: { tagline: string; label: string }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: BEFORE }} />
      <div id="sv-splash" role="status" aria-label={label}>
        <div className="sv-splash-glow" aria-hidden />
        <LogoMark3D size={124} variant="spin" />
        <p className="sv-splash-word" aria-hidden>
          {[...WORD].map((ch, i) => (
            <span key={i} style={{ animationDelay: `${0.35 + i * 0.05}s` }}>
              {ch}
            </span>
          ))}
        </p>
        <p className="sv-splash-sub" aria-hidden>
          {tagline}
        </p>
        <span className="sv-splash-line" aria-hidden>
          <span />
        </span>
      </div>
      <script dangerouslySetInnerHTML={{ __html: AFTER }} />
    </>
  );
}
