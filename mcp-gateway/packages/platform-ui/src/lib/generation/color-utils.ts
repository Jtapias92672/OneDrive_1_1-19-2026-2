/**
 * Color Utilities
 * Epic 11: External Integrations - Phase 3
 *
 * Color conversion and matching utilities for Figma → CSS/Tailwind.
 */

import { ParsedColor } from '../integrations/figma/parsed-types';

/**
 * Convert Figma RGBA (0-1 range) to hex string
 */
export function rgbToHex(color: ParsedColor): string {
  const r = Math.round(color.r * 255)
    .toString(16)
    .padStart(2, '0');
  const g = Math.round(color.g * 255)
    .toString(16)
    .padStart(2, '0');
  const b = Math.round(color.b * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${r}${g}${b}`;
}

/**
 * Convert Figma RGBA to CSS rgb/rgba string
 */
export function rgbToCss(color: ParsedColor): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  if (color.a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${color.a.toFixed(2)})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Parse hex color to RGBA
 */
export function hexToRgb(hex: string): ParsedColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0, a: 1 };
  }
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
    a: 1,
  };
}

/**
 * Calculate color distance (Euclidean in RGB space)
 */
export function colorDistance(c1: ParsedColor, c2: ParsedColor): number {
  const dr = (c1.r - c2.r) * 255;
  const dg = (c1.g - c2.g) * 255;
  const db = (c1.b - c2.b) * 255;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Check if two colors are visually similar (within threshold)
 */
export function colorsMatch(c1: ParsedColor, c2: ParsedColor, threshold = 10): boolean {
  return colorDistance(c1, c2) <= threshold;
}

/**
 * Lighten a color by a percentage
 */
export function lighten(color: ParsedColor, amount: number): ParsedColor {
  return {
    r: Math.min(1, color.r + (1 - color.r) * amount),
    g: Math.min(1, color.g + (1 - color.g) * amount),
    b: Math.min(1, color.b + (1 - color.b) * amount),
    a: color.a,
  };
}

/**
 * Darken a color by a percentage
 */
export function darken(color: ParsedColor, amount: number): ParsedColor {
  return {
    r: Math.max(0, color.r * (1 - amount)),
    g: Math.max(0, color.g * (1 - amount)),
    b: Math.max(0, color.b * (1 - amount)),
    a: color.a,
  };
}

/**
 * Get luminance for contrast calculations
 */
export function getLuminance(color: ParsedColor): number {
  const [r, g, b] = [color.r, color.g, color.b].map((c) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(c1: ParsedColor, c2: ParsedColor): number {
  const l1 = getLuminance(c1);
  const l2 = getLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color is considered "light"
 */
export function isLightColor(color: ParsedColor): boolean {
  return getLuminance(color) > 0.5;
}
