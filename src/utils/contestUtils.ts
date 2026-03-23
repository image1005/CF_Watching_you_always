/**
 * 比赛相关工具函数
 */

/**
 * 比赛阶段类型
 */
export type ContestPhase = 'BEFORE' | 'CODING' | 'PENDING_SYSTEM_TEST' | 'SYSTEM_TEST' | 'FINISHED'

/**
 * 获取比赛状态的显示文本
 * @param phase 比赛阶段
 * @returns 状态文本
 */
export function getContestStatusText(phase: string): string {
  const statusMap: Record<string, string> = {
    'BEFORE': '未开始',
    'CODING': '进行中',
    'PENDING_SYSTEM_TEST': '等待系统测试',
    'SYSTEM_TEST': '系统测试中',
    'FINISHED': '已结束'
  }
  return statusMap[phase] || phase
}

/**
 * 获取比赛状态对应的Element Plus标签类型
 * @param phase 比赛阶段
 * @returns 标签类型
 */
export function getContestStatusType(phase: string): string {
  const typeMap: Record<string, string> = {
    'BEFORE': 'info',
    'CODING': 'success',
    'PENDING_SYSTEM_TEST': 'warning',
    'SYSTEM_TEST': 'warning',
    'FINISHED': 'info'
  }
  return typeMap[phase] || 'info'
}

/**
 * 判断比赛是否正在进行中
 * @param phase 比赛阶段
 * @returns 是否进行中
 */
export function isContestRunning(phase: string): boolean {
  return phase === 'CODING'
}

/**
 * 判断比赛是否已结束
 * @param phase 比赛阶段
 * @returns 是否已结束
 */
export function isContestFinished(phase: string): boolean {
  return phase === 'FINISHED'
}

/**
 * 格式化比赛时长（秒数转为小时:分钟）
 * @param seconds 秒数
 * @returns 格式化后的字符串
 */
export function formatContestDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}小时${minutes > 0 ? minutes + '分钟' : ''}`
}

/**
 * 格式化比赛时间（时间戳转为可读格式）
 * @param timestamp 秒级时间戳
 * @returns 格式化后的字符串
 */
export function formatContestTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
