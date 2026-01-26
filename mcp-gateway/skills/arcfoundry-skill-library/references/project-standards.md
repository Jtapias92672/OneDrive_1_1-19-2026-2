---
name: project-standards
description: Create an agents.md file as a "Senior Architect README" that sets opinionated standards for Claude Code. Use when starting new projects, onboarding Claude to existing codebases, establishing coding conventions, or preventing Claude from making non-standard decisions. Claude Code is trained to find and prioritize agents.md automatically.
---

# Project Standards Skill
## The Senior Architect README (agents.md)

**Problem**: Claude Code is an expert Junior who needs a Senior to set standards
**Solution**: Place an `agents.md` file in project root with opinionated constraints

---

## Why agents.md?

Claude Code is trained to:
1. Look for `agents.md` in the project root
2. Prioritize its constraints over general knowledge
3. Follow its patterns without debate

**Think of it as**: The Senior Developer who reviewed your code and wrote down "here's how we do things here."

---

## agents.md Template

```markdown
# Project Agent Guidelines

## Project Identity
- **Name**: [Project Name]
- **Type**: [Web App / CLI Tool / Library / etc.]
- **Primary Language**: [TypeScript / Python / etc.]

## Non-Negotiable Standards

### Code Style
- [Language standard, e.g., "Always use TypeScript strict mode"]
- [Formatting, e.g., "2-space indentation, no semicolons"]
- [Naming, e.g., "camelCase for functions, PascalCase for classes"]

### Architecture
- [Pattern, e.g., "All components must be functional, no class components"]
- [Structure, e.g., "Feature-based folder structure, not type-based"]
- [State, e.g., "Use Zustand for state, no Redux"]

### Dependencies
- [Restrictions, e.g., "No external CSS libraries, use Tailwind only"]
- [Preferences, e.g., "Prefer native fetch over axios"]
- [Prohibitions, e.g., "No moment.js, use date-fns"]

### API Patterns
- [Standard, e.g., "All API calls must use the fetchWrapper in lib/api.ts"]
- [Error handling, e.g., "All errors must be typed with AppError class"]
- [Authentication, e.g., "Include auth token from authStore in all requests"]

## File Organization

```
src/
├── features/          # Feature modules (self-contained)
│   └── [feature]/
│       ├── components/
│       ├── hooks/
│       ├── api.ts
│       └── types.ts
├── shared/            # Shared utilities only
│   ├── components/
│   ├── hooks/
│   └── lib/
└── app/               # App-level configuration
```

## Testing Requirements
- [Coverage, e.g., "All new functions require unit tests"]
- [Location, e.g., "Tests in __tests__ folder adjacent to source"]
- [Naming, e.g., "Test files named [component].test.tsx"]

## Before You Code

1. Read this file completely
2. Check existing patterns in codebase
3. Ask if unsure about a standard
4. Never introduce new patterns without approval

## Common Mistakes to Avoid
- [Mistake 1, e.g., "Don't create new utility files, add to existing"]
- [Mistake 2, e.g., "Don't use inline styles, use Tailwind classes"]
- [Mistake 3, e.g., "Don't import from index files, use direct paths"]
```

---

## Domain-Specific Templates

### For React/Next.js Projects

```markdown
## React Standards

### Components
- Functional components only, no class components
- Use TypeScript interfaces for props, not types
- Export components as named exports, not default

### Hooks
- Custom hooks must start with "use"
- Place in hooks/ folder, one hook per file
- Return objects, not arrays (easier to extend)

### State Management
- Local state: useState for simple, useReducer for complex
- Global state: [Zustand/Redux/Context] only
- Server state: React Query with custom hooks

### Styling
- Tailwind CSS only, no CSS modules or styled-components
- Use cn() helper for conditional classes
- No inline style objects

### Patterns to Follow
\`\`\`tsx
// ✅ Correct component structure
interface ButtonProps {
  variant: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ variant, children, onClick }: ButtonProps) {
  return (
    <button 
      className={cn('px-4 py-2', variant === 'primary' ? 'bg-blue-500' : 'bg-gray-500')}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
\`\`\`
```

### For Python Projects

```markdown
## Python Standards

### Code Style
- Python 3.11+ features allowed
- Type hints required on all functions
- Docstrings in Google style

### Structure
- One class per file (exceptions: small related classes)
- Private functions prefixed with underscore
- Constants in SCREAMING_SNAKE_CASE

### Dependencies
- Use Poetry for dependency management
- Pin exact versions in pyproject.toml
- No requirements.txt

### Testing
- pytest only, no unittest
- Fixtures in conftest.py
- 80% coverage minimum

### Error Handling
\`\`\`python
# ✅ Correct pattern
from app.errors import AppError, ErrorCode

def process_data(data: dict) -> Result:
    if not data:
        raise AppError(ErrorCode.INVALID_INPUT, "Data cannot be empty")
    # ...
\`\`\`
```

### For Mendix/Enterprise Projects

```markdown
## Mendix SDK Standards

### Widget Resolution
- Always resolve layouts using qualified names
- Never assume default layouts exist
- Verify widget availability before instantiation

### Page Structure
- Use LayoutGrid for responsive layouts
- DataView as top-level container for entity-bound pages
- Never nest DataViews unnecessarily

### Naming Conventions
- Page names: [Module]_[Entity]_[Action] (e.g., "Sales_Order_Overview")
- Microflows: ACT_ (actions), SUB_ (submicroflows), VAL_ (validations)
- Entities: PascalCase singular (Order not Orders)

### Prohibited Patterns
- No inline JavaScript in pages
- No direct database queries from pages
- No hardcoded strings (use i18n)
```

---

## Placement and Discovery

### Required Location
```
project-root/
├── agents.md          # ← Claude Code finds this automatically
├── package.json
├── src/
└── ...
```

### Alternative Locations (if needed)
```
project-root/
├── .claude/
│   └── agents.md      # Also discoverable
├── docs/
│   └── AGENTS.md      # Capitalized version
```

---

## Integration with Other Skills

### With Domain Memory Pattern
```
.claude/
├── agents.md          # Standards (static)
├── features.json      # Tasks (dynamic)
├── progress.md        # History (append)
└── BOOTUP-RITUAL.md   # Protocol (static)
```

### Bootup Ritual Addition
```markdown
## Bootup Sequence

1. Read agents.md - understand project standards
2. Read features.json - identify next task
3. Read progress.md - review recent history
4. Check git status - verify clean state
```

---

## Enforcement Tips

### Make Standards Testable
```markdown
## Enforceable Standards

| Standard | Enforcement |
|----------|-------------|
| TypeScript strict | tsconfig.json: "strict": true |
| No console.log | ESLint rule: no-console |
| Import order | ESLint: import/order |
| Test coverage | Jest: coverageThreshold |
```

### Add Slop Tests (see slop-tests skill)
```bash
# Check for common Claude mistakes
grep -r "// TODO" src/ && exit 1
grep -r "console.log" src/ && exit 1
```

---

## Quick Start

1. Create `agents.md` in project root
2. Add your non-negotiable standards
3. Tell Claude Code: "Read agents.md before starting any work"
4. Update as you discover new patterns to enforce

---

*This skill establishes the "Senior Architect" guardrails that keep Claude Code aligned with your project's conventions.*
