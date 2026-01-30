# Connector Factory Pattern - Multi-Source Integration

## When to Use
Use when building Figma API or external service connectors.

## Pattern
```typescript
interface Connector {
  connect(): Promise<void>;
  fetch(id: string): Promise<any>;
  disconnect(): Promise<void>;
}

class FigmaConnector implements Connector {
  async connect() { /* auth */ }
  async fetch(fileKey: string) { /* API call */ }
  async disconnect() { /* cleanup */ }
}

const factory = {
  figma: () => new FigmaConnector(),
  github: () => new GitHubConnector()
};
```

## Usage
Use this pattern for Figma extraction and external API integrations.
