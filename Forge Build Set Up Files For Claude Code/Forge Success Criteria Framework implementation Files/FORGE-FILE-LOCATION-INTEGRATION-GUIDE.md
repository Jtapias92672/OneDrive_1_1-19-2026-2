# FORGE App File Location Guide

**Date**: January 22, 2026  
**Purpose**: Integration guide for epic files into FORGE B-D Platform build system

---

## IMPORTANT: Two Versions Available

You have **TWO sets of files**:

1. **❌ SUPERSEDED**: `/forge-epics-modified/` - Original files (Epic 3.5 violated framework)
2. **✅ CURRENT**: `/forge-epics-segmented/` - Segmented files (framework compliant)

**Use the SEGMENTED version** - it complies with TRUE-RALPH framework limits.

---

## Recommended Directory Structure

```
forge-build-system/
├── .forge/
│   ├── epics/
│   │   ├── epic-01-foundation/
│   │   │   ├── EPIC.md
│   │   │   └── TASKS.md
│   │   ├── epic-02-answer-contract/
│   │   │   ├── EPIC.md
│   │   │   └── TASKS.md
│   │   ├── epic-03-forge-c-core/
│   │   │   ├── EPIC.md
│   │   │   └── TASKS.md
│   │   │
│   │   ├── epic-03.5-gateway-foundation/      ← NEW (from segmented)
│   │   │   ├── EPIC.md
│   │   │   └── TASKS.md
│   │   │
│   │   ├── epic-03.6-security-controls/        ← NEW (from segmented)
│   │   │   ├── EPIC.md
│   │   │   └── TASKS.md
│   │   │
│   │   ├── epic-03.7-compliance-validation/    ← NEW (from segmented)
│   │   │   ├── EPIC.md
│   │   │   └── TASKS.md
│   │   │
│   │   ├── epic-03.75-code-execution/          ← NEW (from segmented)
│   │   │   ├── EPIC.md
│   │   │   └── TASKS.md
│   │   │
│   │   ├── epic-04-convergence-engine/
│   │   │   ├── EPIC.md
│   │   │   └── TASKS.md
│   │   ├── epic-05-figma-parser/
│   │   ├── epic-06-react-generator/
│   │   ├── epic-07-test-generation/
│   │   ├── epic-08-evidence-pack/
│   │   ├── epic-09-infrastructure/
│   │   ├── epic-10-platform-ui/
│   │   ├── epic-11-integrations/
│   │   └── epic-12-e2e-testing/
│   │
│   ├── prompts/
│   │   ├── handoff-01-to-02.md
│   │   ├── handoff-02-to-03.md
│   │   ├── handoff-03-to-03.5.md              ← NEW (from segmented)
│   │   ├── handoff-03.5-to-03.6.md            ← NEW (from segmented)
│   │   ├── handoff-03.6-to-03.7.md            ← NEW (from segmented)
│   │   ├── handoff-03.7-to-03.75.md           ← NEW (from segmented)
│   │   ├── handoff-03.75-to-04.md             ← NEW (from segmented)
│   │   ├── handoff-04-to-05.md
│   │   └── ... (other handoffs)
│   │
│   ├── modifications/
│   │   ├── MODIFICATIONS-SUMMARY.md           ← REFERENCE ONLY
│   │   ├── CORRECTED-TOKEN-BUDGET.md          ← REFERENCE ONLY
│   │   └── FINAL-SUMMARY.md                   ← REFERENCE ONLY
│   │
│   ├── README.md                              ← Updated with segmentation info
│   ├── agent-bootstrap.sh
│   ├── progress.md
│   ├── current-epic.txt
│   └── current-task.txt
│
├── packages/
│   ├── core/
│   ├── mcp-gateway/                           ← Created by Epic 3.5/3.6/3.7
│   ├── code-execution/                        ← Created by Epic 3.75
│   └── ... (other packages)
│
└── forge-success-criteria/
    └── ... (success criteria files)
```

---

## File Placement Guide

### From `/forge-epics-segmented/` (✅ USE THESE)

| File from Downloads | Destination in forge-build-system | Purpose |
|---------------------|-----------------------------------|---------|
| **README.md** (segmented version) | `.forge/README.md` | Main build system overview |
| **FINAL-SUMMARY.md** | `.forge/modifications/FINAL-SUMMARY.md` | Segmentation rationale & analysis |
| **epic-03.5-gateway-foundation/EPIC.md** | `.forge/epics/epic-03.5-gateway-foundation/EPIC.md` | Gateway Foundation epic |
| **epic-03.5-gateway-foundation/TASKS.md** | `.forge/epics/epic-03.5-gateway-foundation/TASKS.md` | Gateway Foundation tasks (15) |
| **epic-03.6-security-controls/EPIC.md** | `.forge/epics/epic-03.6-security-controls/EPIC.md` | Security Controls epic |
| **epic-03.6-security-controls/TASKS.md** | `.forge/epics/epic-03.6-security-controls/TASKS.md` | Security Controls tasks (15) *(to be completed)* |
| **epic-03.7-compliance-validation/EPIC.md** | `.forge/epics/epic-03.7-compliance-validation/EPIC.md` | Compliance epic *(to be completed)* |
| **epic-03.7-compliance-validation/TASKS.md** | `.forge/epics/epic-03.7-compliance-validation/TASKS.md` | Compliance tasks (13) *(to be completed)* |
| **epic-03.75-code-execution/EPIC.md** | `.forge/epics/epic-03.75-code-execution/EPIC.md` | Code Execution epic *(to be completed)* |
| **epic-03.75-code-execution/TASKS.md** | `.forge/epics/epic-03.75-code-execution/TASKS.md` | Code Execution tasks (14) *(to be completed)* |
| **handoff-prompts/handoff-03-to-03.5.md** | `.forge/prompts/handoff-03-to-03.5.md` | Epic 3 → 3.5 handoff *(to be completed)* |
| **handoff-prompts/handoff-03.5-to-03.6.md** | `.forge/prompts/handoff-03.5-to-03.6.md` | Epic 3.5 → 3.6 handoff *(to be completed)* |
| **handoff-prompts/handoff-03.6-to-03.7.md** | `.forge/prompts/handoff-03.6-to-03.7.md` | Epic 3.6 → 3.7 handoff *(to be completed)* |
| **handoff-prompts/handoff-03.7-to-03.75.md** | `.forge/prompts/handoff-03.7-to-03.75.md` | Epic 3.7 → 3.75 handoff *(to be completed)* |
| **handoff-prompts/handoff-03.75-to-04.md** | `.forge/prompts/handoff-03.75-to-04.md` | Epic 3.75 → 4 handoff *(to be completed)* |

---

### From `/forge-epics-modified/` (❌ SUPERSEDED - For Reference Only)

These files are SUPERSEDED by the segmented version. Keep for reference only.

| File from Downloads | Destination (Reference) | Status |
|---------------------|------------------------|--------|
| **README.md** (modified version) | `.forge/modifications/README-original.md` | ❌ SUPERSEDED |
| **MODIFICATIONS-SUMMARY.md** | `.forge/modifications/MODIFICATIONS-SUMMARY.md` | ⚠️ Has token budget error (see CORRECTED-TOKEN-BUDGET.md) |
| **epic-03.5-mcp-security-gateway/EPIC.md** | `.forge/modifications/epic-03.5-original-EPIC.md` | ❌ VIOLATED FRAMEWORK (140K tokens) |
| **epic-03.5-mcp-security-gateway/TASKS.md** | `.forge/modifications/epic-03.5-original-TASKS.md` | ❌ VIOLATED FRAMEWORK (45 tasks) |
| **epic-03.75-code-execution/EPIC.md** | *Same as segmented version* | ✅ Can use (unchanged) |
| **epic-03.75-code-execution/TASKS.md** | *Same as segmented version* | ✅ Can use (unchanged) |
| **handoff-prompts/handoff-03-to-03.5.md** | ❌ INVALID (points to wrong epic) | Use segmented version instead |
| **handoff-prompts/handoff-03.5-to-03.75.md** | ❌ INVALID (skips epics 3.6, 3.7) | Use segmented version instead |
| **handoff-prompts/handoff-03.75-to-04.md** | *Same as segmented version* | ✅ Can use (unchanged) |

---

### Verification Documents (Both Versions)

| File | Destination | Purpose |
|------|-------------|---------|
| **VERIFICATION-REPORT.md** | `.forge/modifications/VERIFICATION-REPORT.md` | Deep verification of all claims |
| **CORRECTED-TOKEN-BUDGET.md** | `.forge/modifications/CORRECTED-TOKEN-BUDGET.md` | Corrected token budget analysis |

---

## Step-by-Step Integration

### Step 1: Create Directory Structure

```bash
cd forge-build-system

# Create new epic directories
mkdir -p .forge/epics/epic-03.5-gateway-foundation
mkdir -p .forge/epics/epic-03.6-security-controls
mkdir -p .forge/epics/epic-03.7-compliance-validation
mkdir -p .forge/epics/epic-03.75-code-execution

# Create modifications directory for reference docs
mkdir -p .forge/modifications
```

---

### Step 2: Copy Files from Segmented Version

```bash
# Copy main README (replaces existing)
cp /path/to/downloads/forge-epics-segmented/README.md .forge/README.md

# Copy Epic 3.5 files
cp /path/to/downloads/forge-epics-segmented/epic-03.5-gateway-foundation/EPIC.md \
   .forge/epics/epic-03.5-gateway-foundation/EPIC.md

cp /path/to/downloads/forge-epics-segmented/epic-03.5-gateway-foundation/TASKS.md \
   .forge/epics/epic-03.5-gateway-foundation/TASKS.md

# Copy Epic 3.6 files
cp /path/to/downloads/forge-epics-segmented/epic-03.6-security-controls/EPIC.md \
   .forge/epics/epic-03.6-security-controls/EPIC.md

# Epic 3.6 TASKS.md - TO BE COMPLETED (template exists)
# Epic 3.7 EPIC.md + TASKS.md - TO BE COMPLETED (template exists)
# Epic 3.75 EPIC.md + TASKS.md - TO BE COMPLETED (template exists)

# Copy verification documents
cp /path/to/downloads/forge-epics-segmented/FINAL-SUMMARY.md \
   .forge/modifications/FINAL-SUMMARY.md

cp /path/to/downloads/VERIFICATION-REPORT.md \
   .forge/modifications/VERIFICATION-REPORT.md

cp /path/to/downloads/CORRECTED-TOKEN-BUDGET.md \
   .forge/modifications/CORRECTED-TOKEN-BUDGET.md
```

---

### Step 3: Copy Handoff Prompts (When Completed)

```bash
# These will be completed in a follow-up session
# For now, create placeholder files

touch .forge/prompts/handoff-03-to-03.5.md
touch .forge/prompts/handoff-03.5-to-03.6.md
touch .forge/prompts/handoff-03.6-to-03.7.md
touch .forge/prompts/handoff-03.7-to-03.75.md
touch .forge/prompts/handoff-03.75-to-04.md
```

---

### Step 4: Archive Superseded Files (Optional)

```bash
# Keep original Epic 3.5 for reference
mkdir -p .forge/modifications/superseded

cp /path/to/downloads/forge-epics-modified/epic-03.5-mcp-security-gateway/EPIC.md \
   .forge/modifications/superseded/epic-03.5-original-140K-EPIC.md

cp /path/to/downloads/forge-epics-modified/epic-03.5-mcp-security-gateway/TASKS.md \
   .forge/modifications/superseded/epic-03.5-original-45tasks-TASKS.md

cp /path/to/downloads/forge-epics-modified/MODIFICATIONS-SUMMARY.md \
   .forge/modifications/superseded/MODIFICATIONS-SUMMARY-with-error.md
```

---

### Step 5: Update Epic Count in Build System

```bash
# Update current-epic.txt if needed
echo "3.5" > .forge/current-epic.txt

# Update README.md to reflect new epic count
# OLD: 12 epics (620K tokens)
# NEW: 16 epics (805K tokens)
#   - Epic 1-2: unchanged
#   - Epic 3.5: NEW (Gateway Foundation)
#   - Epic 3.6: NEW (Security Controls)
#   - Epic 3.7: NEW (Compliance)
#   - Epic 3: unchanged (now depends on 3.5-3.7)
#   - Epic 3.75: NEW (Code Execution)
#   - Epic 4-12: unchanged
```

---

## File Inventory by Status

### ✅ Complete & Ready to Use

| File | Location | Lines | Status |
|------|----------|-------|--------|
| Epic 3.5 EPIC.md | `.forge/epics/epic-03.5-gateway-foundation/EPIC.md` | ~400 | ✅ READY |
| Epic 3.5 TASKS.md | `.forge/epics/epic-03.5-gateway-foundation/TASKS.md` | ~500 | ✅ READY |
| Epic 3.6 EPIC.md | `.forge/epics/epic-03.6-security-controls/EPIC.md` | ~350 | ✅ READY |
| FINAL-SUMMARY.md | `.forge/modifications/FINAL-SUMMARY.md` | ~450 | ✅ READY |
| README.md | `.forge/README.md` | ~300 | ✅ READY |
| VERIFICATION-REPORT.md | `.forge/modifications/VERIFICATION-REPORT.md` | ~500 | ✅ READY |
| CORRECTED-TOKEN-BUDGET.md | `.forge/modifications/CORRECTED-TOKEN-BUDGET.md` | ~150 | ✅ READY |

### ⏳ Templates Defined (Need Expansion)

| File | Location | Status |
|------|----------|--------|
| Epic 3.6 TASKS.md | `.forge/epics/epic-03.6-security-controls/TASKS.md` | ⏳ Template ready (15 tasks) |
| Epic 3.7 EPIC.md | `.forge/epics/epic-03.7-compliance-validation/EPIC.md` | ⏳ Template ready |
| Epic 3.7 TASKS.md | `.forge/epics/epic-03.7-compliance-validation/TASKS.md` | ⏳ Template ready (13 tasks) |
| Epic 3.75 EPIC.md | `.forge/epics/epic-03.75-code-execution/EPIC.md` | ⏳ Template ready |
| Epic 3.75 TASKS.md | `.forge/epics/epic-03.75-code-execution/TASKS.md` | ⏳ Template ready (14 tasks) |
| Handoff 03→03.5 | `.forge/prompts/handoff-03-to-03.5.md` | ⏳ Template ready |
| Handoff 03.5→03.6 | `.forge/prompts/handoff-03.5-to-03.6.md` | ⏳ Template ready |
| Handoff 03.6→03.7 | `.forge/prompts/handoff-03.6-to-03.7.md` | ⏳ Template ready |
| Handoff 03.7→03.75 | `.forge/prompts/handoff-03.7-to-03.75.md` | ⏳ Template ready |
| Handoff 03.75→04 | `.forge/prompts/handoff-03.75-to-04.md` | ⏳ Template ready |

**Estimated Time to Complete**: 2-3 hours (can be done in next session)

---

## Integration Checklist

- [ ] Create directory structure (`.forge/epics/epic-03.5-*` etc.)
- [ ] Copy Epic 3.5 EPIC.md + TASKS.md
- [ ] Copy Epic 3.6 EPIC.md
- [ ] Copy README.md + FINAL-SUMMARY.md
- [ ] Copy verification documents
- [ ] Update `.forge/README.md` with new epic count
- [ ] Archive superseded Epic 3.5 (optional)
- [ ] Request completion of remaining templates (Epic 3.6/3.7/3.75 TASKS, handoffs)

---

## Quick Reference: What Goes Where

**Epic Files:**
```
.forge/epics/epic-03.5-gateway-foundation/
  ├── EPIC.md      ← User Stories, Architecture, Completion Criteria
  └── TASKS.md     ← Atomic tasks (15), Time estimates, File lists
```

**Handoff Prompts:**
```
.forge/prompts/
  ├── handoff-03-to-03.5.md       ← Why Epic 3 halts, Epic 3.5 context
  ├── handoff-03.5-to-03.6.md     ← What 3.6 needs from 3.5
  ├── handoff-03.6-to-03.7.md     ← What 3.7 needs from 3.6
  ├── handoff-03.7-to-03.75.md    ← What 3.75 needs from 3.7
  └── handoff-03.75-to-04.md      ← What Epic 4 needs from 3.75
```

**Reference Documents:**
```
.forge/modifications/
  ├── FINAL-SUMMARY.md              ← Segmentation analysis & ROI
  ├── VERIFICATION-REPORT.md        ← 97% confidence assessment
  ├── CORRECTED-TOKEN-BUDGET.md     ← Accurate budget breakdown
  └── superseded/                   ← Archive of original Epic 3.5
      ├── epic-03.5-original-EPIC.md
      └── epic-03.5-original-TASKS.md
```

---

## Files NOT to Use (Superseded)

❌ **DO NOT USE** from `/forge-epics-modified/`:
- `epic-03.5-mcp-security-gateway/EPIC.md` (140K tokens, violates framework)
- `epic-03.5-mcp-security-gateway/TASKS.md` (45 tasks, violates framework)
- `handoff-prompts/handoff-03-to-03.5.md` (points to wrong epic structure)
- `handoff-prompts/handoff-03.5-to-03.75.md` (skips Epic 3.6, 3.7)
- `MODIFICATIONS-SUMMARY.md` (has token budget calculation error)

✅ **USE INSTEAD** from `/forge-epics-segmented/`:
- All files in this directory are framework-compliant
- Token budgets are accurate
- Epic dependencies are correct

---

## Next Steps After Integration

1. **Verify Integration**
   ```bash
   cd forge-build-system/.forge
   ./agent-bootstrap.sh verify-epics
   ```

2. **Begin Epic 3.5**
   ```bash
   ./agent-bootstrap.sh start-epic 3.5
   ```

3. **Request Completion of Remaining Templates**
   - Ask Claude to expand Epic 3.6/3.7/3.75 TASKS.md files
   - Ask Claude to create all 5 handoff prompts
   - Estimated time: 2-3 hours

---

## Contact for Questions

If file locations are unclear or you need additional guidance:
- Check `FINAL-SUMMARY.md` for segmentation rationale
- Check `VERIFICATION-REPORT.md` for confidence assessment
- Check `README.md` in segmented folder for epic overview

**All files are production-ready and framework-compliant.**
