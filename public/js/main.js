/* ============================================================
   Recon2Root — Public Site JavaScript
   ============================================================ */

const API = '';

// ── Navbar scroll effect ──────────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ── Mobile menu ───────────────────────────────────────────────
document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
  const links = document.querySelector('.navbar-links');
  if (!links) return;
  const isOpen = links.style.display === 'flex';
  links.style.display = isOpen ? '' : 'flex';
  links.style.flexDirection = 'column';
  links.style.position = 'absolute';
  links.style.top = '70px';
  links.style.left = '0';
  links.style.right = '0';
  links.style.background = 'rgba(8,11,18,0.98)';
  links.style.padding = '20px 24px';
  links.style.gap = '20px';
  links.style.borderBottom = '1px solid rgba(255,255,255,0.06)';
});

// ── Load site content ─────────────────────────────────────────
async function loadContent() {
  try {
    const res = await fetch(`${API}/api/content`);
    const { content } = await res.json();

    setText('heroTagline', content.hero_tagline);
    setText('heroSubtitle', content.hero_subtitle);
    setText('aboutText', content.about_text);
    setText('statParticipants', content.total_participants);
    setText('statParticipants2', content.total_participants);
    setText('statChallenges', content.total_challenges);
    setText('statChallenges2', content.total_challenges);
    setText('statVenue', content.event_venue?.replace(',', '<br/>'));

    const ig = document.getElementById('footerInstagram');
    const li = document.getElementById('footerLinkedin');
    if (ig && content.instagram_url) ig.href = content.instagram_url;
    if (li && content.linkedin_url) li.href = content.linkedin_url;
  } catch (e) {
    console.warn('Content load failed:', e);
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && value) el.innerHTML = value;
}

// ── Load winners ──────────────────────────────────────────────
async function loadWinners() {
  const podium = document.getElementById('winnersPodium');
  try {
    const res = await fetch(`${API}/api/winners`);
    const { winners } = await res.json();

    if (!winners || winners.length === 0) {
      podium.innerHTML = '<p style="color:var(--text-muted);text-align:center;width:100%;padding:40px">Winners will be announced soon!</p>';
      return;
    }

    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
    const labels = { 1: '1st Place', 2: '2nd Place', 3: '3rd Place' };

    podium.innerHTML = winners.map((w) => `
      <div class="winner-card rank-${w.rank} fade-up">
        ${w.rank === 1 ? '<div class="winner-crown">👑</div>' : ''}
        <span class="winner-medal">${medals[w.rank]}</span>
        <div class="winner-rank">${labels[w.rank]}</div>
        <div class="winner-team">${escHtml(w.team_name)}</div>
        <div class="winner-members">${escHtml(w.members)}</div>
        ${w.score ? `<div class="winner-score">${escHtml(w.score)} pts</div>` : ''}
      </div>
    `).join('');
  } catch (e) {
    podium.innerHTML = '<p style="color:var(--text-muted);text-align:center;width:100%;padding:40px">Could not load winners.</p>';
  }
}

// ── Gallery ───────────────────────────────────────────────────
let currentCategory = 'all';

async function loadGallery(category = 'all') {
  const grid = document.getElementById('galleryGrid');
  grid.innerHTML = Array(6).fill('<div class="gallery-item skeleton"></div>').join('');

  try {
    const url = category === 'all'
      ? `${API}/api/photos`
      : `${API}/api/photos?category=${encodeURIComponent(category)}`;
    const res = await fetch(url);
    const { photos } = await res.json();

    if (!photos || photos.length === 0) {
      grid.innerHTML = '<div class="gallery-empty">📷 Photos coming soon!</div>';
      return;
    }

    grid.innerHTML = photos.map((p) => `
      <div class="gallery-item" data-src="/uploads/photos/${p.filename}">
        <img
          src="/uploads/photos/${p.filename}"
          alt="${escHtml(p.original_name)}"
          loading="lazy"
        />
        <div class="gallery-item-overlay">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
          </svg>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.gallery-item').forEach((item) => {
      item.addEventListener('click', () => openLightbox(item.dataset.src));
    });
  } catch (e) {
    grid.innerHTML = '<div class="gallery-empty">Could not load photos.</div>';
  }
}

document.getElementById('galleryTabs')?.addEventListener('click', (e) => {
  const tab = e.target.closest('.gallery-tab');
  if (!tab) return;
  document.querySelectorAll('.gallery-tab').forEach((t) => t.classList.remove('active'));
  tab.classList.add('active');
  currentCategory = tab.dataset.category;
  loadGallery(currentCategory);
});

// ── Lightbox ──────────────────────────────────────────────────
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');

function openLightbox(src) {
  lightboxImg.src = src;
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
  lightboxImg.src = '';
}

document.getElementById('lightboxClose')?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

// ── Videos ────────────────────────────────────────────────────
async function loadVideos() {
  const grid = document.getElementById('videosGrid');
  try {
    const res = await fetch(`${API}/api/videos`);
    const { videos } = await res.json();

    if (!videos || videos.length === 0) {
      grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;width:100%;padding:60px">🎬 Videos coming soon!</p>';
      return;
    }

    grid.innerHTML = videos.map((v) => {
      if (v.type === 'youtube') {
        const ytId = extractYouTubeId(v.source);
        return `
          <div class="video-card">
            <div class="video-thumb">
              <iframe
                src="https://www.youtube.com/embed/${ytId}"
                title="${escHtml(v.title)}"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
                loading="lazy"
              ></iframe>
            </div>
            <div class="video-info"><div class="video-title">${escHtml(v.title)}</div></div>
          </div>
        `;
      }
      return `
        <div class="video-card">
          <div class="video-thumb">
            <video controls preload="metadata" style="width:100%;height:100%;object-fit:cover;">
              <source src="/uploads/videos/${v.source}" type="video/mp4" />
            </video>
          </div>
          <div class="video-info"><div class="video-title">${escHtml(v.title)}</div></div>
        </div>
      `;
    }).join('');
  } catch (e) {
    grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;width:100%;padding:60px">Could not load videos.</p>';
  }
}

function extractYouTubeId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^?&\n]+)/);
  return match ? match[1] : url;
}

// ── Certificate Search ────────────────────────────────────────
let searchTimeout;
const certSearch = document.getElementById('certSearch');
const certResults = document.getElementById('certResults');

certSearch?.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  const query = certSearch.value.trim();

  if (query.length < 2) {
    certResults.innerHTML = '';
    return;
  }

  searchTimeout = setTimeout(() => searchCertificates(query), 350);
});

async function searchCertificates(name) {
  certResults.innerHTML = '<div class="cert-hint">Searching...</div>';
  try {
    const res = await fetch(`${API}/api/certificates/search?name=${encodeURIComponent(name)}`);
    const { results } = await res.json();

    if (!results || results.length === 0) {
      certResults.innerHTML = `
        <div class="cert-no-results">
          😕 No certificate found for "<strong>${escHtml(name)}</strong>".<br/>
          <small style="color:var(--text-muted);margin-top:8px;display:block">Try your full name as registered during the event.</small>
        </div>
      `;
      return;
    }

    certResults.innerHTML = results.map((r) => `
      <div class="cert-result-item">
        <div class="cert-result-name">📜 ${escHtml(r.participant_name)}</div>
        <a
          href="${API}/api/certificates/${r.id}/download"
          class="cert-download-btn"
          download
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download
        </a>
      </div>
    `).join('');
  } catch (e) {
    certResults.innerHTML = '<div class="cert-no-results">Search failed. Please try again.</div>';
  }
}

// ── Organizers ────────────────────────────────────────────────
async function loadOrganizers() {
  const list = document.getElementById('organizersList');
  if (!list) return;
  try {
    const res = await fetch(`${API}/api/organizers`);
    const data = await res.json();
    const organizers = Array.isArray(data) ? data : [];

    if (organizers.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px">Team info coming soon!</p>';
      return;
    }

    const team = organizers.filter(o => !o.is_faculty);
    const faculty = organizers.filter(o => o.is_faculty);

    const renderCard = (o) => {
      const initials = o.name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const avatarHtml = o.photo
        ? `<img src="/uploads/photos/${escHtml(o.photo)}" alt="${escHtml(o.name)}" />`
        : `<div class="org-card-avatar-placeholder">${initials}</div>`;

      const socials = [
        o.linkedin ? `<a href="${escHtml(o.linkedin)}" target="_blank" rel="noopener" title="LinkedIn"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg></a>` : '',
        o.github ? `<a href="${escHtml(o.github)}" target="_blank" rel="noopener" title="GitHub"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg></a>` : '',
        o.twitter ? `<a href="${escHtml(o.twitter)}" target="_blank" rel="noopener" title="Twitter/X"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>` : '',
      ].filter(Boolean).join('');

      return `
        <div class="org-card ${o.is_faculty ? 'faculty' : ''}">
          <div class="org-card-avatar">${avatarHtml}</div>
          <div class="org-card-name">${escHtml(o.name)}</div>
          <div class="org-card-badge">${escHtml(o.title)}</div>
          ${o.description ? `<div class="org-card-desc">${escHtml(o.description)}</div>` : ''}
          ${socials ? `<div class="org-card-socials">${socials}</div>` : ''}
        </div>
      `;
    };

    let html = `<div class="org-grid">${team.map(o => renderCard(o)).join('')}</div>`;

    if (faculty.length > 0) {
      html += `
        <div class="faculty-divider"><span>Faculty Coordinators</span></div>
        <div class="org-grid">${faculty.map(o => renderCard(o)).join('')}</div>
      `;
    }

    list.innerHTML = html;
  } catch (e) {
    list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px">Could not load organizers.</p>';
  }
}

// ── Intersection Observer for animations ─────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.animationPlayState = 'running';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-up').forEach((el) => {
  el.style.animationPlayState = 'paused';
  observer.observe(el);
});

// ── Utility ───────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Init ──────────────────────────────────────────────────────
(async function init() {
  await loadContent();
  await Promise.all([loadWinners(), loadGallery(), loadVideos(), loadOrganizers()]);
})();
