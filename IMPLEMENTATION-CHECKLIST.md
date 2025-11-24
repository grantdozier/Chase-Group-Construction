# Local RAG Web App — Implementation Checklist

## 1. Architecture & Core Decisions

- [ ] **Confirm deployment model**
  - [ ] Frontend: Static React app on GitHub Pages.
  - [ ] Backend: Local FastAPI service on `http://localhost:8000` (bare metal + optional Docker).
  - [ ] Communication: Frontend → Backend over HTTP (CORS configured).
- [ ] **Define security boundaries**
  - [ ] Filesystem access only in backend process.
  - [ ] OpenAI key only stored/used by backend, never persisted unencrypted to disk unless explicitly configured.
  - [ ] Frontend never has direct filesystem or key access.
- [ ] **Pick core tech stack**
  - [ ] Backend: Python 3.10+, FastAPI, Uvicorn, ChromaDB, OpenAI SDK.
  - [ ] Frontend: Vite + React + TypeScript + TailwindCSS (plus small component library if desired).
- [ ] **Define supported file types for v1**
  - [ ] Text / code: `.txt`, `.md`, `.py`, `.js`, `.ts`, `.json`, `.yaml`, `.yml`, etc.
  - [ ] Documents: `.pdf`, `.docx` (and possibly `.doc` via conversion).
  - [ ] Presentations / spreadsheets (optional later): `.pptx`, `.xlsx`.
  - [ ] Images: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`.
  - [ ] Audio: `.mp3`, `.wav`, `.m4a`.
  - [ ] Video: `.mp4`, `.mov`, `.mkv`.
- [ ] **Decide on embedding models and LLM**
  - [ ] Embeddings: `text-embedding-3-large` (or similar).
  - [ ] Chat LLM: `gpt-4.1-mini` (or tunable via config).
  - [ ] Decide how configurable models should be in UI / backend config.

---

## 2. Backend Project Setup

- [ ] **Create backend project structure**
  - [ ] `backend/requirements.txt`
  - [ ] `backend/main.py` (FastAPI entrypoint)
  - [ ] `backend/models.py` (Pydantic schemas)
  - [ ] `backend/rag.py` (RAG engine)
  - [ ] `backend/ingestion/` package for file loaders/parsers.
  - [ ] `backend/config.py` (env + configuration management).
  - [ ] `backend/utils/` for shared helpers (logging, chunking, paths).
- [ ] **Implement configuration handling**
  - [ ] Support `.env` and environment variables.
  - [ ] Configuration model for:
    - [ ] Storage directory (e.g. `~/.local_rag_store`).
    - [ ] Default include/exclude globs.
    - [ ] Max file size / extension allowlist.
    - [ ] Default embedding / LLM models.
- [ ] **Set up logging**
  - [ ] Structured logging with levels (INFO, DEBUG, ERROR).
  - [ ] Log key events: config, indexing start/end, errors, query performance.

---

## 3. Backend API Design

- [ ] **Health & diagnostics**
  - [ ] `GET /health` — service status, index info, backend version.
  - [ ] `GET /stats` — number of docs, total size, last indexed times.
- [ ] **Configuration**
  - [ ] `POST /config`
    - [ ] Accept root paths to index.
    - [ ] Accept OpenAI API key (and optionally model overrides).
    - [ ] Validate paths existence and readability.
    - [ ] Initialize Chroma/LLM clients.
- [ ] **Indexing & refresh**
  - [ ] `POST /index`
    - [ ] Inputs: `full_rebuild`, `include_globs`, `exclude_globs`.
    - [ ] Return: number of files indexed, bytes processed, elapsed time.
  - [ ] `POST /index/async` (optional)
    - [ ] Kick off long-running index job, return job ID.
    - [ ] `GET /index/status/{job_id}` for progress.
- [ ] **Querying**
  - [ ] `POST /query`
    - [ ] Inputs: `query`, `top_k`, `rerank_k`, optional filters.
    - [ ] Return:
      - [ ] `answer`
      - [ ] `context[]` with:
        - [ ] File path
        - [ ] Snippet text
        - [ ] Score
        - [ ] Optional line/byte ranges.
  - [ ] `POST /query/raw-context` (optional)
    - [ ] Return retrieved chunks only (for debugging UI).
- [ ] **Source/document access**
  - [ ] `GET /document`
    - [ ] Fetch full file contents or a slice (line range, byte range).
    - [ ] Enforce safe paths (must be under configured roots).

---

## 4. Ingestion & Parsing (All File Types)

### 4.1 Text & Code Files

- [ ] Implement generic **text loader**
  - [ ] Read with `utf-8` + fallback (`errors="ignore"`).
  - [ ] Strip binary files via simple heuristic (non-text ratio).
- [ ] Implement **chunking strategy**
  - [ ] Line-based or paragraph-based chunking.
  - [ ] Track metadata: `source_path`, `start_line`, `end_line`.
  - [ ] Tunable chunk size and overlap.

### 4.2 PDFs

- [ ] Choose PDF extraction library (e.g. `pypdf`, `pdfplumber`, or `unstructured`).
- [ ] Implement `PdfLoader`:
  - [ ] Extract text by page.
  - [ ] Record metadata: page numbers.
  - [ ] Handle large PDFs: limit pages or size if needed.
- [ ] Consider image-based PDFs:
  - [ ] Add optional OCR path (e.g. `pytesseract` + `pdf2image`) behind a flag.

### 4.3 Word / Office Docs

- [ ] Use `python-docx` or similar.
- [ ] Implement `DocxLoader`:
  - [ ] Extract paragraphs.
  - [ ] Preserve basic headings/sections in text.
- [ ] Optional: support `.pptx`, `.xlsx`:
  - [ ] Extract slide text / cell text.

### 4.4 Images

- [ ] Decide on approach:
  - [ ] Use OpenAI Vision model (e.g. send image + prompt to get caption/text).
  - [ ] Or local OCR (e.g. Tesseract) for offline option.
- [ ] Implement `ImageLoader`:
  - [ ] Read file, send to OCR/vision captioning.
  - [ ] Generate textual representation: caption + detected text.
  - [ ] Store metadata: width/height, file type.

### 4.5 Audio & Video

- [ ] Decide on transcription pipeline:
  - [ ] Call OpenAI Whisper via API (if allowed).
  - [ ] Or local Whisper for offline (optional advanced mode).
- [ ] Implement `AudioLoader`:
  - [ ] Transcribe audio.
  - [ ] Chunk transcript (timestamps as metadata).
- [ ] Implement `VideoLoader`:
  - [ ] Extract audio track.
  - [ ] Transcribe + chunk, store timestamps and maybe key frames (later).

### 4.6 Pluggable Loader Router

- [ ] Implement `FileIngestionRouter`:
  - [ ] Map file extensions → loader.
  - [ ] Allow configuration of which loaders are enabled.
  - [ ] Skip unsupported or too-large files with clear logs.

---

## 5. Vector Store & RAG Pipeline

- [ ] **ChromaDB setup**
  - [ ] Persistent client at configured path.
  - [ ] Collection per project or global collection with namespace metadata.
- [ ] **Indexing logic**
  - [ ] For each chunk:
    - [ ] Compute embedding.
    - [ ] Upsert with metadata:
      - [ ] `source_path`
      - [ ] `start_line`/`end_line` or `start_time`/`end_time` for media.
      - [ ] `file_type`, `doc_type`, etc.
  - [ ] Handle **full rebuild**:
    - [ ] Drop collection or delete documents for given roots.
- [ ] **Query logic**
  - [ ] Retrieve top `rerank_k` from vector store.
  - [ ] Optional reranking (LLM-based or heuristic).
  - [ ] Select final `top_k` chunks for context.
  - [ ] Build **prompt**:
    - [ ] Include labeled snippets with file path + location.
    - [ ] Instructions: answer only from context, cite sources.
- [ ] **LLM call**
  - [ ] Call OpenAI chat completion with RAG prompt.
  - [ ] Parse answer + attach context list to response.
- [ ] **Quality & safety**
  - [ ] Limit total token count from context.
  - [ ] Truncate overly long chunks.
  - [ ] Provide clear "I dont know" behavior.

---

## 6. Frontend (React + Vite + Tailwind)

### 6.1 Project Setup

- [ ] Initialize Vite React TS app in `frontend/`.
- [ ] Install TailwindCSS + basic component library (optional).
- [ ] Configure build for GitHub Pages:
  - [ ] Set `base` path or `homepage` for repo.
  - [ ] Handle routing without server (single-page).

### 6.2 Layout (Simple + Sidebar)

- [ ] App layout:
  - [ ] **Sidebar**:
    - [ ] Backend status (connected / not connected).
    - [ ] Config form (root paths, API key, model selection).
    - [ ] Index/Refresh controls + last indexed info.
  - [ ] **Main area**:
    - [ ] Chat panel (messages).
    - [ ] Context/source panel (list + details).
- [ ] Responsive design:
  - [ ] Collapse sidebar on narrow screens.

### 6.3 Config & Indexing UI

- [ ] Backend URL input (default `http://localhost:8000`).
- [ ] Root paths editor:
  - [ ] List of paths with add/remove.
- [ ] API key input:
  - [ ] Clearly noted "sent only to local backend".
  - [ ] Stored in local state only.
- [ ] Buttons:
  - [ ] "Save & Configure" → calls `/config`.
  - [ ] "Index / Refresh" → calls `/index`.
- [ ] Status indicators:
  - [ ] Configured vs not configured.
  - [ ] Indexing in progress (spinner/progress).
  - [ ] Last indexed timestamp and count.

### 6.4 Chat & Context UI

- [ ] Chat input with send button and Enter handling.
- [ ] Message list:
  - [ ] User messages vs assistant messages styled distinctly.
- [ ] For each answer:
  - [ ] Show citations (e.g. `[1]`, `[2]`) linked to sources panel.
- [ ] Sources panel:
  - [ ] List of context items:
    - [ ] File name and path.
    - [ ] Score/relative relevance.
    - [ ] Short snippet preview.
  - [ ] Expand to view full snippet.
  - [ ] Optional button to "open source" (deep link or copy path).

---

## 7. Deployment & Ops

- [ ] **GitHub Pages**
  - [ ] Configure `package.json` & Vite `base` for correct paths.
  - [ ] Add GitHub Actions workflow for automatic deploy on push to `main`.
- [ ] **Backend run instructions**
  - [ ] Document bare-metal run:
    - [ ] Install Python & dependencies.
    - [ ] Run Uvicorn command.
  - [ ] Add optional Docker:
    - [ ] `Dockerfile` with backend.
    - [ ] `docker-compose.yml` with volume mounts.
- [ ] **Configuration docs**
  - [ ] Explain how to choose root paths.
  - [ ] Explain privacy model (local only).
  - [ ] Explain how to rotate OpenAI key.

---

## 8. Robustness, Observability, and Hardening

- [ ] **Error handling**
  - [ ] Graceful handling of unreadable files.
  - [ ] Clear API error responses for misconfig, missing key, invalid paths.
- [ ] **Timeouts & limits**
  - [ ] Set timeouts for LLM/embedding calls.
  - [ ] Limit max file size, number of files per index run.
- [ ] **Metrics / logging exposure (optional)**
  - [ ] `GET /metrics` or simple stats endpoint.
- [ ] **Security**
  - [ ] CORS restricted to GitHub Pages origin for production.
  - [ ] No arbitrary file writes beyond storage dir.
  - [ ] Sanitized path handling to prevent path traversal.
- [ ] **Testing**
  - [ ] Unit tests for loaders (text/PDF/docx/image/audio/video).
  - [ ] Unit tests for RAG engine.
  - [ ] Minimal frontend integration tests (query + show sources).
