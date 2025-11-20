import React, { useEffect, useRef } from 'react';

export type LogType = 'log' | 'warn' | 'error' | 'info' | 'return';

export interface LogEntry {
    type: LogType;
    args: any[];
    timestamp: number;
}

interface ConsoleOutputProps {
    logs: LogEntry[];
}

export const ConsoleOutput: React.FC<ConsoleOutputProps> = ({ logs }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const formatValue = (value: any): string => {
        if (value === undefined) return 'undefined';
        if (value === null) return 'null';
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value, null, 2);
            } catch (e) {
                return '[Circular or Invalid Object]';
            }
        }
        return String(value);
    };

    return (
        <div className="h-full w-full bg-[var(--bg-primary)] overflow-auto p-4 font-mono text-sm" style={{ fontFamily: 'Consolas, "Courier New", monospace', fontSize: '14px', lineHeight: '19px', marginTop: '16px' }}>
            {logs.length === 0 && (
                <div className="text-[var(--text-secondary)] opacity-50 italic">
                    Output will appear here...
                </div>
            )}

            <div className="flex flex-col gap-2">
                {logs.map((log, index) => (
                    <div
                        key={`${log.timestamp}-${index}`}
                        className={`
              p-2 rounded border-l-2 
              ${log.type === 'error' ? 'bg-red-900/20 border-red-500 text-red-200' : ''}
              ${log.type === 'warn' ? 'bg-yellow-900/20 border-yellow-500 text-yellow-200' : ''}
              ${log.type === 'info' ? 'bg-blue-900/20 border-blue-500 text-blue-200' : ''}
              ${log.type === 'return' ? 'bg-green-900/10 border-green-500 text-green-200' : ''}
              ${log.type === 'log' ? 'border-transparent text-[var(--text-primary)]' : ''}
            `}
                    >
                        {log.type === 'return' && <span className="text-green-500 mr-2">➜</span>}
                        {log.args.map((arg, i) => (
                            <span key={i} className="break-words">
                                {typeof arg === 'string' ? arg : formatValue(arg)}
                                {i < log.args.length - 1 ? ' ' : ''}
                            </span>
                        ))}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    );
};
