
# Policy IR Compiler Verifier Skill

## Core Principle

> "Policies are written once, compiled to many targets."

High-level policies should be platform-agnostic. This skill compiles them to:
- Snowflake row-level security
- Databricks Unity Catalog
- AWS IAM policies
- Kubernetes RBAC

---

## Policy IR (Intermediate Representation)

```yaml
# policy-ir.yaml
apiVersion: policy/v1
kind: AccessPolicy
metadata:
  name: customer-data-access
  version: 1.0.0
  
spec:
  description: Controls access to customer PII data
  
  subjects:
    - role: analyst
      trust_tier: crawl
    - role: manager
      trust_tier: walk
    - role: executive
      trust_tier: run
      
  resources:
    - type: table
      name: customers
      fields:
        - name: customer_id
          sensitivity: internal
        - name: email
          sensitivity: pii
        - name: ssn
          sensitivity: restricted
          
  rules:
    - name: analysts-see-masked-pii
      when:
        subject.role: analyst
      then:
        - action: mask
          fields: [email]
        - action: deny
          fields: [ssn]
          
    - name: managers-see-pii
      when:
        subject.role: manager
      then:
        - action: allow
          fields: [email]
        - action: deny
          fields: [ssn]
          
    - name: executives-full-access
      when:
        subject.role: executive
        subject.trust_tier: run
      then:
        - action: allow
          fields: [email, ssn]
```

---

## Compilation Targets

### Snowflake Row-Level Security

```sql
-- Compiled from policy-ir.yaml

CREATE OR REPLACE ROW ACCESS POLICY customer_data_policy
AS (role STRING) RETURNS BOOLEAN ->
  CASE 
    WHEN role = 'executive' THEN TRUE
    WHEN role = 'manager' THEN TRUE
    WHEN role = 'analyst' THEN TRUE
    ELSE FALSE
  END;

CREATE OR REPLACE MASKING POLICY email_mask
AS (val STRING) RETURNS STRING ->
  CASE 
    WHEN CURRENT_ROLE() = 'EXECUTIVE' THEN val
    WHEN CURRENT_ROLE() = 'MANAGER' THEN val
    ELSE '***@***.***'
  END;

CREATE OR REPLACE MASKING POLICY ssn_mask
AS (val STRING) RETURNS STRING ->
  CASE 
    WHEN CURRENT_ROLE() = 'EXECUTIVE' THEN val
    ELSE '***-**-****'
  END;
```

### Databricks Unity Catalog

```sql
-- Compiled from policy-ir.yaml

CREATE FUNCTION mask_email(email STRING)
RETURNS STRING
RETURN CASE 
  WHEN is_member('executive') THEN email
  WHEN is_member('manager') THEN email
  ELSE regexp_replace(email, '(.).*@', '*****@')
END;

GRANT SELECT ON TABLE customers TO analyst;
GRANT SELECT (customer_id, email) ON TABLE customers TO manager;
GRANT SELECT ON TABLE customers TO executive;
```

### AWS IAM

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AnalystAccess",
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::data-lake/customers/*",
      "Condition": {
        "StringEquals": {
          "aws:PrincipalTag/role": "analyst"
        }
      }
    }
  ]
}
```

---

## Verification

After compilation, verify the policy:

```typescript
async function verifyCompiledPolicy(
  ir: PolicyIR,
  compiled: CompiledPolicy,
  target: string
): Promise<VerificationResult> {
  const testCases = generateTestCases(ir);
  const results: TestResult[] = [];
  
  for (const test of testCases) {
    const expected = evaluateIR(ir, test.subject, test.resource);
    const actual = await evaluateCompiled(compiled, target, test);
    
    results.push({
      test: test.name,
      expected: expected,
      actual: actual,
      passed: expected === actual
    });
  }
  
  return {
    passed: results.every(r => r.passed),
    results
  };
}
```

---

## Integration Points

```yaml
integrates_with:
  - genbi-trust-tiers: "Trust tiers map to policy subjects"
  - data-lake-governance: "Policies enforce zone access"
  - certified-asset-lifecycle: "Policies part of certification"
```

---

*This skill ensures policies are correctly compiled and verified across platforms.*
