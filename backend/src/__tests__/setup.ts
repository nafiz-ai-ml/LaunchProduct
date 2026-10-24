// Global Jest test setup for LaunchProduct backend tests

if (!process.env.PADDLE_WEBHOOK_SECRET) {
  process.env.PADDLE_WEBHOOK_SECRET = 'test-paddle-webhook-key-32-chars-long-valid';
}

// Mock bullmq Queue and Worker to prevent Redis background connections during unit/integration tests
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'mock_job_id' }),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  })),
}));

// Mock @bull-board/express setupBullBoard
jest.mock('../workers', () => {
  const original = jest.requireActual('../workers');
  return {
    ...original,
    setupBullBoard: jest.fn().mockImplementation(() => {
      const express = require('express');
      const router = express.Router();
      router.use((_req: any, res: any) => res.status(200).send('bull board ui'));
      return router;
    }),
    startAllWorkers: jest.fn(),
    stopAllWorkers: jest.fn().mockResolvedValue(undefined),
  };
});
