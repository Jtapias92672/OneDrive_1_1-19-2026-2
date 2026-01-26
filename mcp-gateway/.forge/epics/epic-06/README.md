# Epic 06: React Generator

## Status: COMPLETE

**Completed:** 2026-01-24

## Overview

The React Generator transforms parsed Figma designs into production-ready React components. It bridges the gap between design and code by converting Figma's visual hierarchy, styles, and component definitions into clean, typed React code.

## Package Location

```
packages/react-generator/
```

## Features

### Styling Approaches
- **Tailwind CSS** - Generates utility classes (default)
- **CSS Modules** - Scoped CSS with `.module.css` files
- **styled-components** - CSS-in-JS templates
- **Emotion** - Alternative CSS-in-JS
- **SASS/SCSS** - Preprocessor support
- **Inline styles** - Direct style objects
- **Vanilla CSS** - Plain CSS files

### Output Formats
- Functional components (arrow functions)
- Function declarations
- forwardRef wrapped components
- TypeScript or JavaScript

### Generated Artifacts
- React components with props
- TypeScript interfaces for props
- Style files (based on styling approach)
- Barrel index files
- Optional Storybook stories
- Optional unit tests

## Architecture

```
src/
├── core/
│   ├── generator.ts    # Main orchestrator
│   ├── types.ts        # Type definitions
│   └── index.ts
├── styles/
│   ├── style-generator.ts  # Style extraction & generation
│   └── index.ts
├── components/
│   ├── component-builder.ts  # JSX generation
│   └── index.ts
└── utils/
    ├── name-utils.ts    # Naming conventions
    ├── code-formatter.ts # Code formatting
    └── index.ts
```

## Usage

```typescript
import { ReactGenerator, TAILWIND_PRESET } from '@forge/react-generator';

// Create generator with Tailwind preset
const generator = new ReactGenerator(TAILWIND_PRESET);

// Generate from parsed Figma design (from Epic 05)
const result = await generator.generate(parsedDesign);

// Access generated components
result.components.forEach(component => {
  console.log(component.name);
  console.log(component.code);
  console.log(component.styleCode);
});
```

## Configuration

```typescript
interface ReactGeneratorConfig {
  outputFormat: 'functional' | 'function' | 'class' | 'forwardRef';
  stylingApproach: 'tailwind' | 'css-modules' | 'styled-components' | 'emotion' | 'inline' | 'sass' | 'vanilla';
  typescript: boolean;
  namingConvention: 'PascalCase' | 'camelCase' | 'kebab-case' | 'snake_case';
  generatePropTypes: boolean;
  generateStories: boolean;
  generateTests: boolean;
  componentLibrary?: 'none' | 'chakra-ui' | 'material-ui' | 'ant-design' | 'shadcn' | 'radix';
  breakpoints?: Breakpoints;
  formatting?: FormattingOptions;
}
```

## Presets

- `TAILWIND_PRESET` - Tailwind + TypeScript + functional components
- `CSS_MODULES_PRESET` - CSS Modules + TypeScript
- `STYLED_COMPONENTS_PRESET` - styled-components + TypeScript
- `JAVASCRIPT_PRESET` - No TypeScript
- `FULL_PRESET` - With stories and tests

## Pipeline Integration

```
Figma API
    │
    ▼
┌─────────────────────┐
│  Epic 05            │
│  Figma Parser       │
│  ─────────────────  │
│  Output: ParsedDesign│
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  Epic 06            │
│  React Generator    │
│  ─────────────────  │
│  Output: React Code │
└─────────────────────┘
    │
    ▼
  React Components
  + Styles
  + Types
```

## Metrics

- **Lines of Code:** ~3,700
- **Test Coverage:** 16 tests passing
- **Build Output:** ~67 KB (CJS + ESM)

## Files

| File | Lines | Purpose |
|------|-------|---------|
| core/types.ts | 499 | Type definitions |
| core/generator.ts | 852 | Main generator class |
| styles/style-generator.ts | 823 | Style extraction |
| components/component-builder.ts | 612 | JSX building |
| utils/name-utils.ts | 287 | Naming utilities |
| utils/code-formatter.ts | 445 | Code formatting |
| index.ts | 178 | Public exports |

## Testing

```bash
cd packages/react-generator
npm test                  # Run tests
npm run test:coverage     # With coverage
npm run build            # Build package
npm run typecheck        # Type check
```

## Dependencies

- No runtime dependencies (pure TypeScript)
- Peer dependency: React >= 17.0.0
