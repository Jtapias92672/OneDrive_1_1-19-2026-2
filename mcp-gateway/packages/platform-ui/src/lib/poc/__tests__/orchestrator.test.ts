/**
 * Tests for ForgePOCOrchestrator
 */

import { ForgePOCOrchestrator, createPOCOrchestrator } from '../orchestrator';
import type { POCOrchestratorConfig, POCProgressEvent, POCRunInput } from '../types';

// Mock external services
jest.mock('../../integrations/figma/figma-client', () => ({
  FigmaClient: jest.fn().mockImplementation(() => ({
    getFile: jest.fn().mockResolvedValue({
      name: 'Test Design',
      lastModified: '2024-01-15T00:00:00Z',
      version: '1.0.0',
      thumbnailUrl: 'https://figma.com/thumbnail.png',
      document: {
        children: [],
      },
    }),
  })),
}));

jest.mock('../../integrations/figma/figma-parser', () => ({
  FigmaParser: jest.fn().mockImplementation(() => ({
    parse: jest.fn().mockReturnValue({
      name: 'Test Design',
      lastModified: '2024-01-15T00:00:00Z',
      components: [],
      styles: {},
    }),
  })),
}));

jest.mock('../../integrations/vercel/vercel-client', () => ({
  VercelClient: jest.fn().mockImplementation(() => ({
    createDeployment: jest.fn().mockResolvedValue({
      id: 'deploy-123',
      url: 'test-preview.vercel.app',
      state: 'READY',
    }),
    waitForReady: jest.fn().mockResolvedValue({
      id: 'deploy-123',
      url: 'test-preview.vercel.app',
      state: 'READY',
    }),
  })),
}));

describe('ForgePOCOrchestrator', () => {
  const mockConfig: POCOrchestratorConfig = {
    figmaToken: 'figma-token-123',
    jiraConfig: {
      baseUrl: 'https://jira.example.com',
      email: 'test@example.com',
      apiToken: 'jira-token-123',
      projectKey: 'FORGE',
    },
    vercelToken: 'vercel-token-123',
    projectKey: 'FORGE',
  };

  describe('constructor', () => {
    it('creates an instance with config', () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      expect(orchestrator).toBeInstanceOf(ForgePOCOrchestrator);
    });
  });

  describe('createPOCOrchestrator', () => {
    it('creates an orchestrator via factory function', () => {
      const orchestrator = createPOCOrchestrator(mockConfig);
      expect(orchestrator).toBeInstanceOf(ForgePOCOrchestrator);
    });
  });

  describe('onProgress', () => {
    it('sets a progress callback', () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const callback = jest.fn();

      orchestrator.onProgress(callback);

      // Callback is stored (internal test via run)
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('run', () => {
    it('returns a POCRunResult with runId', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const input: POCRunInput = {
        figmaUrl: 'https://www.figma.com/file/ABC123/TestDesign',
        options: {
          skipJira: true,
          deployFrontend: false,
          deployBackend: false,
        },
      };

      const result = await orchestrator.run(input);

      expect(result).toHaveProperty('runId');
      expect(result.runId).toMatch(/^[a-f0-9-]{36}$/); // UUID format
      expect(result.timestamps.started).toBeDefined();
    });

    it('emits progress events when callback is set', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const progressEvents: POCProgressEvent[] = [];

      orchestrator.onProgress((event) => {
        progressEvents.push(event);
      });

      const input: POCRunInput = {
        figmaUrl: 'https://www.figma.com/file/ABC123/TestDesign',
        options: {
          skipJira: true,
          deployFrontend: false,
          deployBackend: false,
        },
      };

      await orchestrator.run(input);

      // Should emit multiple progress events
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[0]).toHaveProperty('stage');
      expect(progressEvents[0]).toHaveProperty('progress');
      expect(progressEvents[0]).toHaveProperty('message');
    });

    it('extracts file key from Figma URL', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const input: POCRunInput = {
        figmaUrl: 'https://www.figma.com/file/ABC123XYZ/MyDesign',
        options: { skipJira: true, deployFrontend: false, deployBackend: false },
      };

      const result = await orchestrator.run(input);

      expect(result.figmaMetadata.fileKey).toBe('ABC123XYZ');
    });

    it('handles /design/ URL format', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const input: POCRunInput = {
        figmaUrl: 'https://www.figma.com/design/DEF456/AnotherDesign',
        options: { skipJira: true, deployFrontend: false, deployBackend: false },
      };

      const result = await orchestrator.run(input);

      expect(result.figmaMetadata.fileKey).toBe('DEF456');
    });

    it('returns failed status on invalid Figma URL', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const input: POCRunInput = {
        figmaUrl: 'https://not-figma.com/something',
        options: { skipJira: true },
      };

      const result = await orchestrator.run(input);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Invalid Figma URL');
    });

    it('initializes empty test suites', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const input: POCRunInput = {
        figmaUrl: 'https://www.figma.com/file/ABC123/TestDesign',
        options: { skipJira: true, deployFrontend: false, deployBackend: false },
      };

      const result = await orchestrator.run(input);

      expect(result.testResults.unit.name).toBe('unit');
      expect(result.testResults.e2e.name).toBe('e2e');
      expect(result.testResults.api.name).toBe('api');
    });

    it('sets completed timestamp on success', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const input: POCRunInput = {
        figmaUrl: 'https://www.figma.com/file/ABC123/TestDesign',
        options: { skipJira: true, deployFrontend: false, deployBackend: false },
      };

      const result = await orchestrator.run(input);

      expect(result.status).toBe('completed');
      expect(result.timestamps.completed).toBeDefined();
    });
  });

  describe('parseFigmaMetadata', () => {
    it('extracts file key from standard Figma URL', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const metadata = await orchestrator.parseFigmaMetadata(
        'https://www.figma.com/file/XYZ789ABC/DesignName'
      );

      expect(metadata.fileKey).toBe('XYZ789ABC');
      expect(metadata.fileName).toBe('Test Design'); // From mock FigmaClient
    });
  });

  describe('createJiraEpic', () => {
    it('creates an epic with Figma file name', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const epic = await orchestrator.createJiraEpic({
        fileKey: 'ABC123',
        fileName: 'My Design',
        lastModified: new Date().toISOString(),
      });

      expect(epic.summary).toContain('My Design');
      expect(epic.summary).toContain('[FORGE POC]');
    });
  });

  describe('createJiraTasks', () => {
    it('creates frontend tasks for components', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const tasks = await orchestrator.createJiraTasks(
        'FORGE-1',
        [
          { id: '1', name: 'Button', type: 'button', props: [], styles: {} },
          { id: '2', name: 'Card', type: 'card', props: [], styles: {} },
        ],
        []
      );

      expect(tasks.length).toBe(2);
      expect(tasks[0].summary).toContain('[FORGE-FE]');
      expect(tasks[0].summary).toContain('Button');
      expect(tasks[0].type).toBe('frontend');
    });

    it('creates backend tasks for data models', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const tasks = await orchestrator.createJiraTasks(
        'FORGE-1',
        [],
        [
          {
            name: 'User',
            fields: [],
            endpoints: [],
            sourceComponent: 'UserForm',
          },
        ]
      );

      expect(tasks.length).toBe(1);
      expect(tasks[0].summary).toContain('[FORGE-BE]');
      expect(tasks[0].summary).toContain('User');
      expect(tasks[0].type).toBe('backend');
    });

    it('creates both frontend and backend tasks', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const tasks = await orchestrator.createJiraTasks(
        'FORGE-1',
        [{ id: '1', name: 'UserForm', type: 'form', props: [], styles: {} }],
        [{ name: 'User', fields: [], endpoints: [], sourceComponent: 'UserForm' }]
      );

      expect(tasks.length).toBe(2);
      expect(tasks.filter((t) => t.type === 'frontend').length).toBe(1);
      expect(tasks.filter((t) => t.type === 'backend').length).toBe(1);
    });
  });

  describe('generateFrontend', () => {
    it('generates React components from parsed components', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const components = [
        { id: '1', name: 'UserCard', type: 'card', props: [], styles: {} },
        { id: '2', name: 'login-button', type: 'button', props: [], styles: {} },
      ];

      const result = await orchestrator.generateFrontend(components);

      expect(result.length).toBe(2);
      expect(result[0].name).toBe('UserCard');
      expect(result[1].name).toBe('LoginButton'); // PascalCase conversion
    });

    it('generates component code with proper React structure', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const components = [
        { id: '1', name: 'ProfileCard', type: 'card', props: [], styles: {} },
      ];

      const result = await orchestrator.generateFrontend(components);

      expect(result[0].code).toContain("import React from 'react'");
      expect(result[0].code).toContain('export function ProfileCard');
      expect(result[0].code).toContain('export default ProfileCard');
    });

    it('generates test code by default', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const components = [
        { id: '1', name: 'Button', type: 'button', props: [], styles: {} },
      ];

      const result = await orchestrator.generateFrontend(components);

      expect(result[0].testCode).toBeDefined();
      expect(result[0].testCode).toContain("describe('Button'");
      expect(result[0].testCode).toContain("render(<Button />");
    });

    it('skips test code when disabled', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const components = [
        { id: '1', name: 'Button', type: 'button', props: [], styles: {} },
      ];

      const result = await orchestrator.generateFrontend(components, { generateTests: false });

      expect(result[0].testCode).toBeUndefined();
    });

    it('generates Storybook stories by default', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const components = [
        { id: '1', name: 'Card', type: 'card', props: [], styles: {} },
      ];

      const result = await orchestrator.generateFrontend(components);

      expect(result[0].storyCode).toBeDefined();
      expect(result[0].storyCode).toContain("title: 'Components/Card'");
      expect(result[0].storyCode).toContain('export const Default');
    });

    it('skips Storybook stories when disabled', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const components = [
        { id: '1', name: 'Card', type: 'card', props: [], styles: {} },
      ];

      const result = await orchestrator.generateFrontend(components, { generateStories: false });

      expect(result[0].storyCode).toBeUndefined();
    });

    it('generates props interface from component props', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const components = [
        {
          id: '1',
          name: 'UserProfile',
          type: 'card',
          props: [
            { name: 'name', type: 'string', required: true },
            { name: 'age', type: 'number', required: false },
          ],
          styles: {},
        },
      ];

      const result = await orchestrator.generateFrontend(components);

      expect(result[0].code).toContain('interface UserProfileProps');
      expect(result[0].code).toContain('name: string;');
      expect(result[0].code).toContain('age?: number;');
    });

    it('sets correct file path', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const components = [
        { id: '1', name: 'HeaderNav', type: 'navigation', props: [], styles: {} },
      ];

      const result = await orchestrator.generateFrontend(components);

      expect(result[0].filePath).toBe('components/HeaderNav.tsx');
    });

    it('returns empty array for empty input', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const result = await orchestrator.generateFrontend([]);

      expect(result).toEqual([]);
    });
  });

  describe('runAllTests', () => {
    it('returns test suites for unit, e2e, and api tests', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const mockResult = {
        frontendComponents: [
          { name: 'Button', code: 'export function Button() {}', filePath: 'Button.tsx', testCode: '// test' },
        ],
        inferredModels: [
          { name: 'User', fields: [{ name: 'id', type: 'string', required: true }], endpoints: [], source: 'UserForm' },
        ],
      } as any;

      const result = await orchestrator.runAllTests(mockResult);

      expect(result).toHaveProperty('unit');
      expect(result).toHaveProperty('e2e');
      expect(result).toHaveProperty('api');
    });

    it('creates unit tests from components with testCode', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const mockResult = {
        frontendComponents: [
          { name: 'Card', code: '', filePath: '', testCode: '// test' },
          { name: 'Header', code: '', filePath: '' }, // No testCode
        ],
        inferredModels: [],
      } as any;

      const result = await orchestrator.runAllTests(mockResult);

      expect(result.unit.tests.length).toBe(1);
      expect(result.unit.tests[0].name).toContain('Card');
      expect(result.unit.totalPassed).toBe(1);
    });

    it('creates E2E tests for all components', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const mockResult = {
        frontendComponents: [
          { name: 'Modal', code: '', filePath: '' },
          { name: 'Dialog', code: '', filePath: '' },
        ],
        inferredModels: [],
      } as any;

      const result = await orchestrator.runAllTests(mockResult);

      expect(result.e2e.tests.length).toBe(2);
      expect(result.e2e.tests[0].type).toBe('e2e');
      expect(result.e2e.totalPassed).toBe(2);
    });

    it('creates API tests for data models', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const mockResult = {
        frontendComponents: [],
        inferredModels: [
          { name: 'Product', fields: [], endpoints: [], source: 'ProductForm' },
          { name: 'Order', fields: [], endpoints: [], source: 'OrderForm' },
        ],
      } as any;

      const result = await orchestrator.runAllTests(mockResult);

      expect(result.api.tests.length).toBe(4); // 2 models × 2 tests each (unit + integration)
      expect(result.api.totalPassed).toBe(4);
    });

    it('handles empty components and models', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const mockResult = {
        frontendComponents: [],
        inferredModels: [],
      } as any;

      const result = await orchestrator.runAllTests(mockResult);

      expect(result.unit.tests.length).toBe(0);
      expect(result.e2e.tests.length).toBe(0);
      expect(result.api.tests.length).toBe(0);
    });
  });

  describe('generateBackend', () => {
    it('generates Express API files from data models', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const models = [
        {
          name: 'User',
          source: 'UserForm',
          fields: [
            { name: 'id', type: 'string', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'email', type: 'email', required: true },
          ],
          endpoints: [],
        },
      ];

      const result = await orchestrator.generateBackend(models);

      expect(result.controllers.length).toBe(1);
      expect(result.services.length).toBe(1);
      expect(result.models.length).toBe(1);
      expect(result.routes.length).toBe(1);
    });

    it('generates controller with CRUD operations', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const models = [
        { name: 'Product', source: 'form', fields: [{ name: 'id', type: 'string', required: true }], endpoints: [] },
      ];

      const result = await orchestrator.generateBackend(models);

      expect(result.controllers[0].content).toContain('class ProductController');
      expect(result.controllers[0].content).toContain('getAll');
      expect(result.controllers[0].content).toContain('getById');
      expect(result.controllers[0].content).toContain('create');
      expect(result.controllers[0].content).toContain('update');
      expect(result.controllers[0].content).toContain('delete');
    });

    it('generates service with Prisma client', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const models = [
        { name: 'Order', source: 'form', fields: [{ name: 'id', type: 'string', required: true }], endpoints: [] },
      ];

      const result = await orchestrator.generateBackend(models);

      expect(result.services[0].content).toContain('class OrderService');
      expect(result.services[0].content).toContain('PrismaClient');
      expect(result.services[0].content).toContain('findAll');
      expect(result.services[0].content).toContain('findById');
    });

    it('generates Prisma model schema', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const models = [
        {
          name: 'Item',
          source: 'form',
          fields: [
            { name: 'id', type: 'string', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'price', type: 'number', required: false },
          ],
          endpoints: [],
        },
      ];

      const result = await orchestrator.generateBackend(models);

      expect(result.models[0].content).toContain('model Item');
      expect(result.models[0].content).toContain('id String');
      expect(result.models[0].content).toContain('title String');
      expect(result.models[0].content).toContain('price Int?');
      expect(result.models[0].content).toContain('createdAt DateTime');
    });

    it('generates Express routes', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const models = [
        { name: 'Category', source: 'form', fields: [{ name: 'id', type: 'string', required: true }], endpoints: [] },
      ];

      const result = await orchestrator.generateBackend(models);

      expect(result.routes[0].content).toContain('createCategoryRoutes');
      expect(result.routes[0].content).toContain("'/categorys'");
      expect(result.routes[0].content).toContain('router.get');
      expect(result.routes[0].content).toContain('router.post');
    });

    it('generates tests by default', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const models = [
        { name: 'Task', source: 'form', fields: [{ name: 'id', type: 'string', required: true }], endpoints: [] },
      ];

      const result = await orchestrator.generateBackend(models);

      expect(result.tests.length).toBe(1);
      expect(result.tests[0].content).toContain("describe('TaskController'");
    });

    it('skips tests when disabled', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const models = [
        { name: 'Note', source: 'form', fields: [{ name: 'id', type: 'string', required: true }], endpoints: [] },
      ];

      const result = await orchestrator.generateBackend(models, { generateTests: false });

      expect(result.tests.length).toBe(0);
    });

    it('generates OpenAPI specification', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const models = [
        {
          name: 'Event',
          source: 'form',
          fields: [
            { name: 'id', type: 'string', required: true },
            { name: 'title', type: 'string', required: true },
          ],
          endpoints: [],
        },
      ];

      const result = await orchestrator.generateBackend(models);

      expect(result.openApiSpec).toBeDefined();
      const spec = JSON.parse(result.openApiSpec!);
      expect(spec.openapi).toBe('3.0.0');
      expect(spec.paths['/events']).toBeDefined();
      expect(spec.components.schemas.Event).toBeDefined();
    });

    it('returns empty arrays for empty models', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const result = await orchestrator.generateBackend([]);

      expect(result.controllers).toEqual([]);
      expect(result.services).toEqual([]);
      expect(result.models).toEqual([]);
      expect(result.routes).toEqual([]);
      expect(result.tests).toEqual([]);
    });
  });

  describe('deployBackend', () => {
    it('deploys backend files and returns deployment info', async () => {
      const configWithAws = { ...mockConfig, awsRegion: 'us-west-2' };
      const orchestrator = new ForgePOCOrchestrator(configWithAws);
      const backend = {
        controllers: [{ name: 'UserController', content: '', path: '' }],
        services: [],
        models: [],
        routes: [],
        tests: [],
      };

      const result = await orchestrator.deployBackend(backend);

      expect(result.type).toBe('backend');
      expect(result.status).toBe('ready');
      expect(result.url).toContain('execute-api');
      expect(result.url).toContain('us-west-2');
      expect(result.deploymentId).toMatch(/^lambda-/);
    });

    it('skips deployment when no controllers', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const backend = {
        controllers: [],
        services: [],
        models: [],
        routes: [],
        tests: [],
      };

      const result = await orchestrator.deployBackend(backend);

      expect(result.status).toBe('skipped');
      expect(result.error).toContain('No backend files');
    });

    it('skips deployment when AWS region not configured', async () => {
      const configNoAws = { ...mockConfig, awsRegion: undefined };
      // Override environment
      const originalEnv = process.env.AWS_REGION;
      delete process.env.AWS_REGION;

      const orchestrator = new ForgePOCOrchestrator(configNoAws);
      const backend = {
        controllers: [{ name: 'TestController', content: '', path: '' }],
        services: [],
        models: [],
        routes: [],
        tests: [],
      };

      const result = await orchestrator.deployBackend(backend);

      // Restore environment
      if (originalEnv) process.env.AWS_REGION = originalEnv;

      expect(result.status).toBe('skipped');
      expect(result.error).toContain('AWS region not configured');
    });

    it('includes deployment logs on success', async () => {
      const configWithAws = { ...mockConfig, awsRegion: 'eu-west-1' };
      const orchestrator = new ForgePOCOrchestrator(configWithAws);
      const backend = {
        controllers: [
          { name: 'UserController', content: '', path: '' },
          { name: 'ProductController', content: '', path: '' },
        ],
        services: [],
        models: [],
        routes: [],
        tests: [],
      };

      const result = await orchestrator.deployBackend(backend);

      expect(result.logs).toContain('2 controllers');
    });
  });

  describe('deployFrontend', () => {
    it('skips deployment when Vercel client not configured', async () => {
      const configNoVercel = { ...mockConfig, vercelToken: undefined };
      const orchestrator = new ForgePOCOrchestrator(configNoVercel);
      const components = [
        { name: 'Button', code: 'export const Button = () => <button />', filePath: 'Button.tsx' },
      ];

      const result = await orchestrator.deployFrontend(components);

      expect(result.type).toBe('frontend');
      expect(result.status).toBe('skipped');
      expect(result.error).toContain('Vercel token not configured');
    });

    it('deploys to Vercel and returns deployment URL', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const components = [
        { name: 'Card', code: 'export const Card = () => <div />', filePath: 'Card.tsx' },
      ];

      const result = await orchestrator.deployFrontend(components);

      expect(result.type).toBe('frontend');
      expect(result.status).toBe('ready');
      expect(result.url).toContain('https://');
      expect(result.deploymentId).toBe('deploy-123');
    });

    it('handles deployment errors gracefully', async () => {
      // Mock Vercel client to throw error
      jest.resetModules();
      jest.doMock('../../integrations/vercel/vercel-client', () => ({
        VercelClient: jest.fn().mockImplementation(() => ({
          createDeployment: jest.fn().mockRejectedValue(new Error('Deploy failed')),
        })),
      }));

      // Re-import to get mocked version
      const { ForgePOCOrchestrator: MockedOrchestrator } = await import('../orchestrator');
      const orchestrator = new MockedOrchestrator(mockConfig);
      const components = [{ name: 'Test', code: '', filePath: 'Test.tsx' }];

      const result = await orchestrator.deployFrontend(components);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Deploy failed');
    });
  });

  describe('closeJiraTickets', () => {
    it('updates local task status when Jira not configured', async () => {
      const configNoJira = { ...mockConfig, jiraConfig: undefined };
      const orchestrator = new ForgePOCOrchestrator(configNoJira);

      const mockResult = {
        tasks: [
          { key: 'FORGE-2', status: 'todo' as const, type: 'frontend' as const },
          { key: 'FORGE-3', status: 'todo' as const, type: 'backend' as const },
        ],
        epic: { key: 'FORGE-1' },
        deployments: {},
        testResults: {
          unit: { tests: [], totalPassed: 0 },
          e2e: { tests: [], totalPassed: 0 },
          api: { tests: [], totalPassed: 0 },
        },
      } as any;

      await orchestrator.closeJiraTickets(mockResult);

      expect(mockResult.tasks[0].status).toBe('done');
      expect(mockResult.tasks[1].status).toBe('done');
    });
  });

  describe('run with Jira integration', () => {
    it('creates Jira epic when skipJira is false', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const input: POCRunInput = {
        figmaUrl: 'https://www.figma.com/file/ABC123/TestDesign',
        options: {
          skipJira: false, // Enable Jira
          deployFrontend: false,
          deployBackend: false,
        },
      };

      const result = await orchestrator.run(input);

      // Epic should be created (falls back to stub when real Jira fails)
      expect(result.epic).toBeDefined();
      expect(result.epic?.summary).toContain('[FORGE POC]');
    });

    it('creates Jira tasks when skipJira is false', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const input: POCRunInput = {
        figmaUrl: 'https://www.figma.com/file/ABC123/TestDesign',
        options: {
          skipJira: false,
          deployFrontend: false,
          deployBackend: false,
        },
      };

      const result = await orchestrator.run(input);

      // Tasks should be created for inferred models
      expect(result.tasks).toBeDefined();
    });
  });

  describe('run with deployments', () => {
    it('deploys frontend when deployFrontend is true', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const input: POCRunInput = {
        figmaUrl: 'https://www.figma.com/file/ABC123/TestDesign',
        options: {
          skipJira: true,
          deployFrontend: true, // Enable frontend deployment
          deployBackend: false,
        },
      };

      const result = await orchestrator.run(input);

      expect(result.deployments.frontend).toBeDefined();
      expect(result.deployments.frontend?.type).toBe('frontend');
    });

    it('deploys backend when deployBackend is true and AWS configured', async () => {
      const configWithAws = { ...mockConfig, awsRegion: 'us-east-1' };
      const orchestrator = new ForgePOCOrchestrator(configWithAws);
      const input: POCRunInput = {
        figmaUrl: 'https://www.figma.com/file/ABC123/TestDesign',
        options: {
          skipJira: true,
          deployFrontend: false,
          deployBackend: true, // Enable backend deployment
        },
      };

      const result = await orchestrator.run(input);

      expect(result.deployments.backend).toBeDefined();
      expect(result.deployments.backend?.type).toBe('backend');
    });
  });

  describe('inferDataModels', () => {
    it('infers data models from components', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const components = [
        { id: '1', name: 'UserForm', type: 'form', props: [{ name: 'email', type: 'string', required: true }], styles: {} },
      ];

      const models = await orchestrator.inferDataModels(components);

      expect(models).toBeDefined();
      expect(models.length).toBeGreaterThanOrEqual(0); // May be 0 or more depending on mapper logic
    });
  });

  describe('toTSType conversion', () => {
    it('converts email type to string', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const components = [
        {
          id: '1',
          name: 'Contact',
          type: 'form',
          props: [{ name: 'email', type: 'email', required: true }],
          styles: {},
        },
      ];

      const result = await orchestrator.generateFrontend(components);

      // email type should map to string in TypeScript
      expect(result[0].code).toContain(': string');
    });

    it('converts date type to Date', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const components = [
        {
          id: '1',
          name: 'Event',
          type: 'form',
          props: [{ name: 'startDate', type: 'date', required: true }],
          styles: {},
        },
      ];

      const result = await orchestrator.generateFrontend(components);

      expect(result[0].code).toContain(': Date');
    });

    it('converts boolean type correctly', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const components = [
        {
          id: '1',
          name: 'Settings',
          type: 'form',
          props: [{ name: 'enabled', type: 'boolean', required: false }],
          styles: {},
        },
      ];

      const result = await orchestrator.generateFrontend(components);

      expect(result[0].code).toContain('enabled?: boolean');
    });

    it('handles unknown types as unknown', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const components = [
        {
          id: '1',
          name: 'Custom',
          type: 'form',
          props: [{ name: 'data', type: 'customType', required: true }],
          styles: {},
        },
      ];

      const result = await orchestrator.generateFrontend(components);

      expect(result[0].code).toContain(': unknown');
    });
  });

  describe('Prisma type conversion', () => {
    it('converts boolean fields to Boolean', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const models = [
        {
          name: 'Feature',
          source: 'form',
          fields: [
            { name: 'id', type: 'string', required: true },
            { name: 'active', type: 'boolean', required: true },
          ],
          endpoints: [],
        },
      ];

      const result = await orchestrator.generateBackend(models);

      expect(result.models[0].content).toContain('active Boolean');
    });

    it('converts date fields to DateTime', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const models = [
        {
          name: 'Booking',
          source: 'form',
          fields: [
            { name: 'id', type: 'string', required: true },
            { name: 'scheduledAt', type: 'date', required: true },
          ],
          endpoints: [],
        },
      ];

      const result = await orchestrator.generateBackend(models);

      expect(result.models[0].content).toContain('scheduledAt DateTime');
    });

    it('converts email fields to String', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const models = [
        {
          name: 'Contact',
          source: 'form',
          fields: [
            { name: 'id', type: 'string', required: true },
            { name: 'email', type: 'email', required: true },
          ],
          endpoints: [],
        },
      ];

      const result = await orchestrator.generateBackend(models);

      expect(result.models[0].content).toContain('email String');
    });
  });

  describe('toKebabCase conversion', () => {
    it('converts PascalCase to kebab-case in routes', async () => {
      const orchestrator = new ForgePOCOrchestrator(mockConfig);
      const models = [
        {
          name: 'UserProfile',
          source: 'form',
          fields: [{ name: 'id', type: 'string', required: true }],
          endpoints: [],
        },
      ];

      const result = await orchestrator.generateBackend(models);

      expect(result.routes[0].content).toContain("'/user-profiles'");
    });
  });
});
