"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  executeCode: (code) => electron.ipcRenderer.invoke("execute-code", code),
  installPackage: (name) => electron.ipcRenderer.invoke("install-package", name),
  uninstallPackage: (name) => electron.ipcRenderer.invoke("uninstall-package", name),
  getPackages: () => electron.ipcRenderer.invoke("get-packages"),
  onConsoleOutput: (callback) => {
    const subscription = (_event, data) => callback(data);
    electron.ipcRenderer.on("console-output", subscription);
    return () => electron.ipcRenderer.removeListener("console-output", subscription);
  }
  // Add other listeners if needed
});
