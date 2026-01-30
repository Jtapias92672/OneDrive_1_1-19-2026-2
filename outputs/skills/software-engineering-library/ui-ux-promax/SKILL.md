---
name: ui-ux-promax
description: Design vocabulary and intelligence for professional UI/UX. Use when needing design terminology (glassmorphism, neo-brutalism, etc.), generating design systems, building dashboards, landing pages, or mobile apps. Provides specific visual vocabulary to guide AI toward precise design outputs across 13 tech stacks and 100+ design patterns.
---

# UI/UX Pro Max

Design vocabulary and intelligence for precise UI direction.

## Core Insight

**AI doesn't lack creativity. Humans lack the vocabulary to guide it.**

This skill provides the precise terminology that unlocks professional design output.

## When to Use

- Building UI without a designer
- Describing visual styles to AI
- Generating design systems
- Creating dashboards, landing pages, apps
- Need specific "look and feel"

## Design Styles Vocabulary

### Glassmorphism
```
Keywords: frosted glass, blur, transparency, light refraction
CSS: backdrop-filter: blur(10px); background: rgba(255,255,255,0.1);
Use for: Modern dashboards, overlays, cards, modals
```

### Neumorphism (Soft UI)
```
Keywords: soft shadows, embossed, extruded, tactile
CSS: box-shadow: 8px 8px 16px #d1d1d1, -8px -8px 16px #ffffff;
Use for: Buttons, toggles, sliders, settings panels
```

### Neo-Brutalism
```
Keywords: bold colors, thick borders, raw, intentionally rough
CSS: border: 3px solid black; box-shadow: 4px 4px 0 black;
Use for: Creative portfolios, bold statements, anti-corporate
```

### Minimalism
```
Keywords: whitespace, clean, essential, reduction
CSS: Lots of margin, limited color palette, thin fonts
Use for: Professional services, luxury brands, content-focused
```

### Bento Grid
```
Keywords: varied card sizes, magazine layout, asymmetric grid
CSS: grid-template-columns: repeat(4, 1fr); varied spans
Use for: Dashboards, feature showcases, portfolios
```

### Dark Mode
```
Keywords: low brightness, reduced eye strain, OLED-friendly
Colors: Gray-900 background, Gray-100 text, muted accents
Use for: Dev tools, media apps, night-time usage
```

### Skeuomorphism
```
Keywords: realistic textures, physical metaphors, familiar
Examples: Leather texture, paper, wood grain, physical buttons
Use for: Educational apps, games, nostalgic design
```

### Flat Design
```
Keywords: 2D, no shadows, bold colors, simple shapes
CSS: No gradients, no shadows, solid colors
Use for: Icons, illustrations, mobile apps
```

## Component Vocabulary

### Cards
```
"Elevated card" = shadow-md, white background
"Outlined card" = border, no shadow
"Glass card" = transparent, backdrop blur
"Floating card" = large shadow, lifted appearance
```

### Buttons
```
"Primary CTA" = filled, brand color, prominent
"Secondary" = outlined or muted background
"Ghost button" = transparent, text only
"Pill button" = fully rounded corners
"Icon button" = square, icon only
```

### Navigation
```
"Sticky header" = fixed top, blur background
"Sidebar nav" = left-anchored, collapsible
"Bottom nav" = mobile, icon + label
"Breadcrumbs" = hierarchical, > separated
"Tab bar" = horizontal, underline active
```

### Feedback
```
"Toast" = temporary, corner-positioned
"Snackbar" = bottom, action button
"Modal" = centered, overlay backdrop
"Sheet" = slides from edge (bottom/right)
"Tooltip" = hover-triggered, contextual
```

## Project Type Prompts

### Dashboard
```
"Build a dashboard with:
- Bento grid layout
- Glassmorphism cards
- Dark mode
- Stats cards with sparklines
- Sidebar navigation"
```

### Landing Page
```
"Build a landing page with:
- Hero section with gradient text
- Bento feature grid
- Social proof section
- Sticky CTA header
- Minimalist footer"
```

### SaaS App
```
"Build a SaaS interface with:
- Clean sidebar navigation
- White card-based content
- Subtle shadows
- Blue accent color
- Empty states with illustrations"
```

### Mobile App
```
"Build a mobile app with:
- Bottom tab navigation
- Pull-to-refresh
- Card-based content
- Floating action button
- Native-feeling transitions"
```

## Color Psychology

| Color | Meaning | Use For |
|-------|---------|---------|
| Blue | Trust, professional | Finance, healthcare, B2B |
| Green | Growth, nature | Eco, finance (positive), health |
| Red | Urgency, energy | CTAs, warnings, food |
| Purple | Premium, creative | Luxury, creative tools |
| Orange | Friendly, energetic | Youth brands, food |
| Black | Luxury, power | Fashion, premium products |
| White | Clean, simple | Healthcare, minimalist |

## Typography Pairings

```
Modern: Inter + Inter (variable weight)
Classic: Playfair Display + Source Sans
Tech: Space Grotesk + IBM Plex Mono
Friendly: Poppins + Open Sans
Editorial: Merriweather + Lato
```

## Spacing System

```
Micro: 4px (icons, inline spacing)
Small: 8px (between related elements)
Medium: 16px (between sections)
Large: 24-32px (major sections)
XL: 48-64px (page sections)
```

## Quick Style Recipes

### "Apple-like"
```
Minimalist, lots of whitespace, SF Pro font,
subtle gray cards, animated micro-interactions,
high-quality imagery, single accent color
```

### "Stripe-like"
```
Clean, technical, gradient hero,
code snippets, documentation style,
purple/blue gradient, metric cards
```

### "Linear-like"
```
Dark mode default, purple accents,
keyboard shortcuts visible, minimal borders,
command palette, glassmorphism elements
```

### "Notion-like"
```
Content-first, markdown-native,
collapsible blocks, minimal chrome,
emoji as icons, gray scale palette
```
