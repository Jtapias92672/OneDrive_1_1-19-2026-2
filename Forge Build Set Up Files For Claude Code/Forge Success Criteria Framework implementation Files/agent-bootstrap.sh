#!/bin/bash
# FORGE Agent Bootstrap Script (with Success Criteria Integration)
# Updated: 2026-01-19 - Added Epic 13 (Governance Gateway) and Epic 14 (Computational Accuracy)
# Usage: .forge/agent-bootstrap.sh [command]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PROGRESS_FILE="$SCRIPT_DIR/progress.md"
CURRENT_EPIC_FILE="$SCRIPT_DIR/current-epic.txt"
SUCCESS_CRITERIA_DIR="$PROJECT_ROOT/forge-success-criteria"
ALIGNMENT_FILE="$SCRIPT_DIR/EPIC-SUCCESS-CRITERIA-ALIGNMENT.md"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Get current epic number
get_current_epic() {
    if [ -f "$CURRENT_EPIC_FILE" ]; then
        cat "$CURRENT_EPIC_FILE"
    else
        echo "1"
    fi
}

# Get epic directory name from number
get_epic_dir() {
    local epic_num="$1"
    case "$epic_num" in
        1) echo "epic-01-foundation" ;;
        2) echo "epic-02-answer-contract" ;;
        3) echo "epic-03-forge-c-core" ;;
        3.75) echo "epic-03.75-code-execution" ;;
        4) echo "epic-04-convergence" ;;
        5) echo "epic-05-figma-parser" ;;
        6) echo "epic-06-react-generator" ;;
        7) echo "epic-07-test-generation" ;;
        8) echo "epic-08-evidence-packs" ;;
        9) echo "epic-09-infrastructure" ;;
        10a) echo "epic-10a-platform-ui-core" ;;
        10b) echo "epic-10b-platform-ui-features" ;;
        11) echo "epic-11-integrations" ;;
        12) echo "epic-12-e2e-testing" ;;
        13) echo "epic-13-governance-gateway" ;;
        14) echo "epic-14-computational-accuracy" ;;
        14.1) echo "epic-14.1-computational-accuracy-core" ;;
        14.2) echo "epic-14.2-wolfram-integration" ;;
        14.3) echo "epic-14.3-citations-api" ;;
        14.4) echo "epic-14.4-extended-thinking" ;;
        *) echo "epic-$epic_num" ;;
    esac
}

# Get Success Criteria for epic
get_success_criteria() {
    local epic_num="$1"
    case "$epic_num" in
        1) echo "" ;;
        2) echo "01_ANSWER_CONTRACT:AC-01,AC-02,AC-03,AC-04,AC-05,AC-06,AC-07,AC-08,AC-09,AC-10" ;;
        3) echo "04_QUALITATIVE_VALIDATION:QV-01,QV-02,QV-03,QV-04,QV-05,QV-06,QV-07,QV-08,QV-09,QV-10" ;;
        3.75) echo "09_DATA_PROTECTION:DP-01,DP-02,DP-03,DP-04,DP-05,DP-06,DP-07,DP-08,DP-09,DP-10" ;;
        4) echo "05_CONVERGENCE_ENGINE:CE-01,CE-02,CE-03,CE-04,CE-05,CE-06,CE-07,CE-08,CE-09,CE-10,CE-11" ;;
        5) echo "" ;;
        6) echo "" ;;
        7) echo "08_RUBRIC_LIBRARY:RL-01,RL-02,RL-03,RL-04,RL-05,RL-06,RL-07,RL-08,RL-09,RL-10" ;;
        8) echo "06_EVIDENCE_PACK:EP-01,EP-02,EP-03,EP-04,EP-05,EP-06,EP-07,EP-08,EP-09,EP-10" ;;
        9) echo "11_OBSERVABILITY:OB-01,OB-02,OB-03,OB-04,OB-05,OB-06,OB-07,OB-08,OB-09,OB-10,OB-11" ;;
        10a) echo "12_HUMAN_REVIEW:HR-01,HR-02,HR-03,HR-04,HR-05,HR-06,HR-07,HR-08,HR-09,HR-10" ;;
        10b) echo "12_HUMAN_REVIEW:HR-01,HR-02,HR-03,HR-04,HR-05,HR-06,HR-07,HR-08,HR-09,HR-10" ;;
        11) echo "10_ORCHESTRATION:OR-01,OR-02,OR-03,OR-04,OR-05,OR-06,OR-07,OR-08,OR-09,OR-10" ;;
        12) echo "ALL:Full acceptance suite" ;;
        13) echo "13_GOVERNANCE_GATEWAY:GG-01,GG-02,GG-03,...,GG-52" ;;
        14|14.1) echo "14_COMPUTATIONAL_ACCURACY:CA-01,CA-02,CA-03,CA-04,CA-05,CA-06,CA-07,CA-08,CA-09,CA-10" ;;
        14.2) echo "14_COMPUTATIONAL_ACCURACY:CA-11,CA-12,CA-13,CA-14,CA-15 (Wolfram Integration)" ;;
        14.3) echo "14_COMPUTATIONAL_ACCURACY:CA-16,CA-17,CA-18,CA-19,CA-20 (Citations API)" ;;
        14.4) echo "14_COMPUTATIONAL_ACCURACY:CA-21,CA-22,CA-23,CA-24,CA-25 (Extended Thinking)" ;;
        *) echo "" ;;
    esac
}

# Check if epic is security/compliance critical
is_critical_epic() {
    local epic_num="$1"
    case "$epic_num" in
        3.75|8|13) echo "true" ;;  # Epic 13 added - governance is critical
        *) echo "false" ;;
    esac
}

# Show current task
show_task() {
    local epic=$(get_current_epic)
    local epic_dir=$(get_epic_dir "$epic")
    local tasks_file="$PROJECT_ROOT/epics/$epic_dir/TASKS.md"
    local criteria=$(get_success_criteria "$epic")
    local is_critical=$(is_critical_epic "$epic")
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}FORGE B-D Platform - Agent Bootstrap${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "Current Epic: ${YELLOW}$epic${NC}"
    echo -e "Epic Directory: ${YELLOW}$epic_dir${NC}"
    
    # Show Success Criteria alignment
    if [ -n "$criteria" ]; then
        local component=$(echo "$criteria" | cut -d: -f1)
        local tests=$(echo "$criteria" | cut -d: -f2)
        echo ""
        echo -e "${CYAN}━━━ Success Criteria ━━━${NC}"
        echo -e "Component: ${GREEN}$component${NC}"
        echo -e "Tests: ${GREEN}$tests${NC}"
        
        if [ "$is_critical" = "true" ]; then
            echo -e "${RED}⚠️  SECURITY/COMPLIANCE CRITICAL - All criteria MUST pass${NC}"
        fi
        
        echo -e "Reference: ${CYAN}forge-success-criteria/${component}.md${NC}"
    else
        echo -e "${YELLOW}No Success Criteria mapped (domain-specific epic)${NC}"
    fi
    
    echo ""
    
    if [ -f "$tasks_file" ]; then
        echo -e "${GREEN}Tasks File:${NC} epics/$epic_dir/TASKS.md"
        echo ""
        echo -e "${BLUE}Reading first uncompleted task...${NC}"
        echo ""
        # Show the first task header
        head -100 "$tasks_file"
    else
        echo -e "${RED}ERROR: Tasks file not found: $tasks_file${NC}"
        echo -e "${YELLOW}Looking in alternate location...${NC}"
        
        # Check forge/epics directory
        local alt_tasks_file="$PROJECT_ROOT/forge/epics/TASKS-Epic-${epic}*.md"
        if ls $alt_tasks_file 2>/dev/null; then
            echo -e "${GREEN}Found in forge/epics/${NC}"
        else
            echo -e "${YELLOW}Create the TASKS.md file for Epic $epic${NC}"
        fi
    fi
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Instructions:${NC}"
    echo "1. Read the current task from the TASKS.md file"
    echo "2. Note the Success Criteria Reference (if any)"
    echo "3. Implement EXACTLY what the task specifies"
    echo "4. Run verification commands"
    if [ -n "$criteria" ]; then
        echo -e "5. ${CYAN}Run: .forge/agent-bootstrap.sh verify-criteria${NC}"
    fi
    echo "6. Update progress.md when complete"
    echo "7. Commit changes"
    echo "8. EXIT this session"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Verify Success Criteria for current epic
verify_criteria() {
    local epic=$(get_current_epic)
    local criteria=$(get_success_criteria "$epic")
    
    if [ -z "$criteria" ]; then
        echo -e "${YELLOW}No Success Criteria mapped for Epic $epic${NC}"
        return 0
    fi
    
    local component=$(echo "$criteria" | cut -d: -f1)
    local tests=$(echo "$criteria" | cut -d: -f2)
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Verifying Success Criteria for Epic $epic${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "Component: ${CYAN}$component${NC}"
    echo -e "Criteria: ${CYAN}$tests${NC}"
    echo ""
    
    # Check if acceptance test command exists
    if command -v pnpm &> /dev/null; then
        echo -e "${YELLOW}Running acceptance tests...${NC}"
        echo ""
        
        # Run acceptance tests
        if pnpm test:acceptance --criteria="$tests" 2>/dev/null; then
            echo ""
            echo -e "${GREEN}✅ All Success Criteria PASSED${NC}"
        else
            echo ""
            echo -e "${RED}❌ Some Success Criteria FAILED${NC}"
            echo ""
            echo -e "${YELLOW}Review the criteria definitions:${NC}"
            echo "  cat forge-success-criteria/${component}.md"
            echo ""
            echo -e "${YELLOW}Fix issues before marking task complete.${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}pnpm not found. Manual verification required:${NC}"
        echo ""
        echo "1. Review criteria in: forge-success-criteria/${component}.md"
        echo "2. Manually verify each criterion passes"
        echo "3. Document verification in progress.md"
    fi
}

# Validate schema
validate_schema() {
    local schema_name="$1"
    local data_file="$2"
    
    if [ -z "$schema_name" ] || [ -z "$data_file" ]; then
        echo "Usage: .forge/agent-bootstrap.sh validate-schema <schema-name> <data-file>"
        echo ""
        echo "Available schemas:"
        echo "  answer-contract"
        echo "  evidence-pack"
        echo "  rubric"
        echo "  computational-validation  (NEW)"
        return 1
    fi
    
    local schema_file="$SUCCESS_CRITERIA_DIR/schemas/${schema_name}.schema.json"
    
    if [ ! -f "$schema_file" ]; then
        echo -e "${RED}Schema not found: $schema_file${NC}"
        return 1
    fi
    
    if [ ! -f "$data_file" ]; then
        echo -e "${RED}Data file not found: $data_file${NC}"
        return 1
    fi
    
    echo -e "${BLUE}Validating against schema: ${schema_name}${NC}"
    echo ""
    
    if command -v npx &> /dev/null; then
        if npx ajv validate -s "$schema_file" -d "$data_file"; then
            echo ""
            echo -e "${GREEN}✅ Schema validation PASSED${NC}"
        else
            echo ""
            echo -e "${RED}❌ Schema validation FAILED${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}npx not found. Install Node.js and ajv-cli:${NC}"
        echo "  npm install -g ajv-cli"
    fi
}

# Show progress summary
show_progress() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Progress Summary${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [ -f "$PROGRESS_FILE" ]; then
        cat "$PROGRESS_FILE"
    else
        echo "No progress file found. Starting fresh."
    fi
}

# Show Success Criteria alignment (UPDATED with Epic 13/14)
show_alignment() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Epic ↔ Success Criteria Alignment${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "| Epic | Success Criteria | Tests |"
    echo "|------|------------------|-------|"
    echo "| 1 | — | — |"
    echo "| 2 | 01_ANSWER_CONTRACT | AC-01→AC-10 |"
    echo "| 3 | 04_QUALITATIVE_VALIDATION | QV-01→QV-10 |"
    echo "| 3.75 | 09_DATA_PROTECTION ⚠️ | DP-01→DP-10 |"
    echo "| 4 | 05_CONVERGENCE_ENGINE | CE-01→CE-11 |"
    echo "| 5 | — | — |"
    echo "| 6 | — | — |"
    echo "| 7 | 08_RUBRIC_LIBRARY | RL-01→RL-10 |"
    echo "| 8 | 06_EVIDENCE_PACK ⚠️ | EP-01→EP-10 |"
    echo "| 9 | 11_OBSERVABILITY | OB-01→OB-11 |"
    echo "| 10a | 12_HUMAN_REVIEW | HR-01→HR-10 |"
    echo "| 10b | 12_HUMAN_REVIEW | HR-01→HR-10 |"
    echo "| 11 | 10_ORCHESTRATION | OR-01→OR-10 |"
    echo "| 12 | ALL | Full suite |"
    echo -e "| ${MAGENTA}13${NC} | ${MAGENTA}13_GOVERNANCE_GATEWAY ⚠️${NC} | ${MAGENTA}GG-01→GG-52${NC} |"
    echo -e "| ${CYAN}14${NC} | ${CYAN}14_COMPUTATIONAL_ACCURACY${NC} | ${CYAN}CA-01→CA-25${NC} |"
    echo ""
    echo -e "${YELLOW}⚠️ = Security/Compliance Critical${NC}"
    echo ""
    echo -e "${MAGENTA}Epic 13: Governance Gateway${NC} - Agentic SDLC, Zero-Defect Authorization"
    echo -e "${CYAN}Epic 14: Computational Accuracy${NC} - Wolfram API, Citations, Extended Thinking"
    echo ""
    echo "Full alignment: EPIC-SUCCESS-CRITERIA-ALIGNMENT.md"
}

# Move to next epic (UPDATED with Epic 13/14 sequence)
next_epic() {
    local current=$(get_current_epic)
    local next=""
    
    # Verify current epic criteria before moving on
    local criteria=$(get_success_criteria "$current")
    if [ -n "$criteria" ]; then
        echo -e "${YELLOW}Verifying Success Criteria before moving to next epic...${NC}"
        if ! verify_criteria; then
            echo -e "${RED}Cannot proceed: Success Criteria not met for Epic $current${NC}"
            echo -e "${YELLOW}Fix failing criteria before running next-epic${NC}"
            return 1
        fi
    fi
    
    case "$current" in
        1) next="2" ;;
        2) next="3" ;;
        3) next="3.75" ;;
        3.75) next="4" ;;
        4) next="5" ;;
        5) next="6" ;;
        6) next="7" ;;
        7) next="8" ;;
        8) next="9" ;;
        9) next="10a" ;;
        10a) next="10b" ;;
        10b) next="11" ;;
        11) next="12" ;;
        12) next="13" ;;
        13) next="14" ;;
        14) 
            echo -e "${GREEN}🎉 All epics complete!${NC}"
            echo ""
            echo -e "${YELLOW}Running final Success Criteria verification...${NC}"
            echo "pnpm test:acceptance --all"
            echo ""
            echo -e "${GREEN}FORGE B-D Platform build complete!${NC}"
            exit 0
            ;;
    esac
    
    echo "$next" > "$CURRENT_EPIC_FILE"
    echo -e "${GREEN}Moved to Epic $next${NC}"
    
    # Show new epic's Success Criteria
    local new_criteria=$(get_success_criteria "$next")
    if [ -n "$new_criteria" ]; then
        local component=$(echo "$new_criteria" | cut -d: -f1)
        echo ""
        echo -e "${CYAN}New epic Success Criteria: $component${NC}"
        echo -e "Reference: forge-success-criteria/${component}.md"
    fi
    
    # Append to progress
    echo "" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
    echo "" >> "$PROGRESS_FILE"
    echo "## Epic $next Started - $(date '+%Y-%m-%d %H:%M')" >> "$PROGRESS_FILE"
}

# Initialize progress file
init_progress() {
    if [ ! -f "$PROGRESS_FILE" ]; then
        cat > "$PROGRESS_FILE" << 'EOF'
# FORGE B-D Platform - Progress Tracker

## Project Started
- Date: $(date '+%Y-%m-%d')
- Agent: Claude Code
- Success Criteria: forge-success-criteria/ (14 components)

---

## Epic 1: Foundation

### Tasks
- [ ] 1.1.1: Initialize pnpm monorepo
- [ ] 1.1.2: Configure TypeScript 5.x
- [ ] 1.1.3: Set up ESLint + Prettier
- [ ] 1.1.4: Configure Husky
- [ ] 1.2.1: Create packages/core structure
- [ ] 1.2.2: Create shared types
- [ ] 1.2.3: Create logger utility
- [ ] 1.2.4: Create TokenTracker utility
- [ ] 1.3.1: Set up GitHub Actions CI
- [ ] 1.3.2: Configure Turborepo
- [ ] 1.3.3: Create package stubs

### Notes
EOF
        echo -e "${GREEN}Progress file initialized${NC}"
    else
        echo -e "${YELLOW}Progress file already exists${NC}"
    fi
}

# Show help
show_help() {
    echo "Usage: .forge/agent-bootstrap.sh [command]"
    echo ""
    echo "Commands:"
    echo "  task            Show current task (default)"
    echo "  progress        Show progress summary"
    echo "  next-epic       Move to next epic (verifies criteria first)"
    echo "  init            Initialize progress tracking"
    echo ""
    echo "Success Criteria Commands:"
    echo "  verify-criteria     Verify Success Criteria for current epic"
    echo "  validate-schema     Validate data against schema"
    echo "  alignment           Show Epic ↔ Success Criteria mapping"
    echo ""
    echo "Epic Sequence: 1→2→3→3.75→4→5→6→7→8→9→10a→10b→11→12→13→14"
    echo ""
    echo "Examples:"
    echo "  .forge/agent-bootstrap.sh task"
    echo "  .forge/agent-bootstrap.sh verify-criteria"
    echo "  .forge/agent-bootstrap.sh validate-schema evidence-pack output.json"
    echo "  .forge/agent-bootstrap.sh alignment"
    echo ""
    echo "  help            Show this help"
}

# Main command handler
case "${1:-task}" in
    task)
        show_task
        ;;
    progress)
        show_progress
        ;;
    next-epic)
        next_epic
        ;;
    init)
        init_progress
        echo "1" > "$CURRENT_EPIC_FILE"
        ;;
    verify-criteria|verify|vc)
        verify_criteria
        ;;
    validate-schema|vs)
        validate_schema "$2" "$3"
        ;;
    alignment|align)
        show_alignment
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo "Run '.forge/agent-bootstrap.sh help' for usage"
        exit 1
        ;;
esac
