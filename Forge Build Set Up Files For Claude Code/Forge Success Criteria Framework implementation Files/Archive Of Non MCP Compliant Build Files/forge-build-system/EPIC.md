# Epic 3.75: Code Execution Integration

**Duration:** 5 days  
**Token Budget:** 20K tokens  
**Status:** Not Started  
**Dependencies:** Epic 3 (FORGE C Core)

---

## Epic Goal

Implement Anthropic's Code Execution with MCP pattern, transforming FORGE from traditional tool-calling to code-based orchestration. This achieves 98.7% token reduction, 60% latency improvement, and enables privacy-preserving data flows for regulated industries.

---

## Strategic Context

**Why This Epic Exists:**

In November 2025, Anthropic published research showing that traditional MCP tool-calling doesn't scale. Loading all tool definitions into context creates exponential token waste. Their solution: let LLMs write code that calls tools directly in a sandbox.

**Impact:**
- **Token Reduction:** 150K → 2K tokens (98.7%)
- **Cost Savings:** $13,320/month at 1000 workflows/day
- **Latency:** 60% faster execution
- **Privacy:** PII never enters LLM context
- **Scalability:** Enables 100+ tools without context bloat

**This is not optional—it's the correct architecture for enterprise MCP.**

---

## User Stories

### US-3.75.1: Secure Code Execution Sandbox

**As a** platform operator  
**I want** a secure code execution environment  
**So that** agents can run generated code safely without compromising the system

**Acceptance Criteria:**
- [ ] Deno runtime with TypeScript support
- [ ] Isolated sandbox (no filesystem access except /tmp, /skills, /mcp-servers)
- [ ] Network egress only to approved MCP servers
- [ ] 5-minute execution timeout
- [ ] CPU limit: 50%, Memory limit: 512MB
- [ ] Automatic cleanup of resources after execution
- [ ] Error handling with detailed stack traces
- [ ] Integration with CARS for risk assessment

**Architecture:**
```typescript
// packages/forge-c/src/execution/sandbox.ts
export class CodeExecutionSandbox {
  private denoPath: string;
  private maxMemory = '512MB';
  private maxCPU = '50%';
  private timeout = 300000; // 5 minutes
  
  async execute(
    code: string, 
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    // 1. Validate code (syntax check)
    await this.validateSyntax(code);
    
    // 2. CARS risk assessment
    const carsDecision = await this.assessRisk(code, context);
    if (carsDecision.requiresApproval && !context.approved) {
      throw new ApprovalRequiredError(carsDecision);
    }
    
    // 3. Create isolated Deno process
    const sandbox = await this.createSandbox({
      allowedPaths: ['/mcp-servers', '/skills', '/tmp'],
      allowedNetwork: context.allowedMCPServers,
      maxMemory: this.maxMemory,
      maxCPU: this.maxCPU,
      timeout: this.timeout,
      env: this.getSanitizedEnv(context)
    });
    
    try {
      // 4. Execute code with timeout
      const result = await Promise.race([
        sandbox.run(code),
        this.timeoutPromise(this.timeout)
      ]);
      
      // 5. Validate resource usage
      if (result.memoryUsed > 512 * 1024 * 1024) {
        throw new MemoryLimitExceededError(result.memoryUsed);
      }
      
      // 6. Audit log
      await this.auditLog.record({
        action: 'code_execution',
        code: code,
        result: result.status,
        executionTime: result.executionTime,
        memoryUsed: result.memoryUsed,
        userId: context.userId,
        sessionId: context.sessionId
      });
      
      return {
        success: true,
        output: result.output,
        executionTime: result.executionTime,
        memoryUsed: result.memoryUsed,
        logs: result.logs
      };
      
    } catch (error) {
      await this.handleExecutionError(error, context);
      throw error;
      
    } finally {
      await sandbox.cleanup();
    }
  }
  
  private async createSandbox(options: SandboxOptions): Promise<DenoSandbox> {
    const tempDir = await fs.mkdtemp('/tmp/forge-sandbox-');
    
    return new DenoSandbox({
      workDir: tempDir,
      permissions: {
        read: options.allowedPaths,
        write: ['/tmp', '/skills'],
        net: options.allowedNetwork,
        env: false,
        run: false
      },
      resources: {
        memory: options.maxMemory,
        cpu: options.maxCPU
      }
    });
  }
  
  private async validateSyntax(code: string): Promise<void> {
    // Use TypeScript compiler to check syntax
    const result = await ts.transpile(code, {
      strict: true,
      target: ts.ScriptTarget.ES2022
    });
    
    if (result.diagnostics?.length > 0) {
      throw new SyntaxError(
        result.diagnostics.map(d => d.messageText).join('\n')
      );
    }
  }
  
  private getSanitizedEnv(context: ExecutionContext): Record<string, string> {
    // Only expose safe environment variables
    return {
      FORGE_SESSION_ID: context.sessionId,
      FORGE_PROJECT_ID: context.projectId,
      FORGE_USER_ID: context.userId,
      NODE_ENV: 'sandbox'
      // Never expose: API keys, secrets, passwords
    };
  }
}
```

**Verification:**
```bash
cd packages/forge-c
pnpm test:sandbox
```

---

### US-3.75.2: MCP Server Filesystem

**As a** platform operator  
**I want** MCP tools exposed as a filesystem of TypeScript files  
**So that** agents can discover and use tools progressively

**Acceptance Criteria:**
- [ ] Tools organized in /mcp-servers/ directory structure
- [ ] Each tool is a standalone TypeScript file
- [ ] Tools include JSDoc documentation
- [ ] searchTools() function for fuzzy discovery
- [ ] readToolDefinition() for detailed info
- [ ] Auto-generation from existing MCPTool[] definitions
- [ ] Hot-reload when tools change

**Directory Structure:**
```
/mcp-servers/
├── forge-c/
│   ├── converge.ts
│   ├── validate.ts
│   ├── status.ts
│   └── evidence.ts
├── figma-parser/
│   ├── parseFile.ts
│   ├── exportAssets.ts
│   └── getComments.ts
├── github/
│   ├── createRepo.ts
│   ├── createBranch.ts
│   ├── commitFiles.ts
│   └── createPR.ts
├── slack/
│   ├── sendMessage.ts
│   └── notify.ts
└── README.md
```

**Implementation:**
```typescript
// packages/forge-c/src/execution/filesystem-generator.ts

export class MCPFilesystemGenerator {
  private outputDir = '/mcp-servers';
  
  async generateFromTools(tools: MCPTool[]): Promise<void> {
    // Group tools by server
    const byServer = this.groupByServer(tools);
    
    for (const [serverName, serverTools] of byServer) {
      const serverDir = `${this.outputDir}/${serverName}`;
      await fs.mkdir(serverDir, { recursive: true });
      
      // Generate TypeScript file for each tool
      for (const tool of serverTools) {
        const filePath = `${serverDir}/${tool.name}.ts`;
        const code = this.generateToolFile(tool);
        await fs.writeFile(filePath, code);
      }
      
      // Generate index.ts for server
      const indexCode = this.generateIndexFile(serverTools);
      await fs.writeFile(`${serverDir}/index.ts`, indexCode);
    }
    
    // Generate root README
    await this.generateRootReadme(byServer);
  }
  
  private generateToolFile(tool: MCPTool): string {
    return `
/**
 * ${tool.description}
 * 
 * @category ${tool.server}
 * @riskLevel ${tool.riskLevel || 'LOW'}
 * 
 * @param params - Input parameters
 * @param params.${this.getParamNames(tool.inputSchema).join('\n * @param params.')}
 * 
 * @returns Promise resolving to tool result
 * 
 * @example
 * \`\`\`typescript
 * import { ${tool.name} } from './mcp-servers/${tool.server}/${tool.name}.ts';
 * 
 * const result = await ${tool.name}({
 *   ${this.generateExampleUsage(tool)}
 * });
 * \`\`\`
 */
export async function ${tool.name}(
  params: ${this.generateTypeFromSchema(tool.inputSchema)}
): Promise<${this.generateTypeFromSchema(tool.outputSchema)}> {
  // Call MCP tool via runtime bridge
  const result = await globalThis.__mcpBridge.callTool('${tool.id}', params);
  return result as ${this.generateTypeFromSchema(tool.outputSchema)};
}

// Type definitions
export type ${this.capitalize(tool.name)}Input = ${this.generateTypeFromSchema(tool.inputSchema)};
export type ${this.capitalize(tool.name)}Output = ${this.generateTypeFromSchema(tool.outputSchema)};
    `.trim();
  }
  
  private generateIndexFile(tools: MCPTool[]): string {
    const exports = tools.map(t => `export * from './${t.name}.ts';`).join('\n');
    
    return `
/**
 * ${tools[0].server} MCP Server
 * 
 * Available tools: ${tools.map(t => t.name).join(', ')}
 */

${exports}
    `.trim();
  }
  
  private generateRootReadme(byServer: Map<string, MCPTool[]>): string {
    return `
# MCP Servers

This directory contains filesystem-based MCP tools for code execution.

## Available Servers

${Array.from(byServer.entries()).map(([server, tools]) => `
### ${server}

${tools.map(t => `- **${t.name}**: ${t.description}`).join('\n')}
`).join('\n')}

## Usage

\`\`\`typescript
// Import specific tool
import { converge } from './mcp-servers/forge-c/converge.ts';

// Use tool
const result = await converge({
  contractId: 'react-component',
  input: figmaData
});
\`\`\`

## Discovery

Use the searchTools() function to find tools by keyword:

\`\`\`typescript
const tools = await searchTools('figma parse');
// Returns: [{ name: 'parseFile', server: 'figma-parser', ... }]
\`\`\`
    `.trim();
  }
  
  private generateTypeFromSchema(schema: JSONSchema): string {
    // Generate TypeScript type from JSON Schema
    if (schema.type === 'object') {
      const properties = Object.entries(schema.properties || {})
        .map(([key, prop]: [string, any]) => {
          const optional = !schema.required?.includes(key) ? '?' : '';
          return `${key}${optional}: ${this.generateTypeFromSchema(prop)}`;
        })
        .join(';\n  ');
      
      return `{\n  ${properties}\n}`;
    }
    
    if (schema.type === 'array') {
      return `Array<${this.generateTypeFromSchema(schema.items)}>`;
    }
    
    if (schema.type === 'string') return 'string';
    if (schema.type === 'number') return 'number';
    if (schema.type === 'boolean') return 'boolean';
    
    return 'unknown';
  }
}

// packages/forge-c/src/execution/tool-discovery.ts

export class ToolDiscoveryService {
  private index: ToolIndex;
  
  async searchTools(query: string, options?: SearchOptions): Promise<ToolSearchResult[]> {
    // Fuzzy search across tool names, descriptions, and categories
    const results = await this.index.search(query, {
      maxResults: options?.maxResults || 10,
      minScore: options?.minScore || 0.5,
      fields: ['name', 'description', 'category', 'server']
    });
    
    return results.map(r => ({
      name: r.tool.name,
      server: r.tool.server,
      summary: r.tool.description.slice(0, 100),
      relevanceScore: r.score,
      filePath: `/mcp-servers/${r.tool.server}/${r.tool.name}.ts`,
      usage: this.generateUsageHint(r.tool)
    }));
  }
  
  async readToolDefinition(filePath: string): Promise<ToolDefinition> {
    // Read TypeScript file and extract JSDoc metadata
    const code = await fs.readFile(filePath, 'utf-8');
    const ast = ts.createSourceFile(filePath, code, ts.ScriptTarget.ES2022);
    
    // Extract function signature and JSDoc
    const exportedFunction = this.findExportedFunction(ast);
    const jsdoc = this.extractJSDoc(exportedFunction);
    
    return {
      name: exportedFunction.name,
      description: jsdoc.description,
      inputType: this.extractInputType(exportedFunction),
      outputType: this.extractOutputType(exportedFunction),
      examples: jsdoc.examples,
      riskLevel: jsdoc.tags.riskLevel || 'LOW',
      requiredPermissions: jsdoc.tags.permissions || []
    };
  }
  
  private generateUsageHint(tool: MCPTool): string {
    return `
import { ${tool.name} } from '/mcp-servers/${tool.server}/${tool.name}.ts';
const result = await ${tool.name}({ /* params */ });
    `.trim();
  }
}
```

**Verification:**
```bash
cd packages/forge-c
pnpm test:filesystem-generation
node scripts/generate-mcp-filesystem.js
ls -R /mcp-servers/
```

---

### US-3.75.3: Privacy Tokenization Layer

**As a** platform operator  
**I want** sensitive data automatically tokenized before LLM sees it  
**So that** we comply with HIPAA, GDPR, and defense contractor requirements

**Acceptance Criteria:**
- [ ] PII detection (emails, SSNs, phone numbers, credit cards, names)
- [ ] Automatic tokenization (EMAIL_TOKEN_001)
- [ ] Reverse mapping in sandbox only (LLM never sees real data)
- [ ] Configurable sensitivity levels (LOW/MEDIUM/HIGH)
- [ ] Audit log of tokenization operations
- [ ] Support for custom PII patterns
- [ ] Integration with CARS risk assessment

**Implementation:**
```typescript
// packages/forge-c/src/execution/privacy-tokenizer.ts

export class PrivacyTokenizer {
  private tokenMap: Map<string, string> = new Map();
  private reverseMap: Map<string, string> = new Map();
  private auditLog: AuditLogger;
  
  // Default PII detection patterns
  private patterns: Record<string, RegExp> = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    phone: /\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    // Custom patterns added via registerPattern()
  };
  
  async tokenize(
    data: any, 
    context: PrivacyContext
  ): Promise<TokenizationResult> {
    const startTime = Date.now();
    const detected: DetectedPII[] = [];
    
    // Recursively tokenize all string values
    const tokenized = this.tokenizeValue(data, context, detected);
    
    // Audit log
    await this.auditLog.record({
      action: 'privacy_tokenization',
      userId: context.userId,
      sessionId: context.sessionId,
      detectedPII: detected.length,
      categories: [...new Set(detected.map(d => d.category))],
      executionTime: Date.now() - startTime
    });
    
    return {
      tokenized: tokenized,
      detectedPII: detected,
      tokenCount: this.tokenMap.size
    };
  }
  
  private tokenizeValue(
    value: any, 
    context: PrivacyContext, 
    detected: DetectedPII[]
  ): any {
    if (typeof value === 'string') {
      return this.tokenizeString(value, context, detected);
    }
    
    if (Array.isArray(value)) {
      return value.map(item => this.tokenizeValue(item, context, detected));
    }
    
    if (typeof value === 'object' && value !== null) {
      const tokenized: any = {};
      for (const [key, val] of Object.entries(value)) {
        // Check if key itself indicates sensitive data
        if (this.isSensitiveKey(key)) {
          tokenized[key] = this.tokenizeString(
            String(val), 
            { ...context, forceTokenize: true }, 
            detected
          );
        } else {
          tokenized[key] = this.tokenizeValue(val, context, detected);
        }
      }
      return tokenized;
    }
    
    return value;
  }
  
  private tokenizeString(
    text: string, 
    context: PrivacyContext, 
    detected: DetectedPII[]
  ): string {
    let tokenized = text;
    
    // Apply each pattern
    for (const [category, pattern] of Object.entries(this.patterns)) {
      // Skip if below sensitivity threshold
      if (!this.shouldTokenizeCategory(category, context.sensitivityLevel)) {
        continue;
      }
      
      tokenized = tokenized.replace(pattern, (match) => {
        // Check if already tokenized
        if (match.includes('_TOKEN_')) {
          return match;
        }
        
        // Create or retrieve token
        const token = this.getOrCreateToken(match, category);
        
        // Record detection
        detected.push({
          category: category,
          originalValue: match,
          token: token,
          position: tokenized.indexOf(match)
        });
        
        return token;
      });
    }
    
    return tokenized;
  }
  
  private getOrCreateToken(value: string, category: string): string {
    // Check if we've already tokenized this value
    const existing = this.tokenMap.get(value);
    if (existing) {
      return existing;
    }
    
    // Create new token
    const tokenId = this.tokenMap.size + 1;
    const token = `${category.toUpperCase()}_TOKEN_${String(tokenId).padStart(3, '0')}`;
    
    // Store bidirectional mapping
    this.tokenMap.set(value, token);
    this.reverseMap.set(token, value);
    
    return token;
  }
  
  async detokenize(data: any): Promise<any> {
    // Reverse the tokenization process
    if (typeof data === 'string') {
      let detokenized = data;
      
      // Replace all tokens with original values
      for (const [token, value] of this.reverseMap) {
        detokenized = detokenized.replace(
          new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
          value
        );
      }
      
      return detokenized;
    }
    
    if (Array.isArray(data)) {
      return Promise.all(data.map(item => this.detokenize(item)));
    }
    
    if (typeof data === 'object' && data !== null) {
      const detokenized: any = {};
      for (const [key, value] of Object.entries(data)) {
        detokenized[key] = await this.detokenize(value);
      }
      return detokenized;
    }
    
    return data;
  }
  
  registerPattern(category: string, pattern: RegExp): void {
    this.patterns[category] = pattern;
  }
  
  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'email', 'ssn', 'social_security', 'password', 'secret',
      'phone', 'credit_card', 'api_key', 'token', 'birthdate'
    ];
    
    return sensitiveKeys.some(sk => 
      key.toLowerCase().includes(sk.toLowerCase())
    );
  }
  
  private shouldTokenizeCategory(
    category: string, 
    level: SensitivityLevel
  ): boolean {
    const categoryLevels: Record<string, SensitivityLevel> = {
      email: 'MEDIUM',
      ssn: 'HIGH',
      phone: 'MEDIUM',
      creditCard: 'HIGH',
      ipAddress: 'LOW'
    };
    
    const categoryLevel = categoryLevels[category] || 'LOW';
    const levels = ['LOW', 'MEDIUM', 'HIGH'];
    
    return levels.indexOf(categoryLevel) >= levels.indexOf(level);
  }
}

// Example usage in sandbox
export class PrivacyAwareExecutor {
  private tokenizer: PrivacyTokenizer;
  
  async executeWithPrivacy(
    code: string,
    inputData: any,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    // 1. Tokenize input data
    const { tokenized, detectedPII } = await this.tokenizer.tokenize(
      inputData,
      {
        userId: context.userId,
        sessionId: context.sessionId,
        sensitivityLevel: context.privacyLevel || 'MEDIUM'
      }
    );
    
    // 2. Execute code with tokenized data
    const sandboxResult = await this.sandbox.execute(code, {
      ...context,
      inputData: tokenized
    });
    
    // 3. Detokenize output (only in sandbox, never sent to LLM)
    const detokenized = await this.tokenizer.detokenize(sandboxResult.output);
    
    // 4. Return result with privacy metadata
    return {
      success: true,
      output: detokenized,
      privacy: {
        detectedPII: detectedPII.length,
        categories: [...new Set(detectedPII.map(d => d.category))],
        tokenized: true
      }
    };
  }
}
```

**Verification:**
```bash
cd packages/forge-c
pnpm test:privacy-tokenization
```

---

### US-3.75.4: Persistent Skills Directory

**As a** platform operator  
**I want** successful agent code saved as reusable skills  
**So that** common workflows become one-liners over time

**Acceptance Criteria:**
- [ ] /skills/ directory in sandbox with write access
- [ ] Agent can save .ts files to /skills/
- [ ] Skills persist across sessions (stored in database)
- [ ] Skills versioned with Git
- [ ] Skills searchable by description and tags
- [ ] Skill validation before saving
- [ ] Skill usage analytics

**Implementation:**
```typescript
// packages/forge-c/src/execution/skills-manager.ts

export class SkillsManager {
  private skillsDir = '/skills';
  private registry: SkillRegistry;
  private git: GitRepository;
  private validator: SkillValidator;
  
  async saveSkill(request: SaveSkillRequest): Promise<SavedSkill> {
    // 1. Validate skill code
    await this.validator.validate(request.code);
    
    // 2. Check for duplicates
    const existing = await this.registry.findByName(request.name);
    if (existing) {
      throw new SkillAlreadyExistsError(request.name);
    }
    
    // 3. Generate skill file
    const skillCode = this.wrapSkill(request);
    const filePath = `${this.skillsDir}/${request.name}.ts`;
    
    // 4. Save to filesystem
    await fs.writeFile(filePath, skillCode);
    
    // 5. Register in searchable index
    const skill = await this.registry.create({
      name: request.name,
      description: request.description,
      code: request.code,
      filePath: filePath,
      tags: request.tags || [],
      author: request.userId,
      version: '1.0.0',
      createdAt: new Date()
    });
    
    // 6. Commit to Git for versioning
    await this.git.commit(filePath, `Add skill: ${request.name}`, {
      author: request.userId,
      message: request.description
    });
    
    // 7. Audit log
    await this.auditLog.record({
      action: 'skill_saved',
      skillName: request.name,
      userId: request.userId,
      sessionId: request.sessionId
    });
    
    return skill;
  }
  
  private wrapSkill(request: SaveSkillRequest): string {
    return `
/**
 * ${request.description}
 * 
 * @category ${request.category || 'workflow'}
 * @author ${request.userId}
 * @version 1.0.0
 * @created ${new Date().toISOString()}
 * 
 * ${request.tags?.map(t => `@tag ${t}`).join('\n * ')}
 * 
 * @example
 * \`\`\`typescript
 * import { ${request.name} } from '/skills/${request.name}.ts';
 * 
 * ${request.exampleUsage || `const result = await ${request.name}();`}
 * \`\`\`
 */
${request.code}

// Export metadata for discovery
export const __skillMetadata = {
  name: '${request.name}',
  description: '${request.description}',
  tags: ${JSON.stringify(request.tags || [])},
  version: '1.0.0'
};
    `.trim();
  }
  
  async searchSkills(query: string, options?: SearchOptions): Promise<Skill[]> {
    return this.registry.search(query, {
      maxResults: options?.maxResults || 10,
      minScore: options?.minScore || 0.5,
      tags: options?.tags,
      author: options?.author
    });
  }
  
  async loadSkill(name: string): Promise<SkillCode> {
    const skill = await this.registry.findByName(name);
    if (!skill) {
      throw new SkillNotFoundError(name);
    }
    
    // Increment usage counter
    await this.registry.incrementUsage(skill.id);
    
    // Load code from filesystem
    const code = await fs.readFile(skill.filePath, 'utf-8');
    
    return {
      name: skill.name,
      code: code,
      version: skill.version,
      description: skill.description
    };
  }
  
  async updateSkill(name: string, updates: UpdateSkillRequest): Promise<Skill> {
    const skill = await this.registry.findByName(name);
    if (!skill) {
      throw new SkillNotFoundError(name);
    }
    
    // Validate new code
    if (updates.code) {
      await this.validator.validate(updates.code);
    }
    
    // Increment version
    const newVersion = this.incrementVersion(skill.version);
    
    // Update code if provided
    if (updates.code) {
      const skillCode = this.wrapSkill({
        ...skill,
        ...updates,
        version: newVersion
      });
      await fs.writeFile(skill.filePath, skillCode);
    }
    
    // Update registry
    const updated = await this.registry.update(skill.id, {
      ...updates,
      version: newVersion,
      updatedAt: new Date()
    });
    
    // Commit to Git
    await this.git.commit(
      skill.filePath, 
      `Update skill: ${name} to v${newVersion}`,
      { author: updates.userId }
    );
    
    return updated;
  }
  
  async getPopularSkills(limit: number = 10): Promise<Skill[]> {
    return this.registry.findAll({
      orderBy: 'usageCount',
      order: 'DESC',
      limit: limit
    });
  }
  
  private incrementVersion(version: string): string {
    const [major, minor, patch] = version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }
}

// Example: Agent saves a workflow as a skill
const skillsManager = new SkillsManager();

await skillsManager.saveSkill({
  name: 'figmaToReactWorkflow',
  description: 'End-to-end workflow: Parse Figma → Generate React → Create PR',
  code: `
export async function figmaToReactWorkflow(figmaNodeId: string) {
  // Import MCP tools
  const { parse } = await import('./mcp-servers/figma-parser/parse.ts');
  const { converge } = await import('./mcp-servers/forge-c/converge.ts');
  const { createPR } = await import('./mcp-servers/github/create-pr.ts');
  
  // Parse Figma
  console.log('Parsing Figma design...');
  const figmaData = await parse(figmaNodeId);
  
  // Generate React component
  console.log('Generating React component...');
  const result = await converge({
    contractId: 'react-component',
    input: figmaData,
    maxIterations: 5
  });
  
  if (!result.converged) {
    throw new Error(\`Failed to converge: \${result.errors.join(', ')}\`);
  }
  
  // Create PR
  console.log('Creating GitHub PR...');
  const pr = await createPR({
    title: 'Add component from Figma',
    files: [
      { path: 'src/Component.tsx', content: result.output.code }
    ]
  });
  
  return {
    prUrl: pr.url,
    iterations: result.iterations,
    tokensUsed: result.tokensUsed
  };
}
  `.trim(),
  tags: ['figma', 'react', 'workflow', 'automation'],
  category: 'workflow',
  userId: context.userId,
  sessionId: context.sessionId,
  exampleUsage: `
const result = await figmaToReactWorkflow('button-123');
console.log('PR created:', result.prUrl);
  `
});

// Future agent uses this skill
import { figmaToReactWorkflow } from '/skills/figmaToReactWorkflow.ts';
const result = await figmaToReactWorkflow('button-456');
// One line instead of 50+ lines of code!
```

**Verification:**
```bash
cd packages/forge-c
pnpm test:skills-manager
```

---

### US-3.75.5: CARS Integration for Code Execution

**As a** security operator  
**I want** all code execution requests assessed by CARS  
**So that** risky code doesn't run without human approval

**Acceptance Criteria:**
- [ ] All code execution goes through CARS risk assessment
- [ ] HIGH/CRITICAL risk code requires human approval
- [ ] Static code analysis for dangerous patterns
- [ ] Detection of sandbox escape attempts
- [ ] Alignment faking detection in generated code
- [ ] Audit trail of all risk assessments
- [ ] Integration with existing CARS framework

**Implementation:**
```typescript
// packages/forge-c/src/execution/cars-code-guard.ts

import { CARSFramework, RiskLevel, ActionType } from '@forge/security';

export class CARSCodeExecutionGuard {
  private cars: CARSFramework;
  private approvalGate: HumanApprovalGate;
  
  // Dangerous code patterns (security)
  private dangerousPatterns = [
    {
      pattern: /import\s+.*\s+from\s+['"]fs['"]/,
      risk: RiskLevel.HIGH,
      reason: 'Filesystem access detected'
    },
    {
      pattern: /import\s+.*\s+from\s+['"]child_process['"]/,
      risk: RiskLevel.CRITICAL,
      reason: 'Process execution detected'
    },
    {
      pattern: /import\s+.*\s+from\s+['"]net['"]/,
      risk: RiskLevel.HIGH,
      reason: 'Network access detected'
    },
    {
      pattern: /eval\(/,
      risk: RiskLevel.CRITICAL,
      reason: 'Eval usage detected'
    },
    {
      pattern: /Function\(/,
      risk: RiskLevel.CRITICAL,
      reason: 'Dynamic function creation detected'
    },
    {
      pattern: /process\.env/,
      risk: RiskLevel.MEDIUM,
      reason: 'Environment variable access detected'
    },
    {
      pattern: /\.\.\/\.\.\//,
      risk: RiskLevel.HIGH,
      reason: 'Path traversal attempt detected'
    },
    {
      pattern: /rm\s+-rf|del\s+\/s/,
      risk: RiskLevel.CRITICAL,
      reason: 'Destructive command detected'
    }
  ];
  
  // Suspicious patterns (alignment faking)
  private suspiciousPatterns = [
    {
      pattern: /console\.log\(['"].*<hidden>.*<\/hidden>/,
      risk: RiskLevel.HIGH,
      reason: 'Hidden output detected (potential alignment faking)'
    },
    {
      pattern: /\/\*\s*@ignore-security\s*\*\//,
      risk: RiskLevel.MEDIUM,
      reason: 'Security bypass comment detected'
    },
    {
      pattern: /password|secret|api_key.*=.*['"]/,
      risk: RiskLevel.HIGH,
      reason: 'Hardcoded credentials detected'
    }
  ];
  
  async assessCodeExecution(
    code: string,
    context: ExecutionContext
  ): Promise<CARSDecision> {
    // 1. Static code analysis
    const staticAnalysis = this.analyzeCode(code);
    
    // 2. CARS risk assessment
    const carsDecision = await this.cars.assess({
      actionType: ActionType.CODE_EXECUTION,
      actor: context.userId,
      resource: {
        type: 'code_execution',
        id: context.sessionId,
        owner: context.projectId
      },
      context: {
        codeLength: code.length,
        detectedPatterns: staticAnalysis.patterns,
        riskIndicators: staticAnalysis.indicators,
        requestedPermissions: staticAnalysis.permissions,
        aiGenerated: true,
        environment: context.environment
      }
    });
    
    // 3. Combine static analysis with CARS assessment
    const finalRisk = Math.max(
      carsDecision.riskLevel,
      staticAnalysis.highestRisk
    );
    
    // 4. Enhance decision with static analysis results
    const enhancedDecision: CARSDecision = {
      ...carsDecision,
      riskLevel: finalRisk,
      requiresHumanApproval: finalRisk >= RiskLevel.HIGH || 
                             staticAnalysis.dangerous,
      reasoning: [
        ...carsDecision.reasoning,
        ...staticAnalysis.reasons
      ],
      mitigations: [
        ...carsDecision.mitigations,
        ...this.generateMitigations(staticAnalysis)
      ]
    };
    
    // 5. Check for alignment faking
    if (this.detectAlignmentFaking(code, context)) {
      enhancedDecision.riskLevel = RiskLevel.CRITICAL;
      enhancedDecision.requiresHumanApproval = true;
      enhancedDecision.reasoning.push(
        'Potential alignment faking detected in code patterns'
      );
    }
    
    return enhancedDecision;
  }
  
  private analyzeCode(code: string): CodeAnalysisResult {
    const detectedPatterns: string[] = [];
    const reasons: string[] = [];
    let highestRisk = RiskLevel.LOW;
    
    // Check dangerous patterns
    for (const { pattern, risk, reason } of this.dangerousPatterns) {
      if (pattern.test(code)) {
        detectedPatterns.push(pattern.source);
        reasons.push(reason);
        highestRisk = Math.max(highestRisk, risk);
      }
    }
    
    // Check suspicious patterns
    for (const { pattern, risk, reason } of this.suspiciousPatterns) {
      if (pattern.test(code)) {
        detectedPatterns.push(pattern.source);
        reasons.push(reason);
        highestRisk = Math.max(highestRisk, risk);
      }
    }
    
    return {
      dangerous: detectedPatterns.length > 0,
      patterns: detectedPatterns,
      reasons: reasons,
      highestRisk: highestRisk,
      permissions: this.extractPermissions(code),
      indicators: this.extractRiskIndicators(code)
    };
  }
  
  private extractPermissions(code: string): string[] {
    const permissions: string[] = [];
    
    if (/import.*fs/.test(code)) permissions.push('filesystem_read');
    if (/fs\.write|fs\.create/.test(code)) permissions.push('filesystem_write');
    if (/import.*net|fetch\(/.test(code)) permissions.push('network_access');
    if (/import.*child_process/.test(code)) permissions.push('process_execution');
    
    return permissions;
  }
  
  private extractRiskIndicators(code: string): string[] {
    const indicators: string[] = [];
    
    // Large code blocks
    if (code.length > 10000) {
      indicators.push('large_code_block');
    }
    
    // Obfuscation attempts
    if (/\\x[0-9a-f]{2}/gi.test(code)) {
      indicators.push('hex_encoding_detected');
    }
    
    // Base64 encoding
    if (/atob\(|btoa\(|Buffer\.from.*base64/.test(code)) {
      indicators.push('base64_encoding_detected');
    }
    
    // Frequent string concatenation (potential obfuscation)
    const concatCount = (code.match(/\+\s*['"]/g) || []).length;
    if (concatCount > 10) {
      indicators.push('excessive_string_concatenation');
    }
    
    return indicators;
  }
  
  private detectAlignmentFaking(code: string, context: ExecutionContext): boolean {
    // Pattern 1: Code generated immediately after tool registration
    if (context.toolAge && context.toolAge < 300000) { // 5 minutes
      return true;
    }
    
    // Pattern 2: Hidden instructions in comments
    if (/<hidden>|@ignore-|bypass/gi.test(code)) {
      return true;
    }
    
    // Pattern 3: Excessive permissions for stated purpose
    const permissions = this.extractPermissions(code);
    if (permissions.length > 5) {
      return true;
    }
    
    return false;
  }
  
  private generateMitigations(analysis: CodeAnalysisResult): string[] {
    const mitigations: string[] = [];
    
    if (analysis.permissions.includes('filesystem_write')) {
      mitigations.push('Restrict filesystem write to /tmp and /skills only');
    }
    
    if (analysis.permissions.includes('network_access')) {
      mitigations.push('Limit network egress to approved MCP servers only');
    }
    
    if (analysis.permissions.includes('process_execution')) {
      mitigations.push('Block process execution entirely');
    }
    
    if (analysis.indicators.includes('base64_encoding_detected')) {
      mitigations.push('Decode and inspect base64 content before execution');
    }
    
    return mitigations;
  }
  
  async enforceApproval(
    code: string,
    decision: CARSDecision,
    context: ExecutionContext
  ): Promise<boolean> {
    if (!decision.requiresHumanApproval) {
      return true; // Auto-approved
    }
    
    // Request human approval
    const approved = await this.approvalGate.requestApproval({
      type: 'code_execution',
      riskLevel: decision.riskLevel,
      code: code,
      reasoning: decision.reasoning,
      mitigations: decision.mitigations,
      context: context,
      timeout: 30000 // 30 seconds
    });
    
    // Audit log
    await this.auditLog.record({
      action: 'code_execution_approval',
      approved: approved,
      riskLevel: decision.riskLevel,
      code: code,
      userId: context.userId,
      sessionId: context.sessionId
    });
    
    return approved;
  }
}

// Integration with sandbox
export class SecureCodeExecutor {
  private carsGuard: CARSCodeExecutionGuard;
  private sandbox: CodeExecutionSandbox;
  
  async executeSecurely(
    code: string,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    // 1. CARS risk assessment
    const decision = await this.carsGuard.assessCodeExecution(code, context);
    
    // 2. Request approval if needed
    const approved = await this.carsGuard.enforceApproval(code, decision, context);
    
    if (!approved) {
      throw new ExecutionDeniedError('Code execution denied by security policy');
    }
    
    // 3. Execute with restrictions based on risk level
    const sandboxOptions = this.getSandboxOptions(decision.riskLevel);
    
    return this.sandbox.execute(code, {
      ...context,
      ...sandboxOptions
    });
  }
  
  private getSandboxOptions(riskLevel: RiskLevel): SandboxOptions {
    switch (riskLevel) {
      case RiskLevel.LOW:
        return {
          maxMemory: '512MB',
          maxCPU: '50%',
          timeout: 300000,
          allowedNetwork: ['*']
        };
        
      case RiskLevel.MEDIUM:
        return {
          maxMemory: '256MB',
          maxCPU: '25%',
          timeout: 120000,
          allowedNetwork: ['mcp-servers']
        };
        
      case RiskLevel.HIGH:
      case RiskLevel.CRITICAL:
        return {
          maxMemory: '128MB',
          maxCPU: '10%',
          timeout: 60000,
          allowedNetwork: [] // No network
        };
    }
  }
}
```

**Verification:**
```bash
cd packages/forge-c
pnpm test:cars-code-guard
```

---

## Key Deliverables

```
packages/forge-c/
├── src/
│   ├── execution/
│   │   ├── sandbox.ts                      # Code execution sandbox
│   │   ├── filesystem-generator.ts         # MCP filesystem generation
│   │   ├── tool-discovery.ts               # Progressive tool discovery
│   │   ├── privacy-tokenizer.ts            # PII tokenization
│   │   ├── skills-manager.ts               # Persistent skills
│   │   └── cars-code-guard.ts              # CARS integration
│   ├── types/
│   │   └── execution.ts                    # Type definitions
│   └── index.ts
├── __tests__/
│   ├── sandbox.test.ts
│   ├── filesystem.test.ts
│   ├── privacy.test.ts
│   ├── skills.test.ts
│   └── cars-guard.test.ts
└── package.json
```

---

## Completion Criteria

- [ ] Code execution sandbox operational with Deno runtime
- [ ] MCP tools exposed as /mcp-servers/ filesystem
- [ ] Privacy tokenization working for PII
- [ ] Skills can be saved and loaded across sessions
- [ ] CARS integration for all code execution
- [ ] 85%+ test coverage
- [ ] Integration test: Agent writes code → Executes in sandbox → Returns result
- [ ] Performance test: 98%+ token reduction vs traditional MCP
- [ ] Security test: Sandbox escape attempts blocked

---

## Handoff Context for Epic 4

**What Epic 4 needs to know:**
- Code execution available via `executeCode(code, context)`
- MCP tools accessible at `/mcp-servers/{server}/{tool}.ts`
- Privacy tokenization via `tokenize(data, context)`
- Skills library at `/skills/{skillName}.ts`
- CARS guards all code execution

**Key Integration Point:**
```typescript
// Epic 4 can use code execution for convergence loops
const convergenceCode = `
import { validate } from './mcp-servers/forge-c/validate.ts';

let valid = false;
let iterations = 0;

while (!valid && iterations < 5) {
  const output = await generate(input);
  const result = await validate(output, contract);
  valid = result.valid;
  iterations++;
}

return { output, iterations, valid };
`;

const result = await executeCode(convergenceCode, context);
// Convergence loop runs in sandbox, no token waste
```

---

## Verification Script

```bash
#!/bin/bash
# .forge/epics/epic-3.75-code-execution/verify.sh

echo "🔍 Verifying Epic 3.75: Code Execution Integration"

cd packages/forge-c

# Check source files
[ -f "src/execution/sandbox.ts" ] || { echo "❌ Sandbox missing"; exit 1; }
[ -f "src/execution/filesystem-generator.ts" ] || { echo "❌ Filesystem generator missing"; exit 1; }
[ -f "src/execution/privacy-tokenizer.ts" ] || { echo "❌ Privacy tokenizer missing"; exit 1; }
[ -f "src/execution/skills-manager.ts" ] || { echo "❌ Skills manager missing"; exit 1; }
[ -f "src/execution/cars-code-guard.ts" ] || { echo "❌ CARS guard missing"; exit 1; }

# Run tests
pnpm test || { echo "❌ Tests failed"; exit 1; }

# Build check
pnpm build || { echo "❌ Build failed"; exit 1; }

# Integration tests
pnpm test:integration:code-execution || { echo "❌ Integration tests failed"; exit 1; }

# Performance benchmark
pnpm test:benchmark:token-savings || { echo "❌ Benchmark failed"; exit 1; }

# Security tests
pnpm test:security:sandbox-escape || { echo "❌ Security tests failed"; exit 1; }

echo "✅ Epic 3.75 verification complete"
```

---

## Token Budget Breakdown

| Component | Estimated Tokens |
|-----------|------------------|
| Sandbox Implementation | 5K |
| Filesystem Generation | 4K |
| Privacy Tokenization | 3K |
| Skills Manager | 4K |
| CARS Integration | 4K |

**Total: 20K tokens**

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Sandbox escape** | Deno security model + CARS assessment |
| **Resource exhaustion** | CPU/memory limits enforced |
| **PII leakage** | Automatic tokenization before LLM sees data |
| **Malicious code** | Static analysis + human approval for HIGH risk |
| **Alignment faking** | Pattern detection + audit logging |

---

## Success Metrics

- **Token Reduction:** ≥95% (Target: 98.7%)
- **Latency Improvement:** ≥50% (Target: 60%)
- **Security:** 100% dangerous patterns blocked
- **Privacy:** 100% PII tokenized before LLM exposure
- **Adoption:** ≥80% of workflows use code execution by Epic 12

---

**READY FOR TASK BREAKDOWN**
