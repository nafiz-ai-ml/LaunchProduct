import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { AppError, ValidationError, AuthenticationError } from '../shared/errors';

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

export class WebhookController {
  /**
   * POST /api/v1/webhooks/payment/:provider
   * Ingest and cryptographically verify Merchant of Record webhook notifications.
   */
  async handlePaymentWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const provider = getParam(req.params.provider || 'paddle').toLowerCase().trim();

      // Extract raw body buffer
      let rawBody: Buffer;
      if (Buffer.isBuffer(req.body)) {
        rawBody = req.body;
      } else if (Buffer.isBuffer((req as any).rawBody)) {
        rawBody = (req as any).rawBody;
      } else if (typeof req.body === 'string') {
        rawBody = Buffer.from(req.body, 'utf8');
      } else if (req.body && typeof req.body === 'object') {
        rawBody = Buffer.from(JSON.stringify(req.body), 'utf8');
      } else {
        throw new ValidationError('Webhook body is empty or unreadable', [
          { field: 'body', code: 'REQUIRED', message: 'Webhook body buffer required' },
        ]);
      }

      // Extract signature header based on provider conventions
      let signatureHeader: string | undefined = undefined;
      if (provider === 'paddle') {
        signatureHeader =
          (req.headers['paddle-signature'] as string) ||
          (req.headers['x-paddle-signature'] as string) ||
          (req.headers['x-signature'] as string);
      } else if (provider === 'lemonsqueezy' || provider === 'lemon_squeezy') {
        signatureHeader =
          (req.headers['x-signature'] as string) ||
          (req.headers['x-lemon-squeezy-signature'] as string);
      } else {
        signatureHeader =
          (req.headers['x-signature'] as string) ||
          (req.headers['paddle-signature'] as string);
      }

      if (!signatureHeader) {
        throw new AppError(
          400,
          'WEBHOOK_SIGNATURE_INVALID',
          `Missing or invalid cryptographic webhook signature header for provider '${provider}'`
        );
      }

      const result = await paymentService.handlePaymentWebhook(provider, rawBody, signatureHeader);

      // Return instant HTTP 200 OK
      res.status(200).json({
        success: true,
        data: {
          message: result.message || 'Webhook processed and campaign activated.',
          campaignId: result.campaignId,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const webhookController = new WebhookController();
export default webhookController;
