'use client';

import { useState } from 'react';
import { Layers, FileCode, BookOpen, ExternalLink } from 'lucide-react';
import SourcesExplorer from '@/components/SourcesExplorer';
import SwaggerUIWrapper from '@/components/SwaggerUIWrapper';

interface HomePageTabsProps {
  sources: any[];
  categories: string[];
  spec: any;
  appUrl?: string;
  appDomain?: string;
}

export default function HomePageTabs({
  sources,
  categories,
  spec,
  appUrl = '',
  appDomain = '',
}: HomePageTabsProps) {
  const [activeTab, setActiveTab] = useState<'explorer' | 'swagger'>('explorer');

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('explorer')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'explorer'
                ? 'bg-white text-blue-700 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Fontes & Testador Rápido ({sources.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('swagger')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'swagger'
                ? 'bg-white text-blue-700 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Documentação Swagger UI</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/docs"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-300 px-3 py-2 rounded-lg transition-colors shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>RapiDoc (/docs)</span>
            <ExternalLink className="w-3 h-3 ml-0.5 text-slate-400" />
          </a>
          <a
            href="/api/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-300 px-3 py-2 rounded-lg transition-colors shadow-sm"
          >
            <span>OpenAPI JSON</span>
            <ExternalLink className="w-3 h-3 ml-0.5 text-slate-400" />
          </a>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'explorer' && (
        <SourcesExplorer
          sources={sources}
          categories={categories}
          appUrl={appUrl}
          appDomain={appDomain}
        />
      )}

      {activeTab === 'swagger' && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
          <SwaggerUIWrapper spec={spec} />
        </div>
      )}
    </div>
  );
}
