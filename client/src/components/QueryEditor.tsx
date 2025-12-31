import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import QuerySidebar from './QuerySidebar';

interface QueryEditorProps {
    sql: string;
    setSql: (sql: string) => void;
}

type SortConfig = {
    key: string | null;
    direction: 'asc' | 'desc' | null;
};

const QueryEditor: React.FC<QueryEditorProps> = ({ sql, setSql }) => {
    const [results, setResults] = useState<any[] | null>(null);
    const [schema, setSchema] = useState<any[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });
    const [editorHeight, setEditorHeight] = useState(40); // Initial height percentage for editor
    const isResizing = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [showQuerySidebar, setShowQuerySidebar] = useState(false);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing.current || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const newHeight = ((e.clientY - containerRect.top) / containerRect.height) * 100;

        if (newHeight > 10 && newHeight < 90) {
            setEditorHeight(newHeight);
            window.dispatchEvent(new Event('resize'));
        }
    }, []);

    const stopResizing = useCallback(() => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    }, [handleMouseMove]);

    const startResizing = useCallback(() => {
        isResizing.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
    }, [handleMouseMove, stopResizing]);

    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', stopResizing);
        };
    }, [handleMouseMove, stopResizing]);

    const runQuery = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('http://localhost:3001/api/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sql }),
            });
            const data = await res.json();
            if (data.error) {
                setError(data.error);
                setResults(null);
            } else {
                setResults(data.rows || []);
                setSchema(data.schema || null);
                saveToHistory(sql);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const saveToHistory = (querySql: string) => {
        const history = JSON.parse(localStorage.getItem('queryHistory') || '[]');
        const newHistory = [querySql, ...history.filter((h: string) => h !== querySql)].slice(0, 50);
        localStorage.setItem('queryHistory', JSON.stringify(newHistory));
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' | null = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = null;
        }
        setSortConfig({ key, direction });
    };

    const sortedResults = useMemo(() => {
        if (!results) return null;
        if (!sortConfig.key || !sortConfig.direction) return results;

        return [...results].sort((a, b) => {
            const v1 = a[sortConfig.key!];
            const v2 = b[sortConfig.key!];

            if (v1 === v2) return 0;
            if (v1 === null) return 1;
            if (v2 === null) return -1;

            const comparison = v1 < v2 ? -1 : 1;
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
    }, [results, sortConfig]);

    const displayedResults = useMemo(() => {
        if (!sortedResults) return null;
        return sortedResults.slice(0, 1000);
    }, [sortedResults]);

    const downloadCSV = () => {
        if (!sortedResults || sortedResults.length === 0) return;

        const headers = Object.keys(sortedResults[0]);
        const csvContent = [
            headers.join(','),
            ...sortedResults.map(row =>
                headers.map(header => {
                    const val = row[header];
                    if (val === null) return '';
                    const str = String(val);
                    return str.includes(',') || str.includes('"') || str.includes('\n')
                        ? `"${str.replace(/"/g, '""')}"`
                        : str;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `query_results_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div ref={containerRef} className="flex flex-col h-full w-full overflow-hidden bg-surface-container-lowest">
            {/* Editor Area */}
            <div className="relative flex flex-col overflow-hidden shrink-0" style={{ height: `${editorHeight}%` }}>
                <div className="grow relative min-h-0 w-full">
                    <Editor
                        height="100%"
                        defaultLanguage="sql"
                        theme="vs-dark"
                        value={sql}
                        onChange={(value) => setSql(value || '')}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            scrollBeyondLastLine: false,
                            padding: { top: 16, bottom: 16 },
                            lineNumbers: 'on',
                            renderLineHighlight: 'all',
                            automaticLayout: true,
                            fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
                        }}
                    />
                </div>

                <QuerySidebar
                    isOpen={showQuerySidebar}
                    onClose={() => setShowQuerySidebar(false)}
                    currentSql={sql}
                    onSelectQuery={(sql) => {
                        setSql(sql);
                        setShowQuerySidebar(false);
                    }}
                />

                <button
                    onClick={() => setShowQuerySidebar(!showQuerySidebar)}
                    className={`absolute left-6 bottom-6 z-20 p-4 rounded-[16px] shadow-sm transition-all flex items-center gap-2 group ${showQuerySidebar ? 'bg-primary text-on-primary' : 'bg-surface-container border border-outline/10 text-on-surface-variant hover:bg-surface-variant'}`}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>

                <button
                    className="absolute right-8 bottom-6 z-20 flex items-center gap-3 px-6 py-4 bg-primary text-on-primary rounded-[16px] shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 group"
                    onClick={runQuery}
                    disabled={loading}
                >
                    <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5 3l14 9-14 9V3z" />
                    </svg>
                    <span className="font-bold text-sm tracking-wide">{loading ? 'RUNNING...' : 'EXECUTE'}</span>
                </button>
            </div>

            {/* Resizer */}
            <div
                className="h-1 cursor-row-resize group flex items-center justify-center transition-all z-10 -my-0.5 bg-outline/5 hover:bg-primary/20"
                onMouseDown={startResizing}
            >
                <div className="h-[1px] w-12 bg-outline/20 group-hover:bg-primary transition-colors rounded-full"></div>
            </div>

            {/* Results Area */}
            <div className="grow overflow-hidden flex flex-col bg-surface-container-low min-h-0">
                <div className="grow overflow-auto p-6 relative">
                    {error && (
                        <div className="bg-error/10 border border-error/20 text-error p-5 rounded-3xl text-sm font-medium mb-6 animate-in slide-in-from-bottom-2">
                            <div className="font-bold uppercase text-[10px] tracking-widest mb-1 opacity-60">Query Error</div>
                            {error}
                        </div>
                    )}

                    {!results && !loading && !error && (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 gap-4">
                            <div className="text-6xl text-primary drop-shadow-sm">⚡</div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.3em]">Ready to Compute</div>
                        </div>
                    )}

                    {loading && (
                        <div className="h-full flex flex-col items-center justify-center gap-4 animate-pulse opacity-40">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.3em]">Executing...</div>
                        </div>
                    )}

                    {displayedResults && (
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between px-2 shrink-0">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">
                                    {results?.length === 0 ? 'Query successful (0 rows)' : `Showing ${displayedResults.length} of ${results?.length} rows`}
                                </span>
                                {displayedResults.length > 0 && (
                                    <button
                                        onClick={downloadCSV}
                                        className="flex items-center gap-2 px-4 py-2 bg-surface-variant text-on-surface-variant rounded-xl text-xs font-bold transition-all border border-outline/10 hover:bg-primary/10 hover:text-primary"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="7 10 12 15 17 10" />
                                            <line x1="12" y1="15" x2="12" y2="3" />
                                        </svg>
                                        Export CSV
                                    </button>
                                )}
                            </div>

                            {displayedResults.length > 0 && (
                                <div className="bg-surface rounded-3xl border border-outline/10 overflow-x-auto shadow-sm">
                                    <table className="min-w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-surface-variant/50 sticky top-0 z-10 backdrop-blur-sm">
                                                {Object.keys(displayedResults[0]).map((col) => {
                                                    const colType = schema?.find(s => s.column_name === col)?.column_type;
                                                    return (
                                                        <th
                                                            key={col}
                                                            onClick={() => handleSort(col)}
                                                            className="px-5 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline/10 whitespace-nowrap cursor-pointer hover:bg-primary/10 transition-colors select-none group"
                                                        >
                                                            <div className="flex flex-col gap-0.5">
                                                                <div className="flex items-center gap-2">
                                                                    {col}
                                                                    <span className={`transition-opacity ${sortConfig.key === col ? 'opacity-100' : 'opacity-0 group-hover:opacity-30'}`}>
                                                                        {sortConfig.key === col && sortConfig.direction === 'desc' ? '↑' : '↓'}
                                                                    </span>
                                                                </div>
                                                                {colType && (
                                                                    <span className="text-[9px] lowercase font-medium opacity-40 font-mono tracking-normal">
                                                                        {colType}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-outline/5">
                                            {displayedResults.map((row, i) => (
                                                <tr key={i} className="hover:bg-surface-variant/30 transition-colors">
                                                    {Object.values(row).map((val, j) => (
                                                        <td key={j} className="px-5 py-4 text-sm text-on-surface/80 font-mono whitespace-nowrap">
                                                            {val === null ? <span className="opacity-20 italic text-xs">NULL</span> : String(val)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QueryEditor;
