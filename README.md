# 🏗️ ConstructOS (CONCURIS)

> **Next-Generation Construction Management, Fleet Tracking & AI-Powered Document Intelligence Platform.**

ConstructOS is an enterprise-ready construction operating system designed to streamline multi-tenant project coordination, real-time material logistics, subcontractor bidding, and intelligent document analysis.

---

## 🌟 Key Features

### 1. 🤖 Two-Tier AI & RAG Intelligence
- **Public Construction AI (`/chat`)**:
  - Grounded on **22,000+ vector chunks** of national building codes, civil engineering standards, waterproofing, and safety practices.
  - Generates rich, formatted Markdown responses (tables, bullet points, bold emphasis) without restrictive prompts.
- **AI Project Query Console (`/dashboard/ai-query`)**:
  - **Strictly Project-Scoped**: Answers questions based solely on the drawings, specifications, and Master Plans uploaded to that project.
  - **Exact Vector Scoring**: Utilizes high-precision in-memory cosine ranking with `all-MiniLM-L6-v2` embeddings for zero false-positives and sub-millisecond lookups.

### 2. 🚚 Real-Time Logistics & Driver Tracking
- **Driver GPS Broadcast (`/driver-track`)**:
  - Single-click location pings using HTML5 Geolocation API with automated 20-second interval updates.
  - One-tap navigation opening coordinates directly in Google Maps.
- **Site Manager Deliveries Portal (`/dashboard/deliveries`)**:
  - Live dispatch monitoring with auto-polling every 20 seconds.
  - Real-time status progression (`pending` ➔ `in_transit` ➔ `delivered` ➔ `cancelled`).

### 3. 📑 Project & Master Plan Management
- Multi-project workspaces supporting versioned Master Plans (`v1`, `v2`, etc.).
- Direct PDF-to-RAG chunking upon upload, making blueprints and rulebooks instantly searchable.
- Site Manager assignment and subcontractor allocation per project.

### 4. 💰 Quotation Analysis & Subcontractor RFP Engine
- Deterministic pricing and quantity variance validation against standard reference indices.
- Plain-language AI explanations for flagged quotation line items.
- Request for Proposals (RFP) lifecycle management and vendor quote submission portal.

### 5. 🔐 Role-Based Access Control (RBAC)
- Fine-grained access layers for **Company Admin**, **Site Manager**, **Subcontractor**, and **Driver**.
- JWT-based authentication paired with Supabase PostgreSQL Row Level Security (RLS).

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack), [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), `react-markdown` + `remark-gfm`, Lucide Icons |
| **Backend API** | [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+), Uvicorn, Pydantic v2, Structlog |
| **Database & Vector Search** | [Supabase PostgreSQL](https://supabase.com/) with `pgvector`, Asyncpg |
| **Embeddings & LLM** | [SentenceTransformers](https://www.sbert.net/) (`all-MiniLM-L6-v2`, 384-dim), [Groq Cloud](https://groq.com/) (`openai/gpt-oss-120b` with multi-model fallback) |

---

## 📁 Repository Structure

```text
ShareIITK/
├── frontend/                     # Next.js 16 Web Application
│   ├── src/
│   │   ├── app/                  # App Router Pages
│   │   │   ├── chat/             # Public Knowledge Base Chat
│   │   │   ├── dashboard/        # Role-based Dashboards (Projects, Deliveries, RFPs, Materials)
│   │   │   │   └── ai-query/     # Project AI Document Query Console
│   │   │   ├── driver-track/     # 1-Click Driver GPS Broadcast Portal
│   │   │   ├── login/ & register/# Auth Pages
│   │   ├── components/           # Reusable UI & Layout Components
│   │   │   └── ui/MarkdownContent.tsx # GFM Table & Markdown Renderer
│   │   └── lib/api.ts            # Axios API Client & Endpoints
│   ├── package.json
│   └── next.config.ts
│
├── backend/                      # FastAPI Backend Service
│   ├── app/
│   │   ├── api/v1/endpoints/     # API Endpoints (Auth, Projects, Deliveries, Project RAG, Chat)
│   │   ├── core/                 # Config & JWT Security
│   │   ├── db/                   # Supabase Client Handlers
│   │   └── services/             # Groq LLM, Embedding & RAG Services
│   ├── supabase/migrations/      # SQL Database Migrations (001 - 007)
│   ├── ingest_massive_kb.py      # Batch Ingestion Script for Knowledge Base
│   ├── requirements.txt
│   └── Procfile                  # Railway / Production Process File
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js `18.x` or higher & `npm`
- Python `3.11` or higher
- A [Supabase](https://supabase.com/) project with the `pgvector` extension enabled
- A [Groq API Key](https://console.groq.com/)

---

### 1. Database Setup
Execute the SQL migration scripts located in `backend/supabase/migrations/` sequentially inside your Supabase SQL Editor:
1. `001_initial_schema.sql`
2. `002_pgvector_rpc.sql`
3. `003_storage_buckets.sql`
4. `004_delivery_tracking_columns.sql`
5. `005_rag_metadata_and_project_query.sql`
6. `006_fix_project_rag_prefilter.sql`
7. `007_cleanup_match_rag_chunks.sql`

---

### 2. Backend Configuration & Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file inside `backend/`:
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres:[PASSWORD]@[HOST]:5432/postgres
   SUPABASE_URL=https://[PROJECT-REF].supabase.co
   SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
   SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
   GROQ_API_KEY=[YOUR-GROQ-API-KEY]
   GROQ_MODEL=openai/gpt-oss-120b
   JWT_SECRET_KEY=[YOUR-SUPER-SECRET-KEY]
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   ```
5. Start the backend development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

---

### 3. Frontend Configuration & Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Create a `.env.local` file inside `frontend/`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚢 Deployment Guide

### Backend (Railway / Render / Docker)
- Ensure all environment variables from `backend/.env` are set in your deployment service.
- Set the start command to:
  ```bash
  uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```

### Frontend (Vercel / Railway)
- Set `NEXT_PUBLIC_API_URL` to your live backend domain (e.g. `https://backend-production-xxxx.up.railway.app`).
- Deploy with `npm run build`.

---

## 📄 License

This project is licensed under the MIT License.
