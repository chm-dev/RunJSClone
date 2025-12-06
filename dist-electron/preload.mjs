"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  executeCode: (code) => electron.ipcRenderer.invoke("execute-code", code),
  installPackage: (name) => electron.ipcRenderer.invoke("install-package", name),
  uninstallPackage: (name) => electron.ipcRenderer.invoke("uninstall-package", name),
  getPackages: () => electron.ipcRenderer.invoke("get-packages"),
  installReactPackage: (name) => electron.ipcRenderer.invoke("install-react-package", name),
  getReactPackages: () => electron.ipcRenderer.invoke("get-react-packages"),
  uninstallReactPackage: (name) => electron.ipcRenderer.invoke("uninstall-react-package", name),
  bundleReactPackage: (name) => electron.ipcRenderer.invoke("bundle-react-package", name),
  onConsoleOutput: (callback) => {
    const subscription = (_event, data) => callback(data);
    electron.ipcRenderer.on("console-output", subscription);
    return () => electron.ipcRenderer.removeListener("console-output", subscription);
  }
  // Add other listeners if needed
});
