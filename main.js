const { app, Tray, Menu, nativeImage, BrowserWindow } = require("electron");
const { menubar } = require("menubar");
const path = require("path");

function getHourPercent() {
  const now = new Date();
  return Math.floor(((now.getMinutes() * 60 + now.getSeconds()) / 3600) * 100);
}

// Create a 1x1 transparent image so the tray slot exists but shows no icon —
// we rely entirely on the tray title (text) to display the percentage.
function createTransparentIcon() {
  return nativeImage.createFromBuffer(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQI12NgYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==",
      "base64"
    ),
    { width: 1, height: 1 }
  );
}

const mb = menubar({
  index: `file://${path.join(__dirname, "index.html")}`,
  icon: createTransparentIcon(),
  preloadWindow: true,
  showDockIcon: false,
  browserWindow: {
    width: 280,
    height: 420,
    resizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    transparent: true,
    frame: false,
    hasShadow: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  },
});

let trayUpdateInterval = null;

function updateTrayTitle() {
  if (mb.tray) {
    mb.tray.setTitle(` ${getHourPercent()}%`);
  }
}

mb.on("ready", () => {
  updateTrayTitle();

  // Update menubar text every 36 seconds (each percent = 36s)
  trayUpdateInterval = setInterval(updateTrayTitle, 36000);

  // Right-click context menu
  mb.tray.on("right-click", () => {
    const launchAtLogin = app.getLoginItemSettings().openAtLogin;
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Launch at Login",
        type: "checkbox",
        checked: launchAtLogin,
        click: () => {
          app.setLoginItemSettings({ openAtLogin: !launchAtLogin });
        },
      },
      { type: "separator" },
      {
        label: `Centi·Hour v${require("./package.json").version}`,
        enabled: false,
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => app.quit(),
      },
    ]);
    mb.tray.popUpContextMenu(contextMenu);
  });
});

mb.on("after-show", () => {
  // When panel opens, immediately update the tray too
  updateTrayTitle();
});

app.on("window-all-closed", (e) => {
  // Prevent default quit — menubar app stays alive
  e.preventDefault();
});
