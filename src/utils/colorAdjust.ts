/**
 * 颜色调整工具函数
 * 用于根据对比度调整颜色亮度
 */

/**
 * 根据对比度调整颜色亮度
 * @param color 原始颜色（hex格式如 #1d1e1f 或 rgb格式如 rgb(29,30,31)）
 * @param contrastPercent 对比度百分比（0-200）
 * @returns 调整后的rgb颜色字符串
 */
export function adjustColorBrightness(color: string | undefined, contrastPercent: number): string {
  // 如果颜色未定义，返回默认颜色
  if (!color) {
    return '#409eff' // Element Plus 默认蓝色
  }

  let r: number, g: number, b: number

  if (color.startsWith('#')) {
    const hex = color.replace('#', '')
    r = parseInt(hex.substring(0, 2), 16)
    g = parseInt(hex.substring(2, 4), 16)
    b = parseInt(hex.substring(4, 6), 16)
  } else if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g)
    if (match) {
      r = parseInt(match[0])
      g = parseInt(match[1])
      b = parseInt(match[2])
    } else {
      return color
    }
  } else {
    return color
  }

  if (contrastPercent <= 100) {
    // 向黑色靠拢
    const factor = contrastPercent / 100
    r = Math.round(r * factor)
    g = Math.round(g * factor)
    b = Math.round(b * factor)
  } else {
    // 向白色靠拢，使用更强的调整
    const factor = (contrastPercent - 100) / 100
    // 对于暗色，使用更大的调整幅度
    const boost = Math.max(0, (100 - Math.max(r, g, b)) / 100) // 越暗提升越大
    const adjustedFactor = Math.min(1, factor * (1 + boost))
    r = Math.round(r + (255 - r) * adjustedFactor)
    g = Math.round(g + (255 - g) * adjustedFactor)
    b = Math.round(b + (255 - b) * adjustedFactor)
  }

  // 确保值在0-255范围内
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))

  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Element Plus 暗黑模式基础配色
 */
export const DARK_THEME_COLORS = {
  text: '#cfd3dc',
  textSecondary: '#a3a6ad',
  border: '#414243',
  grid: '#363637',
  tooltipBg: '#1d1e1f'
} as const

/**
 * 根据对比度获取调整后的主题颜色
 * @param contrastPercent 对比度百分比
 * @returns 包含各种调整后的颜色的对象
 */
export function getAdjustedThemeColors(contrastPercent: number) {
  return {
    text: adjustColorBrightness(DARK_THEME_COLORS.text, contrastPercent),
    textSecondary: adjustColorBrightness(DARK_THEME_COLORS.textSecondary, contrastPercent),
    border: adjustColorBrightness(DARK_THEME_COLORS.border, contrastPercent),
    grid: adjustColorBrightness(DARK_THEME_COLORS.grid, contrastPercent),
    tooltipBg: adjustColorBrightness(DARK_THEME_COLORS.tooltipBg, contrastPercent)
  }
}
