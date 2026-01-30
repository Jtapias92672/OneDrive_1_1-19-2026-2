# FORGE Skill: Hierarchy Preservation

**Version:** 1.0
**Date:** 2026-01-30
**Source:** Epic 7.5 root cause analysis (2026-01-29)
**Evidence:** `flattenComponents()` destroyed parent-child relationships, breaking rendering

---

## Purpose

Maintain Figma's hierarchical structure throughout the generation pipeline to ensure correct layout, image URLs, and child rendering.

## Problem Statement

Flattening component hierarchies causes:
- Loss of parent-child relationships → layout broken
- Image URLs not propagated to children → images missing
- Bounds calculation errors → elements misplaced
- Inability to render nested structures → broken output

**Root Cause:** Epic 7.5 initially used `flattenComponents()` which converted tree to flat array, losing all relationships.

## Solution Pattern

**Use recursive conversion** that preserves tree structure:

```typescript
// CORRECT: Recursive conversion (preserves hierarchy)
function convertToParsedComponents(
  figmaNode: FigmaNode,
  parent?: ParsedComponent
): ParsedComponent {
  const component: ParsedComponent = {
    id: figmaNode.id,
    name: figmaNode.name,
    type: figmaNode.type,
    bounds: calculateBounds(figmaNode, parent),  // Relative to parent
    children: [],  // CRITICAL: Preserve children array
    // ... other properties
  };

  // Recursive: Convert children and maintain relationships
  if (figmaNode.children && Array.isArray(figmaNode.children)) {
    component.children = figmaNode.children.map(child =>
      convertToParsedComponents(child, component)  // Pass parent
    );
  }

  return component;
}
```

## Critical Rules

### Rule 1: Never Flatten Hierarchy
**When:** Converting Figma nodes to ParsedComponents
**Action:** Use recursive function that preserves `children` array
**Never:** Convert to flat array (loses relationships)

```typescript
// ❌ WRONG: Flattening
const components = figmaNodes.flatMap(node => extractAllComponents(node));

// ✅ CORRECT: Recursive
const components = figmaNodes.map(node => convertComponent(node));
```

### Rule 2: Preserve Parent References
**When:** Calculating relative positions
**Why:** Child bounds are relative to parent (childX - parentX)
**Implementation:** Pass `parent` parameter in recursive calls

```typescript
function calculateBounds(
  node: FigmaNode,
  parent?: ParsedComponent
): Bounds {
  const x = parent ? node.x - parent.bounds.x : node.x;
  const y = parent ? node.y - parent.bounds.y : node.y;

  return {
    x,
    y,
    width: node.width || 0,
    height: node.height || 0
  };
}
```

### Rule 3: Propagate Data Down Tree
**When:** Enriching components with imageUrl, styles, etc.
**Action:** Recursively apply enrichment to children
**Never:** Only enrich top-level components

```typescript
function enrichComponentsWithImageUrls(
  component: ParsedComponent,
  imageUrlMap: Map<string, string>
): ParsedComponent {
  const enriched = { ...component };

  // Enrich this component
  if (imageUrlMap.has(component.id)) {
    enriched.imageUrl = imageUrlMap.get(component.id);
  }

  // CRITICAL: Recursively enrich children
  if (enriched.children && Array.isArray(enriched.children)) {
    enriched.children = enriched.children.map(child =>
      enrichComponentsWithImageUrls(child, imageUrlMap)
    );
  }

  return enriched;
}
```

### Rule 4: Render Hierarchy Recursively
**When:** Generating output (HTML, React, etc.)
**Action:** Render children within parent container
**Structure:** Nested elements match Figma hierarchy

```typescript
function renderComponentTree(
  component: ParsedComponent,
  depth: number = 0
): string {
  let html = `<div id="${component.id}" style="${generateStyles(component)}">`;

  // CRITICAL: Recursively render children (preserves nesting)
  if (component.children && Array.isArray(component.children)) {
    for (const child of component.children) {
      html += renderComponentTree(child, depth + 1);  // Increase depth
    }
  }

  html += '</div>';
  return html;
}
```

## Common Anti-Patterns

### ❌ Anti-Pattern 1: Flattening Tree
```typescript
// WRONG: Loses hierarchy
function flattenComponents(node: FigmaNode): ParsedComponent[] {
  const result: ParsedComponent[] = [{
    id: node.id,
    name: node.name,
    // ... no children array
  }];

  if (node.children) {
    // PROBLEM: Flattening children into same array
    result.push(...node.children.flatMap(flattenComponents));
  }

  return result;  // Flat array (no parent-child links)
}
```

### ❌ Anti-Pattern 2: Ignoring Parent Context
```typescript
// WRONG: Absolute positioning (ignores parent)
const bounds = {
  x: node.absoluteBoundingBox.x,  // Absolute, not relative
  y: node.absoluteBoundingBox.y,  // Causes overlap when nested
  width: node.width,
  height: node.height
};
```

### ❌ Anti-Pattern 3: Shallow Enrichment
```typescript
// WRONG: Only enriches top level
function enrichComponents(components: ParsedComponent[], map: Map) {
  return components.map(c => ({
    ...c,
    imageUrl: map.get(c.id)
    // PROBLEM: Children not enriched!
  }));
}
```

### ❌ Anti-Pattern 4: Flat Rendering
```typescript
// WRONG: Renders all components at same level
function render(components: ParsedComponent[]): string {
  return components.map(c => `<div>${c.name}</div>`).join('');
  // PROBLEM: No nesting (all divs siblings)
}
```

## Validation Checklist

When implementing or auditing code, verify:
- [ ] `ParsedComponent` interface has `children?` array property
- [ ] Conversion function is recursive (calls itself for children)
- [ ] Parent reference passed down during conversion
- [ ] Bounds calculated relative to parent (childX - parentX)
- [ ] Enrichment functions process children recursively
- [ ] Rendering functions nest children within parent containers
- [ ] Depth tracking prevents infinite recursion
- [ ] Generated output has nested structure (inspect HTML)

## Test Validation

```typescript
describe('Hierarchy Preservation', () => {
  it('preserves parent-child relationships', () => {
    const figmaNode = {
      id: 'parent',
      type: 'FRAME',
      children: [
        { id: 'child1', type: 'TEXT' },
        { id: 'child2', type: 'RECTANGLE' }
      ]
    };

    const parsed = convertToParsedComponents(figmaNode);

    expect(parsed.children).toHaveLength(2);
    expect(parsed.children[0].id).toBe('child1');
    expect(parsed.children[1].id).toBe('child2');
  });

  it('calculates relative bounds', () => {
    const parent = {
      id: 'parent',
      x: 100,
      y: 200,
      children: [
        { id: 'child', x: 150, y: 250 }  // Absolute: 150, 250
      ]
    };

    const parsed = convertToParsedComponents(parent);
    const child = parsed.children[0];

    expect(child.bounds.x).toBe(50);   // Relative: 150 - 100
    expect(child.bounds.y).toBe(50);   // Relative: 250 - 200
  });

  it('enriches children recursively', () => {
    const component = {
      id: 'parent',
      children: [
        { id: 'child', children: [{ id: 'grandchild' }] }
      ]
    };

    const imageUrlMap = new Map([
      ['parent', 'url1'],
      ['child', 'url2'],
      ['grandchild', 'url3']
    ]);

    const enriched = enrichComponentsWithImageUrls(component, imageUrlMap);

    expect(enriched.imageUrl).toBe('url1');
    expect(enriched.children[0].imageUrl).toBe('url2');
    expect(enriched.children[0].children[0].imageUrl).toBe('url3');
  });

  it('renders nested structure', () => {
    const component = {
      id: 'parent',
      children: [
        { id: 'child1', children: [] },
        { id: 'child2', children: [] }
      ]
    };

    const html = renderComponentTree(component);

    expect(html).toContain('<div id="parent"');
    expect(html).toContain('<div id="child1"');
    expect(html).toContain('<div id="child2"');
    // Verify nesting (children inside parent)
    const parentMatch = html.match(/<div id="parent"[^>]*>(.*)<\/div>/s);
    expect(parentMatch[1]).toContain('<div id="child1"');
    expect(parentMatch[1]).toContain('<div id="child2"');
  });

  it('prevents infinite recursion with depth limit', () => {
    const circular = { id: 'node', children: [] };
    circular.children.push(circular);  // Circular reference

    expect(() => {
      renderComponentTree(circular, 100);  // Max depth
    }).toThrow('Maximum depth exceeded');
  });
});
```

## Performance Impact

**Without Hierarchy Preservation:**
- Broken layout (elements overlap)
- Missing images (URLs not propagated)
- Unusable output (no nested structure)

**With Hierarchy Preservation:**
- Correct layout (relative positioning works)
- All images present (URLs propagate to children)
- Usable nested structure (matches Figma design)

## Integration Points

### Phase 1: Extractors (LayoutCalculator)
```typescript
class LayoutCalculator {
  calculatePosition(
    component: ParsedComponent,
    parent?: ParsedComponent
  ): { x: number; y: number; width: number; height: number } {
    // Apply hierarchy preservation skill
    const x = parent ? component.bounds.x - parent.bounds.x : component.bounds.x;
    const y = parent ? component.bounds.y - parent.bounds.y : component.bounds.y;

    return {
      x,
      y,
      width: component.bounds.width,
      height: component.bounds.height
    };
  }
}
```

### Phase 2-4: All Generators
```typescript
class Generator {
  protected renderRecursive(
    component: ParsedComponent,
    depth: number = 0
  ): string {
    // Apply hierarchy preservation skill
    if (depth > 100) {
      throw new Error('Maximum depth exceeded - possible circular reference');
    }

    let output = this.renderSelf(component);

    // Recursively render children (preserves nesting)
    if (component.children && Array.isArray(component.children)) {
      for (const child of component.children) {
        output += this.renderRecursive(child, depth + 1);
      }
    }

    return output;
  }
}
```

---

## Changelog

### 2026-01-29: Root Cause Identified
- Epic 7.5 broke because flattenComponents() destroyed hierarchy
- Fixed by using recursive convertComponents()
- Validated: HTML rendering worked after fix

### 2026-01-30: Codified as Skill
- Extracted pattern into reusable skill
- Added validation checklist
- Defined anti-patterns
- Added depth limiting for safety
