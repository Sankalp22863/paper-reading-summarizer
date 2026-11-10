# Papertrail — paper reading workspace

A responsive research dashboard for **machine learning, computer architecture, memory systems, in-memory computing, compilers, and pre/post-training**. Built with React + Vite; deployable under a GitHub Pages repository path.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. No credentials are needed for local mode. Example papers and example summaries are clearly labeled and can be removed in **Settings & imports → Remove examples**.

```sh
npm test
npm run build
npm run preview
```

## Features

- Tile library with full-text metadata/notes search, topic and status filters, and title/date sorting.
- Add/edit paper metadata, reading status, a short takeaway, methods, findings, limitations, next steps, and reading notes.
- Upload a PDF first to autofill title, authors, publication year, venue, DOI/arXiv link, and abstract when detectable. PDF.js reads embedded metadata and the first two pages locally in your browser. Review the suggestions before saving; existing entries and manual corrections are preserved. Scanned PDFs require manual entry (no OCR).
- Attach, replace, reopen, and delete annotated PDFs up to 25 MB. Local PDFs use IndexedDB; local metadata uses localStorage.
- Topic suggestions grounded in the existing **read** papers. Suggestions are editable and require acceptance. See [detect_paper_words.md](detect_paper_words.md).
- Related papers from the library, plus on-demand Crossref topic search and a flow to add results to the reading list.
- Monthly reading goals, optional topic focus, completion tracking, and library-based planning suggestions.
- Supabase email/password signup, confirmation, login, and logout when configured. Cloud libraries start empty and stay separate from the local example workspace.
- Export metadata, notes, and goals as JSON. PDF bytes are not included; retain original PDFs separately. JSON restore is not currently implemented.
- Assistant guidance in [agent.md](agent.md). This is an instruction file, not a running scheduled agent.

The current takeaway helper copies the first two sentences of your notes. It is explicitly labeled as an excerpt, **not an AI-generated summary**. PDF OCR, handwriting transcription, semantic embeddings, LLM summarization, and direct Notability account sync are not implemented. No API key is needed for the local workflow or Crossref search.

## Enable real accounts and private cloud storage

GitHub Pages serves static files; it cannot itself run authentication or store uploaded private PDFs. This app uses Supabase for those services.

1. Create a Supabase project and run [supabase/schema.sql](supabase/schema.sql) once in its SQL editor. It creates a per-user library table, row-level access policies, and a private `papers` storage bucket limited to PDFs up to 25 MB.
2. In Supabase Authentication, enable email/password sign-in and email confirmation. Set your Site URL to the deployed app URL. Add the deployed URL and your local development URL to the permitted redirect URLs.
3. Copy `.env.example` to `.env.local`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the project URL and **publishable / anon** key. Never use a secret or service-role key in the frontend.
4. Restart Vite, sign up, confirm the email, and sign in. Account libraries are distinct from local data; local papers are not silently uploaded.
5. For production, add the same two values as GitHub repository **Actions variables**, then rebuild/deploy.

The application stores one JSON library document per account. Concurrent edits from different tabs/devices use last-write-wins behavior; avoid editing the same account simultaneously. Live Supabase authentication and row-level policies need verification against your configured project before relying on the deployment for private research.

Suggested project verification: create two test users; save a paper and upload a PDF as user A; ensure user B cannot query A's library, read A's file path, create a signed URL for it, or upload into A's folder. Logged-out visitors must not read either library.

## Publish on GitHub Pages

The included [.github/workflows/deploy.yml](.github/workflows/deploy.yml) builds, runs unit tests, and deploys on pushes to `main` or manual dispatch.

1. In this repository's GitHub **Settings → Pages**, choose **GitHub Actions** as the source.
2. If you want cloud accounts, add the two Supabase variables under **Settings → Secrets and variables → Actions → Variables** before deploying. Without them, the build supports local mode and explains the account setup requirement.
3. Commit and push the changes to `main`. Watch the **Deploy Papertrail to GitHub Pages** workflow.
4. Once deployment succeeds, the expected URL for this repository is:
   `https://sankalp22863.github.io/paper-reading-summarizer/`
5. Link that URL from your personal site. Relative asset paths support project-site hosting. The application uses internal state rather than server-dependent routes.

The static app is publicly accessible, but signed-in libraries and PDFs remain private through Supabase policies. Visitors without a cloud login get their own browser-local example workspace; this is not a public view of the owner's library. Do not commit research PDFs, exported private notes, or `.env.local`.

If the GitHub CLI reports an expired token, run `gh auth login -h github.com` before using CLI deployment commands. The workflow does not publish until the changes are pushed and Pages is enabled.

## Import from Notability

Use **Share / Export → PDF** in Notability, then attach that file in Papertrail's Add/Edit paper dialog. You can also enable **Connected Services → Auto-Backup / Third-Party Backup**, choose a provider, and select PDF as the backup format, then upload a downloaded backup.

Notability documents PDF backups to Box, Dropbox, Google Drive, OneDrive, and WebDAV. It describes this as one-way backup. The app does not authenticate to Notability or watch a backup folder. The uploaded PDF is preserved unchanged; audio/bookmarks may not be included in Notability's PDF export. Handwritten annotations remain visible in the file but are not turned into summary text.

## Tests

`npm test` exercises PDF metadata inference, preservation of user edits, group evidence, cold-start behavior, self-exclusion, paper connections, monthly goal counting, safe links, and excerpt behavior. `npm run test:e2e` checks PDF autofill and fallback behavior, manual overrides, saved abstracts, the local UI, uploads/persistence, reading goals, and responsive layout using Playwright. Install its Chromium browser with `npx playwright install chromium`, or set `PLAYWRIGHT_CHROME_PATH` to a local Chrome executable. The production build is served for browser tests.

## Sources

- [GitHub Pages hosting model](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Supabase signup API](https://supabase.com/docs/reference/javascript/auth-signup)
- [Supabase storage access policies](https://supabase.com/docs/guides/storage/security/access-control)
- [Notability's official backup guide](https://support.gingerlabs.com/en-us/articles/16300117-auto-backup-third-party-backup-guide)
- [Crossref REST API](https://www.crossref.org/documentation/retrieve-metadata/rest-api/)
