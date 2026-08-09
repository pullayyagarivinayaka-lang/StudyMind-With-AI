const store = require('../lib/store');
const { search } = require('../lib/retrieval');
const { askClaude } = require('../lib/claude');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const query = String(req.body?.query || '').trim();
    if (!query) return res.status(400).json({ error: 'query is required' });

    const allChunks = await store.getAllChunks();
    const results = search(allChunks, query, 8);
    let synthesized = null;
    let synthesisError = null;

    if (results.length) {
      try {
        synthesized = await askClaude({ query, contextChunks: results.slice(0, 5), history: [] });
      } catch (err) {
        console.error('Search synthesis failed:', err.message);
        synthesisError = 'AI summary unavailable right now, but here are the ranked matches from your material.';
      }
    }

    res.status(200).json({
      query,
      answer: synthesized,
      synthesisError,
      results: results.map((r) => ({
        doc: r.docName,
        snippet: r.text.slice(0, 300),
        score: Number(r.score.toFixed(2))
      }))
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
};
