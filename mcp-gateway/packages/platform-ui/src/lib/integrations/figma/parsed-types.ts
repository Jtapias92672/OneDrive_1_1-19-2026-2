/**
 * Parsed Design Types
 * Epic 11: External Integrations - Phase 2
 *
 * Rich design data structures extracted from Figma API responses.
 */

export interface ParsedComponent {
  id: string;
  name: string;
  type: ParsedNodeType;

  // Dimensions
  bounds: ParsedBounds;

  // Fills
  fills: ParsedFill[];

  // Strokes
  strokes: ParsedStroke[];

  // Text (if type === 'TEXT')
  text?: ParsedText;

  // Auto-layout
  autoLayout?: ParsedAutoLayout;

  // Effects
  effects: ParsedEffect[];

  // Corner radius
  cornerRadius?: number;

  // Children
  children: ParsedComponent[];
}

export type ParsedNodeType =
  | 'FRAME'
  | 'COMPONENT'
  | 'INSTANCE'
  | 'TEXT'
  | 'RECTANGLE'
  | 'GROUP'
  | 'VECTOR'
  | 'ELLIPSE'
  | 'LINE'
  | 'BOOLEAN_OPERATION';

export interface ParsedBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ParsedColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface ParsedGradient {
  stops: Array<{
    position: number;
    color: ParsedColor;
  }>;
  handles?: Array<{ x: number; y: number }>;
}

export interface ParsedFill {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE';
  color?: ParsedColor;
  gradient?: ParsedGradient;
  opacity: number;
}

export interface ParsedStroke {
  type: 'SOLID' | 'GRADIENT_LINEAR';
  color?: ParsedColor;
  weight: number;
  alignment: 'INSIDE' | 'OUTSIDE' | 'CENTER';
}

export interface ParsedText {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  textAlign: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  lineHeight?: number;
  letterSpacing?: number;
}

export interface ParsedAutoLayout {
  direction: 'HORIZONTAL' | 'VERTICAL';
  spacing: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  /** Cross-axis alignment (counterAxisAlignItems in Figma) */
  alignItems: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  /** Main-axis alignment (primaryAxisAlignItems in Figma) */
  justifyContent: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
}

export interface ParsedEffect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  color?: ParsedColor;
  offset?: { x: number; y: number };
  radius: number;
  spread?: number;
}

export interface ParsedStyle {
  name: string;
  type: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
  value: unknown;
}

export interface ParsedDesign {
  name: string;
  lastModified: string;
  components: ParsedComponent[];
  styles: Record<string, ParsedStyle>;
}
