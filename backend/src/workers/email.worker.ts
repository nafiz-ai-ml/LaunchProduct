import { Worker, Job } from 'bullmq';
import axios from 'axios';
import { bullMQRedisConnection, logQueueErrorOnce } from '../shared/redis';
import { EmailJobPayload, EmailJobType } from '../shared/email-queue';
import { config } from '../shared/config';
import { logger } from '../shared/logger';

let emailWorkerInstance: Worker<EmailJobPayload> | null = null;

/**
 * Generates responsive, branded HTML emails for LaunchProduct
 */
export function renderEmailTemplate(
  type: EmailJobType | string,
  payload: EmailJobPayload
): { subject: string; html: string } {
  const brandName = 'LaunchProduct';
  const frontendUrl = config.FRONTEND_URL || 'http://localhost:3000';

  const baseStyles = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
    background-color: #f8fafc;
    margin: 0;
    padding: 0;
    -webkit-font-smoothing: antialiased;
  `;

  const containerStyles = `
    max-width: 580px;
    margin: 40px auto;
    background: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
    border: 1px solid #e2e8f0;
  `;

  const headerStyles = `
    background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
    padding: 32px 36px;
    text-align: left;
  `;

  const bodyStyles = `
    padding: 36px;
  `;

  const footerStyles = `
    padding: 24px 36px;
    background-color: #f8fafc;
    border-top: 1px solid #e2e8f0;
    font-size: 12px;
    color: #64748b;
    line-height: 1.5;
  `;

  const buttonStyles = `
    display: inline-block;
    background: #ff751f;
    color: #ffffff !important;
    font-weight: 600;
    font-size: 15px;
    padding: 12px 28px;
    border-radius: 8px;
    text-decoration: none;
    margin: 16px 0;
    box-shadow: 0 2px 4px rgba(255, 117, 31, 0.3);
  `;

  const wrapTemplate = (title: string, contentHtml: string): string => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="${baseStyles}">
      <div style="${containerStyles}">
        <div style="${headerStyles}">
          <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.025em; display: flex; align-items: center;">
            <span style="display: inline-block; width: 10px; height: 10px; background: #ff751f; border-radius: 50%; margin-right: 10px;"></span>
            ${brandName}
          </div>
        </div>
        <div style="${bodyStyles}">
          ${contentHtml}
        </div>
        <div style="${footerStyles}">
          <p style="margin: 0 0 8px 0;">This email was sent to ${payload.to} by <strong>${brandName}</strong>.</p>
          <p style="margin: 0;">© ${new Date().getFullYear()} LaunchProduct, Inc. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  switch (type) {
    case 'RANKING_PAYMENT_CONFIRMED': {
      const subject = `🚀 Ranking Payment Confirmed for "${payload.productName || 'Your Product'}"`;
      const productUrl = `${frontendUrl}/products/${payload.slug || ''}`;
      const amountStr = payload.amountCents ? `$${(payload.amountCents / 100).toFixed(2)}` : 'Confirmed';
      const html = wrapTemplate(
        subject,
        `
        <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px;">Ranking Payment Confirmed!</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
          Payment confirmed! Your ranking contribution of <strong>${amountStr}</strong> for <strong>${payload.productName || 'your product'}</strong> has been applied to the live LaunchProduct leaderboard.
        </p>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px 22px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #166534;">
            <tr>
              <td style="padding: 4px 0;"><strong>Product:</strong></td>
              <td style="padding: 4px 0; text-align: right;">${payload.productName || ''}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0;"><strong>Amount Paid:</strong></td>
              <td style="padding: 4px 0; text-align: right;">${amountStr}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0;"><strong>Contribution Type:</strong></td>
              <td style="padding: 4px 0; text-align: right;">${payload.contributionType || 'RANKING'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0;"><strong>Target Leaderboard Date:</strong></td>
              <td style="padding: 4px 0; text-align: right;">${payload.targetDailyDate || 'Live'}</td>
            </tr>
          </table>
        </div>
        <div style="text-align: center;">
          <a href="${productUrl}" style="${buttonStyles}" target="_blank">View Live Placement</a>
        </div>
        <p style="font-size: 13px; color: #64748b; margin-top: 16px;">
          Rankings are updated instantly based on verified qualifying payment volume. Thank you for using LaunchProduct.
        </p>
        `
      );
      return { subject, html };
    }

    default: {
      const subject = payload.subject || `${brandName} Notification`;
      const html = payload.html
        ? wrapTemplate(subject, payload.html)
        : wrapTemplate(subject, `<p style="font-size: 15px; line-height: 1.6; color: #475569;">You have a new notification from ${brandName}.</p>`);
      return { subject, html };
    }
  }
}

/**
 * Transports an email via Resend API or logs in local/test environment
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ id: string; provider: string }> {
  const from = config.EMAIL_FROM || 'LaunchProduct <noreply@launchproduct.io>';

  if (config.RESEND_API_KEY && config.RESEND_API_KEY.startsWith('re_')) {
    try {
      const response = await axios.post(
        'https://api.resend.com/emails',
        {
          from,
          to: [to],
          subject,
          html,
        },
        {
          headers: {
            Authorization: `Bearer ${config.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      logger.info({ emailId: response.data?.id, to, subject }, 'Email sent successfully via Resend API');
      return { id: response.data?.id || `resend-${Date.now()}`, provider: 'resend' };
    } catch (err: any) {
      const resendErr = err.response?.data || err.message;
      logger.error({ err: resendErr, to, subject }, 'Resend API delivery failed');
      throw new Error(`Resend delivery failed: ${JSON.stringify(resendErr)}`);
    }
  }

  // Local / test mock logger
  const mockId = `mock-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  logger.info(
    { to, subject, emailId: mockId },
    '[MOCK EMAIL SENDER] Notification logged (RESEND_API_KEY not configured)'
  );
  return { id: mockId, provider: 'mock' };
}

/**
 * Initializes and starts the BullMQ Email Worker
 */
export async function startEmailWorker(): Promise<Worker<EmailJobPayload>> {
  if (emailWorkerInstance) {
    return emailWorkerInstance;
  }

  emailWorkerInstance = new Worker<EmailJobPayload>(
    'email-jobs',
    async (job: Job<EmailJobPayload>) => {
      logger.info({ jobId: job.id, type: job.name, to: job.data.to }, 'Processing transactional email job');

      const template = renderEmailTemplate(job.name, job.data);
      const delivery = await sendEmail(job.data.to, template.subject, template.html);

      return {
        delivered: true,
        emailId: delivery.id,
        provider: delivery.provider,
        timestamp: new Date().toISOString(),
      };
    },
    {
      connection: bullMQRedisConnection,
      concurrency: 5,
    }
  );

  emailWorkerInstance.on('completed', (job: Job) => {
    logger.info({ jobId: job.id, name: job.name }, 'Email worker job completed successfully');
  });

  emailWorkerInstance.on('failed', (job: Job | undefined, err: Error) => {
    logger.error({ jobId: job?.id, name: job?.name, err: err.message }, 'Email worker job failed');
  });

  emailWorkerInstance.on('error', (err) => {
    logQueueErrorOnce('emailWorker', err);
  });

  return emailWorkerInstance;
}

/**
 * Gracefully shuts down the Email Worker
 */
export async function stopEmailWorker(): Promise<void> {
  if (emailWorkerInstance) {
    await emailWorkerInstance.close();
    emailWorkerInstance = null;
    logger.info('Email BullMQ Worker stopped');
  }
}
