---
name: impeccable-style
description: UX/UI auditing skill for polishing visual details. Use when reviewing UI for polish issues, fixing micro-interactions, auditing visual consistency, or elevating design quality from "good" to "great". Focuses on the 20% of details that create 80% of perceived quality.
---

# Impeccable Style

Polish the details that separate good UI from great UI.

## Core Principle

**Great design is invisible. Users notice when it's wrong, not when it's right.**

This skill finds and fixes the small details that break the illusion.

## When to Use

- Final polish pass before release
- UI feels "off" but can't pinpoint why
- Consistency audit across components
- Elevating MVP to production quality
- Reviewing designs for attention to detail

## The Polish Checklist

### Spacing & Alignment

```css
/* BAD: Inconsistent spacing */
.card { padding: 12px; }
.modal { padding: 15px; }
.panel { padding: 10px; }

/* GOOD: Spacing scale */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
```

**Audit Questions:**
- [ ] All spacing uses consistent scale (4px, 8px, 16px, etc.)?
- [ ] Elements align to invisible grid?
- [ ] Margins between sections are consistent?
- [ ] Padding inside containers is consistent?

### Typography

```css
/* BAD: Random font sizes */
h1 { font-size: 28px; }
h2 { font-size: 19px; }
p { font-size: 15px; }

/* GOOD: Type scale */
--text-xs: 0.75rem;   /* 12px */
--text-sm: 0.875rem;  /* 14px */
--text-base: 1rem;    /* 16px */
--text-lg: 1.125rem;  /* 18px */
--text-xl: 1.25rem;   /* 20px */
--text-2xl: 1.5rem;   /* 24px */
```

**Audit Questions:**
- [ ] Font sizes follow a scale?
- [ ] Line heights are comfortable (1.4-1.6 for body)?
- [ ] Headings have proper hierarchy?
- [ ] Text is readable (contrast ratio ≥ 4.5:1)?

### Colors

**Audit Questions:**
- [ ] Using defined color palette only?
- [ ] Hover states are consistent (darker/lighter by same %)?
- [ ] Disabled states are consistent (opacity or gray)?
- [ ] Focus states are visible (not just color)?
- [ ] Error/success/warning colors are consistent?

### Micro-interactions

```css
/* BAD: No transition */
.button:hover { background: blue; }

/* GOOD: Smooth transition */
.button {
  transition: all 150ms ease-out;
}
.button:hover {
  background: blue;
  transform: translateY(-1px);
}
```

**Audit Questions:**
- [ ] Buttons have hover/active states?
- [ ] Transitions are 150-300ms (not jarring)?
- [ ] Loading states exist for async actions?
- [ ] Focus states work for keyboard navigation?

### Icons & Images

**Audit Questions:**
- [ ] Icons are same style (outlined vs filled)?
- [ ] Icons are same size in similar contexts?
- [ ] Images have proper aspect ratios?
- [ ] Placeholder/loading states for images?
- [ ] Alt text for accessibility?

### Border Radius

```css
/* BAD: Inconsistent */
.button { border-radius: 4px; }
.card { border-radius: 8px; }
.input { border-radius: 6px; }

/* GOOD: Radius scale */
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-full: 9999px;
```

### Shadows

```css
/* GOOD: Shadow scale for elevation */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px rgba(0,0,0,0.1);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
--shadow-xl: 0 20px 25px rgba(0,0,0,0.15);
```

## Common Polish Issues

| Issue | Fix |
|-------|-----|
| Buttons different heights | Standardize to 32/40/48px |
| Text touches edges | Add padding (min 16px) |
| Modal too wide | Max-width: 500px for forms |
| Icons misaligned | Vertical-align or flexbox |
| Truncated text | text-overflow: ellipsis |
| Flash of unstyled content | Proper loading states |

## Visual Audit Process

1. **Squint Test**: Blur vision - do elements have clear hierarchy?
2. **Grid Check**: Does everything align to an invisible grid?
3. **Color Count**: Are you using <5 colors consistently?
4. **Spacing Scan**: Is spacing predictable and rhythmic?
5. **Interactive Check**: Do all interactive elements feel responsive?

## Before/After Examples

### Spacing
```
Before: [Logo]    [Nav]        [Button]
After:  [Logo] [Nav] [Button]  (consistent gaps)
```

### Alignment
```
Before: Text starts at random x positions
After:  All text aligns to same left edge
```

### Transitions
```
Before: Instant color change on hover
After:  150ms ease-out transition
```

## Polish Priority Order

1. **Spacing** - Most common issue, biggest impact
2. **Typography** - Readable text is non-negotiable
3. **Colors** - Consistency builds trust
4. **Interactions** - Makes UI feel responsive
5. **Details** - Border radius, shadows, icons
