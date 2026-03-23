<template>
  <el-card class="set-gym-card" shadow="never">
    <template #header>
      <div class="card-header">
        <span>比赛监听设置</span>
        <el-tag v-if="currentContest" type="success" size="small" effect="dark">
          监听中
        </el-tag>
      </div>
    </template>

    <!-- 未设置比赛时显示输入框 -->
    <el-form v-if="!currentContest" label-position="top">
      <el-form-item label="比赛ID">
        <el-input
          v-model="contestIdInput"
          placeholder="输入比赛ID (如: 2195)"
          @keyup.enter="setContest"
          :disabled="loading"
          clearable
        >
          <template #prefix>
            <el-icon><Trophy /></el-icon>
          </template>
          <template #append>
            <el-button @click="setContest" :loading="loading" type="primary">
              <el-icon><Check /></el-icon>
              确认
            </el-button>
          </template>
        </el-input>
      </el-form-item>
    </el-form>

    <!-- 已设置比赛时显示比赛信息 -->
    <div v-else class="contest-info">
      <div class="info-item">
        <span class="label">比赛ID:</span>
        <span class="value">{{ currentContest.id }}</span>
      </div>
      <div class="info-item">
        <span class="label">比赛名称:</span>
        <span class="value">{{ currentContest.name }}</span>
      </div>
      <div class="info-item">
        <span class="label">比赛状态:</span>
        <el-tag
          :type="getStatusType(currentContest.phase)"
          effect="dark"
          size="small"
        >
          {{ getStatusText(currentContest.phase) }}
        </el-tag>
      </div>

      <el-button
        type="danger"
        plain
        class="remove-btn"
        @click="handleRemove"
      >
        <el-icon><Delete /></el-icon>
        取消监听
      </el-button>
    </div>

  </el-card>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Trophy, Check, Delete } from '@element-plus/icons-vue'
import { contestApi } from '@/api'
import type { Contest } from '@/api'
import { useSettingsStore } from '@/store'

const CONTEST_STORAGE_KEY = 'cf-watching-gym-contest'

const settingsStore = useSettingsStore()

const contestIdInput = ref('')
const currentContest = ref<Contest | null>(null)
const loading = ref(false)

// @ts-expect-error activeContestId may be used in the future
const activeContestId = computed(() => settingsStore.gym.activeContestId)

// 从本地存储加载比赛
onMounted(() => {
  const savedContest = localStorage.getItem(CONTEST_STORAGE_KEY)
  if (savedContest) {
    try {
      currentContest.value = JSON.parse(savedContest)
    } catch {
      currentContest.value = null
    }
  }
})

// 保存比赛到本地存储
function saveContest(contest: Contest | null) {
  if (contest) {
    localStorage.setItem(CONTEST_STORAGE_KEY, JSON.stringify(contest))
  } else {
    localStorage.removeItem(CONTEST_STORAGE_KEY)
  }
}

async function setContest() {
  const id = parseInt(contestIdInput.value.trim())
  if (isNaN(id) || id <= 0) {
    ElMessage.error('请输入有效的比赛ID')
    return
  }

  loading.value = true
  try {
    const standingsData = await contestApi.standings(id, { from: 1, count: 1 })

    if (!standingsData || !standingsData.contest) {
      ElMessage.error('未找到该比赛，请检查ID是否正确')
      return
    }

    currentContest.value = standingsData.contest
    saveContest(currentContest.value)
    settingsStore.updateGym({ activeContestId: id })
    contestIdInput.value = ''
    ElMessage.success('已开始监听该比赛')
  } catch (error: any) {
    console.error('获取比赛信息失败:', error)
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      ElMessage.error('未找到该比赛，请检查ID是否正确')
    } else {
      ElMessage.error('获取比赛信息失败，请检查网络连接')
    }
  } finally {
    loading.value = false
  }
}

async function handleRemove() {
  try {
    await ElMessageBox.confirm(
      '确定要取消监听当前比赛吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    currentContest.value = null
    saveContest(null)
    settingsStore.updateGym({ activeContestId: null })
    ElMessage.success('已取消监听')
  } catch {
    // 用户取消
  }
}

function getStatusText(phase: string): string {
  const statusMap: Record<string, string> = {
    'BEFORE': '未开始',
    'CODING': '进行中',
    'PENDING_SYSTEM_TEST': '等待系统测试',
    'SYSTEM_TEST': '系统测试中',
    'FINISHED': '已结束'
  }
  return statusMap[phase] || phase
}

function getStatusType(phase: string): string {
  const typeMap: Record<string, string> = {
    'BEFORE': 'info',
    'CODING': 'success',
    'PENDING_SYSTEM_TEST': 'warning',
    'SYSTEM_TEST': 'warning',
    'FINISHED': 'info'
  }
  return typeMap[phase] || 'info'
}
</script>

<style scoped>
.set-gym-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 500;
}

.contest-info {
  padding: 8px 0;
}

.info-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
}

.label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  min-width: 70px;
}

.value {
  font-size: 14px;
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.remove-btn {
  margin-top: 16px;
  width: 100%;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-alert__title) {
  font-weight: 500;
}
</style>
