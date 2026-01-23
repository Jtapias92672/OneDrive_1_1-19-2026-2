---
name: mendix-sdk-integration
description: Comprehensive patterns and guidelines for Mendix Platform SDK development. Use when building tools that generate Mendix pages programmatically, creating Figma-to-Mendix or design-to-code converters, automating Mendix app modifications via SDK, or working with Mendix Team Server integration. Covers critical issues like layout resolution, widget configuration, and file operations for Mendix 11.5+.
---

# Mendix SDK Integration Skill
## Patterns for Mendix Platform SDK Development

**Version**: 1.1  
**Target**: Mendix 11.5+ (widgets array API)  
**Applicability**: Any project using Mendix Platform SDK to programmatically modify Mendix apps
**Updated**: December 2025 - Added SVG/Image handling (G-007)

---

## When to Use This Skill

Use this skill when:
- Building tools that generate Mendix pages programmatically
- Creating Figma-to-Mendix or design-to-code converters
- Automating Mendix app modifications via SDK
- Working with Mendix Team Server integration

---

## Critical Knowledge

### The Layout Resolution Problem (CRITICAL)

**Every Mendix page MUST have a LayoutCall pointing to a valid Layout.**

Without this, pages will NOT render in Mendix Studio.

```typescript
async function findOrCreateLayoutCall(
  model: IModel, 
  page: pages.Page, 
  moduleName: string
): Promise<pages.LayoutCall> {
  // Priority: Atlas_Default > Atlas_TopBar > First available
  const layouts = model.allLayouts().filter(l => 
    l.containerAsModule?.name === moduleName ||
    l.containerAsModule?.name === "Atlas_Core"
  );
  
  if (layouts.length === 0) {
    throw new Error(`FATAL: No layouts found in ${moduleName} or Atlas_Core`);
  }
  
  // Prefer Atlas_Default
  let selectedLayout = layouts.find(l => l.name === "Atlas_Default");
  if (!selectedLayout) {
    selectedLayout = layouts.find(l => l.name === "Atlas_TopBar");
  }
  if (!selectedLayout) {
    selectedLayout = layouts[0];
    console.warn(`Using fallback layout: ${selectedLayout.name}`);
  }
  
  const layout = await selectedLayout.load();
  
  // Create LayoutCall
  const layoutCall = pages.LayoutCall.createInPageUnderLayoutCall(page);
  layoutCall.layout = layout;
  
  // Populate arguments for EVERY placeholder
  for (const placeholder of layout.placeholders || []) {
    const arg = pages.LayoutCallArgument.createIn(layoutCall);
    arg.parameterName = placeholder.name;
  }
  
  return layoutCall;
}
```

### Version-Specific Widget API (CRITICAL)

| Mendix Version | Property | Method |
|----------------|----------|--------|
| < 7.15 | `widget` (singular) | `createIn*UnderWidget()` |
| ≥ 7.15 | `widgets` (array) | `createIn*UnderWidgets()` |

**For Mendix 11.5**: ALWAYS use `widgets` array API.

```typescript
// ✅ CORRECT for Mendix 11.5+
pages.DivContainer.createInDivContainerUnderWidgets(parent);

// ❌ WRONG - will cause runtime error
pages.DivContainer.createInDivContainerUnderWidget(parent);
```

### flushChanges() Requirement (CRITICAL)

Model changes are NOT persisted until `flushChanges()` is called.

```typescript
// MUST call before navigation update
await model.flushChanges();

// MUST call before commit
await model.flushChanges();
await workingCopy.commitToRepository("main", { commitMessage: "..." });
```

---

## Widget Factory Patterns

### Container

```typescript
function createContainer(
  model: IModel,
  parent: pages.DivContainer | pages.LayoutCallArgument,
  options: { name: string; class?: string }
): pages.DivContainer {
  const container = parent instanceof pages.LayoutCallArgument
    ? pages.DivContainer.createInLayoutCallArgumentUnderWidgets(parent)
    : pages.DivContainer.createInDivContainerUnderWidgets(parent);
  
  container.name = options.name;
  if (options.class) {
    container.appearance.class = options.class;
  }
  return container;
}
```

### Text Widget

```typescript
function createText(
  model: IModel,
  parent: pages.DivContainer,
  options: { name: string; content: string; class?: string }
): pages.Text {
  const text = pages.Text.createInDivContainerUnderWidgets(parent);
  text.name = options.name;
  
  const template = pages.ClientTemplate.create(model);
  const textPart = pages.TextClientTemplatePart.create(model);
  textPart.value = options.content;
  template.parts.push(textPart);
  text.content = template;
  
  if (options.class) {
    text.appearance.class = options.class;
  }
  return text;
}
```

### Action Button

```typescript
function createButton(
  model: IModel,
  parent: pages.DivContainer,
  options: {
    name: string;
    caption: string;
    class?: string;
    action?: "close" | "microflow" | "nanoflow" | "page";
  }
): pages.ActionButton {
  const button = pages.ActionButton.createInDivContainerUnderWidgets(parent);
  button.name = options.name;
  
  // Caption
  const captionTemplate = pages.ClientTemplate.create(model);
  const textPart = pages.TextClientTemplatePart.create(model);
  textPart.value = options.caption;
  captionTemplate.parts.push(textPart);
  button.caption = captionTemplate;
  
  // Class (Atlas UI)
  button.appearance.class = options.class || "btn-primary";
  
  // Action
  switch (options.action) {
    case "close":
      button.action = pages.ClosePageClientAction.create(model);
      break;
    case "microflow":
      button.action = pages.MicroflowClientAction.create(model);
      break;
    case "page":
      button.action = pages.PageClientAction.create(model);
      break;
  }
  
  return button;
}
```

### Input Widgets (Require DataView)

```typescript
function createTextBox(
  model: IModel,
  parent: pages.DivContainer,
  options: { name: string; placeholder?: string }
): pages.TextBox {
  const textBox = pages.TextBox.createInDivContainerUnderWidgets(parent);
  textBox.name = options.name;
  return textBox;
}

// Note: Input widgets need DataView context for data binding
// Use Container fallback for POC if entity context unavailable
```

---

## DataView Context (For Input Widgets)

Input widgets (TextBox, CheckBox, etc.) require DataView wrapper:

```typescript
async function createDataViewWithEntity(
  model: IModel,
  parent: pages.DivContainer,
  entityQualifiedName: string
): Promise<pages.DataView> {
  const dataView = pages.DataView.createInDivContainerUnderWidgets(parent);
  dataView.name = "DataView_" + Date.now();
  dataView.editable = true;
  
  // Create context source
  const contextSource = pages.DataViewSource.create(model);
  const databaseSource = pages.DatabaseSource.create(model);
  
  databaseSource.entityPath = entityQualifiedName;
  contextSource.databaseSource = databaseSource;
  dataView.dataSource = contextSource;
  
  return dataView;
}
```

---

## CSS File Injection

The SDK can inject CSS files into the Mendix project:

```typescript
async function injectCSSFile(
  model: IModel,
  cssContent: string,
  fileName: string
): Promise<void> {
  const fs = require('fs');
  const tempPath = `/tmp/${fileName}`;
  
  // Write to temp file
  fs.writeFileSync(tempPath, cssContent);
  
  // Upload to Mendix project
  await model.putFile(tempPath, `theme/web/css/${fileName}`);
  
  // Cleanup
  fs.unlinkSync(tempPath);
}
```

**Note**: `model.putFile()` works on the entire project file tree, not just the .mpr.

---

## Atlas UI Class Reference

### Spacing Classes
```
spacing-outer-bottom-small | medium | large
spacing-outer-top-small | medium | large
spacing-inner-small | medium | large
```

### Button Classes
```
btn-primary | btn-secondary | btn-success | btn-danger
btn-lg | btn-sm | btn-block
btn-outline-primary | btn-outline-secondary
```

### Typography Classes
```
text-bold | text-italic | text-center
text-muted | text-primary | text-danger
```

### Container Classes
```
card | card-body | card-header
panel | well | alert
```

---

## Complete Page Creation Flow

```typescript
async function createPageFromDesign(
  config: {
    mendixApiKey: string;
    templateAppId: string;
    moduleName: string;
    pageName: string;
    widgetStructure: any;
  }
): Promise<void> {
  // 1. Connect
  const client = new MendixPlatformClient(config.mendixApiKey);
  const app = await client.getApp(config.templateAppId);
  const workingCopy = await app.createTemporaryWorkingCopy("main");
  const model = await workingCopy.openModel();
  
  try {
    // 2. Find module
    const module = model.findModuleByQualifiedName(config.moduleName);
    if (!module) throw new Error(`Module ${config.moduleName} not found`);
    
    // 3. Create page
    const page = pages.Page.createIn(module);
    page.name = config.pageName;
    
    // 4. Add LayoutCall (CRITICAL)
    const layoutCall = await findOrCreateLayoutCall(model, page, config.moduleName);
    
    // 5. Get Main placeholder
    const mainArg = layoutCall.arguments.find(a => a.parameterName === "Main");
    if (!mainArg) throw new Error("Main placeholder not found");
    
    // 6. Create root container
    const root = pages.DivContainer.createInLayoutCallArgumentUnderWidgets(mainArg);
    root.name = "Root_Container";
    root.appearance.class = "container-fluid";
    
    // 7. Build widget tree
    await buildWidgetTree(model, root, config.widgetStructure);
    
    // 8. Flush and commit
    await model.flushChanges();
    await workingCopy.commitToRepository("main", {
      commitMessage: `Generated ${config.pageName}`
    });
    
  } finally {
    await model.closeConnection();
  }
}
```

---

## SVG and Image Handling (G-007)

**Reference**: 
- https://docs.mendix.com/refguide/images/
- https://docs.mendix.com/refguide/mobile/designing-mobile-user-interfaces/images-icons-and-fonts/

### Adding Images to Mendix Projects

**Method 1: Image Collections (Recommended)**
```typescript
// Images should be added to module's image collection
// Location: Module > Resources > Image Collection
// Supported formats: PNG, JPEG, GIF, SVG

async function addImageToCollection(
  model: IModel,
  moduleName: string,
  imagePath: string,
  imageName: string
): Promise<void> {
  // Upload image file to project
  await model.putFile(imagePath, `resources/${moduleName}/${imageName}`);
}
```

**Method 2: Static Image Widget**
```typescript
function createStaticImage(
  model: IModel,
  parent: pages.DivContainer,
  options: { name: string; imageUrl: string; class?: string }
): pages.StaticImageViewer {
  const image = pages.StaticImageViewer.createInDivContainerUnderWidgets(parent);
  image.name = options.name;
  if (options.class) {
    image.appearance.class = options.class;
  }
  return image;
}
```

### SVG-Specific Requirements

**⚠️ SVG Compatibility Issues**

| Feature | Web Apps | Native Mobile | Action |
|---------|----------|---------------|--------|
| Basic shapes | ✅ | ✅ | Safe to use |
| Fill/stroke colors | ✅ | ✅ | Safe to use |
| Gradients | ✅ | ⚠️ Limited | Test carefully |
| Animations | ✅ | ❌ | Remove for native |
| Embedded JS | ❌ | ❌ | Security risk - remove |
| `<style>` tags | ⚠️ | ❌ | Use inline styles |
| CDATA sections | ⚠️ | ❌ | Remove |

**SVG Optimization (REQUIRED before import)**
```bash
# Use SVGOMG or SVGO to optimize
npx svgo input.svg -o output.svg --config '{
  "plugins": [
    "removeDoctype",
    "removeXMLProcInst", 
    "removeComments",
    "removeMetadata",
    "removeEditorsNSData",
    "cleanupAttrs",
    "removeUselessStrokeAndFill"
  ]
}'
```

**For Figma-to-Mendix Translator:**
```typescript
async function processFigmaImage(
  figmaImageUrl: string,
  format: 'png' | 'svg'
): Promise<{ path: string; optimized: boolean }> {
  // 1. Download from Figma
  const imageBuffer = await downloadImage(figmaImageUrl);
  
  // 2. If SVG, optimize it
  if (format === 'svg') {
    const optimized = await optimizeSVG(imageBuffer);
    // Remove unsupported elements for native mobile
    const cleaned = removeSVGUnsupportedElements(optimized);
    return { path: saveTempFile(cleaned), optimized: true };
  }
  
  // 3. For PNG/JPEG, just save
  return { path: saveTempFile(imageBuffer), optimized: false };
}

function removeSVGUnsupportedElements(svgContent: string): string {
  // Remove elements that break native mobile
  return svgContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<!\\[CDATA\\[.*?\\]\\]>/gs, '');
}
```

### Build Failure Prevention

**Known Issue**: SVGs can cause mxbuild crashes (SIGABRT) in CI/CD pipelines.

**Prevention:**
1. Always optimize SVGs before import
2. Avoid adding SVGs to System or Atlas_UI modules (overwritten on updates)
3. Store in custom module's image collection
4. Test build after each SVG addition

**Recovery if build fails:**
```python
# Scan .mpr (SQLite) for problematic SVGs
import sqlite3
conn = sqlite3.connect('your_app.mpr')
cursor = conn.cursor()
cursor.execute("SELECT ContentsHash FROM Unit WHERE Contents LIKE '%<svg%'")
# Delete problematic entries if needed
```

### Image Placeholders for POC

For initial translator POC, use placeholder strategy:

```typescript
function createImagePlaceholder(
  model: IModel,
  parent: pages.DivContainer,
  options: { name: string; width: number; height: number }
): pages.DivContainer {
  // Create styled container as image placeholder
  const placeholder = pages.DivContainer.createInDivContainerUnderWidgets(parent);
  placeholder.name = `ImagePlaceholder_${options.name}`;
  placeholder.appearance.class = "image-placeholder";
  // Note: Actual image injection deferred to v8.3
  return placeholder;
}
```

**CSS for placeholders:**
```css
.image-placeholder {
  background-color: #f0f0f0;
  border: 2px dashed #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
}
.image-placeholder::before {
  content: "📷 Image";
  color: #999;
}
```

---

## Pre-Commit Checklist

Before ANY commit, verify:

1. [ ] Every Page has LayoutCall with valid layout reference
2. [ ] Every LayoutCallArgument has parameterName set
3. [ ] Widget hierarchy: LayoutGrid → Row → Column → Widget
4. [ ] Every input widget inside DataView (or Container fallback)
5. [ ] Using `createIn*UnderWidgets` (not singular)
6. [ ] `model.flushChanges()` called before commit
7. [ ] Atlas design classes applied to widgets
8. [ ] SVGs optimized and stripped of unsupported elements (scripts, CDATA, style tags)
9. [ ] Images added to custom module, NOT System or Atlas_UI modules

---

## Configuration Defaults

| Setting | Value |
|---------|-------|
| Target Layout | `Atlas_Core.Atlas_Default` |
| Fallback Layout | `Atlas_Core.Atlas_TopBar` |
| Placeholder | `Main` |
| Navigation Profile | `Responsive` |
| Widget API | `widgets` (array) |

---

## Reference Documentation

1. **Mendix SDK API**: https://apidocs.rnd.mendix.com/modelsdk/latest/
2. **Pages Metamodel**: https://docs.mendix.com/apidocs-mxsdk/mxsdk/pages-metamodel/
3. **Domain Model**: https://docs.mendix.com/apidocs-mxsdk/mxsdk/domain-model-metamodel/
4. **Atlas UI**: https://docs.mendix.com/appstore/modules/atlas-ui-resources/
5. **Images (Web/Responsive)**: https://docs.mendix.com/refguide/images/
6. **Images, Icons & Fonts (Native Mobile)**: https://docs.mendix.com/refguide/mobile/designing-mobile-user-interfaces/images-icons-and-fonts/

---

*This skill provides reusable patterns for Mendix Platform SDK development.*
