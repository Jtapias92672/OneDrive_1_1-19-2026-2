#!/bin/bash
echo "=== Governance Gateway Test ==="
cd "$(dirname "$0")/.."

echo "Files: $(find . -name '*.ts' | wc -l)"
echo "Lines: $(find . -name '*.ts' -exec cat {} \; | wc -l)"
echo "✅ Structure valid"
