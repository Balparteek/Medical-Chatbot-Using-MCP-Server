# 🩺 MedAssist AI

> An intelligent healthcare chatbot powered by a **LangChain agentic loop**, **Groq LLM**, a **medical MCP server**, and a **React + Flask** fullstack architecture. Built as a major-project AI agent by **Balparteek Singh**.

---

## ✨ Features

- 🤖 **Agentic AI** — LangChain tool-calling loop with up to 10 iterations per query
- 🔬 **Medical MCP Server** — real-time lookup of drugs, clinical guidelines, medical literature, and health statistics via a custom Model Context Protocol server
- 📍 **Location-aware** — browser geolocation + OpenStreetMap reverse geocoding provides nearby hospital suggestions and country-specific emergency helpline numbers
- 💬 **Multi-turn conversations** — full chat history stored in SQLite3 with session management
- 🎨 **Markdown rendering** — rich responses with headings, tables, bold text, code blocks, and lists
- ⚡ **Optimistic UI** — user messages appear instantly while the agent processes
- 🗂️ **Sidebar session history** — browse, resume, and delete past conversations
- 🛡️ **Medical disclaimer** — every response reminds users to consult a qualified professional

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (React)                      │
│  Sidebar │ WelcomeScreen │ ChatMessage │ StatusBar        │
│               Vite + TypeScript + Tailwind               │
└──────────────────────┬──────────────────────────────────┘
                       │  HTTP  /api/*
┌──────────────────────▼──────────────────────────────────┐
│                  Flask Backend (Python)                   │
│   /api/chat   /api/sessions   /api/health                │
│                  SQLite3 (medassist.db)                   │
└──────────────────────┬──────────────────────────────────┘
                       │  asyncio bridge
┌──────────────────────▼──────────────────────────────────┐
│              AgentManager (background thread)            │
│         LangChain agentic loop + ChatGroq (Groq)         │
└──────────────────────┬──────────────────────────────────┘
                       │  stdio (MCP)
┌──────────────────────▼──────────────────────────────────┐
│           Medical MCP Server (Node.js)                   │
│  search-drugs │ search-medical-literature                │
│  search-clinical-guidelines │ get-health-statistics      │
│  search-medical-databases │ search-drug-nomenclature     │
└─────────────────────────────────────────────────────────┘
```

---

## 🗂️ Project Structure

```
Major_Project/
├── app.py                        # Flask backend + AgentManager
├── .env                          # API keys (not committed)
├── requirements.txt              # Python dependencies
├── medassist.db                  # SQLite3 database (auto-created)
│
├── src/                          # React frontend (Vite + TypeScript)
│   ├── App.tsx                   # Root component, session + message state
│   ├── hooks/
│   │   └── useLocation.ts        # Browser geolocation + Nominatim geocoding
│   ├── lib/
│   │   ├── api.ts                # Flask API calls + reverseGeocode()
│   │   └── types.ts              # Shared TypeScript types
│   └── components/
│       ├── ChatMessage.tsx       # Markdown renderer (no external deps)
│       ├── ChatInput.tsx         # Message input bar
│       ├── Sidebar.tsx           # Session list
│       ├── StatusBar.tsx         # Backend + location status
│       ├── WelcomeScreen.tsx     # Landing with emergency quick-actions
│       ├── TypingIndicator.tsx   # Animated dots while agent thinks
│       └── AboutPage.tsx         # Project info page
│
├── dist/                         # Vite production build (served by Flask)
│
└── mcp/
    └── medical-mcp/              # Medical MCP server (Node.js)
        ├── src/
        │   └── index.ts          # MCP tool definitions
        └── build/
            └── index.js          # Compiled MCP server (run by Flask)
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 9+ |
| Groq API key | [console.groq.com](https://console.groq.com) |

---

### 1. Clone the repository

```bash
git clone https://github.com/your-username/medassist-ai.git
cd medassist-ai
```

### 2. Set up the Python environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
DB_PATH=medassist.db
MCP_SERVER_PATH=./mcp/medical-mcp/build/index.js
MAX_MESSAGE_LEN=2000
```

### 4. Build the Medical MCP server

```bash
cd mcp/medical-mcp
npm install
npm run build
cd ../..
```

### 5. Build the React frontend

```bash
npm install
npm run build
```

### 6. Run the Flask backend

```bash
python app.py
```

Open **http://localhost:5000** in your browser. The React app is served directly by Flask.

---

## 🔌 API Reference

### `POST /api/chat`
Send a message and receive an AI response.

**Request body:**
```json
{
  "message": "What are the symptoms of pneumonia?",
  "session_id": "optional-existing-uuid",
  "location": {
    "lat": 30.7333,
    "lng": 76.7794,
    "city": "Mohali",
    "state": "Punjab",
    "country": "India",
    "countryCode": "IN",
    "displayName": "Mohali, Punjab, India"
  }
}
```

**Response:**
```json
{
  "response": "## Symptoms of Pneumonia\n...",
  "session_id": "uuid"
}
```

---

### `GET /api/chat/<session_id>`
Retrieve full message history for a session.

### `GET /api/sessions`
List all sessions ordered by most recent activity.

### `DELETE /api/sessions/<session_id>`
Delete a session and all its messages.

### `GET /api/health`
Returns backend status, active model, and loaded MCP tool names.

---

## 📍 Location Feature

When the user grants browser location access:

1. The browser calls `navigator.geolocation.getCurrentPosition()`
2. Coordinates are reverse-geocoded via the free **OpenStreetMap Nominatim API** (no API key needed)
3. The resolved city/state/country is displayed in the status bar and sent with every chat request
4. Flask injects a location context block into the agent's system prompt
5. The LLM uses this to name real local hospitals and provide country-correct emergency numbers

**Emergency numbers used by the agent:**

| Country | Ambulance | General Emergency |
|---------|-----------|-------------------|
| India | 108 | 112 |
| USA | 911 | 911 |
| UK | 999 | 999 / 112 |
| Australia | 000 | 000 |
| EU | 112 | 112 |

---

## 🧰 Tech Stack

**Frontend**
- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) — build tool
- [Tailwind CSS](https://tailwindcss.com/) — styling
- [Lucide React](https://lucide.dev/) — icons
- Custom markdown renderer (no external markdown library)

**Backend**
- [Flask](https://flask.palletsprojects.com/) — HTTP server
- [Flask-CORS](https://flask-cors.readthedocs.io/) — cross-origin support
- [SQLite3](https://www.sqlite.org/) — persistent chat storage (WAL mode)
- [python-dotenv](https://pypi.org/project/python-dotenv/) — environment config

**AI / Agent**
- [LangChain](https://langchain.com/) — agentic tool-calling loop
- [langchain-groq](https://python.langchain.com/docs/integrations/chat/groq/) — Groq LLM integration
- [langchain-mcp-adapters](https://github.com/langchain-ai/langchain-mcp-adapters) — MCP ↔ LangChain bridge
- [Groq](https://groq.com/) — inference (llama-3.3-70b-versatile)

**MCP Server**
- [Model Context Protocol](https://modelcontextprotocol.io/) — tool protocol
- Node.js + TypeScript
- Tools: `search-drugs`, `search-medical-literature`, `search-clinical-guidelines`, `get-health-statistics`, `search-medical-databases`, `search-drug-nomenclature`

---

## ⚠️ Disclaimer

MedAssist AI provides **general health information only**. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified medical professional before making any health decisions.
