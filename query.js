const store = require('../lib/store');
const { search } = require('../lib/retrieval');
const { askClaude } = require('../lib/claude');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const message = String(req.body?.message || '').trim();
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    if (!message) return res.status(400).json({ error: 'message is required' });

    const allChunks = await store.getAllChunks();
    const topChunks = search(allChunks, message, 6);
    const reply = await askClaude({ query: message, contextChunks: topChunks, history });

    res.status(200).json({
      reply,
      sources: topChunks.map((c) => ({ doc: c.docName, score: Number(c.score.toFixed(2)) }))
    });
  } catch (err) {
    console.error('Query error:', err);
    res.status(500).json({ error: 'Failed to answer query', details: err.message });
  }
};
