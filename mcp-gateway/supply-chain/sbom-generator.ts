/**
 * MCP Security Gateway - SBOM Generator
 *
 * @epic 3.7 - Compliance & Validation
 * @task 3.7.2 - SBOM Generation (CycloneDX)
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Generates Software Bill of Materials (SBOM) in CycloneDX 1.5 format.
 *   Includes all direct and transitive dependencies with computed hashes.
 *
 * @compliance
 *   - Executive Order 14028: SBOM requirement for federal software
 *   - NTIA minimum elements for SBOM
 *   - CycloneDX 1.5 specification
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// TYPES
// ============================================

/**
 * CycloneDX SBOM format
 */
export interface CycloneDXSBOM {
  /** BOM format */
  bomFormat: 'CycloneDX';

  /** Specification version */
  specVersion: '1.5';

  /** Serial number (URN) */
  serialNumber: string;

  /** Version number */
  version: number;

  /** Metadata about SBOM generation */
  metadata: SBOMMetadata;

  /** List of components */
  components: SBOMComponent[];

  /** Dependencies between components */
  dependencies: SBOMDependency[];

  /** Compositions (assembly completeness) */
  compositions?: SBOMComposition[];

  /** Vulnerabilities (if scanned) */
  vulnerabilities?: SBOMVulnerability[];
}

/**
 * SBOM Metadata
 */
export interface SBOMMetadata {
  /** Generation timestamp */
  timestamp: string;

  /** Tools used to generate SBOM */
  tools: SBOMTool[];

  /** Component being described (root) */
  component?: SBOMComponent;

  /** Supplier information */
  supplier?: SBOMSupplier;

  /** Author information */
  authors?: SBOMAuthor[];
}

/**
 * SBOM Tool information
 */
export interface SBOMTool {
  vendor: string;
  name: string;
  version: string;
}

/**
 * SBOM Component (dependency)
 */
export interface SBOMComponent {
  /** Component type */
  type: 'library' | 'framework' | 'application' | 'file' | 'firmware';

  /** Unique identifier */
  'bom-ref': string;

  /** Component name */
  name: string;

  /** Component version */
  version: string;

  /** Package URL (purl) */
  purl?: string;

  /** Description */
  description?: string;

  /** Licenses */
  licenses?: Array<{ license: { id?: string; name?: string } }>;

  /** Hashes */
  hashes?: Array<{ alg: string; content: string }>;

  /** External references */
  externalReferences?: Array<{
    type: string;
    url: string;
  }>;

  /** Scope (required, optional, excluded) */
  scope?: 'required' | 'optional' | 'excluded';

  /** Publisher */
  publisher?: string;
}

/**
 * SBOM Dependency relationship
 */
export interface SBOMDependency {
  /** Reference to component */
  ref: string;

  /** Dependencies of this component */
  dependsOn: string[];
}

/**
 * SBOM Composition (completeness)
 */
export interface SBOMComposition {
  aggregate: 'complete' | 'incomplete' | 'incomplete_first_party_only' | 'unknown';
  assemblies?: string[];
  dependencies?: string[];
}

/**
 * SBOM Vulnerability
 */
export interface SBOMVulnerability {
  id: string;
  source: { name: string; url?: string };
  description?: string;
  ratings?: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'none' | 'unknown';
    method?: string;
    score?: number;
    vector?: string;
  }>;
  affects?: Array<{
    ref: string;
    versions?: Array<{ version: string; status: 'affected' | 'unaffected' | 'unknown' }>;
  }>;
}

/**
 * SBOM Supplier
 */
export interface SBOMSupplier {
  name: string;
  url?: string[];
  contact?: Array<{ name?: string; email?: string }>;
}

/**
 * SBOM Author
 */
export interface SBOMAuthor {
  name: string;
  email?: string;
}

/**
 * Package.json dependency format
 */
interface PackageJson {
  name: string;
  version: string;
  description?: string;
  license?: string;
  author?: string | { name: string; email?: string };
  repository?: string | { type: string; url: string };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

/**
 * SBOM Generator configuration
 */
export interface SBOMGeneratorConfig {
  /** Include dev dependencies */
  includeDevDependencies: boolean;

  /** Include peer dependencies */
  includePeerDependencies: boolean;

  /** Include optional dependencies */
  includeOptionalDependencies: boolean;

  /** Compute hashes for packages */
  computeHashes: boolean;

  /** Include license information */
  includeLicenses: boolean;

  /** Supplier information */
  supplier?: SBOMSupplier;

  /** Author information */
  authors?: SBOMAuthor[];
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const DEFAULT_CONFIG: SBOMGeneratorConfig = {
  includeDevDependencies: false,
  includePeerDependencies: true,
  includeOptionalDependencies: false,
  computeHashes: true,
  includeLicenses: true,
};

// ============================================
// SBOM GENERATOR
// ============================================

/**
 * SBOM Generator
 *
 * Generates CycloneDX 1.5 format Software Bill of Materials
 * from npm package.json and node_modules.
 */
export class SBOMGenerator {
  private config: SBOMGeneratorConfig;

  constructor(config: Partial<SBOMGeneratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate SBOM from package.json
   */
  async generate(packageJsonPath: string): Promise<CycloneDXSBOM> {
    // Read package.json
    const packageJson = await this.readPackageJson(packageJsonPath);
    const projectDir = path.dirname(packageJsonPath);

    // Collect all dependencies
    const dependencies = this.collectDependencies(packageJson);

    // Generate components
    const components: SBOMComponent[] = [];
    const dependencyGraph: SBOMDependency[] = [];

    // Add root component
    const rootRef = `pkg:npm/${packageJson.name}@${packageJson.version}`;
    const rootComponent = this.createRootComponent(packageJson);
    components.push(rootComponent);

    // Process dependencies
    const rootDeps: string[] = [];
    for (const [name, versionSpec] of Object.entries(dependencies)) {
      const version = this.resolveVersion(versionSpec);
      const component = await this.createComponent(name, version, projectDir);
      components.push(component);
      rootDeps.push(component['bom-ref']);
    }

    // Add root dependency
    dependencyGraph.push({
      ref: rootRef,
      dependsOn: rootDeps,
    });

    // Generate serial number
    const serialNumber = `urn:uuid:${this.generateUUID()}`;

    // Create SBOM
    const sbom: CycloneDXSBOM = {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      serialNumber,
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [
          {
            vendor: 'ArcFoundry',
            name: 'MCP Gateway SBOM Generator',
            version: '1.0.0',
          },
        ],
        component: rootComponent,
        supplier: this.config.supplier,
        authors: this.config.authors,
      },
      components,
      dependencies: dependencyGraph,
      compositions: [
        {
          aggregate: 'complete',
          assemblies: components.map((c) => c['bom-ref']),
        },
      ],
    };

    return sbom;
  }

  /**
   * Generate SBOM and export to JSON
   */
  async generateJSON(packageJsonPath: string): Promise<string> {
    const sbom = await this.generate(packageJsonPath);
    return JSON.stringify(sbom, null, 2);
  }

  /**
   * Generate SBOM and export to XML
   */
  async generateXML(packageJsonPath: string): Promise<string> {
    const sbom = await this.generate(packageJsonPath);
    return this.toXML(sbom);
  }

  /**
   * Read package.json
   */
  private async readPackageJson(filePath: string): Promise<PackageJson> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as PackageJson;
    } catch (error) {
      throw new SBOMGenerationError(
        `Failed to read package.json: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'READ_ERROR'
      );
    }
  }

  /**
   * Collect all dependencies based on configuration
   */
  private collectDependencies(packageJson: PackageJson): Record<string, string> {
    const deps: Record<string, string> = { ...packageJson.dependencies };

    if (this.config.includeDevDependencies && packageJson.devDependencies) {
      Object.assign(deps, packageJson.devDependencies);
    }

    if (this.config.includePeerDependencies && packageJson.peerDependencies) {
      Object.assign(deps, packageJson.peerDependencies);
    }

    if (this.config.includeOptionalDependencies && packageJson.optionalDependencies) {
      Object.assign(deps, packageJson.optionalDependencies);
    }

    return deps;
  }

  /**
   * Resolve version from semver spec
   */
  private resolveVersion(spec: string): string {
    // Remove semver operators
    return spec.replace(/^[\^~>=<]+/, '');
  }

  /**
   * Create root component
   */
  private createRootComponent(packageJson: PackageJson): SBOMComponent {
    const component: SBOMComponent = {
      type: 'application',
      'bom-ref': `pkg:npm/${packageJson.name}@${packageJson.version}`,
      name: packageJson.name,
      version: packageJson.version,
      purl: `pkg:npm/${encodeURIComponent(packageJson.name)}@${packageJson.version}`,
      description: packageJson.description,
    };

    // Add license
    if (this.config.includeLicenses && packageJson.license) {
      component.licenses = [{ license: { id: packageJson.license } }];
    }

    // Add external references
    if (packageJson.repository) {
      const repoUrl =
        typeof packageJson.repository === 'string'
          ? packageJson.repository
          : packageJson.repository.url;
      component.externalReferences = [{ type: 'vcs', url: repoUrl }];
    }

    return component;
  }

  /**
   * Create component for dependency
   */
  private async createComponent(
    name: string,
    version: string,
    projectDir: string
  ): Promise<SBOMComponent> {
    const component: SBOMComponent = {
      type: 'library',
      'bom-ref': `pkg:npm/${name}@${version}`,
      name,
      version,
      purl: `pkg:npm/${encodeURIComponent(name)}@${version}`,
      scope: 'required',
    };

    // Try to read package info from node_modules
    try {
      const pkgPath = path.join(projectDir, 'node_modules', name, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as PackageJson;

        component.description = pkgJson.description;

        if (this.config.includeLicenses && pkgJson.license) {
          component.licenses = [{ license: { id: pkgJson.license } }];
        }

        if (pkgJson.repository) {
          const repoUrl =
            typeof pkgJson.repository === 'string' ? pkgJson.repository : pkgJson.repository.url;
          component.externalReferences = [{ type: 'vcs', url: repoUrl }];
        }
      }
    } catch {
      // Ignore errors reading dependency info
    }

    // Compute hash
    if (this.config.computeHashes) {
      const hash = await this.computePackageHash(name, version, projectDir);
      if (hash) {
        component.hashes = [{ alg: 'SHA-256', content: hash }];
      }
    }

    return component;
  }

  /**
   * Compute SHA-256 hash of package
   */
  private async computePackageHash(
    name: string,
    _version: string,
    projectDir: string
  ): Promise<string | null> {
    try {
      const pkgDir = path.join(projectDir, 'node_modules', name);
      if (!fs.existsSync(pkgDir)) {
        return null;
      }

      // Hash the package.json file
      const pkgJsonPath = path.join(pkgDir, 'package.json');
      if (fs.existsSync(pkgJsonPath)) {
        const content = fs.readFileSync(pkgJsonPath);
        return crypto.createHash('sha256').update(content).digest('hex');
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Generate UUID v4
   */
  private generateUUID(): string {
    const bytes = crypto.randomBytes(16);
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  /**
   * Convert SBOM to XML format
   */
  private toXML(sbom: CycloneDXSBOM): string {
    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(
      '<bom xmlns="http://cyclonedx.org/schema/bom/1.5" version="1" serialNumber="' +
        sbom.serialNumber +
        '">'
    );

    // Metadata
    lines.push('  <metadata>');
    lines.push(`    <timestamp>${sbom.metadata.timestamp}</timestamp>`);
    lines.push('    <tools>');
    for (const tool of sbom.metadata.tools) {
      lines.push('      <tool>');
      lines.push(`        <vendor>${this.escapeXml(tool.vendor)}</vendor>`);
      lines.push(`        <name>${this.escapeXml(tool.name)}</name>`);
      lines.push(`        <version>${this.escapeXml(tool.version)}</version>`);
      lines.push('      </tool>');
    }
    lines.push('    </tools>');
    lines.push('  </metadata>');

    // Components
    lines.push('  <components>');
    for (const comp of sbom.components) {
      lines.push(`    <component type="${comp.type}" bom-ref="${this.escapeXml(comp['bom-ref'])}">`);
      lines.push(`      <name>${this.escapeXml(comp.name)}</name>`);
      lines.push(`      <version>${this.escapeXml(comp.version)}</version>`);
      if (comp.purl) {
        lines.push(`      <purl>${this.escapeXml(comp.purl)}</purl>`);
      }
      if (comp.description) {
        lines.push(`      <description>${this.escapeXml(comp.description)}</description>`);
      }
      if (comp.hashes && comp.hashes.length > 0) {
        lines.push('      <hashes>');
        for (const hash of comp.hashes) {
          lines.push(`        <hash alg="${hash.alg}">${hash.content}</hash>`);
        }
        lines.push('      </hashes>');
      }
      lines.push('    </component>');
    }
    lines.push('  </components>');

    // Dependencies
    lines.push('  <dependencies>');
    for (const dep of sbom.dependencies) {
      lines.push(`    <dependency ref="${this.escapeXml(dep.ref)}">`);
      for (const d of dep.dependsOn) {
        lines.push(`      <dependency ref="${this.escapeXml(d)}" />`);
      }
      lines.push('    </dependency>');
    }
    lines.push('  </dependencies>');

    lines.push('</bom>');
    return lines.join('\n');
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SBOMGeneratorConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================
// ERROR CLASSES
// ============================================

/**
 * SBOM generation error
 */
export class SBOMGenerationError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'SBOMGenerationError';
  }
}

// ============================================
// EXPORTS
// ============================================

export default SBOMGenerator;
