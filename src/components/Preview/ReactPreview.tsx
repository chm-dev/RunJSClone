
import React, { useEffect, useState, useRef } from 'react';
import { TransformOptions, transform } from '@babel/standalone';
import { PreviewErrorBoundary } from './PreviewErrorBoundary';
import * as ReactLibrary from 'react';
import * as ReactDOMLibrary from 'react-dom';

interface ReactPreviewProps {
    code: string;
}

const ExecuteComponent: React.FC<{ code: string }> = ({ code }) => {
    const [ComponentToRender, setComponentToRender] = useState<React.ReactNode | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            // Transpile JSX/TSX to JS
            const options: TransformOptions = {
                presets: ['react', 'env'],
                filename: 'preview.tsx',
            };

            const result = transform(code, options).code;

            if (!result) return;

            // Execute the code
            // We need to provide a minimal CommonJS-like environment
            const exports: any = {};
            const module = { exports };
            
            // Shim require for React/ReactDOM
            const require = (name: string) => {
                if (name === 'react') return ReactLibrary;
                if (name === 'react-dom') return ReactDOMLibrary;
                throw new Error(`Module '${name}' not found`);
            };

            // Wrap in function to avoid top-level scope pollution and allow 'return' if needed (though we expect exports)
            // Using new Function is safer than eval but still has access to global scope (window)
            // valid for client-side preview in this context.
            const run = new Function('require', 'module', 'exports', 'React', result);
            
            run(require, module, exports, ReactLibrary);

            const DefaultExport = module.exports.default || exports.default;

            if (DefaultExport) {
                if (ReactLibrary.isValidElement(DefaultExport)) {
                    setComponentToRender(DefaultExport);
                } else if (typeof DefaultExport === 'function') {
                    setComponentToRender(ReactLibrary.createElement(DefaultExport));
                } else {
                     setError("Default export is not a valid React component or element");
                }
            } else {
                setError("No default export found. Please 'export default' your component.");
            }
            setError(null);

        } catch (err: any) {
             setError(err.message || String(err));
        }
    }, [code]);

    if (error) {
         return (
            <div className="p-4 text-red-400 font-mono text-sm whitespace-pre-wrap">
                Transform/Runtime Error: {error}
            </div>
        );
    }

    return <>{ComponentToRender}</>;
};

export const ReactPreview: React.FC<ReactPreviewProps> = ({ code }) => {
    return (
        <div className="h-full w-full bg-[var(--bg-primary)] p-4 overflow-auto">
             <PreviewErrorBoundary key={code}>
                <ExecuteComponent code={code} />
             </PreviewErrorBoundary>
        </div>
    );
};
