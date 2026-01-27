/**
 * Mendix SDK Types
 * Epic 11: External Integrations
 */

export interface MendixProject {
  id: string;
  name: string;
  description: string;
  teamServerId: string;
  branchLine: string;
  revision: number;
}

export interface MendixModule {
  id: string;
  name: string;
  documentation: string;
  pages: MendixPage[];
  entities: MendixEntity[];
  microflows: MendixMicroflow[];
}

export interface MendixPage {
  id: string;
  name: string;
  layoutCall?: MendixLayoutCall;
  widgets: MendixWidget[];
}

export interface MendixLayoutCall {
  layoutId: string;
  layoutName: string;
}

export interface MendixWidget {
  id: string;
  type: MendixWidgetType;
  name: string;
  properties: Record<string, unknown>;
  children?: MendixWidget[];
}

export type MendixWidgetType =
  | 'DataView'
  | 'ListView'
  | 'DataGrid'
  | 'TextBox'
  | 'TextArea'
  | 'DropDown'
  | 'CheckBox'
  | 'RadioButtons'
  | 'DatePicker'
  | 'Button'
  | 'ActionButton'
  | 'Container'
  | 'LayoutGrid'
  | 'Table'
  | 'TabContainer'
  | 'NavigationTree'
  | 'Snippet'
  | 'PluginWidget';

export interface MendixEntity {
  id: string;
  name: string;
  documentation: string;
  attributes: MendixAttribute[];
  associations: MendixAssociation[];
}

export interface MendixAttribute {
  id: string;
  name: string;
  type: 'String' | 'Integer' | 'Long' | 'Decimal' | 'Boolean' | 'DateTime' | 'Enum';
}

export interface MendixAssociation {
  id: string;
  name: string;
  owner: 'Default' | 'Both';
  type: 'Reference' | 'ReferenceSet';
  parentEntity: string;
  childEntity: string;
}

export interface MendixMicroflow {
  id: string;
  name: string;
  documentation: string;
  returnType: string;
  parameters: MendixParameter[];
}

export interface MendixParameter {
  name: string;
  type: string;
}

export interface MPKExportOptions {
  outputPath: string;
  includeDeploymentPackage?: boolean;
  revision?: number;
}

export interface MPKExportResult {
  success: boolean;
  filePath: string;
  fileSize: number;
  exportedAt: Date;
  revision: number;
}

export interface MendixClientConfig {
  username: string;
  apiKey: string;
  teamServerUrl?: string;
}
