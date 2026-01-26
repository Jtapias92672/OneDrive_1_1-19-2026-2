/**
 * FORGE Dashboard - Library Exports
 */

// Types
export * from './types';

// Mock Data
export * from './mock-data';

// Progress Parser
export * from '../parsers/progress-parser';

// Token Tracker
export * from '../token-tracker';

// Evidence Parser (only mock function, types are in ./types)
export { getMockEvidencePacksSummary } from '../parsers/evidence-parser';

// API Client (includes real API functions + dashboard data functions)
export * from './api-client';

/**
 * API Endpoint Status:
 *
 * IMPLEMENTED (Real MCP Gateway):
 *   - runAssessment()      POST /api/v1/assess
 *   - getAssessment()      GET  /api/v1/assess/:id
 *   - listAssessments()    GET  /api/v1/assessments
 *   - approveAssessment()  POST /api/v1/approve/:id
 *   - getTenantContext()   GET  /api/v1/tenant/context
 *   - getSystemStats()     GET  /api/v1/stats
 *   - getAuthToken()       POST /api/v1/auth/token
 *   - getCarsStatus()      Uses /assessments + /stats
 *
 * MOCK ONLY (Backend TODO):
 *   - getAgentMemory()     Future: /api/v1/session/memory
 *   - getEvidencePacks()   Future: /api/v1/evidence/packs
 *   - getSupplyChain()     Future: /api/v1/supply-chain/status
 *   - getVerification()    Future: /api/v1/verification/status
 *   - getFiles()           Future: /api/v1/files/active
 *   - getTasks()           Future: /api/v1/tasks
 */
