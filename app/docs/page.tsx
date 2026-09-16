'use client';

export default function DocsPage() {
  return (
    <div className="w-full h-screen bg-white">
      <main className="w-full h-full relative">
        {/* @ts-ignore */}
        <rapi-doc
          id="rapidoc-el"
          theme="light"
          render-style="read"
          show-header="false"
          allow-server-selection="false"
          allow-authentication="false"
          allow-try="true"
          primary-color="#2563eb"
          bg-color="#ffffff"
          text-color="#1e293b"
          nav-bg-color="#f8fafc"
          nav-text-color="#334155"
          nav-hover-bg-color="#e2e8f0"
          nav-hover-text-color="#0f172a"
          nav-accent-color="#2563eb"
          spec-url="/api/openapi.json"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          {/* @ts-ignore */}
        </rapi-doc>
      </main>
    </div>
  );
}
