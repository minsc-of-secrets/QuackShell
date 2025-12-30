import { useState, useEffect, useCallback } from 'react';

interface FileExplorerProps {
    onGenerateQuery?: (sql: string) => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ onGenerateQuery }) => {
    const [files, setFiles] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [currentPath, setCurrentPath] = useState('');

    const fetchCurrentPath = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/cwd');
            const data = await res.json();
            if (data.cwd) {
                setCurrentPath(data.cwd);
            }
        } catch (err) {
            console.error('Failed to fetch cwd:', err);
        }
    };

    const fetchFiles = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/files');
            const data = await res.json();
            if (data.files) {
                setFiles(data.files);
            }
        } catch (err) {
            console.error('Failed to fetch files:', err);
        }
    };

    const changeDirectory = async (newPath: string) => {
        try {
            const res = await fetch('http://localhost:3001/api/cwd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: newPath })
            });
            const data = await res.json();
            if (data.error) {
                alert(data.error);
                fetchCurrentPath();
            } else {
                setCurrentPath(data.cwd);
                setFiles(data.files);
            }
        } catch (err) {
            console.error('Failed to change directory:', err);
        }
    };

    useEffect(() => {
        fetchCurrentPath();
        fetchFiles();
        const interval = setInterval(fetchFiles, 5000);
        return () => clearInterval(interval);
    }, []);

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const onDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles.length === 0) return;

        for (let i = 0; i < droppedFiles.length; i++) {
            const file = droppedFiles[i];
            const formData = new FormData();
            formData.append('file', file);
            try {
                await fetch('http://localhost:3001/api/upload', {
                    method: 'POST',
                    body: formData,
                });
            } catch (err) {
                console.error('Upload failed for', file.name, err);
            }
        }
        fetchFiles();
    }, []);

    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: string } | null>(null);

    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    const handleContextMenu = (e: React.MouseEvent, file: string) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            file: file
        });
    };

    return (
        <div
            className={`flex flex-col h-full transition-colors duration-300 ${isDragging ? 'bg-primary/10' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            <div className="flex flex-col w-full p-2">
                {files.length === 0 ? (
                    <div className="p-8 text-center opacity-40">
                        <div className="text-4xl mb-2">📁</div>
                        <span className="text-xs font-medium tracking-wide">Empty directory</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {files.map((file, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-200 hover:bg-surface-variant active:scale-[0.98] group"
                                onContextMenu={(e) => handleContextMenu(e, file)}
                                onClick={() => onGenerateQuery && onGenerateQuery(`SELECT * FROM '${file}' LIMIT 100;`)}
                                title={file}
                            >
                                <span className="text-lg opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all">📄</span>
                                <span className="text-sm font-medium tracking-tight overflow-hidden text-ellipsis whitespace-nowrap text-on-surface/80 group-hover:text-on-surface">
                                    {file}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-auto p-4 flex flex-col gap-3 bg-surface-container-high rounded-t-3xl border-t border-outline/10">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        changeDirectory(currentPath);
                    }}
                    className="flex flex-col gap-2"
                >
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-primary ml-1">Working Directory</label>
                        <input
                            type="text"
                            value={currentPath}
                            onChange={(e) => setCurrentPath(e.target.value)}
                            className="bg-surface border border-outline/30 text-xs px-3 py-2 rounded-xl w-full outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            placeholder="Path..."
                        />
                    </div>
                    <button
                        type="button"
                        onClick={async () => {
                            try {
                                const res = await fetch('http://localhost:3001/api/pick-dir', { method: 'POST' });
                                const data = await res.json();
                                if (data.path) {
                                    changeDirectory(data.path);
                                }
                            } catch (e) {
                                console.error('Failed to pick dir', e);
                            }
                        }}
                        className="w-full py-2 bg-secondary text-on-secondary text-xs rounded-full font-bold tracking-wide hover:shadow-md active:scale-95 transition-all uppercase"
                        title="Browse Folder"
                    >
                        Browse
                    </button>
                </form>
                <button
                    onClick={fetchFiles}
                    className="w-full py-2 border border-outline/30 text-on-surface-variant text-xs rounded-full font-bold tracking-wide hover:bg-surface-variant active:scale-95 transition-all uppercase"
                    title="Refresh"
                >
                    Refresh
                </button>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed bg-surface-container-high border border-outline/20 rounded-2xl py-2 z-[1000] shadow-2xl min-w-[200px] animate-in fade-in zoom-in-95 duration-150"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <div
                        onClick={() => onGenerateQuery && onGenerateQuery(`SELECT * FROM '${contextMenu.file}' LIMIT 100;`)}
                        className="px-4 py-3 cursor-pointer text-sm text-on-surface hover:bg-surface-variant transition-colors flex items-center gap-3"
                    >
                        <span className="text-secondary">⚡</span>
                        Generate SELECT Query
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileExplorer;
