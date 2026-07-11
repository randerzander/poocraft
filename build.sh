#!/usr/bin/env bash
set -euo pipefail

pip install -r requirements.txt

mkdir -p bin
curl -L \
  -o /tmp/litestream.deb \
  https://github.com/benbjohnson/litestream/releases/download/v0.5.8/litestream-0.5.8-linux-x86_64.deb
dpkg-deb -x /tmp/litestream.deb /tmp/litestream
cp /tmp/litestream/usr/bin/litestream bin/litestream
chmod +x bin/litestream
