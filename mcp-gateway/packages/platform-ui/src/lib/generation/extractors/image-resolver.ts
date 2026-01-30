/**
 * ImageResolver - Detect and resolve image rendering patterns
 *
 * Implements the Vector Container Pattern skill to prevent logo fragmentation.
 * Detects IMAGE nodes, IMAGE fills, and vector containers (logos).
 *
 * Guided by Skills:
 * - forge-vector-containers.md: Detects logos and renders as single image
 * - forge-architectural-entropy.md: Single implementation for all generators
 */

import type { ParsedComponent } from '../../poc/types';

export class ImageResolver {
  /**
   * Detect if component is a vector container (logo pattern)
   *
   * SKILL: forge-vector-containers.md
   * A vector container is a FRAME/GROUP containing ONLY vector children.
   * These should be rendered as a single image (not 50+ individual pieces).
   *
   * @param component - ParsedComponent to check
   * @returns true if component is a vector container
   */
  isVectorContainer(component: ParsedComponent): boolean {
    // Check if parent is FRAME or GROUP
    if (!['FRAME', 'GROUP'].includes(component.type)) {
      return false;
    }

    // Must have children
    if (!component.children || component.children.length === 0) {
      return false;
    }

    // All children must be vector types
    // Support both string IDs (legacy) and nested components
    if (Array.isArray(component.children)) {
      // If children are objects (ParsedComponent[]), check their types
      if (typeof component.children[0] === 'object') {
        return (component.children as ParsedComponent[]).every(child =>
          ['VECTOR', 'ELLIPSE', 'LINE', 'BOOLEAN_OPERATION'].includes(child.type)
        );
      }
    }

    // Cannot determine from string IDs alone - assume not a vector container
    return false;
  }

  /**
   * Check if component has an IMAGE fill
   * Some components use background images instead of nested <img> tags
   *
   * @param component - ParsedComponent to check
   * @returns true if component has IMAGE fill
   */
  hasImageFill(component: ParsedComponent): boolean {
    if (!component.fills || component.fills.length === 0) return false;

    return component.fills.some(f => f.type === 'IMAGE' && (f as any).imageUrl);
  }

  /**
   * Get image URL from component
   * Checks multiple sources: direct imageUrl, IMAGE fills
   *
   * @param component - ParsedComponent
   * @returns Image URL or null
   */
  getImageUrl(component: ParsedComponent): string | null {
    // 1. Check direct imageUrl property (most common)
    if (component.imageUrl) {
      return component.imageUrl;
    }

    // 2. Check IMAGE fills
    if (component.fills && component.fills.length > 0) {
      const imageFill = component.fills.find(f => f.type === 'IMAGE' && (f as any).imageUrl);
      if (imageFill) {
        return (imageFill as any).imageUrl;
      }
    }

    return null;
  }

  /**
   * Determine if component should be rendered as an image element
   *
   * SKILL: forge-vector-containers.md
   * Render as image if:
   * - Component is IMAGE type
   * - Component is vector container (logo)
   * - Component is ICON type with imageUrl
   * - Component has IMAGE fill
   *
   * @param component - ParsedComponent
   * @returns true if should render as <img> tag
   */
  shouldRenderAsImage(component: ParsedComponent): boolean {
    // IMAGE type
    if (component.type === 'image') {
      return true;
    }

    // ICON type with imageUrl
    if (component.type === 'icon' && component.imageUrl) {
      return true;
    }

    // Vector container (logo pattern)
    if (this.isVectorContainer(component)) {
      return true;
    }

    // Has IMAGE fill
    if (this.hasImageFill(component)) {
      return false; // IMAGE fills use background-image, not <img>
    }

    return false;
  }

  /**
   * Determine if component is an icon node
   * Icons may need special rendering (e.g., contain vs cover)
   *
   * @param component - ParsedComponent
   * @returns true if component is an icon
   */
  isIcon(component: ParsedComponent): boolean {
    return component.type === 'icon';
  }

  /**
   * Determine if component is an image node
   * Image nodes always render as <img> tags
   *
   * @param component - ParsedComponent
   * @returns true if component is an image
   */
  isImage(component: ParsedComponent): boolean {
    return component.type === 'image';
  }

  /**
   * Get object-fit CSS value based on component type
   * Icons use 'contain' to preserve aspect ratio
   * Images use 'cover' to fill container
   *
   * SKILL: react-best-practices.md (performance)
   * Using correct object-fit prevents layout shift
   *
   * @param component - ParsedComponent
   * @returns CSS object-fit value
   */
  getObjectFit(component: ParsedComponent): 'contain' | 'cover' {
    // Icons and vectors: preserve aspect ratio
    if (component.type === 'icon' || this.isVectorContainer(component)) {
      return 'contain';
    }

    // Images: fill container
    return 'cover';
  }

  /**
   * Check if component should skip children traversal
   *
   * SKILL: forge-vector-containers.md
   * Vector containers should skip children (render parent as single image)
   *
   * @param component - ParsedComponent
   * @returns true if should skip traversing children
   */
  shouldSkipChildren(component: ParsedComponent): boolean {
    // Skip children if this is a vector container
    // Children will be included in parent's single image
    return this.isVectorContainer(component);
  }

  /**
   * Collect all image references from component tree
   *
   * SKILL: forge-vector-containers.md
   * Detects vector containers at collection stage (architectural decision)
   *
   * This method traverses the component tree and collects node IDs that need
   * image URLs from Figma API. It implements the vector container pattern to
   * prevent logo fragmentation.
   *
   * @param component - Root component to traverse
   * @param imageRefs - Set to accumulate image reference IDs
   */
  collectImageRefs(component: ParsedComponent, imageRefs: Set<string>): void {
    // Vector container pattern (SKILL: forge-vector-containers.md)
    if (this.isVectorContainer(component) && component.id) {
      imageRefs.add(component.id);
      // CRITICAL: Skip children traversal (parent rendered as single image)
      return;
    }

    // Direct IMAGE nodes
    if (component.type === 'image' && component.id) {
      imageRefs.add(component.id);
    }

    // Individual VECTOR nodes (only if not in a container already marked above)
    if (component.type === 'VECTOR' && component.id) {
      imageRefs.add(component.id);
    }

    // IMAGE fills
    if (this.hasImageFill(component) && component.id) {
      imageRefs.add(component.id);
    }

    // ICON nodes
    if (component.type === 'icon' && component.id) {
      imageRefs.add(component.id);
    }

    // Recursively traverse children (unless skipped above)
    if (component.children && Array.isArray(component.children)) {
      for (const child of component.children) {
        // Skip string IDs (legacy format)
        if (typeof child === 'string') continue;

        // Recurse into child components
        this.collectImageRefs(child as ParsedComponent, imageRefs);
      }
    }
  }

  /**
   * Check if component should be hidden
   *
   * SKILL: forge-vector-containers.md (ghost image prevention)
   * Empty icons (no imageUrl) should be hidden (opacity: 0)
   *
   * @param component - ParsedComponent
   * @returns true if component should be hidden
   */
  shouldHideComponent(component: ParsedComponent): boolean {
    // Hide empty icons (ghost image prevention)
    return component.type === 'icon' && !this.getImageUrl(component);
  }
}
