import React from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
    code: string;
    onChange: (value: string | undefined) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange }) => {

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
            jsx: monaco.languages.typescript.JsxEmit.React,
            reactNamespace: 'React',
            allowJs: true,
            typeRoots: ['node_modules/@types']
        });
    };

    return (
        <div className="h-full w-full">
            <Editor
                height="100%"
                defaultLanguage="typescript"
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
