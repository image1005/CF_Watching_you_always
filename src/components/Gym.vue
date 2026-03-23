<template>
  <el-card class="gym-card" :body-style="{ padding: '0', height: '100%' }" shadow="never">
    <template #header v-if="contestInfo">
      <div class="card-header">
        <div class="contest-info">
          <span class="contest-name">{{ contestInfo.name }}</span>
          <el-tag :type="getContestStatusType(contestInfo.phase)" size="small" effect="dark">
            {{ getContestStatusText(contestInfo.phase) }}
          </el-tag>
        </div>
        <el-tag v-if="statsData.length > 0" type="info" size="small">
          {{ statsData.length }} 位好友参赛
        </el-tag>
      </div>
    </template>
    
    <div class="chart-container">
      <el-skeleton :rows="10" animated v-if="loading" />
      
      <el-empty 
        v-else-if="!contestInfo" 
        description="请先在设置中配置比赛ID"
        :image-size="100"
      />
      
      <el-empty 
        v-else-if="statsData.length === 0" 
        description="暂无好友参赛数据"
        :image-size="100"
      />
      
      <v-chart 
        v-show="!loading && contestInfo && statsData.length > 0"
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
import { useSettingsStore, useAccountStore, useUserStore } from '@/store'
import { contestApi, userApi } from '@/api'
import type { Contest, Submission } from '@/api'
import { getUserColor } from '@/utils/exerciseStats'
import { adjustColorBrightness, DARK_THEME_COLORS } from '@/utils/colorAdjust'
import { getContestStatusText, getContestStatusType } from '@/utils/contestUtils'

use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent
])

const settingsStore = useSettingsStore()
const accountStore = useAccountStore()
const userStore = useUserStore()

const loading = ref(false)
const contestInfo = ref<Contest | null>(null)
const statsData = ref<Array<{
  handle: string
  submissions: Array<{
    slot: number
    problemIndex: string
    time: number
  }>
  color: string
  isCurrentUser: boolean
  totalSolved: number
  lastProblem: string
}>>([])

let refreshTimer: NodeJS.Timeout | null = null

const activeContestId = computed(() => settingsStore.gym.activeContestId)
const refreshInterval = computed(() => settingsStore.display.refreshInterval * 60 * 1000)



// 对比度
const contrast = ref(100)
const CONTRAST_STORAGE_KEY = 'cf-watching-chart-contrast'

// 根据对比度计算实际颜色
const textColor = computed(() => adjustColorBrightness(DARK_THEME_COLORS.text, contrast.value))
const textColorSecondary = computed(() => adjustColorBrightness(DARK_THEME_COLORS.textSecondary, contrast.value))
const borderColor = computed(() => adjustColorBrightness(DARK_THEME_COLORS.border, contrast.value))

// 生成比赛时间标签（每10分钟一个刻度）
const timeLabels = computed(() => {
  if (!contestInfo.value) return []
  
  const startTime = contestInfo.value.startTimeSeconds as number * 1000
  const duration = contestInfo.value.durationSeconds as number * 1000
  const now = Date.now()
  const endTime = Math.min(startTime + duration, now)
  
  const labels: string[] = []
  const interval = 10 * 60 * 1000 // 10分钟
  
  for (let t = startTime; t <= endTime; t += interval) {
    const date = new Date(t)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    labels.push(`${hours}:${minutes}`)
  }
  
  return labels
})

// 计算比赛开始后的第几个时间片（10分钟为一个时间片）
function getTimeSlot(submissionTime: number, startTime: number): number {
  const interval = 10 * 60 // 10分钟（秒）
  return Math.floor((submissionTime - startTime) / interval)
}

const chartOption = computed(() => {
  const series = statsData.value.map((userStat) => {
    // 构建数据点，X轴是时间片(slot)，Y轴是累计过题数
    const data = userStat.submissions.map((sub, idx) => ({
      value: [sub.slot, idx + 1],
      name: sub.problemIndex,
      slot: sub.slot
    }))

    return {
      name: `${userStat.handle}${userStat.isCurrentUser ? ' (我)' : ''}`,
      type: 'line',
      smooth: false,
      symbol: 'circle',
      symbolSize: userStat.isCurrentUser ? 10 : 8,
      lineStyle: {
        width: userStat.isCurrentUser ? 3 : 2,
        color: userStat.color
      },
      itemStyle: {
        color: userStat.color
      },
      label: {
        show: true,
        position: 'top',
        formatter: (params: any) => params.data.name,
        fontSize: 10,
        color: textColor.value
      },
      data: data,
      markPoint: data.length > 0 ? {
        data: [
          {
            coord: [data[data.length - 1].slot, data.length],
            symbol: 'circle',
            symbolSize: userStat.isCurrentUser ? 14 : 12,
            itemStyle: {
              color: userStat.color,
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: true,
              formatter: data[data.length - 1]?.name || '',
              position: 'top',
              fontSize: 11,
              fontWeight: 'bold',
              color: '#fff'
            }
          }
        ]
      } : undefined
    }
  })

  return {
    backgroundColor: 'transparent',
    textStyle: {
      color: textColor.value
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1d1e1f',
      borderColor: borderColor.value,
      textStyle: {
        color: textColor.value
      },
      formatter: function(params: any[]) {
        if (!params.length) return ''
        let result = params[0].axisValue + '<br/>'
        params.forEach(param => {
          const name = param.seriesName.split(' (')[0]
          const problem = param.data?.name || ''
          result += `${param.marker} ${name}: ${problem}<br/>`
        })
        return result
      }
    },
    legend: {
      data: statsData.value.map(s => `${s.handle}${s.isCurrentUser ? ' (我)' : ''}`),
      bottom: 0,
      textStyle: {
        color: textColor.value,
        fontSize: 11
      },
      itemWidth: 20,
      itemHeight: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '12%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: timeLabels.value,
      axisLine: {
        lineStyle: {
          color: borderColor.value
        }
      },
      axisLabel: {
        color: textColorSecondary.value,
        fontSize: 10,
        interval: 2
      },
      splitLine: {
        show: false
      }
    },
    yAxis: {
      type: 'value',
      name: '过题数',
      nameTextStyle: {
        color: textColorSecondary.value,
        padding: [0, 0, 0, 40]
      },
      axisLine: {
        lineStyle: {
          color: borderColor.value
        }
      },
      axisLabel: {
        color: textColorSecondary.value
      },
      splitLine: {
        show: false
      },
      minInterval: 1
    },
    series
  }
})

async function fetchContestData() {
  if (!activeContestId.value) return
  
  loading.value = true
  try {
    // 获取比赛信息
    const standingsData = await contestApi.standings(activeContestId.value, {
      from: 1,
      count: 1
    })
    
    contestInfo.value = standingsData.contest
    
    if (!contestInfo.value) {
      return
    }

    // 获取所有好友的提交记录
    const allHandles = [...userStore.followedHandles]
    if (accountStore.handle && !allHandles.includes(accountStore.handle)) {
      allHandles.push(accountStore.handle)
    }

    const contestStartTime = contestInfo.value.startTimeSeconds as number
    const contestEndTime = contestStartTime + contestInfo.value.durationSeconds
    const now = Math.floor(Date.now() / 1000)
    const queryEndTime = Math.min(contestEndTime, now)

    // 获取每个好友的提交记录
    const userStatsPromises = allHandles.map(async (handle, index) => {
      try {
        const submissions = await userApi.status(handle, 1, 100)

        // 筛选比赛期间的 Accepted 提交
        const contestSubmissions = submissions.filter((sub: Submission) => {
          return sub.creationTimeSeconds >= contestStartTime &&
                 sub.creationTimeSeconds <= queryEndTime &&
                 sub.verdict === 'OK'
        })

        // 去重：同一道题只算一次（取最早通过的）
        const solvedProblems = new Map<string, Submission>()
        
        const sortedSubs = [...contestSubmissions].sort((a, b) => 
          a.creationTimeSeconds - b.creationTimeSeconds
        )
        
        for (const sub of sortedSubs) {
          const problemKey = `${sub.problem.contestId}-${sub.problem.index}`
          if (!solvedProblems.has(problemKey)) {
            solvedProblems.set(problemKey, sub)
          }
        }

        // 构建提交记录列表
        const uniqueSubmissions = Array.from(solvedProblems.values())
          .sort((a, b) => a.creationTimeSeconds - b.creationTimeSeconds)
          .map(sub => ({
            slot: getTimeSlot(sub.creationTimeSeconds, contestStartTime),
            problemIndex: sub.problem.index,
            time: sub.creationTimeSeconds
          }))

        const lastProblem = uniqueSubmissions.length > 0 
          ? uniqueSubmissions[uniqueSubmissions.length - 1].problemIndex 
          : '-'

        return {
          handle,
          submissions: uniqueSubmissions,
          color: getUserColor(index),
          isCurrentUser: handle === accountStore.handle,
          totalSolved: uniqueSubmissions.length,
          lastProblem
        }
      } catch (error) {
        console.error(`获取 ${handle} 的提交记录失败:`, error)
        return null
      }
    })

    const results = await Promise.all(userStatsPromises)
    statsData.value = results.filter((r): r is NonNullable<typeof r> => r !== null)

  } catch (error: any) {
    console.error('获取比赛数据失败:', error)
  } finally {
    loading.value = false
  }
}

function startAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
  
  // 只有比赛进行中时才自动刷新
  if (activeContestId.value && contestInfo.value?.phase === 'CODING') {
    refreshTimer = setInterval(() => {
      fetchContestData()
    }, refreshInterval.value)
  }
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// 监听比赛变化
watch(() => activeContestId.value, () => {
  stopAutoRefresh()
  statsData.value = []
  fetchContestData().then(() => {
    startAutoRefresh()
  })
})

onMounted(() => {
  const savedContrast = localStorage.getItem(CONTRAST_STORAGE_KEY)
  if (savedContrast) {
    contrast.value = parseInt(savedContrast, 10)
  }
  
  window.ipcRenderer?.on('chart-contrast-updated', (_, value: number) => {
    contrast.value = value
  })
  
  fetchContestData()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})


</script>

<style scoped>
.gym-card {
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

.contest-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.contest-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.chart-container {
  width: 100%;
  height: calc(100% - 60px);
  min-height: 300px;
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

:deep(.el-card__body) {
  display: flex;
  flex-direction: column;
}


</style>
