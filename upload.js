const { requireServerClient, bucket } = require('../lib/supabase');
const { extractText } = require('../lib/extract');
const store = require('../lib/store');

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv',
  '.png', '.jpg', '.jpeg', '.webp', '.bmp', '.txt', '.md'
]);

function extension(name) {
  const match = /\.[^.]+$/.exec(String(name || ''));
  return match ? match[0].toLowerCase() : '';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const items = Array.isArray(req.body?.files) ? req.body.files : [];
  if (!items.length) return res.status(400).json({ error: 'No uploaded files were provided.' });
  if (items.length > 20) return res.status(400).json({ error: 'Maximum 20 files per request.' });

  const supabase = requireServerClient();
  const results = [];

  for (const item of items) {
    const name = String(item.name || 'unnamed').slice(0, 255);
    const filePath = String(item.path || '');
    const ext = extension(name);

    if (!filePath.startsWith('tmp/') || filePath.length > 500) {
      results.push({ name, status: 'failed', error: 'Invalid temporary upload path.' });
      continue;
    }
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      results.push({ name, status: 'failed', error: `Unsupported file type: ${ext || 'unknown'}` });
      continue;
    }

    try {
      const { data, error } = await supabase.storage.from(bucket).download(filePath);
      if (error) throw new Error(`Storage download failed: ${error.message}`);

      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length > 25 * 1024 * 1024) throw new Error('File is larger than 25 MB.');

      const text = await extractText(buffer, name);
      if (!String(text || '').trim()) throw new Error('No text could be extracted from this file.');

      const saved = await store.addDocument(name, item.type || 'application/octet-stream', text);
      results.push({ name, docId: saved.docId, chunkCount: saved.chunkCount, status: 'ok' });
    } catch (err) {
      console.error(`Upload processing failed for ${name}:`, err);
      results.push({ name, status: 'failed', error: err.message || 'Processing failed' });
    } finally {
      await supabase.storage.from(bucket).remove([filePath]).catch(() => {});
    }
  }

  res.status(200).json({ results });
};
