"""Serve the repo root on 127.0.0.1:8765 with a deep accept queue (several headless Chromes boot the game at once)."""
import os, http.server, functools

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 256
    daemon_threads = True


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


Server(('127.0.0.1', 8765), functools.partial(Quiet, directory=ROOT)).serve_forever()
