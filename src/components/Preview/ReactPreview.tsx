
import React, { useEffect, useState, useRef } from 'react';
import { transform } from '@babel/standalone';
import { PreviewErrorBoundary } from './PreviewErrorBoundary';
import * as ReactLibrary from 'react';
import * as ReactDOMLibrary from 'react-dom';

interface ReactPreviewProps {
    code: string;
}

const ExecuteComponent: React.FC<{ code: string }> = ({ code }) => {
    const [ComponentToRender, setComponentToRender] = useState<React.ReactNode | null>(null);
    const [error, setError] = useState<string | null>(null);
    const packageCache = useRef<Record<string, any>>({});

    useEffect(() => {
        let isMounted = true;
        const execute = async () => {
            try {
                // Transpile JSX/TSX to JS
                const options: any = {
                    presets: ['react', 'env'],
                    filename: 'preview.tsx',
                };

                const transpiledCode = transform(code, options).code;

                if (!transpiledCode) return;

                // Scan for dependencies
                const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
                const matches = [...transpiledCode.matchAll(requireRegex)];
                const requiredPackages = Array.from(new Set(matches.map(m => m[1])));

                // Filter out external libraries we already have or know
                const packagesToLoad = requiredPackages.filter(pkg => 
                    pkg !== 'react' && 
                    pkg !== 'react-dom' && 
                    !packageCache.current[pkg]
                );

                // Load missing packages
                for (const pkg of packagesToLoad) {
                    // console.log(`Loading package: ${pkg}`);
                    const result = await window.electron.bundleReactPackage(pkg);
                    if (!result.success || !result.code) {
                        throw new Error(`Failed to load package '${pkg}': ${result.error || 'Unknown error'}`);
                    }

                    // Execute the bundled package to get its exports
                    const exports: any = {};
                    const module = { exports };
                    
                    // Minimal require for the bundle itself (usually bundles are self-contained or depend on react)
                    const bundleRequire = (name: string) => {
                         if (name === 'react') return ReactLibrary;
                         if (name === 'react-dom') return ReactDOMLibrary;
                         // If the bundle requires another package we haven't loaded, this might fail.
                         // But usually bundles include deps.
                         throw new Error(`Bundle '${pkg}' tried to require '${name}' which is not available.`);
                    };

                    const runBundle = new Function('require', 'module', 'exports', 'React', result.code);
                    runBundle(bundleRequire, module, exports, ReactLibrary);
                    
                    packageCache.current[pkg] = module.exports;
                }
                
                if (!isMounted) return;

                // Execute the user code
                const exports: any = {};
                const module = { exports };
                
                const userRequire = (name: string) => {
                    if (name === 'react') return ReactLibrary;
                    if (name === 'react-dom') return ReactDOMLibrary;
                    if (packageCache.current[name]) return packageCache.current[name];
                    throw new Error(`Module '${name}' not found. Did you install it?`);
                };

                const run = new Function('require', 'module', 'exports', 'React', transpiledCode);
                
                run(userRequire, module, exports, ReactLibrary);

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
                 if (isMounted) setError(err.message || String(err));
            }
        };

        execute();

        return () => {
            isMounted = false;
        };
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
