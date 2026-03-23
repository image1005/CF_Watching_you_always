<template>
  <el-container class="setting-container">
    <el-header class="setting-header">
      <h2 class="title">🐙 古神祭坛 🦑</h2>
    </el-header>

    <el-main class="setting-main">
      <!-- 切换内容 -->
      <el-card class="setting-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>👁️ 召唤仪式</span>
          </div>
        </template>
        <div class="content-switch">
          <el-radio-group v-model="currentView" size="large">
            <el-radio-button label="exercises">深渊凝视 🔮</el-radio-button>
            <el-radio-button label="gym">异界竞技 ⚔️</el-radio-button>
          </el-radio-group>
          <el-text type="info" size="small">选择要召唤的虚空之物 🌊</el-text>
        </div>
      </el-card>

      <SetToWallpaper />

      <!-- 上传壁纸 -->
      <UpImage />

      <!-- 设置壁纸不透明度 -->
      <SetOpacity />

      <!-- 设置对比度 -->
      <SetContrast />

      <!-- 设置监听比赛 -->
      <SetGym />

      <!-- 数据刷新间隔 -->
      <el-card class="setting-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>数据刷新间隔</span>
            <el-tag type="primary" effect="dark" size="small">{{ refreshInterval }} 分钟</el-tag>
          </div>
        </template>
        <div class="refresh-setting">
          <el-slider
            v-model="refreshInterval"
            :min="1"
            :max="60"
            :step="1"
            show-stops
            show-input
          />
          <el-text type="info" size="small">每 {{ refreshInterval }} 分钟进行一次虚空探查 🕯️</el-text>
        </div>
      </el-card>

      <!-- 设置账号 -->
      <el-card class="setting-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>🎭 古神化身</span>
          </div>
        </template>
        <SetAccount />
      </el-card>

      <!-- 关注用户 -->
      <el-card class="setting-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>🐙 深渊信徒</span>
            <el-tag v-if="followedUsers.length > 0" type="success" size="small" effect="dark">
              {{ followedUsers.length }} 个祭品
            </el-tag>
          </div>
        </template>
        <div class="follow-users">
          <el-input
            v-model="newHandle"
            placeholder="输入信徒之名召唤..."
            @keyup.enter="addUser"
          >
            <template #append>
              <el-button @click="addUser">召唤 ⛧</el-button>
            </template>
          </el-input>

          <div class="user-list" v-if="followedUsers.length > 0">
            <el-tag
              v-for="user in followedUsers"
              :key="user.handle"
              closable
              @close="removeUser(user.handle)"
              class="user-tag"
            >
              {{ user.handle }} 🦑
            </el-tag>
          </div>
          <el-empty v-else description="暂无关注用户" />
        </div>
      </el-card>
    </el-main>
  </el-container>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import UpImage from '@/components/UpImage.vue'
import SetOpacity from '@/components/SetOpacity.vue'
import SetAccount from '@/components/SetAccount.vue'
import { useUserStore, useSettingsStore } from '@/store'
import SetContrast from '@/components/SetContrast.vue'
import SetGym from '@/components/SetGym.vue'
import SetToWallpaper from '@/components/SetToWallpaper.vue'

const userStore = useUserStore()
const settingsStore = useSettingsStore()

const newHandle = ref('')

// 当前视图
const currentView = computed({
  get: () => settingsStore.display.currentView || 'exercises',
  set: (val) => {
    settingsStore.updateDisplay({ currentView: val })
    // 通知所有窗口切换视图
    window.ipcRenderer.send('switch-view', val)
  }
})

const refreshInterval = computed({
  get: () => settingsStore.display.refreshInterval,
  set: (val) => settingsStore.updateDisplay({ refreshInterval: val })
})

const followedUsers = computed(() => userStore.followedUsers)

async function addUser() {
  const handle = newHandle.value.trim()
  if (!handle) return

  const success = await userStore.addUser(handle)
  if (success) {
    ElMessage.success('添加成功')
    newHandle.value = ''
  } else {
    ElMessage.error(userStore.currentError || '添加失败')
  }
}

function removeUser(handle: string) {
  userStore.removeUser(handle)
  ElMessage.success('已移除')
}
</script>

<style scoped>
.setting-container {
  min-height: 100vh;
  background-color: var(--el-bg-color-page);
}

.setting-header {
  height: auto;
  padding: 20px;
  border-bottom: 1px solid var(--el-border-color-light);
  background-color: var(--el-bg-color);
}

.title {
  margin: 0;
  font-size: 24px;
  color: var(--el-text-color-primary);
}

.setting-main {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.setting-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 500;
}

.content-switch {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.refresh-setting {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.follow-users {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.el-card__header) {
  padding: 12px 20px;
}

:deep(.el-empty) {
  padding: 20px 0;
}
</style>
