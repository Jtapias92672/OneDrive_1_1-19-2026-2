/**
 * FORGE Style Extractor
 * 
 * @epic 05 - Figma Parser
 * @task 3.2 - Style Extraction
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Extracts styles (fills, strokes, effects, typography) from Figma nodes.
 *   Converts Figma styles to CSS-compatible formats.
 */

import {
  FigmaNode,
  FigmaFile,
  Paint,
  Effect,
  TypeStyle,
  Color,
  StyleMetadata,
  hasChildren,
} from '../types/figma-api';

// ============================================
// TYPES
// ============================================

export interface ExtractedStyle {
  /** Style ID (from Figma) */
  id: string;
  
  /** Style name */
  name: string;
  
  /** Style type */
  type: 'fill' | 'stroke' | 'effect' | 'text';
  
  /** CSS-compatible value */
  cssValue: string;
  
  /** Original Figma data */
  original: Paint | Effect | TypeStyle;
  
  /** Usage count in the document */
  usageCount: number;
}

export interface ExtractedFill {
  type: 'solid' | 'gradient' | 'image';
  color?: string; // hex
  rgba?: string; // rgba()
  gradient?: {
    type: 'linear' | 'radial' | 'angular' | 'diamond';
    angle?: number;
    stops: { position: number; color: string }[];
  };
  imageRef?: string;
  opacity: number;
}

export interface ExtractedStroke {
  color: string;
  width: number;
  align: 'inside' | 'outside' | 'center';
  dashArray?: number[];
  cap?: 'round' | 'square' | 'butt';
  join?: 'round' | 'bevel' | 'miter';
}

export interface ExtractedEffect {
  type: 'shadow' | 'innerShadow' | 'blur' | 'backgroundBlur';
  color?: string;
  offset?: { x: number; y: number };
  blur: number;
  spread?: number;
  cssValue: string;
}

export interface ExtractedTypography {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number | string;
  letterSpacing: number | string;
  textAlign: 'left' | 'right' | 'center' | 'justify';
  textTransform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
  textDecoration?: 'underline' | 'line-through' | 'none';
}

export interface NodeStyles {
  fills: ExtractedFill[];
  strokes: ExtractedStroke[];
  effects: ExtractedEffect[];
  typography?: ExtractedTypography;
  cornerRadius?: number | [number, number, number, number];
  opacity: number;
  blendMode: string;
}

export interface StyleExtractionResult {
  /** Named styles from the document */
  namedStyles: ExtractedStyle[];
  
  /** All unique colors found */
  colors: Map<string, { hex: string; rgba: string; usageCount: number }>;
  
  /** All unique typography styles */
  typography: Map<string, ExtractedTypography>;
  
  /** All unique effects */
  effects: ExtractedEffect[];
  
  /** Statistics */
  stats: {
    totalNamedStyles: number;
    uniqueColors: number;
    uniqueTypography: number;
    uniqueEffects: number;
  };
}

// ============================================
// STYLE EXTRACTOR
// ============================================

export class StyleExtractor {
  private namedStyles: ExtractedStyle[] = [];
  private colors = new Map<string, { hex: string; rgba: string; usageCount: number }>();
  private typography = new Map<string, ExtractedTypography>();
  private effects: ExtractedEffect[] = [];
  private styleMetadata: Record<string, StyleMetadata> = {};

  /**
   * Extract all styles from a Figma file
   */
  extract(file: FigmaFile): StyleExtractionResult {
    // Reset state
    this.namedStyles = [];
    this.colors.clear();
    this.typography.clear();
    this.effects = [];
    this.styleMetadata = file.styles || {};
    
    // Walk the document tree
    this.walkNode(file.document);
    
    return {
      namedStyles: this.namedStyles,
      colors: this.colors,
      typography: this.typography,
      effects: this.effects,
      stats: {
        totalNamedStyles: this.namedStyles.length,
        uniqueColors: this.colors.size,
        uniqueTypography: this.typography.size,
        uniqueEffects: this.effects.length,
      },
    };
  }

  /**
   * Extract styles from a specific node
   */
  extractNodeStyles(node: FigmaNode): NodeStyles {
    return {
      fills: this.extractFills(node.fills),
      strokes: this.extractStrokes(node),
      effects: this.extractEffects(node.effects),
      typography: node.style ? this.extractTypography(node.style) : undefined,
      cornerRadius: this.extractCornerRadius(node),
      opacity: node.opacity ?? 1,
      blendMode: node.blendMode || 'NORMAL',
    };
  }

  // ==========================================
  // TREE WALKING
  // ==========================================

  private walkNode(node: FigmaNode): void {
    // Extract colors from fills
    if (node.fills) {
      for (const fill of node.fills) {
        if (fill.visible !== false && fill.color) {
          this.addColor(fill.color);
        }
      }
    }
    
    // Extract colors from strokes
    if (node.strokes) {
      for (const stroke of node.strokes) {
        if (stroke.visible !== false && stroke.color) {
          this.addColor(stroke.color);
        }
      }
    }
    
    // Extract typography
    if (node.style && node.type === 'TEXT') {
      const typo = this.extractTypography(node.style);
      const key = this.typographyKey(typo);
      if (!this.typography.has(key)) {
        this.typography.set(key, typo);
      }
    }
    
    // Extract effects
    if (node.effects) {
      for (const effect of node.effects) {
        if (effect.visible) {
          const extracted = this.extractSingleEffect(effect);
          if (!this.effects.some(e => e.cssValue === extracted.cssValue)) {
            this.effects.push(extracted);
          }
        }
      }
    }
    
    // Extract named styles
    if (node.styles) {
      for (const [type, styleId] of Object.entries(node.styles)) {
        this.extractNamedStyle(styleId, type, node);
      }
    }
    
    // Recursively process children
    if (hasChildren(node)) {
      for (const child of node.children) {
        this.walkNode(child);
      }
    }
  }

  // ==========================================
  // FILL EXTRACTION
  // ==========================================

  private extractFills(fills?: Paint[]): ExtractedFill[] {
    if (!fills) return [];
    
    return fills
      .filter(f => f.visible !== false)
      .map(fill => this.extractSingleFill(fill));
  }

  private extractSingleFill(fill: Paint): ExtractedFill {
    const opacity = fill.opacity ?? 1;
    
    switch (fill.type) {
      case 'SOLID':
        const hex = this.colorToHex(fill.color!);
        const rgba = this.colorToRgba(fill.color!, opacity);
        return {
          type: 'solid',
          color: hex,
          rgba,
          opacity,
        };
        
      case 'GRADIENT_LINEAR':
      case 'GRADIENT_RADIAL':
      case 'GRADIENT_ANGULAR':
      case 'GRADIENT_DIAMOND':
        return {
          type: 'gradient',
          gradient: {
            type: this.mapGradientType(fill.type),
            angle: this.calculateGradientAngle(fill.gradientHandlePositions),
            stops: (fill.gradientStops || []).map(stop => ({
              position: stop.position,
              color: this.colorToRgba(stop.color, stop.color.a),
            })),
          },
          opacity,
        };
        
      case 'IMAGE':
        return {
          type: 'image',
          imageRef: fill.imageRef,
          opacity,
        };
        
      default:
        return { type: 'solid', color: '#000000', opacity };
    }
  }

  private mapGradientType(type: string): 'linear' | 'radial' | 'angular' | 'diamond' {
    switch (type) {
      case 'GRADIENT_LINEAR': return 'linear';
      case 'GRADIENT_RADIAL': return 'radial';
      case 'GRADIENT_ANGULAR': return 'angular';
      case 'GRADIENT_DIAMOND': return 'diamond';
      default: return 'linear';
    }
  }

  private calculateGradientAngle(handles?: { x: number; y: number }[]): number {
    if (!handles || handles.length < 2) return 0;
    
    const [start, end] = handles;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    return Math.round(angle + 90); // CSS angles are rotated 90°
  }

  // ==========================================
  // STROKE EXTRACTION
  // ==========================================

  private extractStrokes(node: FigmaNode): ExtractedStroke[] {
    if (!node.strokes) return [];
    
    return node.strokes
      .filter(s => s.visible !== false)
      .map(stroke => ({
        color: stroke.color ? this.colorToHex(stroke.color) : '#000000',
        width: node.strokeWeight || 1,
        align: this.mapStrokeAlign(node.strokeAlign),
        dashArray: node.strokeDashes,
        cap: this.mapStrokeCap(node.strokeCap),
        join: this.mapStrokeJoin(node.strokeJoin),
      }));
  }

  private mapStrokeAlign(align?: string): 'inside' | 'outside' | 'center' {
    switch (align) {
      case 'INSIDE': return 'inside';
      case 'OUTSIDE': return 'outside';
      default: return 'center';
    }
  }

  private mapStrokeCap(cap?: string): 'round' | 'square' | 'butt' | undefined {
    switch (cap) {
      case 'ROUND': return 'round';
      case 'SQUARE': return 'square';
      case 'NONE': return 'butt';
      default: return undefined;
    }
  }

  private mapStrokeJoin(join?: string): 'round' | 'bevel' | 'miter' | undefined {
    switch (join) {
      case 'ROUND': return 'round';
      case 'BEVEL': return 'bevel';
      case 'MITER': return 'miter';
      default: return undefined;
    }
  }

  // ==========================================
  // EFFECT EXTRACTION
  // ==========================================

  private extractEffects(effects?: Effect[]): ExtractedEffect[] {
    if (!effects) return [];
    
    return effects
      .filter(e => e.visible)
      .map(effect => this.extractSingleEffect(effect));
  }

  private extractSingleEffect(effect: Effect): ExtractedEffect {
    const color = effect.color ? this.colorToRgba(effect.color, effect.color.a) : undefined;
    
    switch (effect.type) {
      case 'DROP_SHADOW':
        return {
          type: 'shadow',
          color,
          offset: effect.offset ? { x: effect.offset.x, y: effect.offset.y } : { x: 0, y: 4 },
          blur: effect.radius,
          spread: effect.spread,
          cssValue: this.shadowToCss(effect),
        };
        
      case 'INNER_SHADOW':
        return {
          type: 'innerShadow',
          color,
          offset: effect.offset ? { x: effect.offset.x, y: effect.offset.y } : { x: 0, y: 2 },
          blur: effect.radius,
          spread: effect.spread,
          cssValue: this.shadowToCss(effect, true),
        };
        
      case 'LAYER_BLUR':
        return {
          type: 'blur',
          blur: effect.radius,
          cssValue: `blur(${effect.radius}px)`,
        };
        
      case 'BACKGROUND_BLUR':
        return {
          type: 'backgroundBlur',
          blur: effect.radius,
          cssValue: `blur(${effect.radius}px)`,
        };
        
      default:
        return { type: 'blur', blur: 0, cssValue: '' };
    }
  }

  private shadowToCss(effect: Effect, inset = false): string {
    const x = effect.offset?.x ?? 0;
    const y = effect.offset?.y ?? 4;
    const blur = effect.radius;
    const spread = effect.spread ?? 0;
    const color = effect.color ? this.colorToRgba(effect.color, effect.color.a) : 'rgba(0,0,0,0.25)';
    
    return `${inset ? 'inset ' : ''}${x}px ${y}px ${blur}px ${spread}px ${color}`;
  }

  // ==========================================
  // TYPOGRAPHY EXTRACTION
  // ==========================================

  private extractTypography(style: TypeStyle): ExtractedTypography {
    return {
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeight: this.calculateLineHeight(style),
      letterSpacing: this.calculateLetterSpacing(style),
      textAlign: this.mapTextAlign(style.textAlignHorizontal),
      textTransform: this.mapTextCase(style.textCase),
      textDecoration: this.mapTextDecoration(style.textDecoration),
    };
  }

  private calculateLineHeight(style: TypeStyle): number | string {
    if (style.lineHeightUnit === 'PIXELS') {
      return style.lineHeightPx;
    }
    if (style.lineHeightPercent) {
      return `${style.lineHeightPercent}%`;
    }
    return style.lineHeightPx / style.fontSize;
  }

  private calculateLetterSpacing(style: TypeStyle): number | string {
    // Figma letter spacing is in pixels, CSS often uses em
    if (style.letterSpacing === 0) return 0;
    return `${(style.letterSpacing / style.fontSize).toFixed(3)}em`;
  }

  private mapTextAlign(align: string): 'left' | 'right' | 'center' | 'justify' {
    switch (align) {
      case 'LEFT': return 'left';
      case 'RIGHT': return 'right';
      case 'CENTER': return 'center';
      case 'JUSTIFIED': return 'justify';
      default: return 'left';
    }
  }

  private mapTextCase(textCase?: string): 'uppercase' | 'lowercase' | 'capitalize' | 'none' | undefined {
    switch (textCase) {
      case 'UPPER': return 'uppercase';
      case 'LOWER': return 'lowercase';
      case 'TITLE': return 'capitalize';
      default: return undefined;
    }
  }

  private mapTextDecoration(decoration?: string): 'underline' | 'line-through' | 'none' | undefined {
    switch (decoration) {
      case 'UNDERLINE': return 'underline';
      case 'STRIKETHROUGH': return 'line-through';
      default: return undefined;
    }
  }

  private typographyKey(typo: ExtractedTypography): string {
    return `${typo.fontFamily}-${typo.fontSize}-${typo.fontWeight}-${typo.lineHeight}`;
  }

  // ==========================================
  // CORNER RADIUS
  // ==========================================

  private extractCornerRadius(node: FigmaNode): number | [number, number, number, number] | undefined {
    if (node.rectangleCornerRadii) {
      return node.rectangleCornerRadii;
    }
    return node.cornerRadius;
  }

  // ==========================================
  // NAMED STYLES
  // ==========================================

  private extractNamedStyle(styleId: string, type: string, node: FigmaNode): void {
    const metadata = this.styleMetadata[styleId];
    if (!metadata) return;
    
    // Check if already extracted
    if (this.namedStyles.some(s => s.id === styleId)) {
      // Increment usage count
      const existing = this.namedStyles.find(s => s.id === styleId);
      if (existing) existing.usageCount++;
      return;
    }
    
    let cssValue = '';
    let original: Paint | Effect | TypeStyle | undefined;
    
    switch (metadata.styleType) {
      case 'FILL':
        if (node.fills?.[0]) {
          original = node.fills[0];
          cssValue = this.fillToCss(node.fills[0]);
        }
        break;
      case 'TEXT':
        if (node.style) {
          original = node.style;
          cssValue = this.typographyToCss(node.style);
        }
        break;
      case 'EFFECT':
        if (node.effects?.[0]) {
          original = node.effects[0];
          cssValue = this.extractSingleEffect(node.effects[0]).cssValue;
        }
        break;
    }
    
    if (original) {
      this.namedStyles.push({
        id: styleId,
        name: metadata.name,
        type: this.mapStyleType(metadata.styleType),
        cssValue,
        original,
        usageCount: 1,
      });
    }
  }

  private mapStyleType(type: string): 'fill' | 'stroke' | 'effect' | 'text' {
    switch (type) {
      case 'FILL': return 'fill';
      case 'TEXT': return 'text';
      case 'EFFECT': return 'effect';
      default: return 'fill';
    }
  }

  private fillToCss(fill: Paint): string {
    if (fill.type === 'SOLID' && fill.color) {
      return this.colorToHex(fill.color);
    }
    return '';
  }

  private typographyToCss(style: TypeStyle): string {
    return `font: ${style.fontWeight} ${style.fontSize}px/${style.lineHeightPx}px "${style.fontFamily}"`;
  }

  // ==========================================
  // COLOR UTILITIES
  // ==========================================

  private addColor(color: Color): void {
    const hex = this.colorToHex(color);
    const existing = this.colors.get(hex);
    
    if (existing) {
      existing.usageCount++;
    } else {
      this.colors.set(hex, {
        hex,
        rgba: this.colorToRgba(color, color.a),
        usageCount: 1,
      });
    }
  }

  private colorToHex(color: Color): string {
    const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`.toUpperCase();
  }

  private colorToRgba(color: Color, alpha: number = 1): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
  }
}

// ============================================
// EXPORTS
// ============================================

export default StyleExtractor;
