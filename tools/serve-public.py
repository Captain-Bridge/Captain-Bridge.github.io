from __future__ import annotations

import argparse
import socket
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DIR = REPO_ROOT / "public"


def port_is_busy(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.3)
        return sock.connect_ex((host, port)) == 0


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Serve the built Hexo site from the repository public directory."
    )
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to.")
    parser.add_argument("--port", type=int, default=4000, help="Port to listen on.")
    args = parser.parse_args()

    if not PUBLIC_DIR.is_dir():
        raise SystemExit(
            f"Build output was not found: {PUBLIC_DIR}\n"
            "Run `npm.cmd run build` before starting the static preview server."
        )

    if port_is_busy(args.host, args.port):
        raise SystemExit(
            f"Port {args.port} on {args.host} is already in use.\n"
            "Stop the old preview process first, then try again."
        )

    handler = partial(SimpleHTTPRequestHandler, directory=str(PUBLIC_DIR))
    server = ThreadingHTTPServer((args.host, args.port), handler)

    print(f"Serving {PUBLIC_DIR}")
    print(f"Open http://localhost:{args.port}/")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
