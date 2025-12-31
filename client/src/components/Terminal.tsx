import { useEffect, useRef, memo } from 'react';
import { Terminal as Xterm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import io from 'socket.io-client';

interface TerminalProps {
    active: boolean;
}

const Terminal: React.FC<TerminalProps> = ({ active }) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Xterm | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const socketRef = useRef<any>(null);
    const initializedRef = useRef(false);

    useEffect(() => {
        // Only initialize once, when the component first becomes active
        if (!active || initializedRef.current) return;

        initializedRef.current = true;

        // 1. Initialize Socket.io
        socketRef.current = io('http://localhost:3001');

        // 2. Initialize xterm.js
        const term = new Xterm({
            cursorBlink: true,
            fontSize: 13,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: {
                background: '#000000',
                foreground: '#ffffff',
                cursor: '#D0BCFF',
                selectionBackground: 'rgba(208, 188, 255, 0.3)',
            },
            allowProposedApi: true
        });

        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();
        term.loadAddon(fitAddon);
        term.loadAddon(webLinksAddon);

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        if (terminalRef.current) {
            term.open(terminalRef.current);
            setTimeout(() => {
                try {
                    fitAddon.fit();
                } catch (e) {
                    // Ignore fit errors during initialization
                }
            }, 100);
        }

        // 3. Handle Terminal Input -> Socket
        term.onData((data) => {
            socketRef.current?.emit('terminal:input', data);
        });

        // 4. Handle Socket Output -> Terminal
        socketRef.current?.on('terminal:output', (data: any) => {
            term.write(data);
        });

        // 5. Handle Resize
        const handleResize = () => {
            if (!xtermRef.current || !fitAddonRef.current) return;
            try {
                fitAddonRef.current.fit();
                socketRef.current?.emit('terminal:resize', {
                    cols: xtermRef.current.cols,
                    rows: xtermRef.current.rows,
                });
            } catch (e) {
                // Ignore fit errors
            }
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            socketRef.current?.disconnect();
            term.dispose();
            window.removeEventListener('resize', handleResize);
        };
    }, [active]);

    // Effect to refit when tab becomes active
    useEffect(() => {
        if (active && fitAddonRef.current && xtermRef.current && initializedRef.current) {
            setTimeout(() => {
                try {
                    fitAddonRef.current?.fit();
                    socketRef.current?.emit('terminal:resize', {
                        cols: xtermRef.current?.cols,
                        rows: xtermRef.current?.rows,
                    });
                } catch (e) {
                    // Ignore fit errors
                }
            }, 50);
        }
    }, [active]);

    return (
        <div
            className="w-full h-full bg-black overflow-hidden"
            style={{ display: active ? 'block' : 'none' }}
            ref={terminalRef}
        />
    );
};

export default memo(Terminal);
