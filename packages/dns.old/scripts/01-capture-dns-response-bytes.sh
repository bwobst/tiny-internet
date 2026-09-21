#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Capture raw DNS response bytes to a .bin fixture file.

Usage:
  01-capture-dns-response-bytes.sh -o OUTPUT.bin [-s SERVER] [--rd | --no-rd] [--query-hex HEX]

Options:
  -o, --output PATH   Output .bin file path (required)
  -s, --server IP     Nameserver to query (default: 8.8.8.8)
  --rd                Set RD=1 in query (default)
  --no-rd             Set RD=0 in query (iterative walk; matches query({ rd: 0 }))
  --query-hex HEX     Full query packet as hex (overrides --rd/--no-rd)
  -h, --help          Show this help

Examples:
  # Recursive resolver answer
  01-capture-dns-response-bytes.sh \
    -o src/fixtures/google-com-a/recursive/01-answer.bin

  # Iterative hop 1 - root referral
  01-capture-dns-response-bytes.sh \
    -s 170.247.170.2 \
    --no-rd \
    -o src/fixtures/google-com-a/iterative/01-root-referral.bin
EOF
}

SERVER="8.8.8.8"
OUTPUT=""
QUERY_HEX=""
RD=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    -o|--output) OUTPUT="$2"; shift 2 ;;
    -s|--server) SERVER="$2"; shift 2 ;;
    --rd) RD=1; shift ;;
    --no-rd) RD=0; shift ;;
    --query-hex) QUERY_HEX="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

if [[ -z "$OUTPUT" ]]; then
  echo "Error: -o/--output is required" >&2
  usage >&2
  exit 1
fi

if [[ -z "$QUERY_HEX" ]]; then
  if [[ $RD -eq 1 ]]; then
    # google.com A, ID=0xAAAA, RD=1 - matches wire({ rd: 1 }) in query.ts
    QUERY_HEX="aaaa0100000100000000000006676f6f676c6503636f6d0000010001"
  else
    # google.com A, ID=0xAAAA, RD=0 - matches wire({ rd: 0 }) in query.ts
    QUERY_HEX="aaaa0000000100000000000006676f6f676c6503636f6d0000010001"
  fi
fi

mkdir -p "$(dirname "$OUTPUT")"

python3 -c "
import socket

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.settimeout(5)

query = bytes.fromhex('${QUERY_HEX}')
sock.sendto(query, ('${SERVER}', 53))
resp, _ = sock.recvfrom(512)

with open('${OUTPUT}', 'wb') as f:
    f.write(resp)

print(f'Captured {len(resp)} bytes → ${OUTPUT}')
print('Hex:', resp.hex())
"

if [[ $RD -eq 1 ]]; then
  echo "Equivalent: dig @${SERVER} google.com A"
else
  echo "Equivalent: dig @${SERVER} google.com A +norecurse"
fi
