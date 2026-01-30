/**
 * FORGE Parser Output Schema
 *
 * @epic 05 - Figma Parser
 * @task 6.1 - Output Schema
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 *
 * @description
 *   Defines the output structure of the Figma parser.
 *   This is the contract between the parser and downstream consumers.
 */

import type { NodeStyles } from '../extractors/styles.js';
import type { LayoutAnalysis, ChildLayoutInfo } from '../analysis/layout.js';
import type { SemanticAnalysis } from '../analysis/semantic.js';
import type { DesignTokens } from '../tokens/generator.js';

// ============================================
// PARSED DESIGN (TOP LEVEL OUTPUT)
// ============================================

export interface ParsedDesign {
  /** Schema version */
  version: '1.0.0';

  /** Design metadata */
  metadata: DesignMetadata;

  /** Parsed pages */
  pages: ParsedPage[];

  /** Extracted components */
  components: ParsedComponent[];

  /** Component sets (variants) */
  componentSets: ParsedComponentSet[];

  /** Design tokens */
  tokens: DesignTokens;

  /** Assets (images, icons) */
  assets: DesignAsset[];

  /** Parsing statistics */
  stats: ParsingStats;
}

export interface DesignMetadata {
  /** Figma file name */
  name: string;

  /** Figma file key */
  fileKey: string;

  /** Last modified date */
  lastModified: string;

  /** Figma version */
  figmaVersion: string;

  /** Generation timestamp */
  generatedAt: string;

  /** Parser version */
  parserVersion: string;

  /** Thumbnail URL */
  thumbnailUrl?: string;
}

// ============================================
// PARSED PAGE
// ============================================

export interface ParsedPage {
  /** Page ID */
  id: string;

  /** Page name */
  name: string;

  /** Top-level frames on this page */
  frames: ParsedFrame[];

  /** Is this the main/first page? */
  isMain: boolean;
}

// ============================================
// PARSED FRAME
// ============================================

export interface ParsedFrame {
  /** Figma node ID */
  id: string;

  /** Frame name */
  name: string;

  /** Node type */
  type: string;

  /** Semantic analysis result */
  semantic: SemanticAnalysis;

  /** Layout analysis result */
  layout: LayoutAnalysis;

  /** Extracted styles */
  styles: NodeStyles;

  /** Children (nested frames) */
  children: ParsedFrame[];

  /** Child layout info (for flex/grid children) */
  childLayouts?: ChildLayoutInfo[];

  /** Text content (if text node) */
  textContent?: string;

  /** Component reference (if instance) */
  componentRef?: string;

  /** Overrides (if instance) */
  overrides?: Record<string, unknown>;

  /** Bounding box */
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  /** Visibility */
  visible: boolean;

  /** Interactions (if any) */
  interactions?: ParsedInteraction[];
}

// ============================================
// PARSED COMPONENT
// ============================================

export interface ParsedComponent {
  /** Component ID */
  id: string;

  /** Component name */
  name: string;

  /** Component description */
  description?: string;

  /** Component key (for linking) */
  key?: string;

  /** Is this a variant? */
  isVariant: boolean;

  /** Parent component set ID */
  componentSetId?: string;

  /** Variant properties */
  variantProperties?: Record<string, string>;

  /** Component props (from Figma properties) */
  props: ParsedProp[];

  /** The root frame of this component */
  frame: ParsedFrame;

  /** Usage count in the document */
  usageCount: number;
}

export interface ParsedProp {
  /** Prop name */
  name: string;

  /** Prop type */
  type: 'boolean' | 'text' | 'instanceSwap' | 'variant';

  /** Default value */
  defaultValue: unknown;

  /** Options (for variant/enum types) */
  options?: string[];

  /** Is this prop required? */
  required: boolean;
}

// ============================================
// PARSED COMPONENT SET (VARIANTS)
// ============================================

export interface ParsedComponentSet {
  /** Component set ID */
  id: string;

  /** Component set name */
  name: string;

  /** Description */
  description?: string;

  /** Variant IDs */
  variantIds: string[];

  /** Variant axes (e.g., { size: ['sm', 'md', 'lg'], state: ['default', 'hover'] }) */
  variantAxes: Record<string, string[]>;

  /** Default variant ID */
  defaultVariantId?: string;
}

// ============================================
// ASSETS
// ============================================

export interface DesignAsset {
  /** Asset ID (Figma image ref) */
  id: string;

  /** Asset type */
  type: 'image' | 'icon' | 'illustration';

  /** Asset name */
  name: string;

  /** URL to fetch asset */
  url?: string;

  /** Format */
  format: 'png' | 'svg' | 'jpg' | 'pdf';

  /** Dimensions */
  width?: number;
  height?: number;

  /** Nodes using this asset */
  usedBy: string[];
}

// ============================================
// INTERACTIONS
// ============================================

export interface ParsedInteraction {
  /** Trigger type */
  trigger: 'click' | 'hover' | 'press' | 'drag' | 'focus';

  /** Action type */
  action: 'navigate' | 'overlay' | 'swap' | 'back' | 'url' | 'scroll';

  /** Target (for navigation) */
  target?: string;

  /** URL (for external links) */
  url?: string;

  /** Transition */
  transition?: {
    type: string;
    duration: number;
    easing: string;
  };
}

// ============================================
// STATISTICS
// ============================================

export interface ParsingStats {
  /** Total nodes parsed */
  totalNodes: number;

  /** Total pages */
  totalPages: number;

  /** Total components */
  totalComponents: number;

  /** Total instances */
  totalInstances: number;

  /** Total text nodes */
  totalTextNodes: number;

  /** Unique colors */
  uniqueColors: number;

  /** Unique typography styles */
  uniqueTypography: number;

  /** Parsing duration (ms) */
  parsingDurationMs: number;

  /** Warnings during parsing */
  warnings: string[];
}

// ============================================
// VALIDATION
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
}

/**
 * Validate a ParsedDesign structure
 */
export function validateParsedDesign(design: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!design || typeof design !== 'object') {
    return {
      valid: false,
      errors: [{ path: '/', message: 'Design must be an object', code: 'INVALID_ROOT' }],
      warnings: [],
    };
  }

  const d = design as Partial<ParsedDesign>;

  // Check version
  if (d.version !== '1.0.0') {
    errors.push({
      path: '/version',
      message: `Invalid version: ${d.version}`,
      code: 'INVALID_VERSION',
    });
  }

  // Check metadata
  if (!d.metadata) {
    errors.push({
      path: '/metadata',
      message: 'Missing metadata',
      code: 'MISSING_METADATA',
    });
  }

  // Check pages
  if (!Array.isArray(d.pages)) {
    errors.push({
      path: '/pages',
      message: 'Pages must be an array',
      code: 'INVALID_PAGES',
    });
  }

  // Check components
  if (!Array.isArray(d.components)) {
    errors.push({
      path: '/components',
      message: 'Components must be an array',
      code: 'INVALID_COMPONENTS',
    });
  }

  // Check tokens
  if (!d.tokens) {
    warnings.push({
      path: '/tokens',
      message: 'No design tokens extracted',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// JSON SCHEMA
// ============================================

export const PARSED_DESIGN_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://arcfoundry.ai/schemas/parsed-design-v1.json',
  title: 'Parsed Design',
  description: 'Output schema for FORGE Figma Parser',
  type: 'object',
  required: ['version', 'metadata', 'pages', 'components', 'tokens', 'stats'],
  properties: {
    version: { type: 'string', const: '1.0.0' },
    metadata: { $ref: '#/definitions/DesignMetadata' },
    pages: { type: 'array', items: { $ref: '#/definitions/ParsedPage' } },
    components: { type: 'array', items: { $ref: '#/definitions/ParsedComponent' } },
    componentSets: { type: 'array', items: { $ref: '#/definitions/ParsedComponentSet' } },
    tokens: { type: 'object' },
    assets: { type: 'array', items: { $ref: '#/definitions/DesignAsset' } },
    stats: { $ref: '#/definitions/ParsingStats' },
  },
  definitions: {
    DesignMetadata: {
      type: 'object',
      required: ['name', 'fileKey', 'lastModified', 'generatedAt'],
      properties: {
        name: { type: 'string' },
        fileKey: { type: 'string' },
        lastModified: { type: 'string' },
        figmaVersion: { type: 'string' },
        generatedAt: { type: 'string' },
        parserVersion: { type: 'string' },
        thumbnailUrl: { type: 'string' },
      },
    },
    ParsedPage: {
      type: 'object',
      required: ['id', 'name', 'frames'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        frames: { type: 'array', items: { $ref: '#/definitions/ParsedFrame' } },
        isMain: { type: 'boolean' },
      },
    },
    ParsedFrame: {
      type: 'object',
      required: ['id', 'name', 'type', 'semantic', 'layout', 'styles', 'children', 'visible'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        type: { type: 'string' },
        semantic: { type: 'object' },
        layout: { type: 'object' },
        styles: { type: 'object' },
        children: { type: 'array', items: { $ref: '#/definitions/ParsedFrame' } },
        textContent: { type: 'string' },
        componentRef: { type: 'string' },
        overrides: { type: 'object' },
        bounds: { type: 'object' },
        visible: { type: 'boolean' },
      },
    },
    ParsedComponent: {
      type: 'object',
      required: ['id', 'name', 'props', 'frame'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        key: { type: 'string' },
        isVariant: { type: 'boolean' },
        componentSetId: { type: 'string' },
        variantProperties: { type: 'object' },
        props: { type: 'array' },
        frame: { $ref: '#/definitions/ParsedFrame' },
        usageCount: { type: 'number' },
      },
    },
    ParsedComponentSet: {
      type: 'object',
      required: ['id', 'name', 'variantIds', 'variantAxes'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        variantIds: { type: 'array', items: { type: 'string' } },
        variantAxes: { type: 'object' },
        defaultVariantId: { type: 'string' },
      },
    },
    DesignAsset: {
      type: 'object',
      required: ['id', 'type', 'name', 'format'],
      properties: {
        id: { type: 'string' },
        type: { type: 'string', enum: ['image', 'icon', 'illustration'] },
        name: { type: 'string' },
        url: { type: 'string' },
        format: { type: 'string', enum: ['png', 'svg', 'jpg', 'pdf'] },
        width: { type: 'number' },
        height: { type: 'number' },
        usedBy: { type: 'array', items: { type: 'string' } },
      },
    },
    ParsingStats: {
      type: 'object',
      required: ['totalNodes', 'totalPages', 'totalComponents', 'parsingDurationMs'],
      properties: {
        totalNodes: { type: 'number' },
        totalPages: { type: 'number' },
        totalComponents: { type: 'number' },
        totalInstances: { type: 'number' },
        totalTextNodes: { type: 'number' },
        uniqueColors: { type: 'number' },
        uniqueTypography: { type: 'number' },
        parsingDurationMs: { type: 'number' },
        warnings: { type: 'array', items: { type: 'string' } },
      },
    },
  },
};
