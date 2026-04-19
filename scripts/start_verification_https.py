#!/usr/bin/env python3
"""Serve the verification interface over HTTPS for local development."""

from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os
import ssl


def main() -> None:
    root = Path(__file__).resolve().parent.parent / 'verification-interface'
    cert_path = root / 'cert.pem'
    key_path = root / 'key.pem'
    if not cert_path.exists() or not key_path.exists():
        raise SystemExit('verification-interface/cert.pem and key.pem are required')

    os.chdir(root)
    server = HTTPServer(('0.0.0.0', 8300), SimpleHTTPRequestHandler)
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certfile=str(cert_path), keyfile=str(key_path))
    server.socket = context.wrap_socket(server.socket, server_side=True)
    server.serve_forever()


if __name__ == '__main__':
    main()
