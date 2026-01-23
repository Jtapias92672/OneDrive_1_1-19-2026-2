/**
 * FORGE Platform UI - Provider Configuration
 * @epic 10a - Platform UI Core
 * @task 10a.3.3 - Create settings page
 */

'use client';

import { useState } from 'react';
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  description: string;
  apiKeyPlaceholder: string;
  docsUrl: string;
  connected: boolean;
}

const providers: Provider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models for primary inference',
    apiKeyPlaceholder: 'sk-ant-...',
    docsUrl: 'https://docs.anthropic.com',
    connected: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT models as fallback provider',
    apiKeyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/docs',
    connected: false,
  },
  {
    id: 'wolfram',
    name: 'Wolfram Alpha',
    description: 'Computational validation',
    apiKeyPlaceholder: 'XXXXX-XXXXXXXXXX',
    docsUrl: 'https://products.wolframalpha.com/api',
    connected: true,
  },
];

interface ProviderConfigProps {
  onDirty: () => void;
}

export function ProviderConfig({ onDirty }: ProviderConfigProps) {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [keys, setKeys] = useState<Record<string, string>>({});

  const toggleShowKey = (providerId: string) => {
    setShowKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const handleKeyChange = (providerId: string, value: string) => {
    setKeys(prev => ({ ...prev, [providerId]: value }));
    onDirty();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-1">API Providers</h3>
        <p className="text-sm text-muted-foreground">
          Configure your AI provider API keys
        </p>
      </div>

      <div className="space-y-4">
        {providers.map(provider => (
          <div 
            key={provider.id}
            className="p-4 border rounded-lg"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{provider.name}</h4>
                  {provider.connected ? (
                    <span className="forge-badge forge-badge-success flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Connected
                    </span>
                  ) : (
                    <span className="forge-badge forge-badge-warning flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Not configured
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {provider.description}
                </p>
              </div>
              <a 
                href={provider.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Docs →
              </a>
            </div>

            <div className="relative">
              <input
                type={showKeys[provider.id] ? 'text' : 'password'}
                placeholder={provider.apiKeyPlaceholder}
                value={keys[provider.id] || ''}
                onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                className="forge-input pr-10"
              />
              <button
                type="button"
                onClick={() => toggleShowKey(provider.id)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKeys[provider.id] ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t">
        <h4 className="font-medium mb-2">Default Provider</h4>
        <select className="forge-input w-64" onChange={onDirty}>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="openai">OpenAI (GPT)</option>
        </select>
        <p className="text-sm text-muted-foreground mt-1">
          Primary provider for contract executions
        </p>
      </div>
    </div>
  );
}

export default ProviderConfig;
