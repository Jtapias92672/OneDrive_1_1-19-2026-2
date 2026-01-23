---
name: api-contracts
description: Enforce contract-first API development with automatic breaking change detection. Use when designing APIs, modifying existing endpoints, integrating services, or validating consumer/provider compatibility. Blocks incompatible changes from merging. Supports OpenAPI and GraphQL schemas.
---

# API Contracts Skill

```yaml
skill:
  name: api-contracts
  version: 1.0
  priority: P1
  lifecycle_stage:
    - planning
    - development
    - verification
  triggers:
    - New API endpoint being designed
    - Existing API endpoint modification
    - Service integration point established
    - Consumer/provider contract negotiation
    - Breaking change detection in PR
    - "What's the API for..." question asked
  blocks_without:
    - Schema file updated BEFORE implementation
    - Breaking change documented and approved
    - contract-diff.json reviewed for incompatibilities
    - Consumer notification for breaking changes
  inputs:
    required:
      - API endpoint requirements
      - Request/response data structures
      - Authentication requirements
    optional:
      - Existing schema files
      - Consumer list
      - Deprecation timeline
  outputs:
    required:
      - openapi.yaml OR schema.graphql
      - contract-diff.json (change detection)
      - API_CHANGELOG.md
  responsibilities:
    - Schema-first API design
    - Breaking change detection
    - Contract versioning
    - Consumer compatibility validation
    - API documentation generation
  non_responsibilities:
    - API implementation (see domain-memory-pattern)
    - Authentication implementation (see security-compliance)
    - Performance requirements (see performance-budgets)
    - Deployment (see deployment-readiness)
```

---

## Procedure

### Step 1: Contract-First Design

**RULE**: Schema MUST exist before implementation code.

```markdown
## Contract-First Checklist

Before writing ANY endpoint code:
- [ ] Endpoint defined in schema file
- [ ] Request schema defined with all fields
- [ ] Response schema defined with all fields
- [ ] Error responses documented
- [ ] Authentication requirements specified
- [ ] Rate limiting documented
```

### Step 2: Create/Update OpenAPI Schema

Create or update `openapi.yaml`:

```yaml
openapi: 3.1.0
info:
  title: Service Name API
  version: 1.0.0
  description: |
    API description here.
    
    ## Versioning
    This API uses semantic versioning. Breaking changes increment major version.
    
    ## Authentication
    All endpoints require Bearer token authentication.

servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://api.staging.example.com/v1
    description: Staging

security:
  - bearerAuth: []

paths:
  /users:
    get:
      operationId: listUsers
      summary: List all users
      tags:
        - Users
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserList'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '500':
          $ref: '#/components/responses/InternalError'

    post:
      operationId: createUser
      summary: Create a new user
      tags:
        - Users
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '400':
          $ref: '#/components/responses/BadRequest'
        '409':
          $ref: '#/components/responses/Conflict'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    User:
      type: object
      required:
        - id
        - email
        - createdAt
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
        createdAt:
          type: string
          format: date-time

    CreateUserRequest:
      type: object
      required:
        - email
      properties:
        email:
          type: string
          format: email
        name:
          type: string

    UserList:
      type: object
      required:
        - data
        - pagination
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/User'
        pagination:
          $ref: '#/components/schemas/Pagination'

    Pagination:
      type: object
      properties:
        total:
          type: integer
        limit:
          type: integer
        offset:
          type: integer

    Error:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
        message:
          type: string
        details:
          type: object

  responses:
    BadRequest:
      description: Invalid request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    Unauthorized:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    Conflict:
      description: Resource conflict
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    InternalError:
      description: Internal server error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
```

### Step 3: GraphQL Schema (Alternative)

Create or update `schema.graphql`:

```graphql
"""
API Schema for Service Name
Version: 1.0.0
"""

type Query {
  """List all users with pagination"""
  users(limit: Int = 20, offset: Int = 0): UserConnection!
  
  """Get user by ID"""
  user(id: ID!): User
}

type Mutation {
  """Create a new user"""
  createUser(input: CreateUserInput!): CreateUserPayload!
  
  """Update an existing user"""
  updateUser(id: ID!, input: UpdateUserInput!): UpdateUserPayload!
  
  """Delete a user"""
  deleteUser(id: ID!): DeleteUserPayload!
}

type User {
  id: ID!
  email: String!
  name: String
  createdAt: DateTime!
  updatedAt: DateTime!
}

type UserConnection {
  nodes: [User!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

input CreateUserInput {
  email: String!
  name: String
}

input UpdateUserInput {
  name: String
}

type CreateUserPayload {
  user: User
  errors: [UserError!]!
}

type UpdateUserPayload {
  user: User
  errors: [UserError!]!
}

type DeleteUserPayload {
  success: Boolean!
  errors: [UserError!]!
}

type UserError {
  field: String
  message: String!
  code: ErrorCode!
}

enum ErrorCode {
  INVALID_INPUT
  NOT_FOUND
  CONFLICT
  UNAUTHORIZED
}

scalar DateTime
```

### Step 4: Detect Breaking Changes

Run contract diff analysis:

```bash
# Install openapi-diff tool
npm install -g openapi-diff

# Compare current vs proposed schema
openapi-diff openapi.yaml openapi.proposed.yaml > contract-diff.json
```

Generate `contract-diff.json`:

```json
{
  "schema_version": "1.0",
  "comparison_date": "YYYY-MM-DDTHH:MM:SSZ",
  "base_version": "1.0.0",
  "proposed_version": "1.1.0",
  "breaking_changes": [
    {
      "type": "removed",
      "path": "/users/{id}",
      "method": "DELETE",
      "severity": "BREAKING",
      "description": "Endpoint removed without deprecation period",
      "consumer_impact": "HIGH",
      "mitigation": "Add deprecation notice, maintain for 90 days"
    }
  ],
  "non_breaking_changes": [
    {
      "type": "added",
      "path": "/users/{id}/preferences",
      "method": "GET",
      "severity": "COMPATIBLE",
      "description": "New endpoint added"
    },
    {
      "type": "field_added",
      "path": "/users",
      "field": "avatar_url",
      "severity": "COMPATIBLE",
      "description": "Optional field added to response"
    }
  ],
  "deprecations": [
    {
      "path": "/users/legacy",
      "method": "GET",
      "deprecated_since": "2024-01-01",
      "removal_date": "2024-04-01",
      "replacement": "/users"
    }
  ],
  "summary": {
    "breaking_count": 1,
    "non_breaking_count": 2,
    "deprecation_count": 1,
    "merge_blocked": true,
    "reason": "Breaking changes require approval"
  }
}
```

### Step 5: Maintain API Changelog

Update `API_CHANGELOG.md`:

```markdown
# API Changelog

## [Unreleased]

### Added
- `GET /users/{id}/preferences` - User preferences endpoint

### Changed
- None

### Deprecated
- `GET /users/legacy` - Use `/users` instead. Removal: 2024-04-01

### Removed
- None

### Fixed
- None

---

## [1.0.0] - 2024-01-15

### Added
- Initial API release
- User CRUD operations
- Authentication endpoints
- Pagination support
```

---

## Breaking Change Classification

```markdown
## BREAKING (Blocks Merge)

- Removing endpoint
- Removing required request field
- Removing response field (unless proven unused)
- Changing field type
- Changing authentication requirements
- Reducing rate limits

## NON-BREAKING (Allowed)

- Adding new endpoint
- Adding optional request field
- Adding response field
- Adding new enum value (if client handles unknown)
- Increasing rate limits
- Relaxing validation

## REQUIRES REVIEW

- Changing field validation
- Adding required field with default
- Deprecating endpoint
- Changing error codes
```

---

## Integration Points

```yaml
integration_points:
  upstream:
    - architecture-decisions (API architecture decisions)
    - security-compliance (authentication requirements)
  downstream:
    - verification-protocol (contract tests verify implementation)
    - deployment-readiness (API documentation for operators)
    - consumer teams (breaking change notifications)
```

---

## Verification

```yaml
verification:
  success_criteria:
    - Schema validates against OpenAPI 3.1 / GraphQL spec
    - contract-diff.json generated for all changes
    - No breaking changes without approval
    - Implementation matches schema (contract tests pass)
    - API_CHANGELOG.md updated
  failure_modes:
    - Implementation without schema (contract violation)
    - Breaking change merged without approval
    - Schema/implementation mismatch
    - Undocumented deprecation
    - Consumer broken by change
```

---

## Governance

```yaml
governance:
  approvals_required:
    - Tech Lead (all API changes)
    - API consumers (breaking changes)
    - Security Lead (authentication changes)
  audit_artifacts:
    - openapi.yaml / schema.graphql
    - contract-diff.json
    - API_CHANGELOG.md
    - Consumer notification records
```

---

## Rationale

```yaml
rationale:
  why_this_skill_exists: |
    API changes are the most common source of integration failures.
    Without contract-first development, providers and consumers
    drift apart until integration tests fail—or worse, production
    breaks. This skill enforces schema-first design and blocks
    breaking changes from silently shipping.
  risks_if_missing:
    - Breaking changes slip to production
    - Consumer/provider mismatch
    - Undocumented API behavior
    - Integration test failures
    - Customer-facing outages
```
