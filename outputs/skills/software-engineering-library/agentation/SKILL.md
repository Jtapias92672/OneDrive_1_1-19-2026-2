---
name: agentation
description: Visual feedback tool for human-in-the-loop AI development. Use when receiving visual feedback about UI elements, when user points to specific DOM elements, or when translating visual annotations into code locations. Captures CSS selectors, class names, and element positions to enable precise code targeting.
---

# Agentation

Translate visual UI feedback into precise code references.

## Core Concept

Humans think visually: "Fix THAT button"
Machines need coordinates: "Button at .header > .nav-btn:nth-child(2)"

Agentation bridges this gap.

## When to Use

- User provides visual feedback (screenshots with annotations)
- User references specific UI elements
- Need to locate exact code for a visual element
- Debugging visual/layout issues
- Implementing pixel-perfect changes

## How It Works

### Input: Visual Reference

User provides:
- Screenshot with highlighted element
- Description: "The blue button in the header"
- Coordinates or selector if available

### Process: Element Identification

1. **Parse Visual Context**
   ```
   Element: Button
   Location: Header, right side
   Visual: Blue background, white text
   Approximate position: top-right quadrant
   ```

2. **Generate Selector Candidates**
   ```css
   /* By class */
   .header .btn-primary
   .nav-button.blue

   /* By structure */
   header > nav > button:last-child

   /* By attributes */
   button[data-action="submit"]
   ```

3. **Search Codebase**
   ```bash
   # Find by class name
   grep -r "btn-primary" --include="*.tsx" --include="*.css"

   # Find by component name
   grep -r "HeaderButton" --include="*.tsx"
   ```

### Output: Code Location

```markdown
## Element Found

**Visual**: Blue button in header
**Selector**: `.header-nav .btn-primary`
**File**: `src/components/Header.tsx:45`
**Code**:
```tsx
<button className="btn-primary" onClick={handleSubmit}>
  Submit
</button>
```

## Annotation Format

When receiving visual feedback, parse:

```markdown
## Visual Feedback

**Element**: [What the user pointed to]
**Location**: [Where on screen]
**Issue**: [What's wrong / what to change]
**Selectors**: [CSS selectors to find it]
- Primary: [most specific selector]
- Fallback: [alternative selector]
**Files to Check**:
- [likely file 1]
- [likely file 2]
```

## Selector Strategies

### By Visual Characteristics

| Visual Cue | Selector Strategy |
|------------|-------------------|
| "Blue button" | `button.blue`, `button.btn-primary` |
| "In the header" | `header *`, `.header *` |
| "Third item" | `:nth-child(3)` |
| "The sidebar" | `aside`, `.sidebar`, `[role="complementary"]` |

### By Position

| Position | Likely Selectors |
|----------|------------------|
| Top-left | `header`, `.logo`, `.brand` |
| Top-right | `.nav`, `.auth-buttons`, `.user-menu` |
| Center | `main`, `.content`, `.hero` |
| Bottom | `footer`, `.footer` |

### By Component Type

| Type | Common Patterns |
|------|-----------------|
| Button | `button`, `.btn`, `[type="submit"]` |
| Input | `input`, `.form-control`, `.input` |
| Card | `.card`, `.panel`, `.box` |
| Modal | `.modal`, `.dialog`, `[role="dialog"]` |

## Integration with Code Search

After identifying selectors:

```bash
# Find component definition
grep -r "className.*header-nav" src/

# Find style definition
grep -r ".header-nav" --include="*.css" --include="*.scss"

# Find test references
grep -r "header-nav" --include="*.test.*"
```

## Feedback Loop

1. **User points**: "This button is wrong"
2. **Identify**: Parse visual → selector → file location
3. **Confirm**: "Is this the element you mean?" [show code]
4. **Fix**: Make the requested change
5. **Verify**: "Does this look correct now?"

## Common Visual-to-Code Mappings

```
"The logo" → .logo, .brand, header img
"Navigation" → nav, .navbar, .nav-menu
"Search bar" → input[type="search"], .search-input
"User avatar" → .avatar, .user-image, .profile-pic
"Dropdown" → .dropdown, select, [role="listbox"]
"Modal/popup" → .modal, .dialog, [role="dialog"]
"Loading spinner" → .spinner, .loading, .loader
"Error message" → .error, .alert-danger, [role="alert"]
```
