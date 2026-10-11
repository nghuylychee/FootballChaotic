#!/bin/bash
# pc batch: capture a list of "scene secs" pairs one after another (frames/<scene>_s7)
cd "$(dirname "$0")"
while [ $# -gt 1 ]; do
  python ../../tools/clip-pack/capture.py .. "$1" "$2" 7 2>&1 | head -2
  shift 2
done
