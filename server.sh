#!/bin/bash
cd "$(dirname "$0")" || exit 1
# serve.py = 带 Range / 缓存 / gzip 的静态服务器, 手机上更稳
exec python3 serve.py 8888
