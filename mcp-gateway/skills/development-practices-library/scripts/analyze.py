#!/usr/bin/env python3
"""
Deterministic Data Analyzer
Run this instead of asking Claude to "analyze" data.

Usage:
    python analyze.py data.csv info
    python analyze.py data.csv top_n --column=revenue --n=10
    python analyze.py data.csv sum --column=revenue
    python analyze.py data.csv group_by --group_by=category --aggregate=sales
    python analyze.py data.csv filter --condition="price > 100"
"""

import pandas as pd
import json
import argparse
import sys
from pathlib import Path


def analyze(filepath: str, operation: str, **kwargs) -> dict:
    """Perform deterministic analysis on CSV data."""
    
    # Load data
    path = Path(filepath)
    if not path.exists():
        return {"error": f"File not found: {filepath}"}
    
    if path.suffix.lower() == '.csv':
        df = pd.read_csv(filepath)
    elif path.suffix.lower() in ['.xlsx', '.xls']:
        df = pd.read_excel(filepath)
    elif path.suffix.lower() == '.json':
        df = pd.read_json(filepath)
    else:
        return {"error": f"Unsupported file type: {path.suffix}"}
    
    # Build result object
    results = {
        "file": str(filepath),
        "rows": len(df),
        "columns": list(df.columns),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "operation": operation,
        "result": None
    }
    
    # Execute operation
    try:
        if operation == "info":
            results["result"] = {
                "shape": list(df.shape),
                "memory_mb": round(df.memory_usage(deep=True).sum() / 1024 / 1024, 2),
                "null_counts": df.isnull().sum().to_dict(),
                "sample": df.head(3).to_dict(orient="records")
            }
        
        elif operation == "top_n":
            col = kwargs.get("column")
            n = kwargs.get("n", 10)
            if col not in df.columns:
                return {"error": f"Column '{col}' not found. Available: {list(df.columns)}"}
            results["result"] = df.nlargest(n, col).to_dict(orient="records")
        
        elif operation == "bottom_n":
            col = kwargs.get("column")
            n = kwargs.get("n", 10)
            if col not in df.columns:
                return {"error": f"Column '{col}' not found. Available: {list(df.columns)}"}
            results["result"] = df.nsmallest(n, col).to_dict(orient="records")
        
        elif operation == "sum":
            col = kwargs.get("column")
            if col not in df.columns:
                return {"error": f"Column '{col}' not found. Available: {list(df.columns)}"}
            results["result"] = float(df[col].sum())
        
        elif operation == "mean":
            col = kwargs.get("column")
            if col not in df.columns:
                return {"error": f"Column '{col}' not found. Available: {list(df.columns)}"}
            results["result"] = float(df[col].mean())
        
        elif operation == "stats":
            col = kwargs.get("column")
            if col:
                if col not in df.columns:
                    return {"error": f"Column '{col}' not found. Available: {list(df.columns)}"}
                desc = df[col].describe()
            else:
                desc = df.describe()
            results["result"] = desc.to_dict()
        
        elif operation == "group_by":
            group_col = kwargs.get("group_by")
            agg_col = kwargs.get("aggregate")
            if group_col not in df.columns:
                return {"error": f"Group column '{group_col}' not found. Available: {list(df.columns)}"}
            if agg_col not in df.columns:
                return {"error": f"Aggregate column '{agg_col}' not found. Available: {list(df.columns)}"}
            results["result"] = df.groupby(group_col)[agg_col].sum().to_dict()
        
        elif operation == "filter":
            condition = kwargs.get("condition")
            try:
                filtered = df.query(condition)
                results["result"] = {
                    "matching_rows": len(filtered),
                    "total_rows": len(df),
                    "percentage": round(len(filtered) / len(df) * 100, 2),
                    "sample": filtered.head(5).to_dict(orient="records")
                }
            except Exception as e:
                return {"error": f"Invalid filter condition: {condition}. Error: {str(e)}"}
        
        elif operation == "unique":
            col = kwargs.get("column")
            if col not in df.columns:
                return {"error": f"Column '{col}' not found. Available: {list(df.columns)}"}
            unique_vals = df[col].unique().tolist()
            results["result"] = {
                "unique_count": len(unique_vals),
                "values": unique_vals[:100] if len(unique_vals) > 100 else unique_vals
            }
        
        elif operation == "duplicates":
            subset = kwargs.get("columns", "").split(",") if kwargs.get("columns") else None
            if subset:
                subset = [c.strip() for c in subset]
                for col in subset:
                    if col not in df.columns:
                        return {"error": f"Column '{col}' not found. Available: {list(df.columns)}"}
            dupes = df[df.duplicated(subset=subset, keep=False)]
            results["result"] = {
                "duplicate_rows": len(dupes),
                "sample": dupes.head(10).to_dict(orient="records")
            }
        
        elif operation == "correlate":
            col1 = kwargs.get("column1")
            col2 = kwargs.get("column2")
            if col1 not in df.columns or col2 not in df.columns:
                return {"error": f"Columns not found. Available: {list(df.columns)}"}
            corr = df[col1].corr(df[col2])
            results["result"] = {
                "correlation": float(corr),
                "interpretation": "strong positive" if corr > 0.7 else "strong negative" if corr < -0.7 else "weak" if abs(corr) < 0.3 else "moderate"
            }
        
        else:
            return {"error": f"Unknown operation: {operation}. Available: info, top_n, bottom_n, sum, mean, stats, group_by, filter, unique, duplicates, correlate"}
    
    except Exception as e:
        return {"error": str(e)}
    
    return results


def main():
    parser = argparse.ArgumentParser(description="Deterministic data analyzer")
    parser.add_argument("filepath", help="Path to data file (CSV, Excel, JSON)")
    parser.add_argument("operation", help="Operation to perform")
    parser.add_argument("--column", help="Column for single-column operations")
    parser.add_argument("--column1", help="First column for correlation")
    parser.add_argument("--column2", help="Second column for correlation")
    parser.add_argument("--columns", help="Comma-separated columns for multi-column ops")
    parser.add_argument("--n", type=int, default=10, help="Number of results for top/bottom")
    parser.add_argument("--group_by", help="Column to group by")
    parser.add_argument("--aggregate", help="Column to aggregate")
    parser.add_argument("--condition", help="Filter condition (pandas query syntax)")
    
    args = parser.parse_args()
    
    result = analyze(
        args.filepath,
        args.operation,
        column=args.column,
        column1=args.column1,
        column2=args.column2,
        columns=args.columns,
        n=args.n,
        group_by=args.group_by,
        aggregate=args.aggregate,
        condition=args.condition
    )
    
    print(json.dumps(result, indent=2, default=str))
    
    # Exit with error if there was one
    if "error" in result:
        sys.exit(1)


if __name__ == "__main__":
    main()
