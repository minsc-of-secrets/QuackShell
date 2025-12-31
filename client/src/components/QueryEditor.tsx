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
    const [error, setError] = useState(null);
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

        // Constraint: between 10% and 90%
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

    const handleEditorDidMount = (_editor: any, monaco: any) => {
        // Define SQL snippets
        monaco.languages.registerCompletionItemProvider('sql', {
            provideCompletionItems: (_model: any, _position: any) => {
                const suggestions = [
                    {
                        label: 'SELECT * FROM',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'SELECT * FROM ${1:table_name};',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Select all columns from a table'
                    },
                    {
                        label: 'INSERT INTO',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'INSERT INTO ${1:table_name} (${2:columns}) VALUES (${3:values});',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Insert a new row'
                    },
                    {
                        label: 'CREATE TABLE',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'CREATE TABLE ${1:table_name} (\n\t${2:column_name} ${3:type}\n);',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Create a new table'
                    },
                    {
                        label: 'DROP TABLE',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'DROP TABLE IF EXISTS ${1:table_name};',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Drop a table if it exists'
                    },
                    {
                        label: 'ALTER TABLE',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'ALTER TABLE ${1:table_name} ADD COLUMN ${2:column_name} ${3:type};',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Add a column to a table'
                    },
                    {
                        label: 'WITH ... AS',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'WITH ${1:cte_name} AS (\n\tSELECT *\n\tFROM ${2:table_name}\n)\nSELECT * FROM ${1:cte_name};',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Common Table Expression'
                    }
                ];
                return { suggestions: suggestions };
            }
        });
    };

    const runQuery = async () => {
        setLoading(true);
        setError(null);
        setResults(null);
        setSchema(null);
        setSortConfig({ key: null, direction: null });

        try {
            const response = await fetch('http://localhost:3001/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql }),
            });

            const data = await response.json();

            if (data.error) {
                setError(data.error);
            } else {
                setResults(data.rows);
                setSchema(data.schema || null);
                // Save to history on success
                saveToHistory(sql);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const saveToHistory = (querySql: string) => {
        const history = JSON.parse(localStorage.getItem('quackshell_history') || '[]');
        // Don't save if same as last
        if (history[0] === querySql) return;

        const newHistory = [querySql, ...history.filter((s: string) => s !== querySql)].slice(0, 50);
        localStorage.setItem('quackshell_history', JSON.stringify(newHistory));
        // Force re-render of sidebar if it's open (it will reload via useEffect if we add a key or trigger)
    };

    const sortedResults = useMemo(() => {
        if (!results || !sortConfig.key || !sortConfig.direction) return results;

        return [...results].sort((a, b) => {
            const aVal = a[sortConfig.key!];
            const bVal = b[sortConfig.key!];

            if (aVal === bVal) return 0;

            // Handle nulls
            if (aVal == null) return 1;
            if (bVal == null) return -1;

            const direction = sortConfig.direction === 'asc' ? 1 : -1;

            // Numeric compare
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return (aVal - bVal) * direction;
            }

            // String compare
            return String(aVal).localeCompare(String(bVal), undefined, { numeric: true, sensitivity: 'base' }) * direction;
        });
    }, [results, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig((prev) => {
            if (prev.key === key) {
                if (prev.direction === 'asc') return { key, direction: 'desc' };
                return { key: null, direction: null };
            }
            return { key, direction: 'asc' };
        });
    };

    const downloadCSV = () => {
        if (!sortedResults || sortedResults.length === 0) return;

        const headers = Object.keys(sortedResults[0]).join(',');
        const rows = sortedResults.map(row =>
            Object.values(row).map(val => {
                const s = String(val).replace(/"/g, '""');
                return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
            }).join(',')
        );
        const csvContent = [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'quackshell_results.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div ref={containerRef} className="flex flex-col h-full bg-transparent overflow-hidden">
            {/* Editor Area */}
            <div
                className="relative flex flex-col border-b border-outline/10 overflow-hidden"
                style={{ height: `${editorHeight}%`, flex: 'none' }}
            >
                <div className="flex grow min-h-0">
                    {showQuerySidebar && (
                        <QuerySidebar
                            onSelectQuery={(sql) => setSql(sql)}
                            currentSql={sql}
                        />
                    )}
                    <div className="flex-1 relative">
                        <Editor
                            height="100%"
                            defaultLanguage="sql"
                            value={sql}
                            onChange={(value) => setSql(value || '')}
                            theme="vs-dark"
                            onMount={handleEditorDidMount}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                padding: { top: 16 },
                                automaticLayout: true,
                                scrollBeyondLastLine: false,
                            }}
                        />
                    </div>
                </div>

                {/* Sidebar Toggle Button */}
                <button
                    onClick={() => setShowQuerySidebar(!showQuerySidebar)}
                    className={`absolute left-4 bottom-6 z-20 flex items-center justify-center w-12 h-12 rounded-2xl shadow-lg transition-all active:scale-95 ${showQuerySidebar ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'}`}
                    title="Toggle Query History"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>

                {/* M3 Floating Action Button Styled Run Button */}
                <button
                    className="absolute right-8 bottom-6 z-20 flex items-center gap-3 px-6 py-4 bg-primary text-on-primary rounded-[16px] shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 group"
                    onClick={runQuery}
                    disabled={loading}
                >
                    <svg className={`w-5 h-5 ${loading ? 'animate-spin' : 'group-hover:translate-x-1 transition-transform'}`} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5 3l14 9-14 9V3z" />
                    </svg>
                    <span className="font-bold text-sm tracking-wide">{loading ? 'RUNNING...' : 'EXECUTE'}</span>
                </button>
            </div>

            {/* Vertical Resizer Handle */}
            <div
                className="h-1 cursor-row-resize group flex items-center justify-center transition-all z-10 -my-0.5"
                onMouseDown={startResizing}
            >
                <div className="h-[1px] w-12 bg-outline/20 group-hover:bg-primary transition-colors rounded-full"></div>
            </div>

            {/* Results Area */}
            <div className="grow overflow-auto bg-surface-container-low p-6">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-5 rounded-3xl text-sm font-medium mb-6 flex items-start gap-4">
                        <div className="shrink-0 w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-xs">!</div>
                        <div>
                            <div className="font-bold uppercase text-[10px] tracking-widest mb-1 opacity-60">Query Error</div>
                            {error}
                        </div>
                    </div>
                )}

                {sortedResults && sortedResults.length > 0 && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between px-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">
                                {sortedResults.length} {sortedResults.length === 1 ? 'row' : 'rows'} found
                            </span>
                            <button
                                onClick={downloadCSV}
                                className="flex items-center gap-2 px-4 py-2 bg-surface-variant hover:bg-primary/10 text-on-surface-variant hover:text-primary rounded-full text-xs font-bold transition-all active:scale-95"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Export CSV
                            </button>
                        </div>
                        <div className="bg-surface rounded-3xl border border-outline/10 overflow-x-auto shadow-sm">
                            <table className="min-w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-surface-variant">
                                        {Object.keys(sortedResults[0]).map((col) => {
                                            const colType = schema?.find(s => s.column_name === col)?.column_type;
                                            return (
                                                <th
                                                    key={col}
                                                    onClick={() => handleSort(col)}
                                                    className="px-5 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline/10 whitespace-nowrap cursor-pointer hover:bg-on-surface-variant/10 transition-colors group select-none"
                                                >
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-2">
                                                            {col}
                                                            <span className={`transition-all duration-300 ${sortConfig.key === col ? 'opacity-100 scale-100' : 'opacity-0 scale-50 group-hover:opacity-30'}`}>
                                                                {sortConfig.key === col && sortConfig.direction === 'desc' ? (
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14l5-5 5 5z" /></svg>
                                                                ) : (
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z" /></svg>
                                                                )}
                                                            </span>
                                                        </div>
                                                        {colType && (
                                                            <span className="text-[9px] lowercase font-medium opacity-40 tracking-normal font-mono">
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
                                    {sortedResults.map((row, i) => (
                                        <tr key={i} className="hover:bg-surface-variant/30 transition-colors">
                                            {Object.values(row).map((val, j) => (
                                                <td key={j} className="px-5 py-4 text-sm text-on-surface/80 font-mono whitespace-nowrap">
                                                    {String(val)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {results && results.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 opacity-30 text-center">
                        <div className="text-5xl mb-4">🔍</div>
                        <span className="text-sm font-bold uppercase tracking-widest">No results found for this query</span>
                    </div>
                )}

                {!results && !error && !loading && (
                    <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center text-primary text-3xl italic">D</div>
                        <span className="text-xs font-bold uppercase tracking-[0.2em]">Enter a SQL query to begin</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QueryEditor;
