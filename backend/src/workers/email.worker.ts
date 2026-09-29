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
    case 'EMAIL_VERIFICATION':
    case 'send-verification-email': {
      const subject = `Verify your email for ${brandName}`;
      const expiresIn = payload.expiresInMinutes || 15;
      const html = wrapTemplate(
        subject,
        `
        <h2 style="font-size: 22px; font-weight: 700; color: #181513; margin-top: 0; margin-bottom: 12px;">Welcome to ${brandName}!</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #57524E; margin: 0 0 16px 0;">
          Thank you for creating an account. Please verify your email address to access your founder workspace, upvote products, and launch your projects.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <p style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #8C847E; margin-bottom: 8px;">Your 6-Digit Verification Code</p>
          <div style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #ff751f; background: #fff4ed; padding: 14px 28px; border-radius: 12px; border: 2px dashed #ff751f;">
            ${payload.verificationCode}
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px;">
          <a href="${payload.verificationUrl}" style="${buttonStyles}" target="_blank">Verify Email Directly</a>
        </div>
        <p style="font-size: 13px; color: #8C847E; margin: 24px 0 0 0; border-top: 1px solid #EFE8E4; padding-top: 16px;">
          This code expires in <strong>${expiresIn} minutes</strong>. If you did not create a LaunchProduct account, you can safely ignore this email.
        </p>
        `
      );
      return { subject, html };
    }

    case 'PRODUCT_APPROVED': {
      const subject = `🎉 Approved: "${payload.productName}" is ready for launch!`;
      const productUrl = `${frontendUrl}/products/${payload.slug || ''}`;
      const html = wrapTemplate(
        subject,
        `
        <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px;">Congratulations! Your product is approved.</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
          Great news! <strong>${payload.productName}</strong> has been reviewed and approved by the LaunchProduct curation team.
        </p>
        <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #334155;">
            <strong>Scheduled Launch:</strong> ${payload.launchDate ? new Date(payload.launchDate).toLocaleDateString() : 'Immediate'}<br>
            <strong>Status:</strong> Ready for discovery & community upvoting
          </p>
        </div>
        <div style="text-align: center;">
          <a href="${productUrl}" style="${buttonStyles}" target="_blank">View Product Page</a>
        </div>
        <h4 style="font-size: 14px; font-weight: 600; color: #1e293b; margin: 24px 0 8px 0;">🚀 Next Steps for Launch Day:</h4>
        <ul style="font-size: 14px; line-height: 1.6; color: #475569; padding-left: 20px; margin: 0;">
          <li>Embed your live LaunchProduct badge on your landing page.</li>
          <li>Share your launch URL with your community to gather authentic feedback.</li>
          <li>Reply to comments and questions from curious tech enthusiasts.</li>
        </ul>
        `
      );
      return { subject, html };
    }

    case 'PRODUCT_REJECTED': {
      const subject = `Update regarding your submission: "${payload.productName}"`;
      const html = wrapTemplate(
        subject,
        `
        <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px;">Product Submission Update</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
          Thank you for submitting <strong>${payload.productName}</strong> to LaunchProduct. Our team reviewed your listing against our quality and security guidelines.
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
          At this time, we are unable to publish your listing due to the following reason:
        </p>
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px 20px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 500;">
            ${payload.reason || 'Does not meet our current listing criteria.'}
          </p>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin: 20px 0 0 0;">
          You can update your product details in the maker dashboard and request a re-review once the issues above have been resolved.
        </p>
        `
      );
      return { subject, html };
    }

    case 'CAMPAIGN_ACTIVATED':
    case 'send-campaign-activated': {
      const subject = `🚀 Your LaunchProduct ${payload.tier || 'Sponsorship'} Campaign is Live!`;
      const html = wrapTemplate(
        subject,
        `
        <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px;">Your Campaign is Live!</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
          Payment received and confirmed! Your sponsorship tier <strong>${payload.tier}</strong> is now live and featured on LaunchProduct.
        </p>
        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 18px 22px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #1e3a8a;">
            <tr>
              <td style="padding: 4px 0;"><strong>Sponsorship Tier:</strong></td>
              <td style="padding: 4px 0; text-align: right;">${payload.tier}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0;"><strong>Starts At:</strong></td>
              <td style="padding: 4px 0; text-align: right;">${payload.startsAt ? new Date(payload.startsAt).toLocaleString() : 'Now'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0;"><strong>Ends At:</strong></td>
              <td style="padding: 4px 0; text-align: right;">${payload.endsAt ? new Date(payload.endsAt).toLocaleString() : 'Scheduled'}</td>
            </tr>
          </table>
        </div>
        <div style="text-align: center;">
          <a href="${frontendUrl}" style="${buttonStyles}" target="_blank">View Live Placement</a>
        </div>
        <p style="font-size: 13px; color: #64748b; margin-top: 16px;">
          You can track real-time sponsored impressions and outbound clicks directly from your founder analytics dashboard.
        </p>
        `
      );
      return { subject, html };
    }

    case 'OWNERSHIP_VERIFIED': {
      const subject = `✅ Maker Ownership Verified for "${payload.productName}"`;
      const dashboardUrl = `${frontendUrl}/dashboard`;
      const html = wrapTemplate(
        subject,
        `
        <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px;">Ownership Verified!</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
          Your maker ownership claim for <strong>${payload.productName}</strong> has been successfully verified!
        </p>
        <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 18px 22px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #065f46;">
            <strong>Verified Privileges:</strong><br>
            • Official Verified Maker badge next to your product<br>
            • Access to edit tagline, screenshots, description, and links<br>
            • Real-time analytics and launch campaign booking access
          </p>
        </div>
        <div style="text-align: center;">
          <a href="${dashboardUrl}" style="${buttonStyles}" target="_blank">Open Maker Dashboard</a>
        </div>
        `
      );
      return { subject, html };
    }

    case 'SECURITY_ALERT': {
      const subject = `🚨 Security Alert: New Maker Claim Dispute for "${payload.productName}"`;
      const html = wrapTemplate(
        subject,
        `
        <h2 style="font-size: 22px; font-weight: 700; color: #991b1b; margin-top: 0; margin-bottom: 12px;">Maker Claim Dispute Alert</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
          A new maker claim has been submitted for <strong>${payload.productName}</strong>, a product you currently hold verified ownership for.
        </p>
        <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 16px 20px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #9a3412;">
            <strong>Claimant:</strong> ${payload.claimantEmail || 'Anonymous submission'}
          </p>
          <p style="margin: 0; font-size: 14px; color: #9a3412;">
            <strong>Dispute Reason:</strong> ${payload.disputeReason || 'Ownership challenge'}
          </p>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 20px 0 0 0;">
          Your current ownership has NOT been removed. Our moderation team reviews all claim evidence before taking any administrative action.
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 12px 0 0 0;">
          If you believe this claim is fraudulent or need to provide counter-evidence, please reply directly to this email or contact support at <a href="mailto:support@launchproduct.io" style="color: #4f46e5;">support@launchproduct.io</a>.
        </p>
        `
      );
      return { subject, html };
    }

    default: {
      // General notification fallback
      const subject = payload.subject || `${brandName} Notification`;
      const html = payload.html
        ? wrapTemplate(subject, payload.html)
        : wrapTemplate(subject, `<p style="font-size: 15px; line-height: 1.6; color: #475569;">You have a new notification from ${brandName}.</p>`);
      return { subject, html };
    }
  }
}

/**
 * Transports an email via Resend API or logs mock in local/test environment
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ id: string; provider: string }> {
  const from = config.EMAIL_FROM || 'LaunchProduct <noreply@launchproduct.io>';

  // 1. Resend API delivery (if configured)
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

  // 2. Safe Local / Development / Test Mock Transporter
  logger.info(
    { to, subject, provider: 'mock' },
    '[MOCK EMAIL WORKER] Email delivery simulated (no live RESEND_API_KEY configured)'
  );
  return { id: `mock-${Date.now()}`, provider: 'mock' };
}

/**
 * Initializes and starts the BullMQ email worker
 */
export async function startEmailWorker(): Promise<Worker<EmailJobPayload>> {
  if (emailWorkerInstance) {
    return emailWorkerInstance;
  }

  emailWorkerInstance = new Worker<EmailJobPayload>(
    'email-jobs',
    async (job: Job<EmailJobPayload>) => {
      const jobType = job.data.type || job.name;
      logger.info({ jobId: job.id, jobType, to: job.data.to }, 'Processing email worker job');

      if (!job.data.to) {
        logger.warn({ jobId: job.id }, 'Email job skipped: no recipient specified');
        return { status: 'SKIPPED', reason: 'NO_RECIPIENT' };
      }

      // Render branded email HTML template
      const { subject, html } = renderEmailTemplate(jobType, job.data);

      // Deliver message
      const result = await sendEmail(job.data.to, subject, html);

      return {
        status: 'DELIVERED',
        provider: result.provider,
        id: result.id,
        to: job.data.to,
        type: jobType,
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
    logger.error(
      { jobId: job?.id, name: job?.name, attemptsMade: job?.attemptsMade, err: err.message },
      'Email worker job failed'
    );
  });

  emailWorkerInstance.on('error', (err: Error) => {
    logQueueErrorOnce('emailWorker', err);
  });

  logger.info('Email BullMQ Worker initialized and listening on "email-jobs"');
  return emailWorkerInstance;
}

/**
 * Gracefully shuts down the email worker
 */
export async function stopEmailWorker(): Promise<void> {
  if (emailWorkerInstance) {
    await emailWorkerInstance.close();
    emailWorkerInstance = null;
    logger.info('Email BullMQ Worker stopped');
  }
}

export default {
  startEmailWorker,
  stopEmailWorker,
  renderEmailTemplate,
  sendEmail,
};
