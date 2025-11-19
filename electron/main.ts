import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import vm from 'vm'
import { Console } from 'console'
import { Writable } from 'stream'
import { createRequire } from 'module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

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
ipcMain.handle('execute-code', async (event, code: string) => {
    const logs: any[] = []

    // Custom stream to capture console output
    const logStream = new Writable({
        write(chunk, encoding, callback) {
            logs.push({ type: 'log', content: chunk.toString() })
            callback()
        }
    })

    // Create a custom console that writes to our stream
    // We might need to intercept global console methods instead if we want to capture everything
    // But for vm context, we can pass a custom console

    // Actually, to capture console.log from within the VM, we need to provide a console object in the context.

    const contextConsole = {
        log: (...args: any[]) => {
            const content = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ')
            logs.push({ type: 'log', content: [content] }) // Match existing format expected by UI if possible, or adapt UI
            // The UI expects { method: 'log', data: [...] }
            // Let's match the UI expectation: ConsoleOutput.tsx uses LogEntry { method: 'log' | 'error' | 'warn' | 'info', data: any[] }
            win?.webContents.send('console-output', { method: 'log', data: args })
        },
        error: (...args: any[]) => {
            win?.webContents.send('console-output', { method: 'error', data: args })
        },
        warn: (...args: any[]) => {
            win?.webContents.send('console-output', { method: 'warn', data: args })
        },
        info: (...args: any[]) => {
            win?.webContents.send('console-output', { method: 'info', data: args })
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
        const script = new vm.Script(code)
        const result = await script.runInContext(context)
        return { success: true, result }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})
