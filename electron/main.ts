import { app, BrowserWindow, ipcMain } from 'electron'
import { build } from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'
import vm from 'vm'
import ts from 'typescript'
import sourceMap from 'source-map-js'
import { Console } from 'console'
import { Writable } from 'stream'
import { createRequire } from 'module'
import { exec, fork } from 'child_process'
import fs from 'fs'
import util from 'util'

const execPromise = util.promisify(exec)

// Enable remote debugging for renderer process
app.commandLine.appendSwitch('remote-debugging-port', '9222')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Setup user packages directory
const PACKAGES_DIR = path.join(app.getPath('userData'), 'user_packages')
if (!fs.existsSync(PACKAGES_DIR)) {
    fs.mkdirSync(PACKAGES_DIR, { recursive: true })
    fs.writeFileSync(path.join(PACKAGES_DIR, 'package.json'), '{"dependencies":{}}')
}

// Setup user react packages directory
const REACT_PACKAGES_DIR = path.join(app.getPath('userData'), 'user_react_packages')
if (!fs.existsSync(REACT_PACKAGES_DIR)) {
    fs.mkdirSync(REACT_PACKAGES_DIR, { recursive: true })
    fs.writeFileSync(path.join(REACT_PACKAGES_DIR, 'package.json'), '{"dependencies":{}}')
}

// Create require function that resolves from the user packages directory
const userPackageRequire = createRequire(path.join(PACKAGES_DIR, 'index.js'))

process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.mjs'),
        },
        backgroundColor: '#1e1e1e',
        show: false, // Wait until ready-to-show
    })

    // Test active push message to Renderer-process.
    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', (new Date).toLocaleString())
    })

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
    } else {
        // win.loadFile('dist/index.html')
        win.loadFile(path.join(RENDERER_DIST, 'index.html'))
    }

    win.once('ready-to-show', () => {
        win?.show()
    })
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

app.whenReady().then(createWindow)

// Helper to run npm commands using the bundled npm
const runNpmCommand = (args: string[], cwd: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const npmCliPath = path.join(process.cwd(), 'node_modules', 'npm', 'bin', 'npm-cli.js')

        // In production (asar), we might need to handle paths differently or ensure npm is unpacked.
        // For now, assuming node_modules is available or unpacked.

        const child = fork(npmCliPath, args, {
            cwd,
            stdio: ['ignore', 'pipe', 'pipe', 'ipc']
        })

        let output = ''
        let errorOutput = ''

        child.stdout?.on('data', (data: Buffer) => {
            output += data.toString()
        })

        child.stderr?.on('data', (data: Buffer) => {
            errorOutput += data.toString()
        })

        child.on('close', (code: number) => {
            if (code === 0) {
                resolve()
            } else {
                reject(new Error(`NPM command failed with code ${code}: ${errorOutput || output}`))
            }
        })

        child.on('error', (err: Error) => {
            reject(err)
        })
    })
}

// IPC Handlers
ipcMain.handle('install-package', async (_, name: string) => {
    try {
        await runNpmCommand(['install', name], PACKAGES_DIR)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

ipcMain.handle('uninstall-package', async (_, name: string) => {
    try {
        await runNpmCommand(['uninstall', name], PACKAGES_DIR)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

ipcMain.handle('get-packages', async () => {
    try {
        const packageJsonPath = path.join(PACKAGES_DIR, 'package.json')
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
            return { success: true, packages: packageJson.dependencies || {} }
        }
        return { success: true, packages: {} }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

// React IPC Handlers
ipcMain.handle('install-react-package', async (_, name: string) => {
    try {
        await runNpmCommand(['install', name], REACT_PACKAGES_DIR)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

ipcMain.handle('uninstall-react-package', async (_, name: string) => {
    try {
        await runNpmCommand(['uninstall', name], REACT_PACKAGES_DIR)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

ipcMain.handle('get-react-packages', async () => {
    try {
        const packageJsonPath = path.join(REACT_PACKAGES_DIR, 'package.json')
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
            return { success: true, packages: packageJson.dependencies || {} }
        }
        return { success: true, packages: {} }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

ipcMain.handle('bundle-react-package', async (_, name: string) => {
    try {
        // Bundle the package using esbuild
        // We create a virtual entry point that exports the required package
        const result = await build({
            stdin: {
                contents: `module.exports = require('${name}');`,
                resolveDir: REACT_PACKAGES_DIR,
                loader: 'js',
            },
            bundle: true,
            format: 'cjs', 
            platform: 'browser', 
            write: false,
            banner: {
                js: 'var __filename = "/index.js"; var __dirname = "/"; var global = window; var process = { env: {} };',
            },
            // Exclude React/ReactDOM as they are provided by the runtime
            external: ['react', 'react-dom'],
        })

        const code = result.outputFiles[0].text
        return { success: true, code }
    } catch (error: any) {
        console.error('Bundle error:', error)
        return { success: false, error: error.message }
    }
})

ipcMain.handle('execute-code', async (event, code: string) => {
    const logs: any[] = []

    // Helper to extract line number from stack trace
    const getLineNumber = (offset = 0) => {
        const stack = new Error().stack;
        if (!stack) return undefined;

        // Stack format usually: Error\n at Object.log (user-code.js:2:9)\n ...
        // We look for 'user-code.js'
        const lines = stack.split('\n');
        for (const line of lines) {
            if (line.includes('user-code.js')) {
                const match = line.match(/user-code\.js:(\d+)/);
                if (match) {
                    const lineNo = parseInt(match[1], 10);
                    // console.log('[DEBUG] Stack line:', lineNo, 'Offset:', offset, 'Result:', lineNo - offset);
                    return Math.max(1, lineNo - offset);
                }
            }
        }
        return undefined;
    };

    const contextConsole = {
        log: (...args: any[]) => {
            const line = getLineNumber();
            win?.webContents.send('console-output', { method: 'log', data: args, line })
        },
        error: (...args: any[]) => {
            const line = getLineNumber();
            win?.webContents.send('console-output', { method: 'error', data: args, line })
        },
        warn: (...args: any[]) => {
            const line = getLineNumber();
            win?.webContents.send('console-output', { method: 'warn', data: args, line })
        },
        info: (...args: any[]) => {
            const line = getLineNumber();
            win?.webContents.send('console-output', { method: 'info', data: args, line })
        }
    }

    const context = vm.createContext({
        console: contextConsole,
        require: userPackageRequire, // Expose require
        process: process, // Expose process
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval
    })

    try {

        const compilerOptions = {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ESNext,
            sourceMap: true,
            inlineSourceMap: false,
        };

        // Transpile TypeScript to JavaScript
        const transpiled = ts.transpileModule(code, { compilerOptions });
        
        // Create SourceMap consumer
        const consumer = new sourceMap.SourceMapConsumer(JSON.parse(transpiled.sourceMapText || '{}'));

        // Helper to map runtime line to source line
        const mapLine = (runtimeLine: number) => {
            // SourceMap lines are 1-based.
            // Stack trace lines are 1-based.
            // We verify if we get a valid mapping.
            const original = consumer.originalPositionFor({ line: runtimeLine, column: 0 });
            // If mapping fails (e.g. wrapper code), it returns null/lines.
            if (original.line) {
                 return original.line;
            }
            // Fallback: if we can't map, return the runtime line (better than nothing) 
            // but for TS which shrinks code, this might be off. 
            return runtimeLine;
        };

        // Update contextConsole to use source map
        context.console = {
            log: (...args: any[]) => {
                const runtimeLine = getLineNumber(0); // get raw runtime line (offset 0)
                const line = runtimeLine ? mapLine(runtimeLine) : undefined;
                win?.webContents.send('console-output', { method: 'log', data: args, line })
            },
            error: (...args: any[]) => {
                const runtimeLine = getLineNumber(0);
                const line = runtimeLine ? mapLine(runtimeLine) : undefined;
                win?.webContents.send('console-output', { method: 'error', data: args, line })
            },
            warn: (...args: any[]) => {
                const runtimeLine = getLineNumber(0);
                const line = runtimeLine ? mapLine(runtimeLine) : undefined;
                win?.webContents.send('console-output', { method: 'warn', data: args, line })
            },
            info: (...args: any[]) => {
                const runtimeLine = getLineNumber(0);
                const line = runtimeLine ? mapLine(runtimeLine) : undefined;
                win?.webContents.send('console-output', { method: 'info', data: args, line })
            }
        };

        // Provide a filename to help with stack trace identification
        const script = new vm.Script(transpiled.outputText, { filename: 'user-code.js' })
        const result = await script.runInContext(context)
        return { success: true, result }
    } catch (error: any) {
        // Try to extract line number from error stack if possible
        let line = undefined;
        if (error.stack) {
            const match = error.stack.match(/user-code\.js:(\d+)/);
            if (match) {
                const runtimeLine = parseInt(match[1], 10);
                // We need the consumer here too if possible, but scope?
                // Re-creating consumer is okay or scope it out.
                // For simplicity, re-transpile or move scope up?
                // Move scope up.
                try {
                     const compilerOptions = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ESNext, sourceMap: true };
                     const transpiled = ts.transpileModule(code, { compilerOptions });
                     const consumer = new sourceMap.SourceMapConsumer(JSON.parse(transpiled.sourceMapText || '{}'));
                     const original = consumer.originalPositionFor({ line: runtimeLine, column: 0 });
                     if (original.line) line = original.line;
                     else line = runtimeLine;
                } catch(e) { line = runtimeLine; }
            }
        }
        return { success: false, error: error.message, line }
    }
})
