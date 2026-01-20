# Epic 6 Initialization: React Code Generator

**Read Time:** 2 minutes | **Context Load:** ~12K tokens

---

## What Was Built (Epic 5: Figma Parser)

- ✅ **FigmaClient**: API client with OAuth and caching
- ✅ **Design Token Extractor**: Colors, typography, spacing, shadows
- ✅ **Component Detector**: Classifies buttons, inputs, layouts, etc.
- ✅ **Layout Analyzer**: Auto Layout → Flexbox/Grid mapping
- ✅ **Component Tree Builder**: Hierarchical structure
- ✅ **Semantic Analyzer**: Infers HTML elements and ARIA roles

---

## Key Imports Available

```typescript
import { 
  FigmaParser,
  ParsedDesign,
  ComponentTree,
  ComponentNode,
  DesignTokens,
  LayoutAnalysis,
  SemanticAnalysis
} from '@forge/figma-parser';

// Parse a Figma file
const parser = new FigmaParser();
const design: ParsedDesign = await parser.parse(figmaFileUrl);

// Access parsed data
design.pages       // Page hierarchy
design.components  // Component definitions
design.tokens      // Design system tokens
```

---

## Data Structures You're Consuming

```typescript
interface ComponentNode {
  id: string;
  name: string;
  type: 'button' | 'input' | 'card' | 'container' | ...;
  children?: ComponentNode[];
  layout: LayoutAnalysis;    // flex, grid, absolute
  styles: StyleInfo;         // colors, fonts, spacing
  semantic: SemanticAnalysis; // HTML element, ARIA
}

interface DesignTokens {
  colors: {
    primary: Record<string, string>;
    secondary: Record<string, string>;
    neutral: Record<string, string>;
  };
  typography: Record<string, TypographyStyle>;
  spacing: number[];
  shadows: string[];
  radii: number[];
}
```

---

## Your Mission (Epic 6)

Build the **React Code Generator** - transforms parsed Figma designs into:
- React functional components (TypeScript)
- Tailwind CSS styling
- Proper TypeScript prop interfaces
- Accessibility attributes (ARIA)
- Component variants from Figma variants

**This is the OUTPUT side of Figma → Code.**

---

## DO NOT

- ❌ Load Figma API code (you just import ParsedDesign)
- ❌ Re-parse Figma files (already done by Epic 5)
- ❌ Load all components at once (process incrementally)
- ❌ Generate custom CSS (use Tailwind)
- ❌ Stay in session longer than ONE task

---

## DO

- ✅ Create `packages/react-generator/` package
- ✅ Build component templates (Button, Input, Card, etc.)
- ✅ Map ComponentNode → React functional component
- ✅ Map DesignTokens → Tailwind config
- ✅ Generate TypeScript prop interfaces
- ✅ Generate accessibility attributes
- ✅ ONE task per session, then EXIT

---

## Token Budget

- **Per-task:** 5-8K tokens
- **Epic total:** 60K tokens across ~12 tasks

---

## First Steps

1. Read: `.forge/epics/epic-06-react-generator/TASKS.md`
2. Start: Task 6.1.1 (Create ReactGenerator class skeleton)
3. Update: `progress.md` when task complete
4. EXIT session

---

## Generation Pattern

```typescript
// ❌ BAD: Generate everything at once
function generateAll(tree: ComponentTree): string {
  return tree.roots.map(page => generatePage(page)).join('\n');
  // Returns 100K token string 🔴
}

// ✅ GOOD: Generate incrementally
function* generateComponents(tree: ComponentTree): Generator<GeneratedFile> {
  for (const component of tree.components) {
    yield generateComponent(component);  // One at a time
  }
}
```

---

## Style Translation: Figma → Tailwind

```typescript
// Input from Figma parser
const figmaNode = {
  fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96 } }],
  cornerRadius: 8,
  layoutMode: 'HORIZONTAL',
  itemSpacing: 16,
  paddingLeft: 24,
};

// Your generator produces:
const tailwindClasses = "bg-blue-500 rounded-lg flex flex-row gap-4 pl-6";
```

---

## Component Generation Example

**Input (ParsedComponent):**
```typescript
{
  name: "PrimaryButton",
  type: "button",
  variants: { size: ['sm', 'md', 'lg'], disabled: [true, false] },
  styles: { bg: '#3B82F6', text: '#FFFFFF', radius: 8 },
  semantic: { element: 'button', interactive: true }
}
```

**Output (React Component):**
```typescript
interface PrimaryButtonProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
}

export function PrimaryButton({ 
  children, 
  size = 'md', 
  disabled = false,
  onClick 
}: PrimaryButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "bg-blue-500 text-white rounded-lg",
        size === 'sm' && "px-3 py-1 text-sm",
        size === 'md' && "px-4 py-2",
        size === 'lg' && "px-6 py-3 text-lg",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}
```

---

## What Epic 10 Needs From You

```typescript
import { 
  ReactGenerator,
  GeneratedComponent,
  GeneratedProject
} from '@forge/react-generator';

// Generate from parsed design
const generator = new ReactGenerator();
const project: GeneratedProject = await generator.generate(parsedDesign);

// project.components: GeneratedComponent[]
// project.tokens: TailwindConfig
// project.pages: GeneratedPage[]
```

---

## Key Files (Reference Only)

- `packages/figma-parser/src/types.ts` - Input types
- `packages/figma-parser/src/output/schema.ts` - ParsedDesign structure
