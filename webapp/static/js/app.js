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
  seasonBtn: $('season-btn'),
  toast:     $('toast'),
  // Track outline
  riTrack:   $('ri-track'),
  trackPath: $('track-path'),
  trackMeta: $('track-meta'),
  // Season modal
  seasonModal: $('season-modal'),
  seasonScrim: $('season-scrim'),
  seasonClose: $('season-close'),
  seasonProgress: $('season-progress'),
  seasonLede: $('season-lede'),
  spFill: $('sp-fill'),
  spText: $('sp-text'),
  seasonSummary: $('season-summary'),
  seasonList: $('season-list'),
  helpPop: $('help-pop'),
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
};

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
      <path d="M20 1 38 11.5v21L20 43 2 32.5v-21z" fill="none" stroke-width="1.4"/>
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

// Réinitialise le mode what-if quand on change de course (baseline = Real).
function resetWhatif() {
  currentWeatherMode = '';
  els.whatifSeg.querySelectorAll('button').forEach((b) =>
    b.classList.toggle('active', !(b.dataset.w || '').length));
}

// ─── Season accuracy dashboard ──────────────────────────────────────────────

let seasonTimer = null;

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
  els.seasonLede.textContent = `How close the model got across the ${year} season (past races only).`;
  const tick = async () => {
    try {
      const res = await fetch(`/api/season?year=${encodeURIComponent(year)}`);
      const d = await res.json();
      renderSeason(d);
      if (d.status !== 'running' && seasonTimer) { clearInterval(seasonTimer); seasonTimer = null; }
    } catch { /* ignore transient */ }
  };
  await tick();
  if (!seasonTimer) seasonTimer = setInterval(tick, 3000);
}
function renderSeason(d) {
  const running = d.status === 'running';
  els.seasonProgress.hidden = !running || !d.total;
  if (d.total) {
    const pct = Math.round((d.done / d.total) * 100);
    els.spFill.style.width = `${pct}%`;
    els.spText.textContent = `Computing… ${d.done}/${d.total} races`;
  }

  const s = d.summary;
  els.seasonSummary.innerHTML = s ? `
    <div class="ss-stat"><b>${s.avg_exact_pct}%</b><span>avg exact</span></div>
    <div class="ss-stat"><b>${s.avg_mae}</b><span>avg error (pos)</span></div>
    <div class="ss-stat"><b>${s.podium_hits}/${s.podium_max}</b><span>podium slots</span></div>
    <div class="ss-stat"><b>${s.winners_correct}/${s.races}</b><span>winners</span></div>` : '';

  const rows = (d.results || []).map((r) => {
    const w = r.winner_correct ? '<span class="sl-win ok">✓</span>' : '<span class="sl-win no">✗</span>';
    const acc = Math.max(4, Math.round((1 - Math.min(r.mae, 8) / 8) * 100)); // bar: lower error = fuller
    return `<div class="sl-row">
      <span class="sl-rnd">R${r.round}</span>
      <span class="sl-name">${esc(r.event_name || '')}</span>
      <span class="sl-bar"><span style="width:${acc}%"></span></span>
      <span class="sl-mae">${r.mae}</span>
      ${w}
    </div>`;
  }).join('');
  els.seasonList.innerHTML = rows || (running ? '' : '<p class="modal-empty">No completed races to score yet.</p>');
}

els.seasonBtn.addEventListener('click', openSeason);
els.seasonClose.addEventListener('click', closeSeason);
els.seasonScrim.addEventListener('click', closeSeason);

// ─── Track outline ──────────────────────────────────────────────────────────

let trackSeq = 0;
async function loadTrack(year, round) {
  const seq = ++trackSeq;
  els.riTrack.hidden = true;
  els.trackMeta.textContent = '';
  try {
    const res = await fetch(`/api/track?year=${encodeURIComponent(year)}&round=${encodeURIComponent(round)}`);
    const d = await res.json();
    if (seq !== trackSeq) return;
    if (d && d.available && d.path) {
      els.trackPath.setAttribute('d', d.path);
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

// Au chargement : si l'URL porte ?year=&round= on lance directement (liens
// partageables) ; sinon on pré-remplit avec le prochain GP de la saison.
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

  // Prochain GP → détermine l'année et le round à pré-sélectionner.
  let year = MAX_YEAR;
  let round = null;
  try {
    const res = await fetch('/api/next');
    const d = await res.json();
    if (d.year)  year = d.year;
    if (d.round) round = d.round;
  } catch { /* défauts conservés */ }

  els.year.value = String(year);
  await loadSchedule(year, { keepRound: round });
})();
