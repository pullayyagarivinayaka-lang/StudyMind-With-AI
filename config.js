const { getPublicConfig } = require('../lib/supabase');

module.exports = function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(getPublicConfig());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
