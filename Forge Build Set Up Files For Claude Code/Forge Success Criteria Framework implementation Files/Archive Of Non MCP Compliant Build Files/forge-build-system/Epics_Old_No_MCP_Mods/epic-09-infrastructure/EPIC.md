# Epic 9: Infrastructure Deployment Engine

**Duration:** 5 days  
**Token Budget:** 60K tokens  
**Status:** Not Started  
**Dependencies:** Epic 1 (Foundation), Epic 6 (React Generator)

---

## Epic Goal

Build the infrastructure deployment engine that takes generated code and deploys it to AWS (EC2, Lambda, S3, CloudFront). This completes the "D" in the B-D Platform.

---

## User Stories

### US-9.1: Infrastructure as Code Generation
**As a** platform user  
**I want** IaC templates generated for my app  
**So that** deployments are reproducible

**Acceptance Criteria:**
- [ ] Generate AWS CDK TypeScript code
- [ ] Support multiple deployment targets (EC2, Lambda, ECS)
- [ ] Configure S3 for static assets
- [ ] Set up CloudFront for CDN
- [ ] Generate environment-specific configs

**CDK Generator:**
```typescript
// packages/infrastructure/src/generators/cdk.ts
export class CDKGenerator {
  generate(app: GeneratedApp, config: InfraConfig): GeneratedInfra {
    const stacks: CDKStack[] = [];
    
    // Static assets stack (S3 + CloudFront)
    stacks.push(this.generateStaticStack(app, config));
    
    // API stack (Lambda or ECS)
    if (app.hasBackend) {
      stacks.push(this.generateApiStack(app, config));
    }
    
    // Database stack (if needed)
    if (app.database) {
      stacks.push(this.generateDatabaseStack(app, config));
    }
    
    return {
      stacks,
      binEntry: this.generateBinEntry(stacks),
      cdkJson: this.generateCdkConfig(config),
    };
  }
  
  private generateStaticStack(app: GeneratedApp, config: InfraConfig): CDKStack {
    return {
      name: 'StaticAssetsStack',
      code: `
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

export class StaticAssetsStack extends cdk.Stack {
  public readonly distribution: cloudfront.Distribution;
  
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    // S3 bucket for static assets
    const bucket = new s3.Bucket(this, 'AssetsBucket', {
      bucketName: '${config.bucketName}',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.${config.environment === 'prod' ? 'RETAIN' : 'DESTROY'},
      autoDeleteObjects: ${config.environment !== 'prod'},
    });
    
    // CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });
    
    // Deploy assets
    new s3deploy.BucketDeployment(this, 'DeployAssets', {
      sources: [s3deploy.Source.asset('../dist')],
      destinationBucket: bucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    });
    
    // Outputs
    new cdk.CfnOutput(this, 'DistributionUrl', {
      value: 'https://' + this.distribution.distributionDomainName,
    });
  }
}
      `.trim(),
    };
  }
  
  private generateApiStack(app: GeneratedApp, config: InfraConfig): CDKStack {
    if (config.computeType === 'lambda') {
      return this.generateLambdaApiStack(app, config);
    }
    return this.generateEcsApiStack(app, config);
  }
  
  private generateLambdaApiStack(app: GeneratedApp, config: InfraConfig): CDKStack {
    return {
      name: 'ApiStack',
      code: `
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class ApiStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const handler = new lambda.Function(this, 'ApiHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../api/dist'),
      memorySize: ${config.lambdaMemory || 1024},
      timeout: cdk.Duration.seconds(${config.lambdaTimeout || 30}),
      environment: {
        NODE_ENV: '${config.environment}',
      },
    });
    
    const api = new apigateway.RestApi(this, 'Api', {
      restApiName: '${app.name}-api',
      deployOptions: {
        stageName: '${config.environment}',
      },
    });
    
    api.root.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(handler),
    });
    
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
    });
  }
}
      `.trim(),
    };
  }
}
```

---

### US-9.2: Deployment Pipeline
**As a** platform operator  
**I want** automated deployment pipelines  
**So that** deployments are consistent and tracked

**Acceptance Criteria:**
- [ ] GitHub Actions workflow generation
- [ ] Multi-environment support (dev, staging, prod)
- [ ] Approval gates for production
- [ ] Rollback capability
- [ ] Deployment notifications

**Pipeline Generator:**
```typescript
// packages/infrastructure/src/generators/pipeline.ts
export class PipelineGenerator {
  generate(config: PipelineConfig): GeneratedPipeline {
    return {
      workflow: this.generateGitHubWorkflow(config),
      scripts: this.generateDeployScripts(config),
    };
  }
  
  private generateGitHubWorkflow(config: PipelineConfig): string {
    return `
name: Deploy ${config.appName}

on:
  push:
    branches: [main, develop]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

env:
  AWS_REGION: ${config.region}

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm test
      
      - uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: build
          path: dist/
          
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${config.region}
          
      - run: pnpm cdk deploy --all --require-approval never

  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: build
          path: dist/
          
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${config.region}
          
      - run: pnpm cdk deploy --all --require-approval broadening
    `.trim();
  }
}
```

---

### US-9.3: Environment Configuration
**As a** platform operator  
**I want** environment-specific configs managed  
**So that** I can deploy to multiple environments safely

**Acceptance Criteria:**
- [ ] Environment variable management
- [ ] Secrets integration (AWS Secrets Manager)
- [ ] Config file generation per environment
- [ ] Environment validation before deploy

**Environment Manager:**
```typescript
// packages/infrastructure/src/config/environment.ts
export interface EnvironmentConfig {
  name: 'development' | 'staging' | 'production';
  aws: {
    region: string;
    accountId: string;
  };
  domain?: string;
  resources: {
    lambdaMemory: number;
    lambdaTimeout: number;
    instanceType?: string;
  };
  features: {
    enableCdn: boolean;
    enableWaf: boolean;
    enableLogging: boolean;
  };
}

export class EnvironmentManager {
  private configs: Map<string, EnvironmentConfig> = new Map();
  
  async loadConfig(env: string): Promise<EnvironmentConfig> {
    // Load from file or parameter store
    const config = await this.loadFromFile(`config/${env}.json`);
    
    // Merge secrets
    const secrets = await this.loadSecrets(env);
    
    return { ...config, secrets };
  }
  
  async validate(config: EnvironmentConfig): Promise<ValidationResult> {
    const errors: string[] = [];
    
    // Validate AWS account
    if (!config.aws.accountId.match(/^\d{12}$/)) {
      errors.push('Invalid AWS account ID');
    }
    
    // Validate resources
    if (config.resources.lambdaMemory < 128 || config.resources.lambdaMemory > 10240) {
      errors.push('Lambda memory must be between 128 and 10240 MB');
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  generateConfigFile(config: EnvironmentConfig): string {
    return `
// Auto-generated environment config
export const config = {
  environment: '${config.name}',
  api: {
    baseUrl: '${this.getApiUrl(config)}',
  },
  features: ${JSON.stringify(config.features, null, 2)},
} as const;
    `.trim();
  }
}
```

---

### US-9.4: Deployment Executor
**As a** platform user  
**I want** deployments executed with progress tracking  
**So that** I know deployment status in real-time

**Acceptance Criteria:**
- [ ] Execute CDK deployments
- [ ] Stream deployment progress
- [ ] Capture deployment outputs
- [ ] Handle deployment failures
- [ ] Support dry-run mode

**Deployment Executor:**
```typescript
// packages/infrastructure/src/executor.ts
export class DeploymentExecutor {
  async deploy(
    infra: GeneratedInfra,
    config: DeploymentConfig
  ): Promise<DeploymentResult> {
    const session = this.createSession(config);
    
    try {
      // Pre-deployment checks
      await this.preflightChecks(infra, config);
      
      // Synthesize CDK
      session.emit('progress', { stage: 'synthesizing', percent: 10 });
      await this.synthesize(infra);
      
      // Diff (if requested)
      if (config.showDiff) {
        session.emit('progress', { stage: 'diffing', percent: 20 });
        const diff = await this.diff(infra);
        session.emit('diff', diff);
      }
      
      // Deploy
      session.emit('progress', { stage: 'deploying', percent: 30 });
      const outputs = await this.executeDeploy(infra, config, (progress) => {
        session.emit('progress', { 
          stage: 'deploying', 
          percent: 30 + (progress * 0.6),
          details: progress.details,
        });
      });
      
      // Post-deployment validation
      session.emit('progress', { stage: 'validating', percent: 95 });
      await this.validateDeployment(outputs);
      
      session.emit('progress', { stage: 'complete', percent: 100 });
      
      return {
        status: 'success',
        outputs,
        duration: session.getDuration(),
      };
      
    } catch (error) {
      session.emit('error', error);
      
      // Attempt rollback if configured
      if (config.autoRollback) {
        await this.rollback(infra, config);
      }
      
      return {
        status: 'failed',
        error: error.message,
        duration: session.getDuration(),
      };
    }
  }
  
  private async executeDeploy(
    infra: GeneratedInfra,
    config: DeploymentConfig,
    onProgress: (progress: DeployProgress) => void
  ): Promise<DeploymentOutputs> {
    const proc = spawn('npx', ['cdk', 'deploy', '--all', '--outputs-file', 'outputs.json'], {
      cwd: config.workDir,
      env: {
        ...process.env,
        CDK_DEFAULT_ACCOUNT: config.awsAccountId,
        CDK_DEFAULT_REGION: config.awsRegion,
      },
    });
    
    return new Promise((resolve, reject) => {
      proc.stdout.on('data', (data) => {
        const progress = this.parseProgress(data.toString());
        if (progress) onProgress(progress);
      });
      
      proc.on('close', (code) => {
        if (code === 0) {
          const outputs = JSON.parse(fs.readFileSync('outputs.json', 'utf-8'));
          resolve(outputs);
        } else {
          reject(new Error(`CDK deploy failed with code ${code}`));
        }
      });
    });
  }
}
```

---

### US-9.5: Deployment Monitoring
**As a** platform operator  
**I want** deployed applications monitored  
**So that** I know if something goes wrong

**Acceptance Criteria:**
- [ ] Health check endpoint generation
- [ ] CloudWatch alarms setup
- [ ] Basic dashboard generation
- [ ] Alerting configuration

**Monitoring Generator:**
```typescript
// packages/infrastructure/src/monitoring/index.ts
export class MonitoringGenerator {
  generate(app: GeneratedApp, config: MonitoringConfig): MonitoringResources {
    return {
      healthCheck: this.generateHealthCheck(app),
      alarms: this.generateAlarms(app, config),
      dashboard: this.generateDashboard(app),
    };
  }
  
  private generateAlarms(app: GeneratedApp, config: MonitoringConfig): CDKCode {
    return `
const errorAlarm = new cloudwatch.Alarm(this, 'ErrorAlarm', {
  metric: handler.metricErrors(),
  threshold: ${config.errorThreshold || 10},
  evaluationPeriods: 2,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});

const latencyAlarm = new cloudwatch.Alarm(this, 'LatencyAlarm', {
  metric: handler.metricDuration(),
  threshold: ${config.latencyThreshold || 5000},
  evaluationPeriods: 3,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});

${config.alertTopic ? `
const topic = sns.Topic.fromTopicArn(this, 'AlertTopic', '${config.alertTopic}');
errorAlarm.addAlarmAction(new actions.SnsAction(topic));
latencyAlarm.addAlarmAction(new actions.SnsAction(topic));
` : ''}
    `.trim();
  }
}
```

---

## Key Deliverables

```
packages/infrastructure/
├── src/
│   ├── index.ts
│   ├── generators/
│   │   ├── cdk.ts
│   │   ├── pipeline.ts
│   │   └── index.ts
│   ├── config/
│   │   └── environment.ts
│   ├── executor.ts
│   ├── monitoring/
│   │   └── index.ts
│   └── types/
├── templates/
│   └── stacks/
├── __tests__/
└── package.json
```

---

## Completion Criteria

- [ ] CDK stack generation for S3 + CloudFront
- [ ] Lambda API stack generation
- [ ] GitHub Actions workflow generation
- [ ] Environment configuration management
- [ ] Deployment executor with progress streaming
- [ ] CloudWatch monitoring setup
- [ ] Integration: Deploy generated CMMC dashboard to AWS

---

## Handoff Context for Epic 10

**What Epic 10 needs:**
- Import: `import { CDKGenerator, DeploymentExecutor } from '@forge/infrastructure'`
- Trigger deployments from Platform UI
- Display deployment progress
- Show deployment outputs (URLs)

---

## Verification Script

```bash
#!/bin/bash
echo "🔍 Verifying Epic 9: Infrastructure"
cd packages/infrastructure

[ -f "src/generators/cdk.ts" ] || { echo "❌ CDK generator missing"; exit 1; }
[ -f "src/executor.ts" ] || { echo "❌ executor missing"; exit 1; }

pnpm test || { echo "❌ Tests failed"; exit 1; }
pnpm build || { echo "❌ Build failed"; exit 1; }

echo "✅ Epic 9 verification complete"
```
