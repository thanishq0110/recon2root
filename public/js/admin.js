/* ============================================================
   Recon2Root — Admin Dashboard JavaScript
   ============================================================ */

const API = '';

// ── Auth guard ────────────────────────────────────────────────
(async function checkAuth() {
  const res = await fetch(`${API}/api/auth/check`);
  const { authenticated } = await res.json();
  if (!authenticated) window.location.href = '/admin/login.html';
})();

// ── Logout ────────────────────────────────────────────────────
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await fetch(`${API}/api/auth/logout`, { method: 'POST' });
  window.location.href = '/admin/login.html';
});

// ── Sidebar navigation ────────────────────────────────────────
const panelTitles = {
  winners: '🏆 Winners',
  photos: '📸 Photos',
  videos: '🎬 Videos',
  certificates: '📜 Certificates',
  content: '✏️ Site Content',
};

document.querySelectorAll('.sidebar-link').forEach((btn) => {
  btn.addEventListener('click', () => {
    const panelId = btn.dataset.panel;
    document.querySelectorAll('.sidebar-link').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`panel-${panelId}`)?.classList.add('active');
    document.getElementById('pageTitle').textContent = panelTitles[panelId] || panelId;
    if (panelId === 'photos') loadAdminPhotos();
    if (panelId === 'videos') loadAdminVideos();
    if (panelId === 'content') loadContent();
    if (panelId === 'winners') loadWinners();
    if (panelId === 'certificates') loadCertStats();
  });
});

// ── Feedback helper ───────────────────────────────────────────
function showFeedback(id, message, type = 'success') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.className = `feedback ${type}`;
  setTimeout(() => { el.className = 'feedback'; }, 5000);
}

// ── Winners ───────────────────────────────────────────────────
const rankLabels = { 1: '🥇 1st Place', 2: '🥈 2nd Place', 3: '🥉 3rd Place' };

async function loadWinners() {
  const container = document.getElementById('winnersFields');
  try {
    const res = await fetch(`${API}/api/winners`);
    const { winners } = await res.json();
    const map = Object.fromEntries((winners || []).map((w) => [w.rank, w]));

    container.innerHTML = [1, 2, 3].map((rank) => {
      const w = map[rank] || {};
      return `
        <div class="winner-form-group">
          <div class="winner-form-rank">${rankLabels[rank]}</div>
          <div class="winner-form-grid">
            <div class="form-row">
              <label class="form-label">Team Name</label>
              <input type="text" class="form-input" id="w${rank}_team" value="${escHtml(w.team_name || '')}" placeholder="Team name" />
            </div>
            <div class="form-row">
              <label class="form-label">Score</label>
              <input type="text" class="form-input" id="w${rank}_score" value="${escHtml(w.score || '')}" placeholder="e.g. 4500" />
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">Members (comma-separated)</label>
            <input type="text" class="form-input" id="w${rank}_members" value="${escHtml(w.members || '')}" placeholder="Alice, Bob, Charlie" />
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    container.innerHTML = '<p class="panel-hint">Failed to load winners.</p>';
  }
}

document.getElementById('winnersForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const winners = [1, 2, 3].map((rank) => ({
    rank,
    team_name: document.getElementById(`w${rank}_team`)?.value || '',
    members: document.getElementById(`w${rank}_members`)?.value || '',
    score: document.getElementById(`w${rank}_score`)?.value || '',
  }));

  try {
    const res = await fetch(`${API}/api/winners`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winners }),
    });
    const data = await res.json();
    if (res.ok) showFeedback('winnersFeedback', '✅ Winners saved successfully!');
    else showFeedback('winnersFeedback', data.error || 'Failed to save', 'error');
  } catch {
    showFeedback('winnersFeedback', 'Network error', 'error');
  }
});

// ── Photos ────────────────────────────────────────────────────
const photoDropZone = document.getElementById('photoDropZone');
const photoFilesInput = document.getElementById('photoFiles');
const photoPreview = document.getElementById('photoPreview');
const photoUploadBtn = document.getElementById('photoUploadBtn');
let selectedPhotoFiles = [];

photoDropZone?.addEventListener('click', () => photoFilesInput?.click());
photoDropZone?.addEventListener('dragover', (e) => { e.preventDefault(); photoDropZone.classList.add('drag-over'); });
photoDropZone?.addEventListener('dragleave', () => photoDropZone.classList.remove('drag-over'));
photoDropZone?.addEventListener('drop', (e) => {
  e.preventDefault();
  photoDropZone.classList.remove('drag-over');
  handlePhotoFiles(Array.from(e.dataTransfer.files));
});
photoFilesInput?.addEventListener('change', () => handlePhotoFiles(Array.from(photoFilesInput.files)));

function handlePhotoFiles(files) {
  selectedPhotoFiles = files.filter((f) => f.type.startsWith('image/'));
  photoPreview.innerHTML = selectedPhotoFiles.map((f) => {
    const url = URL.createObjectURL(f);
    return `<img class="preview-thumb" src="${url}" alt="${escHtml(f.name)}" />`;
  }).join('');
  photoUploadBtn.disabled = selectedPhotoFiles.length === 0;
}

document.getElementById('photoUploadForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (selectedPhotoFiles.length === 0) return;

  const category = document.getElementById('photoCategory')?.value || 'general';
  const formData = new FormData();
  formData.append('category', category);
  selectedPhotoFiles.forEach((f) => formData.append('photos', f));

  photoUploadBtn.disabled = true;
  photoUploadBtn.textContent = 'Uploading...';

  try {
    const res = await fetch(`${API}/api/photos/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) {
      showFeedback('photoFeedback', `✅ ${data.count} photo(s) uploaded!`);
      selectedPhotoFiles = [];
      photoPreview.innerHTML = '';
      loadAdminPhotos();
    } else {
      showFeedback('photoFeedback', data.error || 'Upload failed', 'error');
    }
  } catch {
    showFeedback('photoFeedback', 'Network error', 'error');
  } finally {
    photoUploadBtn.disabled = false;
    photoUploadBtn.textContent = '📤 Upload Photos';
  }
});

async function loadAdminPhotos() {
  const grid = document.getElementById('adminGalleryGrid');
  try {
    const res = await fetch(`${API}/api/photos`);
    const { photos } = await res.json();
    if (!photos || photos.length === 0) {
      grid.innerHTML = '<p class="panel-hint">No photos uploaded yet.</p>';
      return;
    }
    grid.innerHTML = photos.map((p) => `
      <div class="admin-gallery-item">
        <img src="/uploads/photos/${p.filename}" alt="${escHtml(p.original_name)}" loading="lazy" />
        <button class="admin-gallery-delete" data-id="${p.id}" title="Delete">✕</button>
      </div>
    `).join('');
    grid.querySelectorAll('.admin-gallery-delete').forEach((btn) => {
      btn.addEventListener('click', () => deletePhoto(btn.dataset.id));
    });
  } catch {
    grid.innerHTML = '<p class="panel-hint">Failed to load photos.</p>';
  }
}

async function deletePhoto(id) {
  if (!confirm('Delete this photo?')) return;
  try {
    await fetch(`${API}/api/photos/${id}`, { method: 'DELETE' });
    loadAdminPhotos();
  } catch {
    alert('Failed to delete photo');
  }
}

// ── Videos ────────────────────────────────────────────────────
document.getElementById('videoType')?.addEventListener('change', (e) => {
  const isYt = e.target.value === 'youtube';
  document.getElementById('ytUrlRow').style.display = isYt ? '' : 'none';
  document.getElementById('videoFileRow').style.display = isYt ? 'none' : '';
});

document.getElementById('videoForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const type = document.getElementById('videoType')?.value;
  const title = document.getElementById('videoTitle')?.value;
  const formData = new FormData();
  formData.append('title', title);
  formData.append('type', type);

  if (type === 'youtube') {
    formData.append('youtube_url', document.getElementById('ytUrl')?.value || '');
  } else {
    const file = document.getElementById('videoFile')?.files[0];
    if (!file) { showFeedback('videoFeedback', 'Please select a video file', 'error'); return; }
    formData.append('video', file);
  }

  try {
    const res = await fetch(`${API}/api/videos/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) {
      showFeedback('videoFeedback', '✅ Video added!');
      document.getElementById('videoForm').reset();
      loadAdminVideos();
    } else {
      showFeedback('videoFeedback', data.error || 'Failed', 'error');
    }
  } catch {
    showFeedback('videoFeedback', 'Network error', 'error');
  }
});

async function loadAdminVideos() {
  const list = document.getElementById('adminVideosList');
  try {
    const res = await fetch(`${API}/api/videos`);
    const { videos } = await res.json();
    if (!videos || videos.length === 0) {
      list.innerHTML = '<p class="panel-hint">No videos added yet.</p>';
      return;
    }
    list.innerHTML = videos.map((v) => `
      <div class="admin-video-item">
        <div>
          <div class="admin-video-title">${escHtml(v.title)}</div>
          <div class="admin-video-type">${v.type === 'youtube' ? '▶ YouTube' : '📁 Uploaded'}</div>
        </div>
        <button class="btn-delete" data-id="${v.id}">Delete</button>
      </div>
    `).join('');
    list.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.addEventListener('click', () => deleteVideo(btn.dataset.id));
    });
  } catch {
    list.innerHTML = '<p class="panel-hint">Failed to load videos.</p>';
  }
}

async function deleteVideo(id) {
  if (!confirm('Delete this video?')) return;
  try {
    await fetch(`${API}/api/videos/${id}`, { method: 'DELETE' });
    loadAdminVideos();
  } catch {
    alert('Failed to delete video');
  }
}

// ── Certificates ──────────────────────────────────────────────
document.getElementById('certBulkForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const csvFile = document.getElementById('certCsv')?.files[0];
  const pdfFiles = document.getElementById('certPdfs')?.files;

  if (!csvFile || !pdfFiles?.length) {
    showFeedback('certBulkFeedback', 'CSV and PDF files are required', 'error');
    return;
  }

  const csvText = await csvFile.text();
  const formData = new FormData();
  formData.append('csv', csvText);
  Array.from(pdfFiles).forEach((f) => formData.append('pdfs', f));

  const btn = document.getElementById('certBulkBtn');
  btn.disabled = true;
  btn.textContent = 'Uploading...';

  try {
    const res = await fetch(`${API}/api/certificates/bulk-upload`, { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) {
      showFeedback('certBulkFeedback', `✅ ${data.imported} certificates imported!`);
      loadCertStats();
    } else {
      showFeedback('certBulkFeedback', data.error || 'Upload failed', 'error');
    }
  } catch {
    showFeedback('certBulkFeedback', 'Network error', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '📤 Upload All Certificates';
  }
});

document.getElementById('certSingleForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('certName')?.value;
  const pdf = document.getElementById('certPdf')?.files[0];
  if (!name || !pdf) return;

  const formData = new FormData();
  formData.append('participant_name', name);
  formData.append('pdf', pdf);

  try {
    const res = await fetch(`${API}/api/certificates/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok) {
      showFeedback('certSingleFeedback', '✅ Certificate uploaded!');
      document.getElementById('certSingleForm').reset();
      loadCertStats();
    } else {
      showFeedback('certSingleFeedback', data.error || 'Failed', 'error');
    }
  } catch {
    showFeedback('certSingleFeedback', 'Network error', 'error');
  }
});

async function loadCertStats() {
  try {
    const res = await fetch(`${API}/api/certificates/stats`);
    const data = await res.json();
    const totalEl = document.getElementById('certTotal');
    const dlEl = document.getElementById('certDownloads');
    if (totalEl) totalEl.textContent = data.total ?? '—';
    if (dlEl) dlEl.textContent = data.totalDownloads ?? '—';
  } catch {
    // silent
  }
}

// ── Content ───────────────────────────────────────────────────
async function loadContent() {
  try {
    const res = await fetch(`${API}/api/content`);
    const { content } = await res.json();
    const keys = ['hero_tagline', 'hero_subtitle', 'about_text', 'total_participants', 'total_challenges', 'event_venue', 'instagram_url', 'linkedin_url'];
    keys.forEach((key) => {
      const el = document.getElementById(`c_${key}`);
      if (el && content[key]) el.value = content[key];
    });
  } catch {
    // silent
  }
}

document.getElementById('contentForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const keys = ['hero_tagline', 'hero_subtitle', 'about_text', 'total_participants', 'total_challenges', 'event_venue', 'instagram_url', 'linkedin_url'];
  const updates = {};
  keys.forEach((key) => {
    const el = document.getElementById(`c_${key}`);
    if (el) updates[key] = el.value;
  });

  try {
    const res = await fetch(`${API}/api/content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    });
    const data = await res.json();
    if (res.ok) showFeedback('contentFeedback', '✅ Content updated!');
    else showFeedback('contentFeedback', data.error || 'Failed', 'error');
  } catch {
    showFeedback('contentFeedback', 'Network error', 'error');
  }
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
loadWinners();
