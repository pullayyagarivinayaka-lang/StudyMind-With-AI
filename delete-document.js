const store = require('../lib/store');

module.exports = async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
  const id = String(req.query.id || '').trim();
  if (!id) return res.status(400).json({ error: 'Document id is required' });

  try {
    await store.deleteDocument(id);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete document', details: err.message });
  }
};
