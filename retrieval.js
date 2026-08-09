// Lightweight BM25 ranking. No embedding API is required.
function tokenize(text) {
  return (String(text || '').toLowerCase().match(/[a-z0-9]+/g) || []).filter((t) => t.length > 1);
}

function buildIndex(chunks) {
  const docFreq = {};
  const termCounts = [];
  let totalLen = 0;

  chunks.forEach((chunk) => {
    const tokens = tokenize(chunk.text);
    totalLen += tokens.length;
    const tf = {};
    tokens.forEach((t) => { tf[t] = (tf[t] || 0) + 1; });
    termCounts.push(tf);
    Object.keys(tf).forEach((t) => { docFreq[t] = (docFreq[t] || 0) + 1; });
  });

  return {
    docFreq,
    termCounts,
    avgLen: chunks.length ? totalLen / chunks.length : 0,
    N: chunks.length
  };
}

function search(chunks, query, topK = 6) {
  if (!chunks.length) return [];
  const { docFreq, termCounts, avgLen, N } = buildIndex(chunks);
  const qTokens = [...new Set(tokenize(query))];
  const k1 = 1.5;
  const b = 0.75;

  return chunks.map((chunk, idx) => {
    const tf = termCounts[idx];
    const docLen = tokenize(chunk.text).length;
    let score = 0;
    qTokens.forEach((term) => {
      if (!tf[term]) return;
      const df = docFreq[term] || 1;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      const freq = tf[term];
      const denom = freq + k1 * (1 - b + b * (docLen / (avgLen || 1)));
      score += idf * ((freq * (k1 + 1)) / (denom || 1));
    });
    return { ...chunk, score };
  }).filter((c) => c.score > 0)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, topK);
}

module.exports = { search, tokenize };
