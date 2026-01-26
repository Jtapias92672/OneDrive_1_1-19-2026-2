/**
 * FORGE Mendix Integration Package
 * @epic 07 - Mendix Integration
 */

export * from './core/types';
export { MendixGenerator } from './core/generator';
export { default as MendixGeneratorClass } from './core/generator';
export { WidgetMapper } from './mappings/widget-mapper';
export { LayoutGenerator } from './layouts/layout-generator';
export { StyleConverter } from './widgets/style-converter';

import { MendixGenerator } from './core/generator';
import { MendixIntegrationConfig, MendixGenerationResult } from './core/types';

let defaultGenerator: MendixGenerator | null = null;

export function createGenerator(config?: Partial<MendixIntegrationConfig>): MendixGenerator {
  return new MendixGenerator(config);
}

export function getDefaultGenerator(): MendixGenerator {
  if (!defaultGenerator) defaultGenerator = new MendixGenerator();
  return defaultGenerator;
}

export async function generate(components: any[]): Promise<MendixGenerationResult> {
  return getDefaultGenerator().generate(components);
}

export const MENDIX_10_PRESET: Partial<MendixIntegrationConfig> = {
  mendixVersion: '10.6.0',
  mappingStrategy: 'flexible',
  layoutPreferences: { preferLayoutGrid: true, defaultContainer: 'container', breakpoints: { phone: 768, tablet: 992, desktop: 1200 }, autoLayoutMode: 'auto' },
};

export default MendixGenerator;
