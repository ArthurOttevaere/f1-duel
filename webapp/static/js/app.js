// Interface F1 Race Predictor — pilotage du formulaire et rendu des résultats.

const $ = (id) => document.getElementById(id);

const els = {
  form:    $('controls'),
  year:    $('year'),
  round:   $('round'),
  combo:      $('combo'),
  raceSearch: $('race-search'),
  raceList:   $('race-list'),
  prequali:$('prequali'),
  run:     $('run'),
  empty:   $('empty'),
  loading: $('loading'),
  loadingText: $('loading-text'),
  error:   $('error'),
  errorText: $('error-text'),
  results: $('results'),
  raceName: $('race-name'),
  raceCircuit: $('race-circuit'),
  raceMode: $('race-mode'),
  podium:  $('podium'),
  ranking: $('ranking'),
  rankingRest: $('ranking-rest'),
  showFull:  $('show-full'),
  showFullLabel: $('show-full-label'),
  prequaliNote: $('prequali-note'),
  raceMode2: $('race-mode'),
  accuracy:  $('accuracy'),
  whatifSeg: $('whatif-seg'),
  shareBtn:  $('share-btn'),
  exportBtn: $('export-btn'),
  exportMenu: $('export-menu'),
  seasonBtn: $('season-btn'),
  toast:     $('toast'),
  // Track outline
  riTrack:   $('ri-track'),
  trackPath: $('track-path'),
  trackMeta: $('track-meta'),
  // Season modal
  seasonModal:    $('season-modal'),
  seasonScrim:    $('season-scrim'),
  seasonClose:    $('season-close'),
  seasonProgress: $('season-progress'),
  seasonLede:     $('season-lede'),
  spFill:         $('sp-fill'),
  spText:         $('sp-text'),
  seasonSummary:  $('season-summary'),
  seasonList:     $('season-list'),
  statsFilter:    $('stats-filter'),
  helpPop: $('help-pop'),
  // Session data modal
  sessionDataBtn:   $('session-data-btn'),
  sessionDataModal: $('session-data-modal'),
  sessionDataScrim: $('session-data-scrim'),
  sessionDataClose: $('session-data-close'),
  sdTitle:   $('sd-title'),
  sdLede:    $('sd-lede'),
  sdTabs:    $('sd-tabs'),
  sdContent: $('sd-content'),
  // Carte course (countdown + météo)
  raceInfo:  $('race-info'),
  riName:    $('ri-name'),
  riWhere:   $('ri-where'),
  riCdLabel: $('ri-cd-label'),
  riClock:   $('ri-clock'),
  cdD: $('cd-d'), cdH: $('cd-h'), cdM: $('cd-m'), cdS: $('cd-s'),
  riWhen:    $('ri-when'),
  riWeather: $('ri-weather'),
  wxIcon:  $('wx-icon'),
  wxTemp:  $('wx-temp'),
  wxRange: $('wx-range'),
  wxLabel: $('wx-label'),
  wxExtra: $('wx-extra'),
  // Modal explication
  modal:      $('modal'),
  modalScrim: $('modal-scrim'),
  modalClose: $('modal-close'),
  mAvatar:  $('m-avatar'),
  mPos:     $('m-pos'),
  mName:    $('m-name'),
  mTeam:    $('m-team'),
  mLede:    $('m-lede'),
  mFactors: $('m-factors'),
  // Championship modal
  standingsBtn:  $('standings-btn'),
  champModal:    $('champ-modal'),
  champScrim:    $('champ-scrim'),
  champClose:    $('champ-close'),
  champLede:     $('champ-lede'),
  champTabs:     $('champ-tabs'),
  champProgress: $('champ-progress'),
  champFill:     $('champ-fill'),
  champText:     $('champ-text'),
  champChart:    $('champ-chart'),
  champTable:    $('champ-table'),
  // Title race (contention) modal
  contentionBtn:      $('contention-btn'),
  contentionModal:    $('contention-modal'),
  contentionScrim:    $('contention-scrim'),
  contentionClose:    $('contention-close'),
  contentionLede:     $('contention-lede'),
  contentionProgress: $('contention-progress'),
  contentionFill:     $('contention-fill'),
  contentionText:     $('contention-text'),
  contentionSummary:  $('contention-summary'),
  contentionList:     $('contention-list'),
  cnRpts:    $('cn-rpts'),
  cnSpts:    $('cn-spts'),
  // Theme toggle
  themeToggle: $('theme-toggle'),
};

// ─── Thème jour / nuit (sombre par défaut, choix mémorisé) ──────────────────
const THEME_KEY = 'f1-theme';
els.themeToggle.addEventListener('click', () => {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const next = isLight ? 'dark' : 'light';
  if (next === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  try { localStorage.setItem(THEME_KEY, next); } catch { /* stockage indispo */ }
});

// ─── Effet 3D « glassy » sur la carte course au survol ──────────────────────
// La carte s'incline légèrement vers le curseur et un reflet le suit. Throttlé
// via requestAnimationFrame ; respecte hover fin + prefers-reduced-motion.
(() => {
  const card = els.raceInfo;
  if (!card) return;
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const MAX = 5.5; // amplitude d'inclinaison (degrés)
  let raf = 0, last = null;

  card.addEventListener('pointerenter', () => {
    if (fine.matches && !reduce.matches) card.classList.add('is-tilting');
  });
  card.addEventListener('pointermove', (e) => {
    if (!fine.matches || reduce.matches) return;
    last = e;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const r = card.getBoundingClientRect();
      const px = (last.clientX - r.left) / r.width;
      const py = (last.clientY - r.top) / r.height;
      const rx = (0.5 - py) * MAX * 2;
      const ry = (px - 0.5) * MAX * 2;
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      card.style.transform =
        `perspective(1100px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    });
  });
  card.addEventListener('pointerleave', () => {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    card.classList.remove('is-tilting');
    card.style.transform = '';   // retour fluide via la transition par défaut
  });
})();

function show(section) {
  for (const s of [els.empty, els.loading, els.error, els.results]) {
    s.hidden = s !== section;
  }
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ─── Mini help popover (petit "i" cliquable) ────────────────────────────────

// "i" cliquable : porte son titre + texte d'aide en data-attributs.
// <span role="button"> et non <button>, car il peut vivre dans la carte podium
// qui est elle-même un <button> (un bouton imbriqué serait du HTML invalide).
function helpBtn(title, text) {
  if (!text) return '';
  return `<span class="help-i" role="button" tabindex="0" aria-label="Explain: ${esc(title)}"
    data-help-title="${esc(title)}" data-help-text="${esc(text)}">i</span>`;
}

function showHelp(btn) {
  els.helpPop.innerHTML =
    `<div class="help-title">${esc(btn.dataset.helpTitle)}</div>
     <div class="help-text">${esc(btn.dataset.helpText)}</div>`;
  els.helpPop.hidden = false;

  // Positionne le popover sous le bouton, recentré et borné à l'écran.
  const r = btn.getBoundingClientRect();
  const pop = els.helpPop;
  const pw = Math.min(260, window.innerWidth - 24);
  pop.style.width = pw + 'px';
  let left = r.left + r.width / 2 - pw / 2;
  left = Math.max(12, Math.min(left, window.innerWidth - pw - 12));
  let top = r.bottom + 8;
  // Si pas la place en dessous, on bascule au-dessus.
  if (top + pop.offsetHeight > window.innerHeight - 12) {
    top = Math.max(12, r.top - pop.offsetHeight - 8);
  }
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
  requestAnimationFrame(() => pop.classList.add('show'));
}

function hideHelp() {
  els.helpPop.classList.remove('show');
  setTimeout(() => { if (!els.helpPop.classList.contains('show')) els.helpPop.hidden = true; }, 160);
}

// Délégation globale : un clic sur un "i" ouvre l'aide sans déclencher la carte
// pilote ou la modale qui l'entoure.
document.addEventListener('click', (e) => {
  const i = e.target.closest('.help-i');
  if (i) { e.preventDefault(); e.stopPropagation();
    if (!els.helpPop.hidden && els.helpPop._for === i) { hideHelp(); els.helpPop._for = null; return; }
    els.helpPop._for = i; showHelp(i); return;
  }
  if (!els.helpPop.hidden && !e.target.closest('.help-pop')) { hideHelp(); els.helpPop._for = null; }
}, true);
window.addEventListener('resize', () => { if (!els.helpPop.hidden) { hideHelp(); els.helpPop._for = null; } });

// Texte d'aide de la barre de confiance (réutilisé partout).
const CONF_HELP = 'How clearly the model separates this driver from the cars around them. '
  + 'Green = a big pace gap, so the position looks locked-in. '
  + 'Amber/red = tightly bunched with rivals, so the exact spot is a closer call.';

// ─── Sélecteur saison + Grand Prix (combobox recherchable) ──────────────────

const MIN_YEAR = 2018;
const MAX_YEAR = 2026;

// État du combobox
let races = [];          // [{round, name, location, country, date}]
let filtered = [];       // sous-ensemble affiché
let activeIdx = -1;      // option surlignée au clavier
let selectedRound = null;

function populateYears() {
  const opts = [];
  for (let y = MAX_YEAR; y >= MIN_YEAR; y--) opts.push(`<option value="${y}">${y}</option>`);
  els.year.innerHTML = opts.join('');
}

// Surligne la portion qui correspond à la recherche.
function highlight(text, q) {
  const safe = esc(text);
  if (!q) return safe;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return safe;
  const end = i + q.length;
  return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, end)) + '</mark>' + esc(text.slice(end));
}

function matchRace(r, q) {
  if (!q) return true;
  const hay = `${r.name} ${r.location} ${r.country} r${r.round} ${r.round}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

function renderList() {
  let q = els.raceSearch.value.trim();
  // Si le texte affiché est exactement le GP déjà choisi, on n'en fait pas un
  // filtre : on montre tout le calendrier pour pouvoir changer de course.
  if (selectedRound != null) {
    const sel = races.find((r) => r.round === selectedRound);
    if (sel && labelFor(sel) === q) q = '';
  }
  filtered = races.filter((r) => matchRace(r, q));

  if (!filtered.length) {
    els.raceList.innerHTML = `<li class="combo-empty">No Grand Prix found</li>`;
  } else {
    els.raceList.innerHTML = filtered.map((r, i) => {
      const sub = [r.location, r.country].filter(Boolean).join(' · ');
      const sel = r.round === selectedRound ? 'true' : 'false';
      return `<li class="combo-opt" role="option" data-round="${r.round}" data-idx="${i}"
                  aria-selected="${i === activeIdx || sel === 'true' ? 'true' : 'false'}">
        <span class="opt-rnd">${r.round}</span>
        <span class="opt-main">
          <span class="opt-name">${highlight(r.name, q)}</span>
          ${sub ? `<span class="opt-sub">${highlight(sub, q)}</span>` : ''}
        </span>
        ${r.date ? `<span class="opt-date">${esc(r.date)}</span>` : ''}
      </li>`;
    }).join('');
  }
  els.raceList.hidden = false;
  els.combo.classList.add('open');
  els.raceSearch.setAttribute('aria-expanded', 'true');

  // Amène le GP sélectionné (par défaut : celui de la semaine courante) droit
  // sous les yeux — plus besoin de scroller jusqu'en bas pour le retrouver.
  if (selectedRound != null) {
    const selEl = els.raceList.querySelector(`.combo-opt[data-round="${selectedRound}"]`);
    if (selEl) {
      els.raceList.scrollTop =
        selEl.offsetTop - els.raceList.clientHeight / 2 + selEl.offsetHeight / 2;
    }
  }
}

function closeList() {
  els.raceList.hidden = true;
  els.combo.classList.remove('open');
  els.raceSearch.setAttribute('aria-expanded', 'false');
  activeIdx = -1;
}

function labelFor(r) {
  return r ? r.name : '';
}

function selectRace(round) {
  const r = races.find((x) => x.round === Number(round));
  if (!r) return;
  const changed = String(r.round) !== String(els.round.value);
  selectedRound = r.round;
  els.round.value = r.round;
  els.raceSearch.value = labelFor(r);
  closeList();
  // Si une prédiction d'une autre course est affichée, on l'efface pour ne pas
  // laisser un classement périmé qui ne correspond plus au GP sélectionné.
  if (changed && !els.results.hidden) show(els.empty);
  if (changed) resetWhatif();   // nouvelle course → on repart du scénario réel
  loadRaceInfo(els.year.value, r.round);
}

function moveActive(step) {
  if (els.raceList.hidden) { renderList(); return; }
  if (!filtered.length) return;
  activeIdx = (activeIdx + step + filtered.length) % filtered.length;
  els.raceList.querySelectorAll('.combo-opt').forEach((li, i) => {
    li.setAttribute('aria-selected', i === activeIdx ? 'true' : 'false');
    if (i === activeIdx) li.scrollIntoView({ block: 'nearest' });
  });
}

let scheduleSeq = 0;

async function loadSchedule(year, { keepRound = null } = {}) {
  const seq = ++scheduleSeq;
  races = [];
  selectedRound = null;
  els.round.value = '';
  els.raceSearch.value = '';
  els.raceSearch.placeholder = 'Loading schedule…';
  let data = null;
  try {
    const res = await fetch(`/api/schedule?year=${encodeURIComponent(year)}`);
    data = await res.json();
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  } catch {
    data = null;
  }
  // Réponse périmée (l'utilisateur a déjà changé d'année) → on l'ignore.
  if (seq !== scheduleSeq) return;

  races = (data && data.races) || [];
  els.raceSearch.placeholder = races.length
    ? 'Search for a Grand Prix…'
    : 'Schedule unavailable';
  // Pré-sélection éventuelle (prochain GP ou paramètre d'URL)
  const target = keepRound != null ? Number(keepRound)
    : (races[0] ? races[0].round : null);
  if (target != null && races.some((r) => r.round === target)) {
    selectRace(target);
  }
}

// Câblage du combobox
function wireCombo() {
  els.raceSearch.addEventListener('focus', renderList);
  els.raceSearch.addEventListener('input', () => {
    activeIdx = -1;
    selectedRound = null;     // l'utilisateur tape → la sélection n'est plus figée
    els.round.value = '';
    renderList();
  });
  els.raceSearch.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
    else if (e.key === 'Enter') {
      if (!els.raceList.hidden && activeIdx >= 0 && filtered[activeIdx]) {
        e.preventDefault();
        selectRace(filtered[activeIdx].round);
      } else if (!els.raceList.hidden && filtered.length === 1) {
        e.preventDefault();
        selectRace(filtered[0].round);
      }
    } else if (e.key === 'Escape') {
      closeList();
    }
  });
  els.raceList.addEventListener('mousedown', (e) => {
    const li = e.target.closest('.combo-opt');
    if (li) { e.preventDefault(); selectRace(li.dataset.round); }
  });
  // Clic à l'extérieur → ferme
  document.addEventListener('click', (e) => {
    if (!els.combo.contains(e.target)) closeList();
  });
  // Changement d'année → recharge le calendrier
  els.year.addEventListener('change', () => loadSchedule(els.year.value));
}

// Avatar : photo réelle si dispo, sinon placeholder initiales + couleur d'équipe.
// La balise <img> retombe sur le placeholder via onerror, donc le jour où une
// vraie tête est déposée dans static/drivers/<driver_id>.png, elle apparaît seule.
function avatar(d) {
  const ph = `<span class="ph">${esc(d.abbr)}</span>`;
  if (!d.driver_id) return `<div class="avatar" style="--accent:${d.color}">${ph}</div>`;
  const src = `/static/drivers/${encodeURIComponent(d.driver_id)}.png`;
  const img = d.has_photo
    ? `<img src="${src}" alt="${esc(d.name)}" loading="lazy"
            onerror="this.remove()" />${ph}`
    : ph;
  return `<div class="avatar" style="--accent:${d.color}">${img}</div>`;
}

// Team badge: logo (static/teams/<slug>.png) if present, else a coloured monogram.
function teamBadge(d) {
  if (d.has_logo && d.team_slug) {
    const src = `/static/teams/${encodeURIComponent(d.team_slug)}.png`;
    return `<span class="team-badge" style="--accent:${d.color}">
      <img src="${src}" alt="${esc(d.team)}" loading="lazy" onerror="this.closest('.team-badge').classList.add('no-logo')" />
      <span class="tb-mono">${esc(d.team_abbr || '')}</span>
    </span>`;
  }
  return `<span class="team-badge no-logo" style="--accent:${d.color}"><span class="tb-mono">${esc(d.team_abbr || '')}</span></span>`;
}

// Confidence bar (0..1): how locked-in the predicted position is.
function confidenceBar(d) {
  if (d.confidence == null) return '';
  const pct = Math.max(6, Math.round(d.confidence * 100));
  const lvl = d.confidence >= 0.66 ? 'high' : d.confidence >= 0.33 ? 'mid' : 'low';
  const word = lvl === 'high' ? 'High' : lvl === 'mid' ? 'Medium' : 'Low';
  return `<div class="conf-wrap">
    <span class="conf-cap">Confidence: ${word}${helpBtn('Confidence', CONF_HELP)}</span>
    <div class="conf ${lvl}"><span class="conf-fill" style="width:${pct}%"></span></div>
  </div>`;
}

const pctTxt = (p) => (p == null ? '—' : `${Math.round(p * 100)}%`);

// Labelled position box — the shared visual for START / PRED / FINISH so the
// three position concepts read consistently.
function posBox(label, value, cls = '', title = '') {
  return `<div class="pos-box ${cls}" title="${title}">
    <span class="pb-label">${label}</span><b>${value}</b>
  </div>`;
}

// START = starting grid. In pre-qualifying mode it's estimated from practice.
function startBox(d) {
  const v = (d.grid == null) ? '—' : `P${d.grid}`;
  const est = currentPreQuali;
  return posBox(est ? 'Start*' : 'Start', v, 'pb-start',
    est ? 'Starting grid — estimated from practice pace' : 'Starting grid position');
}

// FINISH = actual result (past races), coloured by how close the prediction was.
function finishBox(d) {
  if (d.actual == null) return '';
  const diff = d.actual_delta;  // pred - actual ; 0 = exact
  const cls = (diff === 0) ? 'finish-exact' : (Math.abs(diff) <= 2 ? 'finish-close' : 'finish-off');
  return posBox('Finish', `P${d.actual}`, `pb-finish ${cls}`, 'Actual finishing position');
}

// Movement = predicted finish vs starting grid (places the model expects gained/lost).
const ARROW_UP   = '<svg viewBox="0 0 10 10" class="mv-ico" aria-hidden="true"><path d="M5 1.5 8.5 6H6v3H4V6H1.5z"/></svg>';
const ARROW_DOWN = '<svg viewBox="0 0 10 10" class="mv-ico" aria-hidden="true"><path d="M5 8.5 1.5 4H4V1h2v3h2.5z"/></svg>';
function movementTag(delta) {
  const t = 'Predicted finish vs start';
  if (delta === null || delta === undefined) return '<span class="move none" title="'+t+'">—</span>';
  if (delta > 0) return `<span class="move up" title="${t}">${ARROW_UP}${delta}</span>`;
  if (delta < 0) return `<span class="move down" title="${t}">${ARROW_DOWN}${Math.abs(delta)}</span>`;
  return `<span class="move flat" title="${t}"><span class="mv-dot"></span>0</span>`;
}

// Badge de rang graphique (médaillon hexagonal, sans emoji).
function rankBadge(pos) {
  return `<div class="rank-badge rank-${pos}">
    <svg class="rank-hex" viewBox="0 0 40 44" aria-hidden="true">
      <path class="hex-bg" d="M20 1 38 11.5v21L20 43 2 32.5v-21z"/>
      <path class="hex-hi" d="M20 1.5 37.5 12v8.5L20 21 2.5 12V12z"/>
    </svg>
    <span class="rank-num">${pos}</span>
  </div>`;
}

// Small labelled stat chip (podium probability, etc.) — same box as positions.
function statChip(label, value, cls = '') {
  return `<div class="pos-box stat ${cls}"><span class="pb-label">${label}</span><b>${value}</b></div>`;
}

function renderPodium(top3) {
  // Visual order: 2 — 1 — 3
  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  const cls = { 1: 'pod-1', 2: 'pod-2', 3: 'pod-3' };
  els.podium.innerHTML = order.map((d, i) => `
    <button type="button" class="pod glass reveal ${cls[d.pos]}" data-pos="${d.pos}"
            style="--accent:${d.color}; --i:${i}" aria-label="Why is ${esc(d.name)} P${d.pos}?">
      ${rankBadge(d.pos)}
      ${avatar(d)}
      <div class="pod-name">${esc(d.name)}</div>
      <div class="pod-team">${teamBadge(d)}<span>${esc(d.team)}</span></div>
      <div class="pod-prob">
        <span class="pp"><b>${pctTxt(d.p_win)}</b>win</span>
        <span class="pp"><b>${pctTxt(d.p_podium)}</b>podium</span>
      </div>
      ${confidenceBar(d)}
      <div class="pod-foot">
        ${startBox(d)}
        ${movementTag(d.delta)}
        ${finishBox(d)}
      </div>
      <span class="pod-why">Why? →</span>
    </button>`).join('');
}

const ROW_CHEV = '<svg class="row-chev" viewBox="0 0 8 12" aria-hidden="true"><path d="M2 1l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function rowHTML(d, i) {
  // Past race → show actual FINISH ; upcoming → show podium probability.
  const lastCell = (d.actual != null) ? finishBox(d) : statChip('Podium', pctTxt(d.p_podium), 'podium-stat');
  return `<li class="row glass reveal" data-pos="${d.pos}" tabindex="0" role="button"
        aria-label="Why is ${esc(d.name)} P${d.pos}?"
        style="--accent:${d.color}; --i:${i}">
      <div class="row-pos" title="Predicted finishing position"><b>${d.pos}</b><span>pred</span></div>
      ${avatar(d)}
      <div class="row-id">
        <div class="row-name">${esc(d.name)}</div>
        <div class="row-sub">${teamBadge(d)}<span class="row-team">${esc(d.team)}</span></div>
        ${confidenceBar(d)}
      </div>
      <div class="row-right">
        ${startBox(d)}
        ${movementTag(d.delta)}
        ${lastCell}
        ${ROW_CHEV}
      </div>
    </li>`;
}

function renderRanking(rest) {
  els.ranking.innerHTML = rest.map((d, i) => rowHTML(d, i + 3)).join('');
}

let currentDrivers = [];
let currentPreQuali = false;
let fullShown = false;

function render(data) {
  lastPrediction = data;                    // mémorisé pour l'export image
  invalidatePoster();                       // l'affiche sera reconstruite à la demande
  els.raceName.textContent = `${data.event_name} ${data.year}`;
  els.raceCircuit.textContent = data.circuit;
  els.raceMode.textContent = data.pre_quali
    ? 'Pre-qualifying · estimated grid'
    : 'Post-qualifying';
  els.raceMode.hidden = false;
  currentPreQuali = !!data.pre_quali;
  els.prequaliNote.hidden = !data.pre_quali;

  currentDrivers = data.drivers;           // toute la grille (pour la modale + full grid)
  renderAccuracy(data.accuracy, data.is_past);

  // Top 10 visible : podium (1-3) + lignes 4-10. Le reste est repliable.
  const top10 = data.drivers.slice(0, 10);
  const rest  = data.drivers.slice(10);
  renderPodium(top10.slice(0, 3));
  renderRanking(top10.slice(3));

  els.rankingRest.innerHTML = rest.map((d, i) => rowHTML(d, i + 10)).join('');
  els.showFull.hidden = rest.length === 0;
  els.rankingRest.hidden = !fullShown || rest.length === 0;
  els.showFullLabel.textContent = fullShown
    ? 'Hide full grid'
    : `Show full grid (P11–P${data.drivers.length})`;
  els.showFull.classList.toggle('open', fullShown);

  show(els.results);
}

function renderAccuracy(acc, isPast) {
  if (!acc) { els.accuracy.hidden = true; return; }
  const win = acc.winner_correct
    ? '<span class="acc-pill ok">Winner ✓</span>'
    : '<span class="acc-pill no">Winner ✗</span>';
  els.accuracy.innerHTML = `
    <span class="acc-title">Predicted vs actual</span>
    ${win}
    <span class="acc-pill">Podium ${acc.podium_hits}/3</span>
    <span class="acc-pill">Top-10 ${acc.top10_hits}/10</span>
    <span class="acc-pill">Avg error ${acc.mae} pos</span>
    <span class="acc-pill">Exact ${acc.exact_pct}%</span>`;
  els.accuracy.hidden = false;
}

// ─── Modal : explication d'une place du podium ──────────────────────────────

function openDriverModal(pos) {
  const d = currentDrivers.find((x) => x.pos === Number(pos));
  if (!d) return;

  els.mAvatar.innerHTML = avatar(d);
  els.mPos.innerHTML = rankBadge(d.pos);
  els.mName.textContent = d.name;
  els.mTeam.textContent = d.team;
  els.mTeam.style.setProperty('--accent', d.color);

  const gridTxt = (d.grid != null)
    ? `starting <b>P${d.grid}</b>` : 'grid unknown';
  els.mLede.innerHTML =
    `The model places <b>${esc(d.name)}</b> <b>P${d.pos}</b> (${gridTxt}). `
    + `Here's what weighs most in that prediction:`;

  const factors = d.factors || [];
  els.mFactors.innerHTML = factors.length
    ? factors.map((f) => {
        const fav = f.effect === 'boost';
        const pct = Math.max(8, Math.round((f.weight || 0) * 100));
        return `<div class="factor ${fav ? 'fav' : 'pen'}">
          <div class="factor-top">
            <span class="factor-label">${esc(f.label)}${helpBtn(f.label, f.help)}</span>
            <span class="factor-val">${esc(f.value)}</span>
          </div>
          <div class="factor-bar"><span style="width:${pct}%"></span></div>
          <div class="factor-eff">${fav ? '▲ boost' : '▼ penalty'}</div>
        </div>`;
      }).join('')
    : `<p class="modal-empty">No explanation available for this driver.</p>`;

  els.modal.hidden = false;
  requestAnimationFrame(() => els.modal.classList.add('open'));
  els.modalClose.focus();
}

function closeModal() {
  els.modal.classList.remove('open');
  setTimeout(() => { els.modal.hidden = true; }, 200);
}

els.podium.addEventListener('click', (e) => {
  if (e.target.closest('.help-i')) return;
  const card = e.target.closest('.pod');
  if (card) openDriverModal(card.dataset.pos);
});
// Lignes cliquables (et accessibles au clavier) → même carte explicative.
// On ignore les clics/touches sur un "i" d'aide imbriqué.
function rowOpen(e) {
  if (e.target.closest('.help-i')) return;
  const row = e.target.closest('.row');
  if (row) openDriverModal(row.dataset.pos);
}
function rowKey(e) {
  if (e.target.closest('.help-i')) return;
  if (e.key === 'Enter' || e.key === ' ') {
    const row = e.target.closest('.row');
    if (row) { e.preventDefault(); openDriverModal(row.dataset.pos); }
  }
}
els.ranking.addEventListener('click', rowOpen);
els.ranking.addEventListener('keydown', rowKey);
els.rankingRest.addEventListener('click', rowOpen);
els.rankingRest.addEventListener('keydown', rowKey);
els.modalScrim.addEventListener('click', closeModal);
els.modalClose.addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('help-i')) {
    e.preventDefault(); e.stopPropagation();
    els.helpPop._for = e.target; showHelp(e.target); return;
  }
  if (e.key === 'Escape' && !els.helpPop.hidden) { hideHelp(); els.helpPop._for = null; return; }
  if (e.key === 'Escape' && !els.modal.hidden) closeModal();
  if (e.key === 'Escape' && !els.seasonModal.hidden) closeSeason();
  if (e.key === 'Escape' && !els.champModal.hidden) closeChamp();
  if (e.key === 'Escape' && !els.contentionModal.hidden) closeContention();
  if (e.key === 'Escape' && !els.sessionDataModal.hidden) closeSessionData();
});

// ─── Full grid · What-if · Share · Season ───────────────────────────────────

let currentWeatherMode = '';

els.showFull.addEventListener('click', () => {
  fullShown = !fullShown;
  els.rankingRest.hidden = !fullShown;
  els.showFull.classList.toggle('open', fullShown);
  const total = currentDrivers.length;
  els.showFullLabel.textContent = fullShown ? 'Hide full grid' : `Show full grid (P11–P${total})`;
});

els.whatifSeg.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const mode = btn.dataset.w || '';
  if (mode === currentWeatherMode) return;
  currentWeatherMode = mode;
  els.whatifSeg.querySelectorAll('button').forEach((b) =>
    b.classList.toggle('active', (b.dataset.w || '') === currentWeatherMode));
  predict();   // re-run with the forced weather scenario
});

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  requestAnimationFrame(() => els.toast.classList.add('show'));
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    els.toast.classList.remove('show');
    setTimeout(() => { els.toast.hidden = true; }, 250);
  }, 2200);
}

els.shareBtn.addEventListener('click', async () => {
  const u = new URL(location.origin + location.pathname);
  u.searchParams.set('year', els.year.value);
  u.searchParams.set('round', els.round.value);
  if (els.prequali.checked) u.searchParams.set('pre_quali', 'true');
  if (currentWeatherMode) u.searchParams.set('weather', currentWeatherMode);
  const link = u.toString();
  try {
    await navigator.clipboard.writeText(link);
    toast('Link copied to clipboard');
  } catch {
    toast(link);
  }
});

// ─── Export image : affiche PNG partageable de la prédiction ────────────────
//
// Génère une affiche portrait (1080×1350) dessinée sur un <canvas> : podium,
// grille P4–P10, mode, date et tracé du circuit en filigrane. Aucune
// dépendance externe — tout est dessiné à la main pour un rendu net et stable.

let lastPrediction = null;   // dernier payload /api/predict rendu
let lastRaceInfo   = null;   // dernier payload /api/raceinfo (lieu, date)
let lastTrackPath  = null;   // tracé SVG du circuit (viewBox 0 0 100 100)

// Charge une image même origine ; résout à null si absente (jamais de rejet).
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Rectangle arrondi (polyfill léger si roundRect indisponible).
function roundRectPath(ctx, x, y, w, h, r) {
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Réduit la taille de police jusqu'à ce que le texte tienne dans maxWidth.
function fitFont(ctx, text, weight, maxSize, minSize, family, maxWidth) {
  let size = maxSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  return size;
}

// Photo pilote détourée en cercle avec anneau couleur écurie ; repli = initiales.
function drawDriverCircle(ctx, img, d, cx, cy, radius) {
  ctx.save();
  // Fond du disque
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fill();

  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    // Couvre le cercle en gardant le ratio de l'image (cover).
    const s = (radius * 2) / Math.min(img.width, img.height);
    const w = img.width * s, h = img.height * s;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    ctx.restore();
  } else {
    ctx.fillStyle = d.color || '#888';
    ctx.font = `700 ${Math.round(radius * 0.8)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.abbr || '', cx, cy + 1);
  }

  // Anneau couleur écurie
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = d.color || '#888';
  ctx.stroke();
  ctx.restore();
}

const EX_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const EX_DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Date locale lisible depuis l'ISO du circuit (offset inclus), sans conversion.
function exportDateLabel(iso) {
  const m = iso && iso.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return '';
  const [, y, mo, da, hh, mm] = m;
  const dow = new Date(Date.UTC(+y, +mo - 1, +da)).getUTCDay();
  return `${EX_DAYS[dow]} ${+da} ${EX_MONTHS[+mo - 1]} · ${hh}:${mm} local`;
}

const pctInt = (p) => (p == null ? '—' : `${Math.round(p * 100)}%`);

// Dessine l'affiche de la prédiction courante sur un <canvas> et le renvoie.
async function buildPosterCanvas() {
  const data = lastPrediction;

  // Précharge les polices utilisées par le canvas (sinon repli système).
  if (document.fonts && document.fonts.load) {
    await Promise.all([
      document.fonts.load('800 60px Inter'),
      document.fonts.load('700 30px Inter'),
      document.fonts.load('600 22px Inter'),
      document.fonts.load('600 22px "Geist Mono"'),
    ]).catch(() => {});
  }

  {
    const drivers = data.drivers;
    const top3 = drivers.slice(0, 3);
    const rest = drivers.slice(3, 10);       // P4 → P10

    // Précharge les photos du top 10 en parallèle.
    const photoFor = {};
    await Promise.all(drivers.slice(0, 10).map(async (d) => {
      if (d.has_photo && d.driver_id) {
        photoFor[d.pos] = await loadImage(`/static/drivers/${encodeURIComponent(d.driver_id)}.png`);
      }
    }));

    // ── Canvas (2× pour un rendu net type Retina) ──────────────────────────
    const W = 1080, H = 1350, S = 2;
    const canvas = document.createElement('canvas');
    canvas.width = W * S;
    canvas.height = H * S;
    const ctx = canvas.getContext('2d');
    ctx.scale(S, S);
    ctx.textBaseline = 'alphabetic';

    const PAD = 72;
    const INNER = W - PAD * 2;
    const RED = '#ff1e3c';
    const TXT = '#f4f6fa';
    const DIM = '#a7adba';
    const MUTE = '#6c7280';

    // Fond : dégradé sombre + halo rouge diffus en haut.
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0d0f15');
    bg.addColorStop(1, '#070810');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, -120, 60, W / 2, -120, 720);
    glow.addColorStop(0, 'rgba(255,30,60,0.22)');
    glow.addColorStop(1, 'rgba(255,30,60,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, 520);

    // Filigrane du tracé du circuit (haut-droite, très discret).
    if (lastTrackPath && typeof Path2D !== 'undefined') {
      try {
        const p = new Path2D(lastTrackPath);
        ctx.save();
        ctx.translate(W - 300, 150);
        ctx.scale(3.1, 3.1);      // viewBox 100×100 → ~310px
        ctx.globalAlpha = 0.10;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke(p);
        ctx.restore();
      } catch { /* tracé ignoré si invalide */ }
    }

    // ── En-tête : marque + tag ────────────────────────────────────────────
    let y = 78;
    ctx.fillStyle = RED;
    roundRectPath(ctx, PAD, y - 26, 40, 34, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '800 18px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('F1', PAD + 20, y - 3);
    ctx.textAlign = 'left';
    ctx.fillStyle = TXT;
    ctx.font = '700 20px Inter, sans-serif';
    ctx.fillText('RACE PREDICTOR', PAD + 54, y - 4);

    // Tag « MODEL PREDICTION » à droite
    ctx.font = '700 13px Inter, sans-serif';
    const tag = 'MODEL PREDICTION';
    const tagW = ctx.measureText(tag).width + 26;
    ctx.fillStyle = 'rgba(255,30,60,0.14)';
    roundRectPath(ctx, W - PAD - tagW, y - 24, tagW, 28, 14);
    ctx.fill();
    ctx.fillStyle = '#ff8a9d';
    ctx.textAlign = 'center';
    ctx.fillText(tag, W - PAD - tagW / 2, y - 5);
    ctx.textAlign = 'left';

    // Ligne de séparation
    y += 26;
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();

    // ── Bloc titre : GP, contexte, date, mode ─────────────────────────────
    y += 66;
    const title = `${data.event_name}`;
    const tSize = fitFont(ctx, title, 800, 60, 34, 'Inter, sans-serif', INNER);
    ctx.font = `800 ${tSize}px Inter, sans-serif`;
    ctx.fillStyle = TXT;
    ctx.fillText(title, PAD, y);

    y += 34;
    ctx.font = '600 21px Inter, sans-serif';
    ctx.fillStyle = DIM;
    const ctxBits = [String(data.year), data.circuit,
      lastRaceInfo && lastRaceInfo.country].filter(Boolean).join('   ·   ');
    ctx.fillText(ctxBits, PAD, y);

    const dateTxt = exportDateLabel(lastRaceInfo && (lastRaceInfo.start_local || lastRaceInfo.start_utc));
    if (dateTxt) {
      y += 30;
      ctx.font = '600 18px Inter, sans-serif';
      ctx.fillStyle = MUTE;
      ctx.fillText(dateTxt, PAD, y);
    }

    // Chips de mode (post/pré-quali + scénario météo)
    y += 34;
    const chips = [];
    chips.push(data.pre_quali
      ? { t: 'PRE-QUALIFYING · EST. GRID', c: '#ffd75e' }
      : { t: 'POST-QUALIFYING', c: '#7ee0a5' });
    if (data.weather_mode === 'wet') chips.push({ t: 'WET SCENARIO', c: '#64c4ff' });
    else if (data.weather_mode === 'dry') chips.push({ t: 'DRY SCENARIO', c: '#ffd75e' });

    let cx = PAD;
    ctx.font = '700 13px Inter, sans-serif';
    chips.forEach((chip) => {
      const w = ctx.measureText(chip.t).width + 26;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      roundRectPath(ctx, cx, y - 18, w, 28, 14);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      roundRectPath(ctx, cx, y - 18, w, 28, 14);
      ctx.stroke();
      ctx.fillStyle = chip.c;
      ctx.textAlign = 'center';
      ctx.fillText(chip.t, cx + w / 2, y + 1);
      ctx.textAlign = 'left';
      cx += w + 10;
    });

    // ── Podium (ordre visuel 2 — 1 — 3) ───────────────────────────────────
    y += 58;
    const colW = INNER / 3;
    const centers = [PAD + colW * 0.5, PAD + colW * 1.5, PAD + colW * 2.5];
    const podOrder = [top3[1], top3[0], top3[2]];   // slots gauche/centre/droite
    const podRank  = [2, 1, 3];
    const baseY = y + 150;

    podOrder.forEach((d, i) => {
      if (!d) return;
      const isWin = podRank[i] === 1;
      const r = isWin ? 66 : 54;
      const px = centers[i];
      const pcy = isWin ? y + 62 : y + 82;

      drawDriverCircle(ctx, photoFor[d.pos], d, px, pcy, r);

      // Médaillon de rang
      const badgeY = pcy + r - 6;
      ctx.beginPath();
      ctx.arc(px, badgeY, 17, 0, Math.PI * 2);
      ctx.fillStyle = isWin ? RED : '#1c1f28';
      ctx.fill();
      ctx.strokeStyle = isWin ? '#fff' : d.color || '#888';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = '800 18px "Geist Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(podRank[i]), px, badgeY + 1);
      ctx.textBaseline = 'alphabetic';

      // Nom
      let ny = pcy + r + 44;
      const nSize = fitFont(ctx, d.name, 700, isWin ? 26 : 23, 15, 'Inter, sans-serif', colW - 18);
      ctx.font = `700 ${nSize}px Inter, sans-serif`;
      ctx.fillStyle = TXT;
      ctx.fillText(d.name, px, ny);

      // Écurie + pastille couleur
      ny += 24;
      ctx.font = '600 14px Inter, sans-serif';
      const teamW = ctx.measureText(d.team).width;
      const dotX = px - (teamW + 14) / 2;
      ctx.beginPath();
      ctx.arc(dotX, ny - 4, 4, 0, Math.PI * 2);
      ctx.fillStyle = d.color || '#888';
      ctx.fill();
      ctx.fillStyle = DIM;
      ctx.textAlign = 'left';
      ctx.fillText(d.team, dotX + 10, ny);
      ctx.textAlign = 'center';

      // % victoire
      ny += 34;
      ctx.font = `800 ${isWin ? 30 : 26}px "Geist Mono", monospace`;
      ctx.fillStyle = TXT;
      ctx.fillText(pctInt(d.p_win), px, ny);
      ctx.font = '700 11px Inter, sans-serif';
      ctx.fillStyle = MUTE;
      ctx.fillText('WIN PROBABILITY', px, ny + 15);
      ctx.textAlign = 'left';
    });

    // ── Grille P4 → P10 ───────────────────────────────────────────────────
    let ry = baseY + 190;
    const rowH = 64, rowGap = 8;
    // En-têtes de colonnes
    ctx.font = '700 11px Inter, sans-serif';
    ctx.fillStyle = MUTE;
    ctx.textAlign = 'left';
    ctx.fillText('PREDICTED FINISH', PAD + 4, ry - 14);
    ctx.fillText('MOVE', W - PAD - 120, ry - 14);
    ctx.textAlign = 'right';
    ctx.fillText('PODIUM', W - PAD - 4, ry - 14);
    ctx.textAlign = 'left';

    rest.forEach((d) => {
      // Fond de ligne
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      roundRectPath(ctx, PAD, ry, INNER, rowH, 12);
      ctx.fill();
      // Barre couleur écurie
      ctx.fillStyle = d.color || '#888';
      roundRectPath(ctx, PAD, ry, 5, rowH, 3);
      ctx.fill();

      const midY = ry + rowH / 2;
      // Position
      ctx.font = '800 26px "Geist Mono", monospace';
      ctx.fillStyle = TXT;
      ctx.textAlign = 'center';
      ctx.fillText(String(d.pos), PAD + 44, midY + 9);

      // Nom + écurie
      ctx.textAlign = 'left';
      const nameX = PAD + 82;
      ctx.font = '700 21px Inter, sans-serif';
      ctx.fillStyle = TXT;
      ctx.fillText(d.name, nameX, midY - 4);
      ctx.font = '600 14px Inter, sans-serif';
      ctx.fillStyle = MUTE;
      ctx.fillText(d.team, nameX, midY + 17);

      // Podium % (droite)
      ctx.textAlign = 'right';
      ctx.font = '700 19px "Geist Mono", monospace';
      ctx.fillStyle = DIM;
      ctx.fillText(pctInt(d.p_podium), W - PAD - 20, midY + 7);

      // Mouvement grille → prédiction
      const mvX = W - PAD - 120;
      const dlt = d.delta;
      ctx.textAlign = 'left';
      ctx.font = '700 16px "Geist Mono", monospace';
      if (dlt == null) {
        ctx.fillStyle = MUTE;
        ctx.fillText('—', mvX, midY + 6);
      } else if (dlt > 0) {
        ctx.fillStyle = '#7ee0a5';
        ctx.fillText(`▲ ${dlt}`, mvX, midY + 6);
      } else if (dlt < 0) {
        ctx.fillStyle = '#ff6a7d';
        ctx.fillText(`▼ ${Math.abs(dlt)}`, mvX, midY + 6);
      } else {
        ctx.fillStyle = MUTE;
        ctx.fillText('•  0', mvX, midY + 6);
      }

      ry += rowH + rowGap;
    });

    // ── Pied de page ──────────────────────────────────────────────────────
    const fy = H - 46;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, fy - 24); ctx.lineTo(W - PAD, fy - 24); ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = '700 13px Inter, sans-serif';
    ctx.fillStyle = DIM;
    ctx.fillText('F1 Race Predictor · XGBoost + LightGBM ensemble', PAD, fy);
    ctx.textAlign = 'right';
    ctx.font = '600 13px Inter, sans-serif';
    ctx.fillStyle = MUTE;
    ctx.fillText('Machine-learning estimate — not an official result', W - PAD, fy);
    ctx.textAlign = 'left';

    return canvas;
  }
}

// ─── PDF minimal : une page = l'affiche (JPEG embarqué, sans dépendance) ─────
// Construit un PDF valide à la main : l'affiche est encodée en JPEG et posée
// en pleine page via un XObject image (filtre DCTDecode, natif au format PDF).
function jpegDataURLToBytes(dataURL) {
  const b64 = dataURL.split(',')[1] || '';
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function buildPdfBlob(jpeg, pxW, pxH) {
  const ptW = 540, ptH = Math.round(ptW * pxH / pxW);   // page à ratio de l'affiche
  const enc = new TextEncoder();
  const parts = [];
  const off = {};
  let pos = 0;
  const add = (d) => {
    const u = (d instanceof Uint8Array) ? d : enc.encode(d);
    parts.push(u); pos += u.length;
  };
  const mark = (n) => { off[n] = pos; };

  add('%PDF-1.4\n');
  add(new Uint8Array([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));   // commentaire binaire
  mark(1); add('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  mark(2); add('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  mark(3); add(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW} ${ptH}]`
    + ` /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`);
  mark(4);
  add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH}`
    + ` /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  add(jpeg);
  add('\nendstream\nendobj\n');
  mark(5);
  const content = enc.encode(`q ${ptW} 0 0 ${ptH} 0 0 cm /Im0 Do Q`);
  add(`5 0 obj\n<< /Length ${content.length} >>\nstream\n`);
  add(content);
  add('\nendstream\nendobj\n');

  const xrefPos = pos;
  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) xref += String(off[i]).padStart(10, '0') + ' 00000 n \n';
  add(xref);
  add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}

// ─── Affiche : construite paresseusement, mise en cache jusqu'à la prochaine
// prédiction — les actions du menu sont ainsi quasi instantanées. ────────────
let _posterPromise = null;
function invalidatePoster() { _posterPromise = null; }
function getPoster() {
  if (!_posterPromise) _posterPromise = buildPosterCanvas();
  return _posterPromise;
}

const hasPrediction = () =>
  !!(lastPrediction && lastPrediction.drivers && lastPrediction.drivers.length);

function exportFileName(ext) {
  const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const d = lastPrediction || {};
  return `f1-prediction-${slug(d.event_name)}-${d.year}.${ext}`;
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// Action : télécharger l'affiche en PDF.
async function exportPdf() {
  const canvas = await getPoster();
  const jpeg = jpegDataURLToBytes(canvas.toDataURL('image/jpeg', 0.92));
  downloadBlob(buildPdfBlob(jpeg, canvas.width, canvas.height), exportFileName('pdf'));
  toast('PDF downloaded');
}

// Action : envoyer via le partage natif (ou repli téléchargement PNG).
async function sendPoster() {
  const canvas = await getPoster();
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  const file = new File([blob], exportFileName('png'), { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: `${lastPrediction.event_name} ${lastPrediction.year} — prediction`,
    });
    return;
  }
  downloadBlob(blob, exportFileName('png'));
  toast('Sharing unavailable — image downloaded');
}

// Action : copier l'affiche (image PNG) dans le presse-papiers.
async function copyPoster() {
  if (!navigator.clipboard || !window.ClipboardItem) {
    const canvas = await getPoster();
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    downloadBlob(blob, exportFileName('png'));
    toast('Copy unsupported — image downloaded');
    return;
  }
  // ClipboardItem accepte une Promise<Blob> : préserve l'activation utilisateur (Safari).
  const blobPromise = getPoster().then((c) => new Promise((r) => c.toBlob(r, 'image/png')));
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })]);
  toast('Poster copied to clipboard');
}

const EXPORT_ACTIONS = { pdf: exportPdf, send: sendPoster, copy: copyPoster };

// ─── Menu Export (Download PDF / Send / Copy image) ─────────────────────────
function openExportMenu() {
  if (!hasPrediction()) { toast('Run a prediction first'); return; }
  els.exportMenu.hidden = false;
  els.exportBtn.setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => els.exportMenu.classList.add('open'));
  getPoster().catch(() => {});   // pré-construit l'affiche pendant le choix
}
function closeExportMenu() {
  els.exportMenu.classList.remove('open');
  els.exportBtn.setAttribute('aria-expanded', 'false');
  setTimeout(() => { els.exportMenu.hidden = true; }, 160);
}

els.exportBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (els.exportMenu.hidden) openExportMenu(); else closeExportMenu();
});
els.exportMenu.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const act = EXPORT_ACTIONS[btn.dataset.act];
  closeExportMenu();
  if (!act || !hasPrediction()) return;
  els.exportBtn.disabled = true;
  try {
    await act();
  } catch (err) {
    if (!(err && err.name === 'AbortError')) toast('Export failed — try again');
  } finally {
    els.exportBtn.disabled = false;
  }
});
document.addEventListener('click', (e) => {
  if (!els.exportMenu.hidden && !e.target.closest('#export-wrap')) closeExportMenu();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !els.exportMenu.hidden) closeExportMenu();
});

// Réinitialise le mode what-if quand on change de course (baseline = Real).
function resetWhatif() {
  currentWeatherMode = '';
  els.whatifSeg.querySelectorAll('button').forEach((b) =>
    b.classList.toggle('active', !(b.dataset.w || '').length));
}

// ─── Season accuracy dashboard ──────────────────────────────────────────────

let seasonTimer = null;

// ─── Season accuracy modal ──────────────────────────────────────────────────

let _seasonData = null;
let _seasonZone = 'all';

function openSeason() {
  els.seasonModal.hidden = false;
  requestAnimationFrame(() => els.seasonModal.classList.add('open'));
  loadSeason();
}
function closeSeason() {
  els.seasonModal.classList.remove('open');
  if (seasonTimer) { clearInterval(seasonTimer); seasonTimer = null; }
  setTimeout(() => { els.seasonModal.hidden = true; }, 200);
}
async function loadSeason() {
  const year = els.year.value;
  els.seasonLede.textContent = `Model accuracy across the ${year} season — past races only.`;
  const tick = async () => {
    try {
      const res = await fetch(`/api/season?year=${encodeURIComponent(year)}`);
      const d = await res.json();
      _seasonData = d;
      renderSeasonProgress(d);
      renderSeasonSummary();
      renderSeasonList();
      if (d.status !== 'running' && seasonTimer) { clearInterval(seasonTimer); seasonTimer = null; }
    } catch { /* ignore transient */ }
  };
  await tick();
  if (!seasonTimer) seasonTimer = setInterval(tick, 3000);
}

function renderSeasonProgress(d) {
  const running = d.status === 'running';
  els.seasonProgress.hidden = !running || !d.total;
  if (d.total) {
    const pct = Math.round((d.done / d.total) * 100);
    els.spFill.style.width = `${pct}%`;
    els.spText.textContent = `Computing… ${d.done}/${d.total} races`;
  }
}

function renderSeasonSummary() {
  const s = _seasonData?.summary;
  if (!s) { els.seasonSummary.innerHTML = ''; return; }

  const fmt = (v) => v ?? '—';

  let cards;
  if (_seasonZone === 'all') {
    cards = [
      { val: fmt(s.avg_mae),          label: 'avg error (pos)' },
      { val: `${fmt(s.avg_exact_pct)}%`,     label: 'exact hits' },
      { val: `${fmt(s.avg_within1_pct)}%`,   label: '±1 position' },
      { val: `${fmt(s.avg_within3_pct)}%`,   label: '±3 positions' },
    ];
  } else if (_seasonZone === 'top10') {
    cards = [
      { val: fmt(s.avg_top10_mae),           label: 'avg error — top 10' },
      { val: `${fmt(s.avg_top10_exact_pct)}%`,  label: 'exact (top 10)' },
      { val: `${fmt(s.avg_top10_within1_pct)}%`, label: '±1 — top 10' },
      { val: `${s.top10_hits}/${s.top10_max}`,   label: 'correctly in top 10' },
    ];
  } else {
    cards = [
      { val: fmt(s.avg_top3_mae),            label: 'avg error — podium' },
      { val: `${fmt(s.avg_top3_exact_pct)}%`,   label: 'exact (podium)' },
      { val: `${fmt(s.avg_top3_within1_pct)}%`,  label: '±1 — podium' },
      { val: `${s.podium_hits}/${s.podium_max}`, label: 'podium slots detected' },
    ];
  }

  const grid = cards.map((c) =>
    `<div class="ss-card"><b>${c.val}</b><span>${c.label}</span></div>`
  ).join('');

  const wPct = s.races ? Math.round(s.winners_correct / s.races * 100) : 0;
  const banner = `<div class="ss-banner">
    <b>${s.winners_correct}/${s.races}</b> winners predicted correctly
    <span class="ss-banner-pct">${wPct}%</span>
  </div>`;

  els.seasonSummary.innerHTML = `<div class="ss-grid">${grid}</div>${banner}`;
}

function renderSeasonList() {
  const d = _seasonData;
  if (!d) return;

  const rows = (d.results || []).map((r) => {
    const zoneData = _seasonZone === 'top3'  ? r.top3
                   : _seasonZone === 'top10' ? r.top10
                   : null;
    const mae = zoneData?.mae ?? r.mae;
    const acc = Math.max(4, Math.round((1 - Math.min(mae, 8) / 8) * 100));

    let badge;
    if (_seasonZone === 'top3') {
      badge = `<span class="sl-zone">${r.podium_hits ?? 0}/3</span>`;
    } else if (_seasonZone === 'top10') {
      badge = `<span class="sl-zone">${r.top10_hits ?? 0}/10</span>`;
    } else {
      badge = r.winner_correct
        ? '<span class="sl-win ok">✓</span>'
        : '<span class="sl-win no">✗</span>';
    }

    return `<div class="sl-row">
      <span class="sl-rnd">R${r.round}</span>
      <span class="sl-name">${esc(r.event_name || '')}</span>
      <span class="sl-bar"><span style="width:${acc}%"></span></span>
      <span class="sl-mae">${mae}</span>
      ${badge}
    </div>`;
  }).join('');

  els.seasonList.innerHTML = rows
    || (d.status === 'running' ? '' : '<p class="modal-empty">No completed races to score yet.</p>');
}

els.seasonBtn.addEventListener('click', openSeason);
els.seasonClose.addEventListener('click', closeSeason);
els.seasonScrim.addEventListener('click', closeSeason);

// Zone filter pills
els.statsFilter.querySelectorAll('.sf-pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    _seasonZone = btn.dataset.zone;
    els.statsFilter.querySelectorAll('.sf-pill').forEach((b) =>
      b.classList.toggle('active', b === btn)
    );
    renderSeasonSummary();
    renderSeasonList();
  });
});

// ─── Championship standings + points-over-time chart ────────────────────────

let champTimer  = null;
let _champData  = null;
let _champTab   = 'drivers';   // 'drivers' | 'constructors'
let _champHi    = null;        // clé effectivement surlignée
let _champPin   = null;        // clé épinglée au clic (persiste au survol)

function openChamp() {
  els.champModal.hidden = false;
  requestAnimationFrame(() => els.champModal.classList.add('open'));
  loadChamp();
}
function closeChamp() {
  els.champModal.classList.remove('open');
  if (champTimer) { clearInterval(champTimer); champTimer = null; }
  setTimeout(() => { els.champModal.hidden = true; }, 200);
}

async function loadChamp() {
  const year = els.year.value;
  els.champLede.textContent = `${year} championship — cumulative points, race by race.`;
  const tick = async () => {
    try {
      const res = await fetch(`/api/championship?year=${encodeURIComponent(year)}`);
      const d = await res.json();
      _champData = d;
      renderChampProgress(d);
      renderChamp();
      if (d.status !== 'running' && champTimer) { clearInterval(champTimer); champTimer = null; }
    } catch { /* transient */ }
  };
  await tick();
  if (!champTimer) champTimer = setInterval(tick, 3000);
}

function renderChampProgress(d) {
  const running = d.status === 'running';
  els.champProgress.hidden = !running || !d.total;
  if (d.total) {
    els.champFill.style.width = `${Math.round((d.done / d.total) * 100)}%`;
    els.champText.textContent = `Loading races… ${d.done}/${d.total}`;
  }
}

const fmtPts = (v) => (Number.isInteger(v) ? String(v) : Number(v).toFixed(1));

function champSeries() {
  if (!_champData) return [];
  return (_champTab === 'constructors' ? _champData.constructors : _champData.drivers) || [];
}
function champKey(row) {
  return _champTab === 'constructors' ? row.team : row.driver_id;
}

function renderChamp() {
  renderChampChart();
  renderChampTable();
}

// Pas d'axe « rond » (1, 2, 5 × 10ⁿ) le plus proche du pas brut demandé.
function niceStep(raw) {
  const r = raw || 1;
  const pow = Math.pow(10, Math.floor(Math.log10(r)));
  const f = r / pow;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return Math.max(1, nice * pow);
}

function renderChampChart() {
  const d = _champData;
  const series = champSeries();
  const rounds = d?.rounds || [];
  if (!series.length || !rounds.length) {
    els.champChart.innerHTML = (d && d.status !== 'running')
      ? '<p class="modal-empty">No completed races yet this season.</p>'
      : '';
    return;
  }

  const n = rounds.length;
  const W = 860, H = 380;
  const padL = 40, padR = 14, padT = 14, padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  let maxY = 0;
  for (const s of series) maxY = Math.max(maxY, s.series[s.series.length - 1] || 0);
  const step = niceStep(Math.max(maxY, 1) / 4);
  const top  = Math.max(step, Math.ceil(maxY / step) * step);

  const X = (i) => padL + (n === 1 ? plotW / 2 : (i * plotW) / (n - 1));
  const Y = (v) => padT + plotH - (v / top) * plotH;

  let grid = '';
  for (let g = 0; g <= top + 1e-6; g += step) {
    const y = Y(g);
    grid += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" class="cc-grid"/>`;
    grid += `<text x="${padL - 7}" y="${(y + 3).toFixed(1)}" class="cc-ytick">${g}</text>`;
  }

  let xlabels = '';
  const everyX = n > 16 ? 2 : 1;
  rounds.forEach((r, i) => {
    if (i % everyX !== 0 && i !== n - 1) return;
    xlabels += `<text x="${X(i).toFixed(1)}" y="${H - 8}" class="cc-xtick">${r.round}</text>`;
  });

  const hi = _champHi;
  let lines = '', dots = '';
  for (const s of series) {
    const key = champKey(s);
    const dim = hi && key !== hi;
    const hot = hi && key === hi;
    if (n === 1) {
      dots += `<circle cx="${X(0).toFixed(1)}" cy="${Y(s.series[0]).toFixed(1)}" r="3.5" fill="${s.color}" class="cc-dot${dim ? ' dim' : ''}"/>`;
    } else {
      const pts = s.series.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
      lines += `<polyline points="${pts}" fill="none" stroke="${s.color}" class="cc-line${dim ? ' dim' : ''}${hot ? ' hot' : ''}" data-key="${esc(key)}"/>`;
    }
    if (hot) {
      dots += `<circle cx="${X(n - 1).toFixed(1)}" cy="${Y(s.series[n - 1]).toFixed(1)}" r="3.5" fill="${s.color}"/>`;
    }
  }

  els.champChart.innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" class="cc-svg" preserveAspectRatio="xMidYMid meet">${grid}${xlabels}${lines}${dots}</svg>`;
}

function renderChampTable() {
  const series = champSeries();
  if (!series.length) { els.champTable.innerHTML = ''; return; }

  els.champTable.innerHTML = series.map((s) => {
    const key = champKey(s);
    const hot = _champHi === key ? ' hot' : '';
    const dim = _champHi && _champHi !== key ? ' dim' : '';
    const ident = _champTab === 'constructors'
      ? `${teamBadge(s)}<span class="ct-name">${esc(s.team)}</span>`
      : `${avatar(s)}<span class="ct-id"><span class="ct-name">${esc(s.name)}</span><span class="ct-sub">${esc(s.team)}</span></span>`;
    return `<div class="ct-row${hot}${dim}" data-key="${esc(key)}" tabindex="0" role="button">
      <span class="ct-pos">${s.pos}</span>
      <span class="cc-swatch" style="background:${s.color}"></span>
      <span class="ct-ident">${ident}</span>
      <span class="ct-pts">${fmtPts(s.total)}<small>pts</small></span>
    </div>`;
  }).join('');
}

function champHighlight(key) {
  if (_champHi === key) return;
  _champHi = key;
  renderChamp();
}

// Survol = surbrillance temporaire ; clic = épingle (persiste quand on quitte).
els.champTable.addEventListener('mouseover', (e) => {
  const row = e.target.closest('.ct-row'); if (row) champHighlight(row.dataset.key);
});
els.champTable.addEventListener('mouseleave', () => champHighlight(_champPin));
els.champTable.addEventListener('click', (e) => {
  const row = e.target.closest('.ct-row'); if (!row) return;
  _champPin = _champPin === row.dataset.key ? null : row.dataset.key;
  champHighlight(_champPin);
});
els.champChart.addEventListener('mouseover', (e) => {
  const l = e.target.closest('[data-key]'); if (l) champHighlight(l.dataset.key);
});
els.champChart.addEventListener('mouseleave', () => champHighlight(_champPin));
els.champChart.addEventListener('click', (e) => {
  const l = e.target.closest('[data-key]'); if (!l) return;
  _champPin = _champPin === l.dataset.key ? null : l.dataset.key;
  champHighlight(_champPin);
});

els.champTabs.querySelectorAll('.sd-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    _champTab = btn.dataset.tab;
    _champHi = _champPin = null;
    els.champTabs.querySelectorAll('.sd-tab').forEach((b) => b.classList.toggle('active', b === btn));
    renderChamp();
  });
});

els.standingsBtn.addEventListener('click', openChamp);
els.champClose.addEventListener('click', closeChamp);
els.champScrim.addEventListener('click', closeChamp);

// ─── Title race : qui est encore en lice pour le championnat ────────────────

let contentionTimer = null;
let _contentionData = null;

function openContention() {
  els.contentionModal.hidden = false;
  requestAnimationFrame(() => els.contentionModal.classList.add('open'));
  loadContention();
}
function closeContention() {
  els.contentionModal.classList.remove('open');
  if (contentionTimer) { clearInterval(contentionTimer); contentionTimer = null; }
  setTimeout(() => { els.contentionModal.hidden = true; }, 200);
}

async function loadContention() {
  const year = els.year.value;
  els.contentionLede.textContent = `${year} drivers' title — who can still mathematically win it.`;
  const tick = async () => {
    try {
      const res = await fetch(`/api/contention?year=${encodeURIComponent(year)}`);
      const d = await res.json();
      _contentionData = d;
      renderContentionProgress(d);
      renderContention();
      if (d.status !== 'running' && contentionTimer) { clearInterval(contentionTimer); contentionTimer = null; }
    } catch { /* transient */ }
  };
  await tick();
  if (!contentionTimer) contentionTimer = setInterval(tick, 3000);
}

function renderContentionProgress(d) {
  const running = d.status === 'running';
  els.contentionProgress.hidden = !running || !d.total;
  if (d.total) {
    els.contentionFill.style.width = `${Math.round((d.done / d.total) * 100)}%`;
    els.contentionText.textContent = `Loading races… ${d.done}/${d.total}`;
  }
}

function renderContention() {
  const d = _contentionData;
  if (!d) return;
  const rem = d.remaining || {};
  els.cnRpts.textContent = rem.race_points ?? 25;
  els.cnSpts.textContent = rem.sprint_points ?? 8;

  if (!d.drivers || !d.drivers.length) {
    els.contentionSummary.innerHTML = '';
    els.contentionList.innerHTML = d.status === 'running'
      ? '' : '<p class="modal-empty">No races completed yet this season.</p>';
    return;
  }

  // Bandeau + cartes de synthèse.
  const champRow = d.champion ? d.drivers.find((x) => x.driver_id === d.champion) : null;
  const banner = champRow
    ? `<div class="cn-banner champ">🏆 <b>${esc(champRow.name)}</b> has clinched the ${d.year} title</div>`
    : `<div class="cn-banner"><b>${d.alive_count}</b> driver${d.alive_count === 1 ? '' : 's'} still in contention</div>`;

  const cards = [
    { val: rem.races ?? 0,         label: `race${rem.races === 1 ? '' : 's'} left` },
    { val: rem.sprints ?? 0,       label: `sprint${rem.sprints === 1 ? '' : 's'} left` },
    { val: rem.max_available ?? 0, label: 'points still up for grabs' },
  ];
  const grid = cards.map((c) => `<div class="ss-card"><b>${c.val}</b><span>${esc(c.label)}</span></div>`).join('');
  els.contentionSummary.innerHTML = `<div class="ss-grid cn-grid">${grid}</div>${banner}`;

  // Échelle des barres : 0 → meilleur "maximum possible" du plateau.
  const leader = d.leader_points || 0;
  let scaleMax = leader;
  for (const x of d.drivers) scaleMax = Math.max(scaleMax, x.max_possible);
  scaleMax = Math.max(scaleMax, 1);
  const w = (v) => `${Math.max(0, Math.min(100, (v / scaleMax) * 100))}%`;
  const threshPct = `${(leader / scaleMax) * 100}%`;

  els.contentionList.innerHTML = d.drivers.map((x) => {
    const out = !x.alive;
    const champ = x.status === 'champion';
    const pill = champ ? '<span class="cn-pill champ">Champion</span>'
               : x.alive ? '<span class="cn-pill in">In contention</span>'
               : '<span class="cn-pill out">Out</span>';
    const gapTxt = x.pos === 1 ? 'leader' : `−${fmtPts(x.gap)}`;
    return `<div class="cn-row${out ? ' out' : ''}${champ ? ' champ' : ''}">
      <span class="cn-pos">${x.pos}</span>
      ${avatar(x)}
      <span class="cn-id">
        <span class="cn-name">${esc(x.name)}</span>
        <span class="cn-team">${esc(x.team)}</span>
      </span>
      <span class="cn-bar" style="--thresh:${threshPct}">
        <span class="cn-bar-max" style="width:${w(x.max_possible)}; background:${x.color}"></span>
        <span class="cn-bar-cur" style="width:${w(x.total)}; background:${x.color}"></span>
        <span class="cn-thresh"></span>
      </span>
      <span class="cn-nums">
        <span class="cn-cur">${fmtPts(x.total)}<small>pts</small></span>
        <span class="cn-max">max ${fmtPts(x.max_possible)} · ${gapTxt}</span>
      </span>
      ${pill}
    </div>`;
  }).join('');
}

els.contentionBtn.addEventListener('click', openContention);
els.contentionClose.addEventListener('click', closeContention);
els.contentionScrim.addEventListener('click', closeContention);

// ─── Session data modal ─────────────────────────────────────────────────────

let _sdData = null;

function openSessionData() {
  const year  = els.year.value;
  const round = els.round.value;
  if (!year || !round) return;

  _sdData = null;
  els.sessionDataModal.hidden = false;
  requestAnimationFrame(() => els.sessionDataModal.classList.add('open'));
  els.sdTitle.textContent  = 'Session data';
  els.sdLede.textContent   = 'Loading…';
  els.sdTabs.innerHTML     = '';
  els.sdContent.innerHTML  = '';

  fetch(`/api/session_data?year=${encodeURIComponent(year)}&round=${encodeURIComponent(round)}`)
    .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
    .then(({ ok, d }) => {
      if (!ok) throw new Error(d.error || 'Failed to load session data');
      renderSessionData(d);
    })
    .catch((e) => {
      els.sdContent.innerHTML = `<p class="modal-empty">Error: ${esc(e.message)}</p>`;
    });
}

function renderSessionData(d) {
  _sdData = d;
  els.sdLede.textContent = `Raw input data for ${d.year} Round ${d.round}.`;

  const sessions = [
    { key: 'fp1',   label: 'FP 1',  type: 'fp',    data: d.fp1 },
    { key: 'fp2',   label: 'FP 2',  type: 'fp',    data: d.fp2 },
    { key: 'fp3',   label: 'FP 3',  type: 'fp',    data: d.fp3 },
    { key: 'quali', label: 'Quali', type: 'quali', data: d.quali },
  ];
  const available = sessions.filter((s) => s.data && s.data.length > 0);

  if (available.length === 0) {
    els.sdTabs.innerHTML    = '';
    els.sdContent.innerHTML = '<p class="modal-empty">No session data available from FastF1.</p>';
    return;
  }

  // Build tab bar
  els.sdTabs.innerHTML = available.map((s) =>
    `<button type="button" class="sd-tab" data-tab="${s.key}">` +
    `${esc(s.label)}<span class="sd-tab-count">${s.data.length}</span></button>`
  ).join('');
  els.sdTabs.querySelectorAll('.sd-tab').forEach((btn) => {
    btn.addEventListener('click', () => switchSdTab(btn.dataset.tab));
  });

  // Default: Qualifying if available, else FP3, FP2, FP1
  const preferred = ['quali', 'fp3', 'fp2', 'fp1'];
  const defaultKey = preferred.find((k) => available.some((s) => s.key === k)) || available[0].key;
  switchSdTab(defaultKey);
}

function switchSdTab(key) {
  if (!_sdData) return;
  els.sdTabs.querySelectorAll('.sd-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === key);
  });
  const isQuali = key === 'quali';
  const data    = _sdData[key];
  els.sdContent.innerHTML = isQuali ? qualiTable(data) : fpTable(data);
}

function fpTable(drivers) {
  if (!drivers || drivers.length === 0)
    return '<p class="modal-empty">No data available for this session.</p>';
  const rows = drivers.map((r) =>
    `<tr>
       <td class="sd-pos">${r.pos}</td>
       <td class="sd-abbr" style="--accent:${r.color}">${esc(r.abbr)}</td>
       <td class="sd-team">${esc(r.team)}</td>
       <td class="sd-time">${r.best_lap || '—'}</td>
       <td class="sd-gap">${r.gap || '—'}</td>
       <td class="sd-num">${r.laps || '—'}</td>
     </tr>`
  ).join('');
  return `<table class="sd-table">
    <thead><tr><th>P</th><th>Driver</th><th>Team</th><th>Best lap</th><th>Gap</th><th>Laps</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function qualiTable(drivers) {
  if (!drivers || drivers.length === 0)
    return '<p class="modal-empty">Qualifying data not yet available.</p>';
  const rows = drivers.map((r) =>
    `<tr>
       <td class="sd-pos">${r.pos || '—'}</td>
       <td class="sd-abbr" style="--accent:${r.color}">${esc(r.abbr)}</td>
       <td class="sd-team">${esc(r.team)}</td>
       <td class="sd-time">${r.q1 || '—'}</td>
       <td class="sd-time">${r.q2 || '—'}</td>
       <td class="sd-time">${r.q3 || '—'}</td>
     </tr>`
  ).join('');
  return `<table class="sd-table">
    <thead><tr><th>P</th><th>Driver</th><th>Team</th><th>Q1</th><th>Q2</th><th>Q3</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function closeSessionData() {
  els.sessionDataModal.classList.remove('open');
  setTimeout(() => { els.sessionDataModal.hidden = true; }, 200);
}

els.sessionDataBtn.addEventListener('click', openSessionData);
els.sessionDataClose.addEventListener('click', closeSessionData);
els.sessionDataScrim.addEventListener('click', closeSessionData);

// ─── Track outline ──────────────────────────────────────────────────────────

let trackSeq = 0;
async function loadTrack(year, round) {
  const seq = ++trackSeq;
  els.riTrack.hidden = true;
  els.trackMeta.textContent = '';
  lastTrackPath = null;
  try {
    const res = await fetch(`/api/track?year=${encodeURIComponent(year)}&round=${encodeURIComponent(round)}`);
    const d = await res.json();
    if (seq !== trackSeq) return;
    if (d && d.available && d.path) {
      els.trackPath.setAttribute('d', d.path);
      lastTrackPath = d.path;               // filigrane du tracé sur l'export image
      els.riTrack.hidden = false;
      const bits = [];
      if (d.length_km) bits.push(`${d.length_km} km`);
      if (d.corners)   bits.push(`${d.corners} corners`);
      if (d.laps)      bits.push(`~${d.laps} laps`);
      els.trackMeta.textContent = bits.join('  ·  ');
    }
  } catch { if (seq === trackSeq) els.riTrack.hidden = true; }
}

async function predict(ev) {
  ev?.preventDefault();
  const year = els.year.value;
  const round = els.round.value;
  if (!year || !round) {
    // Aucun GP sélectionné : on attire l'attention sur le sélecteur
    els.raceSearch.focus();
    renderList();
    return;
  }

  els.run.disabled = true;
  els.loadingText.textContent = els.prequali.checked
    ? 'Estimating from practice pace…'
    : 'Analysing qualifying and session data…';
  show(els.loading);

  const p = { year, round, pre_quali: els.prequali.checked ? 'true' : 'false' };
  if (currentWeatherMode) p.weather = currentWeatherMode;
  const params = new URLSearchParams(p);
  const seq = ++predictSeq;

  try {
    const res = await fetch(`/api/predict?${params}`);
    const data = await res.json();
    if (seq !== predictSeq) return;   // une autre prédiction a été lancée depuis
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    render(data);
  } catch (e) {
    if (seq !== predictSeq) return;
    els.errorText.textContent = e.message || 'Something went wrong.';
    show(els.error);
  } finally {
    if (seq === predictSeq) els.run.disabled = false;
  }
}

let predictSeq = 0;

// ─── Carte course : compte à rebours + météo ────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

let raceTimer = null;
let raceStartMs = null;

const pad = (n) => String(n).padStart(2, '0');

function clearRaceTimer() {
  if (raceTimer) { clearInterval(raceTimer); raceTimer = null; }
}

// Heure locale du circuit, lue telle quelle dans l'ISO (offset inclus).
function fmtLocal(iso) {
  const m = iso && iso.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return '';
  const [, y, mo, da, hh, mm] = m;
  const dow = new Date(Date.UTC(+y, +mo - 1, +da)).getUTCDay();
  return `${DAYS[dow]} ${+da} ${MONTHS[+mo - 1]} · ${hh}:${mm}`;
}

function tickCountdown() {
  if (raceStartMs == null) return;
  const diff = raceStartMs - Date.now();
  if (diff <= 0) { clearRaceTimer(); els.riClock.classList.add('done'); return; }
  const s = Math.floor(diff / 1000);
  els.cdD.textContent = Math.floor(s / 86400);
  els.cdH.textContent = pad(Math.floor((s % 86400) / 3600));
  els.cdM.textContent = pad(Math.floor((s % 3600) / 60));
  els.cdS.textContent = pad(s % 60);
}

// Icônes météo (SVG inline, courant = currentColor)
const WX_ICONS = {
  clear: '<circle cx="12" cy="12" r="5"/><g class="rays"><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M19.8 4.2l-2.1 2.1M6.3 17.7l-2.1 2.1"/></g>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .4-7.98A6 6 0 0 0 5.7 11 3.5 3.5 0 0 0 7 18z"/>',
  rain:  '<path d="M7 15h10a4 4 0 0 0 .4-7.98A6 6 0 0 0 5.7 8 3.5 3.5 0 0 0 7 15z"/><g class="drops"><path d="M8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5"/></g>',
  snow:  '<path d="M7 15h10a4 4 0 0 0 .4-7.98A6 6 0 0 0 5.7 8 3.5 3.5 0 0 0 7 15z"/><g class="drops"><path d="M8 19h.01M12 20h.01M16 19h.01"/></g>',
  thunder: '<path d="M7 14h10a4 4 0 0 0 .4-7.98A6 6 0 0 0 5.7 7 3.5 3.5 0 0 0 7 14z"/><path d="M12 13l-2 4h3l-2 4" class="bolt"/>',
  fog:   '<path d="M6 10h10a3.5 3.5 0 0 0 .3-6.98A5.5 5.5 0 0 0 5 5"/><g class="drops"><path d="M4 14h16M6 18h14"/></g>',
};
function weatherIcon(key) {
  const map = {
    clear: 'clear', 'mostly-clear': 'clear', 'partly-cloudy': 'cloud', cloudy: 'cloud',
    fog: 'fog', drizzle: 'rain', rain: 'rain', showers: 'rain', snow: 'snow', thunder: 'thunder',
  };
  const inner = WX_ICONS[map[key] || 'cloud'];
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
               stroke-linecap="round" stroke-linejoin="round" class="wx-svg wx-${map[key] || 'cloud'}">${inner}</svg>`;
}

function renderWeather(w) {
  if (!w || !w.available) { els.riWeather.hidden = true; return; }
  els.riWeather.hidden = false;
  els.wxIcon.innerHTML = weatherIcon(w.icon);
  els.wxTemp.textContent = w.temp_max != null ? `${w.temp_max}°` : '—';
  els.wxRange.textContent = w.temp_min != null ? `↓ ${w.temp_min}°` : '';
  els.wxLabel.textContent = `${w.label} · ${w.is_forecast ? 'forecast' : 'recorded'}`;
  const bits = [];
  if (w.precip_prob != null) bits.push(`rain ${w.precip_prob}%`);
  else if (w.precip_mm != null) bits.push(`${w.precip_mm} mm`);
  if (w.wind != null) bits.push(`wind ${w.wind} km/h`);
  els.wxExtra.textContent = bits.join('  ·  ');
}

function renderRaceInfo(d) {
  lastRaceInfo = d;                         // mémorisé pour l'export image
  els.riName.textContent = d.event_name;
  els.riWhere.textContent = [d.location, d.country].filter(Boolean).join(', ');

  raceStartMs = d.start_utc ? Date.parse(d.start_utc) : null;
  clearRaceTimer();
  els.riClock.classList.remove('done');

  if (!d.is_past && raceStartMs && raceStartMs > Date.now()) {
    els.riCdLabel.textContent = 'Starts in';
    els.riClock.hidden = false;
    els.riWhen.textContent = fmtLocal(d.start_local) + ' (local time)';
    tickCountdown();
    raceTimer = setInterval(tickCountdown, 1000);
  } else {
    els.riClock.hidden = true;
    els.riCdLabel.textContent = d.is_past ? 'Race completed' : 'Upcoming';
    els.riWhen.textContent = fmtLocal(d.start_local);
  }

  renderWeather(d.weather);
  loadTrack(d.year, d.round);
}

let raceInfoSeq = 0;

async function loadRaceInfo(year, round) {
  const seq = ++raceInfoSeq;
  clearRaceTimer();
  raceStartMs = null;
  els.riTrack.hidden = true;
  if (round == null || round === '') { els.raceInfo.hidden = true; return; }

  els.raceInfo.hidden = false;
  els.raceInfo.classList.add('loading-info');
  els.riName.textContent = 'Loading…';
  els.riWhere.textContent = '';
  els.riWeather.hidden = true;

  let d = null;
  try {
    const res = await fetch(`/api/raceinfo?year=${encodeURIComponent(year)}&round=${encodeURIComponent(round)}`);
    d = await res.json();
    if (!res.ok) throw new Error(d.error || 'raceinfo');
  } catch {
    d = null;
  }
  // Une sélection plus récente a eu lieu → on n'écrase pas l'affichage courant.
  if (seq !== raceInfoSeq) return;

  if (d) {
    renderRaceInfo(d);
    els.raceInfo.classList.remove('loading-info');
  } else {
    els.raceInfo.hidden = true;
    els.raceInfo.classList.remove('loading-info');
  }
}

els.form.addEventListener('submit', predict);
// Le bouton Predict vit désormais dans la carte course (hors du <form>) → clic explicite.
els.run.addEventListener('click', predict);

// Au chargement : si l'URL porte ?year=&round= on lance directement (liens
// partageables) ; sinon on pré-remplit avec le GP de la semaine courante
// (ou, hors semaine de course, le dernier GP terminé).
(async () => {
  populateYears();
  wireCombo();

  const q = new URLSearchParams(location.search);
  if (q.get('year') && q.get('round')) {
    els.year.value = q.get('year');
    els.prequali.checked = ['1', 'true', 'yes'].includes((q.get('pre_quali') || '').toLowerCase());
    await loadSchedule(q.get('year'), { keepRound: q.get('round') });
    // Scénario météo éventuel (lien partagé) — appliqué après loadSchedule qui reset.
    const wm = (q.get('weather') || '').toLowerCase();
    if (wm === 'wet' || wm === 'dry') {
      currentWeatherMode = wm;
      els.whatifSeg.querySelectorAll('button').forEach((b) =>
        b.classList.toggle('active', (b.dataset.w || '') === wm));
    }
    predict();
    return;
  }

  // GP par défaut → année + round de la semaine courante (sinon dernier terminé).
  // Un paramètre ?year= seul (sans round) force juste la saison (utile pour
  // un lien direct vers le classement d'une saison passée).
  let year = MAX_YEAR;
  let round = null;
  if (q.get('year')) {
    year = q.get('year');
  } else {
    try {
      const res = await fetch('/api/current');
      const d = await res.json();
      if (d.year)  year = d.year;
      if (d.round) round = d.round;
    } catch { /* défauts conservés */ }
  }

  els.year.value = String(year);
  await loadSchedule(year, { keepRound: round });

  // Deep-links : #standings → classement ; #title → course au titre.
  if (location.hash === '#standings') openChamp();
  if (location.hash === '#title') openContention();
})();
