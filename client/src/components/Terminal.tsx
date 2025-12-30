import { useEffect, useRef } from 'react';
import { Terminal as Xterm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import io from 'socket.io-client';

const Terminal = () => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<any>(null);

    useEffect(() => {
        // 1. Initialize Socket.io
        socketRef.current = io('http://localhost:3001');

        // 2. Initialize xterm.js
        const term = new Xterm({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: {
                background: '#000000',
                foreground: '#ffffff',
                cursor: '#D0BCFF'
            },
            allowProposedApi: true
        });

        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();
        term.loadAddon(fitAddon);
        term.loadAddon(webLinksAddon);

        if (terminalRef.current) {
            term.open(terminalRef.current);
            // Small delay to ensure container is fully rendered
            setTimeout(() => fitAddon.fit(), 100);
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
            try {
                fitAddon.fit();
                socketRef.current?.emit('terminal:resize', {
                    cols: term.cols,
                    rows: term.rows,
                });
            } catch (e) {
                // Ignore fit errors on unmounted
            }
        };
        window.addEventListener('resize', handleResize);

        // Initial resize
        handleResize();

        // Cleanup
        return () => {
            socketRef.current?.disconnect();
            term.dispose();
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return <div className="w-full h-full p-2 bg-black overflow-hidden" ref={terminalRef} />;
};

export default Terminal;
