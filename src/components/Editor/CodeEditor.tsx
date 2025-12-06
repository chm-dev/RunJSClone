import React from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
    code: string;
    onChange: (value: string | undefined) => void;
    mode: 'repl' | 'react';
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, mode }) => {

    const handleEditorDidMount = (_editor: any, monaco: any) => {
        // Define custom theme
        monaco.editor.defineTheme('runjs-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#0f0f11', // var(--bg-primary)
                'editor.lineHighlightBackground': '#1a1a1e',
            }
        });
        monaco.editor.setTheme('runjs-dark');

        // Configure TypeScript compiler options
        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: false,
            noSyntaxValidation: false,
        });

        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ESNext,
            allowNonTsExtensions: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.CommonJS,
            noEmit: true,
            esModuleInterop: true,
            jsx: mode === 'react' ? monaco.languages.typescript.JsxEmit.React : monaco.languages.typescript.JsxEmit.React, // Always allow React for simplicity or strict based on mode
            reactNamespace: 'React',
            allowJs: true,
            typeRoots: ['node_modules/@types']
        });

        // Add types for Node.js globals available in the REPL
        monaco.languages.typescript.typescriptDefaults.addExtraLib(`
            declare var require: any;
            declare var process: any;
            declare var module: any;
            declare var __dirname: string;
            declare var __filename: string;
        `, 'node-types.d.ts');

        // Add minimal React types to prevent "Cannot find module 'react'" errors
        monaco.languages.typescript.typescriptDefaults.addExtraLib(`
            declare module 'react' {
                export = React;
            }
            declare namespace React {
                type ReactNode = any;
                function useState<S>(initialState: S | (() => S)): [S, (newState: S | ((prevState: S) => S)) => void];
                function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
                function createElement(type: any, props?: any, ...children: any[]): any;
                
                // Add other common hooks/types as needed
                function useCallback<T extends Function>(callback: T, deps: readonly any[]): T;
                function useMemo<T>(factory: () => T, deps: readonly any[]): T;
                function useRef<T>(initialValue: T): { current: T };
            }
        `, 'react.d.ts');
    };

    return (
        <div className="h-full w-full">
            <Editor
                height="100%"
                defaultLanguage="typescript"
                path={mode === 'react' ? 'index.tsx' : 'index.ts'}
                value={code}
                onChange={onChange}
                theme="runjs-dark"
                onMount={handleEditorDidMount}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    padding: { top: 16 },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                }}
            />
        </div>
    );
};
