#!/bin/bash
# FORGE Schema Validation Script
# Epic 7.5: Validates all V&V schemas

set -e

FORGE_ROOT=".forge"
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "=== FORGE Schema Validation ==="
echo ""

# Check if ajv-cli is available
if ! command -v npx &> /dev/null; then
    echo -e "${RED}Error: npx not found. Install Node.js.${NC}"
    exit 1
fi

# Function to validate YAML against JSON Schema
validate_yaml() {
    local schema="$1"
    local data="$2"
    local name="$3"

    echo -n "Validating $name... "

    if [ ! -f "$schema" ]; then
        echo -e "${RED}FAIL${NC} (schema not found: $schema)"
        return 1
    fi

    if [ ! -f "$data" ]; then
        echo -e "${RED}FAIL${NC} (data not found: $data)"
        return 1
    fi

    # Use ajv-cli to validate
    if npx ajv validate -s "$schema" -d "$data" --spec=draft2020 2>/dev/null; then
        echo -e "${GREEN}PASS${NC}"
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        npx ajv validate -s "$schema" -d "$data" --spec=draft2020 2>&1 | head -20
        return 1
    fi
}

ERRORS=0

# 1. Validate CheckerSpec
echo "1. CheckerSpec"
if ! validate_yaml \
    "$FORGE_ROOT/checker/checker_spec.schema.json" \
    "$FORGE_ROOT/checker/checker_spec.template.yaml" \
    "checker_spec.template.yaml"; then
    ERRORS=$((ERRORS + 1))
fi

# 2. Validate Suite Registry
echo ""
echo "2. Suite Registry"
if ! validate_yaml \
    "$FORGE_ROOT/suites/suite_registry.schema.json" \
    "$FORGE_ROOT/suites/suite_registry.yaml" \
    "suite_registry.yaml"; then
    ERRORS=$((ERRORS + 1))
fi

# 3. Validate Gate Rules
echo ""
echo "3. Gate Rules"
if ! validate_yaml \
    "$FORGE_ROOT/governance/gate_rules.schema.json" \
    "$FORGE_ROOT/governance/gate_rules.yaml" \
    "gate_rules.yaml"; then
    ERRORS=$((ERRORS + 1))
fi

# 4. Validate any work item CheckerSpecs
echo ""
echo "4. Work Item CheckerSpecs"
WORK_ITEMS=$(find "$FORGE_ROOT/work_items" -name "checker_spec.yaml" 2>/dev/null || true)
if [ -n "$WORK_ITEMS" ]; then
    for spec in $WORK_ITEMS; do
        workItemId=$(basename $(dirname "$spec"))
        if ! validate_yaml \
            "$FORGE_ROOT/checker/checker_spec.schema.json" \
            "$spec" \
            "work_items/$workItemId/checker_spec.yaml"; then
            ERRORS=$((ERRORS + 1))
        fi
    done
else
    echo "   (no work items found)"
fi

# Summary
echo ""
echo "=== Summary ==="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}All schemas valid!${NC}"
    exit 0
else
    echo -e "${RED}$ERRORS schema(s) failed validation${NC}"
    exit 1
fi
