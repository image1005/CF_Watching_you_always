import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RatingChange, Submission } from '@/api'
import { userApi } from '@/api'

// 可序列化的账号状态（用于持久化）
interface SerializableAccountState {
  handle: string
  info?: {
    handle: string
    email?: string
    vkId?: string
    openId?: string
    firstName?: string
    lastName?: string
    country?: string
    city?: string
    organization?: string
    contribution: number
    rank: string
    rating: number
    maxRank: string
    maxRating: number
    lastOnlineTimeSeconds: number
    registrationTimeSeconds: number
    friendOfCount: number
    avatar: string
    titlePhoto: string
  }
  ratingHistory: RatingChange[]
  recentSubmissions: Submission[]
  lastUpdated?: number
}

export const useAccountStore = defineStore(
  'account',
  () => {
    // State - 使用浅层 ref 存储可序列化的数据
    const currentAccount = ref<SerializableAccountState | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    // Getters
    const isLoggedIn = computed(() => !!currentAccount.value?.handle)
    const handle = computed(() => currentAccount.value?.handle ?? '')
    const userInfo = computed(() => currentAccount.value?.info)
    const rating = computed(() => currentAccount.value?.info?.rating ?? 0)
    const maxRating = computed(() => currentAccount.value?.info?.maxRating ?? 0)
    const rank = computed(() => currentAccount.value?.info?.rank ?? '')
    const maxRank = computed(() => currentAccount.value?.info?.maxRank ?? '')
    
    // 获取今日刷题数
    const todaySolvedCount = computed(() => {
      if (!currentAccount.value?.recentSubmissions) return 0
      
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      const startTimestamp = Math.floor(startOfDay.getTime() / 1000)
      
      const solvedProblems = new Set<string>()
      
      for (const sub of currentAccount.value.recentSubmissions) {
        if (sub.verdict === 'OK' && sub.creationTimeSeconds >= startTimestamp) {
          const problemKey = `${sub.problem.contestId}-${sub.problem.index}`
          solvedProblems.add(problemKey)
        }
      }
      
      return solvedProblems.size
    })

    // 获取最近比赛成绩
    const recentContests = computed(() => {
      if (!currentAccount.value?.ratingHistory) return []
      return [...currentAccount.value.ratingHistory]
        .sort((a, b) => b.ratingUpdateTimeSeconds - a.ratingUpdateTimeSeconds)
        .slice(0, 5)
    })

    // Actions
    
    /**
     * 设置当前账号
     */
    async function setAccount(handle: string): Promise<boolean> {
      const trimmedHandle = handle.trim()
      if (!trimmedHandle) {
        error.value = '用户名不能为空'
        return false
      }

      loading.value = true
      error.value = null

      try {
        // 验证用户是否存在
        const users = await userApi.info([trimmedHandle])
        if (!users || users.length === 0) {
          error.value = '用户不存在'
          return false
        }

        const userInfo = users[0]
        
        // 获取用户 rating 历史和最近提交
        const [ratingHistory, recentSubmissions] = await Promise.all([
          userApi.rating(trimmedHandle).catch(() => []),
          userApi.status(trimmedHandle, 1, 50).catch(() => [])
        ])

        // 创建可序列化的状态对象
        currentAccount.value = {
          handle: userInfo.handle,
          info: {
            handle: userInfo.handle,
            email: userInfo.email,
            vkId: userInfo.vkId,
            openId: userInfo.openId,
            firstName: userInfo.firstName,
            lastName: userInfo.lastName,
            country: userInfo.country,
            city: userInfo.city,
            organization: userInfo.organization,
            contribution: userInfo.contribution,
            rank: userInfo.rank,
            rating: userInfo.rating,
            maxRank: userInfo.maxRank,
            maxRating: userInfo.maxRating,
            lastOnlineTimeSeconds: userInfo.lastOnlineTimeSeconds,
            registrationTimeSeconds: userInfo.registrationTimeSeconds,
            friendOfCount: userInfo.friendOfCount,
            avatar: userInfo.avatar,
            titlePhoto: userInfo.titlePhoto
          },
          ratingHistory,
          recentSubmissions,
          lastUpdated: Date.now()
        }

        return true
      } catch (err) {
        error.value = err instanceof Error ? err.message : '设置账号失败'
        return false
      } finally {
        loading.value = false
      }
    }

    /**
     * 清除当前账号
     */
    function clearAccount(): void {
      currentAccount.value = null
      error.value = null
    }

    /**
     * 刷新当前账号数据
     */
    async function refreshAccount(): Promise<boolean> {
      if (!currentAccount.value?.handle) return false
      
      return setAccount(currentAccount.value.handle)
    }

    /**
     * 更新最近提交记录
     */
    async function updateRecentSubmissions(): Promise<void> {
      if (!currentAccount.value?.handle) return
      
      try {
        const submissions = await userApi.status(currentAccount.value.handle, 1, 50)
        currentAccount.value.recentSubmissions = submissions
        currentAccount.value.lastUpdated = Date.now()
      } catch (err) {
        console.error('更新提交记录失败:', err)
      }
    }

    return {
      // State
      currentAccount,
      loading,
      error,
      // Getters
      isLoggedIn,
      handle,
      userInfo,
      rating,
      maxRating,
      rank,
      maxRank,
      todaySolvedCount,
      recentContests,
      // Actions
      setAccount,
      clearAccount,
      refreshAccount,
      updateRecentSubmissions
    }
  },
  {
    persist: {
      key: 'cf-watching-account',
      pick: ['currentAccount'],
      storage: localStorage
    }
  }
)
