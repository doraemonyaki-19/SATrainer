// SATrainer — Electron main process. Wraps the static web app in a desktop
// window so it runs as a standalone macOS application. No server needed;
// Electron loads index.html directly and persists localStorage per app.
const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1040,
    height: 860,
    minWidth: 720,
    minHeight: 600,
    title: "SATrainer",
    backgroundColor: "#0f1420",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, "index.html"));

  // Open any external links (none currently) in the system browser, not in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  // Minimal, standard app menu (keeps Cmd+Q, Cmd+W, copy/paste, devtools).
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: "appMenu" },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
  ]));

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
