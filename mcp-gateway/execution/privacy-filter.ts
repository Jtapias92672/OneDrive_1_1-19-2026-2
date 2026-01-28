/**
 * MCP Gateway - Privacy Filter
 *
 * @epic 3.75 - Code Execution
 * @task 3.75.2.2 - Implement privacy filter
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Filter sensitive information from outputs.
 *   Aligned with:
 *   - 09_DATA_PROTECTION § DP-01 (PII detection)
 *   - 09_DATA_PROTECTION § DP-09 (≥99% PII recall)
 *   - 09_DATA_PROTECTION § DP-10 (100% secret recall)
 *   - 09_DATA_PROTECTION § DP-07 (redaction <50ms)
 */

import { PrivacyRule, FilterResult, PrivacyDetection } from './types.js';

// ============================================
// STANDARD PII PATTERNS (FROM 09_DATA_PROTECTION)
// ============================================

const PII_PATTERNS: PrivacyRule[] = [
  // Email addresses
  {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[REDACTED_EMAIL]',
    category: 'email',
    type: 'pii',
    riskScore: 0.4,
  },

  // US Phone numbers (various formats)
  {
    pattern: /\b(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: '[REDACTED_PHONE]',
    category: 'phone_us',
    type: 'pii',
    riskScore: 0.5,
  },

  // International phone numbers (with separators)
  {
    pattern: /\b\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/g,
    replacement: '[REDACTED_PHONE_INTL]',
    category: 'phone_international',
    type: 'pii',
    riskScore: 0.5,
  },

  // E.164 format phones (compact international: +14155551234)
  {
    pattern: /\+[1-9]\d{9,14}\b/g,
    replacement: '[REDACTED_PHONE_E164]',
    category: 'phone_e164',
    type: 'pii',
    riskScore: 0.5,
  },

  // 00-prefix international phones (European style: 0044207123456)
  {
    pattern: /\b00[1-9]\d{8,13}\b/g,
    replacement: '[REDACTED_PHONE_00PREFIX]',
    category: 'phone_00prefix',
    type: 'pii',
    riskScore: 0.5,
  },

  // UK phone numbers (020 7123 4567, 07700 900123, 0161-234-5678)
  {
    pattern: /\b0[1-9]\d{1,4}[-\s]?\d{3,4}[-\s]?\d{3,4}\b/g,
    replacement: '[REDACTED_PHONE_UK]',
    category: 'phone_uk',
    type: 'pii',
    riskScore: 0.5,
  },

  // Social Security Numbers
  {
    pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    replacement: '[REDACTED_SSN]',
    category: 'ssn',
    type: 'pii',
    riskScore: 0.9,
  },

  // HICN (Health Insurance Claim Number) - SSN + suffix letter(s)
  {
    pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}[A-Z]{1,2}\b/g,
    replacement: '[REDACTED_HICN]',
    category: 'hicn',
    type: 'pii',
    riskScore: 0.9,
  },

  // NPI (National Provider Identifier) - 10 digits with context
  {
    pattern: /\b(?:NPI|National\s+Provider\s+(?:ID|Identifier)?|Provider\s+(?:NPI|ID))\s*[:=#]?\s*\d{10}\b/gi,
    replacement: '[REDACTED_NPI]',
    category: 'healthcare',
    type: 'pii',
    riskScore: 0.7,
  },

  // Medical Record Number (MRN) with context
  {
    pattern: /\b(?:MRN|mrn|medical[_\s-]?record[_\s-]?(?:number|num|no)?|patient[_\s-]?(?:id|ID)|chart|Hospital\s+ID|Clinic\s+patient|Lab\s+specimen)\s*[:=#]?\s*[A-Z0-9]{5,12}\b/gi,
    replacement: '[REDACTED_MRN]',
    category: 'healthcare',
    type: 'pii',
    riskScore: 0.8,
  },

  // DEA Number (2 letters + 7 digits)
  {
    pattern: /\b(?:DEA[_\s-]?(?:Number|No)?)\s*[:=#]?\s*[A-Z]{2}\d{7}\b/gi,
    replacement: '[REDACTED_DEA]',
    category: 'healthcare',
    type: 'pii',
    riskScore: 0.8,
  },

  // DEA Number without context (2 letters + 7 digits)
  {
    pattern: /\b[A-Z]{2}\d{7}\b/g,
    replacement: '[REDACTED_DEA]',
    category: 'healthcare',
    type: 'pii',
    riskScore: 0.8,
  },

  // Medicare Beneficiary Identifier (MBI) - format: 1A23B45CD67
  {
    pattern: /\b(?:MBI|Medicare[_\s-]?(?:ID|Beneficiary))\s*[:=#]?\s*\d[A-Z]\d{2}[A-Z]\d{2}[A-Z]{2}\d{2}\b/gi,
    replacement: '[REDACTED_MBI]',
    category: 'healthcare',
    type: 'pii',
    riskScore: 0.8,
  },

  // MBI format without context
  {
    pattern: /\b\d[A-Z]\d{2}[A-Z]\d{2}[A-Z]{2}\d{2}\b/g,
    replacement: '[REDACTED_MBI]',
    category: 'healthcare',
    type: 'pii',
    riskScore: 0.8,
  },

  // Insurance/Subscriber ID with context
  {
    pattern: /\b(?:Insurance[_\s-]?member|Subscriber[_\s-]?ID|Group[_\s-]?policy)\s*[:=#]?\s*\d{10}\b/gi,
    replacement: '[REDACTED_INSURANCE_ID]',
    category: 'healthcare',
    type: 'pii',
    riskScore: 0.7,
  },

  // Credit card numbers (various formats)
  {
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    replacement: '[REDACTED_CC]',
    category: 'credit_card',
    type: 'pii',
    riskScore: 0.9,
  },

  // IP addresses (IPv4)
  {
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    replacement: '[REDACTED_IP]',
    category: 'ip_address',
    type: 'pii',
    riskScore: 0.3,
  },

  // MAC addresses
  {
    pattern: /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g,
    replacement: '[REDACTED_MAC]',
    category: 'mac_address',
    type: 'pii',
    riskScore: 0.3,
  },

  // Passport numbers (US format)
  {
    pattern: /\b[A-Z]\d{8}\b/g,
    replacement: '[REDACTED_PASSPORT]',
    category: 'passport',
    type: 'pii',
    riskScore: 0.8,
  },

  // Canadian passports (2 letters + 6 digits)
  {
    pattern: /\b[A-Z]{2}\d{6}\b/g,
    replacement: '[REDACTED_PASSPORT_CA]',
    category: 'passport',
    type: 'pii',
    riskScore: 0.8,
  },

  // Passport with context keyword
  {
    pattern: /\b(?:passport|passport[#_\s-]?(?:number|no|num)?)\s*[:=#]?\s*[A-Z0-9]{6,12}\b/gi,
    replacement: '[REDACTED_PASSPORT]',
    category: 'passport',
    type: 'pii',
    riskScore: 0.8,
  },

  // Driver's license (generic pattern)
  {
    pattern: /\b[A-Z]{1,2}\d{6,8}\b/g,
    replacement: '[REDACTED_DL]',
    category: 'drivers_license',
    type: 'pii',
    riskScore: 0.7,
  },

  // Bank account numbers (generic)
  {
    pattern: /\b\d{8,17}\b/g,
    replacement: '[REDACTED_ACCOUNT]',
    category: 'bank_account',
    type: 'pii',
    riskScore: 0.6,
  },

  // Date of birth patterns
  {
    pattern: /\b(?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])[-/](?:19|20)\d{2}\b/g,
    replacement: '[REDACTED_DOB]',
    category: 'date_of_birth',
    type: 'pii',
    riskScore: 0.5,
  },

  // Address patterns (street number + street name)
  {
    pattern: /\b\d{1,5}\s+(?:[A-Za-z]+\s+){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Circle|Cir|Way|Place|Pl)\b/gi,
    replacement: '[REDACTED_ADDRESS]',
    category: 'street_address',
    type: 'pii',
    riskScore: 0.5,
  },

  // ZIP codes (US)
  {
    pattern: /\b\d{5}(?:-\d{4})?\b/g,
    replacement: '[REDACTED_ZIP]',
    category: 'zip_code',
    type: 'pii',
    riskScore: 0.2,
  },

  // Student ID with context (student_id, SID, UIN, CWID, Net ID, Banner ID, University ID)
  {
    pattern: /\b(?:student[_\s-]?id|SID|UIN|CWID|Net[_\s-]?ID|Banner[_\s-]?ID|University[_\s-]?ID|Registrar[_\s-]?student[_\s-]?ID|student[_\s-]?enrollment)\s*[:=#]?\s*[A-Z0-9]{6,12}\b/gi,
    replacement: '[REDACTED_STUDENT_ID]',
    category: 'student',
    type: 'pii',
    riskScore: 0.6,
  },

  // FAFSA/Financial Aid ID with context
  {
    pattern: /\b(?:FAFSA[_\s-]?(?:id|ID)?|Student[_\s-]?Aid[_\s-]?(?:Number|ID)?|Financial[_\s-]?Aid[_\s-]?ID|fafsa_id|SAR[_\s-]?number)\s*[:=#]?\s*\d{10}\b/gi,
    replacement: '[REDACTED_FAFSA_ID]',
    category: 'student',
    type: 'pii',
    riskScore: 0.7,
  },

  // Education record references
  {
    pattern: /\b(?:Transcript|Grade|Enrollment|GPA|Credits|Academic[_\s-]?record|Degree[_\s-]?audit|Course[_\s-]?roster[_\s-]?ID)\s+(?:for\s+)?(?:student|of\s+ID|ID)?\s*[:=#]?\s*[A-Z0-9]{6,12}\b/gi,
    replacement: '[REDACTED_EDUCATION_RECORD]',
    category: 'student',
    type: 'pii',
    riskScore: 0.6,
  },

  // Vehicle Identification Numbers (VIN) - 17 characters
  {
    pattern: /\b[A-HJ-NPR-Z0-9]{17}\b/g,
    replacement: '[REDACTED_VIN]',
    category: 'vehicle',
    type: 'pii',
    riskScore: 0.5,
  },

  // VIN with context keyword
  {
    pattern: /\b(?:VIN|vehicle[_\s-]?(?:identification[_\s-]?)?(?:number|id)?)\s*[:=#]?\s*[A-HJ-NPR-Z0-9]{15,17}\b/gi,
    replacement: '[REDACTED_VIN]',
    category: 'vehicle',
    type: 'pii',
    riskScore: 0.5,
  },

  // License plates with context
  {
    pattern: /\b(?:license[_\s-]?plate|plate[_\s-]?(?:number|no)?|registration|tag)\s*[:=#]?\s*[A-Z0-9]{4,8}\b/gi,
    replacement: '[REDACTED_LICENSE_PLATE]',
    category: 'vehicle',
    type: 'pii',
    riskScore: 0.4,
  },
];

// ============================================
// SECRET PATTERNS (FROM 09_DATA_PROTECTION)
// 100% recall required - MUST BLOCK
// ============================================

const SECRET_PATTERNS: PrivacyRule[] = [
  // ============================================
  // AWS CREDENTIALS
  // ============================================

  // AWS Access Key ID (all prefixes) - flexible length to catch variations
  {
    pattern: /\b(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{12,20}\b/g,
    replacement: '[BLOCKED_AWS_KEY]',
    category: 'aws_access_key',
    type: 'secret',
    riskScore: 1.0,
  },

  // AWS Secret Access Key (context-aware) - flexible length
  {
    pattern: /\b(?:aws[_-]?secret[_-]?(?:access[_-]?)?key|secret[_-]?access[_-]?key|secretAccessKey|AWS_SECRET_ACCESS_KEY)\s*[=:]\s*['"]?([A-Za-z0-9/+=]{30,50})['"]?/gi,
    replacement: '[BLOCKED_AWS_SECRET]',
    category: 'aws_secret_key',
    type: 'secret',
    riskScore: 1.0,
  },

  // AWS Secret (simplified context - matches aws_secret = 'value')
  {
    pattern: /\b(?:aws_secret|secret_access_key)\s*[=:]\s*['"]?([A-Za-z0-9/+=]{30,50})['"]?/gi,
    replacement: '[BLOCKED_AWS_SECRET]',
    category: 'aws_secret_key',
    type: 'secret',
    riskScore: 1.0,
  },

  // ============================================
  // CLOUD PROVIDER TOKENS
  // ============================================

  // Hugging Face tokens - min 30 chars (some tokens are shorter)
  {
    pattern: /\bhf_[A-Za-z0-9]{30,}\b/g,
    replacement: '[BLOCKED_HUGGINGFACE_TOKEN]',
    category: 'huggingface_token',
    type: 'secret',
    riskScore: 1.0,
  },

  // Azure SAS tokens
  {
    pattern: /[?&]sv=\d{4}-\d{2}-\d{2}&[^"'\s]*sig=[A-Za-z0-9%/+=]+/g,
    replacement: '[BLOCKED_AZURE_SAS]',
    category: 'azure_sas_token',
    type: 'secret',
    riskScore: 1.0,
  },

  // Azure Storage connection strings - flexible key length
  {
    pattern: /DefaultEndpointsProtocol=https?;AccountName=[^;]+;AccountKey=[A-Za-z0-9+/=]{40,100}=*;?/g,
    replacement: '[BLOCKED_AZURE_CONNECTION]',
    category: 'azure_connection_string',
    type: 'secret',
    riskScore: 1.0,
  },

  // Azure Service Bus connection strings - flexible key length
  {
    pattern: /Endpoint=sb:\/\/[^;]+;SharedAccessKeyName=[^;]+;SharedAccessKey=[A-Za-z0-9+/=]{30,60}=*/g,
    replacement: '[BLOCKED_AZURE_SERVICEBUS]',
    category: 'azure_servicebus_connection',
    type: 'secret',
    riskScore: 1.0,
  },

  // Google API keys - flexible length (32-40 chars after AIza)
  {
    pattern: /\bAIza[0-9A-Za-z_-]{32,42}\b/g,
    replacement: '[BLOCKED_GOOGLE_KEY]',
    category: 'google_api_key',
    type: 'secret',
    riskScore: 1.0,
  },

  // ============================================
  // VCS TOKENS (GitHub, GitLab, Bitbucket)
  // ============================================

  // GitHub classic tokens - flexible length (min 30)
  {
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/g,
    replacement: '[BLOCKED_GITHUB_TOKEN]',
    category: 'github_token',
    type: 'secret',
    riskScore: 1.0,
  },

  // GitHub fine-grained PAT - flexible format
  {
    pattern: /\bgithub_pat_[A-Za-z0-9]{8,30}_[A-Za-z0-9]{40,70}\b/g,
    replacement: '[BLOCKED_GITHUB_PAT]',
    category: 'github_pat_fine_grained',
    type: 'secret',
    riskScore: 1.0,
  },

  // GitLab Personal Access Token
  {
    pattern: /\bglpat-[A-Za-z0-9_-]{20,}\b/g,
    replacement: '[BLOCKED_GITLAB_PAT]',
    category: 'gitlab_pat',
    type: 'secret',
    riskScore: 1.0,
  },

  // GitLab CI Token
  {
    pattern: /\bglcbt-[A-Za-z0-9_-]{20,}\b/g,
    replacement: '[BLOCKED_GITLAB_CI]',
    category: 'gitlab_ci_token',
    type: 'secret',
    riskScore: 1.0,
  },

  // GitLab Pipeline Trigger Token
  {
    pattern: /\bglptt-[A-Za-z0-9_-]{20,}\b/g,
    replacement: '[BLOCKED_GITLAB_TRIGGER]',
    category: 'gitlab_trigger_token',
    type: 'secret',
    riskScore: 1.0,
  },

  // Bitbucket/Atlassian tokens
  {
    pattern: /\b(?:bitbucket[_-]?(?:app[_-]?)?password|atlassian[_-]?(?:token|app[_-]?secret))\s*[=:]\s*['"]?([A-Za-z0-9_-]{20,})['"]?/gi,
    replacement: '[BLOCKED_BITBUCKET_TOKEN]',
    category: 'bitbucket_app_password',
    type: 'secret',
    riskScore: 1.0,
  },

  // ============================================
  // COMMUNICATION PLATFORM TOKENS
  // ============================================

  // Slack webhooks
  {
    pattern: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/g,
    replacement: '[BLOCKED_SLACK_WEBHOOK]',
    category: 'slack_webhook',
    type: 'secret',
    riskScore: 1.0,
  },

  // Slack bot tokens
  {
    pattern: /\bxoxb-[0-9]+-[0-9]+-[A-Za-z0-9]+\b/g,
    replacement: '[BLOCKED_SLACK_BOT]',
    category: 'slack_bot_token',
    type: 'secret',
    riskScore: 1.0,
  },

  // Slack user tokens
  {
    pattern: /\bxoxp-[0-9]+-[0-9]+-[0-9]+-[A-Fa-f0-9]+\b/g,
    replacement: '[BLOCKED_SLACK_USER]',
    category: 'slack_user_token',
    type: 'secret',
    riskScore: 1.0,
  },

  // Discord bot tokens
  {
    pattern: /\b[MN][A-Za-z0-9]{23,}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}\b/g,
    replacement: '[BLOCKED_DISCORD_BOT]',
    category: 'discord_bot_token',
    type: 'secret',
    riskScore: 1.0,
  },

  // Discord webhooks
  {
    pattern: /https:\/\/(?:discord|discordapp)\.com\/api\/webhooks\/[0-9]+\/[A-Za-z0-9_-]+/g,
    replacement: '[BLOCKED_DISCORD_WEBHOOK]',
    category: 'discord_webhook',
    type: 'secret',
    riskScore: 1.0,
  },

  // Microsoft Teams webhooks
  {
    pattern: /https:\/\/[a-z0-9]+\.webhook\.office\.com\/webhookb2\/[a-f0-9-]+@[a-f0-9-]+\/IncomingWebhook\/[a-z0-9]+\/[a-f0-9-]+/gi,
    replacement: '[BLOCKED_TEAMS_WEBHOOK]',
    category: 'teams_webhook',
    type: 'secret',
    riskScore: 1.0,
  },

  // ============================================
  // SERVICE API KEYS
  // ============================================

  // Twilio API Key (starts with SK) - allow alphanumeric, flexible length
  {
    pattern: /\bSK[A-Za-z0-9]{28,36}\b/g,
    replacement: '[BLOCKED_TWILIO_KEY]',
    category: 'twilio_api_key',
    type: 'secret',
    riskScore: 1.0,
  },

  // Twilio Account SID (starts with AC) - allow alphanumeric, flexible length
  {
    pattern: /\bAC[A-Za-z0-9]{28,36}\b/g,
    replacement: '[BLOCKED_TWILIO_SID]',
    category: 'twilio_account_sid',
    type: 'secret',
    riskScore: 1.0,
  },

  // SendGrid API keys - flexible part lengths
  {
    pattern: /\bSG\.[A-Za-z0-9_-]{16,30}\.[A-Za-z0-9_-]{30,60}\b/g,
    replacement: '[BLOCKED_SENDGRID_KEY]',
    category: 'sendgrid_api_key',
    type: 'secret',
    riskScore: 1.0,
  },

  // Mailchimp API keys
  {
    pattern: /\b[a-f0-9]{32}-us[0-9]{1,2}\b/g,
    replacement: '[BLOCKED_MAILCHIMP_KEY]',
    category: 'mailchimp_api_key',
    type: 'secret',
    riskScore: 1.0,
  },

  // Stripe API keys
  {
    pattern: /\b(?:sk|pk)_(?:test|live)_[0-9a-zA-Z]{24,}\b/g,
    replacement: '[BLOCKED_STRIPE_KEY]',
    category: 'stripe_api_key',
    type: 'secret',
    riskScore: 1.0,
  },

  // PayPal access tokens
  {
    pattern: /\baccess_token\$production\$[a-z0-9]+\$[a-z0-9]+\b/gi,
    replacement: '[BLOCKED_PAYPAL_TOKEN]',
    category: 'paypal_access_token',
    type: 'secret',
    riskScore: 1.0,
  },

  // Datadog API keys
  {
    pattern: /\b(?:datadog[_-]?api[_-]?key|dd[_-]?(?:api[_-]?)?key)\s*[=:]\s*['"]?([a-f0-9]{32})['"]?/gi,
    replacement: '[BLOCKED_DATADOG_KEY]',
    category: 'datadog_api_key',
    type: 'secret',
    riskScore: 1.0,
  },

  // New Relic API keys - flexible length
  {
    pattern: /\bNRAK-[A-Z0-9]{24,32}\b/g,
    replacement: '[BLOCKED_NEWRELIC_KEY]',
    category: 'newrelic_api_key',
    type: 'secret',
    riskScore: 1.0,
  },

  // Shopify Admin tokens - allow uppercase and flexible length
  {
    pattern: /\bshpat_[A-Fa-f0-9]{28,36}\b/g,
    replacement: '[BLOCKED_SHOPIFY_TOKEN]',
    category: 'shopify_admin_token',
    type: 'secret',
    riskScore: 1.0,
  },

  // NPM tokens
  {
    pattern: /\bnpm_[A-Za-z0-9]{36,}\b/g,
    replacement: '[BLOCKED_NPM_TOKEN]',
    category: 'npm_token',
    type: 'secret',
    riskScore: 1.0,
  },

  // ============================================
  // DATABASE CONNECTIONS
  // ============================================

  // Database connection strings (MongoDB, Postgres, MySQL, Redis)
  {
    pattern: /\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis):\/\/[^\s"']+/gi,
    replacement: '[BLOCKED_DB_CONNECTION]',
    category: 'database_connection',
    type: 'secret',
    riskScore: 1.0,
  },

  // ============================================
  // AI/LLM API KEYS
  // ============================================

  // OpenAI API keys (including project keys)
  {
    pattern: /\bsk-(?:proj-)?[a-zA-Z0-9]{20,}\b/g,
    replacement: '[BLOCKED_OPENAI_KEY]',
    category: 'openai_api_key',
    type: 'secret',
    riskScore: 1.0,
  },

  // Anthropic API keys
  {
    pattern: /\bsk-ant-(?:api\d+-)?[a-zA-Z0-9]{20,}\b/g,
    replacement: '[BLOCKED_ANTHROPIC_KEY]',
    category: 'anthropic_api_key',
    type: 'secret',
    riskScore: 1.0,
  },

  // ============================================
  // AUTHENTICATION TOKENS
  // ============================================

  // Generic API keys (context-aware)
  {
    pattern: /\b(?:api[_-]?key|apikey|api[_-]?secret)\s*[=:]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/gi,
    replacement: '[BLOCKED_API_KEY]',
    category: 'generic_api_key',
    type: 'secret',
    riskScore: 1.0,
  },

  // JWT tokens
  {
    pattern: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    replacement: '[BLOCKED_JWT]',
    category: 'jwt_token',
    type: 'secret',
    riskScore: 1.0,
  },

  // Bearer tokens
  {
    pattern: /\bBearer\s+[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    replacement: '[BLOCKED_BEARER_TOKEN]',
    category: 'bearer_token',
    type: 'secret',
    riskScore: 1.0,
  },

  // Basic auth credentials
  {
    pattern: /\bBasic\s+[A-Za-z0-9+/=]{20,}\b/g,
    replacement: '[BLOCKED_BASIC_AUTH]',
    category: 'basic_auth',
    type: 'secret',
    riskScore: 1.0,
  },

  // Password patterns in config
  {
    pattern: /\b(?:password|passwd|pwd|secret|db[_-]?password)\s*[=:]\s*['"]?([^\s'"]{8,})['"]?/gi,
    replacement: '[BLOCKED_PASSWORD]',
    category: 'password',
    type: 'secret',
    riskScore: 1.0,
  },

  // ============================================
  // PRIVATE KEYS
  // ============================================

  // Private keys (PEM format)
  {
    pattern: /-----BEGIN\s+(?:RSA\s+|EC\s+|DSA\s+|OPENSSH\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+|EC\s+|DSA\s+|OPENSSH\s+)?PRIVATE\s+KEY-----/g,
    replacement: '[BLOCKED_PRIVATE_KEY]',
    category: 'private_key',
    type: 'secret',
    riskScore: 1.0,
  },

  // SSH public key content (often paired with private)
  {
    pattern: /\b(?:ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp256)\s+[A-Za-z0-9+/=]+/g,
    replacement: '[BLOCKED_SSH_KEY]',
    category: 'ssh_key',
    type: 'secret',
    riskScore: 1.0,
  },
];

// ============================================
// PRIVACY FILTER CLASS
// ============================================

export class PrivacyFilter {
  private rules: PrivacyRule[];
  private tokenCounter: Map<string, number> = new Map();

  constructor(additionalRules: PrivacyRule[] = []) {
    // Secrets first (higher priority), then PII
    this.rules = [...SECRET_PATTERNS, ...PII_PATTERNS, ...additionalRules];
  }

  /**
   * Filter text for PII and secrets
   * MUST achieve ≥99% PII recall, 100% secret recall
   * MUST complete in <50ms (09_DATA_PROTECTION § DP-07)
   */
  filter(text: string): FilterResult {
    const startTime = Date.now();
    let filtered = text;
    const detections: FilterResult['detections'] = [];
    let blocked = false;

    // Reset token counter for unique replacements
    this.tokenCounter.clear();

    for (const rule of this.rules) {
      // Create new RegExp to reset lastIndex
      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
      const matches = text.match(pattern);

      if (matches && matches.length > 0) {
        // Generate unique tokens for each match
        filtered = filtered.replace(pattern, () => {
          return this.generateUniqueToken(rule.replacement, rule.category);
        });

        detections.push({
          type: rule.type,
          category: rule.category,
          count: matches.length,
        });

        // FROM 09_DATA_PROTECTION: Secrets MUST block processing
        if (rule.type === 'secret') {
          blocked = true;
        }
      }
    }

    const processingTimeMs = Date.now() - startTime;

    // Warn if processing took too long (> 50ms threshold)
    if (processingTimeMs > 50) {
      console.warn(`[PrivacyFilter] Processing exceeded 50ms threshold: ${processingTimeMs}ms`);
    }

    return {
      filtered,
      detections,
      blocked,
      processingTimeMs,
    };
  }

  /**
   * Generate unique token for each detection
   * e.g., [REDACTED_EMAIL_1], [REDACTED_EMAIL_2]
   */
  private generateUniqueToken(baseReplacement: string, category: string): string {
    const count = (this.tokenCounter.get(category) ?? 0) + 1;
    this.tokenCounter.set(category, count);
    return baseReplacement.replace(']', `_${count}]`);
  }

  /**
   * Add a custom privacy rule
   */
  addRule(rule: PrivacyRule): void {
    // Insert secrets at beginning, PII after secrets
    if (rule.type === 'secret') {
      this.rules.unshift(rule);
    } else {
      // Find first PII rule and insert before it
      const firstPiiIndex = this.rules.findIndex(r => r.type === 'pii');
      if (firstPiiIndex >= 0) {
        this.rules.splice(firstPiiIndex, 0, rule);
      } else {
        this.rules.push(rule);
      }
    }
  }

  /**
   * Check if text contains secrets (without full filter)
   * Fast check for pre-screening
   */
  containsSecrets(text: string): boolean {
    for (const rule of this.rules) {
      if (rule.type === 'secret') {
        const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
        if (pattern.test(text)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if text contains PII (without full filter)
   */
  containsPII(text: string): boolean {
    for (const rule of this.rules) {
      if (rule.type === 'pii') {
        const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
        if (pattern.test(text)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get privacy detections as PrivacyDetection objects
   */
  getDetailedDetections(text: string): PrivacyDetection[] {
    const detections: PrivacyDetection[] = [];
    let tokenIndex = 0;

    for (const rule of this.rules) {
      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
      let match;

      while ((match = pattern.exec(text)) !== null) {
        tokenIndex++;
        detections.push({
          type: rule.type,
          category: rule.category,
          token: rule.replacement.replace(']', `_${tokenIndex}]`),
          location: {
            start: match.index,
            end: match.index + match[0].length,
          },
        });
      }
    }

    return detections;
  }

  /**
   * Get statistics about rules
   */
  getRuleStats(): { pii: number; secret: number; total: number } {
    const pii = this.rules.filter(r => r.type === 'pii').length;
    const secret = this.rules.filter(r => r.type === 'secret').length;
    return { pii, secret, total: this.rules.length };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const privacyFilter = new PrivacyFilter();

// ============================================
// EXPORTS
// ============================================

export {
  PII_PATTERNS,
  SECRET_PATTERNS,
};

export default PrivacyFilter;
