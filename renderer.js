// Kuba Equalizador Desktop – Renderer
(function () {
  const kubaAPI = window.kubaAPI;
  const FS = 96000;
  function peak(f, g, q, fs) {
    const A = Math.pow(10, g / 40);
    const w = (2 * Math.PI * f) / fs;
    const al = Math.sin(w) / (2 * q);
    const a0 = 1 + al / A;
    return {
      b0: (1 + al * A) / a0,
      b1: (-2 * Math.cos(w)) / a0,
      b2: (1 - al * A) / a0,
      a1: (-2 * Math.cos(w)) / a0,
      a2: (1 - al / A) / a0,
    };
  }
  function lowShelf(f, g, q, fs) {
    const A = Math.pow(10, g / 40);
    const w = (2 * Math.PI * f) / fs;
    const al = Math.sin(w) / (2 * q);
    const c = Math.cos(w);
    const s = 2 * Math.sqrt(A) * al;
    const a0 = A + 1 + (A - 1) * c + s;
    return {
      b0: (A * (A + 1 - (A - 1) * c + s)) / a0,
      b1: (2 * A * (A - 1 - (A + 1) * c)) / a0,
      b2: (A * (A + 1 - (A - 1) * c - s)) / a0,
      a1: (-2 * (A - 1 + (A + 1) * c)) / a0,
      a2: (A + 1 + (A - 1) * c - s) / a0,
    };
  }
  function coeffs(b) {
    return (b.type === "LS" ? lowShelf : peak)(b.f, b.g, b.q, FS);
  }
  function response(bands, f) {
    let db = 0;
    const w = (2 * Math.PI * f) / FS;
    const c1 = Math.cos(w),
      s1 = Math.sin(w);
    const c2 = Math.cos(2 * w),
      s2 = Math.sin(2 * w);
    for (const b of bands) {
      const k = coeffs(b);
      const nr = k.b0 + k.b1 * c1 + k.b2 * c2;
      const ni = -(k.b1 * s1 + k.b2 * s2);
      const dr = 1 + k.a1 * c1 + k.a2 * c2;
      const di = -(k.a1 * s1 + k.a2 * s2);
      db += 10 * Math.log10((nr * nr + ni * ni) / (dr * dr + di * di));
    }
    return db;
  }
  const FMIN = 20,
    FMAX = 20000;
  const GRAPH_Y_MIN = -25;
  const GRAPH_Y_MAX = 20;
  const GRAPH_Y_STEP = 5;
  const GRAPH_X_TICKS = [
    20, 30, 40, 50, 60, 80, 100, 150, 200, 300, 400, 500, 800, 1000, 1500, 2000,
    3000, 4000, 5000, 6000, 8000, 10000, 15000, 20000,
  ];
  function xOf(f, w) {
    return (Math.log(f / FMIN) / Math.log(FMAX / FMIN)) * w;
  }
  function formatFreq(f) {
    return f >= 1000
      ? f % 1000 === 0
        ? `${f / 1000}k`
        : `${f / 1000}k`
      : String(f);
  }
  function genFreqPoints(n = 240) {
    const f = [],
      db = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      f.push(FMIN * Math.pow(FMAX / FMIN, t));
      db.push(0);
    }
    return { f, db };
  }
  const FREQ = genFreqPoints();
  const PK = (f, g, q) => ({ type: "PK", f, g, q });
  const LS = (f, g, q) => ({ type: "LS", f, g, q });
  const MODEL_NAMES = { auri: "Auri" };

  const PRESETS = {
    auri: [
      {
        id: "padrao",
        group: "pref",
        name: "Auri",
        desc: "A assinatura do Auri, inspirada pela comunidade.",
        target: "JM-1",
        pre: -2.8,
        bands: [
          PK(25.0, -0.8, 0.3),
          PK(150, -3.0, 0.69),
          PK(2237, -10.0, 1.41),
          PK(4348, -6.1, 3.0),
          PK(4958, -8.3, 2.72),
          PK(7178, -10.0, 3.0),
          PK(11063, -10.0, 3.0),
          PK(520, 3.1, 0.81),
          PK(3046, 5.7, 1.51),
          PK(5995, 3.4, 0.59),
        ],
      },
      {
        id: "pref6",
        group: "pref",
        name: "Natural",
        desc: "Subgrave presente, médios limpos e agudos arejados.",
        target: "JM-1",
        pre: -3.0,
        bands: [
          PK(25.0, -2.0, 0.4),
          PK(167, -6.2, 0.53),
          PK(2560, -8.0, 1.03),
          PK(4911, -8.0, 4.0),
          PK(7838, -6.7, 4.0),
          PK(11523, -6.5, 4.0),
          PK(270, 0.1, 4.0),
          PK(404, 4.1, 0.48),
          PK(2930, 7.0, 2.94),
          PK(3537, 4.5, 4.0),
        ],
      },
      {
        id: "emv",
        group: "pref",
        name: "Em V",
        desc: "Alvo com graves e agudos levantados.",
        target: "JM-1",
        pre: -7.8,
        bands: [
          PK(1084, -1.1, 3.0),
          PK(1930, -1.9, 2.39),
          PK(2334, -8.0, 1.93),
          PK(4454, -8.0, 2.63),
          PK(5568, -4.2, 1.55),
          PK(7504, -7.2, 3.0),
          PK(107, 0.7, 0.5),
          PK(473, 2.4, 0.5),
          PK(6814, 7.7, 1.48),
          PK(8862, 8.0, 3.0),
        ],
      },
      {
        id: "basshead",
        group: "pref",
        name: "Basshead",
        desc: "Para os amantes de graves.",
        target: "Basshead",
        pre: -5.7,
        bands: [
          PK(4613, -12.0, 2.5),
          PK(2246, -12.0, 1.31),
          PK(6746, -7.9, 2.5),
          PK(1122, -2.6, 1.73),
          PK(10302, -6.1, 2.5),
          PK(20.0, -5.0, 0.42),
          PK(223, -4.9, 0.84),
          PK(3184, 2.5, 2.5),
          PK(3116, 9.2, 0.3),
          LS(286, 8.2, 0.47),
        ],
      },
      {
        id: "energico",
        group: "pref",
        name: "Enérgico",
        desc: "Sonoridade intensa, pensada para rock.",
        target: "JM-1",
        pre: -3.3,
        bands: [
          PK(25.0, -3.1, 0.5),
          PK(97.0, -1.4, 0.68),
          PK(2445, -8.0, 0.87),
          PK(4725, -8.0, 3.0),
          PK(6920, -8.0, 3.0),
          PK(12439, -8.0, 1.96),
          PK(1838, 5.0, 0.92),
          PK(2904, 4.5, 2.62),
          PK(3665, 3.7, 3.0),
          PK(8376, 8.0, 2.42),
        ],
      },
      {
        id: "musical",
        group: "pref",
        name: "Musical",
        desc: "Graves fortes, médios comedidos e agudos delicados.",
        target: "JM-1",
        pre: -2.3,
        bands: [
          PK(24.0, -3.2, 0.1),
          PK(2277, -8.0, 1.69),
          PK(4588, -9.4, 2.8),
          PK(5979, -3.8, 2.0),
          PK(7184, -3.2, 3.0),
          PK(10638, -10.4, 3.0),
          PK(840, 2.2, 1.54),
          PK(1393, 2.0, 1.85),
          PK(3224, 1.1, 3.0),
          PK(15808, 2.2, 2.5),
        ],
      },
      {
        id: "analitico",
        group: "pref",
        name: "Analítico",
        desc: "Para quem prioriza detalhamento e clareza.",
        target: "Analítico",
        pre: -0.8,
        bands: [
          LS(120, -9.3, 0.44),
          PK(7007, -9.1, 2.5),
          PK(147, -3.5, 0.48),
          PK(4561, -12.0, 2.5),
          PK(2198, -12.0, 1.42),
          PK(255, -0.4, 1.78),
          PK(11291, -7.8, 2.5),
          PK(1093, -2.7, 1.17),
          PK(3226, 6.2, 0.3),
          PK(3028, 1.8, 2.5),
        ],
      },
      {
        id: "referencia",
        group: "ref",
        name: "JM-1",
        desc: "Sonoridade fiel à JM-1.",
        target: "Referência",
        pre: -4.0,
        bands: [
          LS(297, -3.4, 0.81),
          PK(11107, -4.8, 2.5),
          PK(1027, -1.7, 1.98),
          PK(20.0, -3.6, 0.57),
          PK(7055, -3.8, 2.5),
          PK(4588, -8.0, 2.5),
          PK(2208, -8.2, 1.83),
          PK(595, 3.5, 0.42),
          PK(3144, 5.6, 1.69),
          PK(3031, 0.5, 2.5),
        ],
      },
      {
        id: "harman",
        group: "ref",
        name: "Harman IE 2019",
        desc: "Curva de preferência Harman para in-ear.",
        target: "Harman",
        pre: -4.5,
        bands: [
          PK(20.0, -3.0, 0.5),
          PK(150, -2.5, 0.7),
          PK(500, 1.0, 0.8),
          PK(1000, 0.5, 1.0),
          PK(2500, -2.0, 1.2),
          PK(5000, 1.5, 1.5),
          PK(8000, 2.0, 2.0),
          PK(12000, -1.0, 2.0),
          PK(15000, -3.0, 1.5),
          PK(500, 0.5, 0.9),
        ],
      },
    ],
  };
  PRESETS.auri.push(
    {
      id: "vdsf",
      group: "ref",
      name: "VDSF",
      desc: "Meio-termo entre campo difuso e Harman, com graves discretos.",
      target: "VDSF",
      pre: -3.5,
      bands: [
        LS(90, -2.0, 0.6),
        PK(180, -1.5, 0.8),
        PK(500, 1.0, 0.8),
        PK(1200, 0.5, 1.0),
        PK(2500, -1.0, 1.1),
        PK(4500, -1.5, 1.4),
        PK(7000, 1.0, 1.8),
        PK(10000, -1.0, 2.0),
        PK(14000, -2.0, 1.8),
        PK(17000, -1.0, 1.5),
      ],
    },
    {
      id: "etymotic",
      group: "ref",
      name: "Etymotic",
      desc: "Graves contidos e muita definição nos médios e agudos.",
      target: "Etymotic",
      pre: -2.5,
      bands: [
        LS(100, -4.0, 0.5),
        PK(180, -2.0, 0.7),
        PK(500, 0.0, 0.8),
        PK(1200, 1.0, 1.0),
        PK(2500, 1.5, 1.1),
        PK(4500, 1.0, 1.4),
        PK(7000, 0.0, 1.8),
        PK(10000, 1.5, 2.0),
        PK(14000, -1.0, 1.8),
        PK(17000, -2.0, 1.5),
      ],
    },
  );
  let model = "auri",
    sel = PRESETS.auri[0] ? PRESETS.auri[0].id : null,
    compareIds = sel ? [sel] : [],
    deviceInfo = null;
  let lastCurve;
  let writeHistory = [];
  let pendingApplyCurve = null;
  let uiSoundsEnabled = true;
  let successSoundEnabled = true;
  let soundVolume = 35;
  let checkingDevice = false;
  let customCurve = null;
  let audioContext = null;
  const els = {
    modelSeg: document.getElementById("modelSeg"),
    presetList: document.getElementById("presetList"),
    detailName: document.getElementById("detailName"),
    detailDesc: document.getElementById("detailDesc"),
    detailPre: document.getElementById("detailPre"),
    selectedCurve: document.getElementById("selectedCurve"),
    eqCanvas: document.getElementById("eqCanvas"),
    graphLegend: document.getElementById("graphLegend"),
    applyBtn: document.getElementById("applyBtn"),
    connectBtn: document.getElementById("connectBtn"),
    connDot: document.getElementById("connDot"),
    connLabel: document.getElementById("connLabel"),
    status: document.getElementById("status"),
    confirmBox: document.getElementById("confirmBox"),
    confirmText: document.getElementById("confirmText"),
    confirmNo: document.getElementById("confirmNo"),
    confirmYes: document.getElementById("confirmYes"),
    customModal: document.getElementById("customModal"),
    customCurveBtn: document.getElementById("customCurveBtn"),
    importCurveBtn: document.getElementById("importCurveBtn"),
    exportCurveBtn: document.getElementById("exportCurveBtn"),
    customClose: document.getElementById("customClose"),
    customCancel: document.getElementById("customCancel"),
    customSave: document.getElementById("customSave"),
    customName: document.getElementById("customName"),
    customPre: document.getElementById("customPre"),
    bandGrid: document.getElementById("bandGrid"),
    customError: document.getElementById("customError"),
    settingsBtn: document.getElementById("settingsBtn"),
    settingsModal: document.getElementById("settingsModal"),
    settingsClose: document.getElementById("settingsClose"),
    closeToTray: document.getElementById("closeToTray"),
    darkMode: document.getElementById("darkMode"),
    aboutBtn: document.getElementById("aboutBtn"),
    aboutModal: document.getElementById("aboutModal"),
    aboutClose: document.getElementById("aboutClose"),
    uiSounds: document.getElementById("uiSounds"),
    successSound: document.getElementById("successSound"),
    soundVolume: document.getElementById("soundVolume"),
    historyList: document.getElementById("historyList"),
    clearHistory: document.getElementById("clearHistory"),
    writeProgress: document.getElementById("writeProgress"),
    writeProgressLabel: document.getElementById("writeProgressLabel"),
    writeProgressBar: document.getElementById("writeProgressBar"),
    appVersion: document.getElementById("appVersion"),
  };
  function playUiSound(kind = "click") {
    if (kind === "success" ? !successSoundEnabled : !uiSoundsEnabled) return;
    if (!window.AudioContext && !window.webkitAudioContext) return;
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (!audioContext) audioContext = new AudioContextClass();
      if (audioContext.state === "suspended") audioContext.resume();
      const now = audioContext.currentTime;
      const frequencies = kind === "success" ? [523.25, 783.99] : [440];
      frequencies.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        const start = now + index * 0.07;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(
          (kind === "success" ? 0.025 : 0.012) * (soundVolume / 100),
          start + 0.008,
        );
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.13);
      });
    } catch (error) {
      console.warn("Não foi possível reproduzir o som da interface.", error);
    }
  }
  function setStatus(msg, kind) {
    const s = els.status;
    s.textContent = msg;
    s.className = "status" + (kind ? " " + kind : "");
    s.style.display = msg ? "block" : "none";
  }
  function setWriteProgress(percent, label, visible = true) {
    els.writeProgress.classList.toggle("visible", visible);
    if (!visible) return;
    els.writeProgressBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    els.writeProgressLabel.textContent = label;
  }
  function loadHistory() {
    try {
      const saved = JSON.parse(localStorage.getItem("aequalis-write-history") || "[]");
      writeHistory = Array.isArray(saved) ? saved.slice(0, 8) : [];
    } catch (error) {
      writeHistory = [];
    }
  }
  function saveHistory() {
    localStorage.setItem("aequalis-write-history", JSON.stringify(writeHistory.slice(0, 8)));
  }
  function renderHistory() {
    els.historyList.innerHTML = "";
    if (!writeHistory.length) {
      els.historyList.innerHTML = '<div class="history-empty">Nenhuma curva gravada ainda.</div>';
      return;
    }
    writeHistory.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "history-entry";
      const info = document.createElement("div");
      info.className = "history-entry-info";
      const name = document.createElement("div");
      name.className = "history-entry-name";
      name.textContent = entry.name;
      const date = document.createElement("div");
      date.className = "history-entry-date";
      date.textContent = `${entry.model} · ${entry.date}`;
      info.append(name, date);
      const button = document.createElement("button");
      button.className = "btn btn-outline btn-small";
      button.type = "button";
      button.textContent = "Reaplicar";
      row.append(info, button);
      button.addEventListener("click", () => {
        pendingApplyCurve = entry;
        els.confirmText.textContent =
          `Gravar "${entry.name}" no ${entry.model}? A curva atual do cabo será substituída.`;
        els.confirmBox.style.display = "block";
        els.settingsModal.hidden = true;
      });
      els.historyList.appendChild(row);
    });
  }
  function addToHistory(curve) {
    writeHistory = [
      {
        name: curve.name,
        model: MODEL_NAMES[model],
        date: new Date().toLocaleString("pt-BR"),
        pre: curve.pre,
        bands: curve.bands,
      },
      ...writeHistory.filter((entry) => !(entry.name === curve.name && entry.model === MODEL_NAMES[model])),
    ].slice(0, 8);
    saveHistory();
    renderHistory();
  }
  function renderLastCurve() {
    renderHistory();
  }
  function renderModels() {
    els.modelSeg.innerHTML = "";
    for (const m of Object.keys(MODEL_NAMES)) {
      const b = document.createElement("button");
      b.textContent = MODEL_NAMES[m];
      b.dataset.model = m;
      b.className = m === model ? "active" : "";
      b.addEventListener("click", () => {
        model = m;
        sel = PRESETS[m] && PRESETS[m].length ? PRESETS[m][0].id : null;
        compareIds = sel ? [sel] : [];
        renderPresets();
        renderReferenceCards();
        renderDetail();
        drawGraph();
        updateTrayCurves();
      });
      els.modelSeg.appendChild(b);
    }
  }
  function renderPresets() {
    els.presetList.innerHTML = "";
    const list = (PRESETS[model] || []).filter((p) => p.group !== "ref");
    for (const p of list) {
      const applied =
        lastCurve &&
        lastCurve.name === p.name &&
        lastCurve.model === MODEL_NAMES[model];
      const b = document.createElement("button");
      b.className = compareIds.includes(p.id) ? "active" : "";
      b.setAttribute("aria-pressed", String(compareIds.includes(p.id)));
      b.innerHTML =
        '<div><div class="preset-name">' +
        p.name +
        '</div><div class="preset-desc">' +
        p.desc +
        "</div>" +
        (applied ? '<div class="preset-applied">• Aplicado</div>' : "") +
        "</div>" +
        (compareIds.includes(p.id)
          ? '<span class="compare-marker">●</span>'
          : "");
      b.addEventListener("click", (event) => {
        const clickX = event.clientX;
        const clickY = event.clientY;
        if (compareIds.includes(p.id)) {
          compareIds = compareIds.filter((id) => id !== p.id);
        } else {
          compareIds.push(p.id);
        }
        sel = compareIds[compareIds.length - 1] || null;
        renderPresets();
        renderReferenceCards();
        renderDetail();
        drawGraph();
        updateTrayCurves();
        setTimeout(() => {
          const updated = [...els.presetList.querySelectorAll("button")].find(
            (button) => {
              const name = button.querySelector(".preset-name");
              return name && name.textContent === p.name;
            },
          );
          if (updated) addRippleAt(updated, clickX, clickY);
        }, 0);
      });
      els.presetList.appendChild(b);
    }
  }
  function addRippleAt(button, clientX, clientY) {
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "click-ripple";
    ripple.style.left = `${clientX - rect.left}px`;
    ripple.style.top = `${clientY - rect.top}px`;
    button.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), {
      once: true,
    });
  }
  function addClickRipple(event) {
    addRippleAt(event.currentTarget, event.clientX, event.clientY);
  }
  function renderReferenceCards() {
    document.querySelectorAll(".reference-card").forEach((card) => {
      const id = card.dataset.curveId;
      const active = compareIds.includes(id);
      card.classList.toggle("active", active);
      card.setAttribute("aria-pressed", String(active));
    });
  }
  function updateTrayCurves() {
    const curves = (PRESETS.auri || [])
      .filter((p) => p.group !== "ref")
      .map((p) => ({ id: p.id, name: p.name, selected: p.id === sel }));
    kubaAPI.setTrayCurves(curves);
  }
  function selectCurve(id) {
    const index = (PRESETS.auri || []).findIndex((p) => p.id === id);
    if (index < 0) return;
    model = "auri";
    sel = id;
    compareIds = [id];
    renderPresets();
    renderReferenceCards();
    renderDetail();
    drawGraph();
    updateTrayCurves();
  }
  function current() {
    return (PRESETS[model] || []).find((p) => p.id === sel) || null;
  }
  function selectedCurves() {
    return compareIds
      .map((id) => (PRESETS[model] || []).find((p) => p.id === id))
      .filter(Boolean);
  }
  function openCustomEditor() {
    els.customError.textContent = "";
    els.customModal.hidden = false;
    renderBandFields(customCurve && customCurve.bands);
  }
  function closeCustomEditor() {
    els.customModal.hidden = true;
  }
  function renderBandFields(bands) {
    const defaults = bands || [
      PK(60, 0, 1),
      PK(120, 0, 1),
      PK(250, 0, 1),
      PK(500, 0, 1),
      PK(1000, 0, 1),
      PK(2000, 0, 1),
      PK(4000, 0, 1),
      PK(8000, 0, 1),
      PK(12000, 0, 1),
      PK(16000, 0, 1),
    ];
    els.bandGrid.innerHTML = "";
    defaults.forEach((band, i) => {
      const row = document.createElement("div");
      row.className = "band-row";
      row.innerHTML =
        '<span class="band-number">' +
        (i + 1) +
        '</span><select data-field="type"><option value="PK"' +
        (band.type === "PK" ? " selected" : "") +
        '>Peak</option><option value="LS"' +
        (band.type === "LS" ? " selected" : "") +
        '>Low shelf</option></select><label>Hz<input data-field="f" type="number" min="20" max="20000" step="1" value="' +
        band.f +
        '"></label><label>Ganho<input data-field="g" type="number" min="-24" max="12" step="0.1" value="' +
        band.g +
        '"></label><label>Q<input data-field="q" type="number" min="0.1" max="10" step="0.01" value="' +
        band.q +
        '"></label>';
      els.bandGrid.appendChild(row);
    });
  }
  function readCustomBands() {
    return Array.from(els.bandGrid.querySelectorAll(".band-row")).map((row) => {
      const value = (field) =>
        row.querySelector('[data-field="' + field + '"]').value;
      return {
        type: value("type"),
        f: Number(value("f")),
        g: Number(value("g")),
        q: Number(value("q")),
      };
    });
  }
  function validateCurve(curve) {
    return (
      curve &&
      curve.format === "kuba-equalizador-curve" &&
      curve.version === 1 &&
      typeof curve.name === "string" &&
      curve.name.trim() &&
      Number.isFinite(curve.pre) &&
      curve.pre >= -24 &&
      curve.pre <= 12 &&
      Array.isArray(curve.bands) &&
      curve.bands.length === 10 &&
      curve.bands.every(
        (b) =>
          ["PK", "LS"].includes(b.type) &&
          Number.isFinite(b.f) &&
          b.f >= 20 &&
          b.f <= 20000 &&
          Number.isFinite(b.g) &&
          b.g >= -24 &&
          b.g <= 12 &&
          Number.isFinite(b.q) &&
          b.q >= 0.1 &&
          b.q <= 10,
      )
    );
  }
  function normalizeCurve(curve) {
    return {
      format: "kuba-equalizador-curve",
      version: 1,
      id: "custom",
      group: "custom",
      name: curve.name.trim(),
      desc: "Criada por você.",
      target: "Personalizada",
      pre: Number(curve.pre),
      bands: curve.bands.map((b) => ({
        type: b.type,
        f: Number(b.f),
        g: Number(b.g),
        q: Number(b.q),
      })),
    };
  }
  function renderDetail() {
    const curves = selectedCurves();
    const p = curves[curves.length - 1];
    if (!p) {
      els.detailName.textContent = "";
      els.detailDesc.textContent = "";
      els.detailPre.textContent = "";
      els.selectedCurve.textContent = "Nenhuma";
      return;
    }
    els.detailName.textContent =
      curves.length > 1 ? curves.map((c) => c.name).join(" · ") : p.name;
    els.detailDesc.textContent =
      curves.length > 1 ? "Comparação de curvas no gráfico." : p.desc;
    els.detailPre.textContent = curves.length === 1 ? p.pre.toFixed(1) : "—";
    els.selectedCurve.textContent =
      curves.length > 1 ? curves.length + " curvas" : p.name;
    const target = document.getElementById("graphTarget");
    if (target)
      target.textContent =
        curves.length > 1 ? "Comparação" : p.target || "JM-1";
    updateApplyState();
  }
  function drawGraph() {
    const canvas = els.eqCanvas;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const curves = selectedCurves();
    const darkMode = document.body.classList.contains("dark-mode");
    const colors = [
      "#9B2C22",
      "#315D44",
      "#B8863B",
      "#5C4F49",
      "#E0897E",
      "#1F1614",
    ];
    const series = curves.map((curve, index) => ({
      curve,
      values: FREQ.f.map((f) => response(curve.bands, f) + curve.pre),
      color: colors[index % colors.length],
    }));
    const allValues = series.flatMap((item) => item.values);
    const margin = { top: 28, right: 14, bottom: 38, left: 44 };
    const plotW = w - margin.left - margin.right;
    const plotH = h - margin.top - margin.bottom;
    const lo = GRAPH_Y_MIN;
    const hi = GRAPH_Y_MAX;
    const step = GRAPH_Y_STEP;
    const yOf = (db) => margin.top + ((hi - db) / (hi - lo)) * plotH;
    const xF = (f) => margin.left + xOf(f, plotW);
    g.fillStyle = darkMode ? "#141410" : "#FFFDF5";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = darkMode ? "#292922" : "#D8C9C3";
    g.lineWidth = 1;
    g.setLineDash([]);
    for (let db = hi; db >= lo; db -= step) {
      const y = yOf(db);
      g.beginPath();
      g.moveTo(margin.left, y);
      g.lineTo(w - margin.right, y);
      g.stroke();
      g.fillStyle = darkMode ? "#B8B5A8" : "#5C4F49";
      g.font = "12px ui-monospace, SFMono-Regular, Consolas, monospace";
      g.textAlign = "right";
      g.textBaseline = "middle";
      g.fillText((db > 0 ? "+" : "") + db, margin.left - 10, y);
    }
    GRAPH_X_TICKS.forEach((freq) => {
      const x = xF(freq);
      g.strokeStyle = darkMode ? "#292922" : "#D5C8BE";
      g.beginPath();
      g.moveTo(x, margin.top);
      g.lineTo(x, h - margin.bottom);
      g.stroke();
      g.fillStyle = darkMode ? "#B8B5A8" : "#5C4F49";
      g.textAlign = "center";
      g.textBaseline = "top";
      g.fillText(formatFreq(freq), x, h - margin.bottom + 12);
    });
    const y0 = yOf(0);
    g.strokeStyle = darkMode ? "#716D5C" : "#B8863B";
    g.setLineDash([5, 5]);
    g.beginPath();
    g.moveTo(margin.left, y0);
    g.lineTo(w - margin.right, y0);
    g.stroke();
    g.setLineDash([]);
    series.forEach((item, index) => {
      g.beginPath();
      item.values.forEach((value, i) => {
        const x = xF(FREQ.f[i]),
          y = yOf(value);
        i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      });
      if (index === 0 && series.length === 1) {
        const gradient = g.createLinearGradient(
          0,
          margin.top,
          0,
          h - margin.bottom,
        );
        gradient.addColorStop(
          0,
          darkMode ? "rgba(245,198,55,.18)" : "rgba(155,44,34,.18)",
        );
        gradient.addColorStop(
          1,
          darkMode ? "rgba(245,198,55,0)" : "rgba(155,44,34,0)",
        );
        g.lineTo(xF(FREQ.f[FREQ.f.length - 1]), h - margin.bottom);
        g.lineTo(xF(FREQ.f[0]), h - margin.bottom);
        g.closePath();
        g.fillStyle = gradient;
        g.fill();
        g.beginPath();
        item.values.forEach((value, i) => {
          const x = xF(FREQ.f[i]),
            y = yOf(value);
          i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
        });
      }
      g.strokeStyle = darkMode && index === 0 ? "#F5C637" : item.color;
      g.lineWidth = index === 0 ? 2.5 : 2;
      g.globalAlpha = 1;
      g.lineJoin = "round";
      g.lineCap = "round";
      g.stroke();
    });
    g.fillStyle = darkMode ? "#B8B5A8" : "#5C4F49";
    g.font = "11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    g.textAlign = "left";
    g.textBaseline = "bottom";
    g.fillText("ganho relativo", margin.left, margin.top - 8);
    if (els.graphLegend) {
      els.graphLegend.innerHTML = "";
      if (curves.length) {
        curves.forEach((curve, index) => {
          const marker = document.createElement("span");
          marker.className = "legend-curve";
          marker.style.backgroundColor =
            darkMode && index === 0 ? "#F5C637" : colors[index % colors.length];
          const label = document.createElement("span");
          label.textContent = curve.name;
          els.graphLegend.append(marker, label);
        });
      } else {
        els.graphLegend.textContent = "Nenhuma curva selecionada";
      }
    }
  }
  async function refreshDevice() {
    if (checkingDevice) return;
    try {
      const info = await kubaAPI.hidList();
      if (!info.found) {
        if (deviceInfo) {
          await kubaAPI.hidClose();
        }
        deviceInfo = null;
        updateConn();
        return;
      }
      if (!deviceInfo || deviceInfo.path !== info.path) {
        const opened = await kubaAPI.hidOpen();
        deviceInfo = opened.success ? opened.device : null;
        updateConn();
      }
    } catch (e) {
      deviceInfo = null;
      updateConn();
    }
  }
  async function connectDevice() {
    checkingDevice = true;
    els.connLabel.textContent = "Testando conexão…";
    setStatus("Testando conexão…");
    try {
      const listed = await kubaAPI.hidList();
      if (!listed.found) {
        deviceInfo = null;
        updateConn();
        els.connLabel.textContent = "Kuba não encontrado";
        setStatus(listed.error || "Kuba não encontrado.", "err");
        return;
      }
      const opened = await kubaAPI.hidOpen();
      if (opened.success) {
        deviceInfo = opened.device;
        setStatus("Conexão verificada.", "ok");
      } else {
        deviceInfo = null;
        setStatus(
          opened.error || "Não foi possível abrir o dispositivo.",
          "err",
        );
      }
      updateConn();
    } catch (e) {
      deviceInfo = null;
      els.connLabel.textContent = "Erro na conexão";
      setStatus("Erro ao verificar conexão: " + e.message, "err");
      updateConn();
    } finally {
      checkingDevice = false;
    }
  }
  function saveCustomCurve() {
    const name = els.customName.value.trim() || "Minha curva";
    const pre = Number(els.customPre.value);
    const bands = readCustomBands();
    const curve = {
      format: "kuba-equalizador-curve",
      version: 1,
      name,
      pre,
      bands,
    };
    if (!validateCurve(curve)) {
      els.customError.textContent =
        "Confira os valores: frequência 20–20.000 Hz, ganho -24–12 dB e Q 0,1–10.";
      return;
    }
    customCurve = normalizeCurve(curve);
    localStorage.setItem("kuba-custom-curve", JSON.stringify(customCurve));
    const index = PRESETS.auri.findIndex((p) => p.id === "custom");
    if (index >= 0) PRESETS.auri[index] = customCurve;
    else PRESETS.auri.push(customCurve);
    model = "auri";
    sel = "custom";
    compareIds = ["custom"];
    closeCustomEditor();
    renderPresets();
    renderDetail();
    drawGraph();
    updateTrayCurves();
  }
  async function importCurve() {
    const result = await kubaAPI.curveImport();
    if (result.canceled) return;
    if (result.error) {
      setStatus(result.error, "err");
      return;
    }
    try {
      const curve = JSON.parse(result.content);
      if (!validateCurve(curve))
        throw new Error("Formato inválido ou valores fora dos limites.");
      customCurve = normalizeCurve(curve);
      localStorage.setItem("kuba-custom-curve", JSON.stringify(customCurve));
      const index = PRESETS.auri.findIndex((p) => p.id === "custom");
      if (index >= 0) PRESETS.auri[index] = customCurve;
      else PRESETS.auri.push(customCurve);
      model = "auri";
      sel = "custom";
      compareIds = ["custom"];
      renderPresets();
      renderDetail();
      drawGraph();
      updateTrayCurves();
      setStatus('Curva "' + customCurve.name + '" importada.', "ok");
    } catch (e) {
      setStatus("Não foi possível importar a curva: " + e.message, "err");
    }
  }
  async function exportCurve() {
    const p = current();
    if (!p || p.id !== "custom") {
      setStatus("Selecione uma curva personalizada para exportar.", "err");
      return;
    }
    const curve = {
      format: "kuba-equalizador-curve",
      version: 1,
      name: p.name,
      pre: p.pre,
      bands: p.bands,
    };
    const result = await kubaAPI.curveExport(curve);
    if (result.error) setStatus(result.error, "err");
    else if (!result.canceled)
      setStatus('Curva "' + p.name + '" exportada.', "ok");
  }
  function applyTheme(enabled) {
    document.body.classList.toggle("dark-mode", enabled);
    els.darkMode.checked = enabled;
    localStorage.setItem("aequalis-dark-mode", String(enabled));
    drawGraph();
  }
  async function init() {
    try {
      lastCurve = JSON.parse(localStorage.getItem("kuba-last-curve") || "null");
      loadHistory();
      customCurve = JSON.parse(
        localStorage.getItem("kuba-custom-curve") || "null",
      );
    } catch (e) {
      lastCurve = null;
      customCurve = null;
    }
    if (customCurve) PRESETS.auri.push(customCurve);
    document.querySelectorAll(".reference-card").forEach((card) => {
      card.addEventListener("click", (event) => {
        addClickRipple(event);
        const id = card.dataset.curveId;
        if (!id) return;
        if (compareIds.includes(id)) {
          compareIds = compareIds.filter((item) => item !== id);
        } else {
          compareIds.push(id);
        }
        sel = compareIds[compareIds.length - 1] || null;
        renderPresets();
        renderReferenceCards();
        renderDetail();
        drawGraph();
      });
    });
    applyTheme(localStorage.getItem("aequalis-dark-mode") === "true");
    uiSoundsEnabled = localStorage.getItem("aequalis-ui-sounds") !== "false";
    successSoundEnabled = localStorage.getItem("aequalis-success-sound") !== "false";
    soundVolume = Number(localStorage.getItem("aequalis-sound-volume") || 35);
    els.uiSounds.checked = uiSoundsEnabled;
    els.successSound.checked = successSoundEnabled;
    els.soundVolume.value = String(soundVolume);
    kubaAPI.onHidProgress((progress) => {
      const labels = {
        preparing: "Preparando gravação...",
        sending: `Enviando pacote ${progress.packet || ""} de ${progress.total || ""}...`,
        validating: "Validando comunicação...",
        complete: "Gravação concluída.",
      };
      setWriteProgress(progress.percent, labels[progress.stage] || "Gravando...");
    });
    kubaAPI.getAppVersion().then((version) => {
      els.appVersion.textContent = version;
    }).catch(() => {
      els.appVersion.textContent = "desconhecida";
    });
    els.closeToTray.checked =
      localStorage.getItem("aequalis-close-to-tray") !== "false";
    await kubaAPI.setCloseToTray(els.closeToTray.checked);
    renderLastCurve();
    renderModels();
    renderPresets();
    renderReferenceCards();
    renderDetail();
    drawGraph();
    updateTrayCurves();
    kubaAPI.onTraySelectCurve(selectCurve);
    await refreshDevice();
    setInterval(refreshDevice, 1000);
  }
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest("button");
    if (button && !button.disabled) playUiSound();
  });
  els.settingsBtn.addEventListener("click", () => {
    els.settingsModal.hidden = false;
  });
  els.settingsClose.addEventListener("click", () => {
    els.settingsModal.hidden = true;
  });
  els.settingsModal.addEventListener("click", (event) => {
    if (event.target === els.settingsModal) els.settingsModal.hidden = true;
  });
  els.aboutBtn.addEventListener("click", () => {
    els.aboutModal.hidden = false;
  });
  els.aboutClose.addEventListener("click", () => {
    els.aboutModal.hidden = true;
  });
  els.aboutModal.addEventListener("click", (event) => {
    if (event.target === els.aboutModal) els.aboutModal.hidden = true;
  });
  document.querySelectorAll("[data-external-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      kubaAPI.openExternal(link.href);
    });
  });
  els.closeToTray.addEventListener("change", async () => {
    localStorage.setItem(
      "aequalis-close-to-tray",
      String(els.closeToTray.checked),
    );
    await kubaAPI.setCloseToTray(els.closeToTray.checked);
  });
  els.darkMode.addEventListener("change", () =>
    applyTheme(els.darkMode.checked),
  );
  els.uiSounds.addEventListener("change", () => {
    uiSoundsEnabled = els.uiSounds.checked;
    localStorage.setItem("aequalis-ui-sounds", String(uiSoundsEnabled));
  });
  els.successSound.addEventListener("change", () => {
    successSoundEnabled = els.successSound.checked;
    localStorage.setItem("aequalis-success-sound", String(successSoundEnabled));
  });
  els.soundVolume.addEventListener("input", () => {
    soundVolume = Number(els.soundVolume.value);
    localStorage.setItem("aequalis-sound-volume", String(soundVolume));
  });
  els.clearHistory.addEventListener("click", () => {
    writeHistory = [];
    saveHistory();
    renderHistory();
  });
  els.customCurveBtn.addEventListener("click", openCustomEditor);
  els.importCurveBtn.addEventListener("click", importCurve);
  els.exportCurveBtn.addEventListener("click", exportCurve);
  els.customClose.addEventListener("click", closeCustomEditor);
  els.customCancel.addEventListener("click", closeCustomEditor);
  els.customSave.addEventListener("click", saveCustomCurve);
  els.customModal.addEventListener("click", (event) => {
    if (event.target === els.customModal) closeCustomEditor();
  });
  els.connectBtn.addEventListener("click", (event) => {
    addRippleAt(event.currentTarget, event.clientX, event.clientY);
    connectDevice();
  });
  els.applyBtn.addEventListener("click", () => {
    const p = current();
    if (!p || selectedCurves().length !== 1) return;
    pendingApplyCurve = p;
    els.confirmText.textContent =
      'Gravar "' +
      p.name +
      '" no ' +
      MODEL_NAMES[model] +
      "? A curva atual do cabo será substituída.";
    els.confirmBox.style.display = "block";
  });
  els.confirmNo.addEventListener("click", () => {
    els.confirmBox.style.display = "none";
    pendingApplyCurve = null;
  });
  els.confirmYes.addEventListener("click", async () => {
    const p = pendingApplyCurve || current();
    if (!p) return;
    els.confirmBox.style.display = "none";
    pendingApplyCurve = null;
    setStatus('Gravando "' + p.name + '"…');
    setWriteProgress(0, "Preparando gravação...");
    try {
      const result = await kubaAPI.hidApply(p.bands, p.pre);
      if (result.success) {
        playUiSound("success");
        lastCurve = {
          name: p.name,
          model: MODEL_NAMES[model],
          date: new Date().toLocaleString("pt-BR"),
        };
        localStorage.setItem("kuba-last-curve", JSON.stringify(lastCurve));
        addToHistory(p);
        renderPresets();
        updateTrayCurves();
        setStatus(
          '"' + p.name + '" gravado no ' + MODEL_NAMES[model] + ".",
          "ok",
        );
      } else {
        setStatus("Falha: " + result.error, "err");
      }
    } catch (e) {
      setStatus("Erro: " + e.message, "err");
    } finally {
      setTimeout(() => setWriteProgress(0, "", false), 600);
      updateConn();
    }
  });
  window.addEventListener("resize", drawGraph);
  init();

  function updateApplyState() {
    els.applyBtn.disabled = !deviceInfo || selectedCurves().length !== 1;
    els.applyBtn.title =
      selectedCurves().length === 1
        ? "Aplicar a curva selecionada no fone"
        : "Selecione exatamente uma curva para aplicar no fone";
  }
  function updateConn() {
    const on = !!deviceInfo;
    els.connDot.className = "dot" + (on ? " on" : "");
    els.connLabel.textContent = on
      ? (deviceInfo.product || "Cabo") + " conectado"
      : "Cabo desconectado";
    els.connectBtn.hidden = on;
    updateApplyState();
  }
})();
