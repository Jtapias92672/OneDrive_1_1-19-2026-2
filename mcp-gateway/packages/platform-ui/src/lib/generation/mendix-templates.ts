/**
 * Mendix XML Templates
 * Epic 11: External Integrations - Phase 4
 *
 * XML template patterns for Mendix page and widget generation.
 */

export interface MendixPageConfig {
  name: string;
  title: string;
  layoutName?: string;
  widgets: MendixWidgetConfig[];
}

export interface MendixWidgetConfig {
  id: string;
  name: string;
  type: 'Container' | 'Text' | 'Button' | 'Image' | 'DataView' | 'ListView';
  properties: Record<string, string | number | boolean>;
  children?: MendixWidgetConfig[];
  styles?: MendixStyleConfig;
}

export interface MendixStyleConfig {
  class?: string;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  fontWeight?: string;
  padding?: string;
  margin?: string;
  borderRadius?: number;
}

/**
 * Generate Mendix page XML header
 */
export function generatePageHeader(config: MendixPageConfig): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<page xmlns="http://www.mendix.com/clientSystem/9.0"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      name="${escapeXml(config.name)}"
      title="${escapeXml(config.title)}">
  <layoutCall layoutName="${config.layoutName || 'Atlas_Default'}">
    <parameter name="Main">
      <placeholder>`;
}

/**
 * Generate Mendix page XML footer
 */
export function generatePageFooter(): string {
  return `      </placeholder>
    </parameter>
  </layoutCall>
</page>`;
}

/**
 * Generate container widget XML
 */
export function generateContainerWidget(config: MendixWidgetConfig, indent = 8): string {
  const indentStr = ' '.repeat(indent);
  const className = config.styles?.class || 'mx-container';

  let xml = `${indentStr}<container name="${escapeXml(config.name)}" class="${className}">\n`;

  // Add children
  if (config.children && config.children.length > 0) {
    for (const child of config.children) {
      xml += generateWidget(child, indent + 2);
    }
  }

  xml += `${indentStr}</container>\n`;
  return xml;
}

/**
 * Generate text widget XML
 */
export function generateTextWidget(config: MendixWidgetConfig, indent = 8): string {
  const indentStr = ' '.repeat(indent);
  const content = config.properties.content as string || config.name;
  const className = config.styles?.class || 'mx-text';

  return `${indentStr}<text name="${escapeXml(config.name)}" class="${className}">
${indentStr}  <caption>${escapeXml(content)}</caption>
${indentStr}</text>\n`;
}

/**
 * Generate button widget XML
 */
export function generateButtonWidget(config: MendixWidgetConfig, indent = 8): string {
  const indentStr = ' '.repeat(indent);
  const caption = config.properties.caption as string || config.name;
  const className = config.styles?.class || 'btn btn-primary';

  return `${indentStr}<actionButton name="${escapeXml(config.name)}" class="${className}">
${indentStr}  <caption>${escapeXml(caption)}</caption>
${indentStr}  <action>
${indentStr}    <noAction/>
${indentStr}  </action>
${indentStr}</actionButton>\n`;
}

/**
 * Generate image widget XML
 */
export function generateImageWidget(config: MendixWidgetConfig, indent = 8): string {
  const indentStr = ' '.repeat(indent);
  const className = config.styles?.class || 'mx-image';

  return `${indentStr}<image name="${escapeXml(config.name)}" class="${className}">
${indentStr}  <staticImage/>
${indentStr}</image>\n`;
}

/**
 * Generate any widget based on type
 */
export function generateWidget(config: MendixWidgetConfig, indent = 8): string {
  switch (config.type) {
    case 'Container':
      return generateContainerWidget(config, indent);
    case 'Text':
      return generateTextWidget(config, indent);
    case 'Button':
      return generateButtonWidget(config, indent);
    case 'Image':
      return generateImageWidget(config, indent);
    default:
      return generateContainerWidget(config, indent);
  }
}

/**
 * Generate complete page XML
 */
export function generatePageXml(config: MendixPageConfig): string {
  let xml = generatePageHeader(config);

  for (const widget of config.widgets) {
    xml += generateWidget(widget);
  }

  xml += generatePageFooter();
  return xml;
}

/**
 * Generate SCSS theme file
 */
export function generateThemeScss(styles: MendixStyleConfig[]): string {
  let scss = `/* Generated Mendix Theme */
/* Epic 11: External Integrations - Phase 4 */

// Variables
$primary-color: #3b82f6;
$secondary-color: #6b7280;
$success-color: #22c55e;
$danger-color: #ef4444;
$white: #ffffff;
$black: #000000;

// Base styles
.mx-container {
  box-sizing: border-box;
}

`;

  // Generate custom classes from styles
  for (const style of styles) {
    if (style.class) {
      scss += `.${style.class} {\n`;
      if (style.backgroundColor) scss += `  background-color: ${style.backgroundColor};\n`;
      if (style.textColor) scss += `  color: ${style.textColor};\n`;
      if (style.fontSize) scss += `  font-size: ${style.fontSize}px;\n`;
      if (style.fontWeight) scss += `  font-weight: ${style.fontWeight};\n`;
      if (style.padding) scss += `  padding: ${style.padding};\n`;
      if (style.margin) scss += `  margin: ${style.margin};\n`;
      if (style.borderRadius) scss += `  border-radius: ${style.borderRadius}px;\n`;
      scss += '}\n\n';
    }
  }

  return scss;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
