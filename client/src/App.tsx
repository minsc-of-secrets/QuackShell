import { useState, useCallback, useEffect, useRef } from 'react';
import Terminal from './components/Terminal';
import QueryEditor from './components/QueryEditor';
import FileExplorer from './components/FileExplorer';

function App() {
    const [sql, setSql] = useState('SELECT * FROM pragma_database_list();');
    const [showFiles, setShowFiles] = useState(true);

    // Resizable Panes State
    const [leftPaneWidth, setLeftPaneWidth] = useState(50); // percentage
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
        <div className="flex w-screen h-screen overflow-hidden bg-surface text-on-surface">
            {/* M3 Navigation Rail */}
            <nav className="w-20 h-full bg-surface-container flex flex-col items-center py-4 gap-4 border-r border-outline/10">
                <button
                    className={`flex flex-col items-center gap-1 group transition-all duration-300 ${showFiles ? 'text-on-primary-container' : 'text-on-surface-variant'}`}
                    onClick={() => setShowFiles(!showFiles)}
                >
                    <div className={`w-14 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${showFiles ? 'bg-primary-container' : 'group-hover:bg-surface-variant'}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" />
                        </svg>
                    </div>
                    <span className="text-[12px] font-medium tracking-tight">Files</span>
                </button>

                <div className="mt-auto opacity-20 hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant">
                        <span className="font-bold text-xs">DB</span>
                    </div>
                </div>
            </nav>

            {/* Side Sheet/Panel: File Explorer */}
            {showFiles && (
                <aside className="w-[280px] h-full bg-surface-container-low border-r border-outline/10 flex flex-col animate-in slide-in-from-left duration-300">
                    <div className="p-4 flex items-center justify-between border-b border-outline/10 h-16">
                        <span className="text-xl font-medium tracking-tight">Explorer</span>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <FileExplorer onGenerateQuery={handleGenerateQuery} />
                    </div>
                </aside>
            )}

            <main className="grow flex flex-col min-w-0 bg-surface">
                <div className="content-container grow flex p-4 gap-4 min-h-0">
                    {/* Middle Pane: SQL & Data - M3 Outlined Card */}
                    <section
                        className="flex flex-col overflow-hidden bg-surface-container border border-outline/20 rounded-[24px] shadow-sm active:shadow-md transition-shadow duration-300"
                        style={{ width: `${leftPaneWidth}%`, flex: 'none' }}
                    >
                        <header className="px-6 py-4 border-b border-outline/10 flex items-center justify-between h-14 shrink-0">
                            <span className="text-sm font-medium tracking-wide uppercase opacity-70">Query Editor</span>
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#D0BCFF]"></div>
                        </header>
                        <div className="grow overflow-hidden relative">
                            <QueryEditor sql={sql} setSql={setSql} />
                        </div>
                    </section>

                    {/* M3 Divider/Resizer */}
                    <div
                        className="w-1 cursor-col-resize group flex items-center justify-center transition-all z-10 -mx-2"
                        onMouseDown={startResizing}
                    >
                        <div className="w-[1px] h-12 bg-outline/20 group-hover:bg-primary transition-colors rounded-full lg:h-24"></div>
                    </div>

                    {/* Right Pane: Terminal - M3 Outlined Card */}
                    <section className="grow flex flex-col overflow-hidden bg-black border border-outline/20 rounded-[24px] shadow-sm">
                        <header className="px-6 py-4 border-b border-outline/10 flex items-center justify-between bg-surface-container h-14 shrink-0">
                            <span className="text-sm font-medium tracking-wide uppercase opacity-70">Terminal</span>
                        </header>
                        <div className="grow">
                            <Terminal />
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

export default App;
