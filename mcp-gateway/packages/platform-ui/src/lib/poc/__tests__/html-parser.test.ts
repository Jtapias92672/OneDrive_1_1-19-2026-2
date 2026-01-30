/**
 * @jest-environment jsdom
 */

/**
 * Tests for HTMLParser
 */

import { HTMLParser, createHTMLParser } from '../html-parser';
import type { ParsedComponent } from '../types';

describe('HTMLParser', () => {
  describe('constructor', () => {
    it('creates instance with default config', () => {
      const parser = new HTMLParser();
      expect(parser).toBeInstanceOf(HTMLParser);
    });

    it('creates instance with custom config', () => {
      const parser = new HTMLParser({
        extractStyles: false,
        maxDepth: 5,
      });
      expect(parser).toBeInstanceOf(HTMLParser);
    });
  });

  describe('createHTMLParser factory', () => {
    it('creates parser via factory function', () => {
      const parser = createHTMLParser();
      expect(parser).toBeInstanceOf(HTMLParser);
    });

    it('creates parser with config via factory', () => {
      const parser = createHTMLParser({ extractDataAttributes: false });
      expect(parser).toBeInstanceOf(HTMLParser);
    });
  });

  describe('parse', () => {
    it('parses empty HTML', () => {
      const parser = new HTMLParser();
      const result = parser.parse('<html><body></body></html>');

      expect(result.components).toEqual([]);
      expect(result.metadata.totalElements).toBe(0);
      expect(result.metadata.extractedComponents).toBe(0);
    });

    it('extracts title from HTML', () => {
      const parser = new HTMLParser();
      const result = parser.parse('<html><head><title>My Dashboard</title></head><body></body></html>');

      expect(result.metadata.title).toBe('My Dashboard');
    });

    it('uses Untitled when no title present', () => {
      const parser = new HTMLParser();
      const result = parser.parse('<html><body></body></html>');

      expect(result.metadata.title).toBe('Untitled');
    });

    it('extracts semantic elements', () => {
      const parser = new HTMLParser();
      const html = `
        <html><body>
          <header>Header</header>
          <nav>Navigation</nav>
          <main>Main content</main>
          <footer>Footer</footer>
        </body></html>
      `;

      const result = parser.parse(html);

      expect(result.components.length).toBeGreaterThanOrEqual(4);
      const types = result.components.map(c => c.type);
      expect(types).toContain('navigation');
      expect(types).toContain('container');
    });

    it('extracts form elements', () => {
      const parser = new HTMLParser();
      const html = `
        <html><body>
          <form id="loginForm">
            <input type="email" placeholder="Email" />
            <input type="password" placeholder="Password" />
            <button type="submit">Login</button>
          </form>
        </body></html>
      `;

      const result = parser.parse(html);

      const form = result.components.find(c => c.type === 'form');
      expect(form).toBeDefined();
      expect(form?.name).toBe('LoginForm');
    });

    it('extracts buttons', () => {
      const parser = new HTMLParser();
      const html = `
        <html><body>
          <button id="submitBtn">Submit</button>
          <a href="#" role="button">Click me</a>
        </body></html>
      `;

      const result = parser.parse(html);

      const buttons = result.components.filter(c => c.type === 'button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('extracts cards from class patterns', () => {
      const parser = new HTMLParser();
      const html = `
        <html><body>
          <div class="card user-card">
            <h3>User Name</h3>
            <p>User details</p>
          </div>
        </body></html>
      `;

      const result = parser.parse(html);

      const card = result.components.find(c => c.type === 'card');
      expect(card).toBeDefined();
    });

    it('extracts navigation from class patterns', () => {
      const parser = new HTMLParser();
      const html = `
        <html><body>
          <div class="sidebar-nav">
            <a href="#">Link 1</a>
            <a href="#">Link 2</a>
          </div>
        </body></html>
      `;

      const result = parser.parse(html);

      const nav = result.components.find(c => c.type === 'navigation');
      expect(nav).toBeDefined();
    });

    it('extracts modals from class patterns', () => {
      const parser = new HTMLParser();
      const html = `
        <html><body>
          <div class="modal-dialog">
            <div class="modal-content">Modal content</div>
          </div>
        </body></html>
      `;

      const result = parser.parse(html);

      const modal = result.components.find(c => c.type === 'modal');
      expect(modal).toBeDefined();
    });
  });

  describe('component naming', () => {
    it('uses ID for component name', () => {
      const parser = new HTMLParser();
      const html = '<html><body><button id="saveButton">Save</button></body></html>';

      const result = parser.parse(html);
      const button = result.components.find(c => c.type === 'button');

      expect(button?.name).toBe('SaveButton');
    });

    it('uses aria-label for component name', () => {
      const parser = new HTMLParser();
      const html = '<html><body><button aria-label="close dialog">X</button></body></html>';

      const result = parser.parse(html);
      const button = result.components.find(c => c.type === 'button');

      expect(button?.name).toBe('CloseDialog');
    });

    it('uses class for component name when no ID', () => {
      const parser = new HTMLParser();
      const html = '<html><body><div class="user-profile-card content">Content</div></body></html>';

      const result = parser.parse(html);

      expect(result.components.some(c => c.name.includes('UserProfileCard'))).toBe(true);
    });

    it('converts names to PascalCase', () => {
      const parser = new HTMLParser();
      const html = '<html><body><div id="my-component-name" class="test">Test</div></body></html>';

      const result = parser.parse(html);

      expect(result.components.some(c => c.name === 'MyComponentName')).toBe(true);
    });
  });

  describe('props extraction', () => {
    it('extracts input props', () => {
      const parser = new HTMLParser();
      const html = `
        <html><body>
          <input type="email" placeholder="Enter email" required />
        </body></html>
      `;

      const result = parser.parse(html);
      const input = result.components.find(c => c.type === 'input');

      expect(input?.props).toContainEqual(
        expect.objectContaining({ name: 'type', defaultValue: 'email' })
      );
      expect(input?.props).toContainEqual(
        expect.objectContaining({ name: 'placeholder', defaultValue: 'Enter email' })
      );
      expect(input?.props).toContainEqual(
        expect.objectContaining({ name: 'required', type: 'boolean' })
      );
    });

    it('extracts button onClick prop', () => {
      const parser = new HTMLParser();
      const html = '<html><body><button>Click</button></body></html>';

      const result = parser.parse(html);
      const button = result.components.find(c => c.type === 'button');

      expect(button?.props).toContainEqual(
        expect.objectContaining({ name: 'onClick', type: 'function' })
      );
    });

    it('extracts data attributes as props', () => {
      const parser = new HTMLParser();
      const html = '<html><body><div class="card" data-user-id="123" data-active="true">Card</div></body></html>';

      const result = parser.parse(html);
      const card = result.components.find(c => c.type === 'card');

      expect(card?.props).toContainEqual(
        expect.objectContaining({ name: 'userId', defaultValue: '123' })
      );
      expect(card?.props).toContainEqual(
        expect.objectContaining({ name: 'active', type: 'boolean' })
      );
    });

    it('extracts children prop from text content', () => {
      const parser = new HTMLParser();
      const html = '<html><body><button>Submit Form</button></body></html>';

      const result = parser.parse(html);
      const button = result.components.find(c => c.type === 'button');

      expect(button?.props).toContainEqual(
        expect.objectContaining({ name: 'children', defaultValue: 'Submit Form' })
      );
    });

    it('skips data attributes when disabled', () => {
      const parser = new HTMLParser({ extractDataAttributes: false });
      const html = '<html><body><div class="card" data-user-id="123">Card</div></body></html>';

      const result = parser.parse(html);
      const card = result.components.find(c => c.type === 'card');

      expect(card?.props.find(p => p.name === 'userId')).toBeUndefined();
    });
  });

  describe('styles extraction', () => {
    it('extracts flex layout from classes', () => {
      const parser = new HTMLParser();
      // Use a card class to ensure component extraction, plus flex for layout
      const html = '<html><body><div class="card flex items-center">Flex container content here</div></body></html>';

      const result = parser.parse(html);
      const flexContainer = result.components.find(c => c.styles.layout === 'flex');

      expect(flexContainer).toBeDefined();
    });

    it('extracts grid layout from classes', () => {
      const parser = new HTMLParser();
      const html = '<html><body><div class="grid grid-cols-3">Grid container</div></body></html>';

      const result = parser.parse(html);
      const gridContainer = result.components.find(c => c.styles.layout === 'grid');

      expect(gridContainer).toBeDefined();
    });

    it('extracts spacing from Tailwind classes', () => {
      const parser = new HTMLParser();
      const html = '<html><body><div class="card p-4">Card with padding</div></body></html>';

      const result = parser.parse(html);
      const card = result.components.find(c => c.type === 'card');

      expect(card?.styles.spacing).toBe(16); // p-4 = 4 * 4 = 16px
    });

    it('extracts colors from inline styles', () => {
      const parser = new HTMLParser();
      const html = '<html><body><div class="card" style="background-color: #ff0000;">Red card</div></body></html>';

      const result = parser.parse(html);
      const card = result.components.find(c => c.type === 'card');

      expect(card?.styles.colors).toContain('#ff0000');
    });

    it('skips styles when disabled', () => {
      const parser = new HTMLParser({ extractStyles: false });
      const html = '<html><body><div class="flex p-4 card">Content</div></body></html>';

      const result = parser.parse(html);
      const card = result.components.find(c => c.type === 'card');

      expect(card?.styles).toEqual({});
    });
  });

  describe('nesting and depth', () => {
    it('respects maxDepth config', () => {
      const parser = new HTMLParser({ maxDepth: 1 });
      const html = `
        <html><body>
          <section>
            <div class="card">
              <div class="nested">
                <div class="deeply-nested">Deep</div>
              </div>
            </div>
          </section>
        </body></html>
      `;

      const result = parser.parse(html);

      // Should not extract deeply nested components
      expect(result.components.filter(c => c.name.includes('DeeplyNested')).length).toBe(0);
    });

    it('extracts child IDs', () => {
      const parser = new HTMLParser();
      const html = `
        <html><body>
          <form id="userForm">
            <input id="emailInput" type="email" />
            <button id="submitBtn">Submit</button>
          </form>
        </body></html>
      `;

      const result = parser.parse(html);
      const form = result.components.find(c => c.name === 'UserForm');

      expect(form?.children).toBeDefined();
      expect((form?.children as string[]).length).toBeGreaterThan(0);
    });
  });

  describe('real-world HTML patterns', () => {
    it('parses a dashboard layout', () => {
      const parser = new HTMLParser();
      const html = `
        <html>
        <head><title>Dashboard</title></head>
        <body>
          <header class="main-header">
            <nav class="top-nav">
              <a href="/">Home</a>
              <a href="/settings">Settings</a>
            </nav>
          </header>
          <main class="dashboard-content">
            <section class="stats-grid grid">
              <div class="card stat-card">
                <h3>Users</h3>
                <span class="value">1,234</span>
              </div>
              <div class="card stat-card">
                <h3>Revenue</h3>
                <span class="value">$56,789</span>
              </div>
            </section>
            <section class="recent-activity">
              <h2>Recent Activity</h2>
              <ul class="activity-list">
                <li>User signed up</li>
                <li>Order placed</li>
              </ul>
            </section>
          </main>
        </body>
        </html>
      `;

      const result = parser.parse(html);

      expect(result.metadata.title).toBe('Dashboard');

      // Helper: Count all components recursively
      const countAllComponents = (components: any[]): number => {
        let count = components.length;
        for (const comp of components) {
          if (Array.isArray(comp.children)) {
            count += countAllComponents(comp.children);
          }
        }
        return count;
      };

      // Helper: Search recursively
      const findComponent = (components: any[], predicate: (c: any) => boolean): any => {
        for (const comp of components) {
          if (predicate(comp)) return comp;
          if (Array.isArray(comp.children)) {
            const found = findComponent(comp.children, predicate);
            if (found) return found;
          }
        }
        return undefined;
      };

      // Should extract >5 total components (counting nested)
      expect(countAllComponents(result.components)).toBeGreaterThan(5);

      // Should have navigation
      const nav = findComponent(result.components, c => c.type === 'navigation');
      expect(nav).toBeDefined();

      // Helper: Find all matching components recursively
      const findAllComponents = (components: any[], predicate: (c: any) => boolean): any[] => {
        let results: any[] = [];
        for (const comp of components) {
          if (predicate(comp)) results.push(comp);
          if (Array.isArray(comp.children)) {
            results = results.concat(findAllComponents(comp.children, predicate));
          }
        }
        return results;
      };

      // Should have cards
      const cards = findAllComponents(result.components, c => c.type === 'card');
      expect(cards.length).toBeGreaterThanOrEqual(2);

      // Should have list
      const list = findComponent(result.components, c => c.type === 'list');
      expect(list).toBeDefined();
    });

    it('parses a login form', () => {
      const parser = new HTMLParser();
      const html = `
        <html>
        <head><title>Login</title></head>
        <body>
          <div class="login-container">
            <form id="loginForm" class="login-form">
              <h1>Sign In</h1>
              <div class="form-group">
                <label for="email">Email</label>
                <input id="email" type="email" placeholder="Enter your email" required />
              </div>
              <div class="form-group">
                <label for="password">Password</label>
                <input id="password" type="password" placeholder="Enter password" required />
              </div>
              <button type="submit" class="btn btn-primary">Login</button>
              <a href="/forgot-password">Forgot password?</a>
            </form>
          </div>
        </body>
        </html>
      `;

      const result = parser.parse(html);

      expect(result.metadata.title).toBe('Login');

      // Helper: Search recursively through component tree
      const findComponent = (components: any[], predicate: (c: any) => boolean): any => {
        for (const comp of components) {
          if (predicate(comp)) return comp;
          if (Array.isArray(comp.children)) {
            const found = findComponent(comp.children, predicate);
            if (found) return found;
          }
        }
        return undefined;
      };

      // Should have form (searches recursively since hierarchy is preserved)
      const form = findComponent(result.components, c => c.type === 'form');
      expect(form).toBeDefined();
      expect(form?.name).toBe('LoginForm');

      // Helper: Find all matching components recursively
      const findAllComponents = (components: any[], predicate: (c: any) => boolean): any[] => {
        let results: any[] = [];
        for (const comp of components) {
          if (predicate(comp)) results.push(comp);
          if (Array.isArray(comp.children)) {
            results = results.concat(findAllComponents(comp.children, predicate));
          }
        }
        return results;
      };

      // Should have inputs (searches recursively)
      const inputs = findAllComponents(result.components, c => c.type === 'input');
      expect(inputs.length).toBeGreaterThanOrEqual(2);

      // Email input should have correct props
      const emailInput = findComponent(result.components, c => c.name === 'Email');
      expect(emailInput?.props).toContainEqual(
        expect.objectContaining({ name: 'type', defaultValue: 'email' })
      );
    });

    it('parses a data table', () => {
      const parser = new HTMLParser();
      const html = `
        <html><body>
          <section class="data-section">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>John</td><td>john@example.com</td><td>Active</td></tr>
                <tr><td>Jane</td><td>jane@example.com</td><td>Pending</td></tr>
              </tbody>
            </table>
          </section>
        </body></html>
      `;

      const result = parser.parse(html);

      // Helper: Search recursively (tables may be nested in containers)
      const findComponent = (components: any[], predicate: (c: any) => boolean): any => {
        for (const comp of components) {
          if (predicate(comp)) return comp;
          if (Array.isArray(comp.children)) {
            const found = findComponent(comp.children, predicate);
            if (found) return found;
          }
        }
        return undefined;
      };

      const table = findComponent(result.components, c => c.type === 'list');
      expect(table).toBeDefined();
    });
  });

  describe('integration with orchestrator types', () => {
    it('produces valid ParsedComponent format', () => {
      const parser = new HTMLParser();
      const html = `
        <html><body>
          <form id="contactForm">
            <input type="text" name="name" required />
            <button type="submit">Send</button>
          </form>
        </body></html>
      `;

      const result = parser.parse(html);

      for (const component of result.components) {
        // Verify required fields
        expect(component).toHaveProperty('id');
        expect(component).toHaveProperty('name');
        expect(component).toHaveProperty('type');
        expect(component).toHaveProperty('props');
        expect(component).toHaveProperty('styles');

        // Verify types
        expect(typeof component.id).toBe('string');
        expect(typeof component.name).toBe('string');
        expect(typeof component.type).toBe('string');
        expect(Array.isArray(component.props)).toBe(true);
        expect(typeof component.styles).toBe('object');

        // Verify props format
        for (const prop of component.props) {
          expect(prop).toHaveProperty('name');
          expect(prop).toHaveProperty('type');
          expect(prop).toHaveProperty('required');
        }
      }
    });
  });
});
