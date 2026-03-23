<template>
  <el-card class="contrast-card" shadow="never">
    <template #header>
      <div class="card-header">
        <span>图表对比度</span>
        <el-tag type="primary" effect="dark" size="small">{{ contrast }}%</el-tag>
      </div>
    </template>
    
    <div class="contrast-content">
      <el-form label-position="top">
        <el-form-item>
          <el-slider
            v-model="contrast"
            :min="0"
            :max="200"
            :step="10"
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

const CONTRAST_STORAGE_KEY = 'cf-watching-chart-contrast'

const contrast = ref(100)

// 滑块标记
const marks = {
  0: '全黑',
  100: '默认',
  200: '全白'
}

// 组件挂载时加载已保存的对比度
onMounted(() => {
  const savedContrast = localStorage.getItem(CONTRAST_STORAGE_KEY)
  if (savedContrast) {
    contrast.value = parseInt(savedContrast, 10)
  }
})

// 处理滑块变化
const handleChange = (value: number) => {
  // 保存到本地存储
  localStorage.setItem(CONTRAST_STORAGE_KEY, value.toString())
  
  // 通知所有窗口更新对比度
  window.ipcRenderer?.send('set-chart-contrast', value)
  
  ElMessage.success(`对比度已设置为 ${value}%`)
}
</script>

<style scoped>
.contrast-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 500;
}

.contrast-content {
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
