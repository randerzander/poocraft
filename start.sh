#!/usr/bin/env bash
set -euo pipefail

export SQLITE_PATH="${SQLITE_PATH:-$PWD/poocraft.sqlite3}"
export R2_PATH="${R2_PATH:-poocraft/poocraft.sqlite3}"

required_vars=(R2_ACCOUNT_ID R2_BUCKET R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY)
litestream_ready=true

for var in "${required_vars[@]}"; do
  if [ -z "${!var:-}" ]; then
    litestream_ready=false
  fi
done

if [ "$litestream_ready" = true ] && [ -x "./bin/litestream" ]; then
  ./bin/litestream restore \
    -if-db-not-exists \
    -if-replica-exists \
    -config litestream.yml \
    "$SQLITE_PATH"

  exec ./bin/litestream replicate \
    -config litestream.yml \
    -exec "python app.py"
fi

echo "Litestream is disabled because R2 configuration is incomplete."
exec python app.py
