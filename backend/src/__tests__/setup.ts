// Global Jest test setup for LaunchProduct backend tests

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
    setupBullBoard: jest.fn().mockReturnValue((_req: any, _res: any, next: any) => next && next()),
    startAllWorkers: jest.fn(),
    stopAllWorkers: jest.fn().mockResolvedValue(undefined),
  };
});
