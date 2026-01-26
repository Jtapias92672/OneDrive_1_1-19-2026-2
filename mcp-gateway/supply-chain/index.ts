/**
 * MCP Security Gateway - Supply Chain Module
 *
 * @epic 3.7 - Compliance & Validation
 * @task 3.7.1-3.7.3 - Supply Chain Verification
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Supply chain security module exports.
 *   Provides npm provenance verification, SBOM generation, and signature verification.
 *
 * @compliance
 *   - Executive Order 14028: SBOM requirements
 *   - SOC 2 Type II: Supply chain integrity
 *   - SLSA Level 3: Provenance and signatures
 */

// ============================================
// PROVENANCE VERIFICATION
// ============================================

export {
  ProvenanceVerifier,
  ProvenanceError,
  type ProvenanceAttestation,
  type ProvenanceResult,
  type ProvenanceVerifierConfig,
} from './provenance-verifier.js';

// ============================================
// SBOM GENERATION
// ============================================

export {
  SBOMGenerator,
  SBOMGenerationError,
  type CycloneDXSBOM,
  type SBOMMetadata,
  type SBOMTool,
  type SBOMComponent,
  type SBOMDependency,
  type SBOMComposition,
  type SBOMVulnerability,
  type SBOMSupplier,
  type SBOMAuthor,
  type SBOMGeneratorConfig,
} from './sbom-generator.js';

// ============================================
// SIGNATURE VERIFICATION
// ============================================

export {
  SignatureVerifier,
  SignatureVerificationError,
  type SignatureResult,
  type SignatureDetails,
  type SigstoreBundle,
  type SignatureVerifierConfig,
} from './signature-verifier.js';

// ============================================
// UNIFIED VERIFIER
// ============================================

import { ProvenanceVerifier, ProvenanceResult } from './provenance-verifier.js';
import { SBOMGenerator, CycloneDXSBOM } from './sbom-generator.js';
import { SignatureVerifier, SignatureResult } from './signature-verifier.js';

/**
 * Unified supply chain verification result
 */
export interface SupplyChainVerificationResult {
  /** Overall verification status */
  verified: boolean;

  /** Package name */
  package: string;

  /** Package version */
  version: string;

  /** Provenance verification result */
  provenance: ProvenanceResult;

  /** Signature verification result */
  signature: SignatureResult;

  /** Combined errors */
  errors: string[];

  /** Combined warnings */
  warnings: string[];

  /** Verification timestamp */
  verifiedAt: string;
}

/**
 * Supply Chain Verifier
 *
 * Unified interface for all supply chain verification operations.
 */
export class SupplyChainVerifier {
  private provenanceVerifier: ProvenanceVerifier;
  private signatureVerifier: SignatureVerifier;
  private sbomGenerator: SBOMGenerator;

  constructor(config?: {
    provenance?: Partial<import('./provenance-verifier.js').ProvenanceVerifierConfig>;
    signature?: Partial<import('./signature-verifier.js').SignatureVerifierConfig>;
    sbom?: Partial<import('./sbom-generator.js').SBOMGeneratorConfig>;
  }) {
    this.provenanceVerifier = new ProvenanceVerifier(config?.provenance);
    this.signatureVerifier = new SignatureVerifier(config?.signature);
    this.sbomGenerator = new SBOMGenerator(config?.sbom);
  }

  /**
   * Verify package supply chain
   */
  async verifyPackage(
    packageName: string,
    version: string
  ): Promise<SupplyChainVerificationResult> {
    const [provenance, signature] = await Promise.all([
      this.provenanceVerifier.verify(packageName, version),
      this.signatureVerifier.verify(packageName, version),
    ]);

    const errors = [...provenance.errors, ...signature.errors];
    const warnings = [...provenance.warnings, ...signature.warnings];

    return {
      verified: provenance.valid && signature.valid,
      package: packageName,
      version,
      provenance,
      signature,
      errors,
      warnings,
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Verify multiple packages
   */
  async verifyPackages(
    packages: Array<{ name: string; version: string }>
  ): Promise<Map<string, SupplyChainVerificationResult>> {
    const results = new Map<string, SupplyChainVerificationResult>();

    for (const pkg of packages) {
      const result = await this.verifyPackage(pkg.name, pkg.version);
      results.set(`${pkg.name}@${pkg.version}`, result);
    }

    return results;
  }

  /**
   * Generate SBOM
   */
  async generateSBOM(packageJsonPath: string): Promise<CycloneDXSBOM> {
    return this.sbomGenerator.generate(packageJsonPath);
  }

  /**
   * Generate SBOM as JSON
   */
  async generateSBOMJSON(packageJsonPath: string): Promise<string> {
    return this.sbomGenerator.generateJSON(packageJsonPath);
  }

  /**
   * Generate SBOM as XML
   */
  async generateSBOMXML(packageJsonPath: string): Promise<string> {
    return this.sbomGenerator.generateXML(packageJsonPath);
  }

  /**
   * Get provenance verifier
   */
  getProvenanceVerifier(): ProvenanceVerifier {
    return this.provenanceVerifier;
  }

  /**
   * Get signature verifier
   */
  getSignatureVerifier(): SignatureVerifier {
    return this.signatureVerifier;
  }

  /**
   * Get SBOM generator
   */
  getSBOMGenerator(): SBOMGenerator {
    return this.sbomGenerator;
  }
}

// ============================================
// DEFAULT EXPORT
// ============================================

export { SupplyChainVerifier as default };
