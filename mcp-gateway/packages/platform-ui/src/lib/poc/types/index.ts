/**
 * Forge POC Types
 * Epic: Figma → Jira → Full Stack Code → Test → Deploy → Close
 */

// =============================================================================
// Configuration Types
// =============================================================================

export interface POCOrchestratorConfig {
  figmaToken: string;
  jiraConfig?: JiraIntegrationConfig;
  vercelToken?: string;
  vercelTeamId?: string;
  awsRegion?: string;
  projectKey?: string; // Jira project key
  frontendBaseUrl?: string; // For test generation
  backendBaseUrl?: string; // For test generation
}

export interface JiraIntegrationConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

// =============================================================================
// Input Types
// =============================================================================

export interface POCRunInput {
  /** Figma URL to parse (mutually exclusive with htmlContent/htmlPath) */
  figmaUrl?: string;
  /** HTML content to parse directly */
  htmlContent?: string;
  /** Path to HTML file to parse */
  htmlPath?: string;
  options?: POCRunOptions;
}

export interface POCRunOptions {
  generateTests?: boolean;
  generateStories?: boolean;
  generateHtml?: boolean;
  deployFrontend?: boolean;
  deployBackend?: boolean;
  skipJira?: boolean;
  /** Directory to write generated files. If not specified, files are not written. */
  outputDir?: string;
}

// =============================================================================
// Source Metadata Types
// =============================================================================

export type SourceType = 'figma' | 'html';

export interface SourceMetadata {
  sourceType: SourceType;
  /** For Figma: file key; For HTML: file path or 'inline' */
  sourceId: string;
  /** Name of the source (Figma file name or HTML title) */
  sourceName: string;
  /** Last modified timestamp */
  lastModified: string;
  /** Additional source-specific metadata */
  extra?: Record<string, unknown>;
}

// =============================================================================
// Figma Types (from ParsedDesign)
// =============================================================================

export interface FigmaMetadata {
  fileKey: string;
  fileName: string;
  lastModified: string;
  thumbnailUrl?: string;
  version?: string;
}

export interface ParsedComponent {
  id: string;
  name: string;
  type: ComponentType | string; // Allow string for flexibility
  props: ComponentProp[];
  children?: string[] | ParsedComponent[]; // Child IDs or nested components
  styles: ComponentStyles;
}

export type ComponentType =
  | 'form'
  | 'list'
  | 'card'
  | 'button'
  | 'input'
  | 'modal'
  | 'navigation'
  | 'container'
  | 'unknown';

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
}

export interface ComponentStyles {
  layout?: 'flex' | 'grid' | 'absolute';
  spacing?: number;
  colors?: string[];
  typography?: TypographyStyle;
}

export interface TypographyStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
}

// =============================================================================
// API Inference Types
// =============================================================================

export interface InferredDataModel {
  name: string;
  fields: DataModelField[];
  endpoints: InferredEndpoint[];
  /** Source component name(s) this model was inferred from */
  source: string;
  /** Confidence score for this inference (0-1) */
  confidence?: number;
}

export interface DataModelField {
  name: string;
  type: string; // 'string' | 'number' | 'boolean' | 'date' | 'email' | 'array' | 'object' | custom
  required: boolean;
  validation?: string;
}

export interface InferredEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description?: string;
  requestBody?: string;
  responseType?: string;
}

// =============================================================================
// Generation Types
// =============================================================================

export interface GeneratedComponent {
  name: string;
  code: string;
  testCode?: string;
  storyCode?: string;
  htmlCode?: string;
  filePath: string;
}

export interface GeneratedBackend {
  controllers: GeneratedFile[];
  services: GeneratedFile[];
  models: GeneratedFile[];
  routes: GeneratedFile[];
  tests: GeneratedFile[];
  openApiSpec?: string;
}

export interface GeneratedFile {
  name: string;
  content: string;
  path: string;
}

// =============================================================================
// Jira Types
// =============================================================================

export interface JiraEpic {
  key: string;
  id: string;
  summary: string;
  url: string;
}

export interface JiraTask {
  key: string;
  id: string;
  summary: string;
  type: 'frontend' | 'backend';
  componentName: string;
  status: JiraTaskStatus;
  url: string;
}

export type JiraTaskStatus =
  | 'todo'
  | 'in_progress'
  | 'in_review'
  | 'done'
  | 'blocked';

// =============================================================================
// Deployment Types
// =============================================================================

export interface DeploymentResult {
  type: 'frontend' | 'backend';
  url: string;
  status: 'deploying' | 'ready' | 'error' | 'skipped' | 'failed';
  deploymentId: string;
  logs?: string;
  error?: string;
}

export interface VercelDeployment {
  id: string;
  url: string;
  state: 'BUILDING' | 'READY' | 'ERROR' | 'QUEUED';
  createdAt: string;
}

export interface LambdaDeployment {
  functionName: string;
  functionArn: string;
  apiGatewayUrl: string;
  version: string;
}

// =============================================================================
// Test Types
// =============================================================================

export interface TestResult {
  name: string;
  type: 'unit' | 'integration' | 'e2e';
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  errorMessage?: string;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  duration: number;
}

// =============================================================================
// Result Types
// =============================================================================

export interface POCRunResult {
  runId: string;
  status: POCRunStatus;
  figmaMetadata: FigmaMetadata;
  epic?: JiraEpic;
  tasks: JiraTask[];
  frontendComponents: GeneratedComponent[];
  backendFiles: GeneratedBackend;
  htmlFiles?: GeneratedFile[];
  inferredModels: InferredDataModel[];
  deployments: {
    frontend?: DeploymentResult;
    backend?: DeploymentResult;
  };
  testResults: {
    unit: TestSuite;
    e2e: TestSuite;
    api: TestSuite;
  };
  timestamps: {
    started: string;
    completed?: string;
  };
  error?: string;
  /** Path where files were written (if outputDir was specified) */
  outputPath?: string;
}

export interface POCManifest {
  runId: string;
  status: POCRunStatus;
  sourceType: 'figma' | 'html';
  sourceId: string;
  sourceName: string;
  generatedAt: string;
  completedAt?: string;
  summary: {
    frontendComponents: number;
    backendControllers: number;
    backendServices: number;
    backendModels: number;
    inferredModels: number;
    tests: number;
    htmlFiles?: number;
  };
  files: {
    react: string[];
    html: string[];
    backend: string[];
    tests: string[];
  };
}

export type POCRunStatus =
  | 'initializing'
  | 'parsing_figma'
  | 'parsing_html'
  | 'creating_jira_epic'
  | 'creating_jira_tasks'
  | 'generating_frontend'
  | 'generating_html'
  | 'generating_backend'
  | 'deploying_frontend'
  | 'deploying_backend'
  | 'running_tests'
  | 'closing_tickets'
  | 'completed'
  | 'failed';

// =============================================================================
// Event Types (for progress tracking)
// =============================================================================

export interface POCProgressEvent {
  runId: string;
  stage: POCRunStatus;
  progress: number; // 0-100
  message: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export type POCProgressCallback = (event: POCProgressEvent) => void;
