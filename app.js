/* ============================================================
   POLYJUMP — JavaScript principal
   ============================================================ */

/* ---------- CONFIG (à personnaliser) ---------- */
const TOURNAMENT_DATE    = new Date('2026-06-13T18:30:00');
const PRICE              = 10;
const PAYPAL_QR_CODE     = 'paypal-qr (1).png';
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xgolypaz';
const SUPABASE_URL       = 'https://qrixfbcqxcobwqfnnfrd.supabase.co';
const SUPABASE_KEY       = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyaXhmYmNxeGNvYndxZm5uZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjI3NTMsImV4cCI6MjA4Njg5ODc1M30.yl5w8ThDmX7zvRIWbgfh0cleoVIEO9TYxrAcBV04EK0';
const MAX_TEAMS          = 16;
const PAGE_URL           = window.location.href.split('?')[0];
const RESULTS            = [];

const SB_DEMO = SUPABASE_URL.includes('VOTRE_PROJET');
const FS_DEMO = FORMSPREE_ENDPOINT.includes('VOTRE_ID');

/* ============================================================
   SPLASH — Animation d'entrée
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

/** Échappe les caractères HTML pour éviter les XSS. */
function esc(s) {
  return String(s || '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;');
}

/** Nettoie une valeur : trim, limite la longueur, supprime < et >. */
function clean(s, max = 80) {
  return String(s || '').trim().slice(0, max).replace(/[<>]/g, '');
}

/** Valide un format email basique. */
function isEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/**
 * Limite à 7 soumissions par tranche de 10 minutes (sessionStorage).
 * Retourne true si l'envoi est autorisé.
 */
function checkRate() {
  const now = Date.now(), k = 'pj_r';
  let attempts = [];
  try {
    attempts = JSON.parse(sessionStorage.getItem(k) || '[]')
      .filter(t => now - t < 600_000);
  } catch (_) {}
  if (attempts.length >= 7) return false;
  attempts.push(now);
  try { sessionStorage.setItem(k, JSON.stringify(attempts)); } catch (_) {}
  return true;
}

/* ============================================================
   SUPABASE — Wrapper fetch
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
  if (SB_DEMO) {
    document.getElementById('pl-n').textContent   = `${MAX_TEAMS} places`;
    document.getElementById('pl-sub').textContent = `0 / ${MAX_TEAMS} équipes`;
    return;
  }
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
   LISTE DES ÉQUIPES INSCRITES
   ============================================================ */
async function loadTeams() {
  const box = document.getElementById('teams-box');
  const cnt = document.getElementById('teams-cnt');

  if (SB_DEMO) {
    box.innerHTML      = '<div class="empty-box">🔧 Configure Supabase pour voir les équipes</div>';
    cnt.textContent    = '0 équipe';
    return;
  }
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
    'https://wa.me/?text=' + encodeURIComponent(`🏐 Inscris-toi au tournoi Polyjump ! Juin 2026 — SUAPS\n👉 ${PAGE_URL}`);

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
   FORMULAIRE D'INSCRIPTION — Stepper
   ============================================================ */
let payChoice = null;

function initForm() {
  // Affichage du prix
  document.getElementById('price-lbl').textContent = `${PRICE} €`;

  // Étape 1
  document.getElementById('btn-step2').addEventListener('click', step2);

  // Étape 2 — paiement
  document.getElementById('btn-pay-online').addEventListener('click', () => setPay('online'));
  document.getElementById('btn-pay-onsite').addEventListener('click', () => setPay('onsite'));
  document.getElementById('btn-back-1').addEventListener('click', () => gostep(1));
  document.getElementById('btn-s3').addEventListener('click', step3);

  // Étape 3 — confirmation
  document.getElementById('btn-back-2').addEventListener('click', () => gostep(2));
  document.getElementById('btn-sub').addEventListener('click', submit);
}

/** Affiche l'étape n (1, 2 ou 3) et met à jour les dots. */
function gostep(n) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('on'));
  document.getElementById(`s${n}`).classList.add('on');

  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById(`d${i}`);
    dot.classList.remove('on', 'done');
    if (i < n)      dot.classList.add('done');
    else if (i === n) dot.classList.add('on');
  }
}

/**
 * Affiche ou masque un message d'erreur sur un champ.
 * @returns {boolean} true si le champ est valide.
 */
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

/** Valide l'étape 1 et avance à l'étape 2. */
function step2() {
  // Anti-spam honeypot
  if (document.getElementById('hp').value) return;

  let ok = true;
  ok = setErr('tn', 'e-tn', !document.getElementById('tn').value.trim()) && ok;

  [
    ['p1n', 'e-p1n'], ['p1e', 'e-p1e'],
    ['p2n', 'e-p2n'], ['p2e', 'e-p2e'],
    ['p3n', 'e-p3n'], ['p3e', 'e-p3e'],
    ['p4n', 'e-p4n'], ['p4e', 'e-p4e'],
  ].forEach(([fid, eid]) => {
    const val = document.getElementById(fid).value.trim();
    if (fid.includes('e')) ok = setErr(fid, eid, !isEmail(val)) && ok;
    else                    ok = setErr(fid, eid, !val) && ok;
  });

  if (ok) gostep(2);
}

/** Affiche le bloc PayPal ou le message "sur place". */
function setPay(method) {
  payChoice = method;
  const statusEl      = document.getElementById('pstat');
  const paypalBox     = document.getElementById('paypal-box');
  const confirmWrap   = document.getElementById('pay-confirm');
  const refEl         = document.getElementById('ref-display');
  const qrImg         = document.getElementById('qr-img');

  if (method === 'online') {
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
    statusEl.textContent      = ' Paiement sur place le jour J.';
  }
}

/** Valide l'étape 2 (paiement) : vérifie unicité équipe/email, avance à l'étape 3. */
async function step3() {
  const statusEl = document.getElementById('pstat');

  if (!payChoice) {
    statusEl.style.display = 'block';
    statusEl.textContent   = ' Choisis un mode de paiement.';
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

  const btn  = document.getElementById('btn-s3');
  btn.disabled    = true;
  btn.textContent = '⏳ Vérif...';

  const team   = document.getElementById('tn').value.trim();
  const emails = ['p1e', 'p2e', 'p3e', 'p4e'].map(id => document.getElementById(id).value.trim());

  let dup = null;
  if (!SB_DEMO) {
    try {
      const nameCheck = await sb(`inscriptions?team_name=eq.${encodeURIComponent(team)}&select=team_name`);
      if (nameCheck && nameCheck.length > 0) {
        dup = 'team';
      } else {
        const emailFilter = emails.map(e => `captain_email.eq.${encodeURIComponent(e)}`).join(',');
        const emailCheck  = await sb(`inscriptions?or=(${emailFilter})&select=captain_email`);
        if (emailCheck && emailCheck.length > 0) dup = 'email';
      }
    } catch (_) {}
  }

  btn.disabled    = false;
  btn.textContent = 'Confirmer →';

  if (dup === 'team') {
    statusEl.style.display = 'block';
    statusEl.textContent   = ' Ce nom est déjà pris !';
    return;
  }
  if (dup === 'email') {
    statusEl.style.display = 'block';
    statusEl.textContent   = ' Un email est déjà inscrit !';
    return;
  }

  buildRecap();
  gostep(3);
}

/** Construit le bloc récapitulatif HTML à l'étape 3. */
function buildRecap() {
  const team    = clean(document.getElementById('tn').value);
  const players = ['p1n', 'p2n', 'p3n', 'p4n'].map((id, idx) => ({
    name:  clean(document.getElementById(id).value),
    email: clean(document.getElementById(id.replace('n', 'e')).value, 120),
    cap:   idx === 0,
  }));
  const payLabel = payChoice === 'online' ? ' En ligne' : ' Sur place';

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

/** Soumet le formulaire : vérifie capacité, rate limit, envoie à Supabase. */
async function submit() {
  if (!document.getElementById('rglt').checked) {
    document.getElementById('e-rglt').classList.add('on');
    return;
  }
  document.getElementById('e-rglt').classList.remove('on');

  // Vérification capacité
  if (!SB_DEMO) {
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
  }

  if (!checkRate()) {
    alert('Trop de tentatives. Attends un peu !');
    return;
  }

  const btn       = document.getElementById('btn-sub');
  btn.disabled    = true;
  btn.textContent = '⏳ Envoi...';

  const team    = clean(document.getElementById('tn').value);
  const players = ['p1n', 'p2n', 'p3n', 'p4n'].map((id, idx) => ({
    name:  clean(document.getElementById(id).value),
    email: clean(document.getElementById(id.replace('n', 'e')).value, 120),
    role:  idx === 0 ? 'Capitaine' : `Joueur ${idx + 1}`,
  }));

  if (!SB_DEMO) {
    try {
      await sb('inscriptions', {
        method: 'POST',
        prefer: 'return=minimal',
        body: JSON.stringify({
          team_name:      team,
          captain_name:   players[0].name,
          captain_email:  players[0].email,
          player2_name:   players[1].name,
          player2_email:  players[1].email,
          player3_name:   players[2].name,
          player3_email:  players[2].email,
          player4_name:   players[3].name,
          player4_email:  players[3].email,
          payment_method: payChoice,
        }),
      });
    } catch (_) {
      btn.disabled    = false;
      btn.textContent = ' Valider !';
      alert('Erreur. Vérifie ta connexion.');
      return;
    }
  }

  // Affichage succès
  let successHtml = `<h4> ${esc(team)}</h4>`;
  players.forEach((p, i) => {
    successHtml += `
      <div class="prow">
        <span class="pn">${i + 1}</span>
        <span style="flex:1">${esc(p.name)}${i === 0 ? ' <span style="color:var(--accent);font-size:0.85rem">(Cap.)</span>' : ''}</span>
        <span style="color:var(--muted);font-size:0.9rem">${esc(p.email)}</span>
      </div>`;
  });
  successHtml += `
    <div class="prow" style="margin-top:1rem">
      <span>📅</span>
      <span>Tournoi</span>
      <span style="color:var(--accent);font-weight:700">Juin 2026 · 18h30 · SUAPS</span>
    </div>`;

  document.getElementById('s-team').textContent = team;
  document.getElementById('s-recap').innerHTML  = successHtml;
  document.getElementById('dots').style.display = 'none';
  document.getElementById('s3').classList.remove('on');
  document.getElementById('success').classList.add('on');
  document.getElementById('fc').scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Rafraîchir places et équipes
  loadPlaces();
  loadTeams();
}

/* ============================================================
   PAGES LÉGALES (Mentions / RGPD / CGU)
   ============================================================ */
function closeLegal(page) {
  document.getElementById(page).classList.remove('show');
}

function initLegal() {
  // Boutons fermeture
  document.querySelectorAll('.legal-close[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeLegal(btn.dataset.close));
  });

  // Gestion des ancres au chargement
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
   POINT D'ENTRÉE — tout brancher après chargement du DOM
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Splash
  document.getElementById('splash-btn').addEventListener('click', startAnimation);

  // Modules
  initShare();
  initForm();
  initLegal();
  initScrollReveal();

  // Countdown + données dynamiques
  tick();
  setInterval(tick, 1000);
  loadPlaces();
  loadTeams();
});
