#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
宝宝启蒙学习 —— 手机友好的本地静态服务器

相比 python3 -m http.server 多了三件对手机很关键的事：
1. HTTP Range 支持  —— iOS Safari 播放 / 拖动 mp3 必须要 206 响应，否则音频经常不出声
2. 合理的缓存头      —— 图片、音频、字体缓存 30 天，手机上再次打开不用重下 300MB
3. gzip + keep-alive —— 首页 html 从 250KB 压到 ~50KB，长连接省掉反复握手

用法:
    python3 serve.py            # 默认 8888 端口
    python3 serve.py 8899       # 指定端口
"""
import gzip
import io
import mimetypes
import os
import socket
import sys
from email.utils import parsedate_to_datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

mimetypes.add_type('image/webp', '.webp')
mimetypes.add_type('application/manifest+json', '.webmanifest')
mimetypes.add_type('audio/mpeg', '.mp3')

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8888

LONG_CACHE = ('.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico',
              '.mp3', '.wav', '.m4a', '.woff', '.woff2', '.ttf')
COMPRESSIBLE = ('text/', 'application/json', 'application/javascript',
                'application/manifest+json', 'image/svg+xml')


class _LimitedFile:
    """Wraps a file so only the requested byte range is sent."""

    def __init__(self, fp, remaining):
        self.fp = fp
        self.remaining = remaining

    def read(self, n=-1):
        if self.remaining <= 0:
            return b''
        if n is None or n < 0:
            n = self.remaining
        data = self.fp.read(min(n, self.remaining))
        self.remaining -= len(data)
        return data

    def close(self):
        self.fp.close()


class Handler(SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'      # keep-alive: fewer round trips per page
    server_version = 'EduApp/1.0'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        path = self.path.split('?')[0].lower()
        if path.endswith(LONG_CACHE):
            self.send_header('Cache-Control', 'public, max-age=2592000')
        else:
            self.send_header('Cache-Control', 'no-cache')
        self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write('%s - %s\n' % (self.address_string(), fmt % args))

    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            index = os.path.join(path, 'index.html')
            if self.path.split('?')[0].endswith('/') and os.path.isfile(index):
                path = index          # 走下面的文件分支, 才能拿到 gzip / 304
            else:
                return super().send_head()
        try:
            f = open(path, 'rb')
        except OSError:
            self.send_error(404, 'File not found')
            return None

        fs = os.fstat(f.fileno())
        size = fs.st_size
        ctype = self.guess_type(path)
        mtime = self.date_time_string(fs.st_mtime)
        ranged = (self.headers.get('Range') or '').startswith('bytes=')

        # ---- conditional GET: 304 keeps the 250KB index.html off the wire ----
        if not ranged:
            ims = self.headers.get('If-Modified-Since')
            if ims:
                try:
                    if int(os.path.getmtime(path)) <= int(parsedate_to_datetime(ims).timestamp()):
                        self.send_response(304)
                        self.send_header('Cache-Control', 'no-cache')
                        self.end_headers()
                        f.close()
                        return None
                except Exception:
                    pass

        # ---- byte ranges (Safari needs these for mp3 playback & seeking) ----
        if ranged:
            try:
                spec = self.headers['Range'].split('=', 1)[1].split(',')[0].strip()
                first, last = spec.split('-', 1)
                if first == '':
                    length = int(last)
                    start, end = max(0, size - length), size - 1
                else:
                    start = int(first)
                    end = int(last) if last else size - 1
                end = min(end, size - 1)
                if start < 0 or start > end or start >= size:
                    raise ValueError
            except Exception:
                self.send_response(416)
                self.send_header('Content-Range', 'bytes */%d' % size)
                self.send_header('Content-Length', '0')
                self.end_headers()
                f.close()
                return None
            self.send_response(206)
            self.send_header('Content-Type', ctype)
            self.send_header('Content-Range', 'bytes %d-%d/%d' % (start, end, size))
            self.send_header('Content-Length', str(end - start + 1))
            self.send_header('Last-Modified', mtime)
            self.end_headers()
            f.seek(start)
            return _LimitedFile(f, end - start + 1)

        # ---- gzip for text assets ----
        accept = self.headers.get('Accept-Encoding') or ''
        if size > 800 and 'gzip' in accept and ctype.startswith(COMPRESSIBLE):
            raw = f.read()
            f.close()
            body = gzip.compress(raw, 6)
            self.send_response(200)
            self.send_header('Content-Type', ctype)
            self.send_header('Content-Encoding', 'gzip')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Last-Modified', mtime)
            self.end_headers()
            return io.BytesIO(body)

        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(size))
        self.send_header('Last-Modified', mtime)
        self.end_headers()
        return f


def lan_ips():
    ips = []
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith('127.') and ip not in ips:
                ips.append(ip)
    except Exception:
        pass
    if not ips:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(('8.8.8.8', 80))
            ips.append(s.getsockname()[0])
            s.close()
        except Exception:
            pass
    return ips


def main():
    ThreadingHTTPServer.allow_reuse_address = True
    httpd = ThreadingHTTPServer(('0.0.0.0', PORT), Handler)
    print('📚 宝宝启蒙学习 已启动', flush=True)
    print('   本机访问: http://localhost:%d' % PORT, flush=True)
    for ip in lan_ips():
        print('   手机访问: http://%s:%d' % (ip, PORT), flush=True)
    print('   目录: %s' % ROOT, flush=True)
    print('   按 Ctrl+C 停止', flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n已停止')
    finally:
        httpd.server_close()


if __name__ == '__main__':
    main()
