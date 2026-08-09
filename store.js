const { dbRequest } = require('./supabase');

function chunkText(text, chunkSize = 220, overlap = 40) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 20) chunks.push(chunk);
    i += chunkSize - overlap;
  }
  return chunks.length ? chunks : [String(text || '').slice(0, 1000)];
}

async function addDocument(name, type, rawText) {
  const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const pieces = chunkText(rawText);

  await dbRequest('documents', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      id: docId,
      name,
      type: type || null,
      uploaded_at: new Date().toISOString(),
      chunk_count: pieces.length
    })
  });

  try {
    await dbRequest('chunks', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(pieces.map((text, idx) => ({
        id: `${docId}_c${idx}`,
        doc_id: docId,
        doc_name: name,
        chunk_index: idx,
        text
      })))
    });
  } catch (err) {
    await dbRequest(`documents?id=eq.${encodeURIComponent(docId)}`, { method: 'DELETE' }).catch(() => {});
    throw err;
  }

  return { docId, chunkCount: pieces.length };
}

async function getAllChunks() {
  const data = await dbRequest('chunks?select=id,doc_id,doc_name,chunk_index,text&order=doc_id.asc,chunk_index.asc');
  return (data || []).map((c) => ({
    id: c.id,
    docId: c.doc_id,
    docName: c.doc_name,
    chunkIndex: c.chunk_index,
    text: c.text
  }));
}

async function getAllDocuments() {
  const data = await dbRequest('documents?select=id,name,type,uploaded_at,chunk_count&order=uploaded_at.desc');
  return (data || []).map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type,
    uploadedAt: d.uploaded_at,
    chunkCount: d.chunk_count
  }));
}

async function deleteDocument(docId) {
  await dbRequest(`documents?id=eq.${encodeURIComponent(docId)}`, { method: 'DELETE' });
}

module.exports = { addDocument, getAllChunks, getAllDocuments, deleteDocument, chunkText };
