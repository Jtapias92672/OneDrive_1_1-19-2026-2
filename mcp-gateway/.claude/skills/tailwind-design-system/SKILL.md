---
name: tailwind-design-system
description: Enforces utility-first CSS best practices with Tailwind. Use when building UIs with Tailwind CSS, reviewing Tailwind code, creating consistent component styles, or optimizing Tailwind bundle size. Covers responsive design, dark mode, component patterns, and common anti-patterns.
---

# Tailwind Design System

Utility-first CSS patterns for consistent, maintainable UIs.

## Core Principles

1. **Utility-first**: Compose styles from utilities, don't write custom CSS
2. **Consistency**: Use design tokens (spacing scale, colors, etc.)
3. **Responsive**: Mobile-first, progressive enhancement
4. **Composable**: Build complex UIs from simple patterns

## When to Use

- Building new UI components
- Reviewing Tailwind code
- Establishing consistent patterns
- Optimizing bundle size
- Implementing responsive design
- Adding dark mode support

## The Spacing Scale

Always use Tailwind's spacing scale:

```
0    = 0px
0.5  = 2px
1    = 4px
2    = 8px
3    = 12px
4    = 16px
5    = 20px
6    = 24px
8    = 32px
10   = 40px
12   = 48px
16   = 64px
```

```html
<!-- BAD: Arbitrary values -->
<div class="p-[13px] m-[7px]">

<!-- GOOD: Scale values -->
<div class="p-3 m-2">
```

## Component Patterns

### Button

```html
<!-- Primary -->
<button class="px-4 py-2 bg-blue-600 text-white rounded-md
               hover:bg-blue-700 focus:ring-2 focus:ring-blue-500
               focus:ring-offset-2 transition-colors">
  Button
</button>

<!-- Secondary -->
<button class="px-4 py-2 bg-gray-100 text-gray-900 rounded-md
               hover:bg-gray-200 border border-gray-300">
  Button
</button>

<!-- Sizes -->
<button class="px-3 py-1.5 text-sm ...">Small</button>
<button class="px-4 py-2 text-base ...">Medium</button>
<button class="px-6 py-3 text-lg ...">Large</button>
```

### Card

```html
<div class="bg-white rounded-lg shadow-md p-6
            dark:bg-gray-800 dark:shadow-gray-900/20">
  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
    Title
  </h3>
  <p class="mt-2 text-gray-600 dark:text-gray-300">
    Content
  </p>
</div>
```

### Input

```html
<input
  type="text"
  class="w-full px-3 py-2 border border-gray-300 rounded-md
         focus:ring-2 focus:ring-blue-500 focus:border-blue-500
         dark:bg-gray-800 dark:border-gray-600 dark:text-white"
  placeholder="Enter text..."
/>
```

### Flex Layouts

```html
<!-- Center everything -->
<div class="flex items-center justify-center">

<!-- Space between -->
<div class="flex items-center justify-between">

<!-- Stack with gap -->
<div class="flex flex-col gap-4">

<!-- Responsive row/column -->
<div class="flex flex-col md:flex-row gap-4">
```

### Grid Layouts

```html
<!-- Auto-fit responsive grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

<!-- Fixed columns -->
<div class="grid grid-cols-12 gap-4">
  <div class="col-span-8">Main</div>
  <div class="col-span-4">Sidebar</div>
</div>
```

## Responsive Design

Mobile-first: Default styles for mobile, add breakpoints for larger.

```html
<!-- BAD: Desktop-first -->
<div class="flex-row md:flex-col">

<!-- GOOD: Mobile-first -->
<div class="flex-col md:flex-row">
```

Breakpoints:
```
sm:  640px
md:  768px
lg:  1024px
xl:  1280px
2xl: 1536px
```

## Dark Mode

Use `dark:` variant for dark mode styles:

```html
<div class="bg-white dark:bg-gray-900">
  <h1 class="text-gray-900 dark:text-white">
  <p class="text-gray-600 dark:text-gray-400">
</div>
```

## Anti-Patterns

| Bad | Good | Why |
|-----|------|-----|
| `class="p-[17px]"` | `class="p-4"` | Use scale |
| `class="text-[#1a2b3c]"` | `class="text-gray-800"` | Use palette |
| `class="w-[500px]"` | `class="max-w-lg"` | Use sizing scale |
| Custom CSS for hover | `hover:bg-blue-700` | Use variants |
| `@apply` everywhere | Inline utilities | Defeats purpose |

## When to Use @apply

Only for truly reusable patterns:

```css
/* OK: Highly reused base styles */
@layer components {
  .btn {
    @apply px-4 py-2 rounded-md font-medium transition-colors;
  }
}
```

```html
<button class="btn bg-blue-600 text-white hover:bg-blue-700">
```

## Organizing Long Class Lists

```html
<!-- Group by concern -->
<button class="
  /* Layout */
  px-4 py-2 flex items-center gap-2
  /* Typography */
  text-sm font-medium
  /* Colors */
  bg-blue-600 text-white
  /* States */
  hover:bg-blue-700 focus:ring-2
  /* Transitions */
  transition-colors duration-150
">
```

## Common Patterns Quick Reference

```html
<!-- Truncate text -->
<p class="truncate">Long text...</p>

<!-- Line clamp -->
<p class="line-clamp-3">Multi-line truncate...</p>

<!-- Aspect ratio -->
<div class="aspect-video">16:9 container</div>

<!-- Scroll container -->
<div class="overflow-y-auto max-h-96">

<!-- Sticky header -->
<header class="sticky top-0 z-10 bg-white/80 backdrop-blur">

<!-- Absolute positioning -->
<div class="relative">
  <span class="absolute top-0 right-0">Badge</span>
</div>
```

## Bundle Optimization

1. **Purge unused styles**: Tailwind does this automatically in production
2. **Avoid arbitrary values**: `p-[13px]` creates one-off utilities
3. **Use components**: Extract repeated patterns to components, not `@apply`
