import { app as P, ipcMain as d, BrowserWindow as g } from "electron";
import { createRequire as D } from "node:module";
import { fileURLToPath as C, pathToFileURL as b } from "node:url";
import u from "node:path";
import c from "node:fs";
import E from "node:https";
import { execFile as _ } from "node:child_process";
import { promisify as M } from "node:util";
import k from "node:os";
const w = M(_);
async function F(r) {
  const t = `using System;
using System.Runtime.InteropServices;

public class WallpaperHelper {
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern IntPtr FindWindowEx(IntPtr parentHandle, IntPtr childAfter, string lpszClass, string lpszWindow);

    [DllImport("user32.dll")]
    public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam, uint fuFlags, uint uTimeout, out IntPtr lpdwResult);

    [DllImport("user32.dll")]
    public static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);

    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    public const uint SMTO_NORMAL = 0x0000;
    public const uint SWP_NOSIZE = 0x0001;
    public const uint SWP_NOMOVE = 0x0002;
    public static readonly IntPtr HWND_BOTTOM = new IntPtr(1);

    public static bool SetAsWallpaper(IntPtr myWinHwnd) {
        IntPtr progman = FindWindow("Progman", "Program Manager");
        if (progman == IntPtr.Zero) {
            Console.WriteLine("找不到 Progman 窗口");
            return false;
        }

        IntPtr result;
        SendMessageTimeout(progman, 0x052C, IntPtr.Zero, IntPtr.Zero, SMTO_NORMAL, 1000, out result);
        SendMessageTimeout(progman, 0x052C, new IntPtr(0xD), IntPtr.Zero, SMTO_NORMAL, 1000, out result);
        SendMessageTimeout(progman, 0x052C, new IntPtr(0xD), new IntPtr(1), SMTO_NORMAL, 1000, out result);

        IntPtr topWorkerW = IntPtr.Zero;
        IntPtr shellDllDefView = IntPtr.Zero;
        IntPtr firstWorkerW = IntPtr.Zero;
        IntPtr oldTargetWorkerW = IntPtr.Zero;

        while (true) {
            topWorkerW = FindWindowEx(IntPtr.Zero, topWorkerW, "WorkerW", null);
            if (topWorkerW == firstWorkerW) {
                Console.WriteLine("找不到桌面图标层级的窗口，使用新版方法");
                break;
            }
            if (firstWorkerW == IntPtr.Zero) {
                firstWorkerW = topWorkerW;
            }
            if (topWorkerW == IntPtr.Zero) {
                continue;
            }

            shellDllDefView = FindWindowEx(topWorkerW, IntPtr.Zero, "SHELLDLL_DefView", null);
            if (shellDllDefView == IntPtr.Zero) {
                continue;
            }

            oldTargetWorkerW = FindWindowEx(IntPtr.Zero, topWorkerW, "WorkerW", null);
            Console.WriteLine("WorkerW: " + topWorkerW.ToString("X"));
            Console.WriteLine("SHELLDLL_DefView: " + shellDllDefView.ToString("X"));
            Console.WriteLine("目标 WorkerW: " + oldTargetWorkerW.ToString("X"));
            break;
        }

        if (oldTargetWorkerW == IntPtr.Zero) {
            Console.WriteLine("使用新版的方法");
            IntPtr newWorkerW = FindWindowEx(progman, IntPtr.Zero, "WorkerW", null);
            if (newWorkerW == IntPtr.Zero) {
                Console.WriteLine("在新版 Windows 中找不到 WorkerW");
                return false;
            }
            SetParent(myWinHwnd, newWorkerW);
        } else {
            Console.WriteLine("使用旧版的方法");
            SetParent(myWinHwnd, oldTargetWorkerW);
            SetWindowPos(myWinHwnd, shellDllDefView, 0, 0, 0, 0, SWP_NOSIZE | SWP_NOMOVE);
        }

        return true;
    }

    public static bool RestoreFromWallpaper(IntPtr myWinHwnd) {
        // 将窗口父句柄设为0（桌面窗口），从而从WorkerW中移除
        SetParent(myWinHwnd, IntPtr.Zero);
        Console.WriteLine("已从壁纸层恢复");
        return true;
    }

    public static void Main(string[] args) {
        // 设置控制台编码为UTF-8
        Console.OutputEncoding = System.Text.Encoding.UTF8;

        if (args.Length < 2) {
            Console.WriteLine("Usage: program <action> <hwnd>");
            return;
        }
        string action = args[0];
        IntPtr hwnd = new IntPtr(long.Parse(args[1]));
        bool result = false;

        if (action == "set") {
            result = SetAsWallpaper(hwnd);
        } else if (action == "restore") {
            result = RestoreFromWallpaper(hwnd);
        }

        Console.WriteLine(result ? "True" : "False");
    }
}`, o = k.tmpdir(), n = `wallpaper-${Date.now()}`, l = u.join(o, `${n}.cs`), s = u.join(o, `${n}.exe`);
  try {
    c.writeFileSync(l, t, "utf8");
    const e = await w("csc.exe", [
      "/target:exe",
      "/out:" + s,
      l
    ], {
      timeout: 3e4,
      windowsHide: !0
    }).catch(() => w("C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe", [
      "/target:exe",
      "/out:" + s,
      l
    ], {
      timeout: 3e4,
      windowsHide: !0
    }));
    console.log("编译输出:", e.stdout), e.stderr && console.error("编译错误:", e.stderr);
    const { stdout: i, stderr: W } = await w(s, ["set", r.toString()], {
      timeout: 3e4,
      windowsHide: !0
    });
    return console.log("程序输出:", i), W && console.error("程序错误:", W), i.includes("True");
  } catch (e) {
    return console.error("设置壁纸层失败:", e), e.stderr && console.error("错误输出:", e.stderr), e.stdout && console.error("标准输出:", e.stdout), !1;
  } finally {
    try {
      c.existsSync(l) && c.unlinkSync(l), c.existsSync(s) && c.unlinkSync(s);
    } catch {
    }
  }
}
async function R(r) {
  const t = `using System;
using System.Runtime.InteropServices;

public class WallpaperHelper {
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern IntPtr FindWindowEx(IntPtr parentHandle, IntPtr childAfter, string lpszClass, string lpszWindow);

    [DllImport("user32.dll")]
    public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam, uint fuFlags, uint uTimeout, out IntPtr lpdwResult);

    [DllImport("user32.dll")]
    public static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);

    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    public const uint SMTO_NORMAL = 0x0000;
    public const uint SWP_NOSIZE = 0x0001;
    public const uint SWP_NOMOVE = 0x0002;
    public static readonly IntPtr HWND_BOTTOM = new IntPtr(1);

    public static bool SetAsWallpaper(IntPtr myWinHwnd) {
        IntPtr progman = FindWindow("Progman", "Program Manager");
        if (progman == IntPtr.Zero) {
            Console.WriteLine("找不到 Progman 窗口");
            return false;
        }

        IntPtr result;
        SendMessageTimeout(progman, 0x052C, IntPtr.Zero, IntPtr.Zero, SMTO_NORMAL, 1000, out result);
        SendMessageTimeout(progman, 0x052C, new IntPtr(0xD), IntPtr.Zero, SMTO_NORMAL, 1000, out result);
        SendMessageTimeout(progman, 0x052C, new IntPtr(0xD), new IntPtr(1), SMTO_NORMAL, 1000, out result);

        IntPtr topWorkerW = IntPtr.Zero;
        IntPtr shellDllDefView = IntPtr.Zero;
        IntPtr firstWorkerW = IntPtr.Zero;
        IntPtr oldTargetWorkerW = IntPtr.Zero;

        while (true) {
            topWorkerW = FindWindowEx(IntPtr.Zero, topWorkerW, "WorkerW", null);
            if (topWorkerW == firstWorkerW) {
                Console.WriteLine("找不到桌面图标层级的窗口，使用新版方法");
                break;
            }
            if (firstWorkerW == IntPtr.Zero) {
                firstWorkerW = topWorkerW;
            }
            if (topWorkerW == IntPtr.Zero) {
                continue;
            }

            shellDllDefView = FindWindowEx(topWorkerW, IntPtr.Zero, "SHELLDLL_DefView", null);
            if (shellDllDefView == IntPtr.Zero) {
                continue;
            }

            oldTargetWorkerW = FindWindowEx(IntPtr.Zero, topWorkerW, "WorkerW", null);
            Console.WriteLine("WorkerW: " + topWorkerW.ToString("X"));
            Console.WriteLine("SHELLDLL_DefView: " + shellDllDefView.ToString("X"));
            Console.WriteLine("目标 WorkerW: " + oldTargetWorkerW.ToString("X"));
            break;
        }

        if (oldTargetWorkerW == IntPtr.Zero) {
            Console.WriteLine("使用新版的方法");
            IntPtr newWorkerW = FindWindowEx(progman, IntPtr.Zero, "WorkerW", null);
            if (newWorkerW == IntPtr.Zero) {
                Console.WriteLine("在新版 Windows 中找不到 WorkerW");
                return false;
            }
            SetParent(myWinHwnd, newWorkerW);
        } else {
            Console.WriteLine("使用旧版的方法");
            SetParent(myWinHwnd, oldTargetWorkerW);
            SetWindowPos(myWinHwnd, shellDllDefView, 0, 0, 0, 0, SWP_NOSIZE | SWP_NOMOVE);
        }

        return true;
    }

    public static bool RestoreFromWallpaper(IntPtr myWinHwnd) {
        // 将窗口父句柄设为0（桌面窗口），从而从WorkerW中移除
        SetParent(myWinHwnd, IntPtr.Zero);
        Console.WriteLine("已从壁纸层恢复");
        return true;
    }

    public static void Main(string[] args) {
        // 设置控制台编码为UTF-8
        Console.OutputEncoding = System.Text.Encoding.UTF8;

        if (args.Length < 2) {
            Console.WriteLine("Usage: program <action> <hwnd>");
            return;
        }
        string action = args[0];
        IntPtr hwnd = new IntPtr(long.Parse(args[1]));
        bool result = false;

        if (action == "set") {
            result = SetAsWallpaper(hwnd);
        } else if (action == "restore") {
            result = RestoreFromWallpaper(hwnd);
        }

        Console.WriteLine(result ? "True" : "False");
    }
}`, o = k.tmpdir(), n = `wallpaper-restore-${Date.now()}`, l = u.join(o, `${n}.cs`), s = u.join(o, `${n}.exe`);
  try {
    c.writeFileSync(l, t, "utf8");
    const e = await w("csc.exe", [
      "/target:exe",
      "/out:" + s,
      l
    ], {
      timeout: 3e4,
      windowsHide: !0
    }).catch(() => w("C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe", [
      "/target:exe",
      "/out:" + s,
      l
    ], {
      timeout: 3e4,
      windowsHide: !0
    }));
    console.log("编译输出:", e.stdout);
    const { stdout: i, stderr: W } = await w(s, ["restore", r.toString()], {
      timeout: 3e4,
      windowsHide: !0
    });
    return console.log("程序输出:", i), W && console.error("程序错误:", W), i.includes("True");
  } catch (e) {
    return console.error("恢复窗口失败:", e), !1;
  } finally {
    try {
      c.existsSync(l) && c.unlinkSync(l), c.existsSync(s) && c.unlinkSync(s);
    } catch {
    }
  }
}
const O = D(import.meta.url), x = u.dirname(C(import.meta.url));
process.env.APP_ROOT = u.join(x, "..");
const h = process.env.VITE_DEV_SERVER_URL, X = u.join(process.env.APP_ROOT, "dist-electron"), L = u.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = h ? u.join(process.env.APP_ROOT, "public") : L;
let a;
const p = u.join(P.getPath("userData"), "wallpaper.jpg"), y = 1e3;
let T = 0;
const m = [];
let I = !1;
async function Z() {
  if (!(I || m.length === 0)) {
    for (I = !0; m.length > 0; ) {
      const t = Date.now() - T;
      t < y && await new Promise((n) => setTimeout(n, y - t));
      const o = m.shift();
      if (o) {
        try {
          const n = await A(o.endpoint);
          o.resolve(n);
        } catch (n) {
          o.reject(n);
        }
        T = Date.now();
      }
    }
    I = !1;
  }
}
function A(r) {
  return new Promise((t, o) => {
    const n = `https://codeforces.com/api${r}`;
    console.log("主进程请求:", n);
    const l = {
      headers: {
        "User-Agent": "CF-Watching-You-Always/1.0"
      }
    };
    E.get(n, l, (s) => {
      let e = "";
      s.on("data", (i) => {
        e += i;
      }), s.on("end", () => {
        try {
          const i = JSON.parse(e);
          console.log("API 响应状态:", i.status), t(i);
        } catch {
          o(new Error("解析响应失败"));
        }
      });
    }).on("error", (s) => {
      console.error("请求失败:", s.message), o(s);
    });
  });
}
function S(r) {
  return b(r).href;
}
function f(r, t = 800, o = 600, n = 0, l = 0, s = !1) {
  const e = new g({
    icon: u.join(process.env.VITE_PUBLIC, "icon.png"),
    width: t,
    height: o,
    x: n,
    // 窗口横坐标
    y: l,
    // 窗口纵坐标
    frame: !s,
    // 无边框
    transparent: s,
    // 透明背景（无边框时）
    fullscreen: s,
    // 全屏（无边框时）
    autoHideMenuBar: !0,
    // 自动隐藏菜单栏
    title: "CF_Watching_you_always",
    // 设置窗口标题
    webPreferences: {
      preload: u.join(x, "preload.mjs"),
      // 允许加载本地文件
      webSecurity: !1
    }
  });
  return e.setMenuBarVisibility(!1), h ? (e.loadURL(`${h}#${r}`), e.webContents.openDevTools()) : e.loadFile(u.join(L, "index.html"), {
    hash: r
    // 通过 hash 传递路由
  }), e.webContents.on("did-finish-load", () => {
    if (e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString()), c.existsSync(p)) {
      const i = S(p);
      console.log("窗口加载完成，发送壁纸URL:", i), e == null || e.webContents.send("wallpaper-updated", i);
    }
  }), e;
}
d.handle("cf-api-request", async (r, t) => new Promise((o, n) => {
  m.push({ endpoint: t, resolve: o, reject: n }), Z();
}));
d.on("set-wallpaper", (r, t) => {
  try {
    const o = t.replace(/^data:image\/\w+;base64,/, ""), n = Buffer.from(o, "base64");
    c.writeFileSync(p, n), console.log("壁纸已保存到:", p);
    const l = Date.now(), s = `${S(p)}?t=${l}`;
    console.log("转换后的壁纸URL:", s);
    const e = g.getAllWindows();
    console.log("正在通知", e.length, "个窗口更新壁纸"), e.forEach((i) => {
      i.webContents.send("wallpaper-updated", s);
    });
  } catch (o) {
    console.error("保存壁纸失败:", o);
  }
});
d.on("set-wallpaper-opacity", (r, t) => {
  console.log("收到不透明度设置:", t), g.getAllWindows().forEach((n) => {
    n.webContents.send("wallpaper-opacity-updated", t);
  });
});
d.on("set-chart-contrast", (r, t) => {
  console.log("收到图表对比度设置:", t), g.getAllWindows().forEach((n) => {
    n.webContents.send("chart-contrast-updated", t);
  });
});
d.handle("get-wallpaper-path", () => {
  if (console.log("收到获取壁纸路径请求"), c.existsSync(p)) {
    const r = S(p);
    return console.log("返回壁纸路径:", r), r;
  }
  return console.log("壁纸文件不存在"), null;
});
d.on("switch-view", (r, t) => {
  console.log("收到视图切换:", t), g.getAllWindows().forEach((n) => {
    n.webContents.send("view-switched", t);
  });
});
d.on("set-as-wallpaper-layer", async (r) => {
  if (console.log("收到设置为壁纸层请求"), !a) {
    console.error("Home窗口未初始化"), r.sender.send("wallpaper-layer-set", { success: !1, message: "Home窗口未初始化" });
    return;
  }
  try {
    const { screen: t } = O("electron"), o = t.getPrimaryDisplay(), { width: n, height: l } = o.workAreaSize;
    console.log("切换到全屏模式，屏幕尺寸:", n, "x", l), a.setMenuBarVisibility(!1), a.setAutoHideMenuBar(!0), a.setFullScreen(!0), await new Promise((W) => setTimeout(W, 500));
    const e = a.getNativeWindowHandle().readUInt32LE(0);
    console.log("窗口句柄:", "0x" + e.toString(16).toUpperCase()), await F(e) ? r.sender.send("wallpaper-layer-set", { success: !0, message: "已设置为壁纸层" }) : r.sender.send("wallpaper-layer-set", { success: !1, message: "设置失败" });
  } catch (t) {
    console.error("设置壁纸层失败:", t), r.sender.send("wallpaper-layer-set", { success: !1, message: t.message || "设置失败" });
  }
});
d.on("cancel-wallpaper-layer", async (r) => {
  if (console.log("收到取消壁纸层请求"), !a) {
    console.error("Home窗口未初始化"), r.sender.send("wallpaper-layer-cancelled", { success: !1, message: "Home窗口未初始化" });
    return;
  }
  try {
    const o = a.getNativeWindowHandle().readUInt32LE(0);
    if (!await R(o)) {
      console.error("恢复窗口失败"), r.sender.send("wallpaper-layer-cancelled", { success: !1, message: "恢复窗口失败" });
      return;
    }
    a.setFullScreen(!1), a.setMenuBarVisibility(!0), a.setAutoHideMenuBar(!1), a.setBounds({ x: 0, y: 0, width: 800, height: 600 }), console.log("已取消壁纸层"), r.sender.send("wallpaper-layer-cancelled", { success: !0, message: "已取消壁纸层" });
  } catch (t) {
    console.error("取消壁纸层失败:", t), r.sender.send("wallpaper-layer-cancelled", { success: !1, message: t.message || "取消失败" });
  }
});
P.on("window-all-closed", () => {
  process.platform !== "darwin" && (P.quit(), a = null);
});
P.on("activate", () => {
  g.getAllWindows().length === 0 && (a = f("/window1", 800, 600, 0, 0), f("/window2", 800, 600, 200, 200));
});
P.whenReady().then(() => {
  a = f("/", 800, 600, 0, 0, !1), f("/setting", 800, 600, 0, 0, !1);
});
export {
  X as MAIN_DIST,
  L as RENDERER_DIST,
  h as VITE_DEV_SERVER_URL
};
