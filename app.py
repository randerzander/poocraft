import os
import json
import sqlite3
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

DB_PATH = os.environ.get("SQLITE_PATH", "poocraft.sqlite3")


def init_db():
    with sqlite3.connect(DB_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS block_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                username TEXT NOT NULL,
                action TEXT NOT NULL CHECK (action IN ('mine', 'place')),
                block TEXT NOT NULL,
                x INTEGER NOT NULL,
                y INTEGER NOT NULL
            )
            """
        )


def save_block_event(event):
    timestamp = datetime.now(timezone.utc).isoformat()
    username = clean_text(event.get("username"), 32)
    action = event.get("action")
    block = clean_text(event.get("block"), 24)
    x = event.get("x")
    y = event.get("y")

    if action not in {"mine", "place"}:
        raise ValueError("action must be mine or place")
    if not username:
        raise ValueError("username is required")
    if not block:
        raise ValueError("block is required")
    if not isinstance(x, int) or not isinstance(y, int):
        raise ValueError("x and y must be integers")

    with sqlite3.connect(DB_PATH) as connection:
        cursor = connection.execute(
            """
            INSERT INTO block_events (timestamp, username, action, block, x, y)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (timestamp, username, action, block, x, y),
        )
    return {"id": cursor.lastrowid, "timestamp": timestamp}


def clean_text(value, max_length):
    if not isinstance(value, str):
        return ""
    return value.strip()[:max_length]


class StaticHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "application/javascript",
        ".css": "text/css",
        ".html": "text/html",
    }

    def do_POST(self):
        if self.path != "/api/block-events":
            self.send_error(404)
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length > 4096:
                raise ValueError("request body is too large")
            body = self.rfile.read(content_length)
            event = json.loads(body.decode("utf-8"))
            result = save_block_event(event)
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError) as error:
            self.send_json({"error": str(error)}, status=400)
            return

        self.send_json({"ok": True, **result}, status=201)

    def send_json(self, payload, status=200):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def main():
    init_db()
    port = int(os.environ.get("PORT", "10000"))
    server = ThreadingHTTPServer(("0.0.0.0", port), StaticHandler)
    print(f"Serving on port {port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
