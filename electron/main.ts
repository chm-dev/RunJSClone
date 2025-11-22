import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import vm from 'vm'
import { Console } from 'console'
import { Writable } from 'stream'
import { createRequire } from 'module'
import { exec } from 'child_process'
import fs from 'fs'
import util from 'util'

const execPromise = util.promisify(exec)

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Setup user packages directory
const PACKAGES_DIR = path.join(app.getPath('userData'), 'user_packages')
if (!fs.existsSync(PACKAGES_DIR)) {
    fs.mkdirSync(PACKAGES_DIR, { recursive: true })
    fs.writeFileSync(path.join(PACKAGES_DIR, 'package.json'), '{"dependencies":{}}')
}

// Create require function that resolves from the user packages directory
const require = createRequire(path.join(PACKAGES_DIR, 'index.js'))

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

// IPC Handlers
ipcMain.handle('install-package', async (_, name: string) => {
    try {
        await execPromise(`npm install ${name}`, { cwd: PACKAGES_DIR })
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

ipcMain.handle('uninstall-package', async (_, name: string) => {
    try {
        await execPromise(`npm uninstall ${name}`, { cwd: PACKAGES_DIR })
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

ipcMain.handle('execute-code', async (event, code: string) => {
    const logs: any[] = []

    // Helper to extract line number from stack trace
    const getLineNumber = () => {
        const stack = new Error().stack;
        if (!stack) return undefined;

        // Stack format usually: Error\n at Object.log (user-code.js:2:9)\n ...
        // We look for 'user-code.js'
        const lines = stack.split('\n');
        for (const line of lines) {
            if (line.includes('user-code.js')) {
                const match = line.match(/user-code\.js:(\d+)/);
                if (match) {
                    return parseInt(match[1], 10);
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
        require: require, // Expose require
        process: process, // Expose process
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval
    })

    try {
        // Provide a filename to help with stack trace identification
        const script = new vm.Script(code, { filename: 'user-code.js' })
        const result = await script.runInContext(context)
        return { success: true, result }
    } catch (error: any) {
        // Try to extract line number from error stack if possible
        let line = undefined;
        if (error.stack) {
            const match = error.stack.match(/user-code\.js:(\d+)/);
            if (match) {
                line = parseInt(match[1], 10);
            }
        }
        return { success: false, error: error.message, line }
    }
})
