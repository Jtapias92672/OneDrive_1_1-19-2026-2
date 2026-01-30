/**
 * FORGE Figma API Types
 *
 * @epic 05 - Figma Parser
 * @task 1.1 - Type Definitions
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 *
 * @description
 *   TypeScript types for Figma REST API responses.
 *   Based on Figma API v1 documentation.
 */

// ============================================
// NODE TYPES
// ============================================

export type FigmaNodeType =
  | 'DOCUMENT'
  | 'CANVAS'
  | 'FRAME'
  | 'GROUP'
  | 'VECTOR'
  | 'BOOLEAN_OPERATION'
  | 'STAR'
  | 'LINE'
  | 'ELLIPSE'
  | 'REGULAR_POLYGON'
  | 'RECTANGLE'
  | 'TEXT'
  | 'SLICE'
  | 'COMPONENT'
  | 'COMPONENT_SET'
  | 'INSTANCE'
  | 'STICKY'
  | 'SHAPE_WITH_TEXT'
  | 'CONNECTOR'
  | 'SECTION';

// ============================================
// GEOMETRY
// ============================================

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Vector {
  x: number;
  y: number;
}

export interface Transform {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

// ============================================
// COLORS & PAINTS
// ============================================

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type PaintType =
  | 'SOLID'
  | 'GRADIENT_LINEAR'
  | 'GRADIENT_RADIAL'
  | 'GRADIENT_ANGULAR'
  | 'GRADIENT_DIAMOND'
  | 'IMAGE'
  | 'EMOJI';

export interface ColorStop {
  position: number;
  color: Color;
}

export interface Paint {
  type: PaintType;
  visible?: boolean;
  opacity?: number;

  // Solid
  color?: Color;

  // Gradient
  gradientHandlePositions?: Vector[];
  gradientStops?: ColorStop[];

  // Image
  scaleMode?: 'FILL' | 'FIT' | 'TILE' | 'STRETCH';
  imageRef?: string;
  imageTransform?: Transform;
  scalingFactor?: number;
  rotation?: number;
  gifRef?: string;
}

// ============================================
// EFFECTS
// ============================================

export type EffectType =
  | 'INNER_SHADOW'
  | 'DROP_SHADOW'
  | 'LAYER_BLUR'
  | 'BACKGROUND_BLUR';

export interface Effect {
  type: EffectType;
  visible: boolean;
  radius: number;

  // Shadow
  color?: Color;
  blendMode?: BlendMode;
  offset?: Vector;
  spread?: number;
  showShadowBehindNode?: boolean;
}

export type BlendMode =
  | 'PASS_THROUGH'
  | 'NORMAL'
  | 'DARKEN'
  | 'MULTIPLY'
  | 'LINEAR_BURN'
  | 'COLOR_BURN'
  | 'LIGHTEN'
  | 'SCREEN'
  | 'LINEAR_DODGE'
  | 'COLOR_DODGE'
  | 'OVERLAY'
  | 'SOFT_LIGHT'
  | 'HARD_LIGHT'
  | 'DIFFERENCE'
  | 'EXCLUSION'
  | 'HUE'
  | 'SATURATION'
  | 'COLOR'
  | 'LUMINOSITY';

// ============================================
// TYPOGRAPHY
// ============================================

export interface TypeStyle {
  fontFamily: string;
  fontPostScriptName?: string;
  fontWeight: number;
  fontSize: number;
  textAlignHorizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'JUSTIFIED';
  textAlignVertical: 'TOP' | 'CENTER' | 'BOTTOM';
  letterSpacing: number;
  lineHeightPx: number;
  lineHeightPercent?: number;
  lineHeightPercentFontSize?: number;
  lineHeightUnit: 'PIXELS' | 'FONT_SIZE_%' | 'INTRINSIC_%';
  textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
  textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
  textAutoResize?: 'NONE' | 'HEIGHT' | 'WIDTH_AND_HEIGHT' | 'TRUNCATE';
  paragraphSpacing?: number;
  paragraphIndent?: number;
}

// ============================================
// LAYOUT (AUTO LAYOUT)
// ============================================

export type LayoutMode = 'NONE' | 'HORIZONTAL' | 'VERTICAL';
export type LayoutAlign = 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'INHERIT';
export type LayoutSizing = 'FIXED' | 'HUG' | 'FILL';
export type LayoutWrap = 'NO_WRAP' | 'WRAP';

export interface LayoutConstraint {
  vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'TOP_BOTTOM' | 'SCALE';
  horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'LEFT_RIGHT' | 'SCALE';
}

// ============================================
// STROKES
// ============================================

export type StrokeAlign = 'INSIDE' | 'OUTSIDE' | 'CENTER';
export type StrokeCap = 'NONE' | 'ROUND' | 'SQUARE' | 'LINE_ARROW' | 'TRIANGLE_ARROW';
export type StrokeJoin = 'MITER' | 'BEVEL' | 'ROUND';

// ============================================
// FIGMA NODE (BASE)
// ============================================

export interface FigmaNode {
  id: string;
  name: string;
  type: FigmaNodeType;
  visible?: boolean;
  locked?: boolean;

  // Children
  children?: FigmaNode[];

  // Geometry
  absoluteBoundingBox?: Rectangle;
  absoluteRenderBounds?: Rectangle;
  relativeTransform?: number[][];
  size?: Vector;

  // Constraints
  constraints?: LayoutConstraint;

  // Auto Layout
  layoutMode?: LayoutMode;
  layoutAlign?: LayoutAlign;
  layoutGrow?: number;
  layoutWrap?: LayoutWrap;
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  counterAxisSpacing?: number;
  layoutPositioning?: 'AUTO' | 'ABSOLUTE';
  itemReverseZIndex?: boolean;
  strokesIncludedInLayout?: boolean;

  // Individual layout sizing
  layoutSizingHorizontal?: LayoutSizing;
  layoutSizingVertical?: LayoutSizing;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;

  // Styling
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: StrokeAlign;
  strokeCap?: StrokeCap;
  strokeJoin?: StrokeJoin;
  strokeDashes?: number[];
  strokeMiterLimit?: number;
  cornerRadius?: number;
  rectangleCornerRadii?: [number, number, number, number];
  effects?: Effect[];
  blendMode?: BlendMode;
  opacity?: number;
  isMask?: boolean;
  maskType?: 'ALPHA' | 'VECTOR' | 'LUMINANCE';

  // Text specific
  characters?: string;
  style?: TypeStyle;
  characterStyleOverrides?: number[];
  styleOverrideTable?: Record<number, TypeStyle>;

  // Component specific
  componentId?: string;
  componentPropertyDefinitions?: Record<string, ComponentPropertyDefinition>;
  componentPropertyReferences?: Record<string, string>;

  // Instance specific
  mainComponent?: { id: string };
  overrides?: Record<string, unknown>;

  // Exports
  exportSettings?: ExportSetting[];

  // Reactions (interactions)
  reactions?: Reaction[];

  // Styles references
  styles?: Record<string, string>;
}

// ============================================
// COMPONENT DEFINITIONS
// ============================================

export interface ComponentPropertyDefinition {
  type: 'BOOLEAN' | 'INSTANCE_SWAP' | 'TEXT' | 'VARIANT';
  defaultValue: unknown;
  variantOptions?: string[];
  preferredValues?: { type: string; key: string }[];
}

export interface ComponentMetadata {
  key: string;
  name: string;
  description: string;
  documentationLinks?: { uri: string }[];
}

export interface ComponentSetMetadata {
  key: string;
  name: string;
  description: string;
}

// ============================================
// STYLES
// ============================================

export type StyleType = 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';

export interface StyleMetadata {
  key: string;
  name: string;
  styleType: StyleType;
  description: string;
}

// ============================================
// EXPORTS
// ============================================

export interface ExportSetting {
  suffix: string;
  format: 'JPG' | 'PNG' | 'SVG' | 'PDF';
  constraint: {
    type: 'SCALE' | 'WIDTH' | 'HEIGHT';
    value: number;
  };
}

// ============================================
// INTERACTIONS
// ============================================

export interface Reaction {
  trigger: {
    type: 'ON_CLICK' | 'ON_HOVER' | 'ON_PRESS' | 'ON_DRAG' | 'AFTER_TIMEOUT' | 'MOUSE_ENTER' | 'MOUSE_LEAVE' | 'MOUSE_UP' | 'MOUSE_DOWN';
  };
  action: {
    type: 'BACK' | 'CLOSE' | 'URL' | 'NODE' | 'SET_VARIABLE' | 'UPDATE_MEDIA_RUNTIME';
    url?: string;
    destinationId?: string;
    navigation?: 'NAVIGATE' | 'SWAP' | 'OVERLAY' | 'SCROLL_TO' | 'CHANGE_TO';
    transition?: Transition;
  };
}

export interface Transition {
  type: 'DISSOLVE' | 'SMART_ANIMATE' | 'MOVE_IN' | 'MOVE_OUT' | 'PUSH' | 'SLIDE_IN' | 'SLIDE_OUT';
  duration: number;
  easing: { type: string };
}

// ============================================
// FIGMA FILE (TOP LEVEL)
// ============================================

export interface FigmaFile {
  name: string;
  lastModified: string;
  version: string;
  role: 'owner' | 'editor' | 'viewer';
  thumbnailUrl?: string;
  document: FigmaNode;
  components: Record<string, ComponentMetadata>;
  componentSets: Record<string, ComponentSetMetadata>;
  styles: Record<string, StyleMetadata>;
  schemaVersion: number;
  mainFileKey?: string;
  branches?: { key: string; name: string; thumbnail_url: string }[];
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface FigmaFileResponse {
  err?: string;
  status?: number;
  document?: FigmaNode;
  components?: Record<string, ComponentMetadata>;
  componentSets?: Record<string, ComponentSetMetadata>;
  styles?: Record<string, StyleMetadata>;
  name?: string;
  lastModified?: string;
  version?: string;
  role?: string;
  thumbnailUrl?: string;
  schemaVersion?: number;
}

export interface FigmaNodesResponse {
  err?: string;
  nodes: Record<string, { document: FigmaNode; components: Record<string, ComponentMetadata> }>;
}

export interface FigmaImagesResponse {
  err?: string;
  images: Record<string, string | null>;
}

export interface FigmaStylesResponse {
  err?: string;
  status?: number;
  meta?: {
    styles: StyleMetadata[];
  };
}

// ============================================
// UTILITY TYPES
// ============================================

/** Check if node has children */
export function hasChildren(node: FigmaNode): node is FigmaNode & { children: FigmaNode[] } {
  return Array.isArray(node.children) && node.children.length > 0;
}

/** Check if node is a component */
export function isComponent(node: FigmaNode): boolean {
  return node.type === 'COMPONENT';
}

/** Check if node is an instance */
export function isInstance(node: FigmaNode): boolean {
  return node.type === 'INSTANCE';
}

/** Check if node has Auto Layout */
export function hasAutoLayout(node: FigmaNode): boolean {
  return node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL';
}

/** Check if node is text */
export function isTextNode(node: FigmaNode): boolean {
  return node.type === 'TEXT';
}

/** Check if node is a frame */
export function isFrame(node: FigmaNode): boolean {
  return node.type === 'FRAME';
}
