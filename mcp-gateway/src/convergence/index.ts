/**
 * FORGE MCP Gateway - Convergence Engine Module
 *
 * ============================================================================
 * WARNING: SIMULATION FRAMEWORK - NOT FOR PRODUCTION
 * ============================================================================
 * This module is part of the Convergence Engine simulation framework.
 * Coordination patterns are SIMULATED for testing, demos, and development.
 * See src/convergence/README.md for details and production requirements.
 * ============================================================================
 *
 * @epic Epic 04 - Convergence Engine
 * @description Multi-agent convergence and coordination system.
 *
 * Features:
 * - Convergence orchestration engine
 * - State synchronization with vector clocks
 * - Conflict detection and resolution
 * - Agent handoff protocols
 * - Multiple coordination patterns:
 *   - Leader-Follower
 *   - Consensus
 *   - Pipeline
 *   - Parallel-Merge
 *   - Competitive
 *   - Hierarchical
 *   - Reactive
 * - Prometheus metrics for monitoring
 * - CARS integration for risk assessment
 * - Audit logging for compliance
 */

// Types
export * from './types.js';

// Core Engine
export { ConvergenceEngine, convergenceEngine } from './convergence-engine.js';

// State Synchronization
export { StateSynchronizer, stateSynchronizer, type SynchronizerConfig } from './state-synchronizer.js';

// Conflict Resolution
export {
  ConflictResolver,
  conflictResolver,
  type ConflictResolverConfig,
  type VoteRequest,
  type Vote,
} from './conflict-resolver.js';

// Handoff Protocol
export {
  HandoffProtocol,
  handoffProtocol,
  type HandoffConfig,
  type AgentCapability,
} from './handoff-protocol.js';

// Coordination Patterns
export {
  CoordinationPatterns,
  coordinationPatterns,
  type PatternConfig,
  type PatternResult,
  type LeaderElectionResult,
  type ConsensusResult,
  type PipelineStage,
  type MergeResult,
} from './coordination-patterns.js';

// Metrics
export * from './convergence-metrics.js';
