import { apiClient } from './api-client';
import { User, ApiResponse } from '@/types';

export type UserSession = User;

export interface RegisterResponse {
  requiresVerification: boolean;
  email: string;
  message: string;
  devVerificationCode?: string;
  devVerificationUrl?: string;
  user?: User;
}

export interface VerifyEmailResponse {
  user: User;
  sessionToken: string;
}

/**
 * Registers user with full name, email, password, and terms acceptance.
 * Triggers dispatch of 6-digit verification code to email.
 */
export async function registerWithPassword(
  name: string,
  email: string,
  password: string,
  termsAccepted: boolean
): Promise<RegisterResponse> {
  const res = await apiClient.post<ApiResponse<RegisterResponse>>('/auth/register', {
    name,
    email,
    password,
    termsAccepted,
  });
  return res.data?.data as RegisterResponse;
}

/**
 * Verifies email using 6-digit numeric OTP code or 1-click token
 */
export async function verifyEmail(
  email?: string,
  code?: string,
  token?: string
): Promise<VerifyEmailResponse> {
  const res = await apiClient.post<ApiResponse<VerifyEmailResponse>>('/auth/verify-email', {
    email,
    code,
    token,
  });
  const user = res.data?.data?.user;
  const sessionToken = res.data?.data?.sessionToken;
  if (typeof window !== 'undefined') {
    if (user) localStorage.setItem('lp_session_user', JSON.stringify(user));
    if (sessionToken) localStorage.setItem('lp_token', sessionToken);
  }
  return res.data?.data as VerifyEmailResponse;
}

/**
 * Resends 6-digit verification code to user email
 */
export async function resendVerificationCode(
  email: string
): Promise<{ success: boolean; message: string; devVerificationCode?: string }> {
  const res = await apiClient.post<ApiResponse<{ success: boolean; message: string; devVerificationCode?: string }>>(
    '/auth/resend-verification',
    { email }
  );
  return res.data?.data || { success: true, message: 'Verification code resent.' };
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
  registerWithPassword,
  verifyEmail,
  resendVerificationCode,
  loginWithPassword,
  forgotPassword,
  resetPassword,
  getSessionUser,
  getCurrentUser,
  logoutUser,
  logout,
};

