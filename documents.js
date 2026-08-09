const store = require('../lib/store');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    res.status(200).json({ documents: await store.getAllDocuments() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load documents', details: err.message });
  }
};
