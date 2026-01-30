-- ============================================
-- FORGE Approval Workflow Database Schema
-- ============================================
--
-- @epic 3.75 - Code Execution
-- @task RECOVERY-02.1 - Design approval database schema
-- @owner joe@arcfoundry.ai
-- @created 2026-01-23
--
-- @description
--   Database schema for human-in-the-loop approval workflow.
--   Supports the CARS (Contextual Autonomy Risk Scoring) approval gate
--   as defined in 12_HUMAN_REVIEW.md success criteria.
--
-- @integration
--   - execution/safe-execute.ts (requestApproval method)
--   - approval/database.ts (ApprovalDatabase class)
--   - approval/api.ts (REST endpoints)
--
-- ============================================

-- ============================================
-- ENUM TYPES
-- ============================================

-- Status of an approval request
-- pending: Awaiting decision from approver
-- approved: Human approved the request
-- denied: Human denied the request
-- expired: Request timed out without decision
-- cancelled: Request was cancelled programmatically
CREATE TYPE approval_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired',
    'cancelled'
);

-- Risk level from CARS assessment
-- Maps to RiskAssessmentSummary.level from execution/types.ts
CREATE TYPE risk_level AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

-- Notification channel types
CREATE TYPE notification_channel AS ENUM (
    'slack',
    'email',
    'webhook',
    'in_app'
);

-- Notification delivery status
CREATE TYPE notification_status AS ENUM (
    'pending',
    'sent',
    'delivered',
    'failed'
);

-- ============================================
-- TABLE: approval_requests
-- ============================================
-- Primary table storing approval requests.
-- One record created each time code execution requires human approval.
-- Maps to CARSApprovalRequest from execution/types.ts

CREATE TABLE approval_requests (
    -- Primary key: UUID for distributed system compatibility
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Request ID from CARS system (links to execution context)
    -- This is the requestId from CARSApprovalRequest
    request_id VARCHAR(64) NOT NULL UNIQUE,

    -- Execution context identifiers
    session_id VARCHAR(64) NOT NULL,      -- Session for correlation
    execution_id VARCHAR(64) NOT NULL,    -- Specific execution instance

    -- What is being approved
    tool_name VARCHAR(255),               -- Tool name if MCP tool execution
    code_snippet TEXT,                    -- Truncated code for review (max 1000 chars)

    -- CARS risk assessment data
    risk_level risk_level NOT NULL,       -- Overall risk level
    risk_score DECIMAL(4,3) NOT NULL,     -- Score 0.000-1.000
    risk_types TEXT[],                    -- Array of detected risk types

    -- Full context as JSONB for extensibility
    -- Contains: options, classification, preAssessedRisk, etc.
    context JSONB NOT NULL DEFAULT '{}',

    -- Request metadata
    requesting_user_id VARCHAR(255),      -- User who triggered the execution
    tenant_id VARCHAR(64) NOT NULL,       -- Multi-tenant isolation

    -- Status tracking
    status approval_status NOT NULL DEFAULT 'pending',

    -- Timing
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,      -- When request times out
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_risk_score CHECK (risk_score >= 0 AND risk_score <= 1),
    CONSTRAINT expires_after_created CHECK (expires_at > created_at)
);

-- Index for fast lookups by request_id (most common query pattern)
CREATE UNIQUE INDEX idx_approval_requests_request_id ON approval_requests(request_id);

-- Index for listing pending approvals (dashboard query)
CREATE INDEX idx_approval_requests_status_tenant ON approval_requests(status, tenant_id)
    WHERE status = 'pending';

-- Index for finding expired requests (cleanup job)
CREATE INDEX idx_approval_requests_expires_at ON approval_requests(expires_at)
    WHERE status = 'pending';

-- Index for session-based queries (debugging, audit)
CREATE INDEX idx_approval_requests_session ON approval_requests(session_id);

-- Index for user-based queries (user's pending approvals)
CREATE INDEX idx_approval_requests_user ON approval_requests(requesting_user_id)
    WHERE status = 'pending';


-- ============================================
-- TABLE: approval_decisions
-- ============================================
-- Records the decision made on an approval request.
-- Maps to CARSApprovalResponse from execution/types.ts
-- One-to-one relationship with approval_requests (one decision per request)

CREATE TABLE approval_decisions (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key to approval_requests
    request_id VARCHAR(64) NOT NULL REFERENCES approval_requests(request_id) ON DELETE CASCADE,

    -- Decision details
    approved BOOLEAN NOT NULL,            -- true = approved, false = denied
    reason TEXT,                          -- Human-provided reason for decision

    -- Who made the decision
    approver_id VARCHAR(255) NOT NULL,    -- User ID of approver
    approver_email VARCHAR(255),          -- Email for audit trail
    approver_name VARCHAR(255),           -- Display name for audit trail

    -- Conditional approval (optional)
    -- Allows approver to add conditions like "approved for this session only"
    conditions JSONB DEFAULT '{}',

    -- Timing
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Response latency tracking (for SLA monitoring)
    response_latency_ms INTEGER,          -- Time from request to decision

    -- Constraints
    CONSTRAINT one_decision_per_request UNIQUE (request_id)
);

-- Index for fast decision lookup by request_id
CREATE INDEX idx_approval_decisions_request ON approval_decisions(request_id);

-- Index for auditing approver activity
CREATE INDEX idx_approval_decisions_approver ON approval_decisions(approver_id, decided_at);


-- ============================================
-- TABLE: approval_notifications
-- ============================================
-- Tracks notifications sent to approvers.
-- Supports multiple notification channels per request.
-- Used for retry logic and delivery confirmation.

CREATE TABLE approval_notifications (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key to approval_requests
    request_id VARCHAR(64) NOT NULL REFERENCES approval_requests(request_id) ON DELETE CASCADE,

    -- Notification target
    approver_id VARCHAR(255) NOT NULL,    -- User ID of intended approver
    channel notification_channel NOT NULL, -- How notification was sent

    -- Channel-specific destination
    destination VARCHAR(500) NOT NULL,     -- Email address, Slack channel ID, webhook URL

    -- Delivery tracking
    status notification_status NOT NULL DEFAULT 'pending',

    -- Timing
    notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,             -- When delivery was confirmed

    -- Retry tracking
    attempt_count INTEGER NOT NULL DEFAULT 1,
    last_error TEXT,                      -- Error message if failed
    next_retry_at TIMESTAMPTZ,            -- When to retry if failed

    -- External reference (for tracking in external systems)
    external_id VARCHAR(255),             -- Slack message TS, email message ID, etc.

    -- Metadata
    metadata JSONB DEFAULT '{}'           -- Channel-specific metadata
);

-- Index for finding notifications by request
CREATE INDEX idx_approval_notifications_request ON approval_notifications(request_id);

-- Index for retry job (find failed notifications to retry)
CREATE INDEX idx_approval_notifications_retry ON approval_notifications(status, next_retry_at)
    WHERE status = 'failed' AND next_retry_at IS NOT NULL;

-- Index for delivery confirmation (webhook callbacks)
CREATE INDEX idx_approval_notifications_external ON approval_notifications(external_id)
    WHERE external_id IS NOT NULL;


-- ============================================
-- TABLE: approval_audit_log
-- ============================================
-- Immutable audit log for compliance and debugging.
-- Records all state changes and access to approval data.

CREATE TABLE approval_audit_log (
    -- Primary key (use BIGSERIAL for high-volume insert performance)
    id BIGSERIAL PRIMARY KEY,

    -- What was affected
    request_id VARCHAR(64) NOT NULL,      -- May reference deleted request

    -- What happened
    action VARCHAR(50) NOT NULL,          -- create, view, approve, deny, expire, etc.

    -- Who did it
    actor_id VARCHAR(255),                -- NULL for system actions
    actor_type VARCHAR(20) NOT NULL,      -- 'user', 'system', 'api'

    -- Details
    old_status approval_status,           -- Previous status (for transitions)
    new_status approval_status,           -- New status (for transitions)
    details JSONB DEFAULT '{}',           -- Additional context

    -- Client info for security audit
    ip_address INET,
    user_agent TEXT,

    -- Timing
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for viewing audit trail for a request
CREATE INDEX idx_approval_audit_request ON approval_audit_log(request_id, created_at);

-- Index for security audit (who did what when)
CREATE INDEX idx_approval_audit_actor ON approval_audit_log(actor_id, created_at);

-- Partition hint: Consider partitioning by created_at for large-scale deployments
-- CREATE TABLE approval_audit_log_y2026m01 PARTITION OF approval_audit_log
--     FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');


-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on approval_requests
CREATE TRIGGER update_approval_requests_updated_at
    BEFORE UPDATE ON approval_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- CLEANUP PROCEDURES
-- ============================================

-- Function to expire pending requests past their deadline
-- Should be called by a scheduled job (cron, pg_cron, etc.)
CREATE OR REPLACE FUNCTION expire_stale_approval_requests()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE approval_requests
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' AND expires_at < NOW();

    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old records (data retention)
-- Keeps records for specified number of days
CREATE OR REPLACE FUNCTION cleanup_old_approval_records(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete audit logs older than retention period
    DELETE FROM approval_audit_log
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

    -- Delete completed approval requests older than retention period
    -- Notifications and decisions cascade delete
    DELETE FROM approval_requests
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
    AND status IN ('approved', 'denied', 'expired', 'cancelled');

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE approval_requests IS
    'Primary table for CARS approval requests. Each record represents a code execution that requires human approval.';

COMMENT ON TABLE approval_decisions IS
    'Records human decisions on approval requests. One-to-one with approval_requests.';

COMMENT ON TABLE approval_notifications IS
    'Tracks notifications sent to approvers via various channels. Supports retry logic.';

COMMENT ON TABLE approval_audit_log IS
    'Immutable audit trail for compliance. Records all state changes and access.';

COMMENT ON COLUMN approval_requests.context IS
    'JSONB containing full execution context: options, classification, preAssessedRisk, metadata';

COMMENT ON COLUMN approval_decisions.conditions IS
    'Optional conditions attached to approval: {"session_only": true, "max_executions": 5}';


-- ============================================
-- SAMPLE QUERIES
-- ============================================

-- Get pending approvals for a tenant (dashboard)
-- SELECT * FROM approval_requests WHERE status = 'pending' AND tenant_id = $1 ORDER BY created_at DESC;

-- Get approval with decision
-- SELECT r.*, d.approved, d.reason, d.approver_id, d.decided_at
-- FROM approval_requests r
-- LEFT JOIN approval_decisions d ON r.request_id = d.request_id
-- WHERE r.request_id = $1;

-- Get recent approvals by user
-- SELECT r.*, d.decided_at, d.reason
-- FROM approval_requests r
-- JOIN approval_decisions d ON r.request_id = d.request_id
-- WHERE d.approver_id = $1
-- ORDER BY d.decided_at DESC LIMIT 50;
