import type { Submission } from '@/api'

/**
 * 刷题统计工具函数
 */

export interface HourlyStats {
  hour: number
  count: number
}

export interface UserDailyStats {
  handle: string
  hourlyData: HourlyStats[]
  totalCount: number
  color: string
}

// 预定义的颜色列表（用于不同好友的折线）
export const USER_COLORS = [
  '#5470c6', // 蓝色
  '#91cc75', // 绿色
  '#fac858', // 黄色
  '#ee6666', // 红色
  '#73c0de', // 青色
  '#3ba272', // 深绿
  '#fc8452', // 橙色
  '#9a60b4', // 紫色
  '#ea7ccc', // 粉色
]

/**
 * 获取今日的开始和结束时间戳（Unix 秒）
 */
export function getTodayTimeRange(): { start: number; end: number } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  
  return {
    start: Math.floor(start.getTime() / 1000),
    end: Math.floor(end.getTime() / 1000)
  }
}

/**
 * 获取8点到24点的时间范围（Unix 秒）
 */
export function getDayTimeRange(): { start: number; end: number } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  
  return {
    start: Math.floor(start.getTime() / 1000),
    end: Math.floor(end.getTime() / 1000)
  }
}

/**
 * 获取日期字符串（用于显示）
 */
export function getTodayString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * 将提交记录按小时统计
 */
export function calculateHourlyStats(submissions: Submission[]): HourlyStats[] {
  // 初始化 24 小时数据
  const hourlyData: HourlyStats[] = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: 0
  }))
  
  const { start, end } = getTodayTimeRange()
  
  // 统计每小时的提交数量
  for (const sub of submissions) {
    if (sub.creationTimeSeconds >= start && sub.creationTimeSeconds <= end) {
      const date = new Date(sub.creationTimeSeconds * 1000)
      const hour = date.getHours()
      hourlyData[hour].count++
    }
  }
  
  return hourlyData
}

/**
 * 将提交记录按半小时统计（8点到24点）
 */
export function calculateHalfHourlyStats(submissions: Submission[]): { slot: number; count: number }[] {
  // 8点到24点，每半小时一个时间段，共32个时间段
  const slots: { slot: number; count: number }[] = Array.from({ length: 32 }, (_, i) => ({
    slot: i,
    count: 0
  }))
  
  const { start, end } = getDayTimeRange()
  
  // 统计每半小时的提交数量
  for (const sub of submissions) {
    if (sub.creationTimeSeconds >= start && sub.creationTimeSeconds <= end) {
      const date = new Date(sub.creationTimeSeconds * 1000)
      const hour = date.getHours()
      const minute = date.getMinutes()
      // 计算时间段索引：8点开始，每半小时一个slot
      const slotIndex = (hour - 8) * 2 + (minute >= 30 ? 1 : 0)
      if (slotIndex >= 0 && slotIndex < 32) {
        slots[slotIndex].count++
      }
    }
  }
  
  return slots
}

/**
 * 计算累计刷题数量（用于折线图）
 */
export function calculateCumulativeStats(hourlyData: HourlyStats[]): number[] {
  const cumulative: number[] = []
  let sum = 0
  
  for (const data of hourlyData) {
    sum += data.count
    cumulative.push(sum)
  }
  
  return cumulative
}

/**
 * 计算半小时粒度的累计刷题数量
 */
export function calculateCumulativeHalfHourlyStats(slots: { slot: number; count: number }[]): number[] {
  const cumulative: number[] = []
  let sum = 0
  
  for (const data of slots) {
    sum += data.count
    cumulative.push(sum)
  }
  
  return cumulative
}

/**
 * 获取用户的颜色（根据索引循环使用）
 */
export function getUserColor(index: number): string {
  return USER_COLORS[index % USER_COLORS.length]
}

/**
 * 格式化小时显示
 */
export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}
