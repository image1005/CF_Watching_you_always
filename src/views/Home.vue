<template>
  <el-container class="home-container">
    <!-- 背景层 -->
    <div class="background-layer" :style="backgroundStyle"></div>
    
    <!-- 内容层 -->
    <el-main class="content-layer">
      <Exercises v-show="currentView === 'exercises'" class="view-component" key="exercises" />
      <Gym v-show="currentView === 'gym'" class="view-component" key="gym" />
    </el-main>
  </el-container>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import { useSettingsStore } from '@/store'
import Exercises from '@/components/Exercises.vue'
import Gym from '@/components/Gym.vue'

const settingsStore = useSettingsStore()

const wallpaperUrl = ref('')
const opacity = ref(100)

const OPACITY_STORAGE_KEY = 'cf-watching-wallpaper-opacity'

const currentView = computed(() => settingsStore.display.currentView || 'exercises')

const backgroundStyle = computed(() => {
  if (wallpaperUrl.value) {
    return {
      backgroundImage: `url(${wallpaperUrl.value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      opacity: opacity.value / 100
    }
  }
  return {
    backgroundColor: '#000'
  }
})

onMounted(async () => {
  // 加载保存的不透明度
  const savedOpacity = localStorage.getItem(OPACITY_STORAGE_KEY)
  if (savedOpacity) {
    opacity.value = parseInt(savedOpacity, 10)
  }
  
  // 获取已保存的壁纸路径
  try {
    const savedWallpaper = await window.ipcRenderer.invoke('get-wallpaper-path')
    if (savedWallpaper) {
      wallpaperUrl.value = savedWallpaper
    }
  } catch (error) {
    console.error('获取壁纸路径失败:', error)
  }

  // 监听壁纸更新事件
  window.ipcRenderer.on('wallpaper-updated', (_, url: string) => {
    wallpaperUrl.value = url
  })
  
  // 监听不透明度更新事件
  window.ipcRenderer.on('wallpaper-opacity-updated', (_, value: number) => {
    opacity.value = value
  })
  
  // 监听视图切换事件
  window.ipcRenderer.on('view-switched', (_, view: string) => {
    console.log('收到视图切换:', view)
    settingsStore.updateDisplay({ currentView: view as 'exercises' | 'gym' })
  })
})
</script>

<style scoped>
.home-container {
  width: 100%;
  height: 100vh;
  position: relative;
  padding: 0;
  margin: 0;
}

.background-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.content-layer {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 0;
  overflow: hidden;
}

:deep(.el-main) {
  padding: 0;
}

.view-component {
  width: 100%;
  height: 100%;
}
</style>
