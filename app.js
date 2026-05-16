/* ============================================================
   POLYJUMP — JavaScript principal
   ============================================================ */

/* ---------- CONFIG ---------- */
const TOURNAMENT_DATE    = new Date('2026-06-03T18:30:00');
const PRICE              = 10;
const PAYPAL_QR_CODE     = 'paypal-qr (1).png';
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xgolypaz';
const SUPABASE_URL       = 'https://qrixfbcqxcobwqfnnfrd.supabase.co';
const SUPABASE_KEY       = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyaXhmYmNxeGNvYndxZm5uZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjI3NTMsImV4cCI6MjA4Njg5ODc1M30.yl5w8ThDmX7zvRIWbgfh0cleoVIEO9TYxrAcBV04EK0';
const MAX_TEAMS          = 16;
const PAGE_URL           = window.location.href.split('?')[0];

/* ============================================================
   SPLASH
   ============================================================ */
function startAnimation() {
  const splash   = document.getElementById('splash');
  const ball     = document.getElementById('volleyball');
  const mainSite = document.getElementById('main-site');
  ball.classList.add('dropping');
  setTimeout(() => splash.classList.add('hiding'), 1000);
  setTimeout(() => {
    splash.style.display = 'none';
    ball.style.display   = 'none';
    mainSite.classList.add('visible');
  }, 2500);
}

/* ============================================================
   SÉCURITÉ
   ============================================================ */
function esc(s) {
  return String(s || '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;');
}

function clean(s, max = 80) {
  return String(s || '').trim().slice(0, max).replace(/[<>]/g, '');
}

function isEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function checkRate() {
  const now = Date.now(), k = 'pj_r';
  let attempts = [];
  try {
    attempts = JSON.parse(sessionStorage.getItem(k) || '[]')
      .filter(t => now - t < 600_000);
  } catch (_) {}
  if (attempts.length >= 10) return false;
  attempts.push(now);
  try { sessionStorage.setItem(k, JSON.stringify(attempts)); } catch (_) {}
  return true;
}

/* ============================================================
   SUPABASE
   ============================================================ */
async function sb(path, opts = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        opts.prefer || '',
      ...(opts.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/* ============================================================
   FORMSPREE — Email de confirmation
   ============================================================ */
async function sendConfirmationEmail(team, players, payLabel) {
  try {
    await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        subject: `[Polyjump] Nouvelle inscription — ${team}`,
        message:
          `Nouvelle équipe inscrite !\n\n` +
          `Équipe : ${team}\n` +
          `Capitaine : ${players[0].name} (${players[0].email})\n` +
          `Paiement : ${payLabel}\n\n` +
          players.map((p, i) => `  ${i + 1}. ${p.name} (${p.email})`).join('\n'),
      }),
    });
  } catch (_) {}
}


/* ============================================================
   COMPTE À REBOURS
   ============================================================ */
function tick() {
  const delta = TOURNAMENT_DATE - new Date();
  if (delta <= 0) {
    ['cd-j', 'cd-h', 'cd-m', 'cd-s'].forEach(id => {
      document.getElementById(id).textContent = '00';
    });
    return;
  }
  document.getElementById('cd-j').textContent = String(Math.floor(delta / 86_400_000)).padStart(2, '0');
  document.getElementById('cd-h').textContent = String(Math.floor(delta % 86_400_000 / 3_600_000)).padStart(2, '0');
  document.getElementById('cd-m').textContent = String(Math.floor(delta % 3_600_000 / 60_000)).padStart(2, '0');
  document.getElementById('cd-s').textContent = String(Math.floor(delta % 60_000 / 1_000)).padStart(2, '0');
}

/* ============================================================
   JAUGE DE PLACES
   ============================================================ */
async function loadPlaces() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/inscriptions?select=id`, {
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer':        'count=exact',
        'Range':         '0-0',
      },
    });
    const cr    = response.headers.get('content-range');
    const total = cr ? parseInt(cr.split('/')[1]) || 0 : 0;
    const left  = Math.max(0, MAX_TEAMS - total);
    const pct   = Math.min(100, (total / MAX_TEAMS) * 100);

    document.getElementById('pl-n').textContent   = `${left} place${left > 1 ? 's' : ''}`;
    document.getElementById('pl-sub').textContent = `${total} / ${MAX_TEAMS} équipes`;
    document.getElementById('pl-bar').style.width = `${pct}%`;

    if (left === 0) {
      document.getElementById('pl-n').style.color = '#e53e3e';
      document.getElementById('fc').innerHTML = `
        <div style="text-align:center;padding:4rem 2rem">
          <span style="font-size:5rem">🔒</span>
          <h2 style="font-family:Righteous,cursive;font-size:3rem;color:#e53e3e;margin:2rem 0 1rem">Complet !</h2>
          <p style="color:var(--muted);font-size:1.2rem">Toutes les places sont prises.</p>
        </div>`;
    } else if (left <= 3) {
      document.getElementById('pl-n').style.color = '#ff6b35';
    }
  } catch (_) {
    document.getElementById('pl-n').textContent   = '--';
    document.getElementById('pl-sub').textContent = 'Erreur chargement';
  }
}

/* ============================================================
   LISTE DES ÉQUIPES
   ============================================================ */
async function loadTeams() {
  const box = document.getElementById('teams-box');
  const cnt = document.getElementById('teams-cnt');
  try {
    const teams = await sb('inscriptions?select=team_name,created_at&order=created_at.asc');
    const n     = teams ? teams.length : 0;
    cnt.textContent = `${n} équipe${n > 1 ? 's' : ''}`;
    if (!n) {
      box.innerHTML = '<div class="empty-box">🏐 Sois la première équipe à t\'inscrire !</div>';
      return;
    }
    box.innerHTML = '<div class="teams-grid">' +
      teams.map((t, i) =>
        `<div class="tcard" style="animation-delay:${i * 0.05}s">
           <div class="tnum">${i + 1}</div>
           <div class="tinfo"><div class="tname">${esc(t.team_name)}</div></div>
         </div>`
      ).join('') +
    '</div>';
  } catch (_) {
    box.innerHTML = '<div class="empty-box">Erreur chargement</div>';
  }
}

/* ============================================================
   PARTAGE
   ============================================================ */
function initShare() {
  document.getElementById('sh-wa').href =
    'https://wa.me/?text=' + encodeURIComponent(`🏐 Inscris-toi au tournoi Polyjump ! Juin 2026 — SUAPS Université de Bourgogne\n👉 ${PAGE_URL}`);
  document.getElementById('sh-tw').href =
    'https://twitter.com/intent/tweet?text=' + encodeURIComponent(`Je participe au tournoi Polyjump ! 🏐 ${PAGE_URL}`);
  if (navigator.share) {
    document.getElementById('sh-native').style.display = 'inline-flex';
    document.getElementById('sh-native').addEventListener('click', nativeShare);
  }
  document.getElementById('btn-copy-link').addEventListener('click', copyLink);
}

function copyLink() {
  navigator.clipboard.writeText(PAGE_URL).then(() => {
    const toast = document.getElementById('cp-toast');
    toast.classList.add('on');
    setTimeout(() => toast.classList.remove('on'), 2000);
  });
}

function nativeShare() {
  navigator.share({ title: 'Polyjump', url: PAGE_URL });
}

/* ============================================================
   FORMULAIRE
   ============================================================ */
let payChoice = null;

function initForm() {
  document.getElementById('price-lbl').textContent = `${PRICE} €`;
  document.getElementById('btn-step2').addEventListener('click', step2);
  document.getElementById('btn-pay-online').addEventListener('click', () => setPay('online'));
  document.getElementById('btn-pay-onsite').addEventListener('click', () => setPay('onsite'));
  document.getElementById('btn-back-1').addEventListener('click', () => gostep(1));
  document.getElementById('btn-s3').addEventListener('click', step3);
  document.getElementById('btn-back-2').addEventListener('click', () => gostep(2));
  document.getElementById('btn-sub').addEventListener('click', submit);
}

function gostep(n) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('on'));
  document.getElementById(`s${n}`).classList.add('on');
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById(`d${i}`);
    dot.classList.remove('on', 'done');
    if (i < n)        dot.classList.add('done');
    else if (i === n) dot.classList.add('on');
  }
}

function setErr(fieldId, errId, isInvalid) {
  const field = document.getElementById(fieldId);
  const err   = document.getElementById(errId);
  if (isInvalid) {
    field.classList.add('bad');
    err.classList.add('on');
    return false;
  }
  field.classList.remove('bad');
  err.classList.remove('on');
  return true;
}

function step2() {
  if (document.getElementById('hp').value) return;
  let ok = true;
  ok = setErr('tn', 'e-tn', !document.getElementById('tn').value.trim()) && ok;
  ok = setErr('p1n', 'e-p1n', !document.getElementById('p1n').value.trim()) && ok;
  ok = setErr('p1e', 'e-p1e', !isEmail(document.getElementById('p1e').value.trim())) && ok;
  ['p2n', 'p3n', 'p4n'].forEach(id => {
    ok = setErr(id, `e-${id}`, !document.getElementById(id).value.trim()) && ok;
  });
  if (ok) gostep(2);
}

function setPay(method) {
  payChoice = method;
  const statusEl    = document.getElementById('pstat');
  const paypalBox   = document.getElementById('paypal-box');
  const confirmWrap = document.getElementById('pay-confirm');
  const refEl       = document.getElementById('ref-display');
  const qrImg       = document.getElementById('qr-img');

  if (method === 'online') {
    document.getElementById('pay-confirm-onsite').style.display = 'none';
    const teamName = document.getElementById('tn').value.trim() || '[Nom équipe]';
    refEl.textContent = teamName;
    qrImg.src         = PAYPAL_QR_CODE;
    paypalBox.style.display   = 'block';
    confirmWrap.style.display = 'block';
    statusEl.style.display    = 'none';
  } else {
    paypalBox.style.display   = 'none';
    confirmWrap.style.display = 'none';
    statusEl.style.display    = 'block';
    statusEl.textContent      = 'Paiement sur place le jour J.';
  }
}

async function step3() {
  const statusEl = document.getElementById('pstat');
  if (!payChoice) {
    statusEl.style.display = 'block';
    statusEl.textContent   = 'Choisis un mode de paiement.';
    return;
  }
  if (payChoice === 'online') {
    const confirmed = document.getElementById('pay-check').checked;
    if (!confirmed) {
      document.getElementById('e-pay-check').classList.add('on');
      return;
    }
    document.getElementById('e-pay-check').classList.remove('on');
  }

  const btn = document.getElementById('btn-s3');
  btn.disabled    = true;
  btn.textContent = '⏳ Vérif...';

const team         = document.getElementById('tn').value.trim();
const captainEmail = document.getElementById('p1e').value.trim();

let dup = null;
try {
  const nameCheck = await sb(`inscriptions?team_name=eq.${encodeURIComponent(team)}&select=team_name`);
  if (nameCheck && nameCheck.length > 0) {
    dup = 'team';
  } else {
    const emailCheck = await sb(`inscriptions?captain_email=eq.${encodeURIComponent(captainEmail)}&select=captain_email`);
    if (emailCheck && emailCheck.length > 0) dup = 'email';
  }
} catch (_) {}

  btn.disabled    = false;
  btn.textContent = 'Confirmer →';

  if (dup === 'team') {
    statusEl.style.display = 'block';
    statusEl.textContent   = 'Ce nom est déjà pris !';
    return;
  }
  if (dup === 'email') {
    statusEl.style.display = 'block';
    statusEl.textContent   = 'Un email est déjà inscrit !';
    return;
  }

  buildRecap();
  gostep(3);
}

function buildRecap() {
  const team    = clean(document.getElementById('tn').value);
  const players = ['p1n', 'p2n', 'p3n', 'p4n'].map((id, idx) => ({
    name:  clean(document.getElementById(id).value),
    email: clean(document.getElementById(id.replace('n', 'e')).value, 120),
    cap:   idx === 0,
  }));
  const payLabel = payChoice === 'online' ? 'En ligne' : 'Sur place';

  let html = `<h4>🏐 ${esc(team)}</h4>`;
  players.forEach((p, i) => {
    html += `
      <div class="prow">
        <span class="pn">${i + 1}</span>
        <span style="flex:1">${esc(p.name)}${p.cap ? ' <span style="color:var(--accent);font-size:0.85rem">(Cap.)</span>' : ''}</span>
        <span style="color:var(--muted);font-size:0.9rem">${esc(p.email)}</span>
      </div>`;
  });
  html += `
    <div class="prow" style="margin-top:1rem;color:var(--muted)">
      <span></span>
      <span>Paiement</span>
      <span>${esc(payLabel)} · ${PRICE} €</span>
    </div>`;
  document.getElementById('recap-box').innerHTML = html;
}

async function submit() {
  if (!document.getElementById('rglt').checked) {
    document.getElementById('e-rglt').classList.add('on');
    return;
  }
  document.getElementById('e-rglt').classList.remove('on');

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/inscriptions?select=id`, {
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer':        'count=exact',
        'Range':         '0-0',
      },
    });
    const cr    = response.headers.get('content-range');
    const total = cr ? parseInt(cr.split('/')[1]) || 0 : 0;
    if (total >= MAX_TEAMS) {
      alert('Désolé, le tournoi est complet !');
      return;
    }
  } catch (_) {}

  if (!checkRate()) {
    alert('Trop de tentatives. Attends un peu !');
    return;
  }

  const btn       = document.getElementById('btn-sub');
  btn.disabled    = true;
  btn.textContent = '⏳ Envoi...';

  const team         = clean(document.getElementById('tn').value);
const captainEmail = clean(document.getElementById('p1e').value, 120);
const players = ['p1n','p2n','p3n','p4n'].map((id, idx) => ({
  name: clean(document.getElementById(id).value),
  role: idx === 0 ? 'Capitaine' : `Joueur ${idx + 1}`,
}));
const payLabel = payChoice === 'online' ? 'En ligne (PayPal)' : 'Sur place';

try {
  await sb('inscriptions', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({
      team_name:      team,
      captain_name:   players[0].name,
      captain_email:  captainEmail,
      player2_name:   players[1].name,
      player3_name:   players[2].name,
      player4_name:   players[3].name,
      payment_method: payChoice,
    }),
  });
} catch (_) {
  btn.disabled    = false;
  btn.textContent = '🏐 Valider !';
  alert('Erreur. Vérifie ta connexion.');
  return;
}

  await sendConfirmationEmail(team, players, payLabel);

  let successHtml = `<h4>🏐 ${esc(team)}</h4>`;
  players.forEach((p, i) => {
    successHtml += `
      <div class="prow">
        <span class="pn">${i + 1}</span>
        <span style="flex:1">${esc(p.name)}${i === 0 ? ' <span style="color:var(--accent);font-size:0.85rem">(Cap.)</span>' : ''}</span>
        ${i === 0 ? `<span style="color:var(--muted);font-size:0.9rem">${esc(captainEmail)}</span>` : ''}
      </div>`;
  });
  successHtml += `
    <div class="prow" style="margin-top:1rem">
      <span>📅</span>
      <span>Tournoi</span>
      <span style="color:var(--accent);font-weight:700">3 Juin 2026 · 18h30 · SUAPS</span>
    </div>`;

  document.getElementById('s-team').textContent = team;
  document.getElementById('s-recap').innerHTML  = successHtml;
  document.getElementById('dots').style.display = 'none';
  document.getElementById('s3').classList.remove('on');
  document.getElementById('success').classList.add('on');
  document.getElementById('fc').scrollIntoView({ behavior: 'smooth', block: 'center' });

  loadPlaces();
  loadTeams();
}

/* ============================================================
   PAGES LÉGALES
   ============================================================ */
function closeLegal(page) {
  document.getElementById(page).classList.remove('show');
}

function initLegal() {
  document.querySelectorAll('.legal-close[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeLegal(btn.dataset.close));
  });
  if (window.location.hash) {
    const page = window.location.hash.substring(1);
    if (['mentions', 'rgpd', 'cgu'].includes(page)) {
      setTimeout(() => document.getElementById(page).classList.add('show'), 100);
    }
  }
  window.addEventListener('hashchange', () => {
    const page = window.location.hash.substring(1);
    if (['mentions', 'rgpd', 'cgu'].includes(page)) {
      document.getElementById(page).classList.add('show');
    } else {
      ['mentions', 'rgpd', 'cgu'].forEach(p => closeLegal(p));
    }
  });
}

/* ============================================================
   SCROLL REVEAL
   ============================================================ */
function initScrollReveal() {
  const revealObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
  );
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

/* ============================================================
   POINT D'ENTRÉE
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('splash-btn').addEventListener('click', startAnimation);
  initShare();
  initForm();
  initLegal();
  initScrollReveal();
  tick();
  setInterval(tick, 1000);
  loadPlaces();
  loadTeams();
});
