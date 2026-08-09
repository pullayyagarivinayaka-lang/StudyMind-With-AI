# StudyMind AI

An AI study mentor that ingests **everything you upload** — PDFs, DOCX notes,
Excel sheets, question papers, answer scripts, scanned/handwritten notes
(via OCR), and plain text/textbook excerpts — and answers every query using
**RAG (Retrieval-Augmented Generation)** grounded in your own material, with
exam-focused, step-by-step, mark-scoring answers.

Made by **Vinayaka Pullayyagari** with ❤️

---

## How it works

```
Upload → Extract text (PDF/DOCX/XLSX/OCR) → Chunk → BM25 index
                                                          │
Question ──────────────────────────────────────► Retrieve top matches
                                                          │
                                          Claude (agentic exam-mentor prompt)
                                                          │
                                          Structured, source-grounded answer
```

- **Retrieval**: BM25 lexical ranking, built from scratch in `lib/retrieval.js`
  — no external embedding API or extra cost, works well for notes/question-paper
  style text.
- **Generation**: Claude (`claude-sonnet-4-6`) with a system prompt that
  classifies the query type (concept / numerical / exam-answer / comparison /
  revision / prediction) and answers in the format that scores best for that
  type — see `lib/claude.js`.
- **Search**: `/api/search` ranks all your material against a query and
  returns both the raw ranked passages *and* a synthesized best answer,
  priority-ordered.

## Run it locally

```bash
npm install
cp .env.example .env
# edit .env and paste your real ANTHROPIC_API_KEY
npm start
```

Open http://localhost:3000

Get an API key at https://console.anthropic.com/settings/keys — this is a
**paid** API (Claude Sonnet is roughly $3 / million input tokens and
$15 / million output tokens; a typical answer costs a fraction of a cent, but
you need billing set up in the Anthropic Console).

## Push to GitHub

```bash
cd studymind-ai
git init
git add .
git commit -m "Initial commit: StudyMind AI"
git branch -M main
git remote add origin https://github.com/<your-username>/studymind-ai.git
git push -u origin main
```

`.env` and `node_modules` are already excluded via `.gitignore` — never commit
your real API key.

## Deploy as a live website

This app needs a real always-on server (file uploads, PDF/OCR processing, and
a persistent BM25 index don't fit serverless function limits like Vercel's).
**Render** is the simplest free option:

1. Go to https://render.com → New → Web Service → connect your GitHub repo.
2. Settings:
   - **Build command**: `npm install`
   - **Start command**: `npm start`
   - **Environment**: Node
3. Add an environment variable: `ANTHROPIC_API_KEY` = your real key.
4. Deploy. Render gives you a live URL like `https://studymind-ai.onrender.com`.

**Important — persistent storage**: Render's free tier disk is *ephemeral*
(wiped on redeploy/restart), so uploaded documents won't survive a restart.
For a real production deployment, either:
- Add a Render **Persistent Disk** (paid, mounts `/data` permanently — update
  `DATA_FILE` and `UPLOAD_DIR` paths in `lib/store.js` / `server.js` to point
  there), or
- Swap `lib/store.js` for a real database (Postgres via Supabase/Neon free
  tier is a good fit) so documents persist properly across restarts and
  multiple users.

The current JSON-file store is intentionally simple so you can see and modify
exactly how retrieval works — swap it out once you're ready to scale.

## Project structure

```
studymind-ai/
├── server.js              # Express app, all API routes
├── lib/
│   ├── extract.js          # PDF/DOCX/XLSX/OCR/text extraction
│   ├── store.js             # Document + chunk persistence
│   ├── retrieval.js         # BM25 ranking (the "R" in RAG)
│   └── claude.js            # Claude API call + agentic exam-mentor prompt
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js               # Upload UI, chat, search
├── .env.example
└── package.json
```

## Extending this

- **True multi-step agentic behavior**: right now the "agentic" reasoning
  (classify → retrieve → answer) happens inside one well-structured prompt to
  keep cost and latency low. For heavier agentic workflows (e.g. the model
  deciding to re-search with a refined query, or run a calculation tool before
  answering), you'd add a loop in `lib/claude.js` using Claude's tool-use API.
- **Better retrieval**: swap BM25 for real vector embeddings (e.g. Voyage AI
  embeddings, which pair naturally with Claude) once you want semantic (not
  just keyword) matching.
- **Multi-user accounts**: add authentication and scope documents per user in
  the database.
