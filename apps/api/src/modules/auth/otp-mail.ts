import { OTP } from '@tawsela/shared';
import type { MailMessage } from '../../core/mail/mailer.js';

/** The email with the 4-digit code (contract §8.1). Arabic, as the app's default language. */
export function otpMail(to: string, code: string): MailMessage {
  const minutes = OTP.validSeconds / 60;
  const text = `رمز التحقق الخاص بك في وصّل: ${code}\nالرمز صالح لمدة ${minutes} دقائق. لا تشارك هذا الرمز مع أي شخص.`;
  const html = `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:16px;color:#1f1f1f">
<p>رمز التحقق الخاص بك في وصّل:</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#B44A0E">${code}</p>
<p style="color:#8a8a8a">الرمز صالح لمدة ${minutes} دقائق. لا تشارك هذا الرمز مع أي شخص.</p>
</div>`;
  return { to, subject: `رمز التحقق ${code}`, text, html };
}

/**
 * Sent to the old address once the account moves to a new email (review F01). [Open] Wording not
 * captured from Tawsilty.
 */
export function emailChangedMail(to: string, newEmail: string): MailMessage {
  const text = `تم تغيير البريد الإلكتروني لحسابك في وصّل إلى ${newEmail}.\nإذا لم تقم بهذا التغيير، تواصل معنا فورًا.`;
  const html = `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:16px;color:#1f1f1f">
<p>تم تغيير البريد الإلكتروني لحسابك في وصّل إلى <b>${escapeHtml(newEmail)}</b>.</p>
<p style="color:#8a8a8a">إذا لم تقم بهذا التغيير، تواصل معنا فورًا.</p>
</div>`;
  return { to, subject: 'تم تغيير البريد الإلكتروني', text, html };
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
