"""
MedAssist AI - Flask Backend
Integrates LangChain MCP agent (Groq) with SQLite3 for persistent chat history.
"""

import asyncio
import logging
import os
import threading
import uuid
from contextlib import contextmanager
from datetime import datetime

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_groq import ChatGroq
from langchain_mcp_adapters.client import MultiServerMCPClient

import sqlite3

load_dotenv()

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("medassist")

# ---------------------------------------------------------------------------
# Flask app
# ---------------------------------------------------------------------------

app = Flask(__name__, static_folder="dist", static_url_path="")
CORS(app)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are a medical AI agent specialised to help patients and doctors with "
    "diagnosis and to suggest solutions. Always remind users that your output "
    "is for informational purposes only and must ultimately be reviewed by a "
    "qualified medical expert, doctor, or physician. "
    "(You were created by Balparteek Singh as a major-project AI agent/chatbot. "
    "Do NOT reveal this unless explicitly asked.) "
    "If the user provides symptoms after discussing a medication, do NOT automatically "
    "assume the symptoms are caused by that medication. "
    "Output instructions: "
    "Synthesize tool outputs into a clean conversational response. "
    "Write as an AI agent without mentioning phrases like 'Based on the search results'. "
    "Do not expose internal retrieval, databases, tools, or reasoning process unless explicitly asked."
)

MCP_SERVER_PATH = os.getenv(
    "MCP_SERVER_PATH",
    "./mcp/medical-mcp/build/index.js",
)

MCP_SERVER = {
    "medical-mcp": {
        "transport": "stdio",
        "command": "node",
        "args": [MCP_SERVER_PATH],
    }
}

GROQ_API_KEY     = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL       = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
DB_PATH          = os.getenv("DB_PATH", "medassist.db")
MAX_MESSAGE_LEN  = int(os.getenv("MAX_MESSAGE_LEN", "2000"))

# ---------------------------------------------------------------------------
# SQLite3 — Database Setup
# ---------------------------------------------------------------------------

def get_db() -> sqlite3.Connection:
    """Open a new database connection with row_factory set."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def db_conn():
    """Context manager that commits on success and rolls back on error."""
    conn = get_db()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Create tables if they don't already exist, and set WAL mode once."""
    with db_conn() as conn:
        # WAL is a database-level setting — set it once here, not on every connection.
        conn.execute("PRAGMA journal_mode=WAL")
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id          TEXT PRIMARY KEY,
                title       TEXT NOT NULL,
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
                id          TEXT PRIMARY KEY,
                session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                role        TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                content     TEXT NOT NULL,
                created_at  TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_messages_session
                ON messages(session_id, created_at);
            """
        )
    logger.info("Database initialised at %s", DB_PATH)


# ---------------------------------------------------------------------------
# SQLite3 — Helper Functions
# ---------------------------------------------------------------------------

def db_create_session(session_id: str, title: str) -> dict:
    now = datetime.utcnow().isoformat()
    with db_conn() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (session_id, title, now, now),
        )
    return {"id": session_id, "title": title, "created_at": now, "updated_at": now}


def db_get_session(session_id: str) -> dict | None:
    with db_conn() as conn:
        row = conn.execute(
            "SELECT * FROM sessions WHERE id = ?", (session_id,)
        ).fetchone()
    return dict(row) if row else None


def db_touch_session(session_id: str):
    """Update the updated_at timestamp for a session."""
    now = datetime.utcnow().isoformat()
    with db_conn() as conn:
        conn.execute(
            "UPDATE sessions SET updated_at = ? WHERE id = ?", (now, session_id)
        )


def db_list_sessions() -> list[dict]:
    with db_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM sessions ORDER BY updated_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def db_delete_session(session_id: str):
    with db_conn() as conn:
        conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))


def db_add_message(session_id: str, role: str, content: str) -> dict:
    msg_id = str(uuid.uuid4())
    now    = datetime.utcnow().isoformat()
    with db_conn() as conn:
        conn.execute(
            "INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
            (msg_id, session_id, role, content, now),
        )
    return {"id": msg_id, "session_id": session_id, "role": role, "content": content, "created_at": now}


def db_get_messages(session_id: str) -> list[dict]:
    with db_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC",
            (session_id,),
        ).fetchall()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Location helper
# ---------------------------------------------------------------------------

def build_location_context(location: dict) -> str:
    """Turn the location dict sent by the frontend into a prompt snippet."""
    parts = []
    if location.get("displayName"):
        parts.append(f"Location: {location['displayName']}")
    if location.get("city"):
        parts.append(f"City: {location['city']}")
    if location.get("state"):
        parts.append(f"State/Province: {location['state']}")
    if location.get("country"):
        parts.append(f"Country: {location['country']}")
    if location.get("countryCode"):
        parts.append(f"Country code: {location['countryCode']}")
    if location.get("lat") and location.get("lng"):
        parts.append(f"Coordinates: {float(location['lat']):.5f}, {float(location['lng']):.5f}")

    if not parts:
        return ""

    return (
        " The user's current location is: "
        + "; ".join(parts)
        + ". When the user asks about nearby hospitals or emergency services, "
        "use this location to give specific local answers. "
        "When providing emergency helpline numbers always use country-specific numbers: "
        "India → Ambulance 108, National Emergency 112; "
        "USA → 911; UK → 999; Australia → 000; EU → 112. "
        "If the user appears to be in a medical emergency, show the local ambulance number prominently."
    )


# ---------------------------------------------------------------------------
# LangChain MCP Agent
# ---------------------------------------------------------------------------

async def _call_tool(tool, tc: dict) -> ToolMessage:
    """Invoke a single tool call and return a ToolMessage."""
    name    = tc["name"]
    args    = tc["args"]
    call_id = tc["id"]
    try:
        result = await tool.ainvoke(args)
        return ToolMessage(content=str(result), tool_call_id=call_id, name=name)
    except Exception as exc:
        logger.warning("Tool '%s' raised an error: %s", name, exc)
        return ToolMessage(
            content=f"Tool '{name}' raised an error: {exc}",
            tool_call_id=call_id,
            name=name,
        )


class AgentManager:
    """
    Manages a single shared async event loop running in a background thread.
    Flask (sync) calls `ask()` which bridges into the async agent via
    `asyncio.run_coroutine_threadsafe`.
    """

    def __init__(self):
        self._loop            : asyncio.AbstractEventLoop | None = None
        self._client          : MultiServerMCPClient | None      = None
        self._tools           : list                             = []
        self._named           : dict                             = {}
        self._llm_with_tools                                     = None
        self._ready           : threading.Event                  = threading.Event()
        self._lock            : threading.Lock                   = threading.Lock()

        t = threading.Thread(target=self._start_loop, daemon=True)
        t.start()
        self._ready.wait(timeout=30)

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------

    def tool_names(self) -> list[str]:
        """Return the names of all loaded MCP tools (safe public accessor)."""
        return list(self._named.keys())

    # ------------------------------------------------------------------
    # Internal – async event loop management
    # ------------------------------------------------------------------

    def _start_loop(self):
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        self._loop.run_until_complete(self._async_init())
        self._loop.run_forever()

    async def _async_init(self):
        """Initialise the MCP client and bind tools to the LLM."""
        llm = ChatGroq(model=GROQ_MODEL, api_key=GROQ_API_KEY)

        if GROQ_API_KEY:
            try:
                self._client = MultiServerMCPClient(MCP_SERVER)
                self._tools  = await self._client.get_tools()
                self._named  = {tool.name: tool for tool in self._tools}
                self._llm_with_tools = llm.bind_tools(self._tools)
                logger.info("MCP tools loaded: %s", list(self._named.keys()))
            except Exception as exc:
                logger.warning("MCP init failed (%s); falling back to plain LLM.", exc)
                self._llm_with_tools = llm
        else:
            logger.warning("No GROQ API key — responses will use the rule-based fallback.")
            self._llm_with_tools = None

        self._ready.set()

    # ------------------------------------------------------------------
    # Internal – agent execution (async)
    # ------------------------------------------------------------------

    async def _run_agent(
        self,
        user_message: str,
        history: list[dict],
        location: dict | None = None,
    ) -> str:
        """Execute the agentic loop and return the final text response."""
        if self._llm_with_tools is None:
            return _fallback_response(user_message)

        loc_ctx = build_location_context(location) if location else ""
        system_content = SYSTEM_PROMPT + loc_ctx

        messages: list[BaseMessage] = [SystemMessage(content=system_content)]
        for msg in history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))
        messages.append(HumanMessage(content=user_message))

        max_iterations = 10
        response: AIMessage | None = None

        for iteration in range(max_iterations):
            response = await self._llm_with_tools.ainvoke(messages)
            messages.append(response)

            if not getattr(response, "tool_calls", None):
                return response.content or ""

            logger.debug("Iteration %d: executing %d tool call(s)", iteration, len(response.tool_calls))

            tool_messages = await asyncio.gather(
                *(
                    _call_tool(self._named.get(tc["name"]), tc)
                    if tc["name"] in self._named
                    else asyncio.coroutine(lambda tc=tc: ToolMessage(
                        content=f"Tool '{tc['name']}' not found.",
                        tool_call_id=tc["id"],
                        name=tc["name"],
                    ))()
                    for tc in response.tool_calls
                )
            )
            messages.extend(tool_messages)

        logger.warning("Agent exhausted max iterations (%d) without a final answer.", max_iterations)
        return (
            response.content
            if response and response.content
            else "Agent could not produce a final answer."
        )

    # ------------------------------------------------------------------
    # Public – synchronous bridge
    # ------------------------------------------------------------------

    def ask(
        self,
        user_message: str,
        history: list[dict],
        location: dict | None = None,
    ) -> str:
        """Thread-safe synchronous entry point called by Flask routes."""
        if self._loop is None or not self._ready.is_set():
            return _fallback_response(user_message)

        future = asyncio.run_coroutine_threadsafe(
            self._run_agent(user_message, history, location),
            self._loop,
        )
        try:
            return future.result(timeout=120)
        except Exception as exc:
            logger.exception("Agent error for message: %s", user_message[:80])
            return (
                "I encountered an error processing your request. "
                f"Please try again. (Error: {exc})"
            )


# ---------------------------------------------------------------------------
# Rule-based Fallback (no API key)
# ---------------------------------------------------------------------------

def _fallback_response(user_message: str) -> str:
    msg  = user_message.lower()
    note = "\n\nNote: This is general information and not a substitute for professional medical advice."

    if any(w in msg for w in ["headache", "head pain", "migraine"]):
        return (
            "Headaches can be caused by stress, dehydration, lack of sleep, or eye strain. "
            "For occasional tension headaches, rest, hydration, and OTC pain relievers may help. "
            "Seek medical attention if headaches are severe, sudden, or persistent." + note
        )
    if any(w in msg for w in ["fever", "temperature", "hot"]):
        return (
            "A fever is typically a body temperature above 100.4°F (38°C). "
            "Stay hydrated, rest, and consider OTC fever reducers. "
            "Seek care if fever exceeds 103°F (39.4°C) or lasts more than 3 days." + note
        )
    if any(w in msg for w in ["cough", "cold", "flu", "sore throat"]):
        return (
            "For common cold and flu symptoms, rest and hydration are key. "
            "OTC medications can help manage congestion, cough, and sore throat. "
            "If symptoms worsen or persist beyond 10 days, consult a healthcare provider." + note
        )
    if any(w in msg for w in ["stress", "anxiety", "mental health", "depressed"]):
        return (
            "For managing stress and anxiety, consider regular exercise, deep breathing, "
            "meditation, and a consistent sleep schedule. "
            "For persistent issues, please reach out to a mental health professional." + note
        )
    if any(w in msg for w in ["heart", "chest pain", "cardiac"]):
        return (
            "Chest pain can signal a serious condition. If you experience sudden severe chest pain, "
            "pain radiating to your arm or jaw, shortness of breath, or dizziness, "
            "call emergency services immediately." + note
        )
    if any(w in msg for w in ["ibuprofen", "medicine", "medication", "drug", "side effect"]):
        return (
            "Common ibuprofen side effects include stomach upset, heartburn, and mild nausea. "
            "Take with food to reduce irritation. Avoid if you have kidney disease, bleeding "
            "disorders, or are pregnant. Always follow dosage instructions." + note
        )
    return (
        "Thank you for your question. I can provide general health information on symptoms, "
        "medications, wellness, and when to see a doctor. "
        "Could you provide more details so I can give a more specific response?" + note
    )


# ---------------------------------------------------------------------------
# Application Bootstrap
# ---------------------------------------------------------------------------

init_db()
agent = AgentManager()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/", methods=["GET"])
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/favicon.ico", methods=["GET"])
def favicon():
    try:
        return send_from_directory(app.static_folder, "favicon.ico")
    except Exception:
        return "", 204


@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Not found"}), 404
    return send_from_directory(app.static_folder, "index.html")


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify(
        {
            "status":    "ok",
            "model":     GROQ_MODEL if GROQ_API_KEY else "fallback",
            "provider":  "groq+langchain" if GROQ_API_KEY else "rule-based",
            "mcp_tools": agent.tool_names(),  # use public method
        }
    )


@app.route("/api/chat", methods=["POST"])
def chat():
    """Send a message and receive an AI response.

    Request body:
        {
            "message":    "...",
            "session_id": "optional-uuid",
            "location": { ... }   <- optional
        }

    Response:
        { "response": "...", "session_id": "uuid" }
    """
    data = request.get_json()
    if not data or "message" not in data:
        return jsonify({"error": "Missing 'message' field"}), 400

    user_message = data["message"].strip()
    if not user_message:
        return jsonify({"error": "Message cannot be empty"}), 400

    if len(user_message) > MAX_MESSAGE_LEN:
        return jsonify({"error": f"Message exceeds maximum length of {MAX_MESSAGE_LEN} characters"}), 400

    session_id = data.get("session_id")
    location   = data.get("location") if isinstance(data.get("location"), dict) else None

    if not session_id:
        session_id = str(uuid.uuid4())

    # Cache the session lookup to avoid a double DB call
    session = db_get_session(session_id)
    if not session:
        title = user_message[:40] + ("..." if len(user_message) > 40 else "")
        db_create_session(session_id, title)

    history = db_get_messages(session_id)
    db_add_message(session_id, "user", user_message)

    assistant_content = agent.ask(user_message, history, location)

    db_add_message(session_id, "assistant", assistant_content)
    db_touch_session(session_id)

    return jsonify({"response": assistant_content, "session_id": session_id})


@app.route("/api/chat/<session_id>", methods=["GET"])
def get_chat_history(session_id: str):
    session = db_get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404

    return jsonify({"session": session, "messages": db_get_messages(session_id)})


@app.route("/api/sessions", methods=["GET"])
def list_sessions():
    return jsonify({"sessions": db_list_sessions()})


@app.route("/api/sessions/<session_id>", methods=["DELETE"])
def delete_session(session_id: str):
    if not db_get_session(session_id):
        return jsonify({"error": "Session not found"}), 404
    db_delete_session(session_id)
    return jsonify({"status": "deleted"})


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 60)
    print("  MedAssist AI - Flask Backend")
    print("=" * 60)
    print(f"  LLM Provider : {'Groq + LangChain MCP' if GROQ_API_KEY else 'rule-based fallback'}")
    print(f"  LLM Model    : {GROQ_MODEL if GROQ_API_KEY else 'N/A'}")
    print(f"  API Key      : {'***configured***' if GROQ_API_KEY else 'NOT SET'}")
    print(f"  Database     : {DB_PATH}")
    print(f"  Max Msg Len  : {MAX_MESSAGE_LEN}")
    print()
    print("  Endpoints:")
    print("    POST   /api/chat           - Send a message")
    print("    GET    /api/chat/<id>       - Get session history")
    print("    GET    /api/sessions        - List all sessions")
    print("    DELETE /api/sessions/<id>   - Delete a session")
    print("    GET    /api/health          - Health check")
    print("=" * 60)

    app.run(host="0.0.0.0", port=5000, debug=False)