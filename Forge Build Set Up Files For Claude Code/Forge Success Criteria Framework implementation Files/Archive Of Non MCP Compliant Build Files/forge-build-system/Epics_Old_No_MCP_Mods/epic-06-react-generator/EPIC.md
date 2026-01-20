# Epic 6: React Code Generator

**Duration:** 5 days  
**Token Budget:** 60K tokens  
**Status:** Not Started  
**Dependencies:** Epic 5 (Figma Parser), Epic 2 (Answer Contract)

---

## Epic Goal

Build a React code generator that transforms parsed Figma designs into production-ready React components with TypeScript, Tailwind CSS, and proper accessibility.

---

## User Stories

### US-6.1: Component Code Generation
**As a** platform user  
**I want** React components generated from parsed designs  
**So that** I get working code from my Figma files

**Acceptance Criteria:**
- [ ] Generate functional React components
- [ ] TypeScript with proper prop types
- [ ] Tailwind CSS for styling
- [ ] Proper component hierarchy
- [ ] Clean, readable code output

**Generator Architecture:**
```typescript
// packages/react-generator/src/generator.ts
export class ReactGenerator {
  async generate(design: ParsedDesign, options: GeneratorOptions): Promise<GeneratedCode> {
    const components: GeneratedComponent[] = [];
    
    // Generate design tokens first
    const tokens = this.generateTokens(design.tokens, options);
    
    // Generate components from parsed frames
    for (const component of design.components) {
      const generated = await this.generateComponent(component, design, options);
      components.push(generated);
    }
    
    // Generate page components
    for (const page of design.pages) {
      for (const frame of page.frames) {
        const pageComponent = await this.generatePageComponent(frame, design, options);
        components.push(pageComponent);
      }
    }
    
    return {
      components,
      tokens,
      index: this.generateIndex(components),
      packageJson: this.generatePackageJson(options),
    };
  }
  
  private async generateComponent(
    component: ParsedComponent,
    design: ParsedDesign,
    options: GeneratorOptions
  ): Promise<GeneratedComponent> {
    const code = this.buildComponentCode(component, design);
    const types = this.buildComponentTypes(component);
    const tests = options.generateTests ? this.buildComponentTests(component) : null;
    
    return {
      name: this.toComponentName(component.name),
      code,
      types,
      tests,
      storybook: options.generateStorybook ? this.buildStorybook(component) : null,
    };
  }
}
```

---

### US-6.2: Layout-to-Flexbox/Grid Translation
**As a** platform user  
**I want** Figma layouts translated to CSS correctly  
**So that** the generated UI matches the design

**Acceptance Criteria:**
- [ ] Auto Layout → Flexbox
- [ ] Figma constraints → CSS positioning
- [ ] Gap, padding, margin translation
- [ ] Responsive breakpoints where detectable

**Layout Translation:**
```typescript
// packages/react-generator/src/translators/layout.ts
export class LayoutTranslator {
  translate(layout: LayoutAnalysis): TailwindClasses {
    const classes: string[] = [];
    
    switch (layout.strategy) {
      case 'flex-row':
        classes.push('flex', 'flex-row');
        break;
      case 'flex-column':
        classes.push('flex', 'flex-col');
        break;
      case 'grid':
        classes.push('grid');
        if (layout.properties.columns) {
          classes.push(`grid-cols-${layout.properties.columns}`);
        }
        break;
    }
    
    // Justify content
    if (layout.properties.justify) {
      classes.push(this.translateJustify(layout.properties.justify));
    }
    
    // Align items
    if (layout.properties.align) {
      classes.push(this.translateAlign(layout.properties.align));
    }
    
    // Gap
    if (layout.properties.gap) {
      classes.push(this.translateGap(layout.properties.gap));
    }
    
    // Padding
    if (layout.properties.padding) {
      classes.push(...this.translatePadding(layout.properties.padding));
    }
    
    return classes;
  }
  
  private translateJustify(value: string): string {
    const map: Record<string, string> = {
      'start': 'justify-start',
      'center': 'justify-center',
      'end': 'justify-end',
      'space-between': 'justify-between',
      'space-around': 'justify-around',
    };
    return map[value] || 'justify-start';
  }
  
  private translateGap(pixels: number): string {
    const spacing = Math.round(pixels / 4);
    return `gap-${spacing}`;
  }
}
```

---

### US-6.3: Style-to-Tailwind Translation
**As a** platform user  
**I want** Figma styles translated to Tailwind classes  
**So that** I can use utility-first CSS

**Acceptance Criteria:**
- [ ] Colors → Tailwind color classes or CSS variables
- [ ] Typography → font-*, text-* classes
- [ ] Borders, shadows, effects
- [ ] Custom values via arbitrary values syntax

**Style Translation:**
```typescript
// packages/react-generator/src/translators/styles.ts
export class StyleTranslator {
  translate(styles: NodeStyles, tokens: DesignTokens): TailwindClasses {
    const classes: string[] = [];
    
    // Background
    if (styles.backgroundColor) {
      classes.push(this.translateColor('bg', styles.backgroundColor, tokens));
    }
    
    // Text color
    if (styles.textColor) {
      classes.push(this.translateColor('text', styles.textColor, tokens));
    }
    
    // Typography
    if (styles.typography) {
      classes.push(...this.translateTypography(styles.typography));
    }
    
    // Border
    if (styles.border) {
      classes.push(...this.translateBorder(styles.border, tokens));
    }
    
    // Border radius
    if (styles.borderRadius) {
      classes.push(this.translateRadius(styles.borderRadius));
    }
    
    // Shadow
    if (styles.shadow) {
      classes.push(this.translateShadow(styles.shadow, tokens));
    }
    
    return classes;
  }
  
  private translateColor(prefix: string, color: Color, tokens: DesignTokens): string {
    // Check if color matches a token
    const tokenMatch = tokens.colors.find(t => 
      this.colorEquals(t.value, color)
    );
    
    if (tokenMatch) {
      return `${prefix}-${tokenMatch.name}`;
    }
    
    // Use arbitrary value
    return `${prefix}-[${this.colorToHex(color)}]`;
  }
  
  private translateTypography(typo: TypographyStyle): string[] {
    const classes: string[] = [];
    
    // Font size
    classes.push(this.translateFontSize(typo.fontSize));
    
    // Font weight
    classes.push(this.translateFontWeight(typo.fontWeight));
    
    // Line height
    if (typo.lineHeight) {
      classes.push(this.translateLineHeight(typo.lineHeight));
    }
    
    // Letter spacing
    if (typo.letterSpacing) {
      classes.push(this.translateLetterSpacing(typo.letterSpacing));
    }
    
    return classes;
  }
}
```

---

### US-6.4: Accessibility Attributes
**As a** platform user  
**I want** proper accessibility attributes generated  
**So that** the UI is accessible by default

**Acceptance Criteria:**
- [ ] Semantic HTML elements from analysis
- [ ] ARIA roles and labels
- [ ] Alt text for images
- [ ] Focus management for interactive elements
- [ ] Keyboard navigation support

**Accessibility Generator:**
```typescript
// packages/react-generator/src/generators/accessibility.ts
export class AccessibilityGenerator {
  generate(semantic: SemanticAnalysis, content: FrameContent): AccessibilityProps {
    const props: AccessibilityProps = {};
    
    // Role if not implicit from element
    if (semantic.ariaRole && !this.isImplicitRole(semantic.htmlElement, semantic.ariaRole)) {
      props.role = semantic.ariaRole;
    }
    
    // Label
    if (semantic.ariaLabel) {
      props['aria-label'] = semantic.ariaLabel;
    } else if (content.textContent && semantic.interactive) {
      props['aria-label'] = content.textContent;
    }
    
    // Interactive elements
    if (semantic.interactive) {
      props.tabIndex = 0;
      
      if (semantic.type === 'button') {
        props.type = 'button';
      }
    }
    
    // Images
    if (semantic.type === 'image') {
      props.alt = content.description || '';
    }
    
    return props;
  }
  
  generateFocusManagement(component: ParsedComponent): string {
    if (!this.hasInteractiveChildren(component)) return '';
    
    return `
  const focusRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    // Focus first interactive element on mount if needed
  }, []);
    `;
  }
}
```

---

### US-6.5: Component Props & Variants
**As a** platform user  
**I want** Figma variants translated to component props  
**So that** generated components are flexible

**Acceptance Criteria:**
- [ ] Figma variants → TypeScript union types
- [ ] Boolean properties → boolean props
- [ ] Instance swaps → slot props
- [ ] Default values from Figma defaults

**Props Generation:**
```typescript
// packages/react-generator/src/generators/props.ts
export class PropsGenerator {
  generate(component: ParsedComponent): GeneratedProps {
    const props: PropDefinition[] = [];
    
    // From variants
    if (component.variants) {
      for (const [name, variant] of component.variants) {
        props.push(this.variantToProp(name, variant));
      }
    }
    
    // From component properties
    for (const prop of component.props) {
      props.push(this.componentPropToTypeProp(prop));
    }
    
    // Standard props
    props.push({
      name: 'className',
      type: 'string',
      optional: true,
      description: 'Additional CSS classes',
    });
    
    props.push({
      name: 'children',
      type: 'React.ReactNode',
      optional: true,
      description: 'Child elements',
    });
    
    return {
      definitions: props,
      typeDefinition: this.generateTypeDefinition(component.name, props),
      defaultValues: this.generateDefaults(props, component),
    };
  }
  
  private variantToProp(name: string, variant: VariantProperty): PropDefinition {
    const propName = this.toCamelCase(name);
    
    if (variant.type === 'BOOLEAN') {
      return {
        name: propName,
        type: 'boolean',
        optional: true,
        defaultValue: variant.defaultValue,
      };
    }
    
    if (variant.type === 'VARIANT') {
      const options = variant.options.map(o => `'${o}'`).join(' | ');
      return {
        name: propName,
        type: options,
        optional: true,
        defaultValue: `'${variant.defaultValue}'`,
      };
    }
    
    return {
      name: propName,
      type: 'string',
      optional: true,
    };
  }
  
  generateTypeDefinition(componentName: string, props: PropDefinition[]): string {
    return `
export interface ${componentName}Props {
${props.map(p => `  ${p.name}${p.optional ? '?' : ''}: ${p.type};`).join('\n')}
}
    `.trim();
  }
}
```

---

### US-6.6: Code Output & File Structure
**As a** platform user  
**I want** generated code organized properly  
**So that** I can easily integrate it into my project

**Acceptance Criteria:**
- [ ] One file per component
- [ ] Proper imports/exports
- [ ] Index file for barrel exports
- [ ] Optional Storybook stories
- [ ] Optional test files

**File Structure:**
```
generated/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.types.ts
│   │   ├── Button.test.tsx
│   │   ├── Button.stories.tsx
│   │   └── index.ts
│   ├── Card/
│   ├── Header/
│   └── index.ts
├── tokens/
│   ├── colors.ts
│   ├── typography.ts
│   └── index.ts
├── pages/
│   └── Dashboard.tsx
└── index.ts
```

---

## Key Deliverables

```
packages/react-generator/
├── src/
│   ├── index.ts
│   ├── generator.ts
│   ├── translators/
│   │   ├── layout.ts
│   │   ├── styles.ts
│   │   └── index.ts
│   ├── generators/
│   │   ├── component.ts
│   │   ├── props.ts
│   │   ├── accessibility.ts
│   │   └── index.ts
│   ├── templates/
│   │   ├── component.hbs
│   │   ├── types.hbs
│   │   └── index.hbs
│   └── types/
├── __tests__/
└── package.json
```

---

## Completion Criteria

- [ ] Generate valid React/TypeScript components
- [ ] Layout translation accuracy > 90%
- [ ] Style translation accuracy > 85%
- [ ] Accessibility attributes on interactive elements
- [ ] Props from variants working
- [ ] Generated code passes ESLint
- [ ] Integration: Generate CMMC dashboard from parsed design

---

## Handoff Context for Epic 10

**What Epic 10 needs:**
- Import: `import { ReactGenerator, GeneratedCode } from '@forge/react-generator'`
- Output: Complete file structure with components, tokens, pages
- Each component is self-contained with types

---

## Verification Script

```bash
#!/bin/bash
echo "🔍 Verifying Epic 6: React Generator"
cd packages/react-generator

[ -f "src/generator.ts" ] || { echo "❌ generator.ts missing"; exit 1; }
[ -f "src/translators/layout.ts" ] || { echo "❌ layout translator missing"; exit 1; }

pnpm test || { echo "❌ Tests failed"; exit 1; }
pnpm build || { echo "❌ Build failed"; exit 1; }

# Test generation
pnpm generate:test || { echo "❌ Test generation failed"; exit 1; }

echo "✅ Epic 6 verification complete"
```
