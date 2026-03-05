/**
 * supabase-init.js
 * danielssal.com — Script compartido
 * Cargado en todas las páginas públicas.
 * Funciones: killswitch "En Construcción", tracking de visitas, heartbeat de visitantes activos.
 */

(async function () {
  // No ejecutar en páginas de admin
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

  // ── KILLSWITCH: comprobar "en_construccion" ────────────────
  try {
    const { data } = await db
      .from('config')
      .select('value')
      .eq('key', 'en_construccion')
      .single();

    if (data?.value === 'true') {
      mostrarConstruccion();
      return; // No trackear visita ni continuar
    }
  } catch (_) {
    // Si falla Supabase, la web sigue funcionando normalmente
  }

  // ── TRACKING DE VISITA ─────────────────────────────────────
  // Solo contamos una vez por página por sesión de navegador
  const pageName = window.location.pathname.replace('/', '') || 'index';
  const sessionKey = `dss_visited_${pageName}`;
  if (!sessionStorage.getItem(sessionKey)) {
    sessionStorage.setItem(sessionKey, '1');
    db.from('visitas').insert([{ visitor_id: vid, page: pageName }]).then(() => {});
  }

  // ── HEARTBEAT: visitantes activos ─────────────────────────
  // Upsert cada 30s para mantener presencia activa
  async function heartbeat() {
    await db.from('visitantes_activos').upsert(
      [{ visitor_id: vid, last_seen: new Date().toISOString(), page: pageName }],
      { onConflict: 'visitor_id' }
    );
  }
  heartbeat();
  setInterval(heartbeat, 30_000);

  // Al salir de la página, borrar del conteo activo
  window.addEventListener('beforeunload', () => {
    navigator.sendBeacon(
      `${SUPA_URL}/rest/v1/visitantes_activos?visitor_id=eq.${vid}`,
      JSON.stringify({ _method: 'DELETE' })
    );
  });


  // ── OVERLAY "EN CONSTRUCCIÓN" ──────────────────────────────
  function mostrarConstruccion() {
    // Inyectar fuentes si no están cargadas
    if (!document.querySelector('link[href*="Cormorant"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&display=swap';
      document.head.appendChild(link);
    }

    // Inyectar estilos del overlay
    const style = document.createElement('style');
    style.textContent = `
      html, body { overflow: hidden !important; }

      #dss-construccion {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 2rem;
        /* Textura mármol */
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
        content: '';
        position: absolute;
        inset: 16px;
        border: 1px solid rgba(120,100,70,0.25);
        pointer-events: none;
      }

      #dss-construccion::after {
        content: '';
        position: absolute;
        inset: 24px;
        border: 1px solid rgba(120,100,70,0.15);
        pointer-events: none;
      }

      #dss-c-eyebrow {
        font-family: 'EB Garamond', 'Garamond', Georgia, serif;
        font-size: clamp(0.65rem, 2vw, 0.8rem);
        letter-spacing: 0.28em;
        text-transform: uppercase;
        color: rgba(80,60,30,0.55);
        margin-bottom: 2rem;
        /* Efecto grabado */
        text-shadow: 0 1px 0 rgba(255,255,255,0.4), 0 -1px 0 rgba(0,0,0,0.15);
      }

      #dss-c-title {
        font-family: 'Cormorant Garamond', 'Garamond', Georgia, serif;
        font-size: clamp(2.8rem, 10vw, 7rem);
        font-weight: 300;
        letter-spacing: 0.06em;
        line-height: 1.05;
        color: transparent;
        /* Texto tallado en piedra: hueco hacia arriba, sombra abajo */
        -webkit-text-stroke: 1px rgba(90,70,40,0.3);
        text-shadow:
          0 2px 4px rgba(0,0,0,0.25),
          0 -1px 0 rgba(255,255,255,0.45),
          inset 0 1px 2px rgba(0,0,0,0.3);
        /* Fallback para navegadores sin soporte */
        background: linear-gradient(180deg, #6B5030 0%, #4A3520 50%, #7A6040 100%);
        -webkit-background-clip: text;
        background-clip: text;
        position: relative;
      }

      #dss-c-sub {
        font-family: 'EB Garamond', 'Garamond', Georgia, serif;
        font-size: clamp(0.85rem, 2.5vw, 1.1rem);
        font-style: italic;
        color: rgba(80,60,30,0.5);
        margin-top: 2rem;
        letter-spacing: 0.08em;
        text-shadow: 0 1px 0 rgba(255,255,255,0.35), 0 -1px 0 rgba(0,0,0,0.1);
      }

      #dss-c-ornament {
        color: rgba(130,100,55,0.4);
        font-size: 1.2rem;
        margin: 1.5rem 0;
        letter-spacing: 0.5em;
        text-shadow: 0 1px 0 rgba(255,255,255,0.4), 0 -1px 0 rgba(0,0,0,0.12);
      }
    `;
    document.head.appendChild(style);

    // Crear overlay
    const overlay = document.createElement('div');
    overlay.id = 'dss-construccion';
    overlay.innerHTML = `
      <p id="dss-c-eyebrow">danielssal.com</p>
      <h1 id="dss-c-title">En<br>Construcción</h1>
      <div id="dss-c-ornament">— ✦ —</div>
      <p id="dss-c-sub">Volveremos pronto.</p>
    `;
    document.body.appendChild(overlay);

    // Bloquear navegación y shortcuts
    window.addEventListener('keydown', e => e.preventDefault(), true);
    window.addEventListener('contextmenu', e => e.preventDefault(), true);

    // El bloqueo real funciona porque CADA carga de página consulta Supabase.
    // Mientras el killswitch esté activo en la DB, este overlay aparecerá siempre.
  }

})();
