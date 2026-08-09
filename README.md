# StudyMind AI — Vercel Ready

StudyMind AI is an exam-focused RAG study mentor. It accepts PDFs, DOCX notes, Excel/CSV files, scanned images through OCR, and text/Markdown, then retrieves relevant passages with BM25 and asks Claude to produce a structured answer.

## Architecture

- **Vercel**: frontend + serverless API routes
- **Supabase Postgres**: documents and extracted chunks
- **Supabase Storage**: temporary upload staging; raw files are removed after extraction
- **BM25**: retrieval, with no embedding API required
- **Anthropic Claude**: final exam-focused answer

The original project stored uploads and `data/store.json` on the local filesystem. That is not reliable for Vercel Functions, so this version moves persistence to Supabase.

## 1. Create the Supabase project

Create a Supabase project, open **SQL Editor**, and run:

`supabase/schema.sql`

This creates:

- `documents`
- `chunks`
- private Storage bucket `studymind-files`
- anonymous temporary-upload policy for the Storage bucket

The database tables intentionally have no public read/write policies. The Vercel API uses the server-only service key.

## 2. Get Supabase keys

From the Supabase dashboard, copy:

- Project URL
- client-safe `anon` key (or publishable key)
- server-only `service_role` key (or secret key)

**Never put the service-role/secret key in frontend code or GitHub.**

## 3. Create the Vercel environment variables

Add these in Vercel → Project → Settings → Environment Variables:

```text
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_KEY
SUPABASE_BUCKET=studymind-files
```

Optional:

```text
ANTHROPIC_MODEL=claude-sonnet-4-6
```

The service key and Anthropic key are server-only.

## 4. Push this folder to GitHub

From the project folder:

```bash
git init
git add .
git commit -m "Convert StudyMind AI to Vercel"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/studymind-ai.git
git push -u origin main
```

Do not commit `.env`, API keys, `node_modules`, or the original local `data/store.json`.

## 5. Deploy on Vercel

1. Open Vercel.
2. Click **Add New → Project**.
3. Import the GitHub repository.
4. Keep the project root at the repository root.
5. Vercel should detect the Node/Vercel Functions project automatically.
6. Add the environment variables from step 3.
7. Deploy.

There is no `npm start` server in this version. Vercel serves `public/` as the website and files in `api/` as serverless functions.

## 6. Test after deployment

Open:

```text
https://YOUR-VERCEL-DOMAIN.vercel.app/
```

Then test:

```text
https://YOUR-VERCEL-DOMAIN.vercel.app/api/health
```

A healthy response should show `ok: true`, `hasAnthropicKey: true`, and `hasSupabase: true`.

## Important upload design

Do **not** send the actual PDF/image/etc. through a Vercel Function. Vercel documents a 4.5 MB request-body limit for Functions. The browser therefore uploads directly to Supabase Storage and sends only a small JSON reference to `/api/upload`.

The server downloads the temporary object, extracts its text, stores the extracted chunks in Supabase Postgres, and removes the temporary Storage object.

For files larger than about 6 MB, Supabase recommends resumable uploads for better reliability. The current UI uses standard direct uploads for simplicity; if you plan to handle very large files, upgrade the browser upload code to Supabase TUS/resumable uploads.

## OCR note

The existing Tesseract.js OCR functionality is preserved. OCR is the most CPU-intensive path and can take longer than normal PDF/DOCX/TXT extraction. If OCR requests time out, enable Vercel Fluid Compute or move OCR to a dedicated background worker.

## Anonymous demo limitation

This version keeps the original project's simple, no-login behavior. Therefore all visitors share the same StudyMind document collection. For a real public product, add authentication and associate every document/chunk with a user ID before allowing uploads.

## Project structure

```text
studymind-ai/
├── api/
│   ├── config.js
│   ├── delete-document.js
│   ├── documents.js
│   ├── health.js
│   ├── query.js
│   ├── search.js
│   └── upload.js
├── lib/
│   ├── claude.js
│   ├── extract.js
│   ├── retrieval.js
│   ├── store.js
│   └── supabase.js
├── public/
│   ├── app.js
│   ├── index.html
│   └── style.css
├── supabase/
│   └── schema.sql
├── .env.example
├── .gitignore
├── package.json
└── vercel.json
```
