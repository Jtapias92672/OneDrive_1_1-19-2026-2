# Epic 11: External Integrations

**Duration:** 5 days  
**Token Budget:** 40K tokens  
**Status:** Not Started  
**Dependencies:** Epic 3 (FORGE C Core), Epic 6 (React Generator)

---

## Epic Goal

Build integrations with external services: Figma API, Jira, GitHub, and Slack. These enable the complete workflow from design to deployment.

---

## User Stories

### US-11.1: Figma API Integration
**As a** platform user  
**I want** to connect to Figma directly  
**So that** I don't need to manually export files

**Acceptance Criteria:**
- [ ] OAuth2 authentication with Figma
- [ ] Fetch file contents via API
- [ ] Real-time updates via webhooks
- [ ] Image asset export
- [ ] Rate limiting handling

**Figma Client:**
```typescript
// packages/integrations/src/figma/client.ts
export class FigmaClient {
  private accessToken: string;
  private baseUrl = 'https://api.figma.com/v1';
  
  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }
  
  async getFile(fileKey: string): Promise<FigmaFile> {
    const response = await this.request(`/files/${fileKey}`);
    return response.data;
  }
  
  async getFileNodes(fileKey: string, nodeIds: string[]): Promise<FigmaNodes> {
    const ids = nodeIds.join(',');
    const response = await this.request(`/files/${fileKey}/nodes?ids=${ids}`);
    return response.data;
  }
  
  async exportImages(
    fileKey: string, 
    nodeIds: string[], 
    options: ExportOptions = {}
  ): Promise<ExportedImages> {
    const { format = 'png', scale = 2 } = options;
    const ids = nodeIds.join(',');
    const response = await this.request(
      `/images/${fileKey}?ids=${ids}&format=${format}&scale=${scale}`
    );
    return response.data;
  }
  
  async getComments(fileKey: string): Promise<FigmaComment[]> {
    const response = await this.request(`/files/${fileKey}/comments`);
    return response.data.comments;
  }
  
  private async request(path: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'X-Figma-Token': this.accessToken,
        ...options.headers,
      },
    });
    
    if (response.status === 429) {
      // Handle rate limiting
      const retryAfter = response.headers.get('Retry-After');
      throw new RateLimitError(parseInt(retryAfter || '60'));
    }
    
    if (!response.ok) {
      throw new FigmaAPIError(response.status, await response.text());
    }
    
    return response.json();
  }
}

// Webhook handler
export class FigmaWebhookHandler {
  async handleWebhook(payload: FigmaWebhookPayload): Promise<void> {
    switch (payload.event_type) {
      case 'FILE_UPDATE':
        await this.onFileUpdate(payload);
        break;
      case 'FILE_COMMENT':
        await this.onComment(payload);
        break;
    }
  }
}
```

---

### US-11.2: Jira Integration
**As a** platform user  
**I want** Jira tickets created automatically  
**So that** generated work is tracked in our project management

**Acceptance Criteria:**
- [ ] OAuth2 authentication with Jira Cloud
- [ ] Create issues with proper fields
- [ ] Attach generated code as artifacts
- [ ] Update ticket status
- [ ] Link related tickets

**Jira Client:**
```typescript
// packages/integrations/src/jira/client.ts
export class JiraClient {
  private baseUrl: string;
  private auth: JiraAuth;
  
  async createIssue(issue: CreateIssueRequest): Promise<JiraIssue> {
    const response = await this.request('/rest/api/3/issue', {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          project: { key: issue.projectKey },
          summary: issue.summary,
          description: this.formatDescription(issue.description),
          issuetype: { name: issue.type },
          labels: issue.labels,
          priority: issue.priority ? { name: issue.priority } : undefined,
          assignee: issue.assignee ? { accountId: issue.assignee } : undefined,
        },
      }),
    });
    
    return response;
  }
  
  async attachFile(issueKey: string, file: Buffer, filename: string): Promise<void> {
    const formData = new FormData();
    formData.append('file', new Blob([file]), filename);
    
    await this.request(`/rest/api/3/issue/${issueKey}/attachments`, {
      method: 'POST',
      headers: { 'X-Atlassian-Token': 'no-check' },
      body: formData,
    });
  }
  
  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    await this.request(`/rest/api/3/issue/${issueKey}/transitions`, {
      method: 'POST',
      body: JSON.stringify({ transition: { id: transitionId } }),
    });
  }
  
  async linkIssues(inwardKey: string, outwardKey: string, linkType: string): Promise<void> {
    await this.request('/rest/api/3/issueLink', {
      method: 'POST',
      body: JSON.stringify({
        type: { name: linkType },
        inwardIssue: { key: inwardKey },
        outwardIssue: { key: outwardKey },
      }),
    });
  }
  
  private formatDescription(content: string): JiraDocument {
    return {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: content }],
        },
      ],
    };
  }
}
```

---

### US-11.3: GitHub Integration
**As a** platform user  
**I want** generated code pushed to GitHub  
**So that** it's version controlled and ready for CI/CD

**Acceptance Criteria:**
- [ ] OAuth2 authentication with GitHub
- [ ] Create repositories
- [ ] Create branches
- [ ] Commit and push code
- [ ] Create pull requests

**GitHub Client:**
```typescript
// packages/integrations/src/github/client.ts
export class GitHubClient {
  private octokit: Octokit;
  
  constructor(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken });
  }
  
  async createRepository(options: CreateRepoOptions): Promise<Repository> {
    const { data } = await this.octokit.repos.createForAuthenticatedUser({
      name: options.name,
      description: options.description,
      private: options.private ?? true,
      auto_init: options.initWithReadme ?? true,
    });
    return data;
  }
  
  async createBranch(owner: string, repo: string, branch: string, fromBranch = 'main'): Promise<void> {
    const { data: ref } = await this.octokit.git.getRef({
      owner, repo, ref: `heads/${fromBranch}`,
    });
    
    await this.octokit.git.createRef({
      owner, repo,
      ref: `refs/heads/${branch}`,
      sha: ref.object.sha,
    });
  }
  
  async commitFiles(
    owner: string, 
    repo: string, 
    branch: string, 
    files: FileToCommit[], 
    message: string
  ): Promise<Commit> {
    // Get the current commit SHA
    const { data: ref } = await this.octokit.git.getRef({
      owner, repo, ref: `heads/${branch}`,
    });
    
    // Get the tree SHA
    const { data: commit } = await this.octokit.git.getCommit({
      owner, repo, commit_sha: ref.object.sha,
    });
    
    // Create blobs for each file
    const blobs = await Promise.all(
      files.map(file => this.octokit.git.createBlob({
        owner, repo,
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64',
      }))
    );
    
    // Create a new tree
    const { data: tree } = await this.octokit.git.createTree({
      owner, repo,
      base_tree: commit.tree.sha,
      tree: files.map((file, i) => ({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blobs[i].data.sha,
      })),
    });
    
    // Create the commit
    const { data: newCommit } = await this.octokit.git.createCommit({
      owner, repo,
      message,
      tree: tree.sha,
      parents: [ref.object.sha],
    });
    
    // Update the reference
    await this.octokit.git.updateRef({
      owner, repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
    });
    
    return newCommit;
  }
  
  async createPullRequest(options: CreatePROptions): Promise<PullRequest> {
    const { data } = await this.octokit.pulls.create({
      owner: options.owner,
      repo: options.repo,
      title: options.title,
      body: options.body,
      head: options.head,
      base: options.base,
    });
    return data;
  }
}
```

---

### US-11.4: Slack Integration
**As a** platform user  
**I want** notifications sent to Slack  
**So that** my team is informed of generation progress

**Acceptance Criteria:**
- [ ] OAuth2 authentication with Slack
- [ ] Send messages to channels
- [ ] Rich message formatting (blocks)
- [ ] Interactive buttons for actions
- [ ] Thread replies for updates

**Slack Client:**
```typescript
// packages/integrations/src/slack/client.ts
export class SlackClient {
  private client: WebClient;
  
  constructor(accessToken: string) {
    this.client = new WebClient(accessToken);
  }
  
  async sendMessage(channel: string, message: SlackMessage): Promise<MessageResult> {
    const result = await this.client.chat.postMessage({
      channel,
      text: message.text,
      blocks: message.blocks,
      attachments: message.attachments,
    });
    return { ts: result.ts, channel: result.channel };
  }
  
  async sendConvergenceNotification(
    channel: string, 
    session: ConvergenceSession
  ): Promise<MessageResult> {
    const blocks = this.buildConvergenceBlocks(session);
    return this.sendMessage(channel, { text: 'Convergence Update', blocks });
  }
  
  async sendDeploymentNotification(
    channel: string, 
    deployment: Deployment
  ): Promise<MessageResult> {
    const color = deployment.status === 'success' ? 'good' : 'danger';
    return this.sendMessage(channel, {
      text: `Deployment ${deployment.status}`,
      attachments: [{
        color,
        title: `${deployment.projectName} deployed to ${deployment.environment}`,
        fields: [
          { title: 'Status', value: deployment.status, short: true },
          { title: 'Duration', value: deployment.duration, short: true },
          { title: 'URL', value: deployment.url || 'N/A', short: false },
        ],
      }],
    });
  }
  
  private buildConvergenceBlocks(session: ConvergenceSession): Block[] {
    const statusEmoji = session.status === 'converged' ? '✅' : 
                        session.status === 'running' ? '🔄' : '❌';
    
    return [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${statusEmoji} Convergence ${session.status}` },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Contract:*\n${session.contractId}` },
          { type: 'mrkdwn', text: `*Iterations:*\n${session.iterations}` },
          { type: 'mrkdwn', text: `*Tokens:*\n${session.tokensUsed.toLocaleString()}` },
          { type: 'mrkdwn', text: `*Cost:*\n$${session.cost.toFixed(4)}` },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Details' },
            url: `${process.env.PLATFORM_URL}/convergence/${session.id}`,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Download Evidence' },
            action_id: 'download_evidence',
            value: session.id,
          },
        ],
      },
    ];
  }
}
```

---

### US-11.5: Integration Manager
**As a** platform operator  
**I want** integrations managed centrally  
**So that** I can enable/disable and configure them easily

**Acceptance Criteria:**
- [ ] Integration registry
- [ ] Credential storage (encrypted)
- [ ] Health checks for integrations
- [ ] Usage tracking per integration

**Integration Manager:**
```typescript
// packages/integrations/src/manager.ts
export class IntegrationManager {
  private registry: Map<string, Integration> = new Map();
  private credentials: CredentialStore;
  
  register(integration: Integration): void {
    this.registry.set(integration.id, integration);
  }
  
  async getClient<T>(integrationId: string, userId: string): Promise<T> {
    const integration = this.registry.get(integrationId);
    if (!integration) throw new IntegrationNotFoundError(integrationId);
    
    const creds = await this.credentials.get(integrationId, userId);
    if (!creds) throw new CredentialsNotFoundError(integrationId, userId);
    
    return integration.createClient(creds) as T;
  }
  
  async healthCheck(integrationId: string): Promise<HealthCheckResult> {
    const integration = this.registry.get(integrationId);
    if (!integration) return { status: 'unknown', message: 'Integration not found' };
    
    try {
      await integration.healthCheck();
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }
}
```

---

## Key Deliverables

```
packages/integrations/
├── src/
│   ├── index.ts
│   ├── manager.ts
│   ├── figma/
│   │   ├── client.ts
│   │   └── webhooks.ts
│   ├── jira/
│   │   └── client.ts
│   ├── github/
│   │   └── client.ts
│   ├── slack/
│   │   └── client.ts
│   └── types/
├── __tests__/
└── package.json
```

---

## Completion Criteria

- [ ] Figma API integration with file fetching
- [ ] Jira integration with issue creation
- [ ] GitHub integration with PR creation
- [ ] Slack integration with notifications
- [ ] Integration manager working
- [ ] OAuth flows for all services
- [ ] 80%+ test coverage

---

## Verification Script

```bash
#!/bin/bash
echo "🔍 Verifying Epic 11: Integrations"
cd packages/integrations

[ -f "src/figma/client.ts" ] || { echo "❌ Figma client missing"; exit 1; }
[ -f "src/jira/client.ts" ] || { echo "❌ Jira client missing"; exit 1; }
[ -f "src/github/client.ts" ] || { echo "❌ GitHub client missing"; exit 1; }
[ -f "src/slack/client.ts" ] || { echo "❌ Slack client missing"; exit 1; }

pnpm test || { echo "❌ Tests failed"; exit 1; }
pnpm build || { echo "❌ Build failed"; exit 1; }

echo "✅ Epic 11 verification complete"
```
