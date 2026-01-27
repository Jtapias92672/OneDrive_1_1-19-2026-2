/**
 * Figma Parser
 * Epic 11: External Integrations - Phase 2
 *
 * Extracts rich design properties from Figma API responses.
 */

import { FigmaFile, FigmaNode, FigmaStyle, Paint, Effect } from './figma-types';
import {
  ParsedComponent,
  ParsedDesign,
  ParsedFill,
  ParsedStroke,
  ParsedText,
  ParsedAutoLayout,
  ParsedEffect,
  ParsedStyle,
  ParsedNodeType,
  ParsedColor,
} from './parsed-types';

export class FigmaParser {
  /**
   * Parse a Figma file into a structured ParsedDesign
   */
  parse(file: FigmaFile): ParsedDesign {
    const pages = file.document.children || [];
    const components: ParsedComponent[] = [];

    for (const page of pages) {
      if (page.children) {
        for (const child of page.children) {
          components.push(this.parseNode(child));
        }
      }
    }

    return {
      name: file.name,
      lastModified: file.lastModified,
      components,
      styles: this.parseStyles(file.styles || {}),
    };
  }

  /**
   * Parse a single Figma node into a ParsedComponent
   */
  parseNode(node: FigmaNode): ParsedComponent {
    return {
      id: node.id,
      name: node.name,
      type: this.mapNodeType(node.type),
      bounds: node.absoluteBoundingBox || { x: 0, y: 0, width: 0, height: 0 },
      fills: this.parseFills(node.fills || []),
      strokes: this.parseStrokes(node.strokes || [], node.strokeWeight, node.strokeAlign),
      text: node.type === 'TEXT' ? this.parseText(node) : undefined,
      autoLayout: node.layoutMode && node.layoutMode !== 'NONE' ? this.parseAutoLayout(node) : undefined,
      effects: this.parseEffects(node.effects || []),
      cornerRadius: node.cornerRadius,
      children: (node.children || []).map((c) => this.parseNode(c)),
    };
  }

  /**
   * Map Figma node type to ParsedNodeType
   */
  private mapNodeType(type: string): ParsedNodeType {
    const typeMap: Record<string, ParsedNodeType> = {
      FRAME: 'FRAME',
      COMPONENT: 'COMPONENT',
      INSTANCE: 'INSTANCE',
      TEXT: 'TEXT',
      RECTANGLE: 'RECTANGLE',
      GROUP: 'GROUP',
      VECTOR: 'VECTOR',
      ELLIPSE: 'ELLIPSE',
      LINE: 'LINE',
      BOOLEAN_OPERATION: 'BOOLEAN_OPERATION',
    };
    return typeMap[type] || 'FRAME';
  }

  /**
   * Parse fill paints into ParsedFill array
   */
  private parseFills(fills: Paint[]): ParsedFill[] {
    return fills
      .filter((f) => f.visible !== false)
      .map((f) => ({
        type: f.type,
        color: f.color
          ? {
              r: f.color.r,
              g: f.color.g,
              b: f.color.b,
              a: f.color.a ?? 1,
            }
          : undefined,
        gradient: undefined, // TODO: Parse gradient stops when present
        opacity: f.opacity ?? 1,
      }));
  }

  /**
   * Parse stroke paints into ParsedStroke array
   */
  private parseStrokes(
    strokes: Paint[],
    strokeWeight?: number,
    strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER'
  ): ParsedStroke[] {
    return strokes
      .filter((s) => s.visible !== false)
      .map((s) => ({
        type: s.type as 'SOLID' | 'GRADIENT_LINEAR',
        color: s.color
          ? {
              r: s.color.r,
              g: s.color.g,
              b: s.color.b,
              a: s.color.a ?? 1,
            }
          : undefined,
        weight: strokeWeight ?? 1,
        alignment: strokeAlign ?? 'CENTER',
      }));
  }

  /**
   * Parse text properties from a TEXT node
   */
  private parseText(node: FigmaNode): ParsedText {
    const style = node.style || {
      fontFamily: 'Inter',
      fontWeight: 400,
      fontSize: 14,
      textAlignHorizontal: 'LEFT' as const,
    };
    return {
      content: node.characters || '',
      fontFamily: style.fontFamily || 'Inter',
      fontSize: style.fontSize || 14,
      fontWeight: style.fontWeight || 400,
      textAlign: style.textAlignHorizontal || 'LEFT',
      lineHeight: style.lineHeightPx,
      letterSpacing: style.letterSpacing,
    };
  }

  /**
   * Parse auto-layout properties
   * Note: Figma's primaryAxisAlignItems controls justify-content (main axis)
   *       Figma's counterAxisAlignItems controls align-items (cross axis)
   */
  private parseAutoLayout(node: FigmaNode): ParsedAutoLayout {
    return {
      direction: node.layoutMode === 'HORIZONTAL' ? 'HORIZONTAL' : 'VERTICAL',
      spacing: node.itemSpacing || 0,
      paddingTop: node.paddingTop || 0,
      paddingRight: node.paddingRight || 0,
      paddingBottom: node.paddingBottom || 0,
      paddingLeft: node.paddingLeft || 0,
      alignItems: node.counterAxisAlignItems || 'MIN',
      justifyContent: node.primaryAxisAlignItems || 'MIN',
    };
  }

  /**
   * Parse effects (shadows, blur)
   */
  private parseEffects(effects: Effect[]): ParsedEffect[] {
    return effects
      .filter((e) => e.visible !== false)
      .map((e) => ({
        type: e.type,
        color: e.color
          ? {
              r: e.color.r,
              g: e.color.g,
              b: e.color.b,
              a: e.color.a ?? 1,
            }
          : undefined,
        offset: e.offset,
        radius: e.radius || 0,
        spread: e.spread,
      }));
  }

  /**
   * Parse style definitions
   */
  private parseStyles(styles: Record<string, FigmaStyle>): Record<string, ParsedStyle> {
    const result: Record<string, ParsedStyle> = {};
    for (const [key, style] of Object.entries(styles)) {
      result[key] = {
        name: style.name,
        type: style.styleType,
        value: style,
      };
    }
    return result;
  }

  /**
   * Convert RGBA color to hex string
   */
  static rgbToHex(color: ParsedColor): string {
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
   * Convert RGBA color to CSS rgb() string
   */
  static rgbToCss(color: ParsedColor): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    if (color.a < 1) {
      return `rgba(${r}, ${g}, ${b}, ${color.a.toFixed(2)})`;
    }
    return `rgb(${r}, ${g}, ${b})`;
  }
}
