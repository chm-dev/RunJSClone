import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('electron', {
    executeCode: (code: string) => ipcRenderer.invoke('execute-code', code),
    installPackage: (name: string) => ipcRenderer.invoke('install-package', name),
    uninstallPackage: (name: string) => ipcRenderer.invoke('uninstall-package', name),
    getPackages: () => ipcRenderer.invoke('get-packages'),
    onConsoleOutput: (callback: (data: any) => void) => {
        const subscription = (_event: any, data: any) => callback(data)
        ipcRenderer.on('console-output', subscription)
        return () => ipcRenderer.removeListener('console-output', subscription)
    },
    // Add other listeners if needed
})
