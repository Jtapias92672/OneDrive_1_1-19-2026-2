# Test Plan: New Generators Validation

## Phase 1: Enable ReactGenerator

### Test 1.1: Generate React Component
```typescript
const options = {
  ...defaultOptions,
  useNewReactGenerator: true,
};

// Run POC with real Figma file
// Verify generated component has:
// ✅ Actual bounds (position: absolute, left/top/width/height)
// ✅ Actual colors (backgroundColor from fills)
// ✅ Actual text (content + typography)
// ✅ Actual images (<Image src="...">)
// ✅ Actual hierarchy (recursive children rendering)
```

**Expected Output:**
```tsx
import React from 'react';
import Image from 'next/image';

export function MyComponent() {
  return (
    <div style={{ position: 'absolute', left: 100, top: 50, width: 200, height: 150, backgroundColor: 'rgba(255, 255, 255, 1)' }}>
      <span style={{ fontFamily: 'Inter', fontSize: '16px', color: 'rgba(0, 0, 0, 1)' }}>Button Text</span>
    </div>
  );
}
```

---

## Phase 2: Enable TestGenerator

### Test 2.1: Generate Tests
```typescript
const options = {
  ...defaultOptions,
  useNewTestGenerator: true,
};
```

**Expected Output:**
```typescript
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders without crashing', () => {
    const { container } = render(<MyComponent />);
    expect(container).toBeInTheDocument();
  });

  it('displays correct text content', () => {
    render(<MyComponent />);
    expect(screen.getByText("Button Text")).toBeInTheDocument();
  });

  it('has correct background color', () => {
    const { container } = render(<MyComponent />);
    const element = container.firstChild as HTMLElement;
    expect(element).toHaveStyle({ backgroundColor: 'rgba(255, 255, 255, 1)' });
  });
});
```

### Test 2.2: Run Generated Tests
```bash
npm test -- MyComponent.test.tsx
```

**Expected:** All tests pass ✅

---

## Phase 3: Enable StorybookGenerator

### Test 3.1: Generate Stories
```typescript
const options = {
  ...defaultOptions,
  useNewStorybookGenerator: true,
};
```

**Expected Output:**
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import MyComponent from './MyComponent';

const meta: Meta<typeof MyComponent> = {
  title: 'Components/MyComponent',
  component: MyComponent,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    onClick: { action: 'clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof MyComponent>;

export const Default: Story = {
  args: {
    label: "Button Text",
  },
};

export const Primary: Story = {
  args: {
    label: "Button Text",
    variant: 'primary',
  },
};
```

### Test 3.2: Build Storybook
```bash
npm run storybook
```

**Expected:** Storybook builds and stories display with controls ✅

---

## Phase 4: Verify HTMLGenerator

### Test 4.1: Generate HTML (Already Enabled)
HTMLGenerator is already used in `generateDesignHTML` (Phase 5).

**Verification:**
```bash
# Generate HTML from Figma file
# Check browser:
# ✅ Logos render as single image (not 50+ fragments)
# ✅ No ghost images (empty icons hidden with opacity: 0)
# ✅ No text wrapping (form labels on single line)
```

---

## Phase 5: Test RenderEngine API

### Test 5.1: Single Format
```typescript
import { RenderEngine } from './generation';

const engine = new RenderEngine();
const reactCode = engine.render(component, 'MyComponent', 'react');

console.log(reactCode); // Should have actual bounds, colors, text
```

### Test 5.2: All Formats
```typescript
const allCode = engine.renderAll(component, 'MyComponent');

console.log(allCode.react);      // React component
console.log(allCode.test);       // Test file
console.log(allCode.storybook);  // Story file
console.log(allCode.html);       // HTML output
```

### Test 5.3: Batch Processing
```typescript
const batch = engine.renderBatch([
  { component: comp1, componentName: 'Component1' },
  { component: comp2, componentName: 'Component2' },
]);

console.log(batch); // Array of GeneratedCode objects
```

---

## Success Criteria

### ReactGenerator
- [ ] Generated component has actual bounds (not hardcoded div)
- [ ] Generated component has actual colors (from Figma fills)
- [ ] Generated component has actual text (from Figma text content)
- [ ] Generated component has actual images (Image tags)
- [ ] Generated component has actual hierarchy (recursive children)
- [ ] TypeScript compiles without errors

### TestGenerator
- [ ] Generated tests verify props
- [ ] Generated tests verify visual styles
- [ ] Generated tests verify text content
- [ ] Generated tests pass when run with npm test

### StorybookGenerator
- [ ] Generated stories have multiple variants
- [ ] Generated stories have interactive controls
- [ ] Storybook builds without errors
- [ ] Stories display in Storybook UI

### HTMLGenerator
- [ ] HTML output identical to original (no visual regression)
- [ ] Logos render as single image
- [ ] No ghost images
- [ ] No text wrapping issues

### RenderEngine
- [ ] render() works for single format
- [ ] renderAll() returns all 4 formats
- [ ] renderBatch() processes multiple components
- [ ] All generators accessible via API
