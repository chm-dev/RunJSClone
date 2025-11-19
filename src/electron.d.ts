export interface IElectronAPI {
    executeCode: (code: string) => Promise<{ success: boolean; result?: any; error?: string }>;
    onConsoleOutput: (callback: (data: { method: string; data: any[] }) => void) => () => void;
}

declare global {
    interface Window {
        electron: IElectronAPI;
    }
}
