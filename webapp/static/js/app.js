// Interface F1 Race Predictor — pilotage du formulaire et rendu des résultats.

const $ = (id) => document.getElementById(id);

const els = {
  form:    $('controls'),
  year:    $('year'),
  round:   $('round'),
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

function deltaTag(delta) {
  if (delta === null || delta === undefined) return '<span class="delta flat">—</span>';
  if (delta > 0) return `<span class="delta up">▲ ${delta}</span>`;
  if (delta < 0) return `<span class="delta down">▼ ${Math.abs(delta)}</span>`;
  return '<span class="delta flat">＝</span>';
}

function gridCell(d) {
  if (d.grid === null || d.grid === undefined) return '<div class="row-grid">grille<b>—</b></div>';
  return `<div class="row-grid">grille<b>P${d.grid}</b></div>`;
}

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

function renderPodium(top3) {
  // Ordre visuel : 2 — 1 — 3
  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  const cls = { 1: 'pod-1', 2: 'pod-2', 3: 'pod-3' };
  els.podium.innerHTML = order.map((d, i) => `
    <div class="pod glass reveal ${cls[d.pos]}" style="--accent:${d.color}; --i:${i}">
      <div class="pod-rank">${MEDALS[d.pos] || ''} P${d.pos}</div>
      ${avatar(d)}
      <div class="pod-name">${esc(d.name)}</div>
      <div class="pod-team">${esc(d.team)}</div>
      <div class="pod-foot">${gridShort(d)} ${deltaTag(d.delta)}</div>
    </div>`).join('');
}

function gridShort(d) {
  if (d.grid === null || d.grid === undefined) return '';
  return `<span class="chip" style="padding:2px 8px">grille P${d.grid}</span>`;
}

function renderRanking(rest) {
  els.ranking.innerHTML = rest.map((d, i) => `
    <li class="row glass reveal" style="--accent:${d.color}; --i:${i + 3}">
      <div class="row-pos">${d.pos}</div>
      ${avatar(d)}
      <div class="row-id">
        <div class="row-name">${esc(d.name)}</div>
        <div class="row-team">${esc(d.team)}</div>
      </div>
      ${gridCell(d)}
      ${deltaTag(d.delta)}
    </li>`).join('');
}

function render(data) {
  els.raceName.textContent = `${data.event_name} ${data.year}`;
  els.raceCircuit.textContent = `📍 ${data.circuit}`;
  els.raceMode.textContent = data.pre_quali
    ? 'Pré-qualifs · grille estimée'
    : 'Post-qualifs';
  els.raceMode.hidden = false;

  renderPodium(data.drivers.slice(0, 3));
  renderRanking(data.drivers.slice(3));
  show(els.results);
}

async function predict(ev) {
  ev?.preventDefault();
  const year = els.year.value;
  const round = els.round.value;
  if (!year || !round) return;

  els.run.disabled = true;
  els.loadingText.textContent = els.prequali.checked
    ? 'Estimation depuis les essais libres…'
    : 'Le modèle analyse les qualifications et la séance…';
  show(els.loading);

  const params = new URLSearchParams({
    year, round, pre_quali: els.prequali.checked ? 'true' : 'false',
  });

  try {
    const res = await fetch(`/api/predict?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    render(data);
  } catch (e) {
    els.errorText.textContent = e.message || 'Une erreur est survenue.';
    show(els.error);
  } finally {
    els.run.disabled = false;
  }
}

els.form.addEventListener('submit', predict);

// Au chargement : si l'URL porte ?year=&round= on lance directement (liens
// partageables) ; sinon on pré-remplit avec le prochain GP de la saison.
(async () => {
  const q = new URLSearchParams(location.search);
  if (q.get('year') && q.get('round')) {
    els.year.value  = q.get('year');
    els.round.value = q.get('round');
    els.prequali.checked = ['1', 'true', 'yes'].includes((q.get('pre_quali') || '').toLowerCase());
    predict();
    return;
  }
  try {
    const res = await fetch('/api/next');
    const d = await res.json();
    if (d.year)  els.year.value = d.year;
    if (d.round) els.round.value = d.round;
  } catch { /* garde les valeurs par défaut */ }
})();
