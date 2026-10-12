
const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    show: true,
    backgroundColor: "#ffffff",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.webContents.openDevTools({ mode: "detach" });

  win.webContents.on("did-start-loading", () => {
    console.log("Page started loading");
  });

  win.webContents.on("did-finish-load", () => {
    console.log("Page finished loading:", win.webContents.getURL());

    win.webContents.executeJavaScript(`
      ({
        url: window.location.href,
        rootExists: !!document.getElementById("root"),
        rootHTML: document.getElementById("root")?.innerHTML,
        scripts: [...document.scripts].map(s => s.src)
      })
    `).then(result => {
      console.log("PAGE DIAGNOSTICS:", result);
    }).catch(error => {
      console.error("DIAGNOSTICS FAILED:", error);
    });
  });

  win.webContents.on("did-fail-load", (_event, code, description, url) => {
    console.error("LOAD FAILED:", code, description, url);
    dialog.showErrorBox(
      "RMS POS loading error",
      `${description}\nCode: ${code}\nURL: ${url}`
    );
  });

  win.webContents.on("render-process-gone", (_event, details) => {
    console.error("RENDERER EXITED:", details);
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  } else {
    win.loadURL("http://127.0.0.1:5173");
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
