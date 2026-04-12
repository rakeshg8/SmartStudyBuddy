# Smart Study Buddy

Smart Study Buddy is an AI-powered learning platform that helps students upload notes, ask questions, generate quizzes, and track progress in focused workspaces.

It supports:
- PDF text extraction
- OCR for handwritten notes
- Semantic embeddings + retrieval (RAG flow)
- AI chat answers with source pages
- Quick Study mode (lightweight, fast workflow)
- Exam Mode quiz generation
- Supabase auth and workspace persistence

## Live Product Vision

The goal is simple: turn static study material into an interactive learning companion.

Users can:
1. Create subject-based workspaces
2. Upload typed or handwritten notes
3. Ask context-aware questions
4. Generate exam-style practice
5. Keep a history of learning progress

## Tech Stack

Frontend:
- React 19 + Vite 7
- React Router
- Tailwind CSS
- Supabase JS client
- PDF.js + Tesseract.js

Backend/API:
- Node.js + Express
- Supabase (DB + Auth + Storage)
- Cohere Embeddings API
- OpenRouter LLM API (Mistral model)

## Architecture Overview

High-level flow:

1. User uploads PDF/handwritten file
2. File stored in Supabase Storage (`documents` bucket)
3. Text extracted per page (PDF.js or OCR)
4. Text chunked into smaller segments
5. Backend creates embeddings via Cohere
6. Embeddings stored in Supabase table
7. User asks question
8. Question embedding generated
9. Most relevant chunks retrieved by cosine similarity
10. Context is sent to LLM for final answer

## Main Features

### 1) Authentication
- Email/password login and signup
- Google OAuth login
- Session persistence via Supabase Auth

### 2) Workspace-Based Study
- Create multiple workspaces per user
- Upload multiple documents per workspace
- Chat with AI over uploaded content

### 3) Quick Study
- Fast one-off study sessions
- Dedicated quick study chat/document tables
- Optimized for quick upload and immediate Q&A

### 4) OCR + Handwritten Notes
- Image and PDF OCR support using Tesseract
- Handwritten notes can be embedded and queried

### 5) Exam Mode
- Generates quiz-style Q&A from uploaded content
- Supports parsing AI-generated question/answer output

### 6) Progress Tracking
- Tracks study time and progress snapshots per workspace

## Project Structure

```text
smart-study-buddy/
	backend/                  # Express backend for embeddings/query endpoints
		api/
			index.js
		index.js
	src/
		api/                    # Additional API handler files
		components/             # UI and feature components
		context/                # Auth context
		supabase/               # Supabase client
		utils/                  # PDF/OCR/chunk helpers
	server.js                 # Local express server variant
	package.json              # Frontend scripts
```

## Environment Variables

Create env files for both frontend and backend.

### Frontend (`.env` in root)

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Backend (`backend/.env`)

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
COHERE_API_KEY=your_cohere_key
OPENROUTER_API_KEY=your_openrouter_key
PORT=5000
```

## Installation & Run

### 1) Install frontend dependencies

```bash
npm install
```

### 2) Install backend dependencies

```bash
cd backend
npm install
```

### 3) Start backend

```bash
cd backend
npm start
```

### 4) Start frontend

```bash
# from project root
npm run dev
```

Frontend runs on Vite default port (`5173`).

## API Endpoints

Current API routes used in the app:

- `POST /api/embeddings`
	- Input: `workspace_id` or `quick_study_id`, `document_id`, `page_number`, `chunk_text`
	- Output: stores embedding in Supabase

- `POST /api/query`
	- Input: `workspace_id` or `quick_study_id`, `question`, optional `mode`
	- Output: AI answer + sources

## Supabase Data Model (Expected)

Core tables referenced by the app:
- `workspaces`
- `documents`
- `embeddings`
- `chat_history`
- `progress`
- `quick_studies`
- `quick_documents`
- `quick_chats`
- `chats` (backend save path)

Storage buckets expected:
- `documents`

Optional RPC used:
- `increment_progress_time(p_workspace_id, p_seconds)`

## Important Notes

- Some frontend API calls are currently hardcoded to deployed URLs (Vercel domain). For fully local development, switch those `fetch(...)` URLs to your local backend origin.
- There are a few legacy/experimental files in the repo (for example, duplicate backend entry files and empty component placeholders). Current active app flow is centered on `src/components/WorkspaceView.jsx` and `src/components/QuickStudyView.jsx`.
- The project currently has no automated tests configured.

## Scripts

Root:
- `npm run dev` - start Vite dev server
- `npm run build` - production build
- `npm run preview` - preview production build
- `npm run lint` - run ESLint

Backend:
- `npm start` - start Express API

## Roadmap Ideas

- Add unit/integration tests for API and critical UI flows
- Move hardcoded API origins to env-driven config
- Add robust quiz schema/JSON output format
- Add citation highlighting inside PDF viewer
- Add role-based access and sharing for collaborative study

## Contributing

1. Fork the repo
2. Create a feature branch
3. Commit with clear messages
4. Open a pull request

## License

MIT License

Copyright (c) 2026 rakeshg8
