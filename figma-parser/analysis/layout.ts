/**
 * FORGE Layout Analyzer
 * 
 * @epic 05 - Figma Parser
 * @task 4.1 - Layout Analysis
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Analyzes Figma Auto Layout and converts to CSS Flexbox/Grid.
 *   Detects layout patterns and generates responsive layouts.
 */

import {
  FigmaNode,
  hasChildren,
  hasAutoLayout,
  Rectangle,
} from '../types/figma-api';

// ============================================
// TYPES
// ============================================

export type LayoutType = 'flex' | 'grid' | 'absolute' | 'static';
export type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse';
export type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
export type JustifyContent = 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
export type AlignItems = 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';

export interface FlexLayout {
  type: 'flex';
  direction: FlexDirection;
  wrap: FlexWrap;
  justifyContent: JustifyContent;
  alignItems: AlignItems;
  gap: number | { row: number; column: number };
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface GridLayout {
  type: 'grid';
  columns: number | string;
  rows: number | string;
  gap: number | { row: number; column: number };
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  areas?: string[][];
}

export interface AbsoluteLayout {
  type: 'absolute';
  position: {
    top?: number | string;
    right?: number | string;
    bottom?: number | string;
    left?: number | string;
  };
  width?: number | string;
  height?: number | string;
}

export interface StaticLayout {
  type: 'static';
  width?: number | string;
  height?: number | string;
}

export type LayoutAnalysis = FlexLayout | GridLayout | AbsoluteLayout | StaticLayout;

export interface ChildLayoutInfo {
  nodeId: string;
  nodeName: string;
  layout: LayoutAnalysis;
  sizing: {
    width: 'fixed' | 'hug' | 'fill';
    height: 'fixed' | 'hug' | 'fill';
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  };
  flexGrow?: number;
  flexShrink?: number;
  alignSelf?: AlignItems;
}

export interface LayoutTree {
  nodeId: string;
  nodeName: string;
  layout: LayoutAnalysis;
  children: ChildLayoutInfo[];
  cssProperties: Record<string, string>;
}

// ============================================
// LAYOUT ANALYZER
// ============================================

export class LayoutAnalyzer {
  /**
   * Analyze layout for a single node
   */
  analyze(node: FigmaNode): LayoutAnalysis {
    // Check for Auto Layout
    if (hasAutoLayout(node)) {
      return this.analyzeAutoLayout(node);
    }
    
    // Check for absolute positioning
    if (node.layoutPositioning === 'ABSOLUTE') {
      return this.analyzeAbsoluteLayout(node);
    }
    
    // Check if it might be a grid (multiple children in grid-like arrangement)
    if (hasChildren(node) && this.detectGridPattern(node)) {
      return this.analyzeAsGrid(node);
    }
    
    // Default to static layout
    return this.analyzeStaticLayout(node);
  }

  /**
   * Analyze the full layout tree for a node and its children
   */
  analyzeTree(node: FigmaNode): LayoutTree {
    const layout = this.analyze(node);
    const children: ChildLayoutInfo[] = [];
    
    if (hasChildren(node)) {
      for (const child of node.children) {
        if (child.visible !== false) {
          children.push(this.analyzeChildLayout(child, node));
        }
      }
    }
    
    return {
      nodeId: node.id,
      nodeName: node.name,
      layout,
      children,
      cssProperties: this.layoutToCss(layout),
    };
  }

  // ==========================================
  // AUTO LAYOUT ANALYSIS
  // ==========================================

  private analyzeAutoLayout(node: FigmaNode): FlexLayout {
    const direction = this.mapDirection(node.layoutMode, node.itemReverseZIndex);
    const wrap = this.mapWrap(node.layoutWrap);
    const justifyContent = this.mapJustifyContent(node.primaryAxisAlignItems);
    const alignItems = this.mapAlignItems(node.counterAxisAlignItems);
    
    // Handle gap
    let gap: number | { row: number; column: number };
    if (node.counterAxisSpacing !== undefined && node.counterAxisSpacing !== node.itemSpacing) {
      gap = {
        row: node.layoutMode === 'VERTICAL' ? node.itemSpacing || 0 : node.counterAxisSpacing,
        column: node.layoutMode === 'HORIZONTAL' ? node.itemSpacing || 0 : node.counterAxisSpacing,
      };
    } else {
      gap = node.itemSpacing || 0;
    }
    
    return {
      type: 'flex',
      direction,
      wrap,
      justifyContent,
      alignItems,
      gap,
      padding: {
        top: node.paddingTop || 0,
        right: node.paddingRight || 0,
        bottom: node.paddingBottom || 0,
        left: node.paddingLeft || 0,
      },
    };
  }

  private mapDirection(mode?: string, reverse?: boolean): FlexDirection {
    if (mode === 'HORIZONTAL') {
      return reverse ? 'row-reverse' : 'row';
    }
    return reverse ? 'column-reverse' : 'column';
  }

  private mapWrap(wrap?: string): FlexWrap {
    return wrap === 'WRAP' ? 'wrap' : 'nowrap';
  }

  private mapJustifyContent(align?: string): JustifyContent {
    switch (align) {
      case 'MIN': return 'flex-start';
      case 'CENTER': return 'center';
      case 'MAX': return 'flex-end';
      case 'SPACE_BETWEEN': return 'space-between';
      default: return 'flex-start';
    }
  }

  private mapAlignItems(align?: string): AlignItems {
    switch (align) {
      case 'MIN': return 'flex-start';
      case 'CENTER': return 'center';
      case 'MAX': return 'flex-end';
      case 'BASELINE': return 'baseline';
      default: return 'stretch';
    }
  }

  // ==========================================
  // GRID DETECTION & ANALYSIS
  // ==========================================

  private detectGridPattern(node: FigmaNode): boolean {
    if (!hasChildren(node) || node.children.length < 4) {
      return false;
    }
    
    // Check if children are arranged in a grid-like pattern
    const children = node.children.filter(c => c.visible !== false && c.absoluteBoundingBox);
    if (children.length < 4) return false;
    
    // Get unique x and y positions
    const xPositions = new Set<number>();
    const yPositions = new Set<number>();
    
    for (const child of children) {
      if (child.absoluteBoundingBox) {
        xPositions.add(Math.round(child.absoluteBoundingBox.x));
        yPositions.add(Math.round(child.absoluteBoundingBox.y));
      }
    }
    
    // It's grid-like if there are multiple rows AND columns
    return xPositions.size >= 2 && yPositions.size >= 2;
  }

  private analyzeAsGrid(node: FigmaNode): GridLayout {
    const children = node.children?.filter(c => c.visible !== false && c.absoluteBoundingBox) || [];
    
    // Detect columns and rows
    const xPositions = [...new Set(children.map(c => Math.round(c.absoluteBoundingBox!.x)))].sort((a, b) => a - b);
    const yPositions = [...new Set(children.map(c => Math.round(c.absoluteBoundingBox!.y)))].sort((a, b) => a - b);
    
    // Calculate gaps
    let columnGap = 0;
    let rowGap = 0;
    
    if (xPositions.length >= 2) {
      const widths = children.map(c => c.absoluteBoundingBox!.width);
      const avgWidth = widths.reduce((a, b) => a + b, 0) / widths.length;
      columnGap = Math.max(0, xPositions[1] - xPositions[0] - avgWidth);
    }
    
    if (yPositions.length >= 2) {
      const heights = children.map(c => c.absoluteBoundingBox!.height);
      const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
      rowGap = Math.max(0, yPositions[1] - yPositions[0] - avgHeight);
    }
    
    return {
      type: 'grid',
      columns: xPositions.length,
      rows: yPositions.length,
      gap: columnGap === rowGap ? columnGap : { row: rowGap, column: columnGap },
      padding: {
        top: node.paddingTop || 0,
        right: node.paddingRight || 0,
        bottom: node.paddingBottom || 0,
        left: node.paddingLeft || 0,
      },
    };
  }

  // ==========================================
  // ABSOLUTE LAYOUT ANALYSIS
  // ==========================================

  private analyzeAbsoluteLayout(node: FigmaNode): AbsoluteLayout {
    const bbox = node.absoluteBoundingBox;
    const parentBbox = this.getParentBounds(node);
    
    const position: AbsoluteLayout['position'] = {};
    
    if (bbox && parentBbox) {
      // Calculate position relative to parent
      const relativeX = bbox.x - parentBbox.x;
      const relativeY = bbox.y - parentBbox.y;
      
      // Determine which edges to use based on constraints
      const constraints = node.constraints;
      
      if (constraints?.horizontal === 'LEFT' || constraints?.horizontal === 'LEFT_RIGHT') {
        position.left = relativeX;
      }
      if (constraints?.horizontal === 'RIGHT' || constraints?.horizontal === 'LEFT_RIGHT') {
        position.right = parentBbox.width - (relativeX + bbox.width);
      }
      if (constraints?.horizontal === 'CENTER') {
        position.left = '50%';
        // transform: translateX(-50%) would be needed
      }
      
      if (constraints?.vertical === 'TOP' || constraints?.vertical === 'TOP_BOTTOM') {
        position.top = relativeY;
      }
      if (constraints?.vertical === 'BOTTOM' || constraints?.vertical === 'TOP_BOTTOM') {
        position.bottom = parentBbox.height - (relativeY + bbox.height);
      }
      if (constraints?.vertical === 'CENTER') {
        position.top = '50%';
        // transform: translateY(-50%) would be needed
      }
    }
    
    return {
      type: 'absolute',
      position,
      width: node.absoluteBoundingBox?.width,
      height: node.absoluteBoundingBox?.height,
    };
  }

  private getParentBounds(node: FigmaNode): Rectangle | undefined {
    // In a real implementation, we'd track parent bounds during traversal
    // For now, return undefined
    return undefined;
  }

  // ==========================================
  // STATIC LAYOUT
  // ==========================================

  private analyzeStaticLayout(node: FigmaNode): StaticLayout {
    return {
      type: 'static',
      width: node.absoluteBoundingBox?.width,
      height: node.absoluteBoundingBox?.height,
    };
  }

  // ==========================================
  // CHILD LAYOUT ANALYSIS
  // ==========================================

  private analyzeChildLayout(child: FigmaNode, parent: FigmaNode): ChildLayoutInfo {
    const sizing = this.analyzeSizing(child, parent);
    
    return {
      nodeId: child.id,
      nodeName: child.name,
      layout: this.analyze(child),
      sizing,
      flexGrow: child.layoutGrow,
      alignSelf: child.layoutAlign ? this.mapAlignItems(child.layoutAlign) : undefined,
    };
  }

  private analyzeSizing(node: FigmaNode, parent: FigmaNode): ChildLayoutInfo['sizing'] {
    // Determine horizontal sizing
    let width: 'fixed' | 'hug' | 'fill' = 'fixed';
    if (node.layoutSizingHorizontal === 'HUG') {
      width = 'hug';
    } else if (node.layoutSizingHorizontal === 'FILL' || node.layoutAlign === 'STRETCH') {
      width = 'fill';
    }
    
    // Determine vertical sizing
    let height: 'fixed' | 'hug' | 'fill' = 'fixed';
    if (node.layoutSizingVertical === 'HUG') {
      height = 'hug';
    } else if (node.layoutSizingVertical === 'FILL' || node.layoutGrow) {
      height = 'fill';
    }
    
    return {
      width,
      height,
      minWidth: node.minWidth,
      maxWidth: node.maxWidth,
      minHeight: node.minHeight,
      maxHeight: node.maxHeight,
    };
  }

  // ==========================================
  // CSS GENERATION
  // ==========================================

  layoutToCss(layout: LayoutAnalysis): Record<string, string> {
    const css: Record<string, string> = {};
    
    switch (layout.type) {
      case 'flex':
        return this.flexToCss(layout);
      case 'grid':
        return this.gridToCss(layout);
      case 'absolute':
        return this.absoluteToCss(layout);
      case 'static':
        return this.staticToCss(layout);
    }
    
    return css;
  }

  private flexToCss(layout: FlexLayout): Record<string, string> {
    const css: Record<string, string> = {
      display: 'flex',
      'flex-direction': layout.direction,
      'flex-wrap': layout.wrap,
      'justify-content': layout.justifyContent,
      'align-items': layout.alignItems,
    };
    
    // Gap
    if (typeof layout.gap === 'number') {
      if (layout.gap > 0) {
        css.gap = `${layout.gap}px`;
      }
    } else {
      if (layout.gap.row > 0 || layout.gap.column > 0) {
        css.gap = `${layout.gap.row}px ${layout.gap.column}px`;
      }
    }
    
    // Padding
    const { top, right, bottom, left } = layout.padding;
    if (top > 0 || right > 0 || bottom > 0 || left > 0) {
      if (top === right && right === bottom && bottom === left) {
        css.padding = `${top}px`;
      } else if (top === bottom && left === right) {
        css.padding = `${top}px ${right}px`;
      } else {
        css.padding = `${top}px ${right}px ${bottom}px ${left}px`;
      }
    }
    
    return css;
  }

  private gridToCss(layout: GridLayout): Record<string, string> {
    const css: Record<string, string> = {
      display: 'grid',
    };
    
    // Columns
    if (typeof layout.columns === 'number') {
      css['grid-template-columns'] = `repeat(${layout.columns}, 1fr)`;
    } else {
      css['grid-template-columns'] = layout.columns;
    }
    
    // Rows
    if (typeof layout.rows === 'number' && layout.rows > 0) {
      css['grid-template-rows'] = `repeat(${layout.rows}, auto)`;
    } else if (typeof layout.rows === 'string') {
      css['grid-template-rows'] = layout.rows;
    }
    
    // Gap
    if (typeof layout.gap === 'number') {
      if (layout.gap > 0) {
        css.gap = `${layout.gap}px`;
      }
    } else {
      if (layout.gap.row > 0 || layout.gap.column > 0) {
        css.gap = `${layout.gap.row}px ${layout.gap.column}px`;
      }
    }
    
    // Padding
    const { top, right, bottom, left } = layout.padding;
    if (top > 0 || right > 0 || bottom > 0 || left > 0) {
      css.padding = `${top}px ${right}px ${bottom}px ${left}px`;
    }
    
    return css;
  }

  private absoluteToCss(layout: AbsoluteLayout): Record<string, string> {
    const css: Record<string, string> = {
      position: 'absolute',
    };
    
    if (layout.position.top !== undefined) {
      css.top = typeof layout.position.top === 'number' ? `${layout.position.top}px` : layout.position.top;
    }
    if (layout.position.right !== undefined) {
      css.right = typeof layout.position.right === 'number' ? `${layout.position.right}px` : layout.position.right;
    }
    if (layout.position.bottom !== undefined) {
      css.bottom = typeof layout.position.bottom === 'number' ? `${layout.position.bottom}px` : layout.position.bottom;
    }
    if (layout.position.left !== undefined) {
      css.left = typeof layout.position.left === 'number' ? `${layout.position.left}px` : layout.position.left;
    }
    
    if (layout.width !== undefined) {
      css.width = typeof layout.width === 'number' ? `${layout.width}px` : layout.width;
    }
    if (layout.height !== undefined) {
      css.height = typeof layout.height === 'number' ? `${layout.height}px` : layout.height;
    }
    
    return css;
  }

  private staticToCss(layout: StaticLayout): Record<string, string> {
    const css: Record<string, string> = {};
    
    if (layout.width !== undefined) {
      css.width = typeof layout.width === 'number' ? `${layout.width}px` : layout.width;
    }
    if (layout.height !== undefined) {
      css.height = typeof layout.height === 'number' ? `${layout.height}px` : layout.height;
    }
    
    return css;
  }
}

// ============================================
// EXPORTS
// ============================================

export default LayoutAnalyzer;
