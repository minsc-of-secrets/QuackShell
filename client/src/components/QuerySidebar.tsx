import { useState, useEffect } from 'react';

interface SavedQuery {
    id: string;
    name: string;
    sql: string;
    timestamp: number;
}

interface QuerySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectQuery: (sql: string) => void;
    currentSql: string;
}

const QuerySidebar: React.FC<QuerySidebarProps> = ({ isOpen, onClose, onSelectQuery, currentSql }) => {
    const [history, setHistory] = useState<string[]>([]);
    const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
    const [activeTab, setActiveTab] = useState<'history' | 'saved'>('history');
    const [isSaving, setIsSaving] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [previewSql, setPreviewSql] = useState<string | null>(null);

    useEffect(() => {
        const savedHistory = localStorage.getItem('queryHistory');
        if (savedHistory) setHistory(JSON.parse(savedHistory));

        const savedItems = localStorage.getItem('quackshell_saved');
        if (savedItems) setSavedQueries(JSON.parse(savedItems));
    }, [isOpen]);

    const saveToLocalStorage = (key: string, data: any) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    const handleSaveQuery = () => {
        if (!saveName.trim()) return;
        const newSaved: SavedQuery = {
            id: crypto.randomUUID(),
            name: saveName.trim(),
            sql: currentSql,
            timestamp: Date.now()
        };
        const updated = [newSaved, ...savedQueries];
        setSavedQueries(updated);
        saveToLocalStorage('quackshell_saved', updated);
        setIsSaving(false);
        setSaveName('');
        setActiveTab('saved');
    };

    const deleteHistory = (index: number) => {
        const updated = history.filter((_, i) => i !== index);
        setHistory(updated);
        saveToLocalStorage('queryHistory', updated);
    };

    const deleteSaved = (id: string) => {
        const updated = savedQueries.filter(q => q.id !== id);
        setSavedQueries(updated);
        saveToLocalStorage('quackshell_saved', updated);
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-y-0 left-0 w-80 bg-surface-container shadow-2xl z-50 flex flex-col border-r border-outline/10 animate-in slide-in-from-left duration-300">
            <div className="p-4 border-b border-outline/10 flex items-center justify-between bg-surface-container-high/50">
                <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-60">Query History</h3>
                <button onClick={onClose} className="p-2 hover:bg-surface-variant rounded-full transition-all">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <div className="p-4 border-b border-outline/10 flex flex-col gap-4">
                <div className="flex bg-surface-container-high rounded-full p-1">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all ${activeTab === 'history' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-variant'}`}
                    >
                        History
                    </button>
                    <button
                        onClick={() => setActiveTab('saved')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all ${activeTab === 'saved' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-variant'}`}
                    >
                        Saved
                    </button>
                </div>

                {!isSaving ? (
                    <button
                        onClick={() => setIsSaving(true)}
                        className="w-full py-2.5 bg-secondary text-on-secondary rounded-2xl text-[10px] font-bold hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13a2 2 0 0 1-2 2z" />
                            <polyline points="17 21 17 13 7 13 7 21" />
                            <polyline points="7 3 7 8 15 8" />
                        </svg>
                        Save Current
                    </button>
                ) : (
                    <div className="flex flex-col gap-2 animate-in fade-in duration-200">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Query name..."
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveQuery()}
                            className="bg-surface border border-primary text-xs px-3 py-2 rounded-xl outline-none"
                        />
                        <div className="flex gap-2">
                            <button onClick={handleSaveQuery} className="flex-1 py-1.5 bg-primary text-on-primary rounded-lg text-[10px] font-bold">SAVE</button>
                            <button onClick={() => setIsSaving(false)} className="flex-1 py-1.5 bg-surface-variant text-on-surface-variant rounded-lg text-[10px] font-bold">CANCEL</button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                {activeTab === 'history' ? (
                    <div className="flex flex-col p-2 gap-1">
                        {history.length === 0 ? (
                            <div className="p-8 text-center opacity-30 text-xs italic">No items</div>
                        ) : (
                            history.map((sqlText, i) => (
                                <div key={i} className="group relative">
                                    <button
                                        onClick={() => setPreviewSql(sqlText)}
                                        className={`w-full text-left p-3 rounded-xl transition-all pr-10 border ${previewSql === sqlText ? 'bg-primary/10 border-primary/30 shadow-inner' : 'hover:bg-surface-variant border-transparent'}`}
                                    >
                                        <div className="text-[11px] font-mono line-clamp-2 opacity-70 group-hover:opacity-100">{sqlText}</div>
                                    </button>
                                    <button
                                        onClick={() => deleteHistory(i)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover:opacity-100 hover:text-error transition-all"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col p-2 gap-1">
                        {savedQueries.length === 0 ? (
                            <div className="p-8 text-center opacity-30 text-xs italic">No saved items</div>
                        ) : (
                            savedQueries.map((q) => (
                                <div key={q.id} className="group relative">
                                    <button
                                        onClick={() => setPreviewSql(q.sql)}
                                        className={`w-full text-left p-3 rounded-xl transition-all pr-10 border ${previewSql === q.sql ? 'bg-primary/10 border-primary/30 shadow-inner' : 'hover:bg-surface-variant border-transparent'}`}
                                    >
                                        <div className="text-xs font-bold truncate mb-0.5">{q.name}</div>
                                        <div className="text-[10px] font-mono line-clamp-1 opacity-50">{q.sql}</div>
                                    </button>
                                    <button
                                        onClick={() => deleteSaved(q.id)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover:opacity-100 hover:text-error transition-all"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {previewSql && (
                <div className="p-4 bg-surface-container-high border-t border-outline/20 flex flex-col gap-3 animate-in slide-in-from-bottom duration-300">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Preview</span>
                        <button onClick={() => setPreviewSql(null)} className="opacity-50 hover:opacity-100 italic text-[10px]">Close</button>
                    </div>
                    <div className="bg-black/20 p-3 rounded-xl max-h-32 overflow-y-auto border border-outline/10">
                        <pre className="text-[10px] font-mono whitespace-pre-wrap break-all opacity-80">{previewSql}</pre>
                    </div>
                    <button
                        onClick={() => {
                            onSelectQuery(previewSql);
                            setPreviewSql(null);
                        }}
                        className="w-full py-3 bg-primary text-on-primary rounded-2xl text-xs font-bold shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        Apply to Editor
                    </button>
                </div>
            )}
        </div>
    );
};

export default QuerySidebar;
