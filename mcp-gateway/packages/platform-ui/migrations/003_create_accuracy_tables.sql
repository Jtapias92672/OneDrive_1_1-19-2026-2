-- Epic 14: Computational Accuracy Layer
-- Migration: 003_create_accuracy_tables.sql

-- Claim Validations
CREATE TABLE IF NOT EXISTS claim_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id VARCHAR(100),
  claim_text TEXT NOT NULL,
  claim_category VARCHAR(50) NOT NULL,
  claim_context TEXT,

  validation_tier INTEGER NOT NULL,
  validation_source VARCHAR(50),
  status VARCHAR(20) NOT NULL,
  confidence_score INTEGER,

  wolfram_query TEXT,
  wolfram_response JSONB,
  wolfram_cost DECIMAL(10,6),

  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validations_content ON claim_validations(content_id);
CREATE INDEX IF NOT EXISTS idx_validations_category ON claim_validations(claim_category);

-- Frontier Map Data
CREATE TABLE IF NOT EXISTS frontier_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type VARCHAR(100) NOT NULL UNIQUE,
  zone VARCHAR(20) NOT NULL,
  accuracy_rate DECIMAL(5,2),
  sample_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- User Calibration
CREATE TABLE IF NOT EXISTS user_calibration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  task_id VARCHAR(100),
  predicted_confidence INTEGER,
  predicted_outcome VARCHAR(20),
  actual_outcome VARCHAR(20),
  actual_confidence INTEGER,
  prediction_accurate BOOLEAN,
  calibration_error INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calibration_user ON user_calibration(user_id);
CREATE INDEX IF NOT EXISTS idx_calibration_date ON user_calibration(created_at);
