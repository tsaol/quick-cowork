import { useState } from 'react';
import { Search, Globe, FolderOpen, FileText, ExternalLink, Loader2 } from 'lucide-react';
import type {
  WebSearchResult,
  LocalSearchResult,
  FetchUrlResponse,
  FileContentResponse,
} from '../types';

type Tab = 'web' | 'local';

export function ResearchView() {
  const [tab, setTab] = useState<Tab>('web');
  const [query, setQuery] = useState('');
  const [directory, setDirectory] = useState('');
  const [pattern, setPattern] = useState('');
  const [loading, setLoading] = useState(false);
  const [webResults, setWebResults] = useState<WebSearchResult[]>([]);
  const [localResults, setLocalResults] = useState<LocalSearchResult[]>([]);
  const [pageContent, setPageContent] = useState<FetchUrlResponse | null>(null);
  const [fileContent, setFileContent] = useState<FileContentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleWebSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setPageContent(null);
    try {
      const res = await window.quickCowork.research.webSearch(query.trim());
      setWebResults(res.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchUrl = async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.quickCowork.research.fetchUrl(url);
      setPageContent(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch page');
    } finally {
      setLoading(false);
    }
  };

  const handleLocalSearch = async () => {
    if (!directory.trim()) return;
    setLoading(true);
    setError(null);
    setFileContent(null);
    try {
      const res = await window.quickCowork.research.localSearch({
        directory: directory.trim(),
        pattern: pattern.trim() || undefined,
        query: query.trim() || undefined,
      });
      setLocalResults(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReadFile = async (filePath: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.quickCowork.research.fileContent(filePath);
      setFileContent(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tab === 'web') handleWebSearch();
      else handleLocalSearch();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center border-b border-zinc-800 px-6 pt-8 pb-0">
        <button
          onClick={() => setTab('web')}
          className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${
            tab === 'web'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Globe size={16} />
          Web Search
        </button>
        <button
          onClick={() => setTab('local')}
          className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${
            tab === 'local'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <FolderOpen size={16} />
          Local Files
        </button>
      </div>

      {/* Search input */}
      <div className="px-6 py-4 space-y-3">
        {tab === 'local' && (
          <div className="flex gap-2">
            <input
              value={directory}
              onChange={(e) => setDirectory(e.target.value)}
              placeholder="Directory path (e.g. /Users/you/projects)"
              className="flex-1 px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
            />
            <input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="Glob (e.g. **/*.ts)"
              className="w-40 px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        )}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                tab === 'web' ? 'Search the web...' : 'Search text in files...'
              }
              className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={tab === 'web' ? handleWebSearch : handleLocalSearch}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white transition-colors"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mb-3 px-3 py-2 text-sm bg-red-900/30 border border-red-800 rounded-lg text-red-300">
          {error}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {/* Page content detail */}
        {tab === 'web' && pageContent && (
          <div className="mb-4 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-zinc-100 truncate">
                {pageContent.title}
              </h3>
              <button
                onClick={() => setPageContent(null)}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-zinc-500 mb-2 truncate">{pageContent.url}</p>
            <div className="text-sm text-zinc-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
              {pageContent.content.slice(0, 3000)}
            </div>
          </div>
        )}

        {/* File content detail */}
        {tab === 'local' && fileContent && (
          <div className="mb-4 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-zinc-100 truncate">
                {fileContent.filePath}
              </h3>
              <button
                onClick={() => setFileContent(null)}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                Close
              </button>
            </div>
            <pre className="text-xs text-zinc-300 whitespace-pre-wrap max-h-64 overflow-y-auto font-mono">
              {fileContent.content.slice(0, 5000)}
            </pre>
          </div>
        )}

        {/* Web search results */}
        {tab === 'web' && webResults.length > 0 && (
          <div className="space-y-2">
            {webResults.map((r, i) => (
              <div
                key={i}
                className="p-3 bg-zinc-850 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-zinc-100 truncate">
                      {r.title}
                    </h4>
                    <p className="text-xs text-blue-400 truncate mt-0.5">{r.url}</p>
                    {r.snippet && (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {r.snippet}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleFetchUrl(r.url)}
                    className="shrink-0 p-1.5 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                    title="Fetch page content"
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Local search results */}
        {tab === 'local' && localResults.length > 0 && (
          <div className="space-y-2">
            {localResults.map((r, i) => (
              <div
                key={i}
                className="p-3 bg-zinc-850 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors cursor-pointer"
                onClick={() => handleReadFile(r.filePath)}
              >
                <div className="flex items-start gap-2">
                  <FileText size={16} className="shrink-0 text-zinc-500 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-zinc-100 truncate">
                      {r.fileName}
                    </h4>
                    <p className="text-xs text-zinc-500 truncate">{r.filePath}</p>
                    {r.matchText && (
                      <p className="text-xs text-zinc-400 mt-1 font-mono truncate">
                        Line {r.matchLine}: {r.matchText}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-zinc-600 shrink-0">
                    {(r.size / 1024).toFixed(1)}KB
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty states */}
        {tab === 'web' && !loading && webResults.length === 0 && !pageContent && (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
            <Globe size={32} className="mb-2 opacity-50" />
            <p className="text-sm">Search the web to find information</p>
          </div>
        )}
        {tab === 'local' && !loading && localResults.length === 0 && !fileContent && (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
            <FolderOpen size={32} className="mb-2 opacity-50" />
            <p className="text-sm">Search local files by name or content</p>
          </div>
        )}
      </div>
    </div>
  );
}
