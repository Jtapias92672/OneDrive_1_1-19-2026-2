/**
 * FORGE Platform UI - Settings Page
 * @epic 10a - Platform UI Core
 * @task 10a.3.3 - Create settings page
 */

'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import { ProviderConfig } from '@/components/settings/provider-config';
import { Preferences } from '@/components/settings/preferences';

type SettingsTab = 'providers' | 'preferences' | 'notifications' | 'security';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('providers');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsDirty(false);
    setIsSaving(false);
  };

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'providers', label: 'API Providers' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'security', label: 'Security' },
  ];

  return (
    <div className="space-y-6 mt-14">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Configure your FORGE platform
          </p>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="forge-button h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Settings Layout */}
      <div className="flex gap-6">
        {/* Tabs Sidebar */}
        <nav className="w-48 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors
                ${activeTab === tab.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 forge-card">
          {activeTab === 'providers' && (
            <ProviderConfig onDirty={() => setIsDirty(true)} />
          )}
          {activeTab === 'preferences' && (
            <Preferences onDirty={() => setIsDirty(true)} />
          )}
          {activeTab === 'notifications' && (
            <NotificationsSettings onDirty={() => setIsDirty(true)} />
          )}
          {activeTab === 'security' && (
            <SecuritySettings onDirty={() => setIsDirty(true)} />
          )}
        </div>
      </div>
    </div>
  );
}

// Inline components for notifications and security
function NotificationsSettings({ onDirty }: { onDirty: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-1">Notifications</h3>
        <p className="text-sm text-muted-foreground">
          Configure how you receive notifications
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-3">
          <input type="checkbox" defaultChecked onChange={onDirty} className="rounded" />
          <div>
            <p className="font-medium">Email on execution complete</p>
            <p className="text-sm text-muted-foreground">
              Receive email when executions finish
            </p>
          </div>
        </label>

        <label className="flex items-center gap-3">
          <input type="checkbox" defaultChecked onChange={onDirty} className="rounded" />
          <div>
            <p className="font-medium">Email on execution failure</p>
            <p className="text-sm text-muted-foreground">
              Get notified when executions fail to reach target
            </p>
          </div>
        </label>

        <div>
          <label className="block text-sm font-medium mb-2">
            Slack Webhook URL
          </label>
          <input
            type="url"
            placeholder="https://hooks.slack.com/services/..."
            onChange={onDirty}
            className="forge-input"
          />
        </div>
      </div>
    </div>
  );
}

function SecuritySettings({ onDirty }: { onDirty: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-1">Security</h3>
        <p className="text-sm text-muted-foreground">
          Manage security settings
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-3">
          <input type="checkbox" onChange={onDirty} className="rounded" />
          <div>
            <p className="font-medium">Two-factor authentication</p>
            <p className="text-sm text-muted-foreground">
              Require 2FA for sensitive operations
            </p>
          </div>
        </label>

        <div>
          <label className="block text-sm font-medium mb-2">
            Session timeout (minutes)
          </label>
          <input
            type="number"
            defaultValue={60}
            onChange={onDirty}
            className="forge-input w-32"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            API key rotation
          </label>
          <button className="forge-button h-9 px-4 hover:bg-muted">
            Rotate API Keys
          </button>
        </div>
      </div>
    </div>
  );
}
