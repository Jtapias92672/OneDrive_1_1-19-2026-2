# Mendix Generation - Code Output Patterns

## When to Use
Use when generating Mendix artifacts from parsed design data.

## Generation Pipeline

### 1. Create Model
```typescript
const client = new MendixPlatformClient();
const app = await client.createApp('MyApp');
const workingCopy = await app.createWorkingCopy();
const model = workingCopy.model();
```

### 2. Create Module
```typescript
const module = await model.allModules().find(m => m.name === 'MyModule');
if (!module) {
  throw new Error('Module not found');
}
```

### 3. Create Page
```typescript
const page = pages.Page.createIn(module);
page.name = 'GeneratedPage';
page.layout = await resolveLayout(model, 'Atlas_Default');
```

### 4. Add Widgets
```typescript
const container = pages.LayoutGrid.createIn(page);
const textWidget = createTextWidget(model, 'Hello World');
container.widgets.push(textWidget);
```

### 5. Export MPK
```typescript
await exportWithVerification(model, outputPath);
```

## Verification Checklist
- [ ] Model created successfully
- [ ] Module exists
- [ ] Layout resolved
- [ ] Widgets configured with proper objects
- [ ] MPK exported and size verified

## Usage
Follow this pipeline for all Mendix code generation.
