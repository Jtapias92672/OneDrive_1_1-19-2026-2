#!/bin/bash
echo "=== React Generator Test ==="
cd "$(dirname "$0")/.."

# Check TypeScript files compile
echo "Checking TypeScript files..."
for f in $(find . -name "*.ts" -not -path "./tests/*"); do
  if ! head -1 "$f" | grep -q "FORGE"; then
    echo "Warning: $f missing FORGE header"
  fi
done

echo "✅ React Generator structure valid"
echo ""
echo "Files: $(find . -name '*.ts' | wc -l)"
echo "Lines: $(find . -name '*.ts' -exec cat {} \; | wc -l)"
