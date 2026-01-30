/**
 * LayoutCalculator - Calculate layout and positioning
 *
 * Calculates relative positions, bounds, and layout properties.
 * Preserves hierarchy through parent-relative positioning.
 *
 * Guided by Skills:
 * - forge-hierarchy-preservation.md: Calculates relative bounds (childX - parentX)
 * - forge-architectural-entropy.md: Single implementation for all generators
 */

import type { ParsedComponent } from '../../poc/types';

export interface CalculatedPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FlexLayoutInfo {
  display: 'flex' | 'block';
  flexDirection: 'row' | 'column';
  gap: number;
}

export class LayoutCalculator {
  /**
   * Calculate position (bounds) for a component
   *
   * SKILL: forge-hierarchy-preservation.md
   * Calculates relative position if parent provided (childX - parentX)
   * Otherwise uses absolute position from Figma
   *
   * @param component - ParsedComponent with bounds
   * @param parent - Optional parent component for relative positioning
   * @returns Position object with x, y, width, height
   */
  calculatePosition(
    component: ParsedComponent,
    parent?: ParsedComponent
  ): CalculatedPosition {
    const bounds = component.bounds;

    if (!bounds) {
      // No bounds - return zero position
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    // Calculate relative position if parent provided
    let x = bounds.x;
    let y = bounds.y;

    if (parent?.bounds) {
      x = bounds.x - parent.bounds.x;
      y = bounds.y - parent.bounds.y;
    }

    return {
      x,
      y,
      width: bounds.width,
      height: bounds.height,
    };
  }

  /**
   * Infer flexbox layout from component structure
   *
   * SKILL: react-best-practices.md
   * Detecting flex layout helps generate optimized React/CSS
   *
   * Heuristics:
   * - Components with evenly-spaced children likely use flex
   * - Vertical stacking suggests flex-direction: column
   * - Horizontal arrangement suggests flex-direction: row
   *
   * @param component - ParsedComponent to analyze
   * @returns FlexLayoutInfo or null if not flex
   */
  inferFlexLayout(component: ParsedComponent): FlexLayoutInfo | null {
    // Need children to infer flex
    if (!component.children || component.children.length < 2) {
      return null;
    }

    // Skip string IDs (can't analyze)
    if (typeof component.children[0] === 'string') {
      return null;
    }

    const children = component.children as ParsedComponent[];

    // Analyze children positions to detect flex
    const childBounds = children
      .filter(c => c.bounds)
      .map(c => c.bounds!);

    if (childBounds.length < 2) {
      return null;
    }

    // Check if children are arranged vertically (column)
    const isVertical = this.areChildrenVerticallyStacked(childBounds);

    // Check if children are arranged horizontally (row)
    const isHorizontal = this.areChildrenHorizontallyArranged(childBounds);

    if (isVertical) {
      const gap = this.calculateVerticalGap(childBounds);
      return {
        display: 'flex',
        flexDirection: 'column',
        gap,
      };
    }

    if (isHorizontal) {
      const gap = this.calculateHorizontalGap(childBounds);
      return {
        display: 'flex',
        flexDirection: 'row',
        gap,
      };
    }

    // Not flex layout (absolute positioning)
    return null;
  }

  /**
   * Check if children are vertically stacked
   * Vertically stacked if all children have similar X and increasing Y
   */
  private areChildrenVerticallyStacked(
    bounds: Array<{ x: number; y: number; width: number; height: number }>
  ): boolean {
    if (bounds.length < 2) return false;

    // Check if X positions are roughly aligned (within 10px tolerance)
    const firstX = bounds[0].x;
    const xAligned = bounds.every(b => Math.abs(b.x - firstX) < 10);

    if (!xAligned) return false;

    // Check if Y positions increase monotonically
    for (let i = 1; i < bounds.length; i++) {
      if (bounds[i].y <= bounds[i - 1].y) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if children are horizontally arranged
   * Horizontally arranged if all children have similar Y and increasing X
   */
  private areChildrenHorizontallyArranged(
    bounds: Array<{ x: number; y: number; width: number; height: number }>
  ): boolean {
    if (bounds.length < 2) return false;

    // Check if Y positions are roughly aligned (within 10px tolerance)
    const firstY = bounds[0].y;
    const yAligned = bounds.every(b => Math.abs(b.y - firstY) < 10);

    if (!yAligned) return false;

    // Check if X positions increase monotonically
    for (let i = 1; i < bounds.length; i++) {
      if (bounds[i].x <= bounds[i - 1].x) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate vertical gap between children
   */
  private calculateVerticalGap(
    bounds: Array<{ x: number; y: number; width: number; height: number }>
  ): number {
    if (bounds.length < 2) return 0;

    // Calculate gaps between consecutive children
    const gaps: number[] = [];
    for (let i = 1; i < bounds.length; i++) {
      const prevBottom = bounds[i - 1].y + bounds[i - 1].height;
      const currentTop = bounds[i].y;
      const gap = currentTop - prevBottom;
      if (gap >= 0) {
        gaps.push(gap);
      }
    }

    // Return average gap
    return gaps.length > 0
      ? Math.round(gaps.reduce((sum, g) => sum + g, 0) / gaps.length)
      : 0;
  }

  /**
   * Calculate horizontal gap between children
   */
  private calculateHorizontalGap(
    bounds: Array<{ x: number; y: number; width: number; height: number }>
  ): number {
    if (bounds.length < 2) return 0;

    // Calculate gaps between consecutive children
    const gaps: number[] = [];
    for (let i = 1; i < bounds.length; i++) {
      const prevRight = bounds[i - 1].x + bounds[i - 1].width;
      const currentLeft = bounds[i].x;
      const gap = currentLeft - prevRight;
      if (gap >= 0) {
        gaps.push(gap);
      }
    }

    // Return average gap
    return gaps.length > 0
      ? Math.round(gaps.reduce((sum, g) => sum + g, 0) / gaps.length)
      : 0;
  }

  /**
   * Generate CSS positioning styles
   *
   * @param position - Calculated position
   * @param relative - Whether to use relative or absolute positioning
   * @returns CSS positioning string
   */
  generatePositionStyles(
    position: CalculatedPosition,
    relative: boolean = false
  ): string {
    const styles: string[] = [];

    if (relative) {
      styles.push('position: relative');
    } else {
      styles.push('position: absolute');
      styles.push(`left: ${position.x}px`);
      styles.push(`top: ${position.y}px`);
    }

    styles.push(`width: ${position.width}px`);
    styles.push(`height: ${position.height}px`);

    return styles.join('; ');
  }

  /**
   * Generate CSS flexbox styles
   *
   * SKILL: react-best-practices.md
   * Flex layout is more performant than absolute positioning for lists
   *
   * @param flexInfo - Flex layout information
   * @returns CSS flexbox string
   */
  generateFlexStyles(flexInfo: FlexLayoutInfo): string {
    const styles: string[] = [
      `display: ${flexInfo.display}`,
      `flex-direction: ${flexInfo.flexDirection}`,
    ];

    if (flexInfo.gap > 0) {
      styles.push(`gap: ${flexInfo.gap}px`);
    }

    return styles.join('; ');
  }

  /**
   * Check if component has bounds
   *
   * @param component - ParsedComponent
   * @returns true if component has valid bounds
   */
  hasBounds(component: ParsedComponent): boolean {
    return !!(
      component.bounds &&
      typeof component.bounds.width === 'number' &&
      typeof component.bounds.height === 'number'
    );
  }

  /**
   * Get aspect ratio of component
   * Useful for responsive sizing
   *
   * @param component - ParsedComponent with bounds
   * @returns Aspect ratio (width/height) or null
   */
  getAspectRatio(component: ParsedComponent): number | null {
    if (!component.bounds) return null;

    const { width, height } = component.bounds;
    if (height === 0) return null;

    return width / height;
  }
}
