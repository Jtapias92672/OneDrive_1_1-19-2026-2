/**
 * Debug test: What does html-parser actually return for login form?
 */

import { HTMLParser } from '@/lib/poc/html-parser';

describe('Debug: Form Extraction', () => {
  it('should show what gets extracted from login form HTML', () => {
    const parser = new HTMLParser();

    const html = `
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
    `;

    const result = parser.parse(html);

    console.log('[Debug] Total components extracted:', result.components.length);
    console.log('[Debug] Component structure:', JSON.stringify(result.components, null, 2));

    // What do we actually get?
    result.components.forEach((comp, i) => {
      console.log(`[Debug] Component ${i}:`, {
        name: comp.name,
        type: comp.type,
        hasChildren: Array.isArray(comp.children) && comp.children.length > 0,
        childCount: Array.isArray(comp.children) ? comp.children.length : 0,
      });
    });

    // Can we find the form?
    const form = result.components.find(c => c.type === 'form');
    console.log('[Debug] Found form at top level?', form ? 'YES' : 'NO');
    console.log('[Debug] Form details:', form);

    // Are there nested components?
    if (result.components[0] && Array.isArray(result.components[0].children)) {
      console.log('[Debug] First component has children:', result.components[0].children.length);
    }
  });
});
