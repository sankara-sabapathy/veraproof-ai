#!/usr/bin/env python3
import argparse
import http.server
from pathlib import Path


class SpaHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, directory: str, **kwargs):
        self._root = Path(directory).resolve()
        super().__init__(*args, directory=directory, **kwargs)

    def do_GET(self):
        request_path = self.path.split('?', 1)[0].split('#', 1)[0]
        candidate = (self._root / request_path.lstrip('/')).resolve()
        if request_path not in {'', '/'} and (candidate == self._root or self._root in candidate.parents) and candidate.exists() and candidate.is_file():
            return super().do_GET()
        self.path = '/index.html'
        return super().do_GET()


def main():
    parser = argparse.ArgumentParser(description='Serve the built partner dashboard with SPA fallback.')
    parser.add_argument('--root', default='partner-dashboard/dist/partner-dashboard/browser')
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8200)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not root.exists():
        raise SystemExit(f'Dashboard build output not found: {root}')

    handler = lambda *handler_args, **handler_kwargs: SpaHandler(*handler_args, directory=str(root), **handler_kwargs)
    server = http.server.ThreadingHTTPServer((args.host, args.port), handler)
    print(f'Serving dashboard dist from {root} on http://{args.host}:{args.port}', flush=True)
    server.serve_forever()


if __name__ == '__main__':
    main()
