#!/usr/bin/env python3
"""
feature-manager.py
Manage feature_list.json for long-running agent projects

Usage:
  python feature-manager.py status          # Show feature status summary
  python feature-manager.py list            # List all features
  python feature-manager.py next            # Show next feature to work on
  python feature-manager.py pass F001       # Mark feature as passing
  python feature-manager.py fail F001       # Mark feature as failing
  python feature-manager.py add "desc"      # Add new feature
"""

import json
import sys
from datetime import datetime
from pathlib import Path

FEATURE_FILE = "feature_list.json"


def load_features():
    """Load feature list from JSON file."""
    if not Path(FEATURE_FILE).exists():
        print(f"❌ Error: {FEATURE_FILE} not found")
        print("Run setup-long-running-project.sh first")
        sys.exit(1)
    
    with open(FEATURE_FILE, 'r') as f:
        return json.load(f)


def save_features(data):
    """Save feature list to JSON file."""
    data['metadata']['last_updated'] = datetime.now().isoformat()
    data['metadata']['total_features'] = len(data['features'])
    data['metadata']['passing'] = sum(1 for f in data['features'] if f.get('passes', False))
    data['metadata']['failing'] = data['metadata']['total_features'] - data['metadata']['passing']
    
    with open(FEATURE_FILE, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"✅ Saved {FEATURE_FILE}")


def cmd_status():
    """Show feature status summary."""
    data = load_features()
    meta = data.get('metadata', {})
    features = data.get('features', [])
    
    total = len(features)
    passing = sum(1 for f in features if f.get('passes', False))
    failing = total - passing
    
    print("\n📊 Feature Status Summary")
    print("=" * 40)
    print(f"Project: {data.get('project', 'Unknown')}")
    print(f"Total Features: {total}")
    print(f"✅ Passing: {passing} ({100*passing//total if total else 0}%)")
    print(f"❌ Failing: {failing} ({100*failing//total if total else 0}%)")
    print(f"Last Updated: {meta.get('last_updated', 'Unknown')}")
    print()
    
    # Progress bar
    if total > 0:
        bar_width = 30
        filled = int(bar_width * passing / total)
        bar = "█" * filled + "░" * (bar_width - filled)
        print(f"Progress: [{bar}] {100*passing//total}%")
    print()


def cmd_list():
    """List all features."""
    data = load_features()
    features = data.get('features', [])
    
    print("\n📋 Feature List")
    print("=" * 60)
    
    for f in features:
        status = "✅" if f.get('passes', False) else "❌"
        priority = f.get('priority', 999)
        fid = f.get('id', '???')
        desc = f.get('description', 'No description')[:50]
        print(f"{status} [{fid}] P{priority}: {desc}")
    
    print()


def cmd_next():
    """Show next feature to work on."""
    data = load_features()
    features = data.get('features', [])
    
    # Find highest priority failing feature
    failing = [f for f in features if not f.get('passes', False)]
    if not failing:
        print("\n🎉 All features are passing!")
        return
    
    # Sort by priority
    failing.sort(key=lambda x: x.get('priority', 999))
    next_feature = failing[0]
    
    print("\n🎯 Next Feature to Implement")
    print("=" * 60)
    print(f"ID: {next_feature.get('id', '???')}")
    print(f"Priority: {next_feature.get('priority', '???')}")
    print(f"Category: {next_feature.get('category', '???')}")
    print(f"Description: {next_feature.get('description', 'No description')}")
    print()
    print("Steps:")
    for i, step in enumerate(next_feature.get('steps', []), 1):
        print(f"  {i}. {step}")
    print()
    print(f"Remaining failing features: {len(failing)}")
    print()


def cmd_pass(feature_id):
    """Mark a feature as passing."""
    data = load_features()
    
    for f in data['features']:
        if f.get('id') == feature_id:
            if f.get('passes', False):
                print(f"⚠️  {feature_id} is already passing")
                return
            f['passes'] = True
            save_features(data)
            print(f"✅ Marked {feature_id} as PASSING")
            return
    
    print(f"❌ Feature {feature_id} not found")


def cmd_fail(feature_id):
    """Mark a feature as failing."""
    data = load_features()
    
    for f in data['features']:
        if f.get('id') == feature_id:
            if not f.get('passes', False):
                print(f"⚠️  {feature_id} is already failing")
                return
            f['passes'] = False
            save_features(data)
            print(f"❌ Marked {feature_id} as FAILING")
            return
    
    print(f"❌ Feature {feature_id} not found")


def cmd_add(description):
    """Add a new feature."""
    data = load_features()
    features = data.get('features', [])
    
    # Generate new ID
    existing_ids = [f.get('id', '') for f in features]
    for i in range(1, 1000):
        new_id = f"F{i:03d}"
        if new_id not in existing_ids:
            break
    
    # Determine priority (after existing features)
    max_priority = max((f.get('priority', 0) for f in features), default=0)
    
    new_feature = {
        "id": new_id,
        "category": "functional",
        "priority": max_priority + 1,
        "description": description,
        "steps": [
            "Implement the feature",
            "Test the feature end-to-end",
            "Verify no regressions"
        ],
        "passes": False
    }
    
    data['features'].append(new_feature)
    save_features(data)
    print(f"✅ Added feature {new_id}: {description}")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    cmd = sys.argv[1].lower()
    
    if cmd == "status":
        cmd_status()
    elif cmd == "list":
        cmd_list()
    elif cmd == "next":
        cmd_next()
    elif cmd == "pass" and len(sys.argv) >= 3:
        cmd_pass(sys.argv[2].upper())
    elif cmd == "fail" and len(sys.argv) >= 3:
        cmd_fail(sys.argv[2].upper())
    elif cmd == "add" and len(sys.argv) >= 3:
        cmd_add(" ".join(sys.argv[2:]))
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
