import { app, BrowserWindow, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import https from 'node:https'
import { setWindowAsWallpaper, restoreFromWallpaper } from './wallpaper'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let homewin: BrowserWindow | null
// @ts-expect-error settingwin is used in other parts of the code
let settingwin: BrowserWindow | null

// 壁纸存储路径
const WALLPAPER_PATH = path.join(app.getPath('userData'), 'wallpaper.jpg')

// 请求限流配置
const RATE_LIMIT_MS = 1000 // 每个请求间隔至少 1 秒
let lastRequestTime = 0
const requestQueue: Array<{
  endpoint: string
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}> = []
let isProcessingQueue = false

// 处理请求队列
async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return
  
  isProcessingQueue = true
  
  while (requestQueue.length > 0) {
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTime
    
    // 如果距离上次请求不足 RATE_LIMIT_MS，则等待
    if (timeSinceLastRequest < RATE_LIMIT_MS) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastRequest))
    }
    
    const request = requestQueue.shift()
    if (!request) continue
    
    try {
      const result = await makeApiRequest(request.endpoint)
      request.resolve(result)
    } catch (error) {
      request.reject(error)
    }
    
    lastRequestTime = Date.now()
  }
  
  isProcessingQueue = false
}

// 实际发送 API 请求
function makeApiRequest(endpoint: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const url = `https://codeforces.com/api${endpoint}`
    console.log('主进程请求:', url)
    
    const options = {
      headers: {
        'User-Agent': 'CF-Watching-You-Always/1.0'
      }
    }
    
    https.get(url, options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          console.log('API 响应状态:', jsonData.status)
          resolve(jsonData)
        } catch (e) {
          reject(new Error('解析响应失败'))
        }
      })
    }).on('error', (err) => {
      console.error('请求失败:', err.message)
      reject(err)
    })
  })
}

// 将 Windows 路径转换为 file:// URL
function getFileURL(filePath: string): string {
  // 使用 Node.js 内置的 pathToFileURL
  const url = pathToFileURL(filePath)
  return url.href
}

function createWindow(
  routePath: string,
  width: number = 800,
  height: number = 600,
  x: number = 0,
  y: number = 0,
  frameless: boolean = false
): BrowserWindow {
  const win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'icon.png'),
    width,
    height,
    x, // 窗口横坐标
    y, // 窗口纵坐标
    frame: !frameless, // 无边框
    transparent: frameless, // 透明背景（无边框时）
    fullscreen: frameless, // 全屏（无边框时）
    autoHideMenuBar: true, // 自动隐藏菜单栏
    title: 'CF_Watching_you_always', // 设置窗口标题
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      // 允许加载本地文件
      webSecurity: false,
    },
  })

  // 隐藏菜单栏（Windows/Linux）
  win.setMenuBarVisibility(false)

  // 加载指定路由的页面
  if (VITE_DEV_SERVER_URL) {
    // 开发环境：加载 DevServer + 路由
    win.loadURL(`${VITE_DEV_SERVER_URL}#${routePath}`)
    // 可选：打开调试工具
    win.webContents.openDevTools()
  } else {
    // 生产环境：加载打包后的 index.html + 路由
    win.loadFile(path.join(RENDERER_DIST, 'index.html'), {
      hash: routePath // 通过 hash 传递路由
    })
  }

  // 监听窗口加载完成事件（保留你原有的消息发送逻辑）
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
    
    // 窗口加载完成后，如果已有壁纸，立即发送
    if (fs.existsSync(WALLPAPER_PATH)) {
      const wallpaperUrl = getFileURL(WALLPAPER_PATH)
      console.log('窗口加载完成，发送壁纸URL:', wallpaperUrl)
      win?.webContents.send('wallpaper-updated', wallpaperUrl)
    }
  })

  return win
}

// 处理 Codeforces API 请求（带限流）
ipcMain.handle('cf-api-request', async (_event, endpoint: string) => {
  return new Promise((resolve, reject) => {
    // 将请求加入队列
    requestQueue.push({ endpoint, resolve, reject })
    // 开始处理队列
    processQueue()
  })
})

// 处理设置壁纸的 IPC 事件
ipcMain.on('set-wallpaper', (_event, imageBase64: string) => {
  try {
    // 移除 base64 前缀
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    
    // 保存图片到应用数据目录
    fs.writeFileSync(WALLPAPER_PATH, buffer)
    
    console.log('壁纸已保存到:', WALLPAPER_PATH)
    
    // 转换为正确的 file:// URL，添加时间戳避免缓存
    const timestamp = Date.now()
    const wallpaperUrl = `${getFileURL(WALLPAPER_PATH)}?t=${timestamp}`
    console.log('转换后的壁纸URL:', wallpaperUrl)
    
    // 通知所有窗口更新背景
    const allWindows = BrowserWindow.getAllWindows()
    console.log('正在通知', allWindows.length, '个窗口更新壁纸')
    allWindows.forEach(win => {
      win.webContents.send('wallpaper-updated', wallpaperUrl)
    })
    
  } catch (error) {
    console.error('保存壁纸失败:', error)
  }
})

// 处理设置不透明度事件
ipcMain.on('set-wallpaper-opacity', (_event, opacity: number) => {
  console.log('收到不透明度设置:', opacity)
  
  // 通知所有窗口更新不透明度
  const allWindows = BrowserWindow.getAllWindows()
  allWindows.forEach(win => {
    win.webContents.send('wallpaper-opacity-updated', opacity)
  })
})

// 处理设置图表对比度事件
ipcMain.on('set-chart-contrast', (_event, contrast: number) => {
  console.log('收到图表对比度设置:', contrast)
  
  // 通知所有窗口更新对比度
  const allWindows = BrowserWindow.getAllWindows()
  allWindows.forEach(win => {
    win.webContents.send('chart-contrast-updated', contrast)
  })
})

// 处理获取壁纸路径的请求
ipcMain.handle('get-wallpaper-path', () => {
  console.log('收到获取壁纸路径请求')
  if (fs.existsSync(WALLPAPER_PATH)) {
    const wallpaperUrl = getFileURL(WALLPAPER_PATH)
    console.log('返回壁纸路径:', wallpaperUrl)
    return wallpaperUrl
  }
  console.log('壁纸文件不存在')
  return null
})

// 处理视图切换事件
ipcMain.on('switch-view', (_event, view: string) => {
  console.log('收到视图切换:', view)

  // 通知所有窗口切换视图
  const allWindows = BrowserWindow.getAllWindows()
  allWindows.forEach(win => {
    win.webContents.send('view-switched', view)
  })
})

// 处理设置为壁纸层的事件
ipcMain.on('set-as-wallpaper-layer', async (event) => {
  console.log('收到设置为壁纸层请求')

  // 使用 homewin (Home窗口) 而不是发送请求的窗口
  if (!homewin) {
    console.error('Home窗口未初始化')
    event.sender.send('wallpaper-layer-set', { success: false, message: 'Home窗口未初始化' })
    return
  }

  try {
    // 1. 先切换为无边框全屏并适应屏幕
    const { screen } = require('electron')
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize

    console.log('切换到全屏模式，屏幕尺寸:', width, 'x', height)

    // 设置无边框
    homewin.setMenuBarVisibility(false)
    homewin.setAutoHideMenuBar(true)

    // 设置全屏
    homewin.setFullScreen(true)

    // 等待窗口调整完成
    await new Promise(resolve => setTimeout(resolve, 500))

    // 获取窗口句柄 (Windows)
    const hwnd = homewin.getNativeWindowHandle()
    const hwndInt = hwnd.readUInt32LE(0)
    console.log('窗口句柄:', '0x' + hwndInt.toString(16).toUpperCase())

    // 2. 调用 TypeScript 函数设置壁纸层
    const success = await setWindowAsWallpaper(hwndInt)
    if (success) {
      event.sender.send('wallpaper-layer-set', { success: true, message: '已设置为壁纸层' })
    } else {
      event.sender.send('wallpaper-layer-set', { success: false, message: '设置失败' })
    }
  } catch (error: any) {
    console.error('设置壁纸层失败:', error)
    event.sender.send('wallpaper-layer-set', { success: false, message: error.message || '设置失败' })
  }
})

// 处理取消壁纸层的事件
ipcMain.on('cancel-wallpaper-layer', async (event) => {
  console.log('收到取消壁纸层请求')

  if (!homewin) {
    console.error('Home窗口未初始化')
    event.sender.send('wallpaper-layer-cancelled', { success: false, message: 'Home窗口未初始化' })
    return
  }

  try {
    // 1. 将窗口从WorkerW中移除，恢复为独立窗口
    const hwnd = homewin.getNativeWindowHandle()
    const hwndInt = hwnd.readUInt32LE(0)

    // 调用恢复函数
    const restored = await restoreFromWallpaper(hwndInt)
    if (!restored) {
      console.error('恢复窗口失败')
      event.sender.send('wallpaper-layer-cancelled', { success: false, message: '恢复窗口失败' })
      return
    }

    // 2. 退出全屏模式，恢复为正常窗口
    homewin.setFullScreen(false)
    homewin.setMenuBarVisibility(true)
    homewin.setAutoHideMenuBar(false)

    // 恢复窗口大小
    homewin.setBounds({ x: 0, y: 0, width: 800, height: 600 })

    console.log('已取消壁纸层')
    event.sender.send('wallpaper-layer-cancelled', { success: true, message: '已取消壁纸层' })
  } catch (error: any) {
    console.error('取消壁纸层失败:', error)
    event.sender.send('wallpaper-layer-cancelled', { success: false, message: error.message || '取消失败' })
  }
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    homewin = null
    settingwin = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    homewin = createWindow('/window1', 800, 600, 0, 0)
    settingwin = createWindow('/window2', 800, 600, 200, 200)
  }
})

app.whenReady().then(() => {
  // Home窗口初始为正常窗口
  homewin = createWindow('/', 800, 600, 0, 0, false)
  // Setting窗口正常窗口
  settingwin = createWindow('/setting', 800, 600, 0, 0, false)
})
