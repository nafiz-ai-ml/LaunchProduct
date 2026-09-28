import crypto from 'crypto';
import mongoose, { Types } from 'mongoose';
import dns from 'dns';
import { User } from '../models/User.model';
import { Vote } from '../models/Vote.model';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { SystemSettings } from '../models/SystemSettings.model';
import {
  VoteStatus,
  THRESHOLD_LOW,
  THRESHOLD_HIGH,
  ANTI_FRAUD_WEIGHTS,
  AntiFraudSignalWeights,
} from '../shared/constants';
import { redis, isRedisConnected } from '../shared/redis';
import { logger } from '../shared/logger';
import { getSubnet24 } from '../middleware/rate-limit.middleware';

export interface VoteRiskInput {
  userId: string;
  productId: string;
  ip: string;
  userAgent?: string;
  deviceFingerprint?: string;
  subnetHash?: string;
}

export interface FraudEvaluationResult {
  status: VoteStatus;
  riskScore: number;
  triggeredSignals: string[];
  ipHash: string;
  subnetHash: string;
  accountAgeHours?: number;
  asnNumber?: number;
}

// Comprehensive disposable/temporary email provider domain list
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

// Well-known hosting, cloud provider, and datacenter Autonomous System Numbers (ASNs)
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

// Datacenter hostname patterns matching reverse DNS
const DATACENTER_HOST_PATTERNS = [
  /amazonaws\.com$/i,
  /googleusercontent\.com$/i,
  /azure\.com$/i,
  /digitalocean\.com$/i,
  /hetzner\.(com|de)$/i,
  /ovh\.(net|com)$/i,
  /linode\.com$/i,
  /vultr\.com$/i,
  /tor-exit/i,
  /exit-node/i,
  /vpn/i,
  /proxy/i,
  /datacenter/i,
  /hosting/i,
  /cloud/i,
];

/**
 * Creates HMAC-SHA256 privacy hash for an IP or subnet string
 */
export function hashTelemetry(value: string, secret?: string): string {
  const hmacKey = secret || process.env.JWT_SECRET || 'launchproduct-fraud-salt-key';
  return crypto.createHmac('sha256', hmacKey).update(value.trim().toLowerCase()).digest('hex');
}

export class AntiFraudService {
  private redisKey = 'sys:settings:anti_fraud_weights';
  private maxmindReader: any = null;
  private maxmindInitialized = false;

  /**
   * Initializes MaxMind GeoLite2-ASN reader if module and database exist
   */
  private async getOptionalMaxmindReader(): Promise<any> {
    if (this.maxmindInitialized) {
      return this.maxmindReader;
    }
    this.maxmindInitialized = true;

    const dbPath = process.env.MAXMIND_ASN_DB_PATH;
    if (!dbPath) {
      return null;
    }

    try {
      // Dynamically load @maxmind/geoip2-node if configured
      const moduleName = '@maxmind/geoip2-node';
      const maxmind = require(moduleName);
      this.maxmindReader = await maxmind.Reader.open(dbPath);
      logger.info('MaxMind GeoLite2-ASN database loaded successfully');
    } catch (err: any) {
      logger.warn({ err: err.message, dbPath }, 'MaxMind GeoLite2-ASN database failed to load, using built-in ASN & reverse DNS heuristics');
    }

    return this.maxmindReader;
  }

  /**
   * Checks whether an IP belongs to a datacenter, cloud host, VPN, or Tor exit node
   */
  public async checkDatacenterIp(ip: string): Promise<{ isDatacenter: boolean; asn?: number }> {
    const cleanIp = ip.replace(/^::ffff:/, '').trim();

    // Localhost / private IP is not considered an external datacenter
    if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.')) {
      return { isDatacenter: false };
    }

    // 1. Check MaxMind reader if configured
    try {
      const reader = await this.getOptionalMaxmindReader();
      if (reader) {
        const response = reader.asn(cleanIp);
        const asn = response?.autonomousSystemNumber;
        if (asn) {
          const isKnownDatacenter = KNOWN_DATACENTER_ASNS.has(asn);
          return { isDatacenter: isKnownDatacenter, asn };
        }
      }
    } catch {
      // MaxMind lookup miss or invalid IP for ASN
    }

    // 2. Perform reverse DNS lookup to inspect PTR hostnames
    try {
      const hostnames = await dns.promises.reverse(cleanIp);
      for (const host of hostnames) {
        for (const pattern of DATACENTER_HOST_PATTERNS) {
          if (pattern.test(host)) {
            return { isDatacenter: true };
          }
        }
      }
    } catch {
      // Reverse DNS resolution failed or no PTR record
    }

    return { isDatacenter: false };
  }

  /**
   * Retrieves dynamic anti-fraud signal weights from Redis cache (TTL 5min)
   * with fallback to system_settings MongoDB collection and constants.ts defaults.
   */
  public async getSignalWeights(): Promise<AntiFraudSignalWeights> {
    try {
      // 1. Try reading from Redis cache
      if (isRedisConnected()) {
        const cached = await redis.get(this.redisKey);
        if (cached) {
          return { ...ANTI_FRAUD_WEIGHTS, ...JSON.parse(cached) };
        }
      }
    } catch (cacheErr: any) {
      logger.warn({ err: cacheErr.message }, 'Failed to read anti-fraud weights from Redis cache');
    }

    // 2. Read from MongoDB system_settings collection if connected
    if (mongoose.connection.readyState === 1) {
      try {
        const setting = await SystemSettings.findOne({ key: 'anti_fraud_weights' }).lean();
        if (setting && setting.value) {
          const mergedWeights: AntiFraudSignalWeights = {
            ...ANTI_FRAUD_WEIGHTS,
            ...(setting.value as Partial<AntiFraudSignalWeights>),
          };

          // Cache in Redis with 5 minute TTL (300 seconds)
          if (isRedisConnected()) {
            await redis.set(this.redisKey, JSON.stringify(mergedWeights), 'EX', 300);
          }

          return mergedWeights;
        }
      } catch (dbErr: any) {
        logger.warn({ err: dbErr.message }, 'Failed to read anti-fraud weights from MongoDB system_settings');
      }
    }

    // 3. Fallback to constants.ts defaults
    return ANTI_FRAUD_WEIGHTS;
  }

  /**
   * Evaluates vote risk across the 6 anti-fraud factors and returns deterministic VoteStatus
   */
  public async evaluateVoteRisk(voteInput: VoteRiskInput): Promise<FraudEvaluationResult> {
    const { userId, productId, ip, deviceFingerprint } = voteInput;
    const cleanIp = ip.replace(/^::ffff:/, '').trim();
    const subnet = getSubnet24(cleanIp);

    const ipHash = hashTelemetry(cleanIp);
    const subnetHash = voteInput.subnetHash || hashTelemetry(subnet);

    // =========================================================================
    // STEP 1: Hard-Reject Checks (Return REJECTED_BOT immediately if any true)
    // =========================================================================
    if (!Types.ObjectId.isValid(userId)) {
      return {
        status: VoteStatus.REJECTED_BOT,
        riskScore: 100,
        triggeredSignals: ['SIG_INVALID_USER'],
        ipHash,
        subnetHash,
      };
    }

    const user = await User.findById(userId);
    if (!user) {
      return {
        status: VoteStatus.REJECTED_BOT,
        riskScore: 100,
        triggeredSignals: ['SIG_USER_NOT_FOUND'],
        ipHash,
        subnetHash,
      };
    }

    // Hard-Reject 1: Banned account
    if (user.isBanned) {
      return {
        status: VoteStatus.REJECTED_BOT,
        riskScore: 100,
        triggeredSignals: ['SIG_ACCOUNT_BANNED'],
        ipHash,
        subnetHash,
      };
    }

    // Hard-Reject 2: Disposable email domain
    const emailDomain = (user.email.split('@')[1] || '').toLowerCase().trim();
    if (DISPOSABLE_EMAIL_DOMAINS.has(emailDomain)) {
      return {
        status: VoteStatus.REJECTED_BOT,
        riskScore: 100,
        triggeredSignals: ['SIG_EMAIL_DISPOSABLE'],
        ipHash,
        subnetHash,
      };
    }

    // =========================================================================
    // STEP 2: Compute Risk Score (Additively sum weighted signals)
    // =========================================================================
    const weights = await this.getSignalWeights();
    let rawScore = 0;
    const triggeredSignals: string[] = [];
    const now = new Date();

    // Signal 1: SIG_ACCOUNT_NEW (+20) — User's createdAt < 2 hours ago
    const accountAgeHours = Math.max(0, (now.getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60));
    if (accountAgeHours < 2) {
      rawScore += weights.SIG_ACCOUNT_NEW;
      triggeredSignals.push('SIG_ACCOUNT_NEW');
    }

    // Signal 2: SIG_IP_DATACENTER (+25) — IP's ASN is a known hosting/datacenter/VPN/Tor node
    const datacenterCheck = await this.checkDatacenterIp(cleanIp);
    if (datacenterCheck.isDatacenter) {
      rawScore += weights.SIG_IP_DATACENTER;
      triggeredSignals.push('SIG_IP_DATACENTER');
    }

    // Signal 3: SIG_SUBNET_CONCENTRATION (+35) — > 3 votes for this productId from same /24 subnet in last 1 hour
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const productObjectId = new Types.ObjectId(productId);

    const subnetVotesLastHour = await Vote.countDocuments({
      productId: productObjectId,
      subnetHash,
      createdAt: { $gt: oneHourAgo },
    });

    if (subnetVotesLastHour > 3) {
      rawScore += weights.SIG_SUBNET_CONCENTRATION;
      triggeredSignals.push('SIG_SUBNET_CONCENTRATION');
    }

    // Signal 4: SIG_BURST_VELOCITY (+25) — Current vote rate for this product > 5x the product's 3-day average rate
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const votesLastHour = await Vote.countDocuments({
      productId: productObjectId,
      createdAt: { $gt: oneHourAgo },
    });
    const votesLast3Days = await Vote.countDocuments({
      productId: productObjectId,
      createdAt: { $gt: threeDaysAgo },
    });

    // 72 hours in 3 days; baseline hourly rate
    const threeDayHourlyAvg = votesLast3Days / 72;

    // Trigger velocity if arrival rate > 5x baseline (minimum threshold of 5 votes to prevent 1-vote false positive on new product)
    if (votesLastHour >= 5 && (threeDayHourlyAvg === 0 || votesLastHour > 5 * threeDayHourlyAvg)) {
      rawScore += weights.SIG_BURST_VELOCITY;
      triggeredSignals.push('SIG_BURST_VELOCITY');
    }

    // Signal 5: SIG_ZERO_PRIOR_ACTIVITY (+15) — User has 0 activity_events prior to this vote
    const userObjectId = new Types.ObjectId(userId);
    const priorEventsCount = await ActivityEvent.countDocuments({
      userId: userObjectId,
    });

    if (priorEventsCount === 0) {
      rawScore += weights.SIG_ZERO_PRIOR_ACTIVITY;
      triggeredSignals.push('SIG_ZERO_PRIOR_ACTIVITY');
    }

    // Signal 6: SIG_DEVICE_COLLISION (+40) — deviceFingerprint used by another userId in last 24h
    if (deviceFingerprint && deviceFingerprint.trim().length > 0) {
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const collisionExists = await Vote.exists({
        deviceFingerprint: deviceFingerprint.trim(),
        userId: { $ne: userObjectId },
        createdAt: { $gt: twentyFourHoursAgo },
      });

      if (collisionExists) {
        rawScore += weights.SIG_DEVICE_COLLISION;
        triggeredSignals.push('SIG_DEVICE_COLLISION');
      }
    }

    // Signal 7: SIG_HISTORICAL_TRUST (-20) — Account age > 30 days AND historical valid vote count > 5
    const accountAgeDays = accountAgeHours / 24;
    if (accountAgeDays > 30) {
      const historicalValidVotes = await Vote.countDocuments({
        userId: userObjectId,
        status: VoteStatus.VALID,
      });

      if (historicalValidVotes > 5) {
        rawScore += weights.SIG_HISTORICAL_TRUST;
        triggeredSignals.push('SIG_HISTORICAL_TRUST');
      }
    }

    // =========================================================================
    // STEP 3: Determine VoteStatus based on Thresholds
    // =========================================================================
    // Clamp risk score to [0, 100]
    const riskScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    let status: VoteStatus;
    if (riskScore >= THRESHOLD_HIGH) {
      status = VoteStatus.QUARANTINED;
    } else if (riskScore >= THRESHOLD_LOW) {
      status = VoteStatus.FLAGGED;
    } else {
      status = VoteStatus.VALID;
    }

    return {
      status,
      riskScore,
      triggeredSignals,
      ipHash,
      subnetHash,
      accountAgeHours: Math.round(accountAgeHours * 10) / 10,
      asnNumber: datacenterCheck.asn,
    };
  }
}

export const antiFraudService = new AntiFraudService();
export const evaluateVoteRisk = (voteInput: VoteRiskInput) =>
  antiFraudService.evaluateVoteRisk(voteInput);
