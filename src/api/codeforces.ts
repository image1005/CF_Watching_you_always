import { get } from './request'
import type {
  User,
  BlogEntry,
  Comment,
  RecentAction,
  RatingChange,
  Contest,
  Problem,
  Submission,
  Hack,
  ContestStandings
} from './types'

/**
 * Codeforces API 封装
 * 参考文档: https://codeforces.com/apiHelp
 * 
 * 使用示例:
 * ```ts
 * import { userApi, contestApi } from '@/api/codeforces'
 * 
 * // 获取用户信息
 * const userInfo = await userApi.info(['tourist'])
 * 
 * // 获取用户比赛记录
 * const ratingHistory = await userApi.rating('tourist')
 * ```
 */

// ==================== 用户相关 API ====================

export const userApi = {
  /**
   * 获取用户信息
   * @param handles 用户句柄列表（分号分隔，最多 10000 个）
   * @returns 用户列表
   */
  async info(handles: string[]): Promise<User[]> {
    const handlesStr = handles.join(';')
    return get<User[]>(`/user.info?handles=${encodeURIComponent(handlesStr)}`)
  },

  /**
   * 获取用户最近活动
   * @param maxCount 最大返回数量（默认 100）
   * @returns 最近活动列表
   */
  async recentActions(maxCount: number = 100): Promise<RecentAction[]> {
    return get<RecentAction[]>(`/recentActions?maxCount=${maxCount}`)
  },

  /**
   * 获取用户比赛评级历史
   * @param handle 用户句柄
   * @returns 评级变化列表
   */
  async rating(handle: string): Promise<RatingChange[]> {
    return get<RatingChange[]>(`/user.rating?handle=${encodeURIComponent(handle)}`)
  },

  /**
   * 获取用户所有提交记录
   * @param handle 用户句柄
   * @param from 起始索引（1-based）
   * @param count 返回数量
   * @returns 提交记录列表
   */
  async status(handle: string, from?: number, count?: number): Promise<Submission[]> {
    let url = `/user.status?handle=${encodeURIComponent(handle)}`
    if (from !== undefined) url += `&from=${from}`
    if (count !== undefined) url += `&count=${count}`
    return get<Submission[]>(url)
  },

  /**
   * 获取用户已解决的题目列表
   * @param handle 用户句柄
   * @returns 题目列表
   */
  async solvedProblems(handle: string): Promise<Problem[]> {
    const submissions = await this.status(handle)
    const solved = new Map<string, Problem>()
    
    for (const sub of submissions) {
      if (sub.verdict === 'OK' && sub.problem.contestId) {
        const key = `${sub.problem.contestId}-${sub.problem.index}`
        solved.set(key, sub.problem)
      }
    }
    
    return Array.from(solved.values())
  }
}

// ==================== 比赛相关 API ====================

export const contestApi = {
  /**
   * 获取比赛列表
   * @param gym 是否返回 Gym 比赛（默认 false，返回常规比赛）
   * @returns 比赛列表
   */
  async list(gym: boolean = false): Promise<Contest[]> {
    return get<Contest[]>(`/contest.list?gym=${gym}`)
  },

  /**
   * 获取比赛排名变化
   * @param contestId 比赛 ID
   * @returns 评级变化列表
   */
  async ratingChanges(contestId: number): Promise<RatingChange[]> {
    return get<RatingChange[]>(`/contest.ratingChanges?contestId=${contestId}`)
  },

  /**
   * 获取比赛排名
   * @param contestId 比赛 ID
   * @param options 可选参数
   * @returns 比赛排名信息
   */
  async standings(
    contestId: number,
    options: {
      from?: number
      count?: number
      handles?: string[]
      room?: number
      showUnofficial?: boolean
      participantTypes?: string[]
    } = {}
  ): Promise<ContestStandings> {
    let url = `/contest.standings?contestId=${contestId}`
    
    if (options.from !== undefined) url += `&from=${options.from}`
    if (options.count !== undefined) url += `&count=${options.count}`
    if (options.handles?.length) {
      url += `&handles=${encodeURIComponent(options.handles.join(';'))}`
    }
    if (options.room !== undefined) url += `&room=${options.room}`
    if (options.showUnofficial !== undefined) url += `&showUnofficial=${options.showUnofficial}`
    if (options.participantTypes?.length) {
      url += `&participantTypes=${options.participantTypes.join(',')}`
    }
    
    return get<ContestStandings>(url)
  },

  /**
   * 获取比赛提交记录
   * @param contestId 比赛 ID
   * @param options 可选参数
   * @returns 提交记录列表
   */
  async status(
    contestId: number,
    options: {
      handle?: string
      from?: number
      count?: number
    } = {}
  ): Promise<Submission[]> {
    let url = `/contest.status?contestId=${contestId}`
    
    if (options.handle) url += `&handle=${encodeURIComponent(options.handle)}`
    if (options.from !== undefined) url += `&from=${options.from}`
    if (options.count !== undefined) url += `&count=${options.count}`
    
    return get<Submission[]>(url)
  },

  /**
   * 获取比赛 Hack 记录
   * @param contestId 比赛 ID
   * @returns Hack 记录列表
   */
  async hacks(contestId: number): Promise<Hack[]> {
    return get<Hack[]>(`/contest.hacks?contestId=${contestId}`)
  }
}

// ==================== 题目相关 API ====================

export const problemApi = {
  /**
   * 获取题目集
   * @param options 可选参数
   * @returns 题目列表和比赛列表
   */
  async problems(options: { tags?: string[]; problemsetName?: string } = {}): Promise<{
    problems: Problem[]
    problemStatistics: Array<{
      contestId: number
      index: string
      solvedCount: number
    }>
  }> {
    let url = '/problemset.problems'
    
    if (options.tags?.length) {
      url += `?tags=${encodeURIComponent(options.tags.join(';'))}`
    }
    if (options.problemsetName) {
      url += options.tags?.length ? '&' : '?'
      url += `problemsetName=${encodeURIComponent(options.problemsetName)}`
    }
    
    return get(url)
  },

  /**
   * 获取最近提交的题目列表
   * @param count 返回数量（默认 10）
   * @returns 提交记录列表
   */
  async recentStatus(count: number = 10): Promise<Submission[]> {
    return get<Submission[]>(`/problemset.recentStatus?count=${count}`)
  }
}

// ==================== 博客相关 API ====================

export const blogApi = {
  /**
   * 获取博客条目
   * @param blogEntryId 博客 ID
   * @returns 博客详情
   */
  async view(blogEntryId: number): Promise<BlogEntry> {
    return get<BlogEntry>(`/blogEntry.view?blogEntryId=${blogEntryId}`)
  },

  /**
   * 获取博客评论
   * @param blogEntryId 博客 ID
   * @returns 评论列表
   */
  async comments(blogEntryId: number): Promise<Comment[]> {
    return get<Comment[]>(`/blogEntry.comments?blogEntryId=${blogEntryId}`)
  }
}

// ==================== 便捷函数 ====================

/**
 * 获取单个用户信息
 * @param handle 用户句柄
 * @returns 用户信息
 */
export async function getUserInfo(handle: string): Promise<User | null> {
  try {
    const users = await userApi.info([handle])
    return users[0] || null
  } catch {
    return null
  }
}

/**
 * 获取用户当前评级
 * @param handle 用户句柄
 * @returns 当前评级
 */
export async function getUserRating(handle: string): Promise<number | null> {
  const user = await getUserInfo(handle)
  return user?.rating ?? null
}

/**
 * 获取即将开始的比赛
 * @returns 即将开始的比赛列表
 */
export async function getUpcomingContests(): Promise<Contest[]> {
  const contests = await contestApi.list()
  const now = Math.floor(Date.now() / 1000)
  return contests.filter(c => c.startTimeSeconds && c.startTimeSeconds > now)
}

/**
 * 获取正在进行中的比赛
 * @returns 正在进行中的比赛列表
 */
export async function getActiveContests(): Promise<Contest[]> {
  const contests = await contestApi.list()
  return contests.filter(c => c.phase === 'CODING')
}
