import { ipcMain as i, Notification as m, dialog as y, app as c, shell as x, BrowserWindow as b, Menu as I } from "electron";
import u from "node:path";
import { fileURLToPath as T } from "node:url";
import h from "node:fs";
import E from "node:https";
import v from "node:http";
const S = u.dirname(T(import.meta.url));
let e = null;
function g() {
  e = new b({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#14532d",
    autoHideMenuBar: !0,
    frame: !0,
    webPreferences: {
      nodeIntegration: !0,
      contextIsolation: !1
    },
    icon: w(),
    title: "Stock No Limit"
  }), I.setApplicationMenu(null), process.env.VITE_DEV_SERVER_URL ? e.loadURL(process.env.VITE_DEV_SERVER_URL) : e.loadFile(u.join(S, "../dist/index.html")), e.on("closed", () => {
    e = null;
  });
}
function w() {
  return c.isPackaged ? u.join(process.resourcesPath, "app.asar/dist/icons/nol.png") : u.join(S, "../public/icons/nol.png");
}
function P(t) {
  return new Promise((n, s) => {
    const r = new URL(t.url), a = r.protocol === "https:", o = a ? E : v, l = {
      hostname: r.hostname,
      port: r.port || (a ? 443 : 80),
      path: r.pathname + r.search,
      method: t.method,
      headers: {
        ...t.headers,
        ...t.body ? { "Content-Length": Buffer.byteLength(t.body).toString() } : {}
      },
      // Accepte les certificats auto-signés en dev
      rejectUnauthorized: !1
    }, d = o.request(l, (p) => {
      let f = "";
      p.on("data", (_) => {
        f += _;
      }), p.on("end", () => n({ status: p.statusCode || 0, data: f }));
    });
    d.on("error", (p) => s(p)), d.setTimeout(3e4, () => {
      d.destroy(), s(new Error("Timeout (30s)"));
    }), t.body && d.write(t.body), d.end();
  });
}
i.handle("cloud:push", async (t, {
  url: n,
  apiKey: s,
  siteId: r,
  data: a
}) => {
  try {
    const o = JSON.stringify({
      siteId: r,
      data: a,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      version: 3
    }), l = await P({
      url: n,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": s
      },
      body: o
    });
    return l.status < 200 || l.status >= 300 ? { success: !1, error: `HTTP ${l.status}: ${l.data}` } : { success: !0, response: l.data };
  } catch (o) {
    return { success: !1, error: o.message };
  }
});
i.handle("cloud:pull", async (t, {
  url: n,
  apiKey: s,
  siteId: r
}) => {
  try {
    const a = `${n}?siteId=${encodeURIComponent(r)}`, o = await P({
      url: a,
      method: "GET",
      headers: {
        "X-API-KEY": s
      }
    });
    return o.status < 200 || o.status >= 300 ? { success: !1, error: `HTTP ${o.status}: ${o.data}` } : { success: !0, data: o.data };
  } catch (a) {
    return { success: !1, error: a.message };
  }
});
i.handle("notify", (t, { title: n, body: s, urgency: r }) => {
  if (m.isSupported()) {
    const a = new m({
      title: n,
      body: s,
      icon: w(),
      urgency: r || "normal",
      timeoutType: "default"
    });
    return a.show(), a.on("click", () => {
      e == null || e.focus();
    }), { success: !0 };
  }
  return { success: !1 };
});
i.handle("db:export", async (t, { data: n }) => {
  const s = await y.showSaveDialog(e, {
    title: "Exporter la base de données",
    defaultPath: `snl_backup_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`,
    filters: [
      { name: "JSON Database", extensions: ["json"] },
      { name: "All Files", extensions: ["*"] }
    ]
  });
  return s.canceled || !s.filePath ? { success: !1 } : (h.writeFileSync(s.filePath, n, "utf-8"), { success: !0, path: s.filePath });
});
i.handle("db:import", async () => {
  const t = await y.showOpenDialog(e, {
    title: "Importer une base de données",
    filters: [
      { name: "JSON Database", extensions: ["json"] },
      { name: "All Files", extensions: ["*"] }
    ],
    properties: ["openFile"]
  });
  return t.canceled || t.filePaths.length === 0 ? { success: !1 } : { success: !0, data: h.readFileSync(t.filePaths[0], "utf-8") };
});
i.handle("db:backup-path", async (t, { data: n }) => {
  const s = u.join(c.getPath("userData"), "backups");
  h.existsSync(s) || h.mkdirSync(s, { recursive: !0 });
  const r = `auto_backup_${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.json`, a = u.join(s, r);
  return h.writeFileSync(a, n, "utf-8"), { success: !0, path: a };
});
i.handle("shell:open-path", (t, { path: n }) => {
  x.showItemInFolder(n);
});
i.handle("app:minimize", () => e == null ? void 0 : e.minimize());
i.handle("app:maximize", () => {
  e != null && e.isMaximized() ? e.unmaximize() : e == null || e.maximize();
});
i.handle("app:close", () => e == null ? void 0 : e.close());
i.handle("app:is-maximized", () => e == null ? void 0 : e.isMaximized());
c.whenReady().then(() => {
  g(), c.on("activate", () => {
    b.getAllWindows().length === 0 && g();
  });
});
c.on("window-all-closed", () => {
  process.platform !== "darwin" && c.quit();
});
