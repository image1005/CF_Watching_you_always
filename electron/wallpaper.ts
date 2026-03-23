import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const execFileAsync = promisify(execFile)

/**
 * 将指定窗口置于壁纸层
 * @param hwnd 需要放置在壁纸层的窗口句柄
 * @returns 是否成功
 */
export async function setWindowAsWallpaper(hwnd: number): Promise<boolean> {
    const csCode = `using System;
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
}`;

    const tempDir = os.tmpdir();
    const baseName = `wallpaper-${Date.now()}`;
    const csFile = path.join(tempDir, `${baseName}.cs`);
    const exeFile = path.join(tempDir, `${baseName}.exe`);

    try {
        // 写入C#源文件
        fs.writeFileSync(csFile, csCode, 'utf8');

        // 编译C#代码
        const compileResult = await execFileAsync('csc.exe', [
            '/target:exe',
            '/out:' + exeFile,
            csFile
        ], {
            timeout: 30000,
            windowsHide: true
        }).catch(() => {
            // 如果csc不在PATH中，尝试使用完整路径
            return execFileAsync('C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe', [
                '/target:exe',
                '/out:' + exeFile,
                csFile
            ], {
                timeout: 30000,
                windowsHide: true
            });
        });

        console.log('编译输出:', compileResult.stdout);
        if (compileResult.stderr) {
            console.error('编译错误:', compileResult.stderr);
        }

        // 执行编译后的程序
        const { stdout, stderr } = await execFileAsync(exeFile, ['set', hwnd.toString()], {
            timeout: 30000,
            windowsHide: true
        });

        console.log('程序输出:', stdout);
        if (stderr) {
            console.error('程序错误:', stderr);
        }

        return stdout.includes('True');
    } catch (error: any) {
        console.error('设置壁纸层失败:', error);
        if (error.stderr) {
            console.error('错误输出:', error.stderr);
        }
        if (error.stdout) {
            console.error('标准输出:', error.stdout);
        }
        return false;
    } finally {
        // 清理临时文件
        try {
            if (fs.existsSync(csFile)) {
                fs.unlinkSync(csFile);
            }
            if (fs.existsSync(exeFile)) {
                fs.unlinkSync(exeFile);
            }
        } catch (e) {
            // 忽略清理错误
        }
    }
}

/**
 * 将窗口从壁纸层恢复
 * @param hwnd 需要恢复的窗口句柄
 * @returns 是否成功
 */
export async function restoreFromWallpaper(hwnd: number): Promise<boolean> {
    // 复用相同的C#代码，但传入restore参数
    const csCode = `using System;
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
}`;

    const tempDir = os.tmpdir();
    const baseName = `wallpaper-restore-${Date.now()}`;
    const csFile = path.join(tempDir, `${baseName}.cs`);
    const exeFile = path.join(tempDir, `${baseName}.exe`);

    try {
        fs.writeFileSync(csFile, csCode, 'utf8');

        const compileResult = await execFileAsync('csc.exe', [
            '/target:exe',
            '/out:' + exeFile,
            csFile
        ], {
            timeout: 30000,
            windowsHide: true
        }).catch(() => {
            return execFileAsync('C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe', [
                '/target:exe',
                '/out:' + exeFile,
                csFile
            ], {
                timeout: 30000,
                windowsHide: true
            });
        });

        console.log('编译输出:', compileResult.stdout);

        const { stdout, stderr } = await execFileAsync(exeFile, ['restore', hwnd.toString()], {
            timeout: 30000,
            windowsHide: true
        });

        console.log('程序输出:', stdout);
        if (stderr) {
            console.error('程序错误:', stderr);
        }

        return stdout.includes('True');
    } catch (error: any) {
        console.error('恢复窗口失败:', error);
        return false;
    } finally {
        try {
            if (fs.existsSync(csFile)) {
                fs.unlinkSync(csFile);
            }
            if (fs.existsSync(exeFile)) {
                fs.unlinkSync(exeFile);
            }
        } catch (e) {
            // 忽略清理错误
        }
    }
}
