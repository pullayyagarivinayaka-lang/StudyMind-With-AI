const url = process.env.SUPABASE_URL;
const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const publicKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const bucket = process.env.SUPABASE_BUCKET || 'studymind-files';

function requireConfig() {
  if (!url || !serverKey) {
    throw new Error('Supabase server environment variables are missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY).');
  }
}

function getPublicConfig() {
  if (!url || !publicKey) {
    throw new Error('Supabase public environment variables are missing. Set SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY).');
  }
  return { url, anonKey: publicKey, bucket };
}

async function dbRequest(tableAndQuery, options = {}) {
  requireConfig();
  const response = await fetch(`${url}/rest/v1/${tableAndQuery}`, {
    ...options,
    headers: {
      apikey: serverKey,
      Authorization: `Bearer ${serverKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase database error ${response.status}: ${text}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function storageDownload(filePath) {
  requireConfig();
  const response = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}/${filePath.split('/').map(encodeURIComponent).join('/')}`, {
    headers: { apikey: serverKey, Authorization: `Bearer ${serverKey}` }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase storage error ${response.status}: ${text}`);
  }
  return response.arrayBuffer();
}

async function storageRemove(filePath) {
  requireConfig();
  const response = await fetch(`${url}/storage/v1/object/remove`, {
    method: 'POST',
    headers: {
      apikey: serverKey,
      Authorization: `Bearer ${serverKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prefixes: [filePath] })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase storage delete error ${response.status}: ${text}`);
  }
}

module.exports = { getPublicConfig, dbRequest, storageDownload, storageRemove, bucket };
