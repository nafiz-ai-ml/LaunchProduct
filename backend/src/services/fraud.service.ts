import crypto from 'crypto';
import dns from 'dns';
import { logger } from '../shared/logger';

export function hashTelemetry(data: string, secret?: string): string {
  const hmacKey = secret || 'telemetry_secret_key_launchproduct_internal_seed';
  return crypto.createHmac('sha256', hmacKey).update(data).digest('hex');
}

// Disposable/temporary email provider domain list
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  '10minutemail.com',
  '10minutemail.net',
  'burnermail.io',
  'crazymailing.com',
  'dispostable.com',
  'emailondeck.com',
  'fakeinbox.com',
  'fakemailgenerator.com',
  'generator.email',
  'getairmail.com',
  'getnada.com',
  'guerrillamail.biz',
  'guerrillamail.com',
  'guerrillamail.de',
  'guerrillamail.net',
  'guerrillamail.org',
  'inboxkitten.com',
  'maildrop.cc',
  'mailinator.com',
  'mailnesia.com',
  'mohmal.com',
  'mytemp.email',
  'nada.ltd',
  'sharklasers.com',
  'temp-mail.org',
  'tempail.com',
  'tempmail.com',
  'tempmail.net',
  'throwawaymail.com',
  'trashmail.com',
  'trashmail.net',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
]);

// Hosting, cloud provider, and datacenter Autonomous System Numbers (ASNs)
export const KNOWN_DATACENTER_ASNS = new Set<number>([
  16509, // Amazon AWS
  14618, // Amazon AWS
  15169, // Google Cloud Platform
  396982, // Google Cloud
  8075, // Microsoft Azure
  14061, // DigitalOcean
  24940, // Hetzner Online
  16276, // OVH SAS
  63949, // Linode / Akamai
  20473, // Vultr / Choopa
  13335, // Cloudflare
  31898, // Oracle Cloud
  9009, // M247 / VPN
  60068, // Datacamp / CDN77
  51167, // Contabo
  46606, // Unified Layer
  26347, // DreamHost
  36351, // SoftLayer / IBM Cloud
]);

const DATACENTER_HOST_PATTERNS = [
  /compute\.amazonaws\.com$/i,
  /googleusercontent\.com$/i,
  /azure\.com$/i,
  /cloudapp\.net$/i,
  /linode\.com$/i,
  /vultr\.com$/i,
  /digitalocean\.com$/i,
  /ovh\.(net|com)$/i,
  /hetzner\.(de|com)$/i,
  /server-hosting\.com$/i,
  /leaseweb\.com$/i,
  /datapacket\.com$/i,
];

export class AntiFraudService {
  async checkDatacenterIp(ip: string): Promise<{ isDatacenter: boolean; asn?: number }> {
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return { isDatacenter: false };
    }
    try {
      const hostnames = await dns.promises.reverse(ip).catch(() => [] as string[]);
      for (const host of hostnames) {
        for (const pattern of DATACENTER_HOST_PATTERNS) {
          if (pattern.test(host)) {
            return { isDatacenter: true };
          }
        }
      }
    } catch {
      // Ignore DNS errors
    }
    return { isDatacenter: false };
  }
}

export const antiFraudService = new AntiFraudService();
