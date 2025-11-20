export interface IElectronAPI {
    executeCode: (code: string) => Promise<{ success: boolean; result?: any; error?: string; line?: number }>;
    onConsoleOutput: (callback: (data: { method: string; data: any[]; line?: number }) => void) => () => void;
}

declare global {
    interface Window {
        electron: IElectronAPI;
    }
}
