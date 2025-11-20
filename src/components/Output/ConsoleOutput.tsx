import React from 'react';

export type LogType = 'log' | 'warn' | 'error' | 'info' | 'return';

export interface LogEntry {
    type: LogType;
    args: any[];
    timestamp: number;
    line?: number;
}

interface ConsoleOutputProps {
    logs: LogEntry[];
}

export const ConsoleOutput: React.FC<ConsoleOutputProps> = ({ logs }) => {
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

    // Group logs by line number to handle multiple logs on the same line
    const logsByLine = logs.reduce((acc, log) => {
        const line = log.line || 0; // Default to 0 or handle unaligned logs
        if (!acc[line]) {
            acc[line] = [];
        }
        acc[line].push(log);
        return acc;
    }, {} as Record<number, LogEntry[]>);

    return (
        <div className="h-full w-full bg-[var(--bg-primary)] overflow-auto font-mono text-sm relative" style={{ fontFamily: 'Consolas, "Courier New", monospace', fontSize: '14px' }}>
            {/* We need a container that matches the editor's height/scroll area. 
                 For now, we assume the parent handles scrolling or this container does.
                 If we want exact alignment, we need to ensure the top padding matches the editor's.
                 Editor has padding: { top: 16 }.
             */}
            <div className="absolute top-0 left-0 w-full" style={{ marginTop: '16px', paddingLeft: '8px' }}>
                {Object.entries(logsByLine).map(([lineStr, lineLogs]) => {
                    const line = parseInt(lineStr, 10);
                    // If line is undefined or 0 (meaning no line detected), we might want to show it at the bottom or top.
                    // For now, let's only render logs that have a valid line number > 0.
                    // If we want to support unaligned logs, we'd need a separate section or strategy.
                    if (line <= 0) return null;

                    const top = (line - 1) * 19; // 19px line height assumption

                    return (
                        <div
                            key={line}
                            className="absolute w-full flex gap-2 px-4 pointer-events-none"
                            style={{ top: `${top}px`, height: '19px', lineHeight: '19px' }}
                        >
                            {lineLogs.map((log, index) => (
                                <div
                                    key={`${log.timestamp}-${index}`}
                                    className={`
                                        inline-flex items-center px-1 rounded opacity-80 hover:opacity-100 pointer-events-auto
                                        ${log.type === 'error' ? 'text-red-400' : ''}
                                        ${log.type === 'warn' ? 'text-yellow-400' : ''}
                                        ${log.type === 'info' ? 'text-blue-400' : ''}
                                        ${log.type === 'return' ? 'text-green-400' : ''}
                                        ${log.type === 'log' ? 'text-[var(--text-secondary)]' : ''}
                                    `}
                                >
                                    {log.type === 'return' && <span className="mr-1">➜</span>}
                                    {log.args.map((arg, i) => (
                                        <span key={i} className="">
                                            {typeof arg === 'string' ? arg : formatValue(arg)}
                                            {i < log.args.length - 1 ? ' ' : ''}
                                        </span>
                                    ))}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {/* Handle unaligned logs (line 0 or undefined) if any? 
                For now, ignoring them as per "logs and outputs to be in the same lines as expressions"
            */}
        </div>
    );
};
