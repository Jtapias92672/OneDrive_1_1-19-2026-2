# Mendix SDK Integration - Critical Patterns and Constraints

## When to Use
Use for ALL Mendix SDK code generation, widget configuration, and MPK creation.

## Critical Widget Configuration Pattern

### Text Widget (CORRECT)
```typescript
const textWidget = page.createWidget('Mendix.Text');
textWidget.content = dm.pages.PageText.create(model);
textWidget.content.text = "Hello World";
```

### Text Widget (WRONG)
```typescript
const textWidget = page.createWidget('Mendix.Text');
textWidget.content = "Hello"; // WILL FAIL - must be PageText object
```

## Layout Resolution (CRITICAL)

### CORRECT: Resolve by name and module
```typescript
const layouts = model.allLayouts();
const layout = layouts.find(l =>
  l.qualifiedName === 'MyModule.Layouts.MyLayout'
);
if (!layout) {
  throw new Error('Layout not found: MyModule.Layouts.MyLayout');
}
page.layout = layout;
```

### WRONG: Assume layout exists
```typescript
page.layout = 'MyLayout'; // WILL FAIL
```

## MPK Generation (CRITICAL)

### CORRECT: Use callback
```typescript
await new Promise((resolve, reject) => {
  model.exportMpk(outputPath, (error) => {
    if (error) reject(error);
    else resolve();
  });
});

// Verify file
const stats = fs.statSync(outputPath);
if (stats.size < 1024) {
  throw new Error('MPK suspiciously small - likely corrupt');
}
```

### WRONG: No verification
```typescript
model.exportMpk(outputPath);
// No callback, no verification - will fail silently
```

## Known Widget Types
- Mendix.Text
- Mendix.TextBox
- Mendix.Button
- Mendix.Container
- Mendix.DataView
- Mendix.ListView
- Mendix.Table

## Required Imports
```typescript
import { MendixPlatformClient } from 'mendixplatformsdk';
import { IModel } from 'mendixmodelsdk';
import * as dm from 'mendixmodelsdk/dist/gen/domainmodels';
import * as pages from 'mendixmodelsdk/dist/gen/pages';
```

## Usage
Load this skill BEFORE any Mendix SDK work.
