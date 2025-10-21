(() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const els = {
    hue:        $('#hue'),
    sat:        $('#sat'),
    glow:       $('#glow'),
    accent:     $('#accentShift'),
    grain:      $('#grain'),
    motion:     $('#motion'),
    radius:     $('#radius'),
    contrast:   $('#contrast'),
    modeDark:   $('#modeDark'),
    modeLight:  $('#modeLight'),
    // value labels
    hueVal:     $('#hueVal'),
    satVal:     $('#satVal'),
    glowVal:    $('#glowVal'),
    accentVal:  $('#accentShiftVal'),
    radiusVal:  $('#radiusVal'),
    contrastVal:$('#contrastVal'),
    // actions
    randomize:  $('#randomize'),
    copyCss:    $('#copyCss'),
    downloadCss:$('#downloadCss'),
    shareUrl:   $('#shareUrl'),
  };

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
  function round(n, p = 2) { const f = 10**p; return Math.round(n * f)/f; }
  const hsl = (h, s, l) => `hsl(${Math.round(h)} ${round(s)}% ${round(l)}%)`;
  const hsla = (h, s, l, a) => `hsla(${Math.round(h)} ${round(s)}% ${round(l)}% / ${a})`;

  function getMode() { return els.modeLight.checked ? 'light' : 'dark'; }

  function stateFromControls() {
    return {
      hue: Number(els.hue.value),
      sat: Number(els.sat.value),
      glow: Number(els.glow.value),
      accentShift: Number(els.accent.value),
      grain: els.grain.checked,
      motion: els.motion.checked,
      radius: Number(els.radius.value),
      contrast: Number(els.contrast.value),
      mode: getMode(),
    };
  }

  function setControlsFromState(s) {
    els.hue.value = s.hue; els.hueVal.textContent = s.hue;
    els.sat.value = s.sat; els.satVal.textContent = s.sat;
    els.glow.value = s.glow; els.glowVal.textContent = s.glow;
    els.accent.value = s.accentShift; els.accentVal.textContent = s.accentShift;
    els.grain.checked = s.grain;
    els.motion.checked = s.motion;
    els.radius.value = s.radius; els.radiusVal.textContent = s.radius;
    els.contrast.value = s.contrast; els.contrastVal.textContent = s.contrast.toFixed(2);
    (s.mode === 'light' ? els.modeLight : els.modeDark).checked = true;
  }

  function computeTheme(s) {
    const { hue: H, sat: S, accentShift, contrast, mode } = s;

    // Base lightness presets
    let bgL, surfaceL, elevatedL, textL, mutedL;
    if (mode === 'dark') {
      bgL = clamp(7 / contrast, 2, 14);
      surfaceL = clamp(10 / contrast, 4, 20);
      elevatedL = clamp(12 / contrast, 6, 24);
      textL = clamp(92 * contrast, 70, 98);
      mutedL = clamp(64 * Math.min(1.1, contrast + 0.05), 35, 80);
    } else {
      const k = (contrast - 1); // -0.15..+0.15
      bgL = clamp(98 - k * 8, 90, 99);
      surfaceL = clamp(96 - k * 7, 86, 98);
      elevatedL = clamp(92 - k * 8, 80, 96);
      textL = clamp(12 - k * 12, 4, 24);
      mutedL = clamp(36 - k * 8, 18, 50);
    }

    // Primary & accents
    const primaryL = mode === 'dark' ? 60 : 52;
    const primary = hsl(H, S, primaryL);
    const accent2 = hsl((H + accentShift) % 360, clamp(S + 6, 0, 100), clamp(primaryL + (mode === 'dark' ? 4 : -2), 0, 100));
    const ring = hsla(H, S, primaryL, .35);
    const glow = hsla(H, S, primaryL, .6);

    const bg = hsl(H, clamp(S * .26, 0, 100), bgL);
    const surface = hsl(H, clamp(S * .26, 0, 100), surfaceL);
    const elevated = hsl(H, clamp(S * .28, 0, 100), elevatedL);
    const text = hsl(H, clamp(S * .18, 0, 100), textL);
    const muted = hsl(H, clamp(S * .14, 0, 100), mutedL);

    const primaryContrast = primaryL > 55 ? '#0b0f14' : '#f7f9fb';

    return {
      '--bg': bg,
      '--surface': surface,
      '--elevated': elevated,
      '--text': text,
      '--muted': muted,
      '--primary': primary,
      '--primary-contrast': primaryContrast,
      '--ring': ring,
      '--glow': glow,
      '--radius': `${s.radius}px`,
      '--glow-i': String(s.glow),
      '--contrast': String(s.contrast),
      '--grid-opacity': s.grain ? '0.25' : '0',
    };
  }

  function applyTheme(vars, s) {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);

    document.body.dataset.mode = s.mode;
    document.body.dataset.grain = s.grain ? 'on' : 'off';
    document.body.dataset.motion = s.motion ? 'on' : 'off';
  }

  function updateLabels() {
    els.hueVal.textContent = els.hue.value;
    els.satVal.textContent = els.sat.value;
    els.glowVal.textContent = Number(els.glow.value).toFixed(2).replace(/\.00$/, '.0');
    els.accentVal.textContent = els.accent.value;
    els.radiusVal.textContent = els.radius.value;
    els.contrastVal.textContent = Number(els.contrast.value).toFixed(2);
  }

  function serializeState(s) {
    const params = new URLSearchParams({
      h: s.hue, sa: s.sat, g: s.glow, as: s.accentShift, gr: s.grain ? 1 : 0, m: s.motion ? 1 : 0,
      r: s.radius, c: s.contrast, md: s.mode === 'light' ? 'l' : 'd'
    });
    return params.toString();
  }
  function parseState() {
    const q = new URLSearchParams(location.search);
    const parseNum = (k, d, f = Number) => (q.has(k) ? f(q.get(k)) : d);
    const md = q.get('md');
    return {
      hue: parseNum('h', Number(els.hue.value)),
      sat: parseNum('sa', Number(els.sat.value)),
      glow: parseNum('g', Number(els.glow.value)),
      accentShift: parseNum('as', Number(els.accent.value)),
      grain: parseNum('gr', 1) == 1,
      motion: parseNum('m', 1) == 1,
      radius: parseNum('r', Number(els.radius.value)),
      contrast: parseNum('c', Number(els.contrast.value), Number),
      mode: md === 'l' ? 'light' : 'dark',
    };
  }

  function updateURL(s, replace = true) {
    const qs = serializeState(s);
    const url = `${location.pathname}?${qs}`;
    if (replace) history.replaceState(null, '', url); else history.pushState(null, '', url);
  }

  function toCSS(vars) {
    const lines = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join('\n');
    const usage = `:root {\n${lines}\n}`;
    const helpers = `\n\n/* Exemplo de uso */\n.button {\n  background: var(--primary);\n  color: var(--primary-contrast);\n  border-radius: var(--radius);\n  box-shadow: 0 0 calc(30px * var(--glow-i)) var(--glow);\n}\n.card {\n  background: var(--surface);\n  color: var(--text);\n  border: 1px solid color-mix(in oklab, var(--primary) 20%, var(--surface));\n  border-radius: var(--radius);\n}`;
    return `/* Tema gerado pelo Gerador de Temas — Minimal Futurista */\n${usage}${helpers}\n`;
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
  }
  function download(filename, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/css' }));
    a.download = filename; a.click(); URL.revokeObjectURL(a.href);
  }

  function applyFromControls() {
    updateLabels();
    const s = stateFromControls();
    const vars = computeTheme(s);
    applyTheme(vars, s);
    updateURL(s, true);
  }

  // Presets
  const PRESETS = {
    neon:   { hue: 190, sat: 78, glow: .75, accentShift: 22, grain: true,  motion: true,  radius: 12, contrast: 1.03, mode: 'dark' },
    cyber:  { hue: 208, sat: 80, glow: .70, accentShift: 30, grain: true,  motion: true,  radius: 12, contrast: 1.05, mode: 'dark' },
    aurora: { hue: 150, sat: 70, glow: .65, accentShift: 18, grain: true,  motion: true,  radius: 14, contrast: 1.02, mode: 'dark' },
    sunset: { hue: 12,  sat: 78, glow: .68, accentShift: 40, grain: false, motion: true,  radius: 16, contrast: 1.00, mode: 'light' },
    royal:  { hue: 268, sat: 64, glow: .72, accentShift: 26, grain: true,  motion: true,  radius: 14, contrast: 1.06, mode: 'dark' },
  };

  function randomize() {
    const r = (min, max) => Math.random() * (max - min) + min;
    const s = {
      hue: Math.round(r(0, 360)),
      sat: Math.round(r(55, 88)),
      glow: round(r(.45, .9), 2),
      accentShift: Math.round(r(8, 60)),
      grain: Math.random() > .3,
      motion: Math.random() > .15,
      radius: Math.round(r(6, 18)),
      contrast: round(r(.92, 1.10), 2),
      mode: Math.random() > .33 ? 'dark' : 'light',
    };
    setControlsFromState(s);
    applyFromControls();
  }

  // Event wiring
  ['input', 'change'].forEach(evt => {
    $$('.panel input').forEach(el => el.addEventListener(evt, applyFromControls));
  });

  els.randomize.addEventListener('click', () => randomize());

  els.copyCss.addEventListener('click', async () => {
    const vars = computeTheme(stateFromControls());
    const css = toCSS(vars);
    const ok = await copy(css);
    feedback(els.copyCss, ok ? 'Copiado!' : 'Erro');
  });

  els.downloadCss.addEventListener('click', () => {
    const vars = computeTheme(stateFromControls());
    const css = toCSS(vars);
    download('theme.css', css);
  });

  els.shareUrl.addEventListener('click', async () => {
    const s = stateFromControls();
    updateURL(s, false);
    const ok = await copy(location.href);
    feedback(els.shareUrl, ok ? 'Link copiado' : 'URL atualizada');
  });

  $$('.chip[data-preset]').forEach(btn => btn.addEventListener('click', () => {
    const p = PRESETS[btn.dataset.preset];
    if (!p) return;
    setControlsFromState(p);
    applyFromControls();
  }));

  function feedback(button, text) {
    const prev = button.textContent;
    button.textContent = text;
    button.disabled = true;
    setTimeout(() => { button.textContent = prev; button.disabled = false; }, 1100);
  }

  // Init
  (function init() {
    const s = parseState();
    setControlsFromState(s);
    applyFromControls();
  })();
})();