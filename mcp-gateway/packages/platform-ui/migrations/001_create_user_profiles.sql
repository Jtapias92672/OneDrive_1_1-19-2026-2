-- Epic 15: Persona Foundation
-- Migration: Create user_profiles table
-- Based on ForgeUserProfile interface

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY,
  persona_type VARCHAR(20) NOT NULL DEFAULT 'unclassified',
  industry VARCHAR(50),
  role VARCHAR(100),
  team_size VARCHAR(20),
  ai_experience_level INTEGER DEFAULT 1 CHECK (ai_experience_level BETWEEN 1 AND 5),
  ai_usage_frequency VARCHAR(20) DEFAULT 'rarely',
  primary_use_cases JSONB DEFAULT '[]',
  compliance JSONB,
  completed_modules JSONB DEFAULT '[]',
  current_module JSONB,
  skill_scores JSONB DEFAULT '{}',
  task_success_rate DECIMAL(5,4) DEFAULT 0,
  avg_iterations_to_success DECIMAL(6,2) DEFAULT 0,
  total_tasks_completed INTEGER DEFAULT 0,
  total_time_in_platform INTEGER DEFAULT 0,
  dashboard_preferences JSONB DEFAULT '{}',
  notification_preferences JSONB DEFAULT '{
    "email": {
      "enabled": true,
      "frequency": "daily",
      "types": ["task_complete", "task_failed"]
    },
    "inApp": {
      "enabled": true,
      "showProgressiveProfiling": true,
      "showTips": true,
      "showCelebrations": true
    }
  }',
  interface_complexity VARCHAR(20) DEFAULT 'standard',
  onboarding JSONB DEFAULT '{
    "responses": [],
    "classifiedPersona": "unclassified",
    "classificationConfidence": 0,
    "timeToComplete": 0
  }',
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

-- Index for dashboard routing queries
CREATE INDEX idx_profiles_persona ON user_profiles(persona_type);

-- Index for activity tracking
CREATE INDEX idx_profiles_last_active ON user_profiles(last_active_at);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
