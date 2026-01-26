/**
 * MCP Security Gateway - Injection Detection Patterns
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.9 - Injection Detection Patterns
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Regex patterns for detecting various injection attacks.
 *   Covers OWASP Top 10 injection vulnerabilities.
 */

// ============================================
// TYPES
// ============================================

/**
 * Injection pattern definition
 */
export interface InjectionPattern {
  /** Pattern identifier */
  id: string;

  /** Regex pattern */
  pattern: RegExp;

  /** Injection type */
  type: InjectionType;

  /** Severity level */
  severity: 'critical' | 'high' | 'medium' | 'low';

  /** Human-readable description */
  description: string;

  /** Allow list patterns that are safe */
  allowList?: RegExp[];
}

/**
 * Injection types
 */
export type InjectionType =
  | 'sql'
  | 'command'
  | 'prompt'
  | 'path_traversal'
  | 'xss'
  | 'ldap'
  | 'xml'
  | 'ssti';

/**
 * Pattern match result
 */
export interface PatternMatch {
  /** Pattern that matched */
  pattern: InjectionPattern;

  /** Matched text */
  matchedText: string;

  /** Position in input */
  position: number;
}

// ============================================
// SQL INJECTION PATTERNS
// ============================================

export const SQL_INJECTION_PATTERNS: InjectionPattern[] = [
  {
    id: 'sql_union_select',
    pattern: /UNION\s+(ALL\s+)?SELECT/gi,
    type: 'sql',
    severity: 'critical',
    description: 'SQL UNION SELECT injection',
  },
  {
    id: 'sql_stacked_queries',
    pattern: /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)/gi,
    type: 'sql',
    severity: 'critical',
    description: 'Stacked SQL queries',
  },
  {
    id: 'sql_comment_evasion',
    pattern: /(--|#|\/\*.*?\*\/)/g,
    type: 'sql',
    severity: 'high',
    description: 'SQL comment-based evasion',
    allowList: [
      /^#[a-f0-9]{6}$/i, // CSS colors
      /^--[a-z]+-[a-z]+$/i, // CSS variables
    ],
  },
  {
    id: 'sql_boolean_based',
    pattern: /\b(OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/gi,
    type: 'sql',
    severity: 'critical',
    description: 'Boolean-based SQL injection (e.g., OR 1=1)',
  },
  {
    id: 'sql_time_based',
    pattern: /(SLEEP|WAITFOR\s+DELAY|BENCHMARK)\s*\(/gi,
    type: 'sql',
    severity: 'critical',
    description: 'Time-based SQL injection',
  },
  {
    id: 'sql_keywords',
    pattern: /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\s+.+\s+(FROM|INTO|TABLE|DATABASE)\b/gi,
    type: 'sql',
    severity: 'high',
    description: 'SQL DML/DDL keywords',
  },
  {
    id: 'sql_hex_encoding',
    pattern: /0x[0-9a-f]+/gi,
    type: 'sql',
    severity: 'medium',
    description: 'Hexadecimal encoding (potential SQL bypass)',
    allowList: [/^0x[0-9a-f]{1,8}$/i], // Short hex values are often valid
  },
];

// ============================================
// COMMAND INJECTION PATTERNS
// ============================================

export const COMMAND_INJECTION_PATTERNS: InjectionPattern[] = [
  {
    id: 'cmd_pipe',
    pattern: /\|/g,
    type: 'command',
    severity: 'critical',
    description: 'Pipe command execution',
  },
  {
    id: 'cmd_semicolon',
    pattern: /;\s*\w/g,
    type: 'command',
    severity: 'critical',
    description: 'Command chaining with semicolon',
  },
  {
    id: 'cmd_ampersand',
    pattern: /&&|\|\|/g,
    type: 'command',
    severity: 'critical',
    description: 'Command chaining with logical operators',
  },
  {
    id: 'cmd_backtick',
    pattern: /`[^`]+`/g,
    type: 'command',
    severity: 'critical',
    description: 'Command substitution with backticks',
  },
  {
    id: 'cmd_dollar_paren',
    pattern: /\$\([^)]+\)/g,
    type: 'command',
    severity: 'critical',
    description: 'Command substitution with $()',
  },
  {
    id: 'cmd_dollar_brace',
    pattern: /\$\{[^}]+\}/g,
    type: 'command',
    severity: 'high',
    description: 'Variable expansion with ${}',
  },
  {
    id: 'cmd_dangerous_chars',
    pattern: /[;&|`$(){}[\]<>]/g,
    type: 'command',
    severity: 'medium',
    description: 'Shell metacharacters',
  },
  {
    id: 'cmd_common_commands',
    pattern: /\b(rm|chmod|chown|wget|curl|nc|netcat|bash|sh|python|perl|ruby)\b/gi,
    type: 'command',
    severity: 'high',
    description: 'Common command names',
  },
];

// ============================================
// PROMPT INJECTION PATTERNS
// ============================================

export const PROMPT_INJECTION_PATTERNS: InjectionPattern[] = [
  {
    id: 'prompt_ignore_previous',
    pattern: /(ignore|disregard|forget)\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|context)/gi,
    type: 'prompt',
    severity: 'critical',
    description: 'Instruction override attempt',
  },
  {
    id: 'prompt_system_role',
    pattern: /(system:?\s*(role|prompt)|you are now|new (system|role))/gi,
    type: 'prompt',
    severity: 'critical',
    description: 'System role manipulation',
  },
  {
    id: 'prompt_jailbreak',
    pattern: /(DAN|jailbreak|bypass|override|unlock)\s*(mode|prompt|filter)?/gi,
    type: 'prompt',
    severity: 'critical',
    description: 'Jailbreak attempt',
  },
  {
    id: 'prompt_role_play',
    pattern: /(pretend|act as|imagine|roleplay|role-play)\s+(you are|being|that)/gi,
    type: 'prompt',
    severity: 'high',
    description: 'Role play manipulation',
  },
  {
    id: 'prompt_instruction_markers',
    pattern: /\[\[?(SYSTEM|INST|USER|ASSISTANT)\]?\]?|<\/?s>|<\|[^|]+\|>/gi,
    type: 'prompt',
    severity: 'critical',
    description: 'Instruction format markers',
  },
  {
    id: 'prompt_encoding_evasion',
    pattern: /(base64|hex|rot13|unicode)[:=]/gi,
    type: 'prompt',
    severity: 'high',
    description: 'Encoding-based evasion attempt',
  },
  {
    id: 'prompt_repeat_after',
    pattern: /(repeat|say|output|print|echo)\s+(after\s+me|exactly|verbatim)/gi,
    type: 'prompt',
    severity: 'medium',
    description: 'Direct output manipulation',
  },
];

// ============================================
// PATH TRAVERSAL PATTERNS
// ============================================

export const PATH_TRAVERSAL_PATTERNS: InjectionPattern[] = [
  {
    id: 'path_dot_dot_slash',
    pattern: /\.\.[\/\\]/g,
    type: 'path_traversal',
    severity: 'critical',
    description: 'Directory traversal with ../',
  },
  {
    id: 'path_encoded_traversal',
    pattern: /(%2e%2e|%252e%252e|%c0%ae)/gi,
    type: 'path_traversal',
    severity: 'critical',
    description: 'URL-encoded directory traversal',
  },
  {
    id: 'path_absolute_unix',
    pattern: /^\/etc\/|\/var\/|\/usr\/|\/root\/|\/home\//g,
    type: 'path_traversal',
    severity: 'high',
    description: 'Absolute Unix path',
  },
  {
    id: 'path_absolute_windows',
    pattern: /^[A-Za-z]:\\|\\\\[^\\]+\\/g,
    type: 'path_traversal',
    severity: 'high',
    description: 'Absolute Windows path',
  },
  {
    id: 'path_sensitive_files',
    pattern: /(\/etc\/passwd|\/etc\/shadow|\.ssh\/|\.env|\.git\/config)/gi,
    type: 'path_traversal',
    severity: 'critical',
    description: 'Sensitive file access',
  },
  {
    id: 'path_null_byte',
    pattern: /%00|\x00/g,
    type: 'path_traversal',
    severity: 'critical',
    description: 'Null byte injection',
  },
];

// ============================================
// XSS PATTERNS
// ============================================

export const XSS_PATTERNS: InjectionPattern[] = [
  {
    id: 'xss_script_tag',
    pattern: /<script[^>]*>[\s\S]*?<\/script>/gi,
    type: 'xss',
    severity: 'critical',
    description: 'Script tag injection',
  },
  {
    id: 'xss_event_handler',
    pattern: /\bon\w+\s*=\s*["'][^"']*["']/gi,
    type: 'xss',
    severity: 'critical',
    description: 'Event handler injection',
  },
  {
    id: 'xss_javascript_uri',
    pattern: /javascript\s*:/gi,
    type: 'xss',
    severity: 'critical',
    description: 'JavaScript URI scheme',
  },
  {
    id: 'xss_data_uri',
    pattern: /data\s*:\s*text\/html/gi,
    type: 'xss',
    severity: 'high',
    description: 'Data URI with HTML',
  },
  {
    id: 'xss_svg_script',
    pattern: /<svg[^>]*>[\s\S]*?<\/svg>/gi,
    type: 'xss',
    severity: 'high',
    description: 'SVG with potential script',
  },
  {
    id: 'xss_expression',
    pattern: /expression\s*\(/gi,
    type: 'xss',
    severity: 'high',
    description: 'CSS expression injection',
  },
];

// ============================================
// AGGREGATED PATTERN GROUPS
// ============================================

/**
 * All injection patterns by type
 */
export const INJECTION_PATTERNS: Record<InjectionType, InjectionPattern[]> = {
  sql: SQL_INJECTION_PATTERNS,
  command: COMMAND_INJECTION_PATTERNS,
  prompt: PROMPT_INJECTION_PATTERNS,
  path_traversal: PATH_TRAVERSAL_PATTERNS,
  xss: XSS_PATTERNS,
  ldap: [], // Placeholder for LDAP patterns
  xml: [], // Placeholder for XML/XXE patterns
  ssti: [], // Placeholder for SSTI patterns
};

/**
 * Get all patterns as flat array
 */
export function getAllPatterns(): InjectionPattern[] {
  return Object.values(INJECTION_PATTERNS).flat();
}

/**
 * Get patterns by type
 */
export function getPatternsByType(type: InjectionType): InjectionPattern[] {
  return INJECTION_PATTERNS[type] ?? [];
}

/**
 * Get patterns by severity
 */
export function getPatternsBySeverity(
  severity: 'critical' | 'high' | 'medium' | 'low'
): InjectionPattern[] {
  return getAllPatterns().filter((p) => p.severity === severity);
}

// ============================================
// PATTERN MATCHING
// ============================================

/**
 * Check if a string matches any pattern
 * @param input - String to check
 * @param patternsOrType - Either patterns array or injection type string
 */
export function matchesAnyPattern(
  input: string,
  patternsOrType: InjectionPattern[] | InjectionType
): boolean {
  const patterns = typeof patternsOrType === 'string'
    ? getPatternsByType(patternsOrType)
    : patternsOrType;

  for (const pattern of patterns) {
    // Reset regex state
    pattern.pattern.lastIndex = 0;

    const match = pattern.pattern.exec(input);
    if (match) {
      // Check allow list
      if (pattern.allowList) {
        const isAllowed = pattern.allowList.some((allow) => allow.test(input));
        if (isAllowed) continue;
      }

      return true;
    }
  }

  return false;
}

/**
 * Find all pattern matches in a string
 * @param input - String to check
 * @param patternsOrType - Either patterns array or injection type string
 */
export function findAllMatches(
  input: string,
  patternsOrType: InjectionPattern[] | InjectionType
): PatternMatch[] {
  const patterns = typeof patternsOrType === 'string'
    ? getPatternsByType(patternsOrType)
    : patternsOrType;

  const matches: PatternMatch[] = [];

  for (const pattern of patterns) {
    // Create a new regex to avoid state issues
    const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(input)) !== null) {
      // Check allow list
      if (pattern.allowList) {
        const isAllowed = pattern.allowList.some((allow) => allow.test(match![0]));
        if (isAllowed) continue;
      }

      matches.push({
        pattern,
        matchedText: match[0],
        position: match.index,
      });

      // Prevent infinite loop on zero-width matches
      if (match[0].length === 0) {
        regex.lastIndex++;
      }
    }
  }

  return matches;
}

// ============================================
// EXPORTS
// ============================================

export default INJECTION_PATTERNS;
