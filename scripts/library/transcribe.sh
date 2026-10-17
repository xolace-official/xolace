#!/usr/bin/env bash
# Transcribe library audio with ElevenLabs Scribe v2, writing <audio>.txt beside each file.
# Usage: ELEVENLABS_API_KEY=... bash scripts/library/transcribe.sh <audio>...
set -euo pipefail
: "${ELEVENLABS_API_KEY:?set ELEVENLABS_API_KEY first}"
for f in "$@"; do
  out="${f%.*}.txt"
  echo "transcribing $f"
  curl -sS --fail-with-body -X POST "https://api.elevenlabs.io/v1/speech-to-text" \
    -H "xi-api-key: $ELEVENLABS_API_KEY" \
    -F "file=@$f" -F "model_id=scribe_v2" -F "language_code=eng" -F "tag_audio_events=false" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin)["text"].strip())' > "$out"
  echo "  -> $out ($(wc -w < "$out") words)"
done
