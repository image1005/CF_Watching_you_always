<template>
  <el-card class="exercises-card" :body-style="{ padding: '0', height: '100%' }" shadow="never">
    <template #header>
      <div class="card-header">
        <span class="title">🦑 {{ todayString }} 深渊凝视 👁️‍🗨️</span>
        <el-tag v-if="statsData.length > 0" type="info" size="small">
          {{ statsData.length }} 个祭品 🐙
        </el-tag>
      </div>
    </template>

    <div class="chart-container">
      <el-skeleton :rows="10" animated v-if="loading" />

      <el-empty
        v-else-if="statsData.length === 0"
        description="虚空之中无祭品，请召唤更多古神信徒 🌊"
        :image-size="100"
      />
      
      <v-chart 
        v-show="!loading && statsData.length > 0"
        class="chart" 
        :option="chartOption" 
        autoresize 
      />
    </div>
  </el-card>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { useUserStore, useAccountStore, useSettingsStore } from '@/store'
import { userApi } from '@/api'
import type { Submission } from '@/api'
import {
  calculateHalfHourlyStats,
  getUserColor,
  getTodayString
} from '@/utils/exerciseStats'
import { adjustColorBrightness, DARK_THEME_COLORS } from '@/utils/colorAdjust'

use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent
])

const userStore = useUserStore()
const accountStore = useAccountStore()
const settingsStore = useSettingsStore()

const loading = ref(true)
const statsData = ref<Array<{
  handle: string
  slotData: number[]
  color: string
  isCurrentUser: boolean
  lastProblem: string
}>>([])

let refreshTimer: NodeJS.Timeout | null = null

// 防止重复刷新的标志
let isRefreshing = false
let lastRefreshTime = 0
const MIN_REFRESH_INTERVAL = 5000 // 最少5秒才能刷新一次

const todayString = computed(() => getTodayString())
// refreshInterval 存储的是分钟，需要转换为毫秒
const refreshIntervalMs = computed(() => settingsStore.display.refreshInterval * 60 * 1000)

// 对比度
const contrast = ref(100)
const CONTRAST_STORAGE_KEY = 'cf-watching-chart-contrast'

// 生成8点到24点的半小时标签
const timeLabels = computed(() => {
  const labels: string[] = []

  for (let hour = 8; hour <= 23; hour++) {
    for (let min of [0, 30]) {
      labels.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
    }
  }
  // 24:00
  labels.push('24:00')
  return labels
})

// 根据对比度计算实际颜色
const textColor = computed(() => adjustColorBrightness(DARK_THEME_COLORS.text, contrast.value))
const textColorSecondary = computed(() => adjustColorBrightness(DARK_THEME_COLORS.textSecondary, contrast.value))
const borderColor = computed(() => adjustColorBrightness(DARK_THEME_COLORS.border, contrast.value))
// @ts-expect-error gridColor may be used in the future
const gridColor = computed(() => adjustColorBrightness(DARK_THEME_COLORS.grid, contrast.value))
const tooltipBgColor = computed(() => adjustColorBrightness(DARK_THEME_COLORS.tooltipBg, contrast.value))

const chartOption = computed(() => {
  const series = statsData.value.map((userStat) => ({
    name: `${userStat.handle}${userStat.isCurrentUser ? ' (古神化身)' : ''}`,
    type: 'line',
    smooth: false,
    symbol: 'circle',
    symbolSize: userStat.isCurrentUser ? 8 : 6,
    lineStyle: {
      width: userStat.isCurrentUser ? 3 : 2,
      color: adjustColorBrightness(userStat.color, contrast.value)
    },
    itemStyle: {
      color: adjustColorBrightness(userStat.color, contrast.value)
    },
    data: userStat.slotData,
    // 在当前时间点添加标记点
    markPoint: userStat.slotData.length > 0 ? {
      data: [
        {
          coord: [userStat.slotData.length - 1, userStat.slotData[userStat.slotData.length - 1] ?? 0],
          symbol: 'circle',
          symbolSize: userStat.isCurrentUser ? 12 : 10,
          itemStyle: {
            color: adjustColorBrightness(userStat.color, contrast.value),
            borderColor: adjustColorBrightness('#fff', contrast.value),
            borderWidth: 2
          }
        }
      ]
    } : undefined
  }))

  return {
    backgroundColor: 'transparent',
    textStyle: {
      color: textColor.value
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: tooltipBgColor.value,
      borderColor: borderColor.value,
      textStyle: {
        color: textColor.value
      },
      formatter: function(params: any[]) {
        let result = '🕐 ' + params[0].axisValue + ' 🌑<br/>'
        params.forEach(param => {
          const name = param.seriesName.split(' (')[0]
          result += `${param.marker} ${name}: ${param.value} 个契约 🔮<br/>`
        })
        return result
      }
    },
    legend: {
      data: statsData.value.map(s => `${s.handle}${s.isCurrentUser ? ' (古神化身)' : ''}`),
      bottom: 0,
      textStyle: {
        color: textColor.value,
        fontSize: 11
      },
      itemWidth: 20,
      itemHeight: 10
    },
    grid: {
      left: 50,
      right: 20,
      bottom: 60,
      top: 20,
      show: false
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: timeLabels.value,
      axisLabel: {
        interval: 1,
        color: textColorSecondary.value,
        fontSize: 10
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: borderColor.value,
          width: 1
        }
      },
      axisTick: {
        show: true,
        alignWithLabel: true,
        lineStyle: {
          color: borderColor.value
        }
      },
      splitLine: {
        show: false
      }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: {
        color: textColorSecondary.value,
        fontSize: 11
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: borderColor.value,
          width: 1
        }
      },
      axisTick: {
        show: true,
        lineStyle: {
          color: borderColor.value
        }
      },
      splitLine: {
        show: false
      }
    },
    series
  }
})

async function fetchUserSubmissions(handle: string): Promise<Submission[]> {
  try {
    return await userApi.status(handle, 1, 100)
  } catch {
    return []
  }
}

// 获取最后提交的题目名称
function getLastProblemName(submissions: Submission[]): string {
  if (submissions.length === 0) return '无提交'
  
  const sorted = [...submissions].sort((a, b) => b.creationTimeSeconds - a.creationTimeSeconds)
  const lastSub = sorted[0]
  
  if (lastSub.problem) {
    const contestId = lastSub.problem.contestId
    const index = lastSub.problem.index
    if (contestId && index) {
      return `${contestId}/${index}`
    }
    return lastSub.problem.name || '未知'
  }
  return '未知'
}

// 计算到当前时间片的累计数据（8点到24点，每半小时一个时间片）
function calculateCumulativeToCurrentSlot(slots: { slot: number; count: number }[]): number[] {
  const cumulative: number[] = []
  let sum = 0
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentSlot = (currentHour - 8) * 2 + (currentMinute >= 30 ? 1 : 0)
  
  for (let i = 0; i <= currentSlot && i < 32; i++) {
    const stat = slots.find(s => s.slot === i)
    if (stat) {
      sum += stat.count
    }
    cumulative.push(sum)
  }
  
  return cumulative
}

async function refreshData() {
  if (isRefreshing) {
    console.log('刷新正在进行中，跳过')
    return
  }
  
  const now = Date.now()
  if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
    console.log('距离上次刷新不足5秒，跳过')
    return
  }
  
  isRefreshing = true
  lastRefreshTime = now
  loading.value = true
  
  try {
    const allUsers = [...userStore.followedHandles]
    if (accountStore.handle && !allUsers.includes(accountStore.handle)) {
      allUsers.push(accountStore.handle)
    }
    
    if (allUsers.length === 0) {
      statsData.value = []
      loading.value = false
      isRefreshing = false
      return
    }
    
    console.log(`开始刷新数据，共 ${allUsers.length} 个用户`)
    const newStatsData = []

    for (let i = 0; i < allUsers.length; i++) {
      const handle = allUsers[i]
      console.log(`获取用户 ${handle} 的数据...`)
      const submissions = await fetchUserSubmissions(handle)
      const halfHourlyStats = calculateHalfHourlyStats(submissions)
      const cumulativeData = calculateCumulativeToCurrentSlot(halfHourlyStats)
      const lastProblem = getLastProblemName(submissions)

      newStatsData.push({
        handle,
        slotData: cumulativeData,
        color: getUserColor(i),
        isCurrentUser: handle === accountStore.handle,
        lastProblem
      })
    }
    
    statsData.value = newStatsData
    console.log('数据刷新完成')
  } catch (error) {
    console.error('刷新数据失败:', error)
  } finally {
    loading.value = false
    isRefreshing = false
  }
}

function startAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  
  const interval = refreshIntervalMs.value
  console.log(`启动自动刷新，间隔: ${settingsStore.display.refreshInterval}分钟`)
  refreshTimer = setInterval(() => {
    console.log('定时器触发刷新')
    refreshData()
  }, interval)
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
    console.log('停止自动刷新')
  }
}

watch(() => settingsStore.display.refreshInterval, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    console.log(`刷新间隔变化: ${oldVal} -> ${newVal} 分钟，重启定时器`)
    startAutoRefresh()
  }
})

onMounted(() => {
  const savedContrast = localStorage.getItem(CONTRAST_STORAGE_KEY)
  if (savedContrast) {
    contrast.value = parseInt(savedContrast, 10)
  }
  
  window.ipcRenderer?.on('chart-contrast-updated', (_, value: number) => {
    contrast.value = value
  })
  
  refreshData()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.exercises-card {
  width: 100%;
  height: 100%;
  background: transparent;
  border: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.chart-container {
  width: 100%;
  height: calc(100% - 60px);
  min-height: 350px;
  padding: 10px;
  box-sizing: border-box;
}

.chart {
  width: 100%;
  height: 100%;
}

:deep(.el-card__header) {
  padding: 12px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
</style>
