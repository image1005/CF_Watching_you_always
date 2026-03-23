<template>
  <div class="set-account-container">
    <el-card class="account-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">🎭 召唤古神化身</span>
        </div>
      </template>

      <!-- 未设置账号时显示输入框 -->
      <div v-if="!isLoggedIn" class="input-section">
        <el-input
          v-model="inputHandle"
          placeholder="输入你在虚空的真名..."
          size="large"
          clearable
          @keyup.enter="handleSetAccount"
          :disabled="loading"
        >
          <template #prefix>
            <el-icon><User /></el-icon>
          </template>
        </el-input>

        <el-button
          type="primary"
          size="large"
          :loading="loading"
          @click="handleSetAccount"
          :disabled="!inputHandle.trim()"
        >
          降临 ⛧
        </el-button>
      </div>

      <!-- 错误提示 -->
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        show-icon
        closable
        @close="clearError"
        class="error-alert"
      />

      <!-- 已设置账号时显示用户信息 -->
      <template v-else>
        <div class="user-profile">
          <div class="user-main">
            <el-avatar 
              :size="72" 
              :src="userInfo?.avatar || ''"
              class="avatar"
            >
              {{ handle.charAt(0).toUpperCase() }}
            </el-avatar>
            <div class="user-info">
              <h3 class="handle">{{ handle }}</h3>
              <el-tag 
                :type="getRankType(rank)" 
                effect="dark"
                size="small"
                class="rank-tag"
              >
                {{ rank || 'Unrated' }}
              </el-tag>
            </div>
          </div>
          
          <el-button 
            type="danger" 
            plain 
            size="small"
            @click="handleClearAccount"
          >
            <el-icon><Delete /></el-icon>
            退出
          </el-button>
        </div>

        <el-divider />

        <!-- 统计数据 -->
        <el-row :gutter="16" class="stats-row">
          <el-col :span="6">
            <el-statistic 
              title="当前 Rating" 
              :value="rating"
              :value-style="{ color: getRankColor(rank) }"
            />
          </el-col>
          <el-col :span="6">
            <el-statistic 
              title="最高 Rating" 
              :value="maxRating"
              :value-style="{ color: getRankColor(maxRank) }"
            />
          </el-col>
          <el-col :span="6">
            <el-statistic 
              title="今日刷题" 
              :value="todaySolvedCount"
            />
          </el-col>
          <el-col :span="6">
            <el-statistic
              title="参加比赛"
              :value="(userInfo as any)?.ratingHistory?.length || 0"
            />
          </el-col>
        </el-row>

        <el-divider />

        <!-- 最近比赛记录 -->
        <div class="recent-contests" v-if="recentContests.length > 0">
          <div class="section-title">最近比赛</div>
          <el-timeline>
            <el-timeline-item
              v-for="contest in recentContests.slice(0, 5)"
              :key="contest.contestId"
              :type="contest.newRating > contest.oldRating ? 'success' : contest.newRating < contest.oldRating ? 'danger' : 'info'"
              :icon="contest.newRating > contest.oldRating ? Top : contest.newRating < contest.oldRating ? Bottom : Minus"
            >
              <div class="contest-item">
                <div class="contest-name" :title="contest.contestName">
                  {{ contest.contestName }}
                </div>
                <div class="contest-result">
                  <el-tag size="small" effect="plain">#{{ contest.rank }}</el-tag>
                  <el-tag 
                    size="small" 
                    :type="contest.newRating > contest.oldRating ? 'success' : contest.newRating < contest.oldRating ? 'danger' : 'info'"
                    effect="dark"
                  >
                    {{ contest.newRating > contest.oldRating ? '+' : '' }}
                    {{ contest.newRating - contest.oldRating }}
                  </el-tag>
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>

        <el-divider v-if="recentContests.length > 0" />

        <!-- 底部操作 -->
        <div class="card-footer">
          <el-text type="info" size="small">
            上次更新: {{ formatTime(currentAccount?.lastUpdated) }}
          </el-text>
          <el-button 
            type="primary" 
            plain 
            size="small"
            :loading="loading"
            @click="handleRefresh"
          >
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>
    </el-card>

  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { User, Delete, Refresh, Top, Bottom, Minus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAccountStore } from '@/store/account'

const accountStore = useAccountStore()

const inputHandle = ref('')

const isLoggedIn = computed(() => accountStore.isLoggedIn)
const handle = computed(() => accountStore.handle)
const userInfo = computed(() => accountStore.userInfo)
const rating = computed(() => accountStore.rating)
const maxRating = computed(() => accountStore.maxRating)
const rank = computed(() => accountStore.rank)
const maxRank = computed(() => accountStore.maxRank)
const todaySolvedCount = computed(() => accountStore.todaySolvedCount)
const recentContests = computed(() => accountStore.recentContests)
const currentAccount = computed(() => accountStore.currentAccount)
const loading = computed(() => accountStore.loading)
const error = computed(() => accountStore.error)

// 获取段位颜色
function getRankColor(rank: string): string {
  if (!rank) return '#909399'
  
  const colors: Record<string, string> = {
    'newbie': '#909399',
    'pupil': '#67c23a',
    'specialist': '#409eff',
    'expert': '#409eff',
    'candidate master': '#9c27b0',
    'master': '#ff9800',
    'international master': '#ff9800',
    'grandmaster': '#f56c6c',
    'international grandmaster': '#f56c6c',
    'legendary grandmaster': '#f56c6c'
  }
  
  return colors[rank.toLowerCase()] || '#909399'
}

// 获取段位对应的标签类型
function getRankType(rank: string): string {
  if (!rank) return 'info'
  
  const types: Record<string, string> = {
    'newbie': 'info',
    'pupil': 'success',
    'specialist': 'success',
    'expert': 'primary',
    'candidate master': 'warning',
    'master': 'warning',
    'international master': 'warning',
    'grandmaster': 'danger',
    'international grandmaster': 'danger',
    'legendary grandmaster': 'danger'
  }
  
  return types[rank.toLowerCase()] || 'info'
}

// 格式化时间
function formatTime(timestamp?: number): string {
  if (!timestamp) return '未知'
  
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // 小于 1 分钟
  if (diff < 60 * 1000) {
    return '刚刚'
  }
  // 小于 1 小时
  if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))} 分钟前`
  }
  // 小于 24 小时
  if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))} 小时前`
  }
  
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 设置账号
async function handleSetAccount() {
  const handle = inputHandle.value.trim()
  if (!handle) return
  
  const success = await accountStore.setAccount(handle)
  
  if (success) {
    ElMessage.success('账号设置成功')
    inputHandle.value = ''
  } else {
    ElMessage.error(accountStore.error || '设置失败')
  }
}

// 清除账号
async function handleClearAccount() {
  try {
    await ElMessageBox.confirm(
      '确定要退出当前账号吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    accountStore.clearAccount()
    ElMessage.success('已退出账号')
  } catch {
    // 用户取消
  }
}

// 刷新数据
async function handleRefresh() {
  const success = await accountStore.refreshAccount()
  
  if (success) {
    ElMessage.success('数据已刷新')
  } else {
    ElMessage.error('刷新失败')
  }
}

// 清除错误
function clearError() {
  accountStore.error = null
}
</script>

<style scoped>
.set-account-container {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

.account-card {
  margin-bottom: 16px;
}

.card-header {
  font-size: 16px;
  font-weight: 500;
}

.input-section {
  display: flex;
  gap: 12px;
}

.input-section .el-input {
  flex: 1;
}

.error-alert {
  margin-top: 16px;
}

.user-profile {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.user-main {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar {
  border: 2px solid var(--el-border-color);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.handle {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.rank-tag {
  text-transform: capitalize;
}

.stats-row {
  margin: 16px 0;
}

:deep(.el-statistic__content) {
  font-size: 24px;
  font-weight: 600;
}

:deep(.el-statistic__title) {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.recent-contests {
  margin: 16px 0;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 16px;
}

.contest-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.contest-name {
  flex: 1;
  font-size: 13px;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contest-result {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

@media (max-width: 600px) {
  .input-section {
    flex-direction: column;
  }
  
  .input-section .el-button {
    width: 100%;
  }
  
  .stats-row .el-col {
    margin-bottom: 16px;
  }
  
  .stats-row .el-col:last-child {
    margin-bottom: 0;
  }
}
</style>
