// Codeforces API 类型定义
// 参考: https://codeforces.com/apiHelp/objects

// API 响应基础结构
export interface CFApiResponse<T> {
  status: 'OK' | 'FAILED'
  comment?: string
  result?: T
}

// 用户对象
export interface User {
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

// 博客条目
export interface BlogEntry {
  id: number
  originalLocale: string
  creationTimeSeconds: number
  authorHandle: string
  title: string
  content?: string
  locale: string
  modificationTimeSeconds: number
  allowViewHistory: boolean
  tags: string[]
  rating: number
}

// 评论
export interface Comment {
  id: number
  creationTimeSeconds: number
  commentatorHandle: string
  locale: string
  text: string
  parentCommentId?: number
  rating: number
}

// 最近活动
export interface RecentAction {
  timeSeconds: number
  blogEntry?: BlogEntry
  comment?: Comment
}

// 评级变化
export interface RatingChange {
  contestId: number
  contestName: string
  handle: string
  rank: number
  ratingUpdateTimeSeconds: number
  oldRating: number
  newRating: number
}

// 比赛
export interface Contest {
  id: number
  name: string
  type: 'CF' | 'IOI' | 'ICPC'
  phase: 'BEFORE' | 'CODING' | 'PENDING_SYSTEM_TEST' | 'SYSTEM_TEST' | 'FINISHED'
  frozen: boolean
  durationSeconds: number
  freezeDurationSeconds?: number
  startTimeSeconds?: number
  relativeTimeSeconds?: number
  preparedBy?: string
  websiteUrl?: string
  description?: string
}

// 题目
export interface Problem {
  contestId?: number
  problemsetName?: string
  index: string
  name: string
  type: 'PROGRAMMING' | 'QUESTION'
  points?: number
  rating?: number
  tags: string[]
}

// 比赛中的题目（包含分数）
export interface ProblemResult {
  contestId?: number
  problemsetName?: string
  index: string
  name: string
  type: 'PROGRAMMING' | 'QUESTION'
  points?: number
  rating?: number
  tags: string[]
}

// 提交记录
export interface Submission {
  id: number
  contestId?: number
  creationTimeSeconds: number
  relativeTimeSeconds: number
  problem: Problem
  author: Party
  programmingLanguage: string
  verdict?: Verdict
  testset: TestSet
  passedTestCount: number
  timeConsumedMillis: number
  memoryConsumedBytes: number
  points?: number
}

// 参赛方
export interface Party {
  contestId?: number
  members: Member[]
  participantType: ParticipantType
  teamId?: number
  teamName?: string
  ghost: boolean
  room?: number
  startTimeSeconds?: number
}

// 成员
export interface Member {
  handle: string
  name?: string
}

// 参赛类型
export type ParticipantType =
  | 'CONTESTANT'
  | 'PRACTICE'
  | 'VIRTUAL'
  | 'MANAGER'
  | 'OUT_OF_COMPETITION'

// 评测结果
export type Verdict =
  | 'FAILED'
  | 'OK'
  | 'PARTIAL'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'WRONG_ANSWER'
  | 'PRESENTATION_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'IDLENESS_LIMIT_EXCEEDED'
  | 'SECURITY_VIOLATED'
  | 'CRASHED'
  | 'INPUT_PREPARATION_CRASHED'
  | 'CHALLENGED'
  | 'SKIPPED'
  | 'TESTING'
  | 'REJECTED'

// 测试集
export type TestSet =
  | 'SAMPLES'
  | 'PRETESTS'
  | 'TESTS'
  | 'CHALLENGES'
  | 'TESTS1'
  | 'TESTS2'
  | 'TESTS3'
  | 'TESTS4'
  | 'TESTS5'
  | 'TESTS6'
  | 'TESTS7'
  | 'TESTS8'
  | 'TESTS9'
  | 'TESTS10'

// 排名行
export interface RanklistRow {
  party: Party
  rank: number
  points: number
  penalty: number
  successfulHackCount: number
  unsuccessfulHackCount: number
  problemResults: ProblemResult[]
  lastSubmissionTimeSeconds?: number
}

// Hack 记录
export interface Hack {
  id: number
  creationTimeSeconds: number
  hacker: Party
  defender: Party
  verdict?: HackVerdict
  problem: Problem
  test?: string
  judgeProtocol?: JudgeProtocol
}

// Hack 结果
export type HackVerdict =
  | 'HACK_SUCCESSFUL'
  | 'HACK_UNSUCCESSFUL'
  | 'HACK_INVALID'
  | 'HACK_IGNORED'
  | 'HACK_UNKNOWN'

// 评测协议
export interface JudgeProtocol {
  manual: string
  protocol: string
  verdict: string
}

// 比赛排名结果
export interface ContestStandings {
  contest: Contest
  problems: Problem[]
  rows: RanklistRow[]
}
