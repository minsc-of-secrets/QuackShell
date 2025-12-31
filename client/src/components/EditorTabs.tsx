import { useState, useRef, useEffect } from 'react';

interface QueryTab {
    id: string;
    name: string;
}

interface EditorTabsProps {
    tabs: QueryTab[];
    activeTabId: string;
    onSelectTab: (id: string) => void;
    onAddTab: () => void;
    onCloseTab: (e: React.MouseEvent, id: string) => void;
    onRenameTab: (id: string, newName: string) => void;
    onReorderTab: (sourceIndex: number, targetIndex: number) => void;
}

const EditorTabs: React.FC<EditorTabsProps> = ({
    tabs,
    activeTabId,
    onSelectTab,
    onAddTab,
    onCloseTab,
    onRenameTab,
    onReorderTab
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingId]);

    const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
            setEditingId(null);
        }
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.setData('sourceIndex', index.toString());
        e.dataTransfer.effectAllowed = 'move';
        setDraggingIndex(index);
    };

    const handleDragEnd = () => {
        setDraggingIndex(null);
        setDragOverIndex(null);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        const sourceIndexStr = e.dataTransfer.getData('sourceIndex');
        if (sourceIndexStr === '') return;

        const sourceIndex = parseInt(sourceIndexStr, 10);
        if (!isNaN(sourceIndex) && sourceIndex !== targetIndex) {
            onReorderTab(sourceIndex, targetIndex);
        }
        setDragOverIndex(null);
        setDraggingIndex(null);
    };

    return (
        <div className="flex items-center px-4 bg-surface-container shrink-0 border-b border-outline/10 h-12">
            <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar h-full pt-2">
                {tabs.map((tab, index) => (
                    <div
                        key={tab.id}
                        draggable={editingId !== tab.id}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onClick={() => onSelectTab(tab.id)}
                        onDoubleClick={() => setEditingId(tab.id)}
                        className={`group relative flex items-center gap-3 px-4 py-2 rounded-t-2xl transition-all cursor-pointer min-w-[120px] max-w-[240px] border-x border-t shadow-sm ${activeTabId === tab.id
                                ? 'bg-surface-container-lowest text-primary border-outline/10 z-10'
                                : 'bg-surface-container-high text-on-surface-variant/60 border-transparent hover:bg-surface-variant/50 mt-1'
                            } ${dragOverIndex === index ? (draggingIndex !== null && draggingIndex < index ? 'border-r-4 border-r-primary' : 'border-l-4 border-l-primary') : ''} ${draggingIndex === index ? 'opacity-30' : ''
                            }`}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 shrink-0">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>

                        {editingId === tab.id ? (
                            <input
                                ref={inputRef}
                                type="text"
                                value={tab.name}
                                onChange={(e) => onRenameTab(tab.id, e.target.value)}
                                onBlur={() => setEditingId(null)}
                                onKeyDown={(e) => handleKeyDown(e, tab.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-surface-container py-0.5 px-1 rounded border border-primary outline-none text-[11px] font-bold uppercase tracking-wider w-full"
                                spellCheck={false}
                            />
                        ) : (
                            <span className="text-[11px] font-bold uppercase tracking-wider truncate w-full select-none">
                                {tab.name}
                            </span>
                        )}

                        {tabs.length > 1 && (
                            <button
                                onClick={(e) => onCloseTab(e, tab.id)}
                                className={`p-1 rounded-md hover:bg-error/10 hover:text-error transition-all ${activeTabId === tab.id ? 'opacity-40 hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
                                    }`}
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        )}

                        {/* Active Indicator Line */}
                        {activeTabId === tab.id && (
                            <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-primary z-20"></div>
                        )}
                    </div>
                ))}
            </div>

            <button
                onClick={onAddTab}
                className="ml-4 p-2 rounded-xl hover:bg-primary/10 text-primary transition-all active:scale-90 border border-transparent hover:border-primary/20"
                title="New Query Tab"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
        </div>
    );
};

export default EditorTabs;
