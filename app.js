// StudyMind AI frontend — Vercel + Supabase version.

const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const uploadStatus = document.getElementById('uploadStatus');
const docList = document.getElementById('docList');
const chatThread = document.getElementById('chatThread');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const globalSearch = document.getElementById('globalSearch');
const globalSearchBtn = document.getElementById('globalSearchBtn');
const searchResults = document.getElementById('searchResults');

let chatHistory = [];
let supabaseClient = null;
let supabaseConfig = null;

async function init() {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    if (!res.ok) throw new Error(config.error || 'Configuration failed');
    supabaseConfig = config;
    if (!window.supabase?.createClient) throw new Error('Supabase browser library did not load.');
    supabaseClient = window.supabase.createClient(config.url, config.anonKey);
    loadDocuments();
  } catch (err) {
    uploadStatus.innerHTML = `<div class="row fail">Setup error: ${escapeHtml(err.message)}</div>`;
  }
}

// ---------- Upload ----------
fileInput.addEventListener('change', () => uploadFiles(fileInput.files));
['dragover', 'drop'].forEach((evt) => dropzone.addEventListener(evt, (e) => e.preventDefault()));
dropzone.addEventListener('drop', (e) => {
  if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
});

function safeFileName(name) {
  return String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
}

async function uploadFiles(files) {
  if (!supabaseClient) {
    uploadStatus.innerHTML = '<div class="row fail">The app is still connecting to Supabase. Please try again.</div>';
    return;
  }

  const selected = Array.from(files).slice(0, 20);
  if (!selected.length) return;

  uploadStatus.innerHTML = '<div class="row">Uploading files securely…</div>';
  const uploaded = [];

  for (const file of selected) {
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error('Maximum file size is 25 MB.');
      const folder = `tmp/${crypto.randomUUID()}`;
      const path = `${folder}/${safeFileName(file.name)}`;

      const { error } = await supabaseClient.storage
        .from(supabaseConfig.bucket)
        .upload(path, file, {
          cacheControl: '3600',
          contentType: file.type || 'application/octet-stream',
          upsert: false
        });
      if (error) throw error;

      uploaded.push({ path, name: file.name, type: file.type, size: file.size });
    } catch (err) {
      uploadStatus.innerHTML += `<div class="row fail">✗ ${escapeHtml(file.name)} — ${escapeHtml(err.message || 'upload failed')}</div>`;
    }
  }

  if (!uploaded.length) {
    fileInput.value = '';
    return;
  }

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: uploaded })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Processing failed');

    uploadStatus.innerHTML = (data.results || [])
      .map((r) => r.status === 'ok'
        ? `<div class="row"><span class="ok">✓ ${escapeHtml(r.name)}</span><span>${r.chunkCount} chunks</span></div>`
        : `<div class="row"><span class="fail">✗ ${escapeHtml(r.name)}</span><span>${escapeHtml(r.error || 'failed')}</span></div>`)
      .join('');
  } catch (err) {
    uploadStatus.innerHTML += `<div class="row fail">Processing failed: ${escapeHtml(err.message)}</div>`;
  }

  fileInput.value = '';
  loadDocuments();
}

async function loadDocuments() {
  try {
    const res = await fetch('/api/documents');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load documents');
    if (!data.documents?.length) {
      docList.innerHTML = '<p class="empty-note">No material uploaded yet. Everything you add here becomes searchable and answerable below.</p>';
      return;
    }
    docList.innerHTML = data.documents.map((d) => `<div class="doc-item">
      <div><div class="doc-name">${escapeHtml(d.name)}</div><div class="doc-meta">${d.chunkCount} chunks</div></div>
      <button onclick="deleteDoc('${escapeHtml(d.id)}')" title="Remove">✕</button>
    </div>`).join('');
  } catch (e) {
    docList.innerHTML = '<p class="empty-note">Could not load uploaded material.</p>';
  }
}

async function deleteDoc(id) {
  try {
    const res = await fetch('/api/delete-document?id=' + encodeURIComponent(id), { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    loadDocuments();
  } catch (e) {
    alert('Could not delete this document.');
  }
}
window.deleteDoc = deleteDoc;

// ---------- Chat ----------
function addMsg(role, html) {
  const d = document.createElement('div');
  d.className = 'msg ' + role;
  d.innerHTML = `<div class="msg-avatar">${role === 'bot' ? 'AI' : 'ME'}</div><div class="msg-bubble">${html}</div>`;
  chatThread.appendChild(d);
  chatThread.scrollTop = chatThread.scrollHeight;
  return d;
}

function addThinking() {
  const d = document.createElement('div');
  d.className = 'msg bot';
  d.innerHTML = '<div class="msg-avatar">AI</div><div class="msg-bubble thinking"><span></span><span></span><span></span></div>';
  chatThread.appendChild(d);
  chatThread.scrollTop = chatThread.scrollHeight;
  return d;
}

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = '';
  chatInput.style.height = 'auto';
  addMsg('user', escapeHtml(text));
  const thinking = addThinking();

  try {
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: chatHistory })
    });
    const data = await res.json();
    thinking.remove();
    if (!res.ok) throw new Error(data.error || 'Request failed');

    chatHistory.push({ role: 'user', content: text });
    chatHistory.push({ role: 'assistant', content: data.reply });
    const sourcesHtml = data.sources?.length
      ? `<div class="sources">Sources: ${data.sources.map((s) => `${escapeHtml(s.doc)} (${s.score})`).join(', ')}</div>`
      : '';
    addMsg('bot', formatText(data.reply) + sourcesHtml);
  } catch (e) {
    thinking.remove();
    addMsg('bot', `Something went wrong: ${escapeHtml(e.message)}`);
  }
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
chatInput.addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// ---------- Priority search ----------
async function runSearch() {
  const query = globalSearch.value.trim();
  if (!query) return;
  searchResults.innerHTML = '<p class="empty-note">Searching…</p>';
  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Search failed');

    let html = '';
    if (data.answer) html += `<div class="search-answer"><h4>Best answer</h4>${formatText(data.answer)}</div>`;
    else if (data.synthesisError) html += `<div class="search-answer"><h4>Note</h4>${escapeHtml(data.synthesisError)}</div>`;

    if (data.results?.length) {
      html += data.results.map((r, i) => `<div class="result-item">
        <div class="result-head"><span class="result-rank">#${i + 1}</span><span class="result-score">score ${r.score}</span></div>
        <div class="result-doc">${escapeHtml(r.doc)}</div>
        <div class="result-snippet">${escapeHtml(r.snippet)}…</div>
      </div>`).join('');
    } else {
      html += '<p class="empty-note">No matching material found. Try different keywords or upload more documents.</p>';
    }
    searchResults.innerHTML = html;
  } catch (e) {
    searchResults.innerHTML = `<p class="empty-note">Search failed: ${escapeHtml(e.message)}</p>`;
  }
}

globalSearchBtn.addEventListener('click', runSearch);
globalSearch.addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(); });

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function formatText(str) {
  return escapeHtml(str).replace(/\n/g, '<br>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

init();
