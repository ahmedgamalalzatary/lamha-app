import { ApiRequestError, type ErrorCode } from './create-api';

/** The dashboard is Arabic only (contract §3); the sign-in words match the mobile app's. */
const MESSAGES: Partial<Record<ErrorCode, string>> = {
  BAD_CREDENTIALS: 'رقم الهاتف أو كلمة المرور غير صحيحة',
  ACCOUNT_DISABLED: 'هذا الحساب موقوف، تواصل مع الإدارة',
  SESSION_EXPIRED: 'انتهت الجلسة، سجّل الدخول مرة أخرى',
  DASHBOARD_ROLE: 'لوحة التحكم للإدارة والمطاعم فقط، استخدم التطبيق',
  PHONE_TAKEN: 'رقم الهاتف مسجل بالفعل',
  OWN_ACCOUNT: 'لا يمكنك تغيير حسابك من هنا، اطلب ذلك من مسؤول آخر',
  ACCOUNT_NOT_FOUND: 'الحساب غير موجود',
  NOT_FOUND: 'العنصر غير موجود، ربما حُذف',
  CATEGORY_NOT_EMPTY: 'احذف منتجات القسم أو انقلها أولاً',
  CATEGORY_OTHER_STORE: 'هذا القسم تابع لمتجر آخر',
  NO_STORE: 'هذا الحساب غير مربوط بمتجر، تواصل مع الإدارة',
  IMAGE_INVALID: 'تعذر قراءة الصورة، اختر صورة JPEG أو PNG',
  TILE_TARGET: 'اختر قسماً أو متجراً واحداً يفتحه المربع',
};

export const GENERIC_ERROR = 'حدث خطأ، حاول مرة أخرى';

/** The sentence to show for a failed call (the API sends a code, contract §7). */
export function errorMessage(e: unknown): string {
  if (!(e instanceof ApiRequestError)) return GENERIC_ERROR;
  if (e.status === 0) return 'تعذر الاتصال بالخادم';
  if (e.status === 429) return 'محاولات كثيرة، انتظر دقيقة ثم حاول مرة أخرى';
  return (e.code && MESSAGES[e.code]) || GENERIC_ERROR;
}
