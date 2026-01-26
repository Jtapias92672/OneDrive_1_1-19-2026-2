---
name: reasoning-technique-selector
description: >
  Meta-cognitive skill for selecting the appropriate reasoning approach based
  on problem type. Routes between chain-of-thought, tree-of-thought, 
  decomposition, and other techniques.
version: 1.0.0
author: ArcFoundry
triggers:
  - "how should I think about"
  - "reasoning approach"
  - "problem solving method"
---

# Reasoning Technique Selector Skill

## Core Principle

> "Different problems require different thinking strategies."

Not every problem needs chain-of-thought. Some need decomposition, others need
exploration, some need systematic enumeration.

---

## Technique Catalog

### 1. Chain-of-Thought (CoT)

**When**: Sequential reasoning, math, logic

```
Step 1 → Step 2 → Step 3 → Answer
```

**Use for**:
- Mathematical calculations
- Logical deductions
- Causal reasoning

### 2. Tree-of-Thought (ToT)

**When**: Multiple paths to explore, optimization

```
        Start
       /  |  \
     A    B    C
    /\   /\   /\
   A1 A2 B1 B2 C1 C2
```

**Use for**:
- Search problems
- Game playing
- Multi-step planning

### 3. Decomposition

**When**: Complex problems with independent parts

```
Big Problem
├── Subproblem 1 → Solution 1
├── Subproblem 2 → Solution 2
└── Subproblem 3 → Solution 3
                   └── Combine → Final Solution
```

**Use for**:
- Large coding tasks
- System design
- Research synthesis

### 4. Analogical Reasoning

**When**: Novel problem with similar precedents

```
Known Problem → Known Solution
      ↓ (map)
New Problem → New Solution
```

**Use for**:
- Design patterns
- Bug diagnosis
- Strategy transfer

### 5. Systematic Enumeration

**When**: Finite space to explore

```
All possibilities: [A, B, C, D]
Check A: ❌
Check B: ❌
Check C: ✓ → Answer
```

**Use for**:
- Debugging
- Configuration
- Edge case analysis

---

## Selection Decision Tree

```
Is the problem...
├── Sequential/causal? → Chain-of-Thought
├── Multi-path with backtracking? → Tree-of-Thought
├── Large and divisible? → Decomposition
├── Similar to known problem? → Analogical
├── Finite search space? → Systematic Enumeration
└── Unclear? → Start with Chain-of-Thought, switch if stuck
```

---

## Technique Switching

Sometimes you need to switch mid-problem:

```yaml
switch_triggers:
  cot_to_decomposition:
    signal: "Problem too large for single chain"
    action: "Break into subproblems"
    
  cot_to_tot:
    signal: "Multiple viable paths, unclear best"
    action: "Explore branches in parallel"
    
  tot_to_enumeration:
    signal: "Search space is finite and small"
    action: "Systematically check all options"
```

---

## Integration Points

```yaml
integrates_with:
  - exploration-protocol: "Exploration uses multiple techniques"
  - analytics-orchestration: "Query routing uses reasoning selection"
```

---

*This skill ensures the right thinking approach for each problem type.*
