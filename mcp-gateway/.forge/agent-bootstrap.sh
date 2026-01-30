#!/bin/bash
# ============================================================================
# TRUE-RALPH Loop Build System - Agent Bootstrap Script
# ============================================================================
#
# This script provides the orchestration layer for the TRUE-RALPH system.
# It helps maintain cross-session continuity and prevents context rot.
#
# Usage: source .forge/agent-bootstrap.sh
#        ralph <command>
#
# ============================================================================

set -e

# Determine paths - handle both sourcing and direct execution
if [[ -n "${BASH_SOURCE[0]}" && "${BASH_SOURCE[0]}" != "$0" ]]; then
    # Script is being sourced
    FORGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
    # Script is being executed or BASH_SOURCE is empty
    # Find .forge directory relative to current location
    if [[ -d ".forge" ]]; then
        FORGE_DIR="$(cd .forge && pwd)"
    elif [[ -d "$(dirname "$0")/.forge" ]]; then
        FORGE_DIR="$(cd "$(dirname "$0")/.forge" && pwd)"
    else
        # Try to find it from the script path
        SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
        if [[ -n "$SCRIPT_PATH" && "$SCRIPT_PATH" == *".forge"* ]]; then
            FORGE_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
        else
            echo "Error: Cannot find .forge directory"
            FORGE_DIR="$(pwd)/.forge"
        fi
    fi
fi
PROJECT_ROOT="$(dirname "$FORGE_DIR")"
cd "$PROJECT_ROOT" 2>/dev/null || true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================================================
# Command: task
# Show the next task from progress.md
# ============================================================================

cmd_task() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                    TRUE-RALPH: NEXT TASK                          ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""

    if [[ -f "$FORGE_DIR/current-epic.txt" ]]; then
        CURRENT_EPIC=$(cat "$FORGE_DIR/current-epic.txt")
        echo -e "${BLUE}Current Epic:${NC} $CURRENT_EPIC"
    else
        echo -e "${YELLOW}No current epic set. Run 'ralph set-epic <epic-id>'${NC}"
    fi

    if [[ -f "$FORGE_DIR/current-task.txt" ]]; then
        CURRENT_TASK=$(cat "$FORGE_DIR/current-task.txt")
        echo -e "${BLUE}Current Task:${NC} $CURRENT_TASK"
    else
        echo -e "${YELLOW}No current task set.${NC}"
    fi

    echo ""
    echo -e "${GREEN}Next uncompleted task from progress.md:${NC}"
    echo ""

    # Find first uncompleted task (marked with [ ])
    grep -n "^\- \[ \]" "$FORGE_DIR/progress.md" | head -5 || echo "No uncompleted tasks found!"

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "To start a task: ${GREEN}ralph start <task-id>${NC}"
    echo -e "To complete a task: ${GREEN}ralph complete <task-id>${NC}"
    echo ""
}

# ============================================================================
# Command: progress
# Show overall progress
# ============================================================================

cmd_progress() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                  TRUE-RALPH: BUILD PROGRESS                       ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""

    # Count tasks - ensure numeric values
    TOTAL_TASKS=$(grep -c "^- \[" "$FORGE_DIR/progress.md" 2>/dev/null || echo 0)
    TOTAL_TASKS=${TOTAL_TASKS//[^0-9]/}
    TOTAL_TASKS=${TOTAL_TASKS:-0}

    COMPLETED_TASKS=$(grep -c "^- \[x\]" "$FORGE_DIR/progress.md" 2>/dev/null || echo 0)
    COMPLETED_TASKS=${COMPLETED_TASKS//[^0-9]/}
    COMPLETED_TASKS=${COMPLETED_TASKS:-0}

    REMAINING_TASKS=$((TOTAL_TASKS - COMPLETED_TASKS))

    if [[ $TOTAL_TASKS -gt 0 ]]; then
        PERCENT=$((COMPLETED_TASKS * 100 / TOTAL_TASKS))
    else
        PERCENT=0
    fi

    echo -e "${BLUE}Total Tasks:${NC}     $TOTAL_TASKS"
    echo -e "${GREEN}Completed:${NC}       $COMPLETED_TASKS"
    echo -e "${YELLOW}Remaining:${NC}       $REMAINING_TASKS"
    echo -e "${CYAN}Progress:${NC}        $PERCENT%"
    echo ""

    # Show progress bar
    FILLED=$((PERCENT / 5))
    EMPTY=$((20 - FILLED))
    BAR=""
    for ((i=0; i<FILLED; i++)); do BAR+="█"; done
    for ((i=0; i<EMPTY; i++)); do BAR+="░"; done
    echo -e "[$BAR] $PERCENT%"
    echo ""

    # Show P0 issues status
    echo -e "${RED}P0 Critical Issues:${NC}"
    grep -A1 "^#### RECOVERY-" "$FORGE_DIR/progress.md" 2>/dev/null | head -20 || echo "  (none found)"

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
}

# ============================================================================
# Command: verify-criteria
# Run acceptance tests (placeholder)
# ============================================================================

cmd_verify_criteria() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}              TRUE-RALPH: VERIFY SUCCESS CRITERIA                  ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""

    log_info "Running acceptance tests..."

    # Check if npm test exists and run it
    if [[ -f "$PROJECT_ROOT/package.json" ]]; then
        cd "$PROJECT_ROOT"

        # Run TypeScript check
        log_info "TypeScript compilation check..."
        if npx tsc --noEmit 2>/dev/null; then
            log_success "TypeScript: PASS"
        else
            log_error "TypeScript: FAIL"
        fi

        # Run tests
        log_info "Running test suite..."
        if npm test 2>/dev/null; then
            log_success "Tests: PASS"
        else
            log_warning "Tests: Some failures detected"
        fi
    else
        log_warning "No package.json found. Skipping npm tests."
    fi

    # Check for specific success criteria files
    log_info "Checking Success Criteria alignment..."

    CRITERIA_FILES=(
        "docs/success-criteria.md"
        "docs/FORGE-COMPLETE-SPECIFICATION.md"
    )

    for f in "${CRITERIA_FILES[@]}"; do
        if [[ -f "$PROJECT_ROOT/$f" ]]; then
            log_success "Found: $f"
        else
            log_warning "Missing: $f"
        fi
    done

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
}

# ============================================================================
# Command: validate-schema
# Validate against schemas (placeholder)
# ============================================================================

cmd_validate_schema() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}               TRUE-RALPH: SCHEMA VALIDATION                       ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""

    log_info "Validating TypeScript types and schemas..."

    # Check for schema files
    SCHEMA_DIRS=(
        "src/types"
        "src/schemas"
        "gateway/types.ts"
    )

    for d in "${SCHEMA_DIRS[@]}"; do
        if [[ -e "$PROJECT_ROOT/$d" ]]; then
            log_success "Schema location found: $d"
        fi
    done

    # Run tsc for type checking
    if [[ -f "$PROJECT_ROOT/tsconfig.json" ]]; then
        log_info "Running TypeScript strict type check..."
        cd "$PROJECT_ROOT"
        if npx tsc --noEmit --strict 2>/dev/null; then
            log_success "All types valid"
        else
            log_warning "Type errors detected (run 'npx tsc --noEmit' for details)"
        fi
    fi

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
}

# ============================================================================
# Command: alignment
# Show Epic ↔ Success Criteria mapping
# ============================================================================

cmd_alignment() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}           TRUE-RALPH: EPIC ↔ SUCCESS CRITERIA ALIGNMENT          ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""

    cat << 'EOF'
┌─────────────┬────────────────────────────────────────────────────────────────┐
│ Epic        │ Success Criteria                                               │
├─────────────┼────────────────────────────────────────────────────────────────┤
│ Epic 00     │ SC-00: Success Criteria Alignment                              │
│ Epic 02     │ SC-02: Answer Contract fulfills all specifications             │
│ Epic 03     │ SC-03: FORGE-C Core operational                                │
│ Epic 3.5    │ SC-3.5: Gateway routes all MCP traffic correctly               │
│ Epic 3.6    │ SC-3.6: All security controls enforced (JWT, RBAC, etc.)       │
│ Epic 3.7    │ SC-3.7: Compliance validation passes (SLSA, provenance)        │
│ Epic 3.75   │ SC-3.75: Code execution sandboxed, PII≥99%, Secrets=100%       │
│ Epic 04     │ SC-04: Multi-agent convergence functional                      │
│ Epic 05     │ SC-05: Figma designs parsed correctly                          │
│ Epic 06     │ SC-06: Prompt optimization working                             │
│ Epic 07     │ SC-07: Agent orchestration operational                         │
│ Epic 08     │ SC-08: Evidence packs generated with valid signatures          │
│ Epic 09     │ SC-09: AWS infrastructure deployable                           │
│ Epic 10     │ SC-10: Monitoring and alerting functional                      │
│ Epic 11     │ SC-11: Documentation complete                                  │
│ Epic 12-18  │ SC-12+: Advanced features                                      │
└─────────────┴────────────────────────────────────────────────────────────────┘

Current Focus: RECOVERY TASKS (P0 Critical Issues)

RECOVERY-01 → SC-3.6 (JWT signature verification)
RECOVERY-02 → SC-3.75 (Approval workflow)
RECOVERY-03 → SC-3.75/DP-09 (PII detection ≥99%)
RECOVERY-04 → SC-3.75/DP-10 (Secret detection 100%)
RECOVERY-05 → SC-04 (Convergence decision)
RECOVERY-06 → SC-3.7 (Real signature verification)
RECOVERY-07 → SC-3.7 (Real provenance verification)
RECOVERY-08 → SC-09 (Lambda-Bedrock connectivity)
RECOVERY-09 → SC-09 (Security groups)
RECOVERY-10 → SC-09 (Root Terraform module)
EOF

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
}

# ============================================================================
# Command: next-epic
# Move to next epic (verifies current first)
# ============================================================================

cmd_next_epic() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                TRUE-RALPH: ADVANCE TO NEXT EPIC                   ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""

    if [[ -f "$FORGE_DIR/current-epic.txt" ]]; then
        CURRENT_EPIC=$(cat "$FORGE_DIR/current-epic.txt")
        log_info "Current epic: $CURRENT_EPIC"

        # Check if current epic has uncompleted tasks
        EPIC_TASKS=$(grep -c "Epic: $CURRENT_EPIC" "$FORGE_DIR/progress.md" 2>/dev/null || echo "0")
        EPIC_COMPLETED=$(grep -B5 "Epic: $CURRENT_EPIC" "$FORGE_DIR/progress.md" | grep -c "\[x\]" 2>/dev/null || echo "0")

        if [[ $EPIC_TASKS -gt 0 && $EPIC_COMPLETED -lt $EPIC_TASKS ]]; then
            log_warning "Current epic has uncompleted tasks!"
            log_warning "Complete all tasks or use 'ralph force-next-epic' to skip."
            return 1
        fi

        log_success "Current epic verified complete."
    fi

    # Determine next epic
    EPIC_ORDER=("RECOVERY" "05" "06" "07" "10" "11" "12" "13" "14" "15" "16" "17" "18")

    log_info "Available epics to start:"
    for e in "${EPIC_ORDER[@]}"; do
        echo "  - Epic $e"
    done

    echo ""
    echo -e "To set the next epic: ${GREEN}ralph set-epic <epic-id>${NC}"

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
}

# ============================================================================
# Command: set-epic
# Set current epic
# ============================================================================

cmd_set_epic() {
    local EPIC_ID="$1"

    if [[ -z "$EPIC_ID" ]]; then
        log_error "Usage: ralph set-epic <epic-id>"
        return 1
    fi

    echo "$EPIC_ID" > "$FORGE_DIR/current-epic.txt"
    log_success "Current epic set to: $EPIC_ID"
}

# ============================================================================
# Command: start
# Start a task
# ============================================================================

cmd_start() {
    local TASK_ID="$1"

    if [[ -z "$TASK_ID" ]]; then
        log_error "Usage: ralph start <task-id>"
        return 1
    fi

    echo "$TASK_ID" > "$FORGE_DIR/current-task.txt"

    # Log session start
    SESSION_LOG="$FORGE_DIR/logs/sessions/$(date +%Y%m%d_%H%M%S)_${TASK_ID}.log"
    echo "Session started: $(date)" > "$SESSION_LOG"
    echo "Task: $TASK_ID" >> "$SESSION_LOG"

    log_success "Started task: $TASK_ID"
    log_info "Session log: $SESSION_LOG"

    # Show task prompt template
    echo ""
    echo -e "${YELLOW}Copy this prompt to start the task in a fresh Claude session:${NC}"
    echo ""
    cat "$FORGE_DIR/prompts/task-prompt-template.md" | sed "s/{{TASK_ID}}/$TASK_ID/g"
}

# ============================================================================
# Command: complete
# Mark a task as complete
# ============================================================================

cmd_complete() {
    local TASK_ID="$1"

    if [[ -z "$TASK_ID" ]]; then
        # Use current task if not specified
        if [[ -f "$FORGE_DIR/current-task.txt" ]]; then
            TASK_ID=$(cat "$FORGE_DIR/current-task.txt")
        else
            log_error "Usage: ralph complete <task-id>"
            return 1
        fi
    fi

    # Update progress.md - mark task as complete
    if [[ -f "$FORGE_DIR/progress.md" ]]; then
        # This is a simple replacement - in practice you might want something more robust
        sed -i.bak "s/\- \[ \] Task $TASK_ID/- [x] Task $TASK_ID/" "$FORGE_DIR/progress.md"
        rm -f "$FORGE_DIR/progress.md.bak"
        log_success "Marked task $TASK_ID as complete in progress.md"
    fi

    # Clear current task
    rm -f "$FORGE_DIR/current-task.txt"

    log_success "Completed task: $TASK_ID"
    echo ""
    cmd_task
}

# ============================================================================
# Command: status
# Show current status
# ============================================================================

cmd_status() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                    TRUE-RALPH: STATUS                             ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""

    echo -e "${BLUE}Project Root:${NC}    $PROJECT_ROOT"
    echo -e "${BLUE}FORGE Dir:${NC}       $FORGE_DIR"

    if [[ -f "$FORGE_DIR/current-epic.txt" ]]; then
        echo -e "${BLUE}Current Epic:${NC}    $(cat "$FORGE_DIR/current-epic.txt")"
    else
        echo -e "${BLUE}Current Epic:${NC}    ${YELLOW}Not set${NC}"
    fi

    if [[ -f "$FORGE_DIR/current-task.txt" ]]; then
        echo -e "${BLUE}Current Task:${NC}    $(cat "$FORGE_DIR/current-task.txt")"
    else
        echo -e "${BLUE}Current Task:${NC}    ${YELLOW}Not set${NC}"
    fi

    echo ""

    # Quick progress
    TOTAL_TASKS=$(grep -c "^- \[" "$FORGE_DIR/progress.md" 2>/dev/null || echo 0)
    TOTAL_TASKS=${TOTAL_TASKS//[^0-9]/}
    TOTAL_TASKS=${TOTAL_TASKS:-0}
    COMPLETED_TASKS=$(grep -c "^- \[x\]" "$FORGE_DIR/progress.md" 2>/dev/null || echo 0)
    COMPLETED_TASKS=${COMPLETED_TASKS//[^0-9]/}
    COMPLETED_TASKS=${COMPLETED_TASKS:-0}
    echo -e "${BLUE}Progress:${NC}        $COMPLETED_TASKS / $TOTAL_TASKS tasks"

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
}

# ============================================================================
# Command: help
# Show help
# ============================================================================

cmd_help() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                    TRUE-RALPH: HELP                               ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${GREEN}Usage:${NC} ralph <command> [args]"
    echo ""
    echo -e "${BLUE}Commands:${NC}"
    echo "  task              Show next task from progress.md"
    echo "  progress          Show overall progress"
    echo "  status            Show current status"
    echo "  verify-criteria   Run acceptance tests"
    echo "  validate-schema   Validate against schemas"
    echo "  alignment         Show Epic ↔ Success Criteria mapping"
    echo "  next-epic         Move to next epic (verifies current first)"
    echo "  set-epic <id>     Set current epic"
    echo "  start <task-id>   Start working on a task"
    echo "  complete [id]     Mark task as complete"
    echo "  help              Show this help"
    echo ""
    echo -e "${BLUE}Quick Start:${NC}"
    echo "  1. source .forge/agent-bootstrap.sh"
    echo "  2. ralph status"
    echo "  3. ralph task"
    echo "  4. ralph start RECOVERY-01.1"
    echo "  5. (do the work)"
    echo "  6. ralph complete"
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
}

# ============================================================================
# Main Entry Point
# ============================================================================

ralph() {
    local CMD="$1"
    shift 2>/dev/null || true

    case "$CMD" in
        task)
            cmd_task "$@"
            ;;
        progress)
            cmd_progress "$@"
            ;;
        status)
            cmd_status "$@"
            ;;
        verify-criteria|verify)
            cmd_verify_criteria "$@"
            ;;
        validate-schema|validate)
            cmd_validate_schema "$@"
            ;;
        alignment|align)
            cmd_alignment "$@"
            ;;
        next-epic|next)
            cmd_next_epic "$@"
            ;;
        set-epic)
            cmd_set_epic "$@"
            ;;
        start)
            cmd_start "$@"
            ;;
        complete|done)
            cmd_complete "$@"
            ;;
        help|--help|-h|"")
            cmd_help
            ;;
        *)
            log_error "Unknown command: $CMD"
            cmd_help
            return 1
            ;;
    esac
}

# Export the function
export -f ralph

# Show welcome message when sourced
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}           TRUE-RALPH Loop Build System Initialized                ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Type ${GREEN}ralph help${NC} for available commands."
echo ""
