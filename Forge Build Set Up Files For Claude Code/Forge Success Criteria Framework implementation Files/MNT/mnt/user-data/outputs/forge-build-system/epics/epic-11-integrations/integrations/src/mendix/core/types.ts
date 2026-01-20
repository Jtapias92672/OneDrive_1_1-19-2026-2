/**
 * FORGE Mendix Integration - Core Types
 * 
 * @epic 07 - Mendix Integration
 * @task 1.1 - Type Definitions
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Type definitions for Mendix widget mapping, layout generation,
 *   and page creation from React/Figma designs.
 */

// ============================================
// CONFIGURATION TYPES
// ============================================

export interface MendixIntegrationConfig {
  /** Target Mendix version */
  mendixVersion: string;
  
  /** Module name for generated pages */
  moduleName: string;
  
  /** Widget mapping strategy */
  mappingStrategy: MappingStrategy;
  
  /** Layout preferences */
  layoutPreferences: LayoutPreferences;
  
  /** Style generation options */
  styleOptions: MendixStyleOptions;
  
  /** SDK configuration */
  sdkConfig?: MendixSDKConfig;
  
  /** Custom widget mappings */
  customMappings?: CustomWidgetMapping[];
}

export type MappingStrategy = 
  | 'strict'       // Only use exact widget matches
  | 'flexible'     // Use closest available widget
  | 'custom'       // Use custom mapping rules
  | 'hybrid';      // Combine strict with custom fallbacks

export interface LayoutPreferences {
  /** Prefer layout grid over containers */
  preferLayoutGrid: boolean;
  
  /** Default container type */
  defaultContainer: ContainerType;
  
  /** Responsive breakpoints */
  breakpoints: MendixBreakpoints;
  
  /** Auto-layout conversion mode */
  autoLayoutMode: AutoLayoutMode;
}

export type ContainerType =
  | 'container'
  | 'layoutGrid'
  | 'scrollContainer'
  | 'tabContainer'
  | 'groupBox';

export type AutoLayoutMode =
  | 'flex'        // Convert to flex containers
  | 'grid'        // Convert to layout grids
  | 'table'       // Convert to data grids
  | 'auto';       // Choose based on content

export interface MendixBreakpoints {
  phone: number;      // e.g., 768
  tablet: number;     // e.g., 992
  desktop: number;    // e.g., 1200
}

export interface MendixStyleOptions {
  /** Use design tokens */
  useDesignTokens: boolean;
  
  /** Generate SCSS variables */
  generateSCSSVariables: boolean;
  
  /** Apply Atlas UI classes */
  useAtlasUI: boolean;
  
  /** Custom class prefix */
  classPrefix: string;
}

export interface MendixSDKConfig {
  /** Mendix app ID */
  appId: string;
  
  /** Branch name */
  branchName: string;
  
  /** Personal access token */
  accessToken?: string;
  
  /** Working copy ID */
  workingCopyId?: string;
}

export interface CustomWidgetMapping {
  /** Source component pattern (regex) */
  sourcePattern: string;
  
  /** Target Mendix widget */
  targetWidget: string;
  
  /** Property mappings */
  propertyMappings: PropertyMapping[];
  
  /** Condition for applying this mapping */
  condition?: string;
}

export interface PropertyMapping {
  /** Source property name */
  source: string;
  
  /** Target Mendix property */
  target: string;
  
  /** Value transformation */
  transform?: string;
  
  /** Default value */
  defaultValue?: string;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_CONFIG: MendixIntegrationConfig = {
  mendixVersion: '10.6.0',
  moduleName: 'GeneratedPages',
  mappingStrategy: 'flexible',
  layoutPreferences: {
    preferLayoutGrid: true,
    defaultContainer: 'container',
    breakpoints: {
      phone: 768,
      tablet: 992,
      desktop: 1200,
    },
    autoLayoutMode: 'auto',
  },
  styleOptions: {
    useDesignTokens: true,
    generateSCSSVariables: true,
    useAtlasUI: true,
    classPrefix: 'gen-',
  },
};

// ============================================
// MENDIX WIDGET TYPES
// ============================================

export interface MendixWidget {
  /** Widget ID */
  id: string;
  
  /** Widget type (e.g., 'Text', 'Button', 'Container') */
  type: MendixWidgetType;
  
  /** Widget name in the model */
  name: string;
  
  /** Widget properties */
  properties: Record<string, MendixPropertyValue>;
  
  /** Child widgets */
  children: MendixWidget[];
  
  /** CSS classes */
  cssClasses: string[];
  
  /** Inline styles */
  inlineStyles?: Record<string, string>;
  
  /** Conditional visibility */
  visibility?: VisibilityCondition;
  
  /** Events/actions */
  events?: MendixEvent[];
  
  /** Source Figma/React node ID */
  sourceId?: string;
}

export type MendixWidgetType =
  // Layout
  | 'Container'
  | 'LayoutGrid'
  | 'LayoutGridRow'
  | 'LayoutGridColumn'
  | 'ScrollContainer'
  | 'TabContainer'
  | 'Tab'
  | 'GroupBox'
  | 'Snippet'
  | 'SnippetCall'
  
  // Input
  | 'TextBox'
  | 'TextArea'
  | 'DatePicker'
  | 'DropDown'
  | 'ReferenceSelector'
  | 'CheckBox'
  | 'RadioButtons'
  | 'FileUploader'
  | 'ImageUploader'
  
  // Display
  | 'Text'
  | 'Title'
  | 'Label'
  | 'DynamicText'
  | 'Image'
  | 'DynamicImage'
  | 'StaticImage'
  
  // Action
  | 'Button'
  | 'ActionButton'
  | 'LinkButton'
  | 'PopupMenuButton'
  
  // Data
  | 'DataView'
  | 'ListView'
  | 'TemplateGrid'
  | 'DataGrid'
  | 'DataGrid2'
  
  // Navigation
  | 'NavigationList'
  | 'MenuBar'
  | 'SimpleMenuBar'
  
  // Custom
  | 'PluggableWidget'
  | 'CustomWidget';

export type MendixPropertyValue =
  | string
  | number
  | boolean
  | null
  | MendixExpression
  | MendixAssociation
  | MendixAction;

export interface MendixExpression {
  type: 'expression';
  value: string;
}

export interface MendixAssociation {
  type: 'association';
  entityPath: string;
}

export interface MendixAction {
  type: 'action';
  actionType: MendixActionType;
  parameters?: Record<string, any>;
}

export type MendixActionType =
  | 'callMicroflow'
  | 'callNanoflow'
  | 'openPage'
  | 'closePage'
  | 'showMessage'
  | 'downloadFile'
  | 'callRestService'
  | 'synchronize';

export interface VisibilityCondition {
  /** Condition type */
  type: 'attribute' | 'expression' | 'moduleRole';
  
  /** Condition value */
  value: string;
  
  /** Visibility mode */
  mode: 'visible' | 'hidden' | 'collapsed';
}

export interface MendixEvent {
  /** Event type */
  type: 'onClick' | 'onChange' | 'onEnter' | 'onLeave' | 'onLoad';
  
  /** Action to execute */
  action: MendixAction;
}

// ============================================
// MENDIX PAGE TYPES
// ============================================

export interface MendixPage {
  /** Page ID */
  id: string;
  
  /** Page name */
  name: string;
  
  /** Page title */
  title: string;
  
  /** Module containing the page */
  module: string;
  
  /** Page layout */
  layout: string;
  
  /** Page parameters */
  parameters: MendixPageParameter[];
  
  /** Root widget (usually a container) */
  content: MendixWidget;
  
  /** Page styles */
  styles: MendixPageStyles;
  
  /** Navigation profile */
  navigationProfile?: 'Responsive' | 'TabletPhone' | 'Phone';
  
  /** Allowed roles */
  allowedRoles?: string[];
}

export interface MendixPageParameter {
  /** Parameter name */
  name: string;
  
  /** Entity type */
  entityType: string;
  
  /** Is required */
  required: boolean;
}

export interface MendixPageStyles {
  /** SCSS content */
  scss: string;
  
  /** CSS variables */
  variables: Record<string, string>;
  
  /** Custom classes */
  customClasses: MendixCustomClass[];
}

export interface MendixCustomClass {
  /** Class name */
  name: string;
  
  /** Class definition */
  definition: string;
  
  /** Breakpoint-specific overrides */
  responsive?: Record<string, string>;
}

// ============================================
// GENERATION RESULT TYPES
// ============================================

export interface MendixGenerationResult {
  /** Generated pages */
  pages: MendixPage[];
  
  /** Generated snippets */
  snippets: MendixSnippet[];
  
  /** Generated styles */
  styles: MendixStyleBundle;
  
  /** Widget library used */
  widgetLibrary: WidgetLibraryUsage;
  
  /** Generation statistics */
  stats: MendixGenerationStats;
  
  /** Warnings */
  warnings: MendixWarning[];
  
  /** Errors */
  errors: MendixError[];
}

export interface MendixSnippet {
  /** Snippet ID */
  id: string;
  
  /** Snippet name */
  name: string;
  
  /** Module */
  module: string;
  
  /** Content */
  content: MendixWidget;
  
  /** Parameters */
  parameters: MendixPageParameter[];
}

export interface MendixStyleBundle {
  /** Main SCSS file */
  mainScss: string;
  
  /** Variables file */
  variablesScss: string;
  
  /** Component-specific styles */
  componentStyles: Record<string, string>;
  
  /** Design tokens */
  designTokens: Record<string, string>;
}

export interface WidgetLibraryUsage {
  /** Core widgets used */
  coreWidgets: string[];
  
  /** Atlas UI widgets used */
  atlasWidgets: string[];
  
  /** Custom/pluggable widgets used */
  customWidgets: string[];
  
  /** Widget counts */
  counts: Record<string, number>;
}

export interface MendixGenerationStats {
  /** Total pages generated */
  totalPages: number;
  
  /** Total snippets generated */
  totalSnippets: number;
  
  /** Total widgets generated */
  totalWidgets: number;
  
  /** Mapping success rate */
  mappingSuccessRate: number;
  
  /** Generation duration */
  durationMs: number;
}

export interface MendixWarning {
  /** Warning code */
  code: string;
  
  /** Warning message */
  message: string;
  
  /** Related source ID */
  sourceId?: string;
  
  /** Suggested fix */
  suggestion?: string;
}

export interface MendixError {
  /** Error code */
  code: string;
  
  /** Error message */
  message: string;
  
  /** Related source ID */
  sourceId?: string;
  
  /** Stack trace */
  stack?: string;
}

// ============================================
// WIDGET MAPPING TYPES
// ============================================

export interface WidgetMappingRule {
  /** Rule ID */
  id: string;
  
  /** Source component type */
  sourceType: string;
  
  /** Source semantic hint */
  sourceSemantic?: string;
  
  /** Target Mendix widget type */
  targetType: MendixWidgetType;
  
  /** Priority (higher = checked first) */
  priority: number;
  
  /** Property mappings */
  properties: PropertyMapping[];
  
  /** Child handling */
  childHandling: 'map' | 'flatten' | 'ignore';
  
  /** Condition for this rule */
  condition?: (node: any) => boolean;
}

export interface MappingContext {
  /** Parent widget type */
  parentType?: MendixWidgetType;
  
  /** Depth in tree */
  depth: number;
  
  /** Available data sources */
  dataSources: string[];
  
  /** Page parameters */
  pageParameters: string[];
  
  /** Current module */
  module: string;
}

// ============================================
// LAYOUT TYPES
// ============================================

export interface MendixLayout {
  /** Layout name */
  name: string;
  
  /** Layout regions */
  regions: LayoutRegion[];
  
  /** Responsive configuration */
  responsive: ResponsiveConfig;
}

export interface LayoutRegion {
  /** Region name */
  name: string;
  
  /** Region type */
  type: 'header' | 'sidebar' | 'content' | 'footer';
  
  /** Region content placeholder */
  placeholder: string;
}

export interface ResponsiveConfig {
  /** Phone layout */
  phone: ColumnConfig;
  
  /** Tablet layout */
  tablet: ColumnConfig;
  
  /** Desktop layout */
  desktop: ColumnConfig;
}

export interface ColumnConfig {
  /** Number of columns */
  columns: number;
  
  /** Column weights */
  weights: number[];
  
  /** Hidden regions */
  hiddenRegions?: string[];
}

// ============================================
// EXPORTS
// ============================================

export default MendixIntegrationConfig;
