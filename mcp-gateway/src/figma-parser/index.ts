/**
 * FORGE Figma Parser
 *
 * @epic 05 - Figma Parser
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 *
 * @description
 *   Parses Figma design files and extracts design intent, components,
 *   styles, layout, and tokens for downstream code generation.
 */

// ============================================
// IMPORTS
// ============================================

import { FigmaClient, FigmaClientConfig } from './client/figma-client.js';
import { ComponentExtractor } from './extractors/components.js';
import { StyleExtractor } from './extractors/styles.js';
import { LayoutAnalyzer } from './analysis/layout.js';
import { SemanticAnalyzer } from './analysis/semantic.js';
import { TokenGenerator } from './tokens/generator.js';
import type {
  ParsedDesign,
  ParsedPage,
  ParsedFrame,
  ParsedComponent,
  ParsedComponentSet,
  DesignAsset,
  ParsingStats,
} from './output/schema.js';
import { validateParsedDesign } from './output/schema.js';
import {
  FigmaFile,
  FigmaNode,
  hasChildren,
  isTextNode,
} from './types/figma-api.js';

// ============================================
// PARSER OPTIONS
// ============================================

export interface FigmaParserOptions {
  /** Figma API client config */
  clientConfig?: FigmaClientConfig;

  /** Existing Figma client instance */
  client?: FigmaClient;

  /** Skip component extraction */
  skipComponents?: boolean;

  /** Skip style extraction */
  skipStyles?: boolean;

  /** Skip token generation */
  skipTokens?: boolean;

  /** Maximum depth to parse */
  maxDepth?: number;

  /** Only parse specific page IDs */
  pageIds?: string[];

  /** Only parse specific node IDs */
  nodeIds?: string[];
}

// ============================================
// FIGMA PARSER
// ============================================

export class FigmaParser {
  private client: FigmaClient | null = null;
  private componentExtractor = new ComponentExtractor();
  private styleExtractor = new StyleExtractor();
  private layoutAnalyzer = new LayoutAnalyzer();
  private semanticAnalyzer = new SemanticAnalyzer();
  private tokenGenerator = new TokenGenerator();
  private options: FigmaParserOptions;

  constructor(options: FigmaParserOptions = {}) {
    this.options = options;

    if (options.client) {
      this.client = options.client;
    } else if (options.clientConfig) {
      this.client = new FigmaClient(options.clientConfig);
    }
  }

  // ==========================================
  // MAIN PARSING METHODS
  // ==========================================

  /**
   * Parse a Figma file by key (requires API client)
   */
  async parseFile(fileKey: string): Promise<ParsedDesign> {
    if (!this.client) {
      throw new Error('FigmaClient not configured. Provide clientConfig or use parseFileData.');
    }

    const startTime = Date.now();
    const file = await this.client.getFile(fileKey);

    return this.parseFileData(file, fileKey, startTime);
  }

  /**
   * Parse a Figma file from JSON data (no API needed)
   */
  parseFileData(file: FigmaFile, fileKey: string = 'local', startTime: number = Date.now()): ParsedDesign {
    const stats: ParsingStats = {
      totalNodes: 0,
      totalPages: 0,
      totalComponents: 0,
      totalInstances: 0,
      totalTextNodes: 0,
      uniqueColors: 0,
      uniqueTypography: 0,
      parsingDurationMs: 0,
      warnings: [],
    };

    // Extract components
    const componentResult = this.options.skipComponents
      ? { components: [], componentSets: [], instances: [], stats: { totalComponents: 0, totalVariants: 0, totalInstances: 0, totalComponentSets: 0 } }
      : this.componentExtractor.extract(file);

    stats.totalComponents = componentResult.stats.totalComponents;
    stats.totalInstances = componentResult.stats.totalInstances;

    // Extract styles
    const styleResult = this.options.skipStyles
      ? { namedStyles: [], colors: new Map(), typography: new Map(), effects: [], stats: { totalNamedStyles: 0, uniqueColors: 0, uniqueTypography: 0, uniqueEffects: 0 } }
      : this.styleExtractor.extract(file);

    stats.uniqueColors = styleResult.stats.uniqueColors;
    stats.uniqueTypography = styleResult.stats.uniqueTypography;

    // Generate tokens
    const tokens = this.options.skipTokens
      ? { colors: {}, typography: {}, spacing: {}, radii: {}, shadows: {}, meta: { source: '', generatedAt: '', version: '' } }
      : this.tokenGenerator.generate(file);

    // Parse pages and frames
    const pages = this.parsePages(file.document, stats);
    stats.totalPages = pages.length;

    // Build parsed components
    const parsedComponents = this.buildParsedComponents(componentResult.components);

    // Build component sets
    const parsedComponentSets = this.buildComponentSets(componentResult.componentSets);

    // Extract assets (images)
    const assets = this.extractAssets(file.document);

    stats.parsingDurationMs = Date.now() - startTime;

    return {
      version: '1.0.0',
      metadata: {
        name: file.name,
        fileKey,
        lastModified: file.lastModified,
        figmaVersion: file.version,
        generatedAt: new Date().toISOString(),
        parserVersion: '1.0.0',
        thumbnailUrl: file.thumbnailUrl,
      },
      pages,
      components: parsedComponents,
      componentSets: parsedComponentSets,
      tokens,
      assets,
      stats,
    };
  }

  /**
   * Parse a single node (for partial/incremental parsing)
   */
  parseNode(node: FigmaNode): ParsedFrame {
    return this.parseFrame(node, 0);
  }

  // ==========================================
  // PAGE PARSING
  // ==========================================

  private parsePages(document: FigmaNode, stats: ParsingStats): ParsedPage[] {
    const pages: ParsedPage[] = [];

    // Document children are pages (CANVAS nodes)
    if (!hasChildren(document)) {
      return pages;
    }

    const pageIds = this.options.pageIds;

    for (let i = 0; i < document.children.length; i++) {
      const pageNode = document.children[i];
      if (!pageNode) continue;

      // Filter by page IDs if specified
      if (pageIds && !pageIds.includes(pageNode.id)) {
        continue;
      }

      // Skip non-canvas nodes
      if (pageNode.type !== 'CANVAS') {
        continue;
      }

      const frames: ParsedFrame[] = [];

      if (hasChildren(pageNode)) {
        for (const frameNode of pageNode.children) {
          // Track text nodes
          if (isTextNode(frameNode)) {
            stats.totalTextNodes++;
          }

          frames.push(this.parseFrame(frameNode, 0));
          stats.totalNodes++;
        }
      }

      pages.push({
        id: pageNode.id,
        name: pageNode.name,
        frames,
        isMain: i === 0,
      });
    }

    return pages;
  }

  // ==========================================
  // FRAME PARSING
  // ==========================================

  private parseFrame(node: FigmaNode, depth: number): ParsedFrame {
    const maxDepth = this.options.maxDepth ?? Infinity;

    // Analyze semantics
    const semantic = this.semanticAnalyzer.analyze(node);

    // Analyze layout
    const layout = this.layoutAnalyzer.analyze(node);

    // Extract styles
    const styles = this.styleExtractor.extractNodeStyles(node);

    // Parse children
    const children: ParsedFrame[] = [];

    if (hasChildren(node) && depth < maxDepth) {
      for (const child of node.children) {
        if (child.visible !== false) {
          children.push(this.parseFrame(child, depth + 1));
        }
      }
    }

    // Get child layouts if parent has auto layout
    const childLayouts = hasChildren(node) && (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL')
      ? this.layoutAnalyzer.analyzeTree(node).children
      : undefined;

    // Build frame
    const frame: ParsedFrame = {
      id: node.id,
      name: node.name,
      type: node.type,
      semantic,
      layout,
      styles,
      children,
      childLayouts,
      visible: node.visible !== false,
    };

    // Add text content if text node
    if (isTextNode(node) && node.characters) {
      frame.textContent = node.characters;
    }

    // Add component reference if instance
    if (node.type === 'INSTANCE' && node.componentId) {
      frame.componentRef = node.componentId;
    }

    // Add bounds if available
    if (node.absoluteBoundingBox) {
      frame.bounds = {
        x: node.absoluteBoundingBox.x,
        y: node.absoluteBoundingBox.y,
        width: node.absoluteBoundingBox.width,
        height: node.absoluteBoundingBox.height,
      };
    }

    // Add interactions if present
    if (node.reactions && node.reactions.length > 0) {
      frame.interactions = node.reactions.map(r => ({
        trigger: this.mapTrigger(r.trigger.type),
        action: this.mapAction(r.action.type),
        target: r.action.destinationId,
        url: r.action.url,
        transition: r.action.transition ? {
          type: r.action.transition.type,
          duration: r.action.transition.duration,
          easing: r.action.transition.easing.type,
        } : undefined,
      }));
    }

    return frame;
  }

  private mapTrigger(type: string): 'click' | 'hover' | 'press' | 'drag' | 'focus' {
    switch (type) {
      case 'ON_CLICK': return 'click';
      case 'ON_HOVER': case 'MOUSE_ENTER': return 'hover';
      case 'ON_PRESS': case 'MOUSE_DOWN': return 'press';
      case 'ON_DRAG': return 'drag';
      default: return 'click';
    }
  }

  private mapAction(type: string): 'navigate' | 'overlay' | 'swap' | 'back' | 'url' | 'scroll' {
    switch (type) {
      case 'NODE': return 'navigate';
      case 'OVERLAY': return 'overlay';
      case 'SWAP': return 'swap';
      case 'BACK': return 'back';
      case 'URL': return 'url';
      case 'SCROLL_TO': return 'scroll';
      default: return 'navigate';
    }
  }

  // ==========================================
  // COMPONENT BUILDING
  // ==========================================

  private buildParsedComponents(components: Array<{
    id: string;
    name: string;
    description?: string;
    key?: string;
    isVariant: boolean;
    componentSetId?: string;
    variantProperties?: Record<string, string>;
    properties: Array<{ name: string; type: string; defaultValue: unknown; variantOptions?: string[] }>;
    node: FigmaNode;
    instances: Array<{ id: string }>;
  }>): ParsedComponent[] {
    return components.map(comp => ({
      id: comp.id,
      name: comp.name,
      description: comp.description,
      key: comp.key,
      isVariant: comp.isVariant,
      componentSetId: comp.componentSetId,
      variantProperties: comp.variantProperties,
      props: comp.properties.map(p => ({
        name: p.name,
        type: this.mapPropType(p.type),
        defaultValue: p.defaultValue,
        options: p.variantOptions,
        required: p.type !== 'BOOLEAN',
      })),
      frame: this.parseFrame(comp.node, 0),
      usageCount: comp.instances.length,
    }));
  }

  private mapPropType(type: string): 'boolean' | 'text' | 'instanceSwap' | 'variant' {
    switch (type) {
      case 'BOOLEAN': return 'boolean';
      case 'TEXT': return 'text';
      case 'INSTANCE_SWAP': return 'instanceSwap';
      case 'VARIANT': return 'variant';
      default: return 'text';
    }
  }

  private buildComponentSets(sets: Array<{
    id: string;
    name: string;
    description?: string;
    variants: Array<{ id: string }>;
    variantGroupProperties: Record<string, string[]>;
  }>): ParsedComponentSet[] {
    return sets.map(set => ({
      id: set.id,
      name: set.name,
      description: set.description,
      variantIds: set.variants.map(v => v.id),
      variantAxes: set.variantGroupProperties,
      defaultVariantId: set.variants[0]?.id,
    }));
  }

  // ==========================================
  // ASSET EXTRACTION
  // ==========================================

  private extractAssets(document: FigmaNode): DesignAsset[] {
    const assets: DesignAsset[] = [];
    const imageRefs = new Map<string, string[]>();

    // Walk tree to find image fills
    const walkForImages = (node: FigmaNode) => {
      if (node.fills) {
        for (const fill of node.fills) {
          if (fill.type === 'IMAGE' && fill.imageRef) {
            const existing = imageRefs.get(fill.imageRef) || [];
            existing.push(node.id);
            imageRefs.set(fill.imageRef, existing);
          }
        }
      }

      if (hasChildren(node)) {
        for (const child of node.children) {
          walkForImages(child);
        }
      }
    };

    walkForImages(document);

    // Convert to assets
    for (const [ref, usedBy] of Array.from(imageRefs.entries())) {
      assets.push({
        id: ref,
        type: 'image',
        name: `image-${ref.slice(0, 8)}`,
        format: 'png',
        usedBy,
      });
    }

    return assets;
  }
}

// ============================================
// TYPE EXPORTS
// ============================================

export type {
  // Figma API types
  FigmaFile,
  FigmaNode,
  FigmaNodeType,
  Paint,
  Effect,
  TypeStyle,
  Color,
  Rectangle,
  ComponentMetadata,
} from './types/figma-api.js';

export type {
  // Client types
  FigmaClientConfig,
  FigmaApiError,
  FigmaRateLimitError,
  FigmaAuthError,
} from './client/figma-client.js';

export type {
  // Component types
  ExtractedComponent,
  ComponentSet,
  ComponentInstance,
  ComponentProperty,
  ExtractionResult,
} from './extractors/components.js';

export type {
  // Style types
  ExtractedStyle,
  ExtractedFill,
  ExtractedStroke,
  ExtractedEffect,
  ExtractedTypography,
  NodeStyles,
  StyleExtractionResult,
} from './extractors/styles.js';

export type {
  // Layout types
  LayoutType,
  LayoutAnalysis,
  FlexLayout,
  GridLayout,
  AbsoluteLayout,
  ChildLayoutInfo,
  LayoutTree,
} from './analysis/layout.js';

export type {
  // Semantic types
  SemanticType,
  SemanticAnalysis,
} from './analysis/semantic.js';

export type {
  // Token types
  DesignTokens,
  ColorToken,
  TypographyToken,
  SpacingToken,
  RadiusToken,
  ShadowToken,
} from './tokens/generator.js';

export type {
  // Output types
  ParsedDesign,
  ParsedPage,
  ParsedFrame,
  ParsedComponent,
  ParsedComponentSet,
  DesignMetadata,
  DesignAsset,
  ParsingStats,
} from './output/schema.js';

// ============================================
// CLASS EXPORTS
// ============================================

export { FigmaClient, createFigmaClient, getDefaultClient } from './client/figma-client.js';
export { ComponentExtractor, findComponents, findInstances } from './extractors/components.js';
export { StyleExtractor } from './extractors/styles.js';
export { LayoutAnalyzer } from './analysis/layout.js';
export { SemanticAnalyzer } from './analysis/semantic.js';
export { TokenGenerator } from './tokens/generator.js';
export { validateParsedDesign, PARSED_DESIGN_SCHEMA } from './output/schema.js';

// ============================================
// UTILITY EXPORTS
// ============================================

export {
  hasChildren,
  isComponent,
  isInstance,
  hasAutoLayout,
  isTextNode,
  isFrame,
} from './types/figma-api.js';

// ============================================
// DEFAULT EXPORT
// ============================================

export default FigmaParser;
