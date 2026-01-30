/**
 * FORGE Semantic Analyzer
 *
 * @epic 05 - Figma Parser
 * @task 4.2 - Semantic Analysis
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 *
 * @description
 *   Analyzes Figma nodes to determine semantic HTML element types.
 *   Uses heuristics based on name, structure, and styling.
 */

import {
  FigmaNode,
  hasChildren,
  isTextNode,
  hasAutoLayout,
} from '../types/figma-api.js';

// ============================================
// TYPES
// ============================================

export type SemanticType =
  | 'button'
  | 'link'
  | 'input'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'switch'
  | 'card'
  | 'list'
  | 'list-item'
  | 'table'
  | 'navigation'
  | 'navbar'
  | 'sidebar'
  | 'header'
  | 'footer'
  | 'modal'
  | 'form'
  | 'image'
  | 'icon'
  | 'avatar'
  | 'badge'
  | 'tag'
  | 'heading'
  | 'paragraph'
  | 'divider'
  | 'progress'
  | 'spinner'
  | 'alert'
  | 'container'
  | 'unknown';

export interface SemanticAnalysis {
  /** Detected semantic type */
  type: SemanticType;

  /** Confidence score (0-1) */
  confidence: number;

  /** Suggested HTML element */
  htmlElement: string;

  /** ARIA role (if applicable) */
  ariaRole?: string;

  /** Is this element interactive? */
  interactive: boolean;

  /** Accessibility attributes */
  accessibility: {
    ariaLabel?: string;
    ariaDescribedBy?: string;
    tabIndex?: number;
  };

  /** Alternative type suggestions */
  alternatives: { type: SemanticType; confidence: number }[];

  /** Detection reasoning */
  reasons: string[];
}

// ============================================
// DETECTION PATTERNS
// ============================================

interface DetectionPattern {
  type: SemanticType;
  namePatterns: RegExp[];
  structureCheck?: (node: FigmaNode) => boolean;
  baseConfidence: number;
  htmlElement: string;
  ariaRole?: string;
  interactive: boolean;
}

const DETECTION_PATTERNS: DetectionPattern[] = [
  // Buttons
  {
    type: 'button',
    namePatterns: [/button/i, /btn/i, /cta/i, /action/i, /submit/i],
    structureCheck: (node) => {
      const hasText = hasChildren(node) && node.children?.some(c => isTextNode(c));
      const hasFill = node.fills?.some(f => f.visible !== false);
      const isSmall = (node.absoluteBoundingBox?.height || 0) < 80;
      return Boolean(hasText && hasFill && isSmall);
    },
    baseConfidence: 0.8,
    htmlElement: 'button',
    ariaRole: 'button',
    interactive: true,
  },

  // Links
  {
    type: 'link',
    namePatterns: [/link/i, /href/i, /anchor/i, /^a$/i],
    structureCheck: (node) => isTextNode(node) || (hasChildren(node) && node.children?.length === 1 && isTextNode(node.children[0]!)),
    baseConfidence: 0.7,
    htmlElement: 'a',
    ariaRole: 'link',
    interactive: true,
  },

  // Input fields
  {
    type: 'input',
    namePatterns: [/input/i, /field/i, /textfield/i, /text-field/i, /search/i],
    structureCheck: (node) => {
      const hasStroke = node.strokes?.some(s => s.visible !== false);
      const hasFill = node.fills?.some(f => f.visible !== false);
      const bbox = node.absoluteBoundingBox;
      const isWide = bbox ? bbox.width > bbox.height * 2 : false;
      return Boolean((hasStroke || hasFill) && isWide);
    },
    baseConfidence: 0.75,
    htmlElement: 'input',
    ariaRole: 'textbox',
    interactive: true,
  },

  // Card
  {
    type: 'card',
    namePatterns: [/card/i, /tile/i, /panel/i, /box/i],
    structureCheck: (node) => {
      const hasContent = hasChildren(node) && node.children!.length > 1;
      const hasFill = node.fills?.some(f => f.visible !== false);
      const hasRadius = (node.cornerRadius || 0) > 0;
      return Boolean(hasContent && hasFill && hasRadius);
    },
    baseConfidence: 0.7,
    htmlElement: 'article',
    ariaRole: 'article',
    interactive: false,
  },

  // List
  {
    type: 'list',
    namePatterns: [/list/i, /items/i, /collection/i],
    structureCheck: (node) => {
      if (!hasChildren(node) || node.children!.length < 2) return false;
      const heights = node.children!
        .filter(c => c.absoluteBoundingBox)
        .map(c => c.absoluteBoundingBox!.height);
      if (heights.length < 2) return false;
      const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
      return heights.every(h => Math.abs(h - avgHeight) < avgHeight * 0.3);
    },
    baseConfidence: 0.7,
    htmlElement: 'ul',
    ariaRole: 'list',
    interactive: false,
  },

  // Navigation
  {
    type: 'navigation',
    namePatterns: [/nav/i, /navigation/i, /menu/i, /links/i],
    baseConfidence: 0.75,
    htmlElement: 'nav',
    ariaRole: 'navigation',
    interactive: false,
  },

  // Header
  {
    type: 'header',
    namePatterns: [/header/i, /^head$/i, /masthead/i, /top-section/i],
    baseConfidence: 0.75,
    htmlElement: 'header',
    ariaRole: 'banner',
    interactive: false,
  },

  // Footer
  {
    type: 'footer',
    namePatterns: [/footer/i, /^foot$/i, /bottom-section/i],
    baseConfidence: 0.75,
    htmlElement: 'footer',
    ariaRole: 'contentinfo',
    interactive: false,
  },

  // Modal
  {
    type: 'modal',
    namePatterns: [/modal/i, /dialog/i, /popup/i, /overlay/i],
    baseConfidence: 0.8,
    htmlElement: 'dialog',
    ariaRole: 'dialog',
    interactive: true,
  },

  // Image
  {
    type: 'image',
    namePatterns: [/image/i, /img/i, /photo/i, /picture/i, /illustration/i],
    structureCheck: (node) => node.fills?.some(f => f.type === 'IMAGE') || false,
    baseConfidence: 0.8,
    htmlElement: 'img',
    ariaRole: 'img',
    interactive: false,
  },

  // Icon
  {
    type: 'icon',
    namePatterns: [/icon/i, /ico/i, /symbol/i, /glyph/i],
    structureCheck: (node) => {
      const bbox = node.absoluteBoundingBox;
      return bbox ? bbox.width < 50 && bbox.height < 50 && Math.abs(bbox.width - bbox.height) < 10 : false;
    },
    baseConfidence: 0.8,
    htmlElement: 'span',
    ariaRole: 'img',
    interactive: false,
  },

  // Avatar
  {
    type: 'avatar',
    namePatterns: [/avatar/i, /profile-pic/i, /user-image/i],
    structureCheck: (node) => {
      const bbox = node.absoluteBoundingBox;
      const isSquarish = bbox ? Math.abs(bbox.width - bbox.height) < 10 : false;
      const hasCircle = node.cornerRadius && node.cornerRadius > 20;
      return Boolean(isSquarish && (hasCircle || node.fills?.some(f => f.type === 'IMAGE')));
    },
    baseConfidence: 0.8,
    htmlElement: 'img',
    ariaRole: 'img',
    interactive: false,
  },

  // Badge
  {
    type: 'badge',
    namePatterns: [/badge/i, /status/i, /indicator/i, /dot/i],
    structureCheck: (node) => {
      const bbox = node.absoluteBoundingBox;
      return bbox ? bbox.width < 100 && bbox.height < 40 : false;
    },
    baseConfidence: 0.7,
    htmlElement: 'span',
    ariaRole: 'status',
    interactive: false,
  },

  // Heading
  {
    type: 'heading',
    namePatterns: [/heading/i, /title/i, /^h[1-6]$/i, /headline/i],
    structureCheck: (node) => {
      if (!isTextNode(node)) return false;
      const fontSize = node.style?.fontSize || 0;
      return fontSize >= 18;
    },
    baseConfidence: 0.75,
    htmlElement: 'h2',
    interactive: false,
  },

  // Paragraph
  {
    type: 'paragraph',
    namePatterns: [/paragraph/i, /body/i, /text-block/i, /description/i],
    structureCheck: (node) => {
      if (!isTextNode(node)) return false;
      const chars = node.characters || '';
      return chars.length > 50;
    },
    baseConfidence: 0.6,
    htmlElement: 'p',
    interactive: false,
  },

  // Divider
  {
    type: 'divider',
    namePatterns: [/divider/i, /separator/i, /line/i, /hr/i],
    structureCheck: (node) => {
      const bbox = node.absoluteBoundingBox;
      if (!bbox) return false;
      return bbox.height < 5 || bbox.width < 5;
    },
    baseConfidence: 0.8,
    htmlElement: 'hr',
    ariaRole: 'separator',
    interactive: false,
  },

  // Progress
  {
    type: 'progress',
    namePatterns: [/progress/i, /loading/i, /percentage/i, /bar/i],
    baseConfidence: 0.7,
    htmlElement: 'progress',
    ariaRole: 'progressbar',
    interactive: false,
  },

  // Alert
  {
    type: 'alert',
    namePatterns: [/alert/i, /notification/i, /warning/i, /error/i, /success/i, /info/i],
    baseConfidence: 0.75,
    htmlElement: 'div',
    ariaRole: 'alert',
    interactive: false,
  },

  // Container (fallback)
  {
    type: 'container',
    namePatterns: [/container/i, /wrapper/i, /frame/i, /group/i, /section/i],
    baseConfidence: 0.5,
    htmlElement: 'div',
    interactive: false,
  },
];

// ============================================
// SEMANTIC ANALYZER
// ============================================

export class SemanticAnalyzer {
  private patterns: DetectionPattern[];

  constructor(customPatterns?: DetectionPattern[]) {
    this.patterns = customPatterns || DETECTION_PATTERNS;
  }

  /**
   * Analyze a node and determine its semantic type
   */
  analyze(node: FigmaNode): SemanticAnalysis {
    const candidates: { pattern: DetectionPattern; confidence: number; reasons: string[] }[] = [];

    // Check each pattern
    for (const pattern of this.patterns) {
      const result = this.matchPattern(node, pattern);
      if (result.confidence > 0) {
        candidates.push({
          pattern,
          confidence: result.confidence,
          reasons: result.reasons,
        });
      }
    }

    // Sort by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);

    // Get best match
    const best = candidates[0];

    if (!best || best.confidence < 0.3) {
      return this.createUnknownAnalysis(node);
    }

    // Build alternatives (other good matches)
    const alternatives = candidates
      .slice(1, 4)
      .filter(c => c.confidence > 0.3)
      .map(c => ({
        type: c.pattern.type,
        confidence: c.confidence,
      }));

    return {
      type: best.pattern.type,
      confidence: best.confidence,
      htmlElement: this.determineHtmlElement(node, best.pattern),
      ariaRole: best.pattern.ariaRole,
      interactive: best.pattern.interactive,
      accessibility: this.extractAccessibility(node, best.pattern),
      alternatives,
      reasons: best.reasons,
    };
  }

  /**
   * Analyze multiple nodes
   */
  analyzeAll(nodes: FigmaNode[]): Map<string, SemanticAnalysis> {
    const results = new Map<string, SemanticAnalysis>();

    for (const node of nodes) {
      results.set(node.id, this.analyze(node));
    }

    return results;
  }

  // ==========================================
  // PATTERN MATCHING
  // ==========================================

  private matchPattern(node: FigmaNode, pattern: DetectionPattern): { confidence: number; reasons: string[] } {
    let confidence = 0;
    const reasons: string[] = [];

    // Check name patterns
    const nameMatch = pattern.namePatterns.some(regex => regex.test(node.name));
    if (nameMatch) {
      confidence += pattern.baseConfidence;
      reasons.push(`Name matches pattern for ${pattern.type}`);
    }

    // Check structure
    if (pattern.structureCheck) {
      const structureMatch = pattern.structureCheck(node);
      if (structureMatch) {
        confidence += 0.2;
        reasons.push(`Structure matches ${pattern.type} pattern`);
      } else if (nameMatch) {
        // Name matched but structure didn't - reduce confidence
        confidence -= 0.1;
      }
    }

    // Check for component type in Figma
    if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      confidence += 0.1;
      reasons.push('Node is a Figma component');
    }

    // Check for interactions (indicates interactive element)
    if (node.reactions && node.reactions.length > 0) {
      if (pattern.interactive) {
        confidence += 0.15;
        reasons.push('Has Figma interactions');
      }
    }

    // Normalize confidence to 0-1
    confidence = Math.min(1, Math.max(0, confidence));

    return { confidence, reasons };
  }

  // ==========================================
  // HTML ELEMENT DETERMINATION
  // ==========================================

  private determineHtmlElement(node: FigmaNode, pattern: DetectionPattern): string {
    // Special handling for headings
    if (pattern.type === 'heading' && node.style) {
      const fontSize = node.style.fontSize || 16;
      if (fontSize >= 32) return 'h1';
      if (fontSize >= 24) return 'h2';
      if (fontSize >= 20) return 'h3';
      if (fontSize >= 18) return 'h4';
      return 'h5';
    }

    // Special handling for text
    if (isTextNode(node) && pattern.type === 'unknown') {
      const fontSize = node.style?.fontSize || 16;
      if (fontSize >= 18) return 'h3';
      return 'p';
    }

    return pattern.htmlElement;
  }

  // ==========================================
  // ACCESSIBILITY
  // ==========================================

  private extractAccessibility(node: FigmaNode, pattern: DetectionPattern): SemanticAnalysis['accessibility'] {
    const accessibility: SemanticAnalysis['accessibility'] = {};

    // Use node name as aria-label if meaningful
    if (pattern.interactive && node.name && !this.isGenericName(node.name)) {
      accessibility.ariaLabel = this.cleanNameForLabel(node.name);
    }

    // Set tabIndex for interactive elements
    if (pattern.interactive) {
      accessibility.tabIndex = 0;
    }

    return accessibility;
  }

  private isGenericName(name: string): boolean {
    const genericNames = ['frame', 'group', 'rectangle', 'vector', 'ellipse', 'component'];
    return genericNames.some(g => name.toLowerCase().startsWith(g));
  }

  private cleanNameForLabel(name: string): string {
    // Remove variant syntax and clean up
    let clean = name.split(',')[0] ?? name;
    clean = clean.replace(/[-_]/g, ' ');
    clean = clean.replace(/([a-z])([A-Z])/g, '$1 $2');
    return clean.trim();
  }

  // ==========================================
  // UNKNOWN FALLBACK
  // ==========================================

  private createUnknownAnalysis(node: FigmaNode): SemanticAnalysis {
    let htmlElement = 'div';

    if (isTextNode(node)) {
      htmlElement = 'span';
    } else if (hasAutoLayout(node)) {
      htmlElement = 'div';
    }

    return {
      type: 'unknown',
      confidence: 0,
      htmlElement,
      interactive: false,
      accessibility: {},
      alternatives: [],
      reasons: ['No matching pattern found'],
    };
  }
}

export default SemanticAnalyzer;
