'use strict';

const Bull   = require('bull');
const config = require('../config');
const logger = require('../config/logger');

const REDIS_URL = config.redis.url;

const DEFAULT_JOB_OPTIONS = {
  attempts:     3,
  backoff:      { type: 'exponential', delay: 5_000 },
  removeOnComplete: 50, // keep last 50
  removeOnFail:     100,
};

/** Factory — create or retrieve a named queue */
function createQueue(name) {
  const queue = new Bull(name, REDIS_URL, {
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });

  queue.on('failed', (job, err) => {
    logger.error(`Queue [${name}] job failed`, { jobId: job.id, attempt: job.attemptsMade, error: err.message });
  });

  queue.on('completed', (job) => {
    logger.debug(`Queue [${name}] job completed`, { jobId: job.id });
  });

  return queue;
}

// Named queues — each isolated for retry/priority tuning
const queues = {
  seoAudit:         createQueue('seo-audit'),
  keywordSync:      createQueue('keyword-sync'),
  ruleEvaluation:   createQueue('rule-evaluation'),
  analyticsRefresh: createQueue('analytics-refresh'),
  integrationSync:  createQueue('integration-sync'),
  notifications:    createQueue('notifications'),
};

// Register processors
function registerProcessors() {
  queues.seoAudit.process(1,         require('./processors/seoAuditProcessor'));
  queues.keywordSync.process(2,      require('./processors/keywordSyncProcessor'));
  queues.ruleEvaluation.process(5,   require('./processors/ruleEvaluationProcessor'));
  queues.analyticsRefresh.process(2, require('./processors/analyticsRefreshProcessor'));
  logger.info('Queue processors registered');
}

module.exports = { queues, registerProcessors };
