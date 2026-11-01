#!/bin/sh
if [ -f "$(dirname "$0")/backend/mvnw" ]; then
  cd "$(dirname "$0")/backend" && ./mvnw "$@"
else
  echo "Error: backend/mvnw not found" >&2
  exit 1
fi
