# CC Directive: Functional Verification for Code Generators

## Objective
Verify that controller-builder.ts and route-builder.ts **generate correct, functional code** for ALL config combinations — not just hit coverage numbers.

## Philosophy
> "Focus on code functionality, verify and validate as a guiding light, not the number of tests"

## Functional Capabilities to Verify

### controller-builder.ts

**Capability 1: Non-Zod Validation**
When `validationLibrary: 'joi'` or `validationLibrary: 'none'`:
- Generated create method should NOT contain `.parse(req.body)`
- Generated update method should NOT contain `.parse(req.body)`
- Generated code should pass directly `req.body` to service

**Verify:** Generate a controller with `validationLibrary: 'none'`, then confirm:
```typescript
// EXPECTED OUTPUT (no zod):
const result = await this.userService.create(req.body);

// NOT THIS (zod):
const validated = createUserSchema.parse(req.body);
const result = await this.userService.create(validated);
```

**Capability 2: Hard Delete**
When `useSoftDelete: false`:
- Generated delete method should call `.delete(id)` NOT `.softDelete(id)`
- No deletedAt filtering in queries

**Verify:** Generate a controller with `useSoftDelete: false`, then confirm:
```typescript
// EXPECTED OUTPUT (hard delete):
const result = await this.userService.delete(id);

// NOT THIS (soft delete):
const result = await this.userService.softDelete(id);
```

### route-builder.ts

**Capability 3: Default Auth Middleware**
When route has NO custom middleware AND `authMethod: 'jwt'` AND method is POST/PUT/DELETE:
- Generated route should include `authenticate` middleware automatically

**Verify:** Generate routes with `authMethod: 'jwt'` and no custom middleware:
```typescript
// EXPECTED OUTPUT:
router.post('/users', authenticate, controller.create);

// NOT THIS (missing auth):
router.post('/users', controller.create);
```

**Capability 4: Routes Without Description**
When route definition has no `description` field:
- Generated route should NOT have a comment prefix
- Route should still be syntactically correct

**Verify:** Generate route without description:
```typescript
// EXPECTED OUTPUT (no comment):
router.get('/users', controller.findAll);

// NOT THIS (with comment):
// Get all users
router.get('/users', controller.findAll);
```

## Verification Approach

For each capability:

1. **Generate** the code with the specific config
2. **Inspect** the output string
3. **Assert** the expected patterns exist/don't exist
4. **Confirm** the generated code is syntactically valid

Example test structure:
```typescript
describe('controller-builder functional verification', () => {
  describe('Capability: Non-Zod validation paths', () => {
    it('should generate direct req.body usage when validationLibrary is none', () => {
      const builder = new ControllerBuilder(contextWithNoValidation);
      const output = builder.build(testEntity);

      // Functional assertion: code uses req.body directly
      expect(output).toContain('await this.userService.create(req.body)');
      expect(output).not.toContain('.parse(req.body)');
    });
  });

  describe('Capability: Hard delete', () => {
    it('should generate .delete() call when useSoftDelete is false', () => {
      const builder = new ControllerBuilder(contextWithHardDelete);
      const output = builder.build(testEntity);

      // Functional assertion: code calls delete, not softDelete
      expect(output).toContain('.delete(id)');
      expect(output).not.toContain('.softDelete(id)');
    });
  });
});
```

## Execution

```bash
cd packages/express-generator
npm run test:coverage
```

## Success Criteria

**NOT THIS:** "Branch coverage is now 85%"

**THIS:**
- ✅ Non-zod controllers generate working code without schema validation
- ✅ Hard-delete controllers call .delete() not .softDelete()
- ✅ JWT-protected routes include authenticate middleware by default
- ✅ Routes without descriptions render without comment prefixes
- ✅ All generated code is syntactically valid TypeScript

Report: For each capability, show the generated code snippet proving it works.
