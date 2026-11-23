import { OTP } from '@tawsela/shared';
import type { MailMessage } from '../../core/mail/mailer.js';

/** The email with the 4-digit code (contract §8.1). Arabic, as the app's default language. */
export function otpMail(to: string, code: string): MailMessage {
  const minutes = OTP.validSeconds / 60;
  const text = `رمز التحقق الخاص بك في توصيلة: ${code}\nالرمز صالح لمدة ${minutes} دقائق. لا تشارك هذا الرمز مع أي شخص.`;
  const html = `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:16px;color:#1f1f1f">
<p>رمز التحقق الخاص بك في توصيلة:</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#F68B1D">${code}</p>
<p style="color:#8a8a8a">الرمز صالح لمدة ${minutes} دقائق. لا تشارك هذا الرمز مع أي شخص.</p>
</div>`;
  return { to, subject: `رمز التحقق ${code}`, text, html };
}
