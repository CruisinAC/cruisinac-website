"""Local test server for the website: python dev_server.py [port], then open http://localhost:5500

Same as `python -m http.server`, plus HTTP range requests ("Range: bytes=..."). Browsers need
those to jump to a point inside an audio file; without them the music cannot start partway in
(MUSIC_START_SECONDS in script.js) and always plays from 0. Cloudflare Pages supports range
requests, so this only matters for local testing.
"""

import os
import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

RANGE = re.compile(r"bytes=(\d*)-(\d*)$")


class RangeRequestHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        match = RANGE.match(self.headers.get("Range", "").strip())
        path = self.translate_path(self.path)
        if not match or not os.path.isfile(path):
            return super().send_head()

        size = os.path.getsize(path)
        first, last = match.groups()
        if first:
            start = int(first)
            end = min(int(last), size - 1) if last else size - 1
        elif last:  # "bytes=-500": the last 500 bytes
            start, end = max(size - int(last), 0), size - 1
        else:
            return super().send_head()
        if start >= size or start > end:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.end_headers()
            return None

        f = open(path, "rb")
        f.seek(start)
        self._range_left = end - start + 1
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(self._range_left))
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()
        return f

    def copyfile(self, source, outputfile):
        left = getattr(self, "_range_left", None)
        if left is None:
            return super().copyfile(source, outputfile)
        while left > 0:
            chunk = source.read(min(64 * 1024, left))
            if not chunk:
                break
            outputfile.write(chunk)
            left -= len(chunk)
        self._range_left = None

    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        # Local testing: never let the browser reuse an old copy of a file, so every reload
        # shows the latest edit (without this, Firefox kept serving a stale index.html).
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5500
    print(f"Serving {os.getcwd()} at http://localhost:{port} (with range requests)")
    ThreadingHTTPServer(("", port), RangeRequestHandler).serve_forever()
