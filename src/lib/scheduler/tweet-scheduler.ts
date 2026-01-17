// Tweet Scheduler Service
// Manages scheduled tweets and their execution

import prisma from '@/lib/prisma'
import { createXAutomation } from '@/lib/browser'
import { humanBehavior } from '@/lib/services/human-behavior'

export interface ScheduledTweetData {
  id: string
  accountId: string
  content: string
  scheduledFor: Date | null
  threadId?: string
  threadPosition?: number
  metadata?: Record<string, unknown>
}

export interface ScheduleResult {
  success: boolean
  tweetId?: string
  error?: string
}

class TweetScheduler {
  private isRunning: boolean = false
  private checkInterval: NodeJS.Timeout | null = null
  private readonly CHECK_INTERVAL_MS = 60000 // Check every minute

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.log('Scheduler is already running')
      return
    }

    this.isRunning = true
    console.log('Tweet scheduler started')

    // Initial check
    this.processScheduledTweets()

    // Set up interval for regular checks
    this.checkInterval = setInterval(() => {
      this.processScheduledTweets()
    }, this.CHECK_INTERVAL_MS)
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false

    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }

    console.log('Tweet scheduler stopped')
  }

  /**
   * Schedule a new tweet
   */
  async scheduleTweet(
    accountId: string,
    content: string,
    scheduledFor: Date,
    options?: {
      threadId?: string
      threadPosition?: number
      metadata?: Record<string, unknown>
    }
  ): Promise<ScheduleResult> {
    try {
      // Validate scheduled time is in the future
      if (scheduledFor <= new Date()) {
        return { success: false, error: 'Scheduled time must be in the future' }
      }

      // Validate content length
      if (content.length > 280) {
        return { success: false, error: 'Tweet content exceeds 280 characters' }
      }

      // Create scheduled tweet
      const tweet = await prisma.scheduledTweet.create({
        data: {
          accountId,
          content,
          scheduledFor,
          status: 'pending',
          threadId: options?.threadId,
          threadPosition: options?.threadPosition,
          metadata: options?.metadata ? JSON.stringify(options.metadata) : null,
        },
      })

      console.log(`Scheduled tweet ${tweet.id} for ${scheduledFor.toISOString()}`)

      return { success: true, tweetId: tweet.id }
    } catch (error) {
      console.error('Error scheduling tweet:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Schedule a thread of tweets
   */
  async scheduleThread(
    accountId: string,
    tweets: string[],
    scheduledFor: Date,
    intervalMinutes: number = 1
  ): Promise<ScheduleResult> {
    try {
      if (tweets.length < 2) {
        return { success: false, error: 'Thread must have at least 2 tweets' }
      }

      if (tweets.length > 25) {
        return { success: false, error: 'Thread cannot exceed 25 tweets' }
      }

      // Validate all tweets
      for (const tweet of tweets) {
        if (tweet.length > 280) {
          return { success: false, error: 'One or more tweets exceed 280 characters' }
        }
      }

      // Generate thread ID
      const threadId = `thread_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

      // Schedule each tweet in the thread
      const scheduledTweets = []
      for (let i = 0; i < tweets.length; i++) {
        const tweetTime = new Date(scheduledFor.getTime() + i * intervalMinutes * 60000)

        const result = await this.scheduleTweet(accountId, tweets[i], tweetTime, {
          threadId,
          threadPosition: i + 1,
          metadata: {
            isThread: true,
            totalTweets: tweets.length,
          },
        })

        if (!result.success) {
          // Rollback: cancel all scheduled tweets in this thread
          await prisma.scheduledTweet.updateMany({
            where: { threadId },
            data: { status: 'cancelled' },
          })
          return result
        }

        scheduledTweets.push(result.tweetId)
      }

      return { success: true, tweetId: threadId }
    } catch (error) {
      console.error('Error scheduling thread:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Cancel a scheduled tweet
   */
  async cancelTweet(tweetId: string): Promise<ScheduleResult> {
    try {
      const tweet = await prisma.scheduledTweet.findUnique({
        where: { id: tweetId },
      })

      if (!tweet) {
        return { success: false, error: 'Tweet not found' }
      }

      if (tweet.status !== 'pending') {
        return { success: false, error: 'Only pending tweets can be cancelled' }
      }

      await prisma.scheduledTweet.update({
        where: { id: tweetId },
        data: { status: 'cancelled' },
      })

      return { success: true }
    } catch (error) {
      console.error('Error cancelling tweet:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Cancel an entire thread
   */
  async cancelThread(threadId: string): Promise<ScheduleResult> {
    try {
      const result = await prisma.scheduledTweet.updateMany({
        where: {
          threadId,
          status: 'pending',
        },
        data: { status: 'cancelled' },
      })

      if (result.count === 0) {
        return { success: false, error: 'No pending tweets found in thread' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error cancelling thread:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Reschedule a tweet
   */
  async rescheduleTweet(tweetId: string, newScheduledFor: Date): Promise<ScheduleResult> {
    try {
      if (newScheduledFor <= new Date()) {
        return { success: false, error: 'New scheduled time must be in the future' }
      }

      const tweet = await prisma.scheduledTweet.findUnique({
        where: { id: tweetId },
      })

      if (!tweet) {
        return { success: false, error: 'Tweet not found' }
      }

      if (tweet.status !== 'pending') {
        return { success: false, error: 'Only pending tweets can be rescheduled' }
      }

      await prisma.scheduledTweet.update({
        where: { id: tweetId },
        data: { scheduledFor: newScheduledFor },
      })

      return { success: true }
    } catch (error) {
      console.error('Error rescheduling tweet:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Process scheduled tweets that are due
   */
  async processScheduledTweets(): Promise<void> {
    if (!this.isRunning) return

    try {
      const now = new Date()

      // Find all pending tweets that are due
      const dueTweets = await prisma.scheduledTweet.findMany({
        where: {
          status: 'pending',
          scheduledFor: {
            lte: now,
          },
        },
        orderBy: [
          { threadId: 'asc' },
          { threadPosition: 'asc' },
          { scheduledFor: 'asc' },
        ],
        include: {
          account: true,
        },
      })

      if (dueTweets.length === 0) return

      console.log(`Processing ${dueTweets.length} scheduled tweets`)

      for (const tweet of dueTweets) {
        await this.postScheduledTweet(tweet)
      }
    } catch (error) {
      console.error('Error processing scheduled tweets:', error)
    }
  }

  /**
   * Post a single scheduled tweet
   */
  private async postScheduledTweet(tweet: {
    id: string
    accountId: string
    content: string
    threadId: string | null
    threadPosition: number | null
    account: { username: string }
  }): Promise<void> {
    try {
      // Mark as processing
      await prisma.scheduledTweet.update({
        where: { id: tweet.id },
        data: { status: 'processing' },
      })

      // Check rate limits
      const rateCheck = humanBehavior.checkRateLimit('tweet')
      if (!rateCheck.allowed) {
        console.log(`Rate limit hit, delaying tweet ${tweet.id}. Wait time: ${rateCheck.waitTime}ms`)

        // Reschedule for later
        const newTime = new Date(Date.now() + (rateCheck.waitTime || 60000))
        await prisma.scheduledTweet.update({
          where: { id: tweet.id },
          data: {
            status: 'pending',
            scheduledFor: newTime,
          },
        })
        return
      }

      // Post the tweet
      const xAutomation = createXAutomation(tweet.accountId)

      // If this is part of a thread and not the first tweet, we need to reply to the previous tweet
      let result
      if (tweet.threadId && tweet.threadPosition && tweet.threadPosition > 1) {
        // Find the previous tweet in the thread
        const previousTweet = await prisma.scheduledTweet.findFirst({
          where: {
            threadId: tweet.threadId,
            threadPosition: tweet.threadPosition - 1,
            status: 'posted',
          },
        })

        if (previousTweet?.tweetId) {
          const tweetUrl = `https://x.com/${tweet.account.username}/status/${previousTweet.tweetId}`
          result = await xAutomation.postReply(tweetUrl, tweet.content)
        } else {
          // Previous tweet not posted yet, reschedule
          await prisma.scheduledTweet.update({
            where: { id: tweet.id },
            data: {
              status: 'pending',
              scheduledFor: new Date(Date.now() + 60000),
            },
          })
          return
        }
      } else {
        result = await xAutomation.postTweet(tweet.content)
      }

      if (result.success) {
        await prisma.scheduledTweet.update({
          where: { id: tweet.id },
          data: {
            status: 'posted',
            postedAt: new Date(),
            tweetId: result.tweetId,
            metadata: JSON.stringify({
              tweetUrl: result.tweetUrl,
              postedAt: new Date().toISOString(),
            }),
          },
        })

        // Record action for rate limiting
        humanBehavior.recordAction('tweet')

        console.log(`Posted scheduled tweet ${tweet.id}`)
      } else {
        await prisma.scheduledTweet.update({
          where: { id: tweet.id },
          data: {
            status: 'failed',
            error: result.error,
          },
        })

        console.error(`Failed to post tweet ${tweet.id}: ${result.error}`)
      }
    } catch (error) {
      console.error(`Error posting scheduled tweet ${tweet.id}:`, error)

      await prisma.scheduledTweet.update({
        where: { id: tweet.id },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })
    }
  }

  /**
   * Get upcoming scheduled tweets
   */
  async getUpcoming(accountId?: string, limit: number = 10): Promise<ScheduledTweetData[]> {
    const tweets = await prisma.scheduledTweet.findMany({
      where: {
        status: 'pending',
        ...(accountId ? { accountId } : {}),
      },
      orderBy: { scheduledFor: 'asc' },
      take: limit,
    })

    return tweets.map((tweet) => ({
      id: tweet.id,
      accountId: tweet.accountId,
      content: tweet.content,
      scheduledFor: tweet.scheduledFor,
      threadId: tweet.threadId || undefined,
      threadPosition: tweet.threadPosition || undefined,
      metadata: tweet.metadata ? JSON.parse(tweet.metadata) : undefined,
    }))
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; checkIntervalMs: number } {
    return {
      isRunning: this.isRunning,
      checkIntervalMs: this.CHECK_INTERVAL_MS,
    }
  }
}

// Singleton instance
export const tweetScheduler = new TweetScheduler()
