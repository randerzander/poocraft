import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class StaticHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "application/javascript",
        ".css": "text/css",
        ".html": "text/html",
    }


def main():
    port = int(os.environ.get("PORT", "10000"))
    server = ThreadingHTTPServer(("0.0.0.0", port), StaticHandler)
    print(f"Serving on port {port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
