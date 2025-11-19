"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  executeCode: (code) => electron.ipcRenderer.invoke("execute-code", code),
  onConsoleOutput: (callback) => {
    const subscription = (_event, data) => callback(data);
    electron.ipcRenderer.on("console-output", subscription);
    return () => electron.ipcRenderer.removeListener("console-output", subscription);
  }
  // Add other listeners if needed
});
