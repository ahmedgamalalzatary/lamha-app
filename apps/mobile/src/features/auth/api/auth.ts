import type { AuthResponse, OtpPurpose, OtpSent, OtpVerified, Role } from '@tawsela/shared';
import type { Href } from 'expo-router';
import { api } from '@/core/api/client';

const post = <T>(path: string, body: unknown) => api<T>(path, { method: 'POST', body, auth: false });

export const authApi = {
  sendSignupCode: (phone: string, email: string) => post<OtpSent>('/auth/signup/code', { phone, email }),
  sendResetCode: (phone: string) => post<OtpSent>('/auth/password/code', { phone }),
  verifyCode: (phone: string, purpose: OtpPurpose, code: string) =>
    post<OtpVerified>('/auth/code/verify', { phone, purpose, code }),
  signup: (body: { ticket: string; firstName: string; lastName: string; password: string; inviteCode?: string }) =>
    post<AuthResponse>('/auth/signup', body),
  resetPassword: (ticket: string, password: string) => post<AuthResponse>('/auth/password/reset', { ticket, password }),
  login: (phone: string, password: string) => post<AuthResponse>('/auth/login', { phone, password }),
};

/** Where each role lands after sign-in: its own tab bar (contract §2). */
export const homeOf = (role: Role): Href => `/${role}` as Href;
