#!/bin/bash
#
# FORGE Wolfram API Quick Test
# Owner: joe@arcfoundry.ai
# Created: 2026-01-19
#
# Run: ./tests/quick-test.sh
#

WOLFRAM_APP_ID="2K3K8Q5XGA"
BASE_URL="https://www.wolframalpha.com/api/v1/llm-api"

echo "═══════════════════════════════════════════════════════════════"
echo "  FORGE Wolfram Alpha API Quick Test"
echo "═══════════════════════════════════════════════════════════════"
echo "  App ID: $WOLFRAM_APP_ID"
echo "  Time: $(date -Iseconds)"
echo "───────────────────────────────────────────────────────────────"
echo ""

# Test 1: Basic arithmetic
echo "Test 1: Basic Arithmetic (125000 * 1.075^5)"
RESULT=$(curl -s "${BASE_URL}?appid=${WOLFRAM_APP_ID}&input=125000%20*%201.075%5E5")
echo "  Result: $RESULT"
echo ""

# Test 2: Percentage
echo "Test 2: Percentage (15% of 50000)"
RESULT=$(curl -s "${BASE_URL}?appid=${WOLFRAM_APP_ID}&input=15%25%20of%2050000")
echo "  Result: $RESULT"
echo ""

# Test 3: EVM-style calculation
echo "Test 3: SPI Calculation ((750000 - 680000) / 750000)"
RESULT=$(curl -s "${BASE_URL}?appid=${WOLFRAM_APP_ID}&input=(750000%20-%20680000)%20%2F%20750000")
echo "  Result: $RESULT"
echo ""

# Test 4: Unit conversion
echo "Test 4: Unit Conversion (15000 nautical miles to km)"
RESULT=$(curl -s "${BASE_URL}?appid=${WOLFRAM_APP_ID}&input=15000%20nautical%20miles%20to%20kilometers")
echo "  Result: $RESULT"
echo ""

echo "───────────────────────────────────────────────────────────────"
echo "  If you see numeric results above, the API is working!"
echo "═══════════════════════════════════════════════════════════════"
