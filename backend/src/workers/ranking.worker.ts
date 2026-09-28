import { Worker, Job } from 'bullmq';
import { bullMQRedisConnection, logQueueErrorOnce } from '../shared/redis';
import { rankingQueue, RankingJobPayload } from '../shared/ranking-queue';
import { rankingService } from '../services/ranking.service';
import { logger } from '../shared/logger';

let rankingWorkerInstance: Worker | null = null;

/**
 * Initializes and starts the BullMQ ranking and daily freeze worker
 */
export async function startRankingWorker(): Promise<Worker> {
  if (rankingWorkerInstance) {
    return rankingWorkerInstance;
  }

  // 1. Register repeatable daily cron job at 23:59:59 UTC
  try {
    // BullMQ repeat option registers a cron-triggered repeatable job
    await rankingQueue.add(
      'DAILY_FREEZE',
      { type: 'DAILY_FREEZE' },
      {
        repeat: {
          pattern: '59 23 * * *',
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      }
    );
    logger.info('Registered repeatable 23:59:59 UTC cron job for DAILY_FREEZE');
  } catch (cronErr: any) {
    logger.warn({ err: cronErr.message }, 'Could not register repeatable cron job on rankingQueue');
  }

  // 2. Instantiate BullMQ Worker
  rankingWorkerInstance = new Worker<RankingJobPayload>(
    'ranking-jobs',
    async (job: Job<RankingJobPayload>) => {
      logger.info({ jobId: job.id, name: job.name, data: job.data }, 'Processing ranking worker job');

      if (job.name === 'DAILY_FREEZE' || job.data.type === 'DAILY_FREEZE') {
        const targetDate = job.data.targetDate ? new Date(job.data.targetDate) : new Date();
        await rankingService.freezeDailyLeaderboard(targetDate);
        return { status: 'FROZEN', date: targetDate.toISOString() };
      }

      if (job.name === 'MANUAL_RECOMPUTE' || job.data.type === 'MANUAL_RECOMPUTE') {
        const targetDate = job.data.targetDate ? new Date(job.data.targetDate) : new Date();
        await rankingService.generateDailyLeaderboard(targetDate, 'LAUNCH_DAY');
        await rankingService.generateDailyLeaderboard(targetDate, 'TRENDING');
        await rankingService.generateDailyLeaderboard(targetDate, 'ALL_TIME');
        return { status: 'RECOMPUTED', date: targetDate.toISOString() };
      }

      logger.warn({ jobName: job.name }, 'Unknown ranking job type, skipping');
      return { status: 'SKIPPED' };
    },
    {
      connection: bullMQRedisConnection,
      concurrency: 1,
    }
  );

  rankingWorkerInstance.on('completed', (job: Job) => {
    logger.info({ jobId: job.id, name: job.name }, 'Ranking worker job completed successfully');
  });

  rankingWorkerInstance.on('failed', (job: Job | undefined, err: Error) => {
    logger.error({ jobId: job?.id, name: job?.name, err: err.message }, 'Ranking worker job failed');
  });

  rankingWorkerInstance.on('error', (err: Error) => {
    logQueueErrorOnce('rankingWorker', err);
  });

  logger.info('Ranking BullMQ Worker initialized and listening');
  return rankingWorkerInstance;
}

/**
 * Gracefully shuts down the ranking worker
 */
export async function stopRankingWorker(): Promise<void> {
  if (rankingWorkerInstance) {
    await rankingWorkerInstance.close();
    rankingWorkerInstance = null;
    logger.info('Ranking BullMQ Worker stopped');
  }
}

export default {
  startRankingWorker,
  stopRankingWorker,
};
