import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { AuthenticationError, AuthorizationError } from '../shared/errors';
import { userRepository } from '../repositories/user.repository';
import { AuthUserPayload } from '../types/express';

interface TokenPayload extends JwtPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Extracts session token from signed cookies, regular cookies, or Authorization header
 */
function extractToken(req: Request): string | null {
  // 1. Signed cookies (HttpOnly session token)
  if (req.signedCookies && req.signedCookies.sessionToken) {
    return req.signedCookies.sessionToken;
  }

  // 2. Unsigned cookies fallback
  if (req.cookies && req.cookies.sessionToken) {
    return req.cookies.sessionToken;
  }

  // 3. Authorization Bearer token header fallback (for mobile/API clients)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

/**
 * Require authenticated user middleware.
 * Verifies signed sessionToken cookie via JWT_SECRET, loads user to check isBanned,
 * and attaches decoded user payload { userId, email, role } to req.user.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new AuthenticationError('Authentication required or session token missing', 'UNAUTHORIZED');
    }

    const secret = process.env.JWT_SECRET || 'dev_jwt_secret_launchproduct_minimum_64_characters_hash_key_12345';
    let decoded: TokenPayload;

    try {
      decoded = jwt.verify(token, secret) as TokenPayload;
    } catch {
      throw new AuthenticationError('Invalid or expired session token', 'UNAUTHORIZED');
    }

    if (!decoded || !decoded.userId) {
      throw new AuthenticationError('Malformed session token payload', 'UNAUTHORIZED');
    }

    // Fetch user from MongoDB to check ban status and active existence
    const user = await userRepository.findById(decoded.userId);
    if (!user) {
      throw new AuthenticationError('User account not found', 'UNAUTHORIZED');
    }

    if (user.isBanned) {
      throw new AuthorizationError(
        user.banReason ? `Account is banned: ${user.banReason}` : 'Account is banned',
        'ACCOUNT_BANNED'
      );
    }

    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Role-Based Access Control (RBAC) middleware factory.
 * Must be chained AFTER requireAuth.
 * Validates that req.user.role is included in allowedRoles.
 * Usage: router.post('/admin/action', requireAuth, requireRole('ADMIN'), controller)
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required prior to role verification', 'UNAUTHORIZED');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new AuthorizationError(
          `User role '${req.user.role}' is not authorized to access this resource`,
          'FORBIDDEN'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Optional authentication middleware.
 * Attaches user to req.user if a valid token is present;
 * otherwise sets req.user = null without throwing an error.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) {
      req.user = null;
      return next();
    }

    const secret = process.env.JWT_SECRET || 'dev_jwt_secret_launchproduct_minimum_64_characters_hash_key_12345';
    let decoded: TokenPayload;

    try {
      decoded = jwt.verify(token, secret) as TokenPayload;
    } catch {
      req.user = null;
      return next();
    }

    if (!decoded || !decoded.userId) {
      req.user = null;
      return next();
    }

    const user = await userRepository.findById(decoded.userId);
    if (!user || user.isBanned) {
      req.user = null;
      return next();
    }

    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export default {
  requireAuth,
  requireRole,
  optionalAuth,
};
