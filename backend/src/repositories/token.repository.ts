import { Types } from 'mongoose';
import {
  VerificationToken,
  IVerificationToken,
  VerificationTokenType,
} from '../models/VerificationToken.model';

export class TokenRepository {
  /**
   * Create a new verification token record
   */
  async createToken(
    userId: string | Types.ObjectId,
    type: VerificationTokenType | string,
    expiresAt: Date,
    tokenHash: string
  ): Promise<IVerificationToken> {
    const token = new VerificationToken({
      userId: typeof userId === 'string' ? new Types.ObjectId(userId) : userId,
      type,
      expiresAt,
      tokenHash,
      isUsed: false,
    });
    const saved = await token.save();
    return saved.toObject();
  }

  /**
   * Find an active token by its SHA-256 hash and purpose type
   */
  async findByHash(
    tokenHash: string,
    type: VerificationTokenType | string
  ): Promise<IVerificationToken | null> {
    if (!tokenHash) return null;
    return VerificationToken.findOne({ tokenHash, type })
      .lean<IVerificationToken>()
      .exec();
  }

  /**
   * Mark a verification token as consumed (single-use enforcement)
   */
  async markUsed(tokenId: string | Types.ObjectId): Promise<void> {
    if (!tokenId || (typeof tokenId === 'string' && !Types.ObjectId.isValid(tokenId))) {
      return;
    }
    await VerificationToken.findByIdAndUpdate(tokenId, {
      $set: { isUsed: true },
    }).exec();
  }

  /**
   * Delete existing tokens for a user and type (e.g. invalidate older magic links)
   */
  async deleteByUserId(
    userId: string | Types.ObjectId,
    type: VerificationTokenType | string
  ): Promise<void> {
    if (!userId || (typeof userId === 'string' && !Types.ObjectId.isValid(userId))) {
      return;
    }
    await VerificationToken.deleteMany({
      userId: typeof userId === 'string' ? new Types.ObjectId(userId) : userId,
      type,
    }).exec();
  }
}

export const tokenRepository = new TokenRepository();
export default tokenRepository;
