import { apiClient } from './api-client';
import { User, ApiResponse } from '@/types';

export type UserSession = User;

export interface MagicLinkResponse {
  success: boolean;
  devMagicLinkUrl?: string;
  rawToken?: string;
  expiresInSeconds?: number;
}

/**
 * Dispatches a passwordless magic link request to user's email
 */
export async function requestMagicLink(email: string): Promise<MagicLinkResponse> {
  const res = await apiClient.post<ApiResponse<{ message: string; expiresInSeconds: number; devMagicLinkUrl?: string; rawToken?: string }>>(
    '/auth/magic-link',
    { email }
  );
  return {
    success: res.data?.success ?? true,
    devMagicLinkUrl: (res.data?.data as any)?.devMagicLinkUrl,
    rawToken: (res.data?.data as any)?.rawToken,
    expiresInSeconds: (res.data?.data as any)?.expiresInSeconds,
  };
}

/**
 * Verifies a magic link token from email URL and establishes HTTP-only session cookie
 */
export async function verifyMagicLink(token: string): Promise<User> {
  const res = await apiClient.get<ApiResponse<User>>(`/auth/verify?token=${encodeURIComponent(token)}`);
  const user = (res.data as any)?.data?.user || res.data?.data;
  if (user && typeof window !== 'undefined') {
    localStorage.setItem('lp_session_user', JSON.stringify(user));
  }
  return user;
}

/**
 * Retrieves the currently authenticated session user profile
 */
export async function getSessionUser(): Promise<User | null> {
  try {
    const res = await apiClient.get<ApiResponse<User>>('/auth/me');
    if (res.data?.data) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('lp_session_user', JSON.stringify(res.data.data));
      }
      return res.data.data;
    }
  } catch {
    // Fallback to cached session if network or cookie issue
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('lp_session_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
  }
  return null;
}

export const getCurrentUser = getSessionUser;

/**
 * Registers user with full name, email, password, and terms acceptance
 */
export async function registerWithPassword(
  name: string,
  email: string,
  password: string,
  termsAccepted: boolean
): Promise<User> {
  const res = await apiClient.post<ApiResponse<{ user: User; sessionToken: string }>>('/auth/register', {
    name,
    email,
    password,
    termsAccepted,
  });
  const user = res.data?.data?.user;
  const token = res.data?.data?.sessionToken;
  if (typeof window !== 'undefined') {
    if (user) localStorage.setItem('lp_session_user', JSON.stringify(user));
    if (token) localStorage.setItem('lp_token', token);
  }
  return user as User;
}

/**
 * Logs in with email, password, and optional rememberMe
 */
export async function loginWithPassword(
  email: string,
  password: string,
  rememberMe: boolean = true
): Promise<User> {
  const res = await apiClient.post<ApiResponse<{ user: User; sessionToken: string }>>('/auth/login', {
    email,
    password,
    rememberMe,
  });
  const user = res.data?.data?.user;
  const token = res.data?.data?.sessionToken;
  if (typeof window !== 'undefined') {
    if (user) localStorage.setItem('lp_session_user', JSON.stringify(user));
    if (token) localStorage.setItem('lp_token', token);
  }
  return user as User;
}

/**
 * Dispatches password reset link
 */
export async function forgotPassword(email: string): Promise<{ message: string; devResetLink?: string }> {
  const res = await apiClient.post<ApiResponse<{ message: string; devResetLink?: string }>>('/auth/forgot-password', {
    email,
  });
  return res.data?.data || { message: 'Reset email dispatched.' };
}

/**
 * Sets new password using reset token
 */
export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  const res = await apiClient.post<ApiResponse<{ message: string }>>('/auth/reset-password', {
    token,
    newPassword,
  });
  return res.data?.data || { message: 'Password reset successfully.' };
}

/**
 * Terminates session and clears the session cookie
 */
export async function logoutUser(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lp_session_user');
      localStorage.removeItem('lp_token');
    }
  }
}

export const logout = logoutUser;

export default {
  requestMagicLink,
  verifyMagicLink,
  registerWithPassword,
  loginWithPassword,
  forgotPassword,
  resetPassword,
  getSessionUser,
  getCurrentUser,
  logoutUser,
  logout,
};
