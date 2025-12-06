import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Trash2, Package } from 'lucide-react';
import { SplitPane } from './components/Layout/SplitPane';
import { CodeEditor } from './components/Editor/CodeEditor';
import { ConsoleOutput, type LogEntry, type LogType } from './components/Output/ConsoleOutput';
import { PackageManager } from './components/Packages/PackageManager';
import { ReactPreview } from './components/Preview/ReactPreview';

function App() {
  const [mode, setMode] = useState<'repl' | 'react'>('repl');
  const [replCode, setReplCode] = useState<string>(`// Welcome to Node REPL!
// Write your JavaScript or TypeScript code here and press Ctrl+Enter to execute

console.log("Hello, World!");

// TypeScript example:
interface User {
  name: string;
  id: number;
}

const user: User = {
  name: "RunJS User",
  id: 1,
};

console.log("User:", user);

// Try some Node.js features (when running in Electron):
try {
  const os = require("os");
  console.log("Platform:", os.platform());
  console.log("Home directory:", os.homedir());
} catch (error) {
  console.log("Node.js modules not available");
}

// Async/Await example:
async function example() {
  return new Promise((resolve) => {
    setTimeout(() => resolve("Async operation completed!"), 1000);
  });
}

example().then((r) => console.log(r));
`);
  const [reactCode, setReactCode] = useState<string>(`import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-4 text-white">
      <h1 className="text-2xl font-bold mb-4">React Mode</h1>
      <p className="mb-4">Standard React hooks work here!</p>
      
      <button 
        className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 transition-colors"
        onClick={() => setCount(c => c + 1)}
      >
        Count: {count}
      </button>
    </div>
  );
}
`);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPackageManagerOpen, setIsPackageManagerOpen] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const runCode = useCallback(async (codeToRun: string) => {
    setLogs([]); // Clear logs on run

    try {
      const { success, result, error, line } = await window.electron.executeCode(codeToRun);

      if (!success) {
        setLogs(prev => [...prev, {
          type: 'error',
          args: [error],
          timestamp: Date.now(),
          line: line // Use line from error if available
        }]);
      } else if (result !== undefined) {
        // Calculate line number for the result (last non-empty line)
        const lines = codeToRun.split('\n');
        let lastLineIndex = lines.length - 1;
        while (lastLineIndex >= 0 && lines[lastLineIndex].trim() === '') {
          lastLineIndex--;
        }
        const resultLine = lastLineIndex + 1;

        setLogs(prev => [...prev, {
          type: 'return',
          args: [result],
          timestamp: Date.now(),
          line: resultLine
        }]);
      }
    } catch (err: any) {
      setLogs(prev => [...prev, {
        type: 'error',
        args: [err.message || String(err)],
        timestamp: Date.now()
      }]);
    }
  }, []);

  // Handle console output from Electron
  useEffect(() => {
    const removeListener = window.electron.onConsoleOutput((data) => {
      // Map 'log' | 'error' | 'warn' | 'info' to LogType
      // Note: 'method' comes from main.ts
      const typeMap: Record<string, LogType> = {
        log: 'log',
        error: 'error',
        warn: 'warn',
        info: 'info'
      };

      setLogs(prev => [...prev, {
        type: typeMap[data.method] || 'log',
        args: data.data,
        timestamp: Date.now(),
        line: data.line
      }]);
    });

    return () => {
      removeListener();
    };
  }, []);

  // Debounced auto-run (REPL mode only)
  useEffect(() => {
    if (mode === 'react') return; // Do not auto-run via Electron in React mode (handled by preview comp)

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = window.setTimeout(() => {
      runCode(replCode);
    }, 1000); // 1s debounce

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [replCode, runCode, mode]);

  const handleManualRun = () => {
    if (mode === 'react') return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    runCode(replCode);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="h-12 border-b border-[var(--border-color)] flex flex-row px-4 bg-[var(--bg-secondary)] items-center justify-between">
        <div className="flex items-center gap-4">
             <div className="flex bg-[var(--bg-tertiary)] rounded p-1 gap-1">
                <button
                    onClick={() => setMode('repl')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${mode === 'repl' ? 'bg-[var(--accent-color)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                    REPL
                </button>
                <button
                    onClick={() => setMode('react')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${mode === 'react' ? 'bg-[var(--accent-color)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                    React
                </button>
            </div>
        </div>

        <div className="flex items-center gap-2">
            {mode === 'repl' && (
                <>
                  <button
                    onClick={handleClearLogs}
                    className="p-2 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    title="Clear Output"
                  >
                    <Trash2 className="w-4 h-4 " />
                  </button>
                  <button
                    onClick={handleManualRun}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded text-sm font-medium transition-colors"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <div className="w-px h-6 bg-[var(--border-color)] mx-2" />
                </>
            )}
          <button
            onClick={() => setIsPackageManagerOpen(true)}
            className=" px-3 py-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded text-sm font-medium transition-colors border border-[var(--border-color)]"
          >
            <Package className="w-4 h-4" />

          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        <SplitPane
          left={
            <CodeEditor
              key={mode} // Force re-mount on mode change to reset undo stack/compiler opts if needed
              code={mode === 'repl' ? replCode : reactCode}
              onChange={(val) => mode === 'repl' ? setReplCode(val || '') : setReactCode(val || '')}
              mode={mode}
            />
          }
          right={
            mode === 'repl' ? <ConsoleOutput logs={logs} /> : <ReactPreview code={reactCode} />
          }
          initialSplit={50}
        />
      </main>

      <PackageManager
        isOpen={isPackageManagerOpen}
        onClose={() => setIsPackageManagerOpen(false)}
      />
    </div>
  );
}

export default App;
