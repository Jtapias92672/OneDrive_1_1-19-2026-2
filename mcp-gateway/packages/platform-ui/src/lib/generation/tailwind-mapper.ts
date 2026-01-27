/**
 * Tailwind Mapper
 * Epic 11: External Integrations - Phase 3
 *
 * Maps Figma design properties to Tailwind CSS classes.
 */

import {
  ParsedFill,
  ParsedAutoLayout,
  ParsedText,
  ParsedEffect,
  ParsedColor,
  ParsedBounds,
} from '../integrations/figma/parsed-types';
import { rgbToHex, colorsMatch, hexToRgb } from './color-utils';

/**
 * Standard Tailwind color palette mapping
 */
const TAILWIND_COLORS: Record<string, string> = {
  '#000000': 'black',
  '#ffffff': 'white',
  '#f9fafb': 'gray-50',
  '#f3f4f6': 'gray-100',
  '#e5e7eb': 'gray-200',
  '#d1d5db': 'gray-300',
  '#9ca3af': 'gray-400',
  '#6b7280': 'gray-500',
  '#4b5563': 'gray-600',
  '#374151': 'gray-700',
  '#1f2937': 'gray-800',
  '#111827': 'gray-900',
  '#fef2f2': 'red-50',
  '#fee2e2': 'red-100',
  '#fecaca': 'red-200',
  '#fca5a5': 'red-300',
  '#f87171': 'red-400',
  '#ef4444': 'red-500',
  '#dc2626': 'red-600',
  '#b91c1c': 'red-700',
  '#991b1b': 'red-800',
  '#7f1d1d': 'red-900',
  '#eff6ff': 'blue-50',
  '#dbeafe': 'blue-100',
  '#bfdbfe': 'blue-200',
  '#93c5fd': 'blue-300',
  '#60a5fa': 'blue-400',
  '#3b82f6': 'blue-500',
  '#2563eb': 'blue-600',
  '#1d4ed8': 'blue-700',
  '#1e40af': 'blue-800',
  '#1e3a8a': 'blue-900',
  '#f0fdf4': 'green-50',
  '#dcfce7': 'green-100',
  '#bbf7d0': 'green-200',
  '#86efac': 'green-300',
  '#4ade80': 'green-400',
  '#22c55e': 'green-500',
  '#16a34a': 'green-600',
  '#15803d': 'green-700',
  '#166534': 'green-800',
  '#14532d': 'green-900',
};

/**
 * Find closest Tailwind color match
 */
export function findClosestTailwindColor(color: ParsedColor): string | null {
  const hex = rgbToHex(color).toLowerCase();

  // Exact match
  if (TAILWIND_COLORS[hex]) {
    return TAILWIND_COLORS[hex];
  }

  // Find closest match
  let closestColor: string | null = null;
  let minDistance = Infinity;

  for (const [tailwindHex, tailwindName] of Object.entries(TAILWIND_COLORS)) {
    const tailwindColor = hexToRgb(tailwindHex);
    const dr = (color.r - tailwindColor.r) * 255;
    const dg = (color.g - tailwindColor.g) * 255;
    const db = (color.b - tailwindColor.b) * 255;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);

    if (distance < minDistance && distance < 30) {
      minDistance = distance;
      closestColor = tailwindName;
    }
  }

  return closestColor;
}

/**
 * Map fill to Tailwind background class
 */
export function mapFillToTailwind(fill: ParsedFill): string {
  if (fill.type === 'SOLID' && fill.color) {
    const tailwindColor = findClosestTailwindColor(fill.color);
    if (tailwindColor) {
      return `bg-${tailwindColor}`;
    }
    // Fallback to arbitrary value
    const hex = rgbToHex(fill.color);
    return `bg-[${hex}]`;
  }
  return '';
}

/**
 * Map fill to Tailwind text color class
 */
export function mapFillToTextColor(fill: ParsedFill): string {
  if (fill.type === 'SOLID' && fill.color) {
    const tailwindColor = findClosestTailwindColor(fill.color);
    if (tailwindColor) {
      return `text-${tailwindColor}`;
    }
    const hex = rgbToHex(fill.color);
    return `text-[${hex}]`;
  }
  return '';
}

/**
 * Map auto-layout properties to Tailwind flex classes
 */
export function mapAutoLayoutToTailwind(layout: ParsedAutoLayout): string[] {
  const classes: string[] = ['flex'];

  // Direction
  classes.push(layout.direction === 'VERTICAL' ? 'flex-col' : 'flex-row');

  // Spacing (gap)
  if (layout.spacing > 0) {
    const gapValue = Math.round(layout.spacing / 4);
    if (gapValue > 0 && gapValue <= 96) {
      classes.push(`gap-${gapValue}`);
    } else if (layout.spacing > 0) {
      classes.push(`gap-[${layout.spacing}px]`);
    }
  }

  // Padding - check for uniform padding first
  const { paddingTop, paddingRight, paddingBottom, paddingLeft } = layout;
  if (
    paddingTop === paddingBottom &&
    paddingLeft === paddingRight &&
    paddingTop === paddingLeft &&
    paddingTop > 0
  ) {
    const pValue = Math.round(paddingTop / 4);
    if (pValue > 0 && pValue <= 96) {
      classes.push(`p-${pValue}`);
    } else {
      classes.push(`p-[${paddingTop}px]`);
    }
  } else {
    // Individual padding
    if (paddingTop > 0) {
      const pt = Math.round(paddingTop / 4);
      classes.push(pt <= 96 ? `pt-${pt}` : `pt-[${paddingTop}px]`);
    }
    if (paddingRight > 0) {
      const pr = Math.round(paddingRight / 4);
      classes.push(pr <= 96 ? `pr-${pr}` : `pr-[${paddingRight}px]`);
    }
    if (paddingBottom > 0) {
      const pb = Math.round(paddingBottom / 4);
      classes.push(pb <= 96 ? `pb-${pb}` : `pb-[${paddingBottom}px]`);
    }
    if (paddingLeft > 0) {
      const pl = Math.round(paddingLeft / 4);
      classes.push(pl <= 96 ? `pl-${pl}` : `pl-[${paddingLeft}px]`);
    }
  }

  // Alignment (cross-axis)
  switch (layout.alignItems) {
    case 'CENTER':
      classes.push('items-center');
      break;
    case 'MAX':
      classes.push('items-end');
      break;
    case 'BASELINE':
      classes.push('items-baseline');
      break;
  }

  // Justify (main-axis)
  switch (layout.justifyContent) {
    case 'CENTER':
      classes.push('justify-center');
      break;
    case 'MAX':
      classes.push('justify-end');
      break;
    case 'SPACE_BETWEEN':
      classes.push('justify-between');
      break;
  }

  return classes;
}

/**
 * Map text properties to Tailwind typography classes
 */
export function mapTextToTailwind(text: ParsedText): string[] {
  const classes: string[] = [];

  // Font size mapping
  const sizeMap: Record<number, string> = {
    10: 'text-[10px]',
    12: 'text-xs',
    14: 'text-sm',
    16: 'text-base',
    18: 'text-lg',
    20: 'text-xl',
    24: 'text-2xl',
    30: 'text-3xl',
    36: 'text-4xl',
    48: 'text-5xl',
    60: 'text-6xl',
  };

  // Find closest font size
  const sizes = Object.keys(sizeMap).map(Number);
  const closest = sizes.reduce((a, b) =>
    Math.abs(b - text.fontSize) < Math.abs(a - text.fontSize) ? b : a
  );

  if (Math.abs(closest - text.fontSize) <= 2) {
    classes.push(sizeMap[closest]);
  } else {
    classes.push(`text-[${text.fontSize}px]`);
  }

  // Font weight
  if (text.fontWeight >= 700) {
    classes.push('font-bold');
  } else if (text.fontWeight >= 600) {
    classes.push('font-semibold');
  } else if (text.fontWeight >= 500) {
    classes.push('font-medium');
  } else if (text.fontWeight <= 300) {
    classes.push('font-light');
  }

  // Text alignment
  switch (text.textAlign) {
    case 'CENTER':
      classes.push('text-center');
      break;
    case 'RIGHT':
      classes.push('text-right');
      break;
    case 'JUSTIFIED':
      classes.push('text-justify');
      break;
  }

  // Line height
  if (text.lineHeight) {
    const ratio = text.lineHeight / text.fontSize;
    if (ratio <= 1) {
      classes.push('leading-none');
    } else if (ratio <= 1.25) {
      classes.push('leading-tight');
    } else if (ratio <= 1.5) {
      classes.push('leading-snug');
    } else if (ratio <= 1.75) {
      classes.push('leading-normal');
    } else {
      classes.push('leading-relaxed');
    }
  }

  // Letter spacing
  if (text.letterSpacing) {
    if (text.letterSpacing < 0) {
      classes.push('tracking-tight');
    } else if (text.letterSpacing > 0.5) {
      classes.push('tracking-wide');
    }
  }

  return classes;
}

/**
 * Map effect to Tailwind shadow/blur class
 */
export function mapEffectToTailwind(effect: ParsedEffect): string {
  if (effect.type === 'DROP_SHADOW') {
    if (effect.radius <= 2) return 'shadow-sm';
    if (effect.radius <= 4) return 'shadow';
    if (effect.radius <= 8) return 'shadow-md';
    if (effect.radius <= 16) return 'shadow-lg';
    if (effect.radius <= 24) return 'shadow-xl';
    return 'shadow-2xl';
  }

  if (effect.type === 'INNER_SHADOW') {
    return 'shadow-inner';
  }

  if (effect.type === 'LAYER_BLUR') {
    if (effect.radius <= 4) return 'blur-sm';
    if (effect.radius <= 8) return 'blur';
    if (effect.radius <= 12) return 'blur-md';
    if (effect.radius <= 16) return 'blur-lg';
    return 'blur-xl';
  }

  if (effect.type === 'BACKGROUND_BLUR') {
    return 'backdrop-blur';
  }

  return '';
}

/**
 * Map dimensions to Tailwind width/height classes
 */
export function mapBoundsToTailwind(bounds: ParsedBounds): string[] {
  const classes: string[] = [];

  // Width
  const widthMap: Record<number, string> = {
    0: 'w-0',
    4: 'w-1',
    8: 'w-2',
    12: 'w-3',
    16: 'w-4',
    20: 'w-5',
    24: 'w-6',
    32: 'w-8',
    40: 'w-10',
    48: 'w-12',
    64: 'w-16',
    80: 'w-20',
    96: 'w-24',
    128: 'w-32',
    160: 'w-40',
    192: 'w-48',
    256: 'w-64',
    320: 'w-80',
    384: 'w-96',
  };

  if (widthMap[bounds.width]) {
    classes.push(widthMap[bounds.width]);
  } else if (bounds.width > 0) {
    classes.push(`w-[${bounds.width}px]`);
  }

  // Height
  const heightMap: Record<number, string> = {
    0: 'h-0',
    4: 'h-1',
    8: 'h-2',
    12: 'h-3',
    16: 'h-4',
    20: 'h-5',
    24: 'h-6',
    32: 'h-8',
    40: 'h-10',
    48: 'h-12',
    64: 'h-16',
    80: 'h-20',
    96: 'h-24',
    128: 'h-32',
    160: 'h-40',
    192: 'h-48',
    256: 'h-64',
    320: 'h-80',
    384: 'h-96',
  };

  if (heightMap[bounds.height]) {
    classes.push(heightMap[bounds.height]);
  } else if (bounds.height > 0) {
    classes.push(`h-[${bounds.height}px]`);
  }

  return classes;
}

/**
 * Map corner radius to Tailwind rounded class
 */
export function mapCornerRadiusToTailwind(radius: number | undefined): string {
  if (!radius || radius === 0) return '';

  const radiusMap: Record<number, string> = {
    2: 'rounded-sm',
    4: 'rounded',
    6: 'rounded-md',
    8: 'rounded-lg',
    12: 'rounded-xl',
    16: 'rounded-2xl',
    24: 'rounded-3xl',
  };

  // Find closest match
  const sizes = Object.keys(radiusMap).map(Number);
  const closest = sizes.reduce((a, b) =>
    Math.abs(b - radius) < Math.abs(a - radius) ? b : a
  );

  if (Math.abs(closest - radius) <= 2) {
    return radiusMap[closest];
  }

  if (radius >= 9999) {
    return 'rounded-full';
  }

  return `rounded-[${radius}px]`;
}
