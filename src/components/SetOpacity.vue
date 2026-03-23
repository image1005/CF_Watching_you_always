<template>
  <el-card class="opacity-card" shadow="never">
    <template #header>
      <div class="card-header">
        <span>背景不透明度</span>
        <el-tag type="primary" effect="dark" size="small">{{ opacity }}%</el-tag>
      </div>
    </template>

    <div class="opacity-content">
      <el-form label-position="top">
        <el-form-item>
          <el-slider
            v-model="opacity"
            :min="0"
            :max="100"
            :step="1"
            show-stops
            :marks="marks"
            @change="handleChange"
          />
        </el-form-item>
      </el-form>

    </div>
  </el-card>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const OPACITY_STORAGE_KEY = 'cf-watching-wallpaper-opacity'

const opacity = ref(100)

// 滑块标记
const marks = {
  0: '透明',
  100: '不透明'
}

// 组件挂载时加载已保存的不透明度
onMounted(() => {
  const savedOpacity = localStorage.getItem(OPACITY_STORAGE_KEY)
  if (savedOpacity) {
    opacity.value = parseInt(savedOpacity, 10)
  }
})

// 处理滑块变化
const handleChange = (value: number) => {
  // 保存到本地存储
  localStorage.setItem(OPACITY_STORAGE_KEY, value.toString())

  // 通知所有窗口更新不透明度
  window.ipcRenderer.send('set-wallpaper-opacity', value)

  ElMessage.success(`不透明度已设置为 ${value}%`)
}
</script>

<style scoped>
.opacity-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 500;
}

.opacity-content {
  padding: 8px 0;
}

:deep(.el-form-item) {
  margin-bottom: 16px;
}

:deep(.el-slider__runway) {
  margin: 16px 0;
}

:deep(.el-alert__title) {
  font-weight: 500;
}
</style>
