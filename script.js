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
  els.hue.value = s.hue;
  els.hueVal.textContent = `${s.hue}°`;

  els.sat.value = s.sat;
  els.satVal.textContent = `${s.sat}%`;

  els.glow.value = s.glow;
  els.glowVal.textContent = s.glow;

  els.accent.value = s.accentShift;
  els.accentVal.textContent = `${s.accentShift}°`;

  els.radius.value = s.radius;
  els.radiusVal.textContent = `${s.radius}px`;

  els.contrast.value = s.contrast;
  els.contrastVal.textContent = `${s.contrast.toFixed(2)}x`;

  els.grain.checked = s.grain;
  els.motion.checked = s.motion;
  (s.mode === "light" ? els.modeLight : els.modeDark).checked = true;
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

    function renderTheme(vars) {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  }

  function update() {
    const s = stateFromControls();
    const vars = computeTheme(s);
    renderTheme(vars);
    saveState(s);
  }

  function saveState(s) {
    localStorage.setItem('themeforge-state', JSON.stringify(s));
  }

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem('themeforge-state'));
      if (!s) return null;
      return s;
    } catch { return null; }
  }

  function randomize() {
    const s = {
      hue: Math.round(Math.random() * 360),
      sat: Math.round(40 + Math.random() * 50),
      glow: round(Math.random(), 2),
      accentShift: Math.round(Math.random() * 120),
      grain: Math.random() > 0.3,
      motion: Math.random() > 0.2,
      radius: Math.round(Math.random() * 24),
      contrast: round(0.85 + Math.random() * 0.3, 2),
      mode: Math.random() > 0.5 ? 'dark' : 'light',
    };
    setControlsFromState(s);
    update();
  }

  function copyCss() {
    const s = stateFromControls();
    const vars = computeTheme(s);
    let css = ':root {\n';
    for (const [k, v] of Object.entries(vars)) css += `  ${k}: ${v};\n`;
    css += '}';
    navigator.clipboard.writeText(css);
    flash('✅ CSS copiado!');
  }

  function downloadCss() {
    const s = stateFromControls();
    const vars = computeTheme(s);
    let css = ':root {\n';
    for (const [k, v] of Object.entries(vars)) css += `  ${k}: ${v};\n`;
    css += '}\n';
    const blob = new Blob([css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'themeforge.css';
    a.click();
    URL.revokeObjectURL(url);
  }

  function shareUrl() {
    const s = stateFromControls();
    const params = new URLSearchParams(s).toString();
    const link = `${location.origin}${location.pathname}?${params}`;
    navigator.clipboard.writeText(link);
    flash('🔗 Link copiado!');
  }

  function flash(msg) {
    const el = document.createElement('div');
    el.className = 'flash';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('visible'), 10);
    setTimeout(() => el.classList.remove('visible'), 2000);
    setTimeout(() => el.remove(), 2600);
  }

  // Listeners
  Object.values(els).forEach(el => {
    if (el && el.tagName === 'INPUT') el.addEventListener('input', update);
  });

  els.randomize.addEventListener('click', randomize);
  els.copyCss.addEventListener('click', copyCss);
  els.downloadCss.addEventListener('click', downloadCss);
  els.shareUrl.addEventListener('click', shareUrl);

  // Presets
  $$('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.preset;
      const presets = {
        neon:   { hue: 180, sat: 80, glow: .7, accentShift: 40, mode: 'dark', grain: true, motion: true, radius: 12, contrast: 1.05 },
        cyber:  { hue: 210, sat: 86, glow: .9, accentShift: 30, mode: 'dark', grain: true, motion: true, radius: 16, contrast: 1.1 },
        aurora: { hue: 135, sat: 60, glow: .6, accentShift: 55, mode: 'dark', grain: true, motion: true, radius: 14, contrast: 1.0 },
        sunset: { hue: 18, sat: 78, glow: .5, accentShift: 90, mode: 'light', grain: true, motion: true, radius: 10, contrast: .96 },
        royal:  { hue: 260, sat: 65, glow: .8, accentShift: 60, mode: 'dark', grain: true, motion: true, radius: 18, contrast: 1.1 },
      };
      const s = presets[p];
      setControlsFromState(s);
      update();
      flash(`🎨 ${btn.textContent} aplicado!`);
    });
  });

  // Inicialização
  const loaded = loadState();
  if (loaded) setControlsFromState(loaded);
  update();
})();

(() => {
  const langToggle = document.getElementById("langToggle");
  if (!langToggle) return;

  const translations = {
    pt: {
      title: "Gerador de Temas",
      subtitle: "Minimal + toques futuristas (glow, animações)",
      baseColors: "Cores Base",
      hueLabel: "Matiz (Hue)",
      saturationLabel: "Saturação",
      modeLabel: "Modo",
      dark: "Escuro",
      light: "Claro",
      futuristicTouch: "Toque Futurista",
      glowIntensity: "Intensidade do Glow",
      accentOffset: "Offset de Acento",
      grainLabel: "Grid/Grain",
      motionLabel: "Animações",
      uiLabel: "UI",
      radiusLabel: "Arredondamento",
      contrastLabel: "Contraste",
      presets: "Presets",
      export: "Exportar",
      randomize: "Randomizar",
      copy: "Copiar CSS",
      download: "Baixar CSS",
      share: "Compartilhar",
      hint: "Dica: cole o CSS no seu portfólio e use as variáveis.",
      about: "Sobre",
      projects: "Projetos",
      contact: "Contato",
      heroName: "Seu Nome",
      heroDesc: "Desenvolvedor Frontend • UI minimalista com um toque sci-fi.",
      viewProjects: "Ver Projetos",
      contactBtn: "Contato",
      footer: "© 2025 Caio Rissa Silveira — Todos os direitos reservados",
    },
    en: {
      title: "Theme Generator",
      subtitle: "Minimal + futuristic touches (glow, motion)",
      baseColors: "Base Colors",
      hueLabel: "Hue",
      saturationLabel: "Saturation",
      modeLabel: "Mode",
      dark: "Dark",
      light: "Light",
      futuristicTouch: "Futuristic Touch",
      glowIntensity: "Glow Intensity",
      accentOffset: "Accent Offset",
      grainLabel: "Grid/Grain",
      motionLabel: "Animations",
      uiLabel: "UI",
      radiusLabel: "Border Radius",
      contrastLabel: "Contrast",
      presets: "Presets",
      export: "Export",
      randomize: "Randomize",
      copy: "Copy CSS",
      download: "Download CSS",
      share: "Share",
      hint: "Tip: paste this CSS into your portfolio and use the variables.",
      about: "About",
      projects: "Projects",
      contact: "Contact",
      heroName: "Your Name",
      heroDesc: "Frontend Developer • Minimal UI with a sci-fi vibe.",
      viewProjects: "View Projects",
      contactBtn: "Contact",
      footer: "© 2025 Caio Rissa Silveira — All rights reserved",
    }
  };

  function setLanguage(lang) {
    const t = translations[lang];
    if (!t) return;
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (t[key]) el.textContent = t[key];
    });
    localStorage.setItem("lang-themeforge", lang);
  }

  langToggle.addEventListener("change", (e) => setLanguage(e.target.value));
  const saved = localStorage.getItem("lang-themeforge") || "pt";
  langToggle.value = saved;
  setLanguage(saved);
})();

