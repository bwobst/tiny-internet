#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Wrap raw DNS response bytes in a UDP/IP/Ethernet frame for Wireshark.

Usage:
  03-bin-to-pcap.sh -i INPUT.bin -o OUTPUT.pcap [options]

Options:
  -i, --input PATH    Input .bin file (required)
  -o, --output PATH   Output .pcap file (required)
  -4 SRC,DST          IPv4 addresses for dummy header (default: 10.1.1.1,10.2.2.2)
  -u SRC,DST          UDP ports (default: 5353,53)
  -h, --help          Show this help

Example:
  03-bin-to-pcap.sh \
    -i src/fixtures/google-com-a/iterative/01-root-referral.bin \
    -o src/fixtures/google-com-a/iterative/01-root-referral.pcap \
    -4 10.0.0.1,170.247.170.2
EOF
}

INPUT=""
OUTPUT=""
IP4="10.1.1.1,10.2.2.2"
UDP_PORTS="5353,53"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -i|--input) INPUT="$2"; shift 2 ;;
    -o|--output) OUTPUT="$2"; shift 2 ;;
    -4) IP4="$2"; shift 2 ;;
    -u) UDP_PORTS="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

if [[ -z "$INPUT" || -z "$OUTPUT" ]]; then
  echo "Error: -i/--input and -o/--output are required" >&2
  usage >&2
  exit 1
fi

if ! command -v text2pcap >/dev/null 2>&1; then
  echo "Error: text2pcap not found (install Wireshark)" >&2
  exit 1
fi

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

# text2pcap hexdump line: offset + space-separated hex octets
{
  printf '000000 '
  xxd -p -c 256 "$INPUT" | fold -w2 | tr '\n' ' '
  printf '\n'
} > "$TMP"

mkdir -p "$(dirname "$OUTPUT")"
text2pcap -q -u "$UDP_PORTS" -4 "$IP4" "$TMP" "$OUTPUT"

BYTES="$(wc -c < "$INPUT" | tr -d ' ')"
echo "Wrote ${BYTES}-byte DNS payload → ${OUTPUT}"
