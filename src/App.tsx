import { useState, useEffect, useCallback, useRef } from 'react';
import { ConfigProvider, theme } from 'antd';
import { SplitPane } from './components/Layout/SplitPane';
import { CodeEditor } from './components/Editor/CodeEditor';
import { ConsoleOutput, type LogEntry, type LogType } from './components/Output/ConsoleOutput';
import { ReactPreview } from './components/Preview/ReactPreview';
import { MainLayout } from './components/Layout/MainLayout';
import { Explorer } from './components/Sidebar/Explorer';
import { PackageSidebar } from './components/Sidebar/PackageSidebar';
import { EditorArea } from './components/Layout/EditorArea';

function App() {
  const [mode, setMode] = useState<'repl' | 'react'>('repl');
  const [activeActivity, setActiveActivity] = useState<string>('explorer');
  
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
          line: line
        }]);
      } else if (result !== undefined) {
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
    if (mode === 'react') return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = window.setTimeout(() => {
      runCode(replCode);
    }, 1000);

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

  const activeSidebarContent = activeActivity === 'explorer' 
    ? <Explorer activeFile={mode} onFileSelect={setMode} />
    : activeActivity === 'packages' 
    ? <PackageSidebar mode={mode} />
    : <div className="p-4 text-gray-500">Coming soon</div>;

    const statusContent = (
        <div className="flex justify-between w-full">
            <div className="flex gap-4">
                <span className="cursor-pointer hover:bg-[#005ea3] px-1">master*</span>
            </div>
            <div className="flex gap-4">
                <span>{mode === 'repl' ? 'JavaScript' : 'TypeScript React'}</span>
                <span>UTF-8</span>
            </div>
        </div>
    );

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#007acc',
          colorBgBase: '#1e1e1e', // Editor background
          colorBgContainer: '#252526', // Sidebar background
          borderRadius: 4,
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        },
        components: {
          Layout: {
            siderBg: '#333333', // Activity Bar
            bodyBg: '#1e1e1e',
          },
          Tabs: {
            cardBg: '#2d2d2d',
            itemActiveColor: '#ffffff',
            inkBarColor: '#007acc',
          }
        }
      }}
    >
      <MainLayout
        activeActivity={activeActivity}
        onActivityChange={(key) => setActiveActivity(prev => prev === key ? '' : key)}
        sidebarContent={activeSidebarContent}
        statusContent={statusContent}
      >
        <EditorArea
            activeMode={mode}
            onTabChange={(key) => setMode(key as 'repl' | 'react')}
            onRun={handleManualRun}
            onClear={handleClearLogs}
        >
            <SplitPane
              left={
                <CodeEditor
                    key={mode}
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
        </EditorArea>
      </MainLayout>
    </ConfigProvider>
  );
}

export default App;
