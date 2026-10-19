# Static server for goopy-web plus POST /save?name=X (body = PNG data URL or text) -> writes into OUT
import http.server, sys, os, base64, urllib.parse, functools

ROOT, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)


class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_POST(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        name = os.path.basename(q.get("name", ["shot"])[0])
        body = self.rfile.read(int(self.headers["Content-Length"])).decode()
        if body.startswith("data:image/png;base64,"):
            open(os.path.join(OUT, name + ".png"), "wb").write(base64.b64decode(body.split(",", 1)[1]))
        else:
            open(os.path.join(OUT, name + ".txt"), "w").write(body)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")


http.server.ThreadingHTTPServer(("127.0.0.1", 8765), functools.partial(H, directory=ROOT)).serve_forever()
