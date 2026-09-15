#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Capture raw HTTP request bytes to a .bin fixture file, using curl as an
independent client oracle.

Usage:
  01-capture-http-request-bytes.sh -o OUTPUT.bin [-H HOST] [-p PATH] [--port PORT]

Options:
  -o, --output PATH   Output .bin file path (required)
  -H, --host HOST     Value for the Host header (default: pi.world)
  -p, --path PATH     Request path (default: /)
  --port PORT         Local port to listen on while capturing (default: 8391)
  -h, --help          Show this help

Example:
  01-capture-http-request-bytes.sh -o src/fixtures/get-root/01-request.bin
EOF
}

OUTPUT=""
HOST="pi.world"
REQ_PATH="/"
PORT="8391"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -o|--output) OUTPUT="$2"; shift 2 ;;
    -H|--host) HOST="$2"; shift 2 ;;
    -p|--path) REQ_PATH="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

if [[ -z "$OUTPUT" ]]; then
  echo "Error: -o/--output is required" >&2
  usage >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT")"

(nc -l 127.0.0.1 "$PORT" > "$OUTPUT" &)
sleep 0.4
curl --http1.1 -s -o /dev/null -A "curl/8.0" -H "Host: ${HOST}" \
  "http://127.0.0.1:${PORT}${REQ_PATH}" --max-time 2 || true
sleep 0.4

echo "Captured $(wc -c < "$OUTPUT" | tr -d ' ') bytes -> ${OUTPUT}"
echo "Equivalent: curl --http1.1 -H \"Host: ${HOST}\" http://<server>${REQ_PATH}"
