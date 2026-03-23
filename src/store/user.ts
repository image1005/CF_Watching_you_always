import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, RatingChange } from '@/api'
import { userApi } from '@/api'

export interface FollowedUser {
  handle: string
  info?: User
  ratingHistory?: RatingChange[]
  lastUpdated?: number
}

export const useUserStore = defineStore(
  'user',
  () => {
    // State
    const followedUsers = ref<FollowedUser[]>([])
    const loading = ref(false)
    const currentError = ref<string | null>(null)

    // Getters
    const followedHandles = computed(() => followedUsers.value.map(u => u.handle))
    const userCount = computed(() => followedUsers.value.length)
    
    // 获取排序后的用户列表（按当前 rating 降序）
    const sortedUsers = computed(() => {
      return [...followedUsers.value].sort((a, b) => {
        const ratingA = a.info?.rating ?? 0
        const ratingB = b.info?.rating ?? 0
        return ratingB - ratingA
      })
    })

    // 获取在线用户列表
    const onlineUsers = computed(() => {
      const now = Math.floor(Date.now() / 1000)
      const fiveMinutes = 5 * 60
      return followedUsers.value.filter(u => {
        if (!u.info?.lastOnlineTimeSeconds) return false
        return now - u.info.lastOnlineTimeSeconds < fiveMinutes
      })
    })

    // Actions
    
    /**
     * 添加关注用户
     */
    async function addUser(handle: string): Promise<boolean> {
      const trimmedHandle = handle.trim()
      if (!trimmedHandle) {
        currentError.value = '用户名不能为空'
        return false
      }

      // 检查是否已存在
      if (followedUsers.value.some(u => u.handle.toLowerCase() === trimmedHandle.toLowerCase())) {
        currentError.value = '该用户已在关注列表中'
        return false
      }

      loading.value = true
      currentError.value = null

      try {
        // 验证用户是否存在
        const users = await userApi.info([trimmedHandle])
        if (!users || users.length === 0) {
          currentError.value = '用户不存在'
          return false
        }

        const userInfo = users[0]
        
        // 获取用户 rating 历史
        let ratingHistory: RatingChange[] = []
        try {
          ratingHistory = await userApi.rating(trimmedHandle)
        } catch {
          // 用户可能没有参加过比赛，忽略错误
        }

        // 添加到列表
        followedUsers.value.push({
          handle: userInfo.handle,
          info: userInfo,
          ratingHistory,
          lastUpdated: Date.now()
        })

        return true
      } catch (error) {
        currentError.value = error instanceof Error ? error.message : '添加用户失败'
        return false
      } finally {
        loading.value = false
      }
    }

    /**
     * 移除关注用户
     */
    function removeUser(handle: string): void {
      const index = followedUsers.value.findIndex(
        u => u.handle.toLowerCase() === handle.toLowerCase()
      )
      if (index > -1) {
        followedUsers.value.splice(index, 1)
      }
    }

    /**
     * 刷新单个用户信息
     */
    async function refreshUser(handle: string): Promise<boolean> {
      const userIndex = followedUsers.value.findIndex(
        u => u.handle.toLowerCase() === handle.toLowerCase()
      )
      
      if (userIndex === -1) return false

      try {
        const [users, ratingHistory] = await Promise.all([
          userApi.info([handle]),
          userApi.rating(handle).catch(() => [])
        ])

        if (users && users.length > 0) {
          followedUsers.value[userIndex] = {
            ...followedUsers.value[userIndex],
            info: users[0],
            ratingHistory,
            lastUpdated: Date.now()
          }
        }
        return true
      } catch (error) {
        console.error('刷新用户信息失败:', error)
        return false
      }
    }

    /**
     * 刷新所有用户信息
     */
    async function refreshAllUsers(): Promise<void> {
      if (followedUsers.value.length === 0) return

      loading.value = true
      
      try {
        // 批量获取用户信息（Codeforces API 支持批量查询）
        const handles = followedHandles.value
        const users = await userApi.info(handles)
        
        // 更新用户信息
        const userMap = new Map(users.map(u => [u.handle.toLowerCase(), u]))
        
        for (let i = 0; i < followedUsers.value.length; i++) {
          const handle = followedUsers.value[i].handle.toLowerCase()
          const newInfo = userMap.get(handle)
          
          if (newInfo) {
            followedUsers.value[i] = {
              ...followedUsers.value[i],
              info: newInfo,
              lastUpdated: Date.now()
            }
          }
        }

        // 并行刷新每个用户的 rating 历史
        await Promise.all(
          followedUsers.value.map(u => 
            userApi.rating(u.handle)
              .then(history => {
                u.ratingHistory = history
              })
              .catch(() => {
                // 忽略错误
              })
          )
        )
      } catch (error) {
        console.error('刷新所有用户失败:', error)
      } finally {
        loading.value = false
      }
    }

    /**
     * 清空所有关注用户
     */
    function clearAll(): void {
      followedUsers.value = []
    }

    /**
     * 获取用户的最近比赛记录
     */
    function getRecentContests(handle: string, count: number = 5): RatingChange[] {
      const user = followedUsers.value.find(
        u => u.handle.toLowerCase() === handle.toLowerCase()
      )
      if (!user?.ratingHistory) return []
      
      return [...user.ratingHistory]
        .sort((a, b) => b.ratingUpdateTimeSeconds - a.ratingUpdateTimeSeconds)
        .slice(0, count)
    }

    /**
     * 获取用户的 rating 变化趋势
     */
    function getRatingTrend(handle: string): 'up' | 'down' | 'stable' {
      const user = followedUsers.value.find(
        u => u.handle.toLowerCase() === handle.toLowerCase()
      )
      if (!user?.ratingHistory || user.ratingHistory.length < 2) return 'stable'
      
      const sorted = [...user.ratingHistory].sort(
        (a, b) => a.ratingUpdateTimeSeconds - b.ratingUpdateTimeSeconds
      )
      const lastChange = sorted[sorted.length - 1]
      
      if (lastChange.newRating > lastChange.oldRating) return 'up'
      if (lastChange.newRating < lastChange.oldRating) return 'down'
      return 'stable'
    }

    return {
      // State
      followedUsers,
      loading,
      currentError,
      // Getters
      followedHandles,
      userCount,
      sortedUsers,
      onlineUsers,
      // Actions
      addUser,
      removeUser,
      refreshUser,
      refreshAllUsers,
      clearAll,
      getRecentContests,
      getRatingTrend
    }
  },
  {
    persist: {
      key: 'cf-watching-users',
      pick: ['followedUsers']
    }
  }
)
