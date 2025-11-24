# Local RAG Assistant (GitHub Pages UI + Local Backend)

This project is a hybrid RAG system:

- **Frontend (UI)**: Static web app suitable for GitHub Pages. Provides chat, file/source view, and controls for refreshing the index.
- **Backend (local)**: Python + FastAPI service that runs on your machine, reads your local files, builds a ChromaDB vector store, and calls OpenAI using your API key.

The **browser UI never directly reads your filesystem or your API key**. It only talks to the local backend over HTTP.

## High-Level Architecture

- GitHub Pages hosts a static React UI at e.g. `https://<your-user>.github.io/<repo>/`.
- On your machine, you run a local backend (FastAPI) on `http://localhost:8000` that:
  - Accepts a list of root folders to index (your code, notes, docs, etc.).
  - Builds/refreshes a **ChromaDB** persistent store under `~/.local_rag_store`.
  - Handles **queries** by retrieving relevant documents and calling **OpenAI** (RAG pattern).
  - Returns answers + structured source metadata (file paths, snippets) to the UI.

This gives you:

- **Local control** of files and API key.
- **GitHub Pages** convenience for hosting the interface.
- Ability to **refresh** or **rebuild** the index at any time.

## Docker vs. Bare-Metal

Both options are supported conceptually:

- **Bare-metal (simplest to start)**
  - Install Python 3.10+.
  - `pip install -r backend/requirements.txt`.
  - `uvicorn backend.main:app --reload`.
- **Dockerized backend (optional enhancement)**
  - Build a small image with Python + FastAPI + ChromaDB.
  - Mount host folders into the container and expose port 8000.

We can add a `Dockerfile` and `docker-compose.yml` once the API stabilizes.

## For Non-Technical Users (Windows)

You only need to do two things:

1. **Start the local backend**
   - Open the `backend` folder.
   - Double-click `start-backend.bat`.
   - A window will open, set things up the first time, and then say the server is running on `http://localhost:8000`.
   - Leave this window open while you use the app.

2. **Open the web interface**
   - Visit the GitHub Pages URL (provided to you, e.g. `https://<your-user>.github.io/Chase-Construction-Group/`).
   - In the left sidebar:
     - Make sure **Backend URL** is `http://localhost:8000`.
     - Add one or more **Root Paths** (folders with your files).
     - Paste your **OpenAI API Key**.
     - Click **Configure backend**, then **Index / Refresh**.
   - Now you can ask questions in the chat area and see sources on the right.

## Next Steps

- [x] Scaffold backend service with FastAPI + ChromaDB RAG engine.
- [ ] Add frontend React app (for GitHub Pages) with:
  - Chat panel.
  - Source list + per-file snippet view.
  - Controls for configuring root paths and triggering index/refresh.
- [ ] Wire frontend to backend endpoints (`/config`, `/index`, `/query`, `/health`).
