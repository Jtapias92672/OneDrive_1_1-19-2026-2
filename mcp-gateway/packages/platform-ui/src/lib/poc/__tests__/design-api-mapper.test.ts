/**
 * Tests for DesignAPIMapper
 */

import {
  DesignAPIMapper,
  createDesignAPIMapper,
  type DesignAPIMapperConfig,
} from '../design-api-mapper';
import type { ParsedComponent } from '../types';

describe('DesignAPIMapper', () => {
  describe('constructor', () => {
    it('creates instance with default config', () => {
      const mapper = new DesignAPIMapper();
      expect(mapper).toBeInstanceOf(DesignAPIMapper);
    });

    it('creates instance with custom config', () => {
      const mapper = new DesignAPIMapper({
        inferRelationships: false,
        generateSharedTypes: false,
      });
      expect(mapper).toBeInstanceOf(DesignAPIMapper);
    });
  });

  describe('createDesignAPIMapper', () => {
    it('creates mapper via factory', () => {
      const mapper = createDesignAPIMapper();
      expect(mapper).toBeInstanceOf(DesignAPIMapper);
    });

    it('creates mapper with config via factory', () => {
      const mapper = createDesignAPIMapper({ inferRelationships: false });
      expect(mapper).toBeInstanceOf(DesignAPIMapper);
    });
  });

  describe('classifyPattern', () => {
    it('classifies form patterns', () => {
      const mapper = new DesignAPIMapper();

      const formCases: ParsedComponent[] = [
        { id: '1', name: 'UserForm', type: 'form', props: [], styles: {} },
        { id: '2', name: 'ContactInput', type: 'container', props: [], styles: {} },
        { id: '3', name: 'CreateProduct', type: 'container', props: [], styles: {} },
        { id: '4', name: 'EditProfile', type: 'container', props: [], styles: {} },
        { id: '5', name: 'AddItem', type: 'container', props: [], styles: {} },
        { id: '6', name: 'NewUser', type: 'container', props: [], styles: {} },
      ];

      for (const component of formCases) {
        expect(mapper.classifyPattern(component)).toBe('form');
      }
    });

    it('classifies list patterns', () => {
      const mapper = new DesignAPIMapper();

      const listCases: ParsedComponent[] = [
        { id: '1', name: 'UserList', type: 'container', props: [], styles: {} },
        { id: '2', name: 'ProductTable', type: 'container', props: [], styles: {} },
        { id: '3', name: 'ItemGrid', type: 'container', props: [], styles: {} },
        { id: '4', name: 'OrderCollection', type: 'container', props: [], styles: {} },
        { id: '5', name: 'NewsFeed', type: 'container', props: [], styles: {} },
      ];

      for (const component of listCases) {
        expect(mapper.classifyPattern(component)).toBe('list');
      }
    });

    it('classifies detail patterns', () => {
      const mapper = new DesignAPIMapper();

      const detailCases: ParsedComponent[] = [
        { id: '1', name: 'UserDetail', type: 'container', props: [], styles: {} },
        { id: '2', name: 'ProductView', type: 'container', props: [], styles: {} },
        { id: '3', name: 'UserProfile', type: 'container', props: [], styles: {} },
        { id: '4', name: 'ItemCard', type: 'card', props: [], styles: {} },
        { id: '5', name: 'OrderPreview', type: 'container', props: [], styles: {} },
      ];

      for (const component of detailCases) {
        expect(mapper.classifyPattern(component)).toBe('detail');
      }
    });

    it('classifies dashboard patterns', () => {
      const mapper = new DesignAPIMapper();

      const dashboardCases: ParsedComponent[] = [
        { id: '1', name: 'SalesDashboard', type: 'container', props: [], styles: {} },
        { id: '2', name: 'Overview', type: 'container', props: [], styles: {} },
        { id: '3', name: 'StatsPanel', type: 'container', props: [], styles: {} },
        { id: '4', name: 'MetricsView', type: 'container', props: [], styles: {} },
        { id: '5', name: 'Summary', type: 'container', props: [], styles: {} },
      ];

      for (const component of dashboardCases) {
        expect(mapper.classifyPattern(component)).toBe('dashboard');
      }
    });

    it('classifies auth patterns', () => {
      const mapper = new DesignAPIMapper();

      const authCases: ParsedComponent[] = [
        { id: '1', name: 'LoginForm', type: 'form', props: [], styles: {} },
        { id: '2', name: 'SignupPage', type: 'container', props: [], styles: {} },
        { id: '3', name: 'RegisterUser', type: 'container', props: [], styles: {} },
        { id: '4', name: 'AuthModal', type: 'modal', props: [], styles: {} },
        { id: '5', name: 'SigninButton', type: 'button', props: [], styles: {} },
        { id: '6', name: 'PasswordReset', type: 'form', props: [], styles: {} },
      ];

      for (const component of authCases) {
        expect(mapper.classifyPattern(component)).toBe('auth');
      }
    });

    it('returns unknown for unrecognized patterns', () => {
      const mapper = new DesignAPIMapper();

      const unknownCases: ParsedComponent[] = [
        { id: '1', name: 'Button', type: 'button', props: [], styles: {} },
        { id: '2', name: 'Header', type: 'navigation', props: [], styles: {} },
        { id: '3', name: 'Footer', type: 'container', props: [], styles: {} },
      ];

      for (const component of unknownCases) {
        expect(mapper.classifyPattern(component)).toBe('unknown');
      }
    });
  });

  describe('inferResourceName', () => {
    it('extracts resource name from component name', () => {
      const mapper = new DesignAPIMapper();

      expect(mapper.inferResourceName({ id: '1', name: 'UserForm', type: 'form', props: [], styles: {} })).toBe('User');
      expect(mapper.inferResourceName({ id: '2', name: 'ProductList', type: 'container', props: [], styles: {} })).toBe('Product');
      expect(mapper.inferResourceName({ id: '3', name: 'OrderTable', type: 'container', props: [], styles: {} })).toBe('Order');
      expect(mapper.inferResourceName({ id: '4', name: 'ItemCard', type: 'card', props: [], styles: {} })).toBe('Item');
      expect(mapper.inferResourceName({ id: '5', name: 'ProfileView', type: 'container', props: [], styles: {} })).toBe('Profile');
    });

    it('handles login/signin as Auth resource', () => {
      const mapper = new DesignAPIMapper();

      expect(mapper.inferResourceName({ id: '1', name: 'LoginForm', type: 'form', props: [], styles: {} })).toBe('Auth');
      expect(mapper.inferResourceName({ id: '2', name: 'SigninPage', type: 'container', props: [], styles: {} })).toBe('Auth');
    });

    it('handles signup/register as User resource', () => {
      const mapper = new DesignAPIMapper();

      expect(mapper.inferResourceName({ id: '1', name: 'SignupForm', type: 'form', props: [], styles: {} })).toBe('User');
      expect(mapper.inferResourceName({ id: '2', name: 'RegisterPage', type: 'container', props: [], styles: {} })).toBe('User');
    });

    it('returns Resource for empty extraction', () => {
      const mapper = new DesignAPIMapper();

      expect(mapper.inferResourceName({ id: '1', name: 'Form', type: 'form', props: [], styles: {} })).toBe('Resource');
      expect(mapper.inferResourceName({ id: '2', name: 'List', type: 'container', props: [], styles: {} })).toBe('Resource');
    });
  });

  describe('inferFieldType', () => {
    it('infers email type from field name', () => {
      const mapper = new DesignAPIMapper();

      expect(mapper.inferFieldType('email')).toBe('email');
      expect(mapper.inferFieldType('userEmail')).toBe('email');
      expect(mapper.inferFieldType('contactMail')).toBe('email');
    });

    it('infers number type from field name', () => {
      const mapper = new DesignAPIMapper();

      expect(mapper.inferFieldType('age')).toBe('number');
      expect(mapper.inferFieldType('count')).toBe('number');
      expect(mapper.inferFieldType('quantity')).toBe('number');
      expect(mapper.inferFieldType('price')).toBe('number');
      expect(mapper.inferFieldType('totalAmount')).toBe('number');
    });

    it('infers boolean type from field name', () => {
      const mapper = new DesignAPIMapper();

      expect(mapper.inferFieldType('active')).toBe('boolean');
      expect(mapper.inferFieldType('isEnabled')).toBe('boolean');
      expect(mapper.inferFieldType('isVisible')).toBe('boolean');
      expect(mapper.inferFieldType('checked')).toBe('boolean');
    });

    it('infers date type from field name', () => {
      const mapper = new DesignAPIMapper();

      expect(mapper.inferFieldType('date')).toBe('date');
      expect(mapper.inferFieldType('createdDate')).toBe('date');
      expect(mapper.inferFieldType('startTime')).toBe('date');
      expect(mapper.inferFieldType('datetime')).toBe('date');
    });

    it('uses prop type when available', () => {
      const mapper = new DesignAPIMapper();

      expect(mapper.inferFieldType('customField', 'number')).toBe('number');
      expect(mapper.inferFieldType('customField', 'integer')).toBe('number');
      expect(mapper.inferFieldType('customField', 'boolean')).toBe('boolean');
      expect(mapper.inferFieldType('customField', 'Date')).toBe('date');
    });

    it('defaults to string for unknown fields', () => {
      const mapper = new DesignAPIMapper();

      expect(mapper.inferFieldType('customField')).toBe('string');
      expect(mapper.inferFieldType('unknownProp')).toBe('string');
    });
  });

  describe('generateEndpoints', () => {
    it('generates POST/PUT for form pattern', () => {
      const mapper = new DesignAPIMapper();
      const endpoints = mapper.generateEndpoints('User', 'form');

      expect(endpoints).toContainEqual({ method: 'POST', path: '/users' });
      expect(endpoints).toContainEqual({ method: 'PUT', path: '/users/:id' });
    });

    it('generates GET for list pattern', () => {
      const mapper = new DesignAPIMapper();
      const endpoints = mapper.generateEndpoints('Product', 'list');

      expect(endpoints).toContainEqual({ method: 'GET', path: '/products' });
    });

    it('generates GET/:id for detail pattern', () => {
      const mapper = new DesignAPIMapper();
      const endpoints = mapper.generateEndpoints('Order', 'detail');

      expect(endpoints).toContainEqual({ method: 'GET', path: '/orders/:id' });
    });

    it('generates auth endpoints for auth pattern', () => {
      const mapper = new DesignAPIMapper();
      const endpoints = mapper.generateEndpoints('Auth', 'auth');

      expect(endpoints).toContainEqual({ method: 'POST', path: '/auth/login' });
      expect(endpoints).toContainEqual({ method: 'POST', path: '/auth/logout' });
    });

    it('generates stats endpoint for dashboard pattern', () => {
      const mapper = new DesignAPIMapper();
      const endpoints = mapper.generateEndpoints('Sales', 'dashboard');

      expect(endpoints).toContainEqual({ method: 'GET', path: '/saless/stats' });
    });

    it('generates full CRUD for unknown pattern', () => {
      const mapper = new DesignAPIMapper();
      const endpoints = mapper.generateEndpoints('Item', 'unknown');

      expect(endpoints.length).toBe(5);
      expect(endpoints).toContainEqual({ method: 'GET', path: '/items' });
      expect(endpoints).toContainEqual({ method: 'GET', path: '/items/:id' });
      expect(endpoints).toContainEqual({ method: 'POST', path: '/items' });
      expect(endpoints).toContainEqual({ method: 'PUT', path: '/items/:id' });
      expect(endpoints).toContainEqual({ method: 'DELETE', path: '/items/:id' });
    });
  });

  describe('infer', () => {
    it('infers models from parsed components', () => {
      const mapper = new DesignAPIMapper();
      const components: ParsedComponent[] = [
        {
          id: '1',
          name: 'UserForm',
          type: 'form',
          props: [
            { name: 'email', type: 'string', required: true },
            { name: 'age', type: 'number', required: false },
          ],
          styles: {},
        },
      ];

      const result = mapper.infer(components);

      expect(result.models.length).toBe(1);
      expect(result.models[0].name).toBe('User');
      expect(result.models[0].fields).toContainEqual(
        expect.objectContaining({ name: 'email', type: 'email' })
      );
    });

    it('groups components by resource', () => {
      const mapper = new DesignAPIMapper();
      const components: ParsedComponent[] = [
        { id: '1', name: 'UserForm', type: 'form', props: [], styles: {} },
        { id: '2', name: 'UserList', type: 'container', props: [], styles: {} },
        { id: '3', name: 'ProductCard', type: 'card', props: [], styles: {} },
      ];

      const result = mapper.infer(components);

      expect(result.models.length).toBe(2);
      expect(result.models.map((m) => m.name)).toContain('User');
      expect(result.models.map((m) => m.name)).toContain('Product');
    });

    it('generates shared types', () => {
      const mapper = new DesignAPIMapper();
      const components: ParsedComponent[] = [
        {
          id: '1',
          name: 'UserForm',
          type: 'form',
          props: [{ name: 'name', type: 'string', required: true }],
          styles: {},
        },
      ];

      const result = mapper.infer(components);

      expect(result.sharedTypes).toContain('export interface User');
      expect(result.sharedTypes).toContain('name: string');
    });

    it('skips shared types when disabled', () => {
      const mapper = new DesignAPIMapper({ generateSharedTypes: false });
      const components: ParsedComponent[] = [
        { id: '1', name: 'UserForm', type: 'form', props: [], styles: {} },
      ];

      const result = mapper.infer(components);

      expect(result.sharedTypes).toBe('');
    });

    it('returns suggestions for low-confidence models', () => {
      const mapper = new DesignAPIMapper();
      const components: ParsedComponent[] = [
        { id: '1', name: 'Button', type: 'button', props: [], styles: {} },
      ];

      const result = mapper.infer(components);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(0.7);
    });

    it('filters out React props from fields', () => {
      const mapper = new DesignAPIMapper();
      const components: ParsedComponent[] = [
        {
          id: '1',
          name: 'UserForm',
          type: 'form',
          props: [
            { name: 'className', type: 'string', required: false },
            { name: 'onClick', type: 'function', required: false },
            { name: 'children', type: 'ReactNode', required: false },
            { name: 'email', type: 'string', required: true },
          ],
          styles: {},
        },
      ];

      const result = mapper.infer(components);

      const fieldNames = result.models[0].fields.map((f) => f.name);
      expect(fieldNames).toContain('email');
      expect(fieldNames).not.toContain('className');
      expect(fieldNames).not.toContain('onClick');
      expect(fieldNames).not.toContain('children');
    });

    it('infers relationships between models', () => {
      const mapper = new DesignAPIMapper({ inferRelationships: true });
      const components: ParsedComponent[] = [
        {
          id: '1',
          name: 'OrderForm',
          type: 'form',
          props: [{ name: 'userId', type: 'string', required: true }],
          styles: {},
        },
        {
          id: '2',
          name: 'UserCard',
          type: 'card',
          props: [],
          styles: {},
        },
      ];

      const result = mapper.infer(components);

      const orderModel = result.models.find((m) => m.name === 'Order');
      const userIdField = orderModel?.fields.find((f) => f.name === 'userId');
      expect(userIdField?.type).toBe("User['id']");
    });

    it('adds default fields based on pattern', () => {
      const mapper = new DesignAPIMapper();
      const components: ParsedComponent[] = [
        { id: '1', name: 'LoginForm', type: 'form', props: [], styles: {} },
      ];

      const result = mapper.infer(components);

      const authModel = result.models.find((m) => m.name === 'Auth');
      const fieldNames = authModel?.fields.map((f) => f.name) || [];
      expect(fieldNames).toContain('email');
      expect(fieldNames).toContain('password');
    });

    it('handles empty components array', () => {
      const mapper = new DesignAPIMapper();
      const result = mapper.infer([]);

      expect(result.models).toEqual([]);
      expect(result.confidence).toBe(0);
    });
  });
});
