import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type Theme = 'light' | 'dark' | 'auto'
export type Language = 'zh' | 'en'

export interface NotificationSettings {
  enabled: boolean
  contestReminder: boolean
  ratingChange: boolean
  userOnline: boolean
  reminderMinutesBefore: number
}

export type ViewType = 'exercises' | 'gym'

export interface DisplaySettings {
  showAvatar: boolean
  showRatingGraph: boolean
  showSolvedProblems: boolean
  itemsPerPage: number
  refreshInterval: number
  currentView: ViewType
}

export interface GymSettings {
  activeContestId: number | null
}

export const useSettingsStore = defineStore(
  'settings',
  () => {
    // State
    const theme = ref<Theme>('auto')
    const language = ref<Language>('zh')
    const windowOpacity = ref(100)
    const alwaysOnTop = ref(false)
    
    const notification = ref<NotificationSettings>({
      enabled: true,
      contestReminder: true,
      ratingChange: true,
      userOnline: false,
      reminderMinutesBefore: 15
    })
    
    const display = ref<DisplaySettings>({
      showAvatar: true,
      showRatingGraph: true,
      showSolvedProblems: false,
      itemsPerPage: 20,
      refreshInterval: 5,
      currentView: 'exercises'
    })

    const gym = ref<GymSettings>({
      activeContestId: null
    })

    // Getters
    const isDarkTheme = computed(() => {
      if (theme.value === 'auto') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
      }
      return theme.value === 'dark'
    })

    const effectiveOpacity = computed(() => {
      return Math.max(20, Math.min(100, windowOpacity.value)) / 100
    })

    const refreshIntervalMs = computed(() => {
      return display.value.refreshInterval * 60 * 1000
    })

    // Actions
    
    /**
     * 设置主题
     */
    function setTheme(newTheme: Theme): void {
      theme.value = newTheme
      applyTheme()
    }

    /**
     * 切换主题
     */
    function toggleTheme(): void {
      const themes: Theme[] = ['light', 'dark', 'auto']
      const currentIndex = themes.indexOf(theme.value)
      const nextIndex = (currentIndex + 1) % themes.length
      setTheme(themes[nextIndex])
    }

    /**
     * 应用主题到 DOM
     */
    function applyTheme(): void {
      const html = document.documentElement
      const isDark = isDarkTheme.value
      
      if (isDark) {
        html.classList.add('dark')
      } else {
        html.classList.remove('dark')
      }
    }

    /**
     * 设置语言
     */
    function setLanguage(lang: Language): void {
      language.value = lang
    }

    /**
     * 设置窗口透明度
     */
    function setOpacity(value: number): void {
      windowOpacity.value = Math.max(20, Math.min(100, value))
    }

    /**
     * 设置窗口置顶
     */
    function setAlwaysOnTop(value: boolean): void {
      alwaysOnTop.value = value
      // Electron 环境下可以调用主进程设置置顶
      if (window.electronAPI?.setAlwaysOnTop) {
        window.electronAPI.setAlwaysOnTop(value)
      }
    }

    /**
     * 更新通知设置
     */
    function updateNotification(settings: Partial<NotificationSettings>): void {
      notification.value = { ...notification.value, ...settings }
    }

    /**
     * 更新显示设置
     */
    function updateDisplay(settings: Partial<DisplaySettings>): void {
      display.value = { ...display.value, ...settings }
    }

    /**
     * 更新Gym设置
     */
    function updateGym(settings: Partial<GymSettings>): void {
      gym.value = { ...gym.value, ...settings }
    }

    /**
     * 重置所有设置
     */
    function resetSettings(): void {
      theme.value = 'auto'
      language.value = 'zh'
      windowOpacity.value = 100
      alwaysOnTop.value = false
      
      notification.value = {
        enabled: true,
        contestReminder: true,
        ratingChange: true,
        userOnline: false,
        reminderMinutesBefore: 15
      }
      
      display.value = {
        showAvatar: true,
        showRatingGraph: true,
        showSolvedProblems: false,
        itemsPerPage: 20,
        refreshInterval: 5,
        currentView: 'exercises'
      }

      gym.value = {
        activeContestId: null
      }
      
      applyTheme()
    }

    /**
     * 初始化设置（应用主题等）
     */
    function initSettings(): void {
      applyTheme()
      
      // 监听系统主题变化
      if (theme.value === 'auto') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        mediaQuery.addEventListener('change', applyTheme)
      }
    }

    return {
      // State
      theme,
      language,
      windowOpacity,
      alwaysOnTop,
      notification,
      display,
      gym,
      // Getters
      isDarkTheme,
      effectiveOpacity,
      refreshIntervalMs,
      // Actions
      setTheme,
      toggleTheme,
      applyTheme,
      setLanguage,
      setOpacity,
      setAlwaysOnTop,
      updateNotification,
      updateDisplay,
      updateGym,
      resetSettings,
      initSettings
    }
  },
  {
    persist: {
      key: 'cf-watching-settings',
      pick: ['theme', 'language', 'windowOpacity', 'alwaysOnTop', 'notification', 'display', 'gym']
    }
  }
)

// 扩展 Window 接口以支持 Electron API
declare global {
  interface Window {
    electronAPI?: {
      setAlwaysOnTop: (value: boolean) => void
    }
  }
}
