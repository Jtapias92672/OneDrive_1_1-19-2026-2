---
name: deterministic-scripts
description: Use programmatic scripts for calculations and analysis instead of LLM reasoning. Use when analyzing data, processing CSVs, performing mathematical operations, counting items, comparing files, or any task requiring deterministic accuracy. The LLM decides WHAT to calculate; scripts do the actual calculating.
---

# Deterministic Scripts Skill
## Probabilistic Reasoning → Deterministic Execution

**Core Rule**: Don't ask Claude to "analyze this data." Build a script Claude can run.

---

## The Problem

LLMs are probabilistic. When you ask Claude to:
- Count rows in a CSV → It will estimate or hallucinate
- Calculate totals → It will approximate
- Compare file structures → It will miss differences

---

## The Solution: Scripts as Tools

### Pattern: LLM Decides WHAT, Script Does HOW

```
❌ WRONG: "Claude, analyze this 5,000-line CSV and tell me the top 10 products by revenue"

✅ RIGHT: "Claude, write a script to find top 10 products by revenue, then run it"
```

---

## Script Templates

### Template 1: CSV/Data Analysis

```python
#!/usr/bin/env python3
"""Deterministic CSV analyzer - run, don't reason."""
import pandas as pd
import sys
import json

def analyze(filepath, operation, **kwargs):
    df = pd.read_csv(filepath)
    
    results = {
        "file": filepath,
        "rows": len(df),
        "columns": list(df.columns),
        "operation": operation,
        "result": None
    }
    
    if operation == "top_n":
        col = kwargs.get("column")
        n = kwargs.get("n", 10)
        results["result"] = df.nlargest(n, col).to_dict(orient="records")
    
    elif operation == "sum":
        col = kwargs.get("column")
        results["result"] = float(df[col].sum())
    
    elif operation == "group_by":
        group_col = kwargs.get("group_by")
        agg_col = kwargs.get("aggregate")
        results["result"] = df.groupby(group_col)[agg_col].sum().to_dict()
    
    elif operation == "filter":
        condition = kwargs.get("condition")  # e.g., "price > 100"
        filtered = df.query(condition)
        results["result"] = {
            "matching_rows": len(filtered),
            "sample": filtered.head(5).to_dict(orient="records")
        }
    
    print(json.dumps(results, indent=2, default=str))
    return results

if __name__ == "__main__":
    # Usage: python analyze.py data.csv top_n --column=revenue --n=10
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("filepath")
    parser.add_argument("operation")
    parser.add_argument("--column", default=None)
    parser.add_argument("--n", type=int, default=10)
    parser.add_argument("--group_by", default=None)
    parser.add_argument("--aggregate", default=None)
    parser.add_argument("--condition", default=None)
    args = parser.parse_args()
    analyze(args.filepath, args.operation, **vars(args))
```

### Template 2: File Comparison

```python
#!/usr/bin/env python3
"""Deterministic file diff - exact comparison, no guessing."""
import hashlib
import json
from pathlib import Path

def compare_files(file1, file2):
    """Return exact differences between two files."""
    results = {
        "file1": str(file1),
        "file2": str(file2),
        "identical": False,
        "differences": []
    }
    
    with open(file1, 'r') as f1, open(file2, 'r') as f2:
        lines1 = f1.readlines()
        lines2 = f2.readlines()
    
    results["file1_lines"] = len(lines1)
    results["file2_lines"] = len(lines2)
    
    max_lines = max(len(lines1), len(lines2))
    for i in range(max_lines):
        l1 = lines1[i] if i < len(lines1) else "<missing>"
        l2 = lines2[i] if i < len(lines2) else "<missing>"
        if l1 != l2:
            results["differences"].append({
                "line": i + 1,
                "file1": l1.strip()[:100],
                "file2": l2.strip()[:100]
            })
    
    results["identical"] = len(results["differences"]) == 0
    results["diff_count"] = len(results["differences"])
    
    print(json.dumps(results, indent=2))
    return results

if __name__ == "__main__":
    import sys
    compare_files(sys.argv[1], sys.argv[2])
```

### Template 3: Code Quality Check

```python
#!/usr/bin/env python3
"""Deterministic code analyzer - facts not opinions."""
import ast
import json
from pathlib import Path

def analyze_python(filepath):
    """Extract factual metrics from Python file."""
    with open(filepath) as f:
        content = f.read()
    
    results = {
        "file": str(filepath),
        "lines_total": len(content.splitlines()),
        "lines_code": 0,
        "lines_comment": 0,
        "lines_blank": 0,
        "functions": [],
        "classes": [],
        "imports": [],
        "todos": []
    }
    
    for i, line in enumerate(content.splitlines(), 1):
        stripped = line.strip()
        if not stripped:
            results["lines_blank"] += 1
        elif stripped.startswith("#"):
            results["lines_comment"] += 1
            if "TODO" in stripped.upper():
                results["todos"].append({"line": i, "text": stripped})
        else:
            results["lines_code"] += 1
    
    try:
        tree = ast.parse(content)
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                results["functions"].append({
                    "name": node.name,
                    "line": node.lineno,
                    "args": len(node.args.args)
                })
            elif isinstance(node, ast.ClassDef):
                results["classes"].append({
                    "name": node.name,
                    "line": node.lineno
                })
            elif isinstance(node, (ast.Import, ast.ImportFrom)):
                results["imports"].append(node.lineno)
    except SyntaxError as e:
        results["syntax_error"] = str(e)
    
    print(json.dumps(results, indent=2))
    return results

if __name__ == "__main__":
    import sys
    analyze_python(sys.argv[1])
```

---

## Decision Framework

| Task Type | Use Script? | Reason |
|-----------|-------------|--------|
| Count rows/items | ✅ YES | LLM will estimate |
| Sum/average numbers | ✅ YES | Math must be exact |
| Find duplicates | ✅ YES | Need 100% accuracy |
| Compare structures | ✅ YES | Can't miss differences |
| Explain code | ❌ NO | LLM reasoning is appropriate |
| Generate code | ❌ NO | LLM creativity needed |
| Suggest approach | ❌ NO | Strategy is LLM's job |

---

## Workflow

### Step 1: Identify the Need
```
User: "Analyze my sales.csv and find trends"

Claude thinks: This involves numbers → I need a script
```

### Step 2: Write the Script
```python
# Create analysis script specific to the task
```

### Step 3: Execute and Report
```bash
python analyze.py sales.csv top_n --column=revenue --n=10
```

### Step 4: Interpret Results
```
Claude interprets the DETERMINISTIC output, not the raw data
```

---

## Project Integration

### Add to CLAUDE.md or agents.md:

```markdown
## Deterministic Analysis Rule

For any task involving:
- Counting items
- Mathematical operations
- File comparisons
- Data filtering/aggregation

REQUIRE: Write and execute a script. 
PROHIBIT: Reasoning about numbers or counts directly.

Scripts location: scripts/analysis/
```

---

## Anti-Patterns to Avoid

```
❌ "Looking at the CSV, I can see approximately 500 rows..."
❌ "The total revenue appears to be around $1.2M..."
❌ "There seem to be about 15 differences between these files..."
❌ "Based on my analysis of the data..."

✅ "Running the analysis script: `python analyze.py data.csv sum --column=revenue`"
✅ "Script output: {'rows': 487, 'total_revenue': 1198234.56}"
```

---

## Key Principle

**The LLM's job is to ORCHESTRATE, not CALCULATE.**

- LLM: "I need to find the top products" → Writes script
- Script: Performs exact calculation → Returns facts
- LLM: Interprets results → Explains to user

---

*This skill moves the agent from "probabilistic guessing" to "deterministic certainty" for analytical tasks.*
