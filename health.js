const { requireServerClient } = require('../lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const supabase = requireServerClient();
    const { error } = await supabase.from('documents').select('id', { head: true, count: 'exact' });
    res.status(error ? 500 : 200).json({
      ok: !error,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasSupabase: !error
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};
