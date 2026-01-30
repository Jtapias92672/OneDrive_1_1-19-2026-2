'use client';

export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Page</h1>
      <p>If you see this, basic Next.js routing works.</p>
      <a href="/dashboard/generation" className="text-blue-500 underline">
        Go to FORGE Generation
      </a>
    </div>
  );
}
