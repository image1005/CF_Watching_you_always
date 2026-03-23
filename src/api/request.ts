import type { CFApiResponse } from './types'

// 检查是否在 Electron 环境
const isElectron = typeof window !== 'undefined' && window.ipcRenderer

// 封装 GET 请求 - 在 Electron 中使用 IPC，在浏览器中使用 fetch
export async function get<T>(url: string): Promise<T> {
  if (isElectron) {
    // 使用 Electron 主进程发送请求（绕过 CORS）
    const response = await window.ipcRenderer.invoke('cf-api-request', url) as CFApiResponse<T>
    
    if (response.status === 'FAILED') {
      throw new Error(response.comment || '请求失败')
    }
    
    return response.result as T
  } else {
    // 浏览器环境使用 fetch
    const response = await fetch(`https://codeforces.com/api${url}`, {
      headers: {
        'User-Agent': 'CF-Watching-You-Always/1.0'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP 错误: ${response.status}`)
    }
    
    const data = await response.json() as CFApiResponse<T>
    
    if (data.status === 'FAILED') {
      throw new Error(data.comment || '请求失败')
    }
    
    return data.result as T
  }
}

// 为了兼容旧代码，导出一个模拟的 axios 实例
export default {
  get: async <T>(url: string) => {
    const result = await get<T>(url)
    return { data: { result, status: 'OK' } }
  }
}
