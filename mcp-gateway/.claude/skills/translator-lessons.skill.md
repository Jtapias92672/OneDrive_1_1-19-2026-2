# Translator Lessons - Known Issues and Workarounds

## When to Use
Load FIRST when analyzing failures or starting translation work.

## Known Issues

### Issue 1: Layout Not Found
**Symptom**: Error "Layout 'MyLayout' not found"
**Root Cause**: Layout resolution requires full qualified name
**Fix**: Use `model.allLayouts()` and match by `qualifiedName`

### Issue 2: Widget Property Error
**Symptom**: Error "Cannot set property 'content' of undefined"
**Root Cause**: Widget content must be proper Mendix object (e.g., PageText)
**Fix**: Create PageText object first, then assign

### Issue 3: MPK Corruption
**Symptom**: MPK file is tiny (<1KB) or won't import
**Root Cause**: exportMpk() called without callback
**Fix**: Use callback pattern, verify file size

### Issue 4: Phantom Dependencies
**Symptom**: Skill referenced but not found
**Root Cause**: Skills mentioned in docs but never installed
**Fix**: Verify skill exists before referencing

### Issue 5: Missing Module Prefix
**Symptom**: Entity/Layout not found
**Root Cause**: Forgot to include module name
**Fix**: Always use fully qualified names (Module.Entity)

## Workarounds Applied

### Workaround 1: Pre-verify Layouts
Before using any layout:
```typescript
const layout = model.allLayouts().find(l => l.qualifiedName === name);
if (!layout) throw new Error(`Layout not found: ${name}`);
```

### Workaround 2: Widget Factory Pattern
Centralize widget creation:
```typescript
function createTextWidget(model, text) {
  const widget = page.createWidget('Mendix.Text');
  widget.content = dm.pages.PageText.create(model);
  widget.content.text = text;
  return widget;
}
```

## Usage
Check this skill BEFORE analyzing any failure.
Update this skill when discovering new issues.
