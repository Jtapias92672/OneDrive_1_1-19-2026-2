#!/bin/bash
# setup-long-running-project.sh
# Run this to initialize a new long-running agent project

set -e

PROJECT_NAME="${1:-my-project}"
echo "🚀 Setting up long-running agent project: $PROJECT_NAME"

# Create project directory
mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME"

# Initialize git
git init
echo "✅ Git repository initialized"

# Create feature list template
cat > feature_list.json << 'EOF'
{
  "project": "PROJECT_NAME_PLACEHOLDER",
  "features": [
    {
      "id": "F001",
      "category": "setup",
      "priority": 1,
      "description": "Basic project structure is in place",
      "steps": [
        "Verify all required directories exist",
        "Check configuration files are present",
        "Confirm dependencies are listed"
      ],
      "passes": false
    }
  ],
  "metadata": {
    "total_features": 1,
    "passing": 0,
    "failing": 1,
    "created": "TIMESTAMP_PLACEHOLDER",
    "last_updated": "TIMESTAMP_PLACEHOLDER"
  }
}
EOF

# Replace placeholders
sed -i "s/PROJECT_NAME_PLACEHOLDER/$PROJECT_NAME/g" feature_list.json
sed -i "s/TIMESTAMP_PLACEHOLDER/$(date -Iseconds)/g" feature_list.json
echo "✅ Created feature_list.json"

# Create progress file
cat > claude-progress.txt << EOF
# Claude Progress Log

## Project: $PROJECT_NAME
## Created: $(date)

---

### Session 0 - $(date)
**Agent**: Setup Script
**Type**: Initialization

#### Completed:
- Created project directory structure
- Initialized git repository
- Created feature_list.json template
- Created claude-progress.txt
- Created init.sh script

#### Next Steps:
- Run Initializer Agent to expand feature list
- Begin implementing features incrementally

---

EOF
echo "✅ Created claude-progress.txt"

# Create init script
cat > init.sh << 'EOF'
#!/bin/bash
# init.sh - Start development environment
# Run this at the beginning of each agent session

set -e

echo "🔧 Starting development environment..."

# Check for package.json (Node.js project)
if [ -f "package.json" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install 2>/dev/null || yarn install 2>/dev/null || true
    
    # Start dev server if script exists
    if grep -q '"dev"' package.json; then
        echo "🚀 Starting development server..."
        npm run dev &
        sleep 3
    fi
fi

# Check for requirements.txt (Python project)
if [ -f "requirements.txt" ]; then
    echo "🐍 Installing Python dependencies..."
    pip install -r requirements.txt 2>/dev/null || pip3 install -r requirements.txt 2>/dev/null || true
fi

# Check for Cargo.toml (Rust project)
if [ -f "Cargo.toml" ]; then
    echo "🦀 Building Rust project..."
    cargo build 2>/dev/null || true
fi

echo ""
echo "✅ Environment ready!"
echo ""
echo "Next steps for agent:"
echo "1. Read claude-progress.txt"
echo "2. Read feature_list.json"
echo "3. Run git log --oneline -10"
echo "4. Verify basic functionality"
echo "5. Select ONE failing feature to implement"
EOF

chmod +x init.sh
echo "✅ Created init.sh"

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
__pycache__/
*.pyc
.env
.env.local
dist/
build/
*.log
.DS_Store
EOF
echo "✅ Created .gitignore"

# Initial commit
git add .
git commit -m "Initial project setup for long-running agent workflow"
echo "✅ Initial git commit created"

echo ""
echo "======================================"
echo "✅ Project setup complete!"
echo "======================================"
echo ""
echo "Next: Run the Initializer Agent to:"
echo "  1. Expand feature_list.json with all required features"
echo "  2. Set up project-specific init.sh"
echo "  3. Create initial project structure"
echo ""
