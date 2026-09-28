import { Types } from 'mongoose';
import { User, IUser } from '../models/User.model';

export class UserRepository {
  /**
   * Find a user by their unique Mongo ObjectId
   */
  async findById(id: string | Types.ObjectId): Promise<IUser | null> {
    if (!id || (typeof id === 'string' && !Types.ObjectId.isValid(id))) {
      return null;
    }
    return User.findById(id).lean<IUser>().exec();
  }

  /**
   * Find a user by lowercase email
   */
  async findByEmail(email: string): Promise<IUser | null> {
    if (!email) return null;
    return User.findOne({ email: email.toLowerCase().trim() }).lean<IUser>().exec();
  }

  /**
   * Find a user by connected OAuth provider and provider user ID
   */
  async findByOAuthProvider(provider: string, providerUserId: string): Promise<IUser | null> {
    return User.findOne({
      'oauthProviders.provider': provider,
      'oauthProviders.providerUserId': providerUserId,
    }).lean<IUser>().exec();
  }

  /**
   * Create a new user document
   */
  async create(data: Partial<IUser>): Promise<IUser> {
    const user = new User({
      ...data,
      email: data.email?.toLowerCase().trim(),
    });
    const saved = await user.save();
    return saved.toObject();
  }

  /**
   * Update an existing user by ID
   */
  async updateById(id: string | Types.ObjectId, data: Partial<IUser>): Promise<IUser | null> {
    if (!id || (typeof id === 'string' && !Types.ObjectId.isValid(id))) {
      return null;
    }
    return User.findByIdAndUpdate(id, { $set: data }, { new: true }).lean<IUser>().exec();
  }

  /**
   * Find or create user via OAuth profile
   */
  async findOrCreateByOAuth(
    provider: 'google' | 'github',
    providerUserId: string,
    email: string
  ): Promise<IUser> {
    // 1. Check if OAuth account is already linked
    let user = await this.findByOAuthProvider(provider, providerUserId);
    if (user) {
      return user;
    }

    // 2. Check if user already exists with this email
    user = await this.findByEmail(email);
    if (user) {
      await User.findByIdAndUpdate(user._id, {
        $push: {
          oauthProviders: {
            provider,
            providerUserId,
            linkedAt: new Date(),
          },
        },
      });
      return (await this.findById(user._id))!;
    }

    // 3. Create fresh user
    return this.create({
      email,
      oauthProviders: [
        {
          provider,
          providerUserId,
          linkedAt: new Date(),
        },
      ],
    });
  }
}

export const userRepository = new UserRepository();
export default userRepository;
