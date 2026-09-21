#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Write a fixture's exported `wire` buffer to a .bin file.

Usage:
  02-wire-to-bin.sh FIXTURE.ts OUTPUT.bin

Example:
  02-wire-to-bin.sh src/fixtures/google-com-a/iterative/02-com-referral.ts \
    src/fixtures/google-com-a/iterative/02-com-referral.bin
EOF
}

if [[ $# -ne 2 ]]; then
  usage >&2
  exit 1
fi

FIXTURE="$1"
OUTPUT="$2"

npx tsx -e "
import { writeFileSync } from 'fs';
import { wire } from './${FIXTURE}';
writeFileSync('${OUTPUT}', wire);
console.log('Wrote', wire.length, 'bytes → ${OUTPUT}');
"
