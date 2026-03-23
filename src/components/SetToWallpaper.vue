<template>
  <el-card class="wallpaper-layer-card" shadow="never">
    <template #header>
      <div class="card-header">
        <span>设为桌面壁纸</span>
        <el-tag v-if="isSet" type="success" size="small" effect="dark">
          已启用
        </el-tag>
      </div>
    </template>

    <div class="content">
      <el-text type="info" size="small">
        将主窗口设置为桌面壁纸层，显示在桌面图标下方
      </el-text>

      <div class="button-group">
        <el-button
          type="primary"
          size="large"
          :loading="loading"
          :disabled="isSet"
          @click="handleSetAsWallpaper"
          class="set-button"
        >
          <el-icon><Monitor /></el-icon>
          {{ isSet ? '已设为壁纸' : '设为桌面壁纸' }}
        </el-button>

        <el-button
          v-if="isSet"
          type="danger"
          size="large"
          :loading="cancelLoading"
          @click="handleCancelWallpaper"
          class="cancel-button"
        >
          <el-icon><Close /></el-icon>
          取消壁纸
        </el-button>
      </div>

      <el-alert
        v-if="message"
        :type="messageType"
        :closable="false"
        show-icon
        class="message-alert"
      >
        {{ message }}
      </el-alert>
    </div>
  </el-card>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { Monitor, Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const cancelLoading = ref(false)
const isSet = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error' | 'info'>('info')

onMounted(() => {
  // 监听设置结果
  window.ipcRenderer?.on('wallpaper-layer-set', (_, result) => {
    loading.value = false
    if (result.success) {
      isSet.value = true
      message.value = result.message
      messageType.value = 'success'
      ElMessage.success(result.message)
    } else {
      message.value = result.message
      messageType.value = 'error'
      ElMessage.error(result.message)
    }
  })

  // 监听取消结果
  window.ipcRenderer?.on('wallpaper-layer-cancelled', (_, result) => {
    cancelLoading.value = false
    if (result.success) {
      isSet.value = false
      message.value = result.message
      messageType.value = 'success'
      ElMessage.success(result.message)
    } else {
      message.value = result.message
      messageType.value = 'error'
      ElMessage.error(result.message)
    }
  })
})

function handleSetAsWallpaper() {
  loading.value = true
  message.value = ''
  window.ipcRenderer?.send('set-as-wallpaper-layer')
}

function handleCancelWallpaper() {
  cancelLoading.value = true
  message.value = ''
  window.ipcRenderer?.send('cancel-wallpaper-layer')
}
</script>

<style scoped>
.wallpaper-layer-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 500;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.set-button,
.cancel-button {
  width: 100%;
}

.message-alert {
  margin-top: 8px;
}
</style>
