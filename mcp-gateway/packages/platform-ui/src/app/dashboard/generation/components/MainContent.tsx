'use client';

/**
 * FORGE-Cowork Main Content Area
 * Conversational POC interface
 */

import { ConversationalPOC } from './ConversationalPOC';

export function MainContent() {
  return (
    <main className="flex-1 flex flex-col overflow-hidden min-w-0">
      <ConversationalPOC />
    </main>
  );
}
