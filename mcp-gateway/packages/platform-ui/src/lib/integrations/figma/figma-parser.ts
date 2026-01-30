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
    console.log('[FigmaParser.parse] Starting parse');
    console.log('[FigmaParser.parse] File name:', file.name);
    console.log('[FigmaParser.parse] Document children:', file.document.children?.length);

    const pages = file.document.children || [];
    console.log('[FigmaParser.parse] Processing', pages.length, 'pages');
    const components: ParsedComponent[] = [];

    for (const page of pages) {
      console.log('[FigmaParser.parse] Processing page:', page.name, 'Children:', page.children?.length);
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
      imageUrl: (() => {
        // Check for IMAGE node type
        if (node.type === 'IMAGE' && 'imageRef' in node) {
          console.log(`[FigmaParser] IMAGE node "${node.name}" has imageRef:`, node.imageRef);
          return node.imageRef as string;
        }

        // Check if COMPONENT/INSTANCE/FRAME has IMAGE fill
        if (['COMPONENT', 'INSTANCE', 'FRAME', 'RECTANGLE'].includes(node.type)) {
          const fills = node.fills as Paint[] | undefined;
          const imageFill = fills?.find(f => f.type === 'IMAGE' && f.imageRef);
          if (imageFill?.imageRef) {
            console.log(`[FigmaParser] ${node.type} "${node.name}" has IMAGE fill:`, imageFill.imageRef);
            // For IMAGE fills, we'll use the node ID later to fetch the image
            return undefined; // Don't set imageUrl here - will be set via fills
          }
        }

        return undefined;
      })(),
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
      IMAGE: 'IMAGE',
    };
    return typeMap[type] || 'FRAME';
  }

  /**
   * Parse fill paints into ParsedFill array
   */
  private parseFills(fills: Paint[]): ParsedFill[] {
    const result = fills
      .filter((f) => f.visible !== false)
      .map((f) => {
        if (f.type === 'IMAGE') {
          console.log('[FigmaParser] IMAGE fill detected:', { imageRef: f.imageRef, scaleMode: f.scaleMode });
        }
        return {
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
          imageRef: f.type === 'IMAGE' ? f.imageRef : undefined,
          scaleMode: f.type === 'IMAGE' ? f.scaleMode : undefined,
        };
      });
    return result;
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
