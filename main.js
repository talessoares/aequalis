const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  Menu,
  Tray,
  nativeImage,
  shell,
} = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const HID = require("node-hid");

// --- Constantes do DSP (mesmas do site kubas audio) ---
const DSP = {
  VENDOR_ID: 0x3302,
  PRODUCT_ID: 0x8902,
  REPORT_ID: 0xcb,
  FS: 96000,
  HEADER: [
    0x45, 0x51, 0x31, 0x23, 0xd6, 0x00, 0x00, 0x0a, 0x04, 0x05, 0x01, 0x0a,
    0x00, 0x00,
  ],
  APPLY: [0x01, 0x65, 0x00, 0x01, 0xff],

  peak(f, g, q, fs) {
    const A = Math.pow(10, g / 40);
    const w = (2 * Math.PI * f) / fs;
    const al = Math.sin(w) / (2 * q);
    const a0 = 1 + al / A;
    return {
      b0: (1 + al * A) / a0,
      b1: (-2 * Math.cos(w)) / a0,
      b2: (1 - al * A) / a0,
      a1: (-2 * Math.cos(w)) / a0,
      a2: (1 - al / A) / a0,
    };
  },

  lowShelf(f, g, q, fs) {
    const A = Math.pow(10, g / 40);
    const w = (2 * Math.PI * f) / fs;
    const al = Math.sin(w) / (2 * q);
    const c = Math.cos(w);
    const s = 2 * Math.sqrt(A) * al;
    const a0 = A + 1 + (A - 1) * c + s;
    return {
      b0: (A * (A + 1 - (A - 1) * c + s)) / a0,
      b1: (2 * A * (A - 1 - (A + 1) * c)) / a0,
      b2: (A * (A + 1 - (A - 1) * c - s)) / a0,
      a1: (-2 * (A - 1 + (A + 1) * c)) / a0,
      a2: (A + 1 + (A - 1) * c - s) / a0,
    };
  },

  coeffs(b) {
    return (b.type === "LS" ? DSP.lowShelf : DSP.peak)(b.f, b.g, b.q, DSP.FS);
  },

  crc16(bytes) {
    let c = 0xffff;
    for (const x of bytes) {
      c ^= x << 8;
      for (let i = 0; i < 8; i++) {
        c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
      }
    }
    return c;
  },

  blob(bands, preDb) {
    if (bands.length !== 10) throw new Error("São necessárias 10 bandas");
    const out = [...DSP.HEADER];
    const pre = Math.round(Math.pow(10, (preDb || 0) / 20) * 8388608);
    out.push(
      pre & 255,
      (pre >>> 8) & 255,
      (pre >>> 16) & 255,
      (pre >>> 24) & 255,
    );
    for (const b of bands) {
      const c = DSP.coeffs(b);
      for (const v of [c.b0, c.b2, -c.a1, c.b1, -c.a2]) {
        const n = Math.round(v * 134217728);
        if (n > 2147483647 || n < -2147483648)
          throw new Error("Filtro fora da faixa do DSP");
        out.push(n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255);
      }
    }
    const crc = DSP.crc16(out);
    out.push(crc & 255, crc >> 8);
    return out;
  },

  packets(bands, preDb) {
    const b = DSP.blob(bands, preDb);
    const pk = [];
    for (let i = 0; i < 9; i++) {
      const p = new Uint8Array(31);
      p[0] = i;
      const chunk = b.slice(i * 30, i * 30 + 30);
      p.set(chunk, 1);
      pk.push(p);
    }
    return pk;
  },
};

// --- HID Device management ---
let hidDevice = null;

function findHIDDevice() {
  try {
    const devices = HID.devices();
    return devices.find(
      (d) => d.vendorId === DSP.VENDOR_ID && d.productId === DSP.PRODUCT_ID,
    );
  } catch (e) {
    return null;
  }
}

function openHID() {
  const info = findHIDDevice();
  if (!info) return { error: "Dispositivo Kuba não encontrado" };
  try {
    hidDevice = new HID.HID(info.path);
    return {
      device: { product: info.product || "Dispositivo Kuba", path: info.path },
    };
  } catch (e) {
    hidDevice = null;
    return { error: `Falha ao abrir o dispositivo: ${e.message}` };
  }
}

function closeHID() {
  if (hidDevice) {
    try {
      hidDevice.close();
    } catch (e) {}
    hidDevice = null;
  }
}

function sendHIDReport(reportId, data) {
  if (!hidDevice) throw new Error("Dispositivo HID não aberto");
  // node-hid write expects: [reportId, ...data]
  const buffer = Buffer.from([reportId, ...data]);
  hidDevice.write(buffer);
}

// --- Electron Window ---
let mainWindow;
let tray;
let isQuitting = false;
let closeToTray = true;
let trayCurves = [];

function createTray() {
  if (tray) return;
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, "icon.png")));
  tray.setToolTip("Aequalis");
  tray.on("double-click", showWindow);
  updateTrayMenu();
}

function destroyTray() {
  if (!tray) return;
  tray.destroy();
  tray = null;
}

function showWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function updateTrayMenu() {
  if (!tray) return;
  const curveItems = trayCurves.length
    ? trayCurves.map((curve) => ({
        label: curve.name,
        type: "radio",
        checked: curve.selected === true,
        click: () =>
          mainWindow &&
          mainWindow.webContents.send("tray:select-curve", curve.id),
      }))
    : [{ label: "Abra o app para carregar as curvas", enabled: false }];
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Abrir Aequalis", click: showWindow },
      { type: "separator" },
      { label: "Trocar curva", submenu: curveItems },
      { type: "separator" },
      {
        label: "Sair",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, "icon.png"),
  });

  mainWindow.maximize();
  mainWindow.loadFile(path.join(__dirname, "renderer.html"));

  // Optional: open devtools in dev mode
  // mainWindow.webContents.openDevTools();

  mainWindow.on("closed", () => {
    mainWindow = null;
    closeHID();
  });
  mainWindow.on("close", (event) => {
    if (!isQuitting && closeToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createTray();
  createWindow();
});

app.on("window-all-closed", () => {
  if ((isQuitting || !closeToTray) && process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// --- IPC Handlers ---

ipcMain.handle("hid:list", async () => {
  try {
    const dev = findHIDDevice();
    return dev
      ? {
          found: true,
          product: dev.product || "Dispositivo Kuba",
          path: dev.path,
        }
      : { found: false };
  } catch (e) {
    return { found: false, error: e.message };
  }
});

ipcMain.handle("hid:open", async () => {
  closeHID();
  const info = openHID();
  if (info.error) return { success: false, error: info.error };
  return { success: true, device: info.device };
});

ipcMain.handle("settings:set-close-to-tray", async (event, enabled) => {
  closeToTray = enabled === true;
  if (closeToTray) {
    createTray();
  } else {
    destroyTray();
  }
  return { success: true, closeToTray };
});

ipcMain.handle("shell:open-external", async (event, url) => {
  if (
    ![
      "https://equalizador.kuba.audio/",
      "https://kuba.audio/",
      "https://opensource.org/license/mit/",
      "https://github.com/talessoares",
      "https://github.com/talessoares/kuba-desktop-eq/releases",
      "https://www.linkedin.com/in/tales-schifelbein-soares/",
      "https://www.flaticon.com/free-icon/letter-a_3665883",
      "https://www.flaticon.com/free-icon/setting_2956788",
      "https://www.flaticon.com/free-icon/info_471662",
      "https://github.com/features/copilot",
      "https://cline.bot/",
    ].includes(url)
  ) {
    return { success: false, error: "Link externo não permitido" };
  }
  await shell.openExternal(url);
  return { success: true };
});

ipcMain.handle("tray:set-curves", async (event, curves) => {
  trayCurves = Array.isArray(curves)
    ? curves.filter((curve) => curve && curve.id && curve.name)
    : [];
  updateTrayMenu();
  return { success: true };
});

ipcMain.handle("hid:close", async () => {
  closeHID();
  return { success: true };
});

ipcMain.handle("hid:apply", async (event, { bands, pre }) => {
  if (!hidDevice) {
    return { success: false, error: "Dispositivo não conectado" };
  }
  try {
    const pkList = DSP.packets(bands, pre);
    event.sender.send("hid:progress", { stage: "preparing", percent: 5 });
    for (const pk of pkList) {
      sendHIDReport(DSP.REPORT_ID, Array.from(pk));
      event.sender.send("hid:progress", {
        stage: "sending",
        percent: Math.round(10 + ((pk[0] + 1) / pkList.length) * 75),
        packet: pk[0] + 1,
        total: pkList.length,
      });
      // small delay between packets (matching web app ~16ms)
      await new Promise((r) => setTimeout(r, 16));
    }
    event.sender.send("hid:progress", { stage: "validating", percent: 90 });
    await new Promise((r) => setTimeout(r, 150));
    sendHIDReport(DSP.REPORT_ID, DSP.APPLY);
    event.sender.send("hid:progress", { stage: "complete", percent: 100 });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle("app:get-version", () => app.getVersion());

ipcMain.handle("dialog:open", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  return result;
});

ipcMain.handle("curve:import", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [{ name: "Curva Kuba (JSON)", extensions: ["json"] }],
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  try {
    return {
      canceled: false,
      content: await fs.readFile(result.filePaths[0], "utf8"),
    };
  } catch (e) {
    return {
      canceled: false,
      error: `Não foi possível ler o arquivo: ${e.message}`,
    };
  }
});

ipcMain.handle("curve:export", async (event, curve) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `${curve.name || "minha-curva"}.json`,
    filters: [{ name: "Curva Kuba (JSON)", extensions: ["json"] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  try {
    await fs.writeFile(result.filePath, JSON.stringify(curve, null, 2), "utf8");
    return { canceled: false };
  } catch (e) {
    return {
      canceled: false,
      error: `Não foi possível salvar o arquivo: ${e.message}`,
    };
  }
});
