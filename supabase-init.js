/**
 * supabase-init.js — danielssal.com
 * Killswitch, tracking de visitas, heartbeat de visitantes activos.
 *
 * FIXES aplicados:
 * - sendBeacon eliminado (no soporta DELETE — siempre enviaba POST).
 *   La limpieza de visitantes_activos se delega a un cron job SQL.
 * - pageName normalizado correctamente (sin slash, sin .html)
 */

(async function () {
  const path = window.location.pathname;
  if (path.includes('login') || path.includes('panel')) return;

  // ── CLIENTE SUPABASE ───────────────────────────────────────
  const SUPA_URL = 'https://ivljbqgfxrlielbvezqn.supabase.co';
  const SUPA_KEY = 'sb_publishable_dKceDbEg-yxo7vEtc3M7Ag_M3xeDHx6';
  const { createClient } = supabase;
  const db = createClient(SUPA_URL, SUPA_KEY);

  // ── VISITOR ID (persistente por navegador) ─────────────────
  let vid = localStorage.getItem('dss_vid');
  if (!vid) {
    vid = crypto.randomUUID();
    localStorage.setItem('dss_vid', vid);
  }

  // ── NORMALIZAR NOMBRE DE PÁGINA ────────────────────────────
  // /portfolio.html → "portfolio" | / → "index" | /index.html → "index"
  const pageName = path
    .replace(/^\//, '')
    .replace(/\.html$/, '')
    .replace(/\/$/, '')
    || 'index';

  // ── KILLSWITCH ─────────────────────────────────────────────
  try {
    const { data } = await db
      .from('config')
      .select('value')
      .eq('key', 'en_construccion')
      .single();

    if (data?.value === 'true') {
      mostrarConstruccion();
      return;
    }
  } catch (_) {
    // Si Supabase falla, la web sigue funcionando normalmente
  }

  // ── TRACKING DE VISITA ─────────────────────────────────────
  const sessionKey = `dss_visited_${pageName}`;
  if (!sessionStorage.getItem(sessionKey)) {
    sessionStorage.setItem(sessionKey, '1');
    db.from('visitas').insert([{ visitor_id: vid, page: pageName }]).then(() => {});
  }

  // ── HEARTBEAT: visitantes activos ─────────────────────────
  async function heartbeat() {
    await db.from('visitantes_activos').upsert(
      [{ visitor_id: vid, last_seen: new Date().toISOString(), page: pageName }],
      { onConflict: 'visitor_id' }
    );
  }
  heartbeat();
  setInterval(heartbeat, 30_000);

  // ── REALTIME: recibir killswitch en tiempo real ────────────
  // Cuando el admin active "En Construcción" desde el panel,
  // TODOS los visitantes activos ven el overlay de inmediato sin recargar.
  db.channel('killswitch-live')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'config', filter: 'key=eq.en_construccion' },
      (payload) => {
        if (payload.new?.value === 'true') {
          mostrarConstruccion();
        }
      }
    )
    .subscribe();


  // ── OVERLAY "EN CONSTRUCCIÓN" ──────────────────────────────
  function mostrarConstruccion() {
    if (!document.querySelector('link[href*="Cormorant"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&display=swap';
      document.head.appendChild(link);
    }

    const style = document.createElement('style');
    style.textContent = `
      html, body { overflow: hidden !important; }
      #dss-construccion {
        position: fixed; inset: 0; z-index: 2147483647;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        text-align: center; padding: 2rem;
        background-color: #D8CFC0;
        background-image:
          url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E"),
          repeating-linear-gradient(105deg, transparent 0px, transparent 8px, rgba(255,255,255,0.04) 8px, rgba(255,255,255,0.04) 9px),
          repeating-linear-gradient(195deg, transparent 0px, transparent 12px, rgba(0,0,0,0.03) 12px, rgba(0,0,0,0.03) 13px),
          radial-gradient(ellipse at 25% 40%, rgba(255,252,240,0.5) 0%, transparent 55%),
          radial-gradient(ellipse at 75% 70%, rgba(200,185,160,0.6) 0%, transparent 50%),
          linear-gradient(135deg, #DDD5C4 0%, #C8BCA8 40%, #D4C9B6 70%, #C0B49E 100%);
        background-blend-mode: overlay, normal, normal, normal, normal, normal;
      }
      #dss-construccion::before {
        content:''; position:absolute; inset:16px;
        border:1px solid rgba(120,100,70,0.25); pointer-events:none;
      }
      #dss-construccion::after {
        content:''; position:absolute; inset:24px;
        border:1px solid rgba(120,100,70,0.15); pointer-events:none;
      }
      #dss-c-eyebrow {
        font-family:'EB Garamond','Garamond',Georgia,serif;
        font-size:clamp(0.65rem,2vw,0.8rem); letter-spacing:0.28em;
        text-transform:uppercase; color:rgba(80,60,30,0.55); margin-bottom:2rem;
        text-shadow:0 1px 0 rgba(255,255,255,0.4),0 -1px 0 rgba(0,0,0,0.15);
      }
      #dss-c-title {
        font-family:'Cormorant Garamond','Garamond',Georgia,serif;
        font-size:clamp(2.8rem,10vw,7rem); font-weight:300;
        letter-spacing:0.06em; line-height:1.05; color:transparent;
        -webkit-text-stroke:1px rgba(90,70,40,0.3);
        text-shadow:0 2px 4px rgba(0,0,0,0.25),0 -1px 0 rgba(255,255,255,0.45);
        background:linear-gradient(180deg,#6B5030 0%,#4A3520 50%,#7A6040 100%);
        -webkit-background-clip:text; background-clip:text;
      }
      #dss-c-ornament {
        color:rgba(130,100,55,0.4); font-size:1.2rem;
        margin:1.5rem 0; letter-spacing:0.5em;
        text-shadow:0 1px 0 rgba(255,255,255,0.4),0 -1px 0 rgba(0,0,0,0.12);
      }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'dss-construccion';
    // Solo el título — sin subtexto
    overlay.innerHTML = '<p id="dss-c-eyebrow">danielssal.com</p>'
      + '<h1 id="dss-c-title">En<br>Construcci\u00f3n</h1>'
      + '<div id="dss-c-ornament">\u2014 \u2736 \u2014</div>';
    document.body.appendChild(overlay);

    window.addEventListener('keydown', e => e.preventDefault(), true);
    window.addEventListener('contextmenu', e => e.preventDefault(), true);
  }

})();
