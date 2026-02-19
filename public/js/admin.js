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
  organizers: '👥 Organizers',
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
    if (panelId === 'content') {
      loadContent();
      loadSections(); // Load section reordering UI
    }
    if (panelId === 'winners') loadWinners();
    if (panelId === 'certificates') loadCertStats();
    if (panelId === 'organizers') loadAdminOrganizers();
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

// ── Photos: State ──
let allPhotos = [];
let currentPhotoCategory = 'all';
let currentPhotoPage = 1;
const PHOTOS_PER_PAGE = 20;

async function loadAdminPhotos() {
  const grid = document.getElementById('adminGalleryGrid');
  grid.innerHTML = '<p class="panel-hint">Loading...</p>';

  try {
    // Only fetch if empty (or force reload strategies, but for now fetch all)
    const res = await fetch(`${API}/api/photos`);
    const { photos } = await res.json();
    allPhotos = photos || [];
    renderPhotos();
  } catch (e) {
    console.error(e);
    grid.innerHTML = '<p class="panel-hint">Failed to load photos.</p>';
  }
}

function renderPhotos() {
  const grid = document.getElementById('adminGalleryGrid');
  const pagination = document.getElementById('photoPagination');
  
  // 1. Filter
  const filtered = currentPhotoCategory === 'all' 
    ? allPhotos 
    : allPhotos.filter(p => p.category === currentPhotoCategory);
    
  // 2. Paginate
  const totalPages = Math.ceil(filtered.length / PHOTOS_PER_PAGE) || 1;
  if (currentPhotoPage > totalPages) currentPhotoPage = totalPages;
  if (currentPhotoPage < 1) currentPhotoPage = 1;
  
  const start = (currentPhotoPage - 1) * PHOTOS_PER_PAGE;
  const pageItems = filtered.slice(start, start + PHOTOS_PER_PAGE);
  
  // 3. Render Grid
  if (pageItems.length === 0) {
    grid.innerHTML = '<p class="panel-hint">No photos found.</p>';
  } else {
    grid.innerHTML = pageItems.map((p) => `
      <div class="admin-gallery-item">
        <img src="/uploads/photos/${p.filename}" alt="${escHtml(p.original_name)}" loading="lazy" />
        <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.6);color:white;font-size:0.7rem;padding:4px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
           ${p.category || 'general'}
        </div>
        <button class="admin-gallery-delete" data-id="${p.id}" title="Delete">✕</button>
      </div>
    `).join('');
    
    grid.querySelectorAll('.admin-gallery-delete').forEach((btn) => {
      btn.addEventListener('click', () => deletePhoto(btn.dataset.id));
    });
  }
  
  // 4. Update Pagination UI
  document.getElementById('photoPageInfo').textContent = `Page ${currentPhotoPage} of ${totalPages} (${filtered.length} total)`;
  document.getElementById('btnPrevPhotos').disabled = currentPhotoPage === 1;
  document.getElementById('btnNextPhotos').disabled = currentPhotoPage === totalPages;
  pagination.style.display = filtered.length > 0 ? 'flex' : 'none';
  
  // 5. Update Tabs UI
  document.querySelectorAll('.gallery-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === currentPhotoCategory);
  });
}

window.filterAdminPhotos = (cat) => {
  currentPhotoCategory = cat;
  currentPhotoPage = 1;
  renderPhotos();
};

window.changePhotoPage = (delta) => {
  currentPhotoPage += delta;
  renderPhotos();
};

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

// ── Videos: State ──
let allVideos = [];
let currentVideoPage = 1;
const VIDEOS_PER_PAGE = 20;

async function loadAdminVideos() {
  const grid = document.getElementById('adminVideosGrid');
  grid.innerHTML = '<p class="panel-hint">Loading...</p>';

  try {
    const res = await fetch(`${API}/api/videos`);
    const { videos } = await res.json();
    allVideos = videos || [];
    renderVideos();
  } catch (e) {
    grid.innerHTML = '<p class="panel-hint">Failed to load videos.</p>';
  }
}

function renderVideos() {
  const grid = document.getElementById('adminVideosGrid');
  const pagination = document.getElementById('videoPagination');
  
  // 1. Paginate
  const totalPages = Math.ceil(allVideos.length / VIDEOS_PER_PAGE) || 1;
  if (currentVideoPage > totalPages) currentVideoPage = totalPages;
  if (currentVideoPage < 1) currentVideoPage = 1;
  
  const start = (currentVideoPage - 1) * VIDEOS_PER_PAGE;
  const pageItems = allVideos.slice(start, start + VIDEOS_PER_PAGE);
  
  // 2. Render Grid
  if (pageItems.length === 0) {
    grid.innerHTML = '<p class="panel-hint">No videos added yet.</p>';
  } else {
    grid.innerHTML = pageItems.map((v) => {
      let thumb = '';
      if (v.type === 'youtube') {
        const videoId = extractYtId(v.youtube_url);
        thumb = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '';
      }
      
      return `
      <div class="admin-gallery-item">
        ${thumb 
          ? `<img src="${thumb}" alt="${escHtml(v.title)}" style="object-fit:cover;" />`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--bg-primary);color:var(--text-muted);flex-direction:column;gap:8px;"><span style="font-size:2rem;">🎬</span><span style="font-size:0.7rem;">${v.type}</span></div>`
        }
        <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.8);color:white;font-size:0.75rem;padding:6px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
           ${escHtml(v.title)}
        </div>
        <button class="admin-gallery-delete" data-id="${v.id}" title="Delete">✕</button>
      </div>
    `}).join('');
    
    grid.querySelectorAll('.admin-gallery-delete').forEach((btn) => {
      btn.addEventListener('click', () => deleteVideo(btn.dataset.id));
    });
  }
  
  // 3. Update Pagination UI
  document.getElementById('videoPageInfo').textContent = `Page ${currentVideoPage} of ${totalPages} (${allVideos.length} total)`;
  document.getElementById('btnPrevVideos').disabled = currentVideoPage === 1;
  document.getElementById('btnNextVideos').disabled = currentVideoPage === totalPages;
  pagination.style.display = allVideos.length > 0 ? 'flex' : 'none';
}

window.changeVideoPage = (delta) => {
  currentVideoPage += delta;
  renderVideos();
};

function extractYtId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
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

// ── Organizers ────────────────────────────────────────────────
let editingOrganizerId = null;

document.getElementById('orgForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData();
  formData.append('name', document.getElementById('orgName').value);
  formData.append('title', document.getElementById('orgTitle').value);
  formData.append('description', document.getElementById('orgDesc').value);
  formData.append('is_faculty', document.getElementById('orgIsFaculty').checked ? 'true' : 'false');
  formData.append('is_lead', document.getElementById('orgIsLead').checked ? 'true' : 'false');
  
  const linkedin = document.getElementById('orgLinkedin')?.value;
  const github = document.getElementById('orgGithub')?.value;
  const twitter = document.getElementById('orgTwitter')?.value;
  const instagram = document.getElementById('orgInstagram')?.value;
  const facebook = document.getElementById('orgFacebook')?.value;
  
  if (linkedin) formData.append('linkedin', linkedin);
  if (github) formData.append('github', github);
  if (twitter) formData.append('twitter', twitter);
  if (instagram) formData.append('instagram', instagram);
  if (facebook) formData.append('facebook', facebook);
  
  const photo = document.getElementById('orgPhoto')?.files[0];
  if (photo) formData.append('photo', photo);

  try {
    let res;
    if (editingOrganizerId) {
      // Update existing
      res = await fetch(`${API}/api/organizers/${editingOrganizerId}`, { method: 'PUT', body: formData });
    } else {
      // Create new
      res = await fetch(`${API}/api/organizers`, { method: 'POST', body: formData });
    }
    
    const data = await res.json();
    if (res.ok) {
      showFeedback('orgFeedback', editingOrganizerId ? '✅ Organizer updated!' : '✅ Organizer added!');
      resetOrgForm();
      loadAdminOrganizers();
    } else {
      showFeedback('orgFeedback', data.error || 'Failed', 'error');
    }
  } catch {
    showFeedback('orgFeedback', 'Network error', 'error');
  }
});

function resetOrgForm() {
  document.getElementById('orgForm').reset();
  editingOrganizerId = null;
  const btn = document.querySelector('#orgForm button[type="submit"]');
  btn.textContent = '➕ Add Organizer';
  btn.classList.remove('btn-update'); // Optional style class
  // Remove cancel button if exists
  document.getElementById('btnCancelEdit')?.remove();
}

window.editOrganizer = async (id) => {
  try {
    const res = await fetch(`${API}/api/organizers`);
    const organizers = await res.json();
    const org = organizers.find(o => o.id === id);
    if (!org) return;

    document.getElementById('orgName').value = org.name;
    document.getElementById('orgTitle').value = org.title;
    document.getElementById('orgDesc').value = org.description || '';
    document.getElementById('orgIsFaculty').checked = !!org.is_faculty;
    document.getElementById('orgIsLead').checked = !!org.is_lead;
    document.getElementById('orgLinkedin').value = org.linkedin || '';
    document.getElementById('orgGithub').value = org.github || '';
    document.getElementById('orgTwitter').value = org.twitter || '';
    document.getElementById('orgInstagram').value = org.instagram || '';
    document.getElementById('orgFacebook').value = org.facebook || '';
    
    editingOrganizerId = id;
    
    const btn = document.querySelector('#orgForm button[type="submit"]');
    btn.textContent = '💾 Update Organizer';
    
    // Add cancel button if not exists
    if (!document.getElementById('btnCancelEdit')) {
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.id = 'btnCancelEdit';
      cancelBtn.textContent = 'Cancel Edit';
      cancelBtn.className = 'btn-secondary'; // Assuming this class exists or generic style
      cancelBtn.style.marginLeft = '10px';
      cancelBtn.onclick = resetOrgForm;
      btn.parentNode.appendChild(cancelBtn);
    }

    document.getElementById('orgForm').scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    console.error(e);
  }
};

async function loadAdminOrganizers() {
  const container = document.getElementById('adminOrgList');
  if (!container) return;
  container.innerHTML = '<p class="panel-hint">Loading...</p>';
  try {
    const res = await fetch(`${API}/api/organizers`);
    const data = await res.json();
    const organizers = Array.isArray(data) ? data : [];
    if (organizers.length === 0) {
      container.innerHTML = '<p class="panel-hint">No organizers added yet.</p>';
      return;
    }
    container.innerHTML = organizers.map((o) => `
      <div class="admin-video-item org-item" data-id="${o.id}">
        <div style="display:flex;align-items:center;gap:12px;pointer-events:none;">
          <div class="drag-handle" style="display:none;cursor:grab;padding-right:8px;font-size:1.2rem;color:var(--text-muted);">☰</div>
          ${o.photo ? `<img src="/uploads/photos/${escHtml(o.photo)}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;" />` : `<div style="width:44px;height:44px;border-radius:50%;background:var(--accent-dim);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--accent);font-size:0.8rem;">${escHtml(o.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase())}</div>`}
          <div>
            <div class="admin-video-title">${escHtml(o.name)}</div>
            <div class="admin-video-type">${escHtml(o.title)}${o.is_faculty ? ' · Faculty' : ''}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn-edit" onclick="editOrganizer('${o.id}')" style="background:var(--accent-dim);color:var(--accent);border:none;padding:6px 12px;border-radius:4px;cursor:pointer;">✎ Edit</button>
          <button class="btn-delete" data-id="${o.id}">Delete</button>
        </div>
      </div>
    `).join('');
    
    // Add delete listeners
    container.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.addEventListener('click', () => deleteOrganizer(btn.dataset.id));
    });

    // Add drag listeners
    container.querySelectorAll('.org-item').forEach(item => {
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragover', handleDragOver);
      item.addEventListener('drop', handleDrop);
      item.addEventListener('dragend', handleDragEnd);
    });
  } catch {
    container.innerHTML = '<p class="panel-hint">Failed to load organizers.</p>';
  }
}

// ── Reorder Logic ──
let dragSrcEl = null;

function handleDragStart(e) {
  this.style.opacity = '0.4';
  dragSrcEl = this;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
  if (e.preventDefault) e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDrop(e) {
  if (e.stopPropagation) e.stopPropagation();
  if (dragSrcEl !== this) {
    // Swap DOM elements
    const list = this.parentNode;
    const items = [...list.children];
    const srcIndex = items.indexOf(dragSrcEl);
    const targetIndex = items.indexOf(this);

    if (srcIndex < targetIndex) {
      list.insertBefore(dragSrcEl, this.nextSibling);
    } else {
      list.insertBefore(dragSrcEl, this);
    }
  }
  return false;
}

function handleDragEnd() {
  this.style.opacity = '1';
}

document.getElementById('toggleReorderBtn')?.addEventListener('click', () => {
  const isReordering = document.getElementById('reorderControls').style.display !== 'none';
  toggleReorderMode(!isReordering);
});

document.getElementById('cancelReorderBtn')?.addEventListener('click', () => {
  toggleReorderMode(false);
  loadAdminOrganizers(); // Reset order
});

document.getElementById('saveReorderBtn')?.addEventListener('click', async () => {
  const items = document.querySelectorAll('.org-item');
  const mapping = Array.from(items).map((item, index) => ({
    id: item.dataset.id,
    sort_order: index + 1
  }));

  try {
    const res = await fetch(`${API}/api/organizers/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapping })
    });
    
    if (res.ok) {
      showFeedback('orgFeedback', '✅ Order saved!');
      toggleReorderMode(false);
    } else {
      showFeedback('orgFeedback', 'Failed to save order', 'error');
    }
  } catch {
    showFeedback('orgFeedback', 'Network error', 'error');
  }
});

function toggleReorderMode(enable) {
  const list = document.getElementById('adminOrgList');
  const controls = document.getElementById('reorderControls');
  const toggleBtn = document.getElementById('toggleReorderBtn');
  
  controls.style.display = enable ? 'block' : 'none';
  toggleBtn.style.display = enable ? 'none' : 'block';
  
  list.querySelectorAll('.org-item').forEach(item => {
    item.draggable = enable;
    item.style.cursor = enable ? 'move' : 'default';
    item.querySelector('.drag-handle').style.display = enable ? 'block' : 'none';
    item.querySelector('.btn-delete').style.display = enable ? 'none' : 'block'; // Hide delete during reorder
  });
}

async function deleteOrganizer(id) {
  if (!confirm('Delete this organizer?')) return;
  try {
    await fetch(`${API}/api/organizers/${id}`, { method: 'DELETE' });
    loadAdminOrganizers();
  } catch {
    alert('Failed to delete organizer');
  }
}

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

// ── Section Reordering ──
let currentSectionOrder = ['winners', 'gallery', 'videos', 'certificates', 'organizers'];
const sectionNames = {
  winners: '🏆 Winners',
  gallery: '📸 Photos',
  videos: '🎬 Videos',
  certificates: '📜 Certificates',
  organizers: '👥 Organizers'
};

async function loadSections() {
  const container = document.getElementById('sectionList');
  if (!container) return;
  
  try {
    const res = await fetch(`${API}/api/content`);
    const { content } = await res.json();
    if (content.homepage_section_order) {
      try {
        currentSectionOrder = JSON.parse(content.homepage_section_order);
      } catch (e) {
        console.error('Invalid section order', e);
      }
    }
    renderSectionList();
  } catch (e) {
    console.error(e);
    container.innerHTML = '<p class="panel-hint">Failed to load sections.</p>';
  }
}

function renderSectionList() {
  const container = document.getElementById('sectionList');
  if (!container) return;
  
  container.innerHTML = currentSectionOrder.map((sectionId, index) => {
    return `
      <div class="section-item">
        <span class="section-name">${sectionNames[sectionId] || sectionId}</span>
        <div class="section-controls">
          <button class="btn-move" onclick="moveSection(${index}, -1)" ${index === 0 ? 'disabled' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          </button>
          <button class="btn-move" onclick="moveSection(${index}, 1)" ${index === currentSectionOrder.length - 1 ? 'disabled' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.moveSection = (index, direction) => {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= currentSectionOrder.length) return;
  
  const item = currentSectionOrder.splice(index, 1)[0];
  currentSectionOrder.splice(newIndex, 0, item);
  renderSectionList();
};

document.getElementById('btnSaveSections')?.addEventListener('click', async () => {
  const btn = document.getElementById('btnSaveSections');
  const originalText = btn.textContent;
  btn.textContent = 'Saving...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/api/content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: { homepage_section_order: JSON.stringify(currentSectionOrder) } }),
    });
    if (res.ok) {
      showFeedback('sectionFeedback', 'Layout saved successfully!');
    } else {
      showFeedback('sectionFeedback', 'Failed to save layout', 'error');
    }
  } catch (e) {
    showFeedback('sectionFeedback', 'Error saving layout', 'error');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
});
