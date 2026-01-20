/**
 * FORGE Platform UI - Preferences
 * @epic 10a - Platform UI Core
 * @task 10a.3.3 - Create settings page
 */

'use client';

interface PreferencesProps {
  onDirty: () => void;
}

export function Preferences({ onDirty }: PreferencesProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-1">Preferences</h3>
        <p className="text-sm text-muted-foreground">
          Customize your FORGE experience
        </p>
      </div>

      {/* Appearance */}
      <div className="space-y-4">
        <h4 className="font-medium">Appearance</h4>
        
        <div>
          <label className="block text-sm font-medium mb-2">Theme</label>
          <select className="forge-input w-48" onChange={onDirty}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Sidebar default state
          </label>
          <select className="forge-input w-48" onChange={onDirty}>
            <option value="expanded">Expanded</option>
            <option value="collapsed">Collapsed</option>
          </select>
        </div>
      </div>

      {/* Execution Defaults */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium">Execution Defaults</h4>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            Default target score
          </label>
          <input
            type="number"
            defaultValue={95}
            min={0}
            max={100}
            step={1}
            onChange={onDirty}
            className="forge-input w-32"
          />
          <span className="ml-2 text-muted-foreground">%</span>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Default max iterations
          </label>
          <input
            type="number"
            defaultValue={5}
            min={1}
            max={20}
            onChange={onDirty}
            className="forge-input w-32"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Default model
          </label>
          <select className="forge-input w-64" onChange={onDirty}>
            <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
            <option value="claude-3-opus">Claude 3 Opus</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
          </select>
        </div>
      </div>

      {/* Editor Preferences */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium">Editor</h4>
        
        <label className="flex items-center gap-3">
          <input 
            type="checkbox" 
            defaultChecked 
            onChange={onDirty}
            className="rounded" 
          />
          <div>
            <p className="font-medium">Auto-validate contracts</p>
            <p className="text-sm text-muted-foreground">
              Validate YAML as you type
            </p>
          </div>
        </label>

        <label className="flex items-center gap-3">
          <input 
            type="checkbox" 
            defaultChecked 
            onChange={onDirty}
            className="rounded" 
          />
          <div>
            <p className="font-medium">Show line numbers</p>
            <p className="text-sm text-muted-foreground">
              Display line numbers in YAML editor
            </p>
          </div>
        </label>

        <div>
          <label className="block text-sm font-medium mb-2">
            Tab size
          </label>
          <select className="forge-input w-32" onChange={onDirty}>
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default Preferences;
