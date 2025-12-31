import { useState } from 'react';
import Terminal from './Terminal';

interface Tab {
    id: string;
    label: string;
}

const TerminalTabs = () => {
    const [tabs, setTabs] = useState<Tab[]>([{ id: '1', label: 'Shell 1' }]);
    const [activeTabId, setActiveTabId] = useState<string>('1');
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

    const addTab = () => {
        const newId = crypto.randomUUID();
        const nextNum = tabs.length + 1;
        setTabs([...tabs, { id: newId, label: `Shell ${nextNum}` }]);
        setActiveTabId(newId);
    };

    const removeTab = (e: React.MouseEvent, idToRemove: string) => {
        e.stopPropagation();
        if (tabs.length === 1) return;

        const newTabs = tabs.filter(t => t.id !== idToRemove);
        setTabs(newTabs);

        if (activeTabId === idToRemove) {
            setActiveTabId(newTabs[newTabs.length - 1].id);
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
            const newTabs = [...tabs];
            const [movedTab] = newTabs.splice(sourceIndex, 1);
            newTabs.splice(targetIndex, 0, movedTab);
            setTabs(newTabs);
        }
        setDragOverIndex(null);
        setDraggingIndex(null);
    };

    return (
        <div className="flex flex-col h-full bg-black overflow-hidden">
            {/* Tab Bar */}
            <div className="flex items-center px-2 bg-surface-container shrink-0 border-b border-white/5 h-10">
                <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                    {tabs.map((tab, index) => (
                        <div
                            key={tab.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            onClick={() => setActiveTabId(tab.id)}
                            className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-lg transition-all cursor-pointer min-w-[100px] max-w-[200px] ${activeTabId === tab.id
                                    ? 'bg-black text-primary font-bold border-b-2 border-primary'
                                    : 'bg-surface-container-high text-on-surface-variant/60 hover:text-on-surface-variant hover:bg-surface-variant/50'
                                } ${dragOverIndex === index ? (draggingIndex !== null && draggingIndex < index ? 'border-r-2 border-r-primary' : 'border-l-2 border-l-primary') : ''} ${draggingIndex === index ? 'opacity-30' : ''
                                }`}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 shrink-0">
                                <path d="M4 17l6-6-6-6M12 19h8" />
                            </svg>
                            <span className="text-[10px] truncate uppercase tracking-wider select-none">{tab.label}</span>

                            {tabs.length > 1 && (
                                <button
                                    onClick={(e) => removeTab(e, tab.id)}
                                    className={`ml-auto opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-error/20 hover:text-error transition-all ${activeTabId === tab.id ? 'opacity-40' : ''}`}
                                >
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <button
                    onClick={addTab}
                    className="ml-2 p-1.5 rounded-lg hover:bg-surface-variant text-primary transition-all active:scale-95"
                    title="New Tab"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
            </div>

            {/* Terminal Viewport */}
            <div className="flex-1 relative bg-black">
                {tabs.map((tab) => (
                    <Terminal key={tab.id} active={activeTabId === tab.id} />
                ))}
            </div>
        </div>
    );
};

export default TerminalTabs;
