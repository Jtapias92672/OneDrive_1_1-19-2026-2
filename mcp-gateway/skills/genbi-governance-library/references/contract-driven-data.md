
# Contract-Driven Data Products Skill

## Core Principle

> "Data products have contracts. Contracts are enforced, not suggested."

A data product without a contract is a liability. Contracts define:
- What the data looks like (schema)
- How fresh it will be (SLO)
- Who owns it (accountability)
- How changes happen (versioning)

---

## Data Contract Schema

```yaml
# contract.yaml
apiVersion: datacontract/v1
kind: DataContract
metadata:
  name: customer-orders
  version: 2.0.0
  owner: data-engineering
  
spec:
  description: Customer order transactions
  
  schema:
    type: object
    properties:
      order_id:
        type: string
        format: uuid
        description: Unique order identifier
      customer_id:
        type: string
        pii: true
      amount:
        type: number
        minimum: 0
      created_at:
        type: string
        format: date-time
    required:
      - order_id
      - customer_id
      - amount
      - created_at
      
  quality:
    completeness:
      order_id: 100%
      customer_id: 100%
      amount: 100%
    freshness:
      max_age_hours: 1
    uniqueness:
      - order_id
      
  slo:
    availability: 99.9%
    latency_p99_ms: 500
    freshness_minutes: 60
    
  consumers:
    - team: analytics
      usage: dashboard aggregations
      tier: walk
    - team: finance
      usage: revenue reporting
      tier: run
      
  lineage:
    sources:
      - system: pos-system
        entity: transactions
    transformations:
      - name: currency-conversion
        description: Convert all amounts to USD
```

---

## Contract Validation

```typescript
async function validateContract(
  data: any[],
  contract: DataContract
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  
  // Schema validation
  for (const record of data) {
    const schemaErrors = validateSchema(record, contract.spec.schema);
    errors.push(...schemaErrors);
  }
  
  // Quality validation
  const completeness = calculateCompleteness(data, contract.spec.quality.completeness);
  if (completeness < contract.spec.quality.completeness.threshold) {
    errors.push({ type: 'quality', message: 'Completeness below threshold' });
  }
  
  // Uniqueness validation
  const duplicates = findDuplicates(data, contract.spec.quality.uniqueness);
  if (duplicates.length > 0) {
    errors.push({ type: 'quality', message: `${duplicates.length} duplicate keys` });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    metrics: { completeness, duplicateCount: duplicates.length }
  };
}
```

---

## Contract Versioning

```yaml
versioning:
  strategy: semver
  
  rules:
    major:
      - Remove required field
      - Change field type
      - Tighten constraint
      
    minor:
      - Add optional field
      - Loosen constraint
      - Add new enum value
      
    patch:
      - Documentation update
      - Description change
      
  migration:
    required_for: major
    template: |
      # Migration Guide: v{old} → v{new}
      
      ## Breaking Changes
      {changes}
      
      ## Migration Steps
      {steps}
```

---

## Consumer Notifications

When contracts change:

```typescript
async function notifyConsumers(
  contract: DataContract,
  change: ContractChange
): Promise<void> {
  const consumers = contract.spec.consumers;
  
  for (const consumer of consumers) {
    await sendNotification({
      to: consumer.team,
      subject: `Data Contract Change: ${contract.metadata.name}`,
      body: `
        Contract ${contract.metadata.name} has been updated.
        
        Change type: ${change.type}
        Old version: ${change.oldVersion}
        New version: ${change.newVersion}
        
        ${change.type === 'major' ? 'ACTION REQUIRED: Please review migration guide.' : ''}
        
        Changes:
        ${change.changelog}
      `
    });
  }
}
```

---

## Integration Points

```yaml
integrates_with:
  - api-contracts: "API contracts are a type of data contract"
  - certified-asset-lifecycle: "Contracts enable certification"
  - data-lake-governance: "Contracts govern lake zones"
```

---

*This skill ensures data products are governed by enforceable contracts.*
