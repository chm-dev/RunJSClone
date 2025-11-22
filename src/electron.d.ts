export interface IElectronAPI {
    executeCode: (code: string) => Promise<{ success: boolean; result?: any; error?: string; line?: number }>;
    installPackage: (name: string) => Promise<{ success: boolean; error?: string }>;
    uninstallPackage: (name: string) => Promise<{ success: boolean; error?: string }>;
    getPackages: () => Promise<{ success: boolean; packages: Record<string, string>; error?: string }>;
    onConsoleOutput: (callback: (data: { method: string; data: any[]; line?: number }) => void) => () => void;
}

declare global {
    interface Window {
        electron: IElectronAPI;
    }
}
