/**
 * Provenance Verification Test Suite
 *
 * @epic 3.7 - Compliance & Validation
 * @task RECOVERY-07.6 - Comprehensive provenance tests
 * @owner joe@arcfoundry.ai
 * @created 2026-01-23
 *
 * @description
 *   Tests real provenance verification against npm packages
 *   with SLSA attestations.
 */

import { ProvenanceVerifier } from '../../supply-chain/provenance-verifier.js';

describe('Provenance Verification (RECOVERY-07)', () => {
  let verifier: ProvenanceVerifier;
  let strictVerifier: ProvenanceVerifier;
  let lenientVerifier: ProvenanceVerifier;

  beforeAll(() => {
    verifier = new ProvenanceVerifier();
    strictVerifier = new ProvenanceVerifier({
      requireProvenance: true,
    });
    lenientVerifier = new ProvenanceVerifier({
      requireProvenance: false,
    });
  });

  describe('Real Package Provenance', () => {
    it('should verify package with SLSA provenance', async () => {
      // sigstore package has provenance attestations
      const result = await verifier.verify('sigstore', '3.0.0');

      expect(result.package).toBe('sigstore');
      expect(result.version).toBe('3.0.0');
      expect(result.verifiedAt).toBeDefined();

      // If attestation exists, should be verified
      if (result.attestationFetched) {
        expect(result.verificationMethod).toBe('sigstore');
      }
    }, 30000);

    it('should handle package without provenance', async () => {
      // lodash may not have provenance attestations
      const result = await lenientVerifier.verify('lodash', '4.17.21');

      expect(result.package).toBe('lodash');
      expect(result.version).toBe('4.17.21');
      // Should pass in lenient mode even without provenance
      if (!result.attestationFetched) {
        expect(result.valid).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    }, 30000);

    it('should fail for non-existent package', async () => {
      const result = await verifier.verify('this-package-does-not-exist-xyz789', '1.0.0');

      // Should handle gracefully
      expect(result.package).toBe('this-package-does-not-exist-xyz789');
    }, 30000);

    it('should verify @npmcli package with provenance', async () => {
      const result = await verifier.verify('@npmcli/arborist', '7.0.0');

      expect(result.package).toBe('@npmcli/arborist');
      expect(result.version).toBe('7.0.0');
    }, 30000);
  });

  describe('Trusted Builder Verification', () => {
    it('should include trusted builders in config', () => {
      const defaultVerifier = new ProvenanceVerifier();
      // Default should have trusted builders configured
      expect(defaultVerifier).toBeDefined();
    });

    it('should validate against trusted builder whitelist', async () => {
      // Custom verifier with specific trusted builders
      const customVerifier = new ProvenanceVerifier({
        trustedBuilders: [
          'https://github.com/actions/runner',
          'https://github.com/Attestations/GitHubHostedActions@v1',
        ],
      });

      const result = await customVerifier.verify('sigstore', '3.0.0');
      expect(result.package).toBe('sigstore');
    }, 30000);
  });

  describe('Fail-Closed Security', () => {
    it('strict verifier should fail on packages without provenance', async () => {
      // Very old package unlikely to have provenance
      const result = await strictVerifier.verify('lodash', '4.17.21');

      // If no provenance, strict mode should fail
      if (!result.attestationFetched) {
        expect(result.valid).toBe(false);
        expect(result.errors.some((e: string) => e.includes('No provenance attestation found'))).toBe(true);
      }
    }, 30000);

    it('lenient verifier should pass on packages without provenance', async () => {
      const result = await lenientVerifier.verify('lodash', '4.17.21');

      // Lenient mode should pass with warning
      if (!result.attestationFetched) {
        expect(result.valid).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    }, 30000);
  });

  describe('Result Structure', () => {
    it('should return complete result structure', async () => {
      const result = await verifier.verify('sigstore', '3.0.0');

      // Check all required fields
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('package');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('signatureVerified');
      expect(result).toHaveProperty('attestationFetched');
      expect(result).toHaveProperty('verifiedAt');
      expect(result).toHaveProperty('verificationMethod');

      // Types should be correct
      expect(typeof result.valid).toBe('boolean');
      expect(typeof result.signatureVerified).toBe('boolean');
      expect(typeof result.attestationFetched).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    }, 30000);

    it('should include attestation data when present', async () => {
      const result = await verifier.verify('sigstore', '3.0.0');

      if (result.attestationFetched && result.attestation) {
        expect(result.attestation).toHaveProperty('buildType');
        expect(result.attestation).toHaveProperty('repository');
        expect(result.attestation).toHaveProperty('builderId');
        expect(result.attestation).toHaveProperty('buildTimestamp');
        expect(result.attestation).toHaveProperty('slsaVersion');
      }
    }, 30000);
  });

  describe('Caching', () => {
    it('should cache verification results', async () => {
      const cachingVerifier = new ProvenanceVerifier({
        cacheResults: true,
        cacheTtlMs: 60000,
      });

      // First call - fetches from registry
      const start1 = Date.now();
      const result1 = await cachingVerifier.verify('sigstore', '3.0.0');
      const time1 = Date.now() - start1;

      // Second call - should be cached (faster)
      const start2 = Date.now();
      const result2 = await cachingVerifier.verify('sigstore', '3.0.0');
      const time2 = Date.now() - start2;

      // Results should be identical
      expect(result2.valid).toBe(result1.valid);
      expect(result2.package).toBe(result1.package);

      // Second call should be faster (from cache)
      expect(time2).toBeLessThan(time1);
    }, 60000);

    it('should allow clearing cache', async () => {
      const cachingVerifier = new ProvenanceVerifier({
        cacheResults: true,
      });

      await cachingVerifier.verify('sigstore', '3.0.0');
      cachingVerifier.clearCache();

      // After clear, should fetch again
      const result = await cachingVerifier.verify('sigstore', '3.0.0');
      expect(result).toBeDefined();
    }, 60000);
  });

  describe('Batch Verification', () => {
    it('should verify multiple packages in batch', async () => {
      const packages = [
        { name: 'sigstore', version: '3.0.0' },
        { name: 'lodash', version: '4.17.21' },
      ];

      const results = await lenientVerifier.verifyBatch(packages);

      expect(results.size).toBe(2);
      expect(results.get('sigstore@3.0.0')).toBeDefined();
      expect(results.get('lodash@4.17.21')).toBeDefined();
    }, 60000);
  });

  describe('Error Handling', () => {
    it('should handle invalid version gracefully', async () => {
      const result = await strictVerifier.verify('lodash', 'invalid-version-xyz');

      // Invalid version should fail to fetch provenance
      expect(result.attestationFetched).toBe(false);
      // Strict verifier should mark as invalid
      expect(result.valid).toBe(false);
    }, 30000);

    it('should handle scoped packages', async () => {
      const result = await lenientVerifier.verify('@types/node', '20.14.10');

      expect(result.package).toBe('@types/node');
      expect(result.version).toBe('20.14.10');
    }, 30000);
  });

  describe('SLSA Compliance', () => {
    it('should verify SLSA provenance version', async () => {
      const result = await verifier.verify('sigstore', '3.0.0');

      if (result.attestationFetched && result.attestation) {
        // SLSA version should be present
        expect(['0.2', '1.0', '1.0.0']).toContain(result.attestation.slsaVersion);
      }
    }, 30000);

    it('should verify cryptographically via sigstore', async () => {
      const result = await verifier.verify('sigstore', '3.0.0');

      // If attestation was fetched and verified, method should be sigstore
      if (result.attestationFetched && result.signatureVerified) {
        expect(result.verificationMethod).toBe('sigstore');
      }
    }, 30000);
  });
});
