<template>
  <el-card class="upload-card" shadow="never">
    <template #header>
      <div class="card-header">
        <span>🌌 虚空画卷</span>
        <el-tag v-if="fileList.length > 0" type="success" size="small" effect="dark">
          {{ fileList.length }} 幅禁忌之画
        </el-tag>
      </div>
    </template>

    <div class="upload-content">
      <el-upload
        ref="uploadRef"
        action="#"
        list-type="picture-card"
        :auto-upload="false"
        :on-change="handleChange"
        :file-list="fileList"
        :limit="10"
        multiple
        class="upload-component"
      >
        <el-icon><Plus /></el-icon>
        <template #tip>
          <div class="upload-tip">献祭图像以开启异界之门，支持 jpg/png 格式，最多10幅 🦑</div>
        </template>

        <template #file="{ file }">
          <div class="upload-item" :class="{ 'is-active': isCurrentWallpaper(file) }">
            <img class="el-upload-list__item-thumbnail" :src="file.url" alt="" />
            <div v-if="isCurrentWallpaper(file)" class="active-badge">
              <el-icon><Check /></el-icon>
            </div>
            <span class="el-upload-list__item-actions">
              <span
                class="el-upload-list__item-preview"
                @click="handlePictureCardPreview(file)"
              >
                <el-icon><ZoomIn /></el-icon>
              </span>
              <span
                class="el-upload-list__item-setbg"
                @click="handleSetBackground(file)"
                title="设为壁纸"
              >
                <el-icon><Picture /></el-icon>
              </span>
              <span
                class="el-upload-list__item-delete"
                @click="handleRemove(file)"
              >
                <el-icon><Delete /></el-icon>
              </span>
            </span>
          </div>
        </template>
      </el-upload>

    </div>

    <el-dialog v-model="dialogVisible" title="图片预览" width="60%">
      <img :src="dialogImageUrl" alt="Preview Image" style="width: 100%" />
    </el-dialog>
  </el-card>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { Delete, Plus, ZoomIn, Picture, Check } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { UploadFile, UploadInstance } from 'element-plus'

const uploadRef = ref<UploadInstance>()
const dialogImageUrl = ref('')
const dialogVisible = ref(false)
const fileList = ref<UploadFile[]>([])
const currentWallpaperUrl = ref('')

// 存储键名
const STORAGE_KEY = 'cf-watching-wallpapers'
const CURRENT_WALLPAPER_KEY = 'cf-watching-current-wallpaper'

// 组件挂载时加载已保存的图片
onMounted(() => {
  // 加载壁纸库
  const savedWallpapers = localStorage.getItem(STORAGE_KEY)
  if (savedWallpapers) {
    try {
      const wallpapers = JSON.parse(savedWallpapers)
      fileList.value = wallpapers.map((wp: any, index: number) => ({
        name: wp.name || `wallpaper-${index}.jpg`,
        url: wp.url,
        uid: wp.uid || Date.now() + index,
        status: 'success'
      } as UploadFile))
    } catch (e) {
      console.error('加载保存的壁纸失败:', e)
    }
  }

  // 加载当前使用的壁纸
  const savedCurrent = localStorage.getItem(CURRENT_WALLPAPER_KEY)
  if (savedCurrent) {
    currentWallpaperUrl.value = savedCurrent
  }
})

// 保存壁纸库到本地存储
function saveWallpapers() {
  const wallpapers = fileList.value.map(file => ({
    name: file.name,
    url: file.url,
    uid: file.uid
  }))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallpapers))
}

// 检查是否为当前壁纸
function isCurrentWallpaper(file: UploadFile): boolean {
  return file.url === currentWallpaperUrl.value
}

// 文件选择变化
const handleChange = (file: UploadFile) => {
  if (file.raw) {
    // 转换为 base64 存储
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string

      // 添加到文件列表
      const newFile = {
        name: file.name,
        url: base64,
        uid: file.uid,
        status: 'success'
      } as UploadFile

      fileList.value.push(newFile)
      saveWallpapers()
      ElMessage.success('图片已添加到壁纸库')

      // 如果是第一张壁纸，自动设置为背景
      if (fileList.value.length === 1) {
        handleSetBackground(newFile)
      }
    }
    reader.readAsDataURL(file.raw)
  }
}

// 删除图片
const handleRemove = (file: UploadFile) => {
  const index = fileList.value.findIndex(f => f.uid === file.uid)
  if (index > -1) {
    fileList.value.splice(index, 1)
    saveWallpapers()

    // 如果删除的是当前壁纸，清空当前壁纸设置
    if (file.url === currentWallpaperUrl.value) {
      currentWallpaperUrl.value = ''
      localStorage.removeItem(CURRENT_WALLPAPER_KEY)
      // 如果还有壁纸，自动设置第一张为当前壁纸
      if (fileList.value.length > 0) {
        handleSetBackground(fileList.value[0])
      }
    }

    ElMessage.success('图片已删除')
  }
}

// 预览图片
const handlePictureCardPreview = (file: UploadFile) => {
  dialogImageUrl.value = file.url!
  dialogVisible.value = true
}

// 设置为背景图片
const handleSetBackground = (file: UploadFile) => {
  if (file.url) {
    currentWallpaperUrl.value = file.url
    localStorage.setItem(CURRENT_WALLPAPER_KEY, file.url)
    // 发送事件通知主进程设置壁纸
    window.ipcRenderer.send('set-wallpaper', file.url)
    ElMessage.success('已设置为全局背景图片')
  }
}
</script>

<style scoped>
.upload-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 500;
}

.upload-content {
  padding: 8px 0;
}

.upload-component {
  display: inline-block;
}

.upload-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 8px;
}

.upload-item {
  width: 100%;
  height: 100%;
  position: relative;
}

.upload-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-item.is-active {
  border: 2px solid var(--el-color-success);
  border-radius: 6px;
}

.active-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  background-color: var(--el-color-success);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  z-index: 10;
}

/* 设置壁纸按钮样式 */
:deep(.el-upload-list__item-setbg) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  cursor: pointer;
  color: #fff;
  font-size: 16px;
  background-color: var(--el-color-success);
  border-radius: 50%;
  margin: 0 4px;
  transition: background-color 0.3s;
}

:deep(.el-upload-list__item-setbg:hover) {
  background-color: var(--el-color-success-light-3);
}

:deep(.el-alert__title) {
  font-weight: 500;
}
</style>
