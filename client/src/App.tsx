import { useState, useCallback, useEffect, useRef } from 'react';
import TerminalTabs from './components/TerminalTabs';
import QueryEditor from './components/QueryEditor';
import FileExplorer from './components/FileExplorer';
import SchemaBrowser from './components/SchemaBrowser';

function App() {
    const [sql, setSql] = useState('SELECT * FROM pragma_database_list();');
    const [explorerWidth, setExplorerWidth] = useState(20); // Percentage for explorer
    const [leftTab, setLeftTab] = useState<'files' | 'schema'>('files');
    const [leftPaneWidth, setLeftPaneWidth] = useState(50); // percentage for split between editor and terminal
    const isResizing = useRef(false);

    const handleGenerateQuery = (newSql: string) => {
        setSql(newSql);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing.current) return;

        const container = document.querySelector('.content-container');
        if (container) {
            const rect = container.getBoundingClientRect();
            const newWidth = ((e.clientX - rect.left) / rect.width) * 100;

            if (newWidth > 10 && newWidth < 90) {
                setLeftPaneWidth(newWidth);
                window.dispatchEvent(new Event('resize'));
            }
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
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, [handleMouseMove, stopResizing]);

    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', stopResizing);
        };
    }, [handleMouseMove, stopResizing]);

    return (
        <div className="flex w-screen h-screen overflow-hidden bg-surface text-on-surface font-sans">
            {/* M3 Navigation Rail */}
            <nav className="w-20 h-full bg-surface-container flex flex-col items-center py-4 gap-4 border-r border-outline/10 flex-none">
                <button
                    className={`flex flex-col items-center gap-1 group transition-all duration-300 ${explorerWidth > 0 ? 'text-on-primary-container' : 'text-on-surface-variant'}`}
                    onClick={() => setExplorerWidth(explorerWidth > 0 ? 0 : 20)}
                >
                    <div className={`w-14 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${explorerWidth > 0 ? 'bg-primary-container' : 'group-hover:bg-surface-variant'}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" />
                        </svg>
                    </div>
                    <span className="text-[12px] font-medium tracking-tight">System</span>
                </button>

                <div className="mt-auto opacity-20 hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant">
                        <span className="font-bold text-xs uppercase tracking-tighter">QS</span>
                    </div>
                </div>
            </nav>

            {/* Side Sheet/Panel: File Explorer & Schema Browser */}
            {explorerWidth > 0 && (
                <aside
                    className="flex flex-col h-full bg-surface-container-low border-r border-outline/10 overflow-hidden relative flex-none shadow-xl z-20"
                    style={{ width: `${explorerWidth}%`, minWidth: '240px' }}
                >
                    {/* Header Tabs */}
                    <div className="flex p-2 gap-1 bg-surface-container/50 border-b border-outline/10 h-14 shrink-0 overflow-x-auto">
                        <button
                            onClick={() => setLeftTab('files')}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${leftTab === 'files' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-on-surface-variant/10'}`}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                            Files
                        </button>
                        <button
                            onClick={() => setLeftTab('schema')}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${leftTab === 'schema' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-on-surface-variant/10'}`}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                                <circle cx="12" cy="12" r="2" />
                            </svg>
                            Schema
                        </button>
                    </div>

                    <div className="flex-1 overflow-hidden relative flex flex-col h-full">
                        {leftTab === 'files' ? (
                            <FileExplorer onGenerateQuery={handleGenerateQuery} />
                        ) : (
                            <SchemaBrowser />
                        )}
                    </div>
                </aside>
            )}

            <main className="grow flex flex-col min-w-0 bg-surface h-full">
                <div className="content-container grow flex p-4 gap-4 min-h-0 h-full overflow-hidden">
                    {/* Middle Pane: SQL & Data */}
                    <section
                        className="flex flex-col overflow-hidden bg-surface-container border border-outline/20 rounded-[28px] shadow-sm active:shadow-md transition-shadow duration-300 h-full"
                        style={{ width: `${leftPaneWidth}%`, flex: 'none' }}
                    >
                        <header className="px-6 py-4 border-b border-outline/10 flex items-center justify-between h-14 shrink-0">
                            <span className="text-xs font-bold tracking-widest uppercase opacity-70">Query Workspace</span>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse opacity-60"></div>
                                <span className="text-[10px] font-mono opacity-30">CONNECTED</span>
                            </div>
                        </header>
                        <div className="grow overflow-hidden relative h-full">
                            <QueryEditor sql={sql} setSql={setSql} />
                        </div>
                    </section>

                    {/* M3 Divider/Resizer */}
                    <div
                        className="w-1 cursor-col-resize group flex items-center justify-center transition-all z-10 -mx-2 hover:w-4"
                        onMouseDown={startResizing}
                    >
                        <div className="w-[1.5px] h-12 bg-outline/20 group-hover:bg-primary transition-colors rounded-full group-hover:h-32"></div>
                    </div>

                    {/* Right Pane: Terminal */}
                    <section className="grow flex flex-col overflow-hidden bg-black border border-outline/20 rounded-[28px] shadow-sm h-full">
                        <header className="px-6 py-4 border-b border-outline/10 flex items-center justify-between bg-surface-container h-14 shrink-0 shadow-sm">
                            <span className="text-xs font-bold tracking-widest uppercase opacity-70">Terminal Shell</span>
                            <div className="flex gap-1">
                                <div className="w-2.5 h-2.5 rounded-full bg-error/20 border border-error/50"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-warning/20 border border-warning/50"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-success/20 border border-success/50"></div>
                            </div>
                        </header>
                        <div className="grow bg-[#000000]">
                            <TerminalTabs />
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

export default App;
