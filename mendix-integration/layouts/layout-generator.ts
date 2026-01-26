/**
 * FORGE Mendix Integration - Layout Generator
 * @epic 07 - Mendix Integration
 */

import { MendixIntegrationConfig, MendixWidget, MendixLayout, LayoutRegion, ResponsiveConfig } from '../core/types';

export class LayoutGenerator {
  private config: MendixIntegrationConfig;

  constructor(config: MendixIntegrationConfig) {
    this.config = config;
  }

  generateLayout(name: string, regions: string[]): MendixLayout {
    const layoutRegions: LayoutRegion[] = regions.map(r => ({
      name: r,
      type: this.inferRegionType(r),
      placeholder: `${r}Placeholder`,
    }));

    return {
      name,
      regions: layoutRegions,
      responsive: this.generateResponsiveConfig(regions.length),
    };
  }

  generateResponsiveConfig(columnCount: number): ResponsiveConfig {
    const baseWeight = Math.floor(12 / columnCount);
    const weights = Array(columnCount).fill(baseWeight);
    weights[weights.length - 1] = 12 - (baseWeight * (columnCount - 1));

    return {
      phone: { columns: 1, weights: [12] },
      tablet: { columns: Math.min(columnCount, 2), weights: columnCount <= 2 ? weights : [6, 6] },
      desktop: { columns: columnCount, weights },
    };
  }

  createLayoutGrid(children: MendixWidget[], columns: number = 12): MendixWidget {
    return {
      id: `layoutGrid_${Date.now()}`,
      type: 'LayoutGrid',
      name: 'layoutGrid',
      properties: { columns },
      children,
      cssClasses: [],
    };
  }

  createRow(children: MendixWidget[]): MendixWidget {
    return {
      id: `row_${Date.now()}`,
      type: 'LayoutGridRow',
      name: 'row',
      properties: {},
      children,
      cssClasses: [],
    };
  }

  createColumn(content: MendixWidget, weight: number = 6, tabletWeight?: number, phoneWeight: number = 12): MendixWidget {
    return {
      id: `col_${Date.now()}`,
      type: 'LayoutGridColumn',
      name: 'column',
      properties: { weight, tabletWeight: tabletWeight || weight, phoneWeight },
      children: [content],
      cssClasses: [],
    };
  }

  private inferRegionType(name: string): 'header' | 'sidebar' | 'content' | 'footer' {
    const lower = name.toLowerCase();
    if (lower.includes('header') || lower.includes('top')) return 'header';
    if (lower.includes('footer') || lower.includes('bottom')) return 'footer';
    if (lower.includes('side') || lower.includes('nav')) return 'sidebar';
    return 'content';
  }
}

export default LayoutGenerator;
