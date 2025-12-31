import { useState, useEffect, useCallback } from 'react';

interface Column {
    name: string;
    type: string;
}

interface Table {
    name: string;
    columns: Column[];
    type: 'table' | 'file';
}

const SchemaBrowser = () => {
    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
    const [copiedItem, setCopiedItem] = useState<string | null>(null);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedItem(text);
        setTimeout(() => setCopiedItem(null), 2000);
    };

    const fetchSchema = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('http://localhost:3001/api/schema');
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            setTables(data.tables || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSchema();
    }, [fetchSchema]);

    const toggleTable = async (table: Table) => {
        const next = new Set(expandedTables);
        if (next.has(table.name)) {
            next.delete(table.name);
            setExpandedTables(next);
        } else {
            // Fetch columns if it's a file and columns are empty
            if (table.type === 'file' && table.columns.length === 0) {
                try {
                    const res = await fetch('http://localhost:3001/api/query', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sql: `DESCRIBE '${table.name}'` })
                    });
                    const data = await res.json();
                    if (data.schema) {
                        const columns = data.schema.map((s: any) => ({
                            name: s.column_name,
                            type: s.column_type
                        }));
                        setTables(prev => prev.map(t => t.name === table.name ? { ...t, columns } : t));
                    }
                } catch (err) {
                    console.error('Failed to fetch file schema', err);
                }
            }
            next.add(table.name);
            setExpandedTables(next);
        }
    };

    if (loading && !tables.length) {
        return (
            <div className="p-8 flex flex-col items-center justify-center gap-3 opacity-40">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium">Loading schema...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center">
                <div className="text-error text-xs mb-3 italic">Failed to load schema: {error}</div>
                <button
                    onClick={fetchSchema}
                    className="px-4 py-2 bg-surface-variant text-on-surface-variant rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-outline/10 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="px-4 py-3 border-b border-outline/10 flex items-center justify-between bg-surface-container-low">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">
                    Database & Files ({tables.length})
                </h3>
                <button
                    onClick={fetchSchema}
                    className="p-1.5 hover:bg-surface-variant rounded-lg transition-colors text-on-surface-variant"
                    title="Refresh Schema"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {tables.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-outline/10 rounded-2xl mx-2 mt-2">
                        <div className="text-[11px] opacity-30 italic">No tables or queryable files found</div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {tables.map((table) => (
                            <div key={table.name} className="flex flex-col">
                                <div className="flex items-center group/item transition-all rounded-xl hover:bg-surface-variant/50">
                                    <button
                                        onClick={() => toggleTable(table)}
                                        className={`flex-1 flex items-center gap-2 p-2 rounded-xl transition-all text-left ${expandedTables.has(table.name) ? 'bg-surface-container-high' : ''}`}
                                    >
                                        <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className={`transition-transform duration-200 ${expandedTables.has(table.name) ? 'rotate-90' : 'opacity-40'}`}
                                        >
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>

                                        {table.type === 'table' ? (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 text-primary">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                <line x1="3" y1="9" x2="21" y2="9" />
                                                <line x1="9" y1="21" x2="9" y2="9" />
                                            </svg>
                                        ) : (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 text-secondary">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                <polyline points="14 2 14 8 20 8" />
                                                <line x1="16" y1="13" x2="8" y2="13" />
                                                <line x1="16" y1="17" x2="8" y2="17" />
                                                <polyline points="10 9 9 9 8 9" />
                                            </svg>
                                        )}

                                        <span className="text-xs font-semibold truncate flex-1">{table.name}</span>
                                        {table.columns.length > 0 && (
                                            <span className="text-[10px] opacity-30 font-mono mr-1">{table.columns.length}</span>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => copyToClipboard(table.type === 'file' ? `'${table.name}'` : table.name)}
                                        className="p-1 px-2 opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-primary/10 rounded-lg text-primary"
                                        title={`Copy ${table.type === 'file' ? 'File' : 'Table'} Name`}
                                    >
                                        {copiedItem === (table.type === 'file' ? `'${table.name}'` : table.name) ? (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        ) : (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                            </svg>
                                        )}
                                    </button>
                                </div>

                                {expandedTables.has(table.name) && (
                                    <div className="flex flex-col ml-6 mt-1 mb-2 border-l-2 border-outline/5 pl-2 gap-0.5 animate-in slide-in-from-left-2 duration-200">
                                        {table.columns.length === 0 ? (
                                            <div className="px-2 py-1 text-[10px] opacity-40 italic">Fetching schema...</div>
                                        ) : (
                                            table.columns.map((column) => (
                                                <div key={column.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-variant/30 group transition-colors relative group/col">
                                                    <div className="w-1 h-1 rounded-full bg-primary/30 group-hover:bg-primary transition-colors" />
                                                    <span className="text-[11px] font-medium truncate flex-1">{column.name}</span>
                                                    <span className="text-[9px] font-mono opacity-40 uppercase tracking-tighter mr-1">{column.type}</span>
                                                    <button
                                                        onClick={() => copyToClipboard(column.name)}
                                                        className="p-1 opacity-0 group-hover/col:opacity-100 transition-opacity hover:bg-primary/10 rounded-md text-primary"
                                                        title="Copy Column Name"
                                                    >
                                                        {copiedItem === column.name ? (
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                        ) : (
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SchemaBrowser;
