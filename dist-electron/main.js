import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";
import { Writable } from "stream";
import { createRequire } from "module";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
const require$1 = createRequire(import.meta.url);
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    },
    backgroundColor: "#1e1e1e",
    show: false
    // Wait until ready-to-show
  });
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
  win.once("ready-to-show", () => {
    win?.show();
  });
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
ipcMain.handle("execute-code", async (event, code) => {
  const logs = [];
  new Writable({
    write(chunk, encoding, callback) {
      logs.push({ type: "log", content: chunk.toString() });
      callback();
    }
  });
  const contextConsole = {
    log: (...args) => {
      const content = args.map(
        (arg) => typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(" ");
      logs.push({ type: "log", content: [content] });
      win?.webContents.send("console-output", { method: "log", data: args });
    },
    error: (...args) => {
      win?.webContents.send("console-output", { method: "error", data: args });
    },
    warn: (...args) => {
      win?.webContents.send("console-output", { method: "warn", data: args });
    },
    info: (...args) => {
      win?.webContents.send("console-output", { method: "info", data: args });
    }
  };
  const context = vm.createContext({
    console: contextConsole,
    require: require$1,
    // Expose require
    process,
    // Expose process
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval
  });
  try {
    const script = new vm.Script(code);
    const result = await script.runInContext(context);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
