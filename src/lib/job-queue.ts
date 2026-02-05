/**
 * Background Job Queue using BullMQ
 * For processing async tasks like emails, notifications, file processing
 */

import "server-only";
import { Queue, Worker, type Job, type ConnectionOptions } from "bullmq";
import { logInfo, logError, logDebug } from "./logger";

// ============================================
// Job Types
// ============================================

export interface EmailJobData {
  type: "email";
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

export interface NotificationJobData {
  type: "notification";
  userId: string;
  title: string;
  body: string;
  link?: string;
}

export interface FileCleanupJobData {
  type: "file-cleanup";
  paths: string[];
}

export interface WebhookJobData {
  type: "webhook";
  url: string;
  payload: Record<string, unknown>;
  retries?: number;
}

export type JobData =
  | EmailJobData
  | NotificationJobData
  | FileCleanupJobData
  | WebhookJobData;

// ============================================
// Queue Configuration
// ============================================

const QUEUE_NAME = "freela-jobs";

function getRedisConnection(): ConnectionOptions | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || "6379", 10),
      password: parsed.password || undefined,
    };
  } catch {
    return null;
  }
}

let queue: Queue<JobData> | null = null;
let worker: Worker<JobData> | null = null;

/**
 * Get or create the job queue
 */
export async function getJobQueue(): Promise<Queue<JobData> | null> {
  if (queue) return queue;

  const connection = getRedisConnection();
  if (!connection) {
    logDebug("Job queue disabled: REDIS_URL not configured");
    return null;
  }

  queue = new Queue<JobData>(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  });

  logInfo("Job queue initialized", { queueName: QUEUE_NAME });
  return queue;
}

// ============================================
// Job Producers
// ============================================

/**
 * Add a job to the queue
 */
export async function addJob(
  data: JobData,
  options?: {
    delay?: number;
    priority?: number;
    jobId?: string;
  }
): Promise<string | null> {
  const q = await getJobQueue();
  if (!q) {
    // Fallback: process synchronously if queue not available
    await processJobImmediately(data);
    return null;
  }

  const job = await q.add(data.type, data, {
    delay: options?.delay,
    priority: options?.priority,
    jobId: options?.jobId,
  });

  logDebug("Job added to queue", { jobId: job.id, type: data.type });
  return job.id ?? null;
}

/**
 * Add an email job
 */
export async function queueEmail(
  to: string,
  subject: string,
  template: string,
  data: Record<string, unknown>
): Promise<string | null> {
  return addJob({
    type: "email",
    to,
    subject,
    template,
    data,
  });
}

/**
 * Add a notification job
 */
export async function queueNotification(
  userId: string,
  title: string,
  body: string,
  link?: string
): Promise<string | null> {
  return addJob({
    type: "notification",
    userId,
    title,
    body,
    link,
  });
}

/**
 * Add a file cleanup job
 */
export async function queueFileCleanup(paths: string[]): Promise<string | null> {
  return addJob(
    { type: "file-cleanup", paths },
    { delay: 60000 } // 1 minute delay
  );
}

/**
 * Add a webhook job
 */
export async function queueWebhook(
  url: string,
  payload: Record<string, unknown>
): Promise<string | null> {
  return addJob({ type: "webhook", url, payload });
}

// ============================================
// Job Processors
// ============================================

async function processEmailJob(data: EmailJobData): Promise<void> {
  // Import dynamically to avoid circular dependencies
  const { sendEmail } = await import("./email");
  // The sendEmail function expects { to, subject, text, html? }
  // We need to generate text from template and data
  const text = `${data.subject}\n\n${JSON.stringify(data.data, null, 2)}`;
  await sendEmail({ to: data.to, subject: data.subject, text });
  logInfo("Email sent", { to: data.to, subject: data.subject });
}

async function processNotificationJob(data: NotificationJobData): Promise<void> {
  // Import dynamically
  const { prisma } = await import("./prisma");
  await prisma.notification.create({
    data: {
      userId: data.userId,
      type: "MESSAGE",
      title: data.title,
      body: data.body,
      href: data.link,
    },
  });
  logInfo("Notification created", { userId: data.userId, title: data.title });
}

async function processFileCleanupJob(data: FileCleanupJobData): Promise<void> {
  const fs = await import("fs/promises");
  for (const path of data.paths) {
    try {
      await fs.unlink(path);
      logDebug("File deleted", { path });
    } catch (err) {
      // File might not exist, that's okay
      logDebug("File cleanup skipped", { path, reason: String(err) });
    }
  }
}

async function processWebhookJob(data: WebhookJobData): Promise<void> {
  const response = await fetch(data.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data.payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed with status ${response.status}`);
  }

  logInfo("Webhook delivered", { url: data.url, status: response.status });
}

/**
 * Process a job immediately (fallback when queue is unavailable)
 */
async function processJobImmediately(data: JobData): Promise<void> {
  switch (data.type) {
    case "email":
      await processEmailJob(data);
      break;
    case "notification":
      await processNotificationJob(data);
      break;
    case "file-cleanup":
      await processFileCleanupJob(data);
      break;
    case "webhook":
      await processWebhookJob(data);
      break;
  }
}

/**
 * Process a job from the queue
 */
async function processJob(job: Job<JobData>): Promise<void> {
  logDebug("Processing job", { jobId: job.id, type: job.data.type });
  await processJobImmediately(job.data);
}

// ============================================
// Worker Management
// ============================================

/**
 * Start the job worker (call this in a separate worker process)
 */
export async function startWorker(): Promise<void> {
  if (worker) return;

  const connection = getRedisConnection();
  if (!connection) {
    logError("Cannot start worker: REDIS_URL not configured");
    return;
  }

  worker = new Worker<JobData>(QUEUE_NAME, processJob, {
    connection,
    concurrency: 5,
  });

  worker.on("completed", (job) => {
    logInfo("Job completed", { jobId: job.id, type: job.data.type });
  });

  worker.on("failed", (job, err) => {
    logError("Job failed", err, {
      jobId: job?.id,
      type: job?.data.type,
      attempts: job?.attemptsMade,
    });
  });

  logInfo("Job worker started", { concurrency: 5 });
}

/**
 * Stop the job worker gracefully
 */
export async function stopWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    logInfo("Job worker stopped");
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const q = await getJobQueue();
  if (!q) return null;

  const [waiting, active, completed, failed] = await Promise.all([
    q.getWaitingCount(),
    q.getActiveCount(),
    q.getCompletedCount(),
    q.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}
